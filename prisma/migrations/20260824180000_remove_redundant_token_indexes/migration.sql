-- Redundant indexes: `token` columns already have UNIQUE constraints
-- (client_invitations_token_key / client_sessions_token_key), which serve
-- lookups by token. The plain indexes duplicate them.

DROP INDEX "client_invitations_token_idx";
DROP INDEX "client_sessions_token_idx";
