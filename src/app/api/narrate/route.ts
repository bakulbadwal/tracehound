import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { TraceGraph } from "@/lib/trace";
import { buildTraceEvidence } from "@/lib/evidence";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const graph = body?.graph as TraceGraph | undefined;

  if (!graph) {
    return NextResponse.json({ error: "Missing graph in request body" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set. Add it to .env.local to enable narration." },
      { status: 500 }
    );
  }

  const evidence = buildTraceEvidence(graph);

  const client = new Anthropic({ apiKey });

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `You are a blockchain forensics assistant. Below is structured trace data: an on-chain
walk of outgoing transfers starting from a seed address, up to a few hops deep, on a public
blockchain. Write a short, plain-English investigative narrative summarizing where the funds
moved. Use only the evidence records below. Cite every material trace claim with one or more
evidence IDs in square brackets, such as [E1] or [E2][E4]. Do not cite an ID that is not present.

Be factual and hedge appropriately. If the summary reports zero watchlist hits, say so explicitly
rather than implying wrongdoing. If the trace was truncated, disclose that it is partial. Do not
speculate about identity or wallet ownership. Do not claim funds were "stolen" — that is not
established by the trace. A verified contract name is a sourced software-contract label, not
evidence that a person or exchange owns the address.

Evidence records:
${JSON.stringify(evidence, null, 2)}`,
        },
      ],
    });

    const text = message.content
      .filter((block) => block.type === "text")
      .map((block: any) => block.text)
      .join("\n");

    return NextResponse.json({ narrative: text, evidence });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Narration failed" }, { status: 500 });
  }
}
