/**
 * @param {string | undefined} value
 * @returns {URL}
 */
export function parseTestDatabaseUrl(value) {
  if (!value) {
    throw new Error(
      "Set TEST_DATABASE_URL to a local PostgreSQL database named handoff_test. DATABASE_URL is never used as a fallback.",
    );
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("TEST_DATABASE_URL must be a valid PostgreSQL URL.");
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["localhost", "127.0.0.1", "::1"].includes(hostname) ||
    databaseName !== "handoff_test"
  ) {
    throw new Error(
      "Refusing integration database access. The target must be local PostgreSQL with database name handoff_test.",
    );
  }

  return url;
}

/** @param {string | undefined} value */
export function assertTestDatabaseUrl(value) {
  return parseTestDatabaseUrl(value).toString();
}
