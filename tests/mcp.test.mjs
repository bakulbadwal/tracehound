import test from "node:test";
import assert from "node:assert/strict";

import {
  validateTraceInput,
  clampDepth,
  isValidAddress,
  supportedChainKeys,
  MIN_DEPTH,
  MAX_DEPTH,
  DEFAULT_DEPTH,
} from "../dist/src/lib/validate.js";

import { READ_ONLY_TOOL_NAMES, registeredToolNames } from "../dist/src/mcp/server.js";

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
// letter unattended. This asserts against the server's LIVE tool registry, not against the text
// of server.ts — a source scan would miss a tool registered from an imported helper, which is
// exactly the path by which a write tool would realistically appear.
test("the MCP server exposes exactly three read-only tools", () => {
  const live = registeredToolNames();

  assert.deepEqual(
    live,
    [...READ_ONLY_TOOL_NAMES].sort(),
    "the server's live tool registry drifted from the declared read-only set"
  );
  assert.ok(
    !live.some((name) => /letter|draft|send|write/i.test(name)),
    "MCP server must not expose a letter-drafting or write tool"
  );
});

// Guards the guard: if the SDK changes its internal shape, registeredToolNames() must throw
// rather than return an empty list, or the test above would pass while checking nothing.
test("the read-only guard cannot pass vacuously", () => {
  const live = registeredToolNames();
  assert.ok(live.length > 0, "registeredToolNames() returned nothing — the guard is not working");
});
