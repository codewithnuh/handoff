import { db } from "@/lib/prisma";
import { safeErrorName } from "@/lib/diagnostics";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json(
      { status: "ready" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Readiness check failed", { errorName: safeErrorName(error) });
    return Response.json(
      { status: "not_ready" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
