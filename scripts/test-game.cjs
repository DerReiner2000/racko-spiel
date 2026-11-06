const { mkdtempSync, readdirSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const output = mkdtempSync(path.join(tmpdir(), "racko-rules-"));
try {
  const compile = spawnSync(process.execPath, [
    require.resolve("typescript/bin/tsc"), "-p", "tests/tsconfig.json", "--outDir", output,
  ], { cwd: root, stdio: "inherit" });
  if (compile.error) throw compile.error;
  if (compile.status !== 0) process.exitCode = compile.status ?? 1;
  else {
    const files = readdirSync(path.join(output, "tests")).filter((name) => name.endsWith(".test.js")).map((name) => path.join(output, "tests", name));
    const test = spawnSync(process.execPath, ["--test", ...files], {
      cwd: root, stdio: "inherit",
    });
    if (test.error) throw test.error;
    process.exitCode = test.status ?? 1;
  }
} finally {
  if (path.dirname(output) !== path.resolve(tmpdir()) || !path.basename(output).startsWith("racko-rules-")) {
    throw new Error("Unexpected test output path; refusing cleanup.");
  }
  rmSync(output, { recursive: true, force: true });
}
