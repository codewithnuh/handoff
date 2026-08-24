"use server";

/**
 * Client-invokable portal session actions.
 *
 * Kept separate from lib/portal.ts so the raw crypto/session helpers
 * are never exposed as callable RPC endpoints — only these explicit,
 * argument-free actions are reachable from the client.
 */

import { cookies } from "next/headers";
import { db } from "@/lib/prisma";
import {
  CLIENT_COOKIE_NAME,
  unsignClientCookie as unsignCookie,
} from "@/lib/portal";

/**
 * Logs the client out: deletes the ClientSession row and clears the cookie.
 */
export async function clientLogout(): Promise<void> {
  const cookieStore = await cookies();
  const signed = cookieStore.get(CLIENT_COOKIE_NAME)?.value;

  if (signed) {
    const sessionId = unsignCookie(signed);
    if (sessionId) {
      // Delete the session from DB
      await db.clientSession.delete({ where: { id: sessionId } }).catch(() => {});
    }
  }

  // Clear the cookie
  cookieStore.delete(CLIENT_COOKIE_NAME);
}
