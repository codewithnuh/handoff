import { mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const outputPath = resolve("reports/dependency-audit.json");
const command = process.platform === "win32" ? "cmd.exe" : "pnpm";
const args = process.platform === "win32"
  ? ["/d", "/s", "/c", "pnpm audit --prod --audit-level high --json"]
  : ["audit", "--prod", "--audit-level", "high", "--json"];
const result = spawnSync(command, args, {
  encoding: "utf8",
  env: process.env,
  maxBuffer: 10 * 1024 * 1024,
});

let audit;
try {
  audit = JSON.parse(result.stdout);
} catch {
  await writeReport({
    commit: process.env.GITHUB_SHA ?? "local",
    status: "unavailable",
    message: "The package registry audit did not return valid JSON.",
  });
  console.error("Production dependency audit unavailable; the check fails closed. Rerun when the registry is available.");
  process.exit(1);
}

if (
  result.error ||
  !audit ||
  typeof audit !== "object" ||
  (audit.advisories !== undefined && !Array.isArray(audit.advisories) && typeof audit.advisories !== "object")
) {
  await writeReport({
    commit: process.env.GITHUB_SHA ?? "local",
    status: "unavailable",
    message: "The package registry audit could not be completed.",
  });
  console.error("Production dependency audit unavailable; the check fails closed. Rerun when the registry is available.");
  process.exit(1);
}

const rawAdvisories = audit.advisories ?? [];
const advisories = (Array.isArray(rawAdvisories) ? rawAdvisories : Object.values(rawAdvisories)).filter(Boolean).map((item) => ({
  id: String(item.id ?? "unknown"),
  package: String(item.module_name ?? item.name ?? "unknown"),
  severity: String(item.severity ?? "unknown"),
  title: String(item.title ?? "Security advisory"),
  url: typeof item.url === "string" ? item.url : undefined,
}));
const thresholdFindings = advisories.filter((item) => ["high", "critical"].includes(item.severity.toLowerCase()));
const counts = audit.metadata?.vulnerabilities ?? {};
const highOrCriticalCount = Number(counts.high ?? 0) + Number(counts.critical ?? 0);

await writeReport({
  commit: process.env.GITHUB_SHA ?? "local",
  status: result.status === 0 && thresholdFindings.length === 0 && highOrCriticalCount === 0 ? "passed" : "failed",
  counts,
  advisories,
});

if (result.status !== 0 && thresholdFindings.length === 0 && highOrCriticalCount === 0) {
  console.error("Production dependency audit failed without a high or critical advisory; treating this as a scanner or registry failure.");
  process.exit(1);
}
if (thresholdFindings.length > 0 || highOrCriticalCount > 0) {
  console.error("High or critical production dependency advisories found:");
  for (const finding of thresholdFindings) {
    console.error(`- ${finding.package} (${finding.severity}, ${finding.id}): ${finding.title}`);
  }
  if (highOrCriticalCount > thresholdFindings.length) {
    console.error(`The registry reported ${highOrCriticalCount} high or critical finding(s) without full advisory details.`);
  }
  process.exit(1);
}

console.log("No high or critical production dependency advisories found.");

async function writeReport(report) {
  await mkdir("reports", { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}
