import { z } from "zod";
import {
  emailSchema,
  idSchema,
  nameSchema,
} from "@/lib/validation/shared";

/** Invite a teammate: email + initial project assignments (need-to-know). */
export const inviteTeammateSchema = z.object({
  email: emailSchema,
  projectIds: z.array(idSchema).max(50).optional().default([]),
});
export type InviteTeammateInput = z.infer<typeof inviteTeammateSchema>;

export const teamInviteIdSchema = z.object({ id: idSchema });
export type TeamInviteIdInput = z.infer<typeof teamInviteIdSchema>;

export const updateTeamMemberRoleSchema = z.object({
  userId: idSchema,
  role: z.enum(["ADMIN", "MEMBER"]),
});
export type UpdateTeamMemberRoleInput = z.infer<
  typeof updateTeamMemberRoleSchema
>;

export const teamMemberIdSchema = z.object({ userId: idSchema });
export type TeamMemberIdInput = z.infer<typeof teamMemberIdSchema>;

export const updateProjectMemberRoleSchema = z.object({
  projectId: idSchema,
  userId: idSchema,
  role: z.enum(["LEAD", "CONTRIBUTOR", "OBSERVER"]),
});
export type UpdateProjectMemberRoleInput = z.infer<
  typeof updateProjectMemberRoleSchema
>;

export const removeProjectMemberSchema = z.object({
  projectId: idSchema,
  userId: idSchema,
});
export type RemoveProjectMemberInput = z.infer<typeof removeProjectMemberSchema>;

/**
 * Accepting an invite:
 * - Signed in with the invited email → token alone is enough.
 * - Not signed in → name + password create the account first.
 */
export const acceptTeamInviteSchema = z.object({
  token: z.string().trim().min(10).max(128),
  name: nameSchema.optional(),
  password: z.string().min(8).max(128).optional(),
});
export type AcceptTeamInviteInput = z.infer<typeof acceptTeamInviteSchema>;

export const listProjectMembersSchema = z.object({ projectId: idSchema });
export type ListProjectMembersInput = z.infer<typeof listProjectMembersSchema>;
