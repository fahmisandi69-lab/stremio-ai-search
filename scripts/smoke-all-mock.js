/* eslint-disable no-console */
const assert = require("assert");
const { spawn } = require("child_process");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function getEnv(name, fallback) {
  const v = process.env[name];
  return v === undefined || v === null || v === "" ? fallback : v;
}

async function waitForHttpOk(url, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { headers: { Accept: "text/html" } });
      if (res.ok) return;
    } catch {
      // ignore
    }
    await sleep(250);
  }
  throw new Error(`Timed out waiting for server: ${url}`);
}

function startProcess(name, command, args, env) {
  const child = spawn(command, args, {
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", (d) => process.stdout.write(`[${name}] ${d}`));
  child.stderr.on("data", (d) => process.stderr.write(`[${name}] ${d}`));

  return child;
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response (status ${res.status}): ${text}`);
  }
  return { res, json };
}

async function main() {
  const mockPort = Number(getEnv("MOCK_PORT", "8787"));
  const addonPort = Number(getEnv("ADDON_PORT", "7000"));

  const mockBase = `http://127.0.0.1:${mockPort}`;
  const tmdbBase = `${mockBase}/3`;
  const addonBase = `http://127.0.0.1:${addonPort}`;

  const serverEnv = {
    PORT: String(addonPort),
    ENABLE_LOGGING: "true",
    ENCRYPTION_KEY: getEnv("ENCRYPTION_KEY", "x".repeat(32)),
    TMDB_API_BASE: tmdbBase,
  };

  console.log("Starting mock API server...");
  const mock = startProcess(
    "mock",
    "node",
    ["scripts/mock-api-server.js"],
    { MOCK_PORT: String(mockPort) }
  );

  console.log("Starting addon server...");
  const server = startProcess("server", "node", ["server.js"], serverEnv);

  const shutdown = async () => {
    if (server && !server.killed) server.kill("SIGTERM");
    if (mock && !mock.killed) mock.kill("SIGTERM");
    await sleep(250);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  try {
    await waitForHttpOk(`${addonBase}/aisearch/configure`, 30000);

    console.log("Running /aisearch/validate (OpenAI-compatible, mocked)...");
    const validateUrl = `${addonBase}/aisearch/validate`;
    const validateBody = {
      AiProvider: "openai-compat",
      OpenAICompatApiKey: "mock",
      OpenAICompatModel: "mock",
      OpenAICompatBaseUrl: mockBase,
      AiTemperature: 0.2,
      TmdbApiKey: "mock",
    };
    const { res: validateRes, json: validateJson } = await postJson(
      validateUrl,
      validateBody
    );
    assert(validateRes.ok, `validate HTTP ${validateRes.status}`);
    assert(validateJson.tmdb === true, "tmdb validation should be true");
    assert(
      !!(validateJson.ai || validateJson.openaiCompat),
      "ai/openaiCompat validation should be true"
    );

    console.log("Creating encrypted config via /aisearch/encrypt...");
    const encryptUrl = `${addonBase}/aisearch/encrypt`;
    const configData = {
      AiProvider: "openai-compat",
      OpenAICompatApiKey: "mock",
      OpenAICompatModel: "mock",
      OpenAICompatBaseUrl: mockBase,
      TmdbApiKey: "mock",
      NumResults: 5,
      EnableAiCache: false,
      EnableHomepage: false,
      EnableSimilar: true,
      AiTemperature: 0.2,
    };
    const { res: encRes, json: encJson } = await postJson(encryptUrl, {
      configData,
      traktAuthData: null,
    });
    assert(encRes.ok, `encrypt HTTP ${encRes.status}`);
    assert(encJson.encryptedConfig, "encryptedConfig missing");
    const configId = encJson.encryptedConfig;

    console.log("Running catalog request (movie)...");
    const catalogUrl = `${addonBase}/aisearch/${configId}/catalog/movie/aisearch.top/search=matrix.json`;
    const catalogRes = await fetch(catalogUrl, {
      headers: { Accept: "application/json" },
    });
    const catalogJson = await catalogRes.json();
    assert(catalogRes.ok, `catalog HTTP ${catalogRes.status}`);
    assert(Array.isArray(catalogJson.metas), "catalog metas must be array");
    assert(catalogJson.metas.length > 0, "expected metas length > 0");
    assert(catalogJson.metas[0].id, "meta[0].id missing");

    console.log("Running similar/meta request...");
    const similarUrl = `${addonBase}/aisearch/${configId}/meta/movie/ai-recs:tt0133093.json`;
    const metaRes = await fetch(similarUrl, {
      headers: { Accept: "application/json" },
    });
    const metaJson = await metaRes.json();
    assert(metaRes.ok, `meta HTTP ${metaRes.status}`);
    assert(metaJson.meta, "meta missing");
    assert(Array.isArray(metaJson.meta.videos), "meta.videos must be array");
    assert(metaJson.meta.videos.length > 0, "expected videos length > 0");

    console.log("Smoke all (mocked) OK");
  } finally {
    await shutdown();
  }
}

main().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exitCode = 1;
});

