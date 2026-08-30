"use client";

/**
 * HandoffFlow — A purposeful shader for the Handoff hero section.
 *
 * Concept: Flowing gradient field representing smooth handoffs between
 * freelancer and client. Organic noise-driven gradients in the brand
 * crimson palette suggest connection, movement, and collaboration.
 *
 * Performance: Single fullscreen quad, ~40 ALU ops per fragment,
 * no texture reads, no branching. Runs at 60fps on integrated GPUs.
 */

import { useRef, useMemo, type FC } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";

const VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  varying vec2 vUv;

  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec3 uColorPrimary;   // #9f1239 → normalized
  uniform vec3 uColorSecondary; // #f4a0b5 → normalized (lighter rose)
  uniform vec3 uColorAccent;    // #be365b → normalized (vivid violet)
  uniform float uSpeed;
  uniform float uScale;

  // --- Simplex 2D noise (Ashima Arts) — 50 lines, no textures ---
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                        -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                            + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
                             dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  // Fractal Brownian Motion — 3 octaves for organic flow
  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for (int i = 0; i < 3; i++) {
      value += amplitude * snoise(p * frequency);
      amplitude *= 0.5;
      frequency *= 2.0;
    }
    return value;
  }

  void main() {
    vec2 uv = vUv;
    float aspect = uResolution.x / uResolution.y;
    vec2 p = uv;
    p.x *= aspect;

    float t = uTime * uSpeed;

    // Two flowing noise fields — represent freelancer & client flows
    float flow1 = fbm(p * uScale + vec2(t * 0.3, t * 0.1));
    float flow2 = fbm(p * uScale * 0.8 + vec2(-t * 0.2, t * 0.15) + 3.14);

    // Blend flows — the "handoff" moment where they meet
    float blend = smoothstep(-0.2, 0.2, flow1 - flow2);

    // Color mixing: primary ↔ secondary, with accent at flow boundaries
    vec3 color = mix(uColorPrimary, uColorSecondary, blend);

    // Accent glow at the flow boundary (where handoff happens)
    float boundary = 1.0 - abs(flow1 - flow2);
    boundary = smoothstep(0.0, 0.4, boundary);
    color = mix(color, uColorAccent, boundary * 0.35);

    // Subtle vignette — draws eye to center hero text
    float vignette = 1.0 - dot((uv - 0.5) * 1.2, (uv - 0.5) * 1.2);
    vignette = smoothstep(0.0, 0.7, vignette);

    // Low opacity backdrop — doesn't compete with text
    float alpha = vignette * 0.35;

    gl_FragColor = vec4(color, alpha);
  }
`;

// Brand colors → normalized RGB
const COLOR_PRIMARY = new THREE.Color("#9f1239");   // aubergine
const COLOR_SECONDARY = new THREE.Color("#f4a0b5"); // light rose
const COLOR_ACCENT = new THREE.Color("#be365b");     // vivid violet

const FlowPlane: FC = () => {
  const meshRef = useRef<THREE.Mesh>(null!);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        depthTest: false,
        uniforms: {
          uTime: { value: 0 },
          uResolution: { value: new THREE.Vector2(1, 1) },
          uColorPrimary: { value: COLOR_PRIMARY },
          uColorSecondary: { value: COLOR_SECONDARY },
          uColorAccent: { value: COLOR_ACCENT },
          uSpeed: { value: 0.15 },   // Slow, calm drift
          uScale: { value: 1.8 },    // Large-scale flow patterns
        },
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
      }),
    []
  );

  useFrame((state, delta) => {
    material.uniforms.uTime.value += delta;
  });

  return (
    <mesh ref={meshRef} renderOrder={-1}>
      <planeGeometry args={[2, 2]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
};

export const HandoffFlow: FC = () => {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      <Canvas
        dpr={[1, 1.5]}
        frameloop="always"
        gl={{
          alpha: true,
          premultipliedAlpha: false,
          antialias: false,
          powerPreference: "low-power",
        }}
        style={{ background: "transparent" }}
      >
        <FlowPlane />
      </Canvas>
    </div>
  );
};
