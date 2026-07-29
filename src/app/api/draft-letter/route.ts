import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { TraceGraph } from "@/lib/trace";
import { buildLetterEvidence } from "@/lib/evidence";

// Drafts a demand/freeze-request letter from real trace facts. This is deliberately scoped:
// no claim of exchange relationships, no auto-send, no guarantee of a freeze. Real letters of
// this kind follow a known structure — evidence, a request to hold funds pending law
// enforcement legal process, and a response window — and exchanges generally require law
// enforcement involvement for anything beyond a short administrative hold. See README.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const graph = body?.graph as TraceGraph | undefined;
  const lossAmount = body?.lossAmount as string | undefined;
  const lossCurrency = (body?.lossCurrency as string | undefined) ?? "USD";
  const ic3Number = body?.ic3Number as string | undefined;

  if (!graph) {
    return NextResponse.json({ error: "Missing graph in request body" }, { status: 400 });
  }
  if (!lossAmount) {
    return NextResponse.json({ error: "Loss amount is required" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set. Add it to .env.local to enable letter drafting." },
      { status: 500 }
    );
  }

  const evidence = buildLetterEvidence(graph, lossAmount, lossCurrency, ic3Number);

  const client = new Anthropic({ apiKey });

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1200,
      messages: [
        {
          role: "user",
          content: `Draft a formal demand/freeze-request letter for a person reporting a cryptocurrency
loss to send themselves to a compliance/fraud department they have independently identified.
Base it only on the evidence records below — never invent an exchange name, a legal
citation, ownership attribution, or a fact not given. Cite each on-chain or user-supplied factual
claim with one or more evidence IDs in square brackets, such as [E1] or [E2][E4]. Never cite an
ID that is not present. The evidence does not identify the receiving institution, so address the
letter generically ("To the Compliance and Fraud Department") rather than guessing one.

Follow the real structure such letters use: victim's incident summary, the on-chain evidence
(seed address, relevant transaction hashes, hop path), the specific request (place an
administrative hold on the receiving account pending law enforcement legal process — do NOT claim
the letter itself can compel a freeze), a note referencing the FBI IC3 complaint number if one was
provided, and a reasonable response window (10-14 business days). Include a placeholder for the
victim's contact details and signature.

The letter must open with this exact notice before the letter body itself:
"DRAFT — review carefully and have it checked before sending. This is not legal advice. File a
report with the FBI's Internet Crime Complaint Center (ic3.gov) regardless of anything else you do
— most exchanges require law enforcement involvement to extend a hold beyond an initial review."

Evidence records:
${JSON.stringify(evidence, null, 2)}`,
        },
      ],
    });

    const text = message.content
      .filter((block) => block.type === "text")
      .map((block: any) => block.text)
      .join("\n");

    return NextResponse.json({ letter: text, evidence });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Letter drafting failed" }, { status: 500 });
  }
}
