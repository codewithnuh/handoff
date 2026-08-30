"use client";

/**
 * HeroFlow — Client-side loader for the <HandoffFlow /> shader backdrop.
 *
 * ssr:false is required because Three.js touches Web APIs at import time.
 * Uses next/dynamic for code-splitting — the shader bundle only loads on
 * the client, keeping the initial JS payload lean.
 */

import dynamic from "next/dynamic";

const HandoffFlow = dynamic(
  () => import("./handoff-flow").then((m) => m.HandoffFlow),
  { ssr: false }
);

export function HeroFlow() {
  return <HandoffFlow />;
}
