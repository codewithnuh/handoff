import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Handoff, freelance project management and client portal";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const logo = await readFile(join(process.cwd(), "public", "logo.png"));
  const logoData = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          flexDirection: "column",
          justifyContent: "center",
          padding: "64px 72px",
          background: "#08090a",
          color: "#ffffff",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 54,
              height: 54,
              backgroundImage: `url(${logoData})`,
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              backgroundSize: "contain",
            }}
          />
          <span style={{ fontSize: 28, fontWeight: 600, letterSpacing: -1 }}>
            Handoff
          </span>
        </div>
        <div
          style={{
            display: "flex",
            maxWidth: 960,
            marginTop: 40,
            fontSize: 64,
            fontWeight: 600,
            letterSpacing: -3,
            lineHeight: 1.04,
          }}
        >
          Project management for freelancers.
        </div>
        <div
          style={{
            display: "flex",
            maxWidth: 800,
            marginTop: 22,
            color: "#a6abb4",
            fontSize: 25,
            lineHeight: 1.4,
          }}
        >
          Clients, deliverables, feedback, and approvals in one workspace.
        </div>
        <div
          style={{
            width: 88,
            height: 4,
            marginTop: 36,
            borderRadius: 2,
            background: "#e4f222",
          }}
        />
      </div>
    ),
    size,
  );
}
