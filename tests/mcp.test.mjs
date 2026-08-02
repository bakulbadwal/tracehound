import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  validateTraceInput,
  clampDepth,
  isValidAddress,
  supportedChainKeys,
  MIN_DEPTH,
  MAX_DEPTH,
  DEFAULT_DEPTH,
} from "../dist/src/lib/validate.js";

import { READ_ONLY_TOOL_NAMES } from "../dist/src/mcp/server.js";

const VALID = "0x1234567890abcdef1234567890abcdef12345678";

test("accepts a valid address and applies the documented defaults", () => {
  const result = validateTraceInput({ address: VALID });
  assert.equal(result.ok, true);
  assert.equal(result.value.address, VALID);
  assert.equal(result.value.chainKey, "ethereum");
  assert.equal(result.value.depth, DEFAULT_DEPTH);
});

test("rejects malformed addresses", () => {
  for (const bad of [
    undefined,
    null,
    "",
    "not-an-address",
    "1234567890abcdef1234567890abcdef12345678", // missing 0x
    "0x1234", // too short
    `${VALID}00`, // too long
    "0xZZZZ567890abcdef1234567890abcdef12345678", // non-hex
  ]) {
    const result = validateTraceInput({ address: bad });
    assert.equal(result.ok, false, `expected ${JSON.stringify(bad)} to be rejected`);
  }
});

test("rejects unsupported chains and names the supported ones", () => {
  const result = validateTraceInput({ address: VALID, chain: "dogecoin" });
  assert.equal(result.ok, false);
  for (const key of supportedChainKeys()) {
    assert.ok(result.error.includes(key), `error should list supported chain "${key}"`);
  }
});

test("every supported chain key resolves", () => {
  for (const key of supportedChainKeys()) {
    const result = validateTraceInput({ address: VALID, chain: key });
    assert.equal(result.ok, true, `chain "${key}" should validate`);
    assert.equal(typeof result.value.chain.id, "number");
  }
});

test("depth is clamped into range rather than rejected", () => {
  assert.equal(clampDepth(0), MIN_DEPTH);
  assert.equal(clampDepth(-5), MIN_DEPTH);
  assert.equal(clampDepth(99), MAX_DEPTH);
  assert.equal(clampDepth(4), 4);
  assert.equal(clampDepth("4"), 4);
  assert.equal(clampDepth(3.9), 3);
});

test("unparseable depth falls back to the default instead of NaN", () => {
  for (const bad of [undefined, null, "abc", {}, NaN]) {
    assert.equal(clampDepth(bad), DEFAULT_DEPTH, `clampDepth(${JSON.stringify(bad)})`);
  }
});

test("isValidAddress is case-insensitive on the hex body", () => {
  assert.equal(isValidAddress(VALID.toUpperCase().replace("0X", "0x")), true);
  assert.equal(isValidAddress(VALID), true);
});

// The MCP surface is read-only by design: an agent must not be able to trigger a legal demand
// letter unattended. This test fails loudly if a tool is ever added to the server without that
// decision being revisited.
test("the MCP server exposes exactly three read-only tools", async () => {
  assert.deepEqual([...READ_ONLY_TOOL_NAMES], [
    "trace_address",
    "check_watchlist",
    "get_evidence",
  ]);

  const source = await readFile(new URL("../src/mcp/server.ts", import.meta.url), "utf8");
  const registered = [...source.matchAll(/registerTool\(\s*"([^"]+)"/g)].map((m) => m[1]);

  assert.deepEqual(
    registered.sort(),
    [...READ_ONLY_TOOL_NAMES].sort(),
    "registered tools drifted from the declared read-only set"
  );
  assert.ok(
    !registered.some((name) => /letter|draft|send|write/i.test(name)),
    "MCP server must not expose a letter-drafting or write tool"
  );
});
