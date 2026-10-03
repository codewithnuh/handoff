CREATE TYPE "TeamInviteEmailStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

ALTER TABLE "team_invitations"
ADD COLUMN "emailStatus" "TeamInviteEmailStatus" NOT NULL DEFAULT 'PENDING';
