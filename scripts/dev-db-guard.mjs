const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const ALLOWED_DATABASES = new Set(["handoff_dev", "handoff_test"]);

/**
 * Require a separately configured local development database. DATABASE_URL is
 * intentionally never consulted, so production credentials inherited by a
 * shell cannot redirect a destructive developer command.
 *
 * @param {string | undefined} value
 * @param {string | undefined} nodeEnv
 * @returns {string}
 */
export function getDevDatabaseUrl(value, nodeEnv = process.env.NODE_ENV) {
  if (nodeEnv === "production") {
    throw new Error("Refusing a development database command in NODE_ENV=production.");
  }
  if (!value) {
    throw new Error(
      "Set DEV_DATABASE_URL to local PostgreSQL database handoff_dev or handoff_test. DATABASE_URL is never used as a fallback.",
    );
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("DEV_DATABASE_URL must be a valid PostgreSQL URL.");
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !LOCAL_HOSTS.has(hostname) ||
    !ALLOWED_DATABASES.has(databaseName) ||
    url.searchParams.has("host") ||
    url.searchParams.has("hostaddr") ||
    url.searchParams.has("service")
  ) {
    throw new Error(
      "Refusing database access. DEV_DATABASE_URL must target local PostgreSQL database handoff_dev or handoff_test without host overrides.",
    );
  }

  return url.toString();
}
