declare module "smtp-server" {
  import type { Duplex } from "node:stream";

  export type SMTPServerSession = {
    envelope: { rcptTo: Array<{ address: string }> };
  };

  export class SMTPServer {
    constructor(options: {
      authOptional?: boolean;
      disabledCommands?: string[];
      logger?: boolean;
      onData: (
        stream: Duplex,
        session: SMTPServerSession,
        callback: (error: Error | null, message?: string) => void,
      ) => void;
    });
    listen(port: number, hostname: string, callback: () => void): void;
    once(event: "error", listener: (error: Error) => void): this;
    close(callback: (error?: Error) => void): void;
  }
}
