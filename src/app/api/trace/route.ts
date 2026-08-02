import { NextRequest, NextResponse } from "next/server";
import { traceOutward } from "@/lib/trace";
import { validateTraceInput, missingEtherscanKeyError } from "@/lib/validate";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  // Input rules live in @/lib/validate so this route and the MCP server (src/mcp/server.ts)
  // cannot disagree about what a valid trace request is.
  const validated = validateTraceInput({
    address: body?.address,
    chain: body?.chain,
    depth: body?.depth,
  });
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const keyError = missingEtherscanKeyError();
  if (keyError) {
    return NextResponse.json({ error: keyError }, { status: 500 });
  }

  const { address, chain, depth } = validated.value;
  try {
    const graph = await traceOutward(address, chain.id, depth);
    return NextResponse.json({ graph, chain });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Trace failed" }, { status: 500 });
  }
}
