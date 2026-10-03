import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getRequestSubject } from "@/lib/access/subject";
import { resolveProjectAccess } from "@/lib/access/project";
import { requirePortalProjectAccess } from "@/lib/access/portal";
import { fileStorage, PRIVATE_DOWNLOAD_TTL_SECONDS } from "@/lib/files/storage";

/**
 * GET /api/files/[id]/download
 *
 * Serves authorized dashboard and client portal downloads. The provider URL
 * is private and signed for 60 seconds, so it is never stored in app data.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: fileId } = await params;

  const subject = await getRequestSubject();
  if (!subject) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 2. Find file and verify access
  const file = await db.file.findUnique({
    where: { id: fileId },
    select: {
      id: true,
      key: true,
      filename: true,
      mimeType: true,
      size: true,
      projectId: true,
    },
  });

  if (!file || !file.projectId) {
    return NextResponse.json(
      { error: "File not found" },
      { status: 404 },
    );
  }

  if (subject.kind === "user") {
    const access = await resolveProjectAccess(file.projectId);
    if (!access.ok) return NextResponse.json({ error: "File not found" }, { status: 404 });
  } else {
    const access = await requirePortalProjectAccess(subject.session.email, file.projectId);
    if (!access.ok) return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const { ufsUrl } = await fileStorage.generateSignedURL(
    file.key,
    PRIVATE_DOWNLOAD_TTL_SECONDS,
  );
  return NextResponse.redirect(ufsUrl, {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Referrer-Policy": "no-referrer",
    },
  });
}
