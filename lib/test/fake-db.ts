import { vi } from "vitest";

import type { PrismaClient } from "@/app/generated/prisma/client";

type Entity = Record<string | symbol, unknown>;

const createEntity = (): Entity => {
  const methods: Entity = {};
  return new Proxy(methods, {
    get(target, prop) {
      if (typeof prop === "symbol") return Reflect.get(target, prop);
      if (!(prop in target)) target[prop] = vi.fn();
      return target[prop];
    },
  });
};

const createDatabase = (): Entity => {
  const models: Entity = {};
  return new Proxy(models, {
    get(target, prop) {
      if (typeof prop === "symbol") return Reflect.get(target, prop);
      if (!(prop in target)) {
        target[prop] = prop.startsWith("$") ? vi.fn() : createEntity();
      }
      return target[prop];
    },
  });
};

const database = createDatabase();

/**
 * The single fake Prisma client shared by every test file. Any model or
 * method resolves to a `vi.fn()` on first access, so a new Prisma call in
 * production code never needs a mock added by hand.
 */
export const fakeDb = database as unknown as PrismaClient;
