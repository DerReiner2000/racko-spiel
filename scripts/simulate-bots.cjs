const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const output = mkdtempSync(path.join(tmpdir(), "racko-bots-"));
try {
  const compile = spawnSync(process.execPath, [require.resolve("typescript/bin/tsc"),
    "-p", "scripts/tsconfig.bots.json", "--outDir", output], { cwd: root, stdio: "inherit" });
  if (compile.error) throw compile.error;
  if (compile.status !== 0) process.exitCode = compile.status ?? 1;
  else {
    const simulation = spawnSync(process.execPath, [path.join(output, "scripts/bot-simulation.js"),
      ...process.argv.slice(2)], { cwd: root, stdio: "inherit" });
    if (simulation.error) throw simulation.error;
    process.exitCode = simulation.status ?? 1;
  }
} finally {
  if (path.dirname(output) !== path.resolve(tmpdir()) || !path.basename(output).startsWith("racko-bots-")) {
    throw new Error("Unexpected simulation directory; refusing cleanup.");
  }
  rmSync(output, { recursive: true, force: true });
}
