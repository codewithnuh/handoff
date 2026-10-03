import { createServer as createHttpServer } from "node:http";
import { SMTPServer } from "smtp-server";

type CapturedMessage = { to: string[]; raw: string; acceptedAt: string };
const messages: CapturedMessage[] = [];

export default async function globalSetup() {
  if (process.env.NODE_ENV === "production" && process.env.CI !== "true") {
    throw new Error("The E2E SMTP capture server cannot run in production.");
  }

  const smtp = new SMTPServer({
    authOptional: true,
    disabledCommands: ["STARTTLS", "AUTH"],
    logger: false,
    onData(stream, session, callback) {
      let raw = "";
      stream.setEncoding("utf8");
      stream.on("data", (chunk: string) => { raw += chunk; });
      stream.on("end", () => {
        messages.push({
          to: session.envelope.rcptTo.map((recipient) => recipient.address.toLowerCase()),
          raw,
          acceptedAt: new Date().toISOString(),
        });
        callback(null, "Captured for browser tests");
      });
    },
  });

  const api = createHttpServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    if (request.method !== "GET" || url.pathname !== "/messages") {
      response.writeHead(404).end();
      return;
    }
    const email = url.searchParams.get("to")?.toLowerCase();
    const found = email ? messages.filter((message) => message.to.includes(email)) : messages;
    response.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
    response.end(JSON.stringify(found));
  });

  await Promise.all([
    new Promise<void>((resolve, reject) => {
      smtp.once("error", reject);
      smtp.listen(1025, "127.0.0.1", resolve);
    }),
    new Promise<void>((resolve, reject) => {
      api.once("error", reject);
      api.listen(1080, "127.0.0.1", resolve);
    }),
  ]);

  return async () => {
    await Promise.all([
      new Promise<void>((resolve) => smtp.close(() => resolve())),
      new Promise<void>((resolve, reject) => api.close((error) => error ? reject(error) : resolve())),
    ]);
  };
}
