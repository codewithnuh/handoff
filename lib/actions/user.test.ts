import { expect, it, describe, vi, beforeEach } from "vitest";
import { createUser } from "@/lib/actions/user";
import { db } from "@/lib/prisma";
import bcrypt from "bcrypt";
import type { User } from "@/app/generated/prisma/client";

vi.mock("@/lib/prisma", () => ({
  db: {
    user: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("bcrypt", () => ({
  default: {
    hash: vi.fn(),
  },
}));

describe("createUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns validation error when data is invalid", async () => {
    const result = await createUser({
      name: "",
      email: "invalid-email",
      password: "",
    });

    expect(result.success).toBe(false);

    expect(db.user.findFirst).not.toHaveBeenCalled();
    expect(db.user.create).not.toHaveBeenCalled();
  });

  it("returns validation error when user already exists", async () => {
    const existingUser: User = {
      id: "user-1",
      name: "John",
      email: "john@example.com",
      passwordHash: "hash",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(db.user.findFirst).mockResolvedValue(existingUser);

    const result = await createUser({
      name: "John",
      email: "john@example.com",
      password: "password123",
    });

    expect(result.success).toBe(false);
    expect(result.message).toBe("User already exists");

    expect(bcrypt.hash).not.toHaveBeenCalled();
    expect(db.user.create).not.toHaveBeenCalled();
  });

  it("creates a new user successfully", async () => {
    vi.mocked(db.user.findFirst).mockResolvedValue(null);
    vi.mocked(bcrypt.hash).mockResolvedValue("hashed-password" as never);

    const createdUser: User = {
      id: "user-1",
      name: "John",
      email: "john@example.com",
      passwordHash: "hashed-password",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(db.user.create).mockResolvedValue(createdUser);

    const result = await createUser({
      name: "John",
      email: "john@example.com",
      password: "password123",
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe("User created");

    expect(db.user.findFirst).toHaveBeenCalledWith({
      where: {
        email: "john@example.com",
      },
    });

    expect(bcrypt.hash).toHaveBeenCalledWith("password123", 10);

    expect(db.user.create).toHaveBeenCalledWith({
      data: {
        name: "John",
        email: "john@example.com",
        passwordHash: "hashed-password",
      },
    });
  });
});
