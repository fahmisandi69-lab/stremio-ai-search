const fs = require("fs");
const path = require("path");

function isTestFile(fileName) {
  return fileName.endsWith(".test.js");
}

function listTestFiles() {
  const testsDir = __dirname;
  return fs
    .readdirSync(testsDir)
    .filter(isTestFile)
    .map((f) => path.join(testsDir, f))
    .sort();
}

async function run() {
  const files = listTestFiles();
  if (files.length === 0) {
    console.log("No test files found.");
    return;
  }

  let passed = 0;
  let failed = 0;

  for (const file of files) {
    const rel = path.relative(process.cwd(), file);
    try {
      const mod = require(file);
      const testFn = typeof mod === "function" ? mod : mod.run;
      if (typeof testFn !== "function") {
        throw new Error("Test file must export a function or { run }");
      }
      await testFn();
      console.log(`PASS ${rel}`);
      passed++;
    } catch (err) {
      console.error(`FAIL ${rel}`);
      console.error(err && err.stack ? err.stack : err);
      failed++;
    }
  }

  console.log(`\nSummary: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

run().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exitCode = 1;
});

