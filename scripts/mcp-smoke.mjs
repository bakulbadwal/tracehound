// Smoke test for the MCP server: connects a real MCP client over stdio, lists the tools, and
// exercises the two paths that need neither an API key nor a network call.
//
//   npm run mcp:build && npm run mcp:smoke
//
// This is deliberately not part of `npm test` — it spawns a child process and is a wiring check,
// not a unit test. tests/mcp.test.mjs covers the pure logic.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const serverPath = join(repoRoot, "dist", "src", "mcp", "server.js");

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [serverPath],
  cwd: repoRoot,
});

const client = new Client({ name: "tracehound-smoke", version: "0.0.1" });

let failures = 0;
function check(label, condition, detail = "") {
  const mark = condition ? "ok  " : "FAIL";
  if (!condition) failures += 1;
  console.log(`${mark} ${label}${detail ? ` — ${detail}` : ""}`);
}

await client.connect(transport);
check("connected over stdio", true);

const { tools } = await client.listTools();
const names = tools.map((t) => t.name).sort();
check("tools/list returns the three read-only tools", names.length === 3, names.join(", "));
check(
  "no write or letter-drafting tool is exposed",
  !names.some((n) => /letter|draft|send|write/i.test(n))
);

for (const tool of tools) {
  const props = Object.keys(tool.inputSchema?.properties ?? {});
  console.log(`     ${tool.name}(${props.join(", ")})`);
}

// Watchlist lookups are local — no API key, no network.
const zero = await client.callTool({
  name: "check_watchlist",
  arguments: { address: "0x0000000000000000000000000000000000000000" },
});
const zeroPayload = JSON.parse(zero.content[0].text);
check("check_watchlist returns a structured result", typeof zeroPayload.matched === "boolean");
check("check_watchlist carries the not-evidence-of-legitimacy caveat", Boolean(zeroPayload.caveat));

const malformed = await client.callTool({
  name: "check_watchlist",
  arguments: { address: "nope" },
});
check("check_watchlist rejects a malformed address", malformed.isError === true);

const unknown = await client.callTool({
  name: "get_evidence",
  arguments: { traceId: "trace-999" },
});
check("get_evidence rejects an unknown traceId", unknown.isError === true);

await client.close();

console.log(failures === 0 ? "\nsmoke test passed" : `\nsmoke test FAILED (${failures})`);
process.exit(failures === 0 ? 0 : 1);
