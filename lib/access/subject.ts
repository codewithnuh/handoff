import { headers } from "next/headers";

import { ERROR_CODES } from "@/lib/constants/errors";
import type { AuthUser } from "@/lib/auth";
import type { ClientPortalSession } from "@/lib/portal";
import { ActionResponse } from "@/lib/utils/action-response";
import { toActionError } from "@/lib/actions/helpers";

import type { Guarded } from "@/lib/access/types";

/**
 * Identity adapters — the only place the access module learns who is calling.
 *
 * 1. better-auth session cookie → the freelancer behind /dashboard
 * 2. signed portal cookie (cp_session) → the client behind /portal
 * 3. an injected pair → tests, and any future non-HTTP entry point
 *
 * Route handlers, server actions and pages all cross the same seam, so an
 * authorization rule written once covers all three entry points.
 */
export type SubjectAdapters = {
  /** Resolves the signed-in freelancer, or null. */
  getUser: () => Promise<AuthUser | null>;
  /** Resolves the client-portal session, or null. */
  getClient: () => Promise<ClientPortalSession | null>;
};

const betterAuthCookie: SubjectAdapters["getUser"] = async () => {
  const { auth } = await import("@/lib/auth");
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
};

const portalTokenCookie: SubjectAdapters["getClient"] = async () => {
  const { getClientPortalSession } = await import("@/lib/portal");
  return getClientPortalSession();
};

const defaultAdapters: SubjectAdapters = {
  getUser: betterAuthCookie,
  getClient: portalTokenCookie,
};

let activeAdapters = defaultAdapters;

/**
 * Replaces the identity adapters. Tests call this to inject a subject
 * instead of mocking `next/headers`, `@/lib/auth` and the cookie jar.
 * Returns a function that restores the previous adapters.
 */
export const setSubjectAdapters = (
  next: Partial<SubjectAdapters>,
): (() => void) => {
  const previous = activeAdapters;
  activeAdapters = { ...activeAdapters, ...next };
  return () => {
    activeAdapters = previous;
  };
};

/** Resolves the signed-in freelancer, or null. */
export const getSessionUser = (): Promise<AuthUser | null> =>
  activeAdapters.getUser();

/** Resolves the client-portal session, or null. */
export const getPortalSession = (): Promise<ClientPortalSession | null> =>
  activeAdapters.getClient();

export type RequestSubject =
  | { kind: "user"; user: AuthUser }
  | { kind: "client"; session: ClientPortalSession };

/**
 * Whichever identity this request carries: the freelancer cookie first,
 * then the portal cookie. Route handlers use this to authorize requests
 * that both audiences legitimately need (e.g. invoice PDFs).
 */
export const getRequestSubject = async (): Promise<RequestSubject | null> => {
  const user = await getSessionUser();
  if (user) return { kind: "user", user };
  const session = await getPortalSession();
  if (session) return { kind: "client", session };
  return null;
};

/**
 * Returns the current signed-in user, or an `UNAUTHORIZED` failure.
 * Every server action must start with an auth guard.
 */
export const requireAuth = async (): Promise<Guarded<AuthUser>> => {
  try {
    const user = await getSessionUser();
    if (!user) {
      return {
        ok: false,
        error: ActionResponse.failure(
          ERROR_CODES.UNAUTHORIZED,
          "You must be signed in to perform this action.",
        ),
      };
    }
    return { ok: true, value: user };
  } catch (error) {
    return {
      ok: false,
      error: toActionError(error, {
        fallback: "Failed to verify your session. Please try again.",
      }),
    };
  }
};
