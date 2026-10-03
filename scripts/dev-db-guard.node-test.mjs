import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getDevDatabaseUrl } from "./dev-db-guard.mjs";

describe("development database guard", () => {
  it("accepts local development and test databases", () => {
    assert.equal(
      new URL(getDevDatabaseUrl("postgresql://user:secret@localhost:5432/handoff_dev")).pathname,
      "/handoff_dev",
    );
    assert.equal(
      new URL(getDevDatabaseUrl("postgres://user:secret@[::1]/handoff_test")).pathname,
      "/handoff_test",
    );
  });

  it("fails closed when DEV_DATABASE_URL is missing, regardless of DATABASE_URL", () => {
    assert.throws(() => getDevDatabaseUrl(undefined, "development"), /never used as a fallback/);
  });

  it("rejects remote, production-named, overridden, and production-mode targets", () => {
    for (const value of [
      "postgresql://user:secret@db.example.com:5432/handoff_dev",
      "postgresql://user:secret@localhost:5432/handoff",
      "postgresql://user:secret@localhost:5432/handoff_dev?host=db.example.com",
      "postgresql://user:secret@localhost:5432/handoff_dev?service=prod",
    ]) {
      assert.throws(() => getDevDatabaseUrl(value, "development"));
    }
    assert.throws(
      () => getDevDatabaseUrl("postgresql://user:secret@localhost:5432/handoff_dev", "production"),
      /NODE_ENV=production/,
    );
  });
});
