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
 * In production, this would proxy to S3/R2 using the File.key.
 * For MVP, returns the file metadata as JSON.
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

  // 4. Serve the file
  // In production, this would:
  //   - Generate a signed URL for S3/R2
  //   - Or stream the file from storage
  // For MVP, return file metadata so the frontend knows what to display
  return NextResponse.json({
    id: file.id,
    filename: file.filename,
    mimeType: file.mimeType,
    size: file.size,
    key: file.key,
    // In production: redirect to signed URL or stream file
    // For now, the client can see the metadata
    message: "File download would be served from storage in production",
  });
}
