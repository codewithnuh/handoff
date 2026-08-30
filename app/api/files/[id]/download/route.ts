import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getClientPortalSession } from "@/lib/portal";

/**
 * GET /api/files/[id]/download
 *
 * Serves file downloads for the client portal.
 * Verifies:
 *   1. Valid client session
 *   2. File belongs to a deliverable on a project the client has access to
 *
 * Redirects to the uploadthing CDN URL for actual file serving.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: fileId } = await params;

  // 1. Check client session
  const session = await getClientPortalSession();
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  // 2. Find file and verify access
  const file = await db.file.findUnique({
    where: { id: fileId },
    select: {
      id: true,
      key: true,
      filename: true,
      mimeType: true,
      size: true,
      versions: {
        select: {
          deliverable: {
            select: {
              projectId: true,
            },
          },
        },
        take: 1,
      },
    },
  });

  if (!file || file.versions.length === 0) {
    return NextResponse.json(
      { error: "File not found" },
      { status: 404 },
    );
  }

  const projectId = file.versions[0].deliverable.projectId;

  // 3. Verify project access
  const access = await db.projectAccess.findUnique({
    where: { projectId_email: { projectId, email: session.email } },
    select: { id: true },
  });

  if (!access) {
    return NextResponse.json(
      { error: "Forbidden — you don't have access to this file" },
      { status: 403 },
    );
  }

  // 4. Redirect to uploadthing CDN URL
  // The key format from uploadthing is typically like:
  // `${appId}/${fileKey}` — the URL is served directly by uploadthing
  const fileUrl = `https://utfs.io/f/${file.key}`;

  return NextResponse.redirect(fileUrl);
}
