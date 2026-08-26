"use client";

/**
 * HeroBeams — client-side loader for the WebGL <Beams /> backdrop.
 *
 * ssr:false is required (three.js touches Web APIs at import time) and is
 * only permitted inside a Client Component. Tuned for the Handoff theme:
 * crimson (#c70036 — the --primary token as hex) light on near-black planes,
 * slow drift for a calm, premium feel.
 */

import dynamic from "next/dynamic";

const Beams = dynamic(() => import("./beams"), { ssr: false });

export function HeroBeams() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      <Beams
        beamWidth={2}
        beamHeight={18}
        beamNumber={14}
        lightColor="#c70036"
        lightIntensity={5}
        beamColor="#1c1c22"
        speed={1.4}
        noiseIntensity={1.35}
        scale={0.18}
        rotation={-12}
      />
    </div>
  );
}
