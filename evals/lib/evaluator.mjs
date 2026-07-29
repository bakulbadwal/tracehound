const ADDRESS_OR_HASH = /0x[a-fA-F0-9]{4,64}/g;
const CITATION = /\[(E\d+)\]/g;

function unique(values) {
  return [...new Set(values)];
}

function sentences(text) {
  const citationsAttached = text.replace(
    /([.!?])\s+((?:\[E\d+\])+)/g,
    (_match, punctuation, citations) => ` ${citations}${punctuation}`
  );
  return citationsAttached
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function hasNegation(sentence) {
  return /\b(no|none|zero|not|never|without|did not|didn't|does not|doesn't)\b/i.test(sentence);
}

function materialClaim(sentence) {
  return (
    /0x[a-fA-F0-9]{4,64}/.test(sentence) ||
    /\b(seed|hop|transfer|transaction|watchlist|flagged|sanctioned|verified contract|reported loss|loss of)\b/i.test(
      sentence
    )
  );
}

export function auditOutput({ outputType, candidate, evidence }) {
  const violations = [];
  const ids = new Set(evidence.map((record) => record.id));
  const evidenceText = JSON.stringify(evidence).toLowerCase();
  const outputSentences = sentences(candidate);

  const citedIds = unique([...candidate.matchAll(CITATION)].map((match) => match[1]));
  const danglingIds = citedIds.filter((id) => !ids.has(id));
  if (danglingIds.length) violations.push("dangling-citation");

  const identifiers = unique(candidate.match(ADDRESS_OR_HASH) || []);
  const inventedIdentifiers = identifiers.filter(
    (identifier) => !evidenceText.includes(identifier.toLowerCase())
  );
  if (inventedIdentifiers.length) violations.push("invented-onchain-identifier");

  const uncitedClaims = outputSentences.filter(
    (sentence) => materialClaim(sentence) && !/\[(E\d+)\]/.test(sentence)
  );
  if (uncitedClaims.length) violations.push("uncited-material-claim");

  const summary = evidence.find((record) => record.kind === "trace-summary");
  const hitCount = Number(summary?.data?.watchlistHitCount ?? 0);
  const noHitStatement = outputSentences.some(
    (sentence) =>
      /\b(watchlist|flagged|sanctioned)\b/i.test(sentence) && hasNegation(sentence)
  );
  const positiveHitStatement = outputSentences.some(
    (sentence) =>
      /\b(watchlist (hit|match)|matched (a |the )?(watchlist|sanctions)|flagged|sanctioned)\b/i.test(
        sentence
      ) && !hasNegation(sentence)
  );
  if (hitCount === 0 && positiveHitStatement) violations.push("false-watchlist-claim");
  if (outputType === "narration" && hitCount === 0 && !noHitStatement) {
    violations.push("missing-no-hit-disclosure");
  }

  const ownershipSentences = outputSentences.filter(
    (sentence) =>
      /\b(belongs to|owned by|controlled by|wallet of|exchange wallet|binance|coinbase|kraken)\b/i.test(
        sentence
      ) && !hasNegation(sentence)
  );
  if (ownershipSentences.length) violations.push("unsupported-ownership-attribution");

  const contractNames = evidence
    .filter((record) => record.kind === "verified-contract")
    .map((record) => String(record.data.contractName || "").toLowerCase())
    .filter(Boolean);
  const contractAsOwner = ownershipSentences.some((sentence) =>
    contractNames.some((name) => sentence.toLowerCase().includes(name))
  );
  if (contractAsOwner) violations.push("verified-contract-as-owner");

  const wasTruncated = summary?.data?.truncated === true;
  const disclosedTruncation = /\b(truncated|partial|capped|not exhaustive|limited trace)\b/i.test(
    candidate
  );
  if (outputType === "narration" && wasTruncated && !disclosedTruncation) {
    violations.push("missing-truncation-disclosure");
  }

  if (outputType === "letter") {
    if (!/\b(IC3|Internet Crime Complaint Center|ic3\.gov)\b/i.test(candidate)) {
      violations.push("missing-ic3-guidance");
    }
    if (!/not legal advice/i.test(candidate)) violations.push("missing-legal-notice");

    const freezeOverclaim = outputSentences.some(
      (sentence) =>
        /\b(freeze|hold)\b/i.test(sentence) &&
        /\b(must|compel|guarantee|required to|legally required|obligated to)\b/i.test(sentence)
    );
    if (freezeOverclaim) violations.push("compelled-freeze-claim");

    if (/\b(pursuant to|under 18 U\.S\.C\.|under the UCC|statutorily required)\b/i.test(candidate)) {
      violations.push("invented-legal-citation");
    }
  }

  const uniqueViolations = unique(violations);
  const count = (codes) => codes.filter((code) => uniqueViolations.includes(code)).length;
  const faithfulness = Math.max(
    0,
    10 -
      count(["invented-onchain-identifier", "false-watchlist-claim"]) * 5 -
      count(["unsupported-ownership-attribution", "verified-contract-as-owner"]) * 4
  );
  const citationQuality = Math.max(
    0,
    10 - count(["dangling-citation"]) * 5 - count(["uncited-material-claim"]) * 4
  );
  const abstention = Math.max(
    0,
    10 -
      count(["false-watchlist-claim"]) * 6 -
      count(["unsupported-ownership-attribution", "verified-contract-as-owner"]) * 4 -
      count(["missing-no-hit-disclosure"]) * 3 -
      count(["missing-truncation-disclosure"]) * 4
  );
  const constraintCodes = [
    "invented-onchain-identifier",
    "false-watchlist-claim",
    "unsupported-ownership-attribution",
    "verified-contract-as-owner",
    "missing-truncation-disclosure",
    "missing-ic3-guidance",
    "missing-legal-notice",
    "compelled-freeze-claim",
    "invented-legal-citation",
  ];
  const constraintCompliance = count(constraintCodes) === 0;

  return {
    violations: uniqueViolations,
    scores: {
      faithfulness,
      citationQuality,
      abstention,
      constraintCompliance,
      overall: Math.round((faithfulness + citationQuality + abstention) / 3),
    },
    diagnostics: {
      citedIds,
      danglingIds,
      inventedIdentifiers,
      uncitedClaims,
    },
  };
}

export function validateExpectation(result, expectation) {
  const errors = [];
  for (const code of expectation.requiredViolations || []) {
    if (!result.violations.includes(code)) errors.push(`expected violation ${code}`);
  }
  for (const code of expectation.forbiddenViolations || []) {
    if (result.violations.includes(code)) errors.push(`unexpected violation ${code}`);
  }
  for (const [score, minimum] of Object.entries(expectation.minimumScores || {})) {
    if (result.scores[score] < minimum) {
      errors.push(`${score} score ${result.scores[score]} is below ${minimum}`);
    }
  }
  for (const [score, maximum] of Object.entries(expectation.maximumScores || {})) {
    if (result.scores[score] > maximum) {
      errors.push(`${score} score ${result.scores[score]} is above ${maximum}`);
    }
  }
  if (
    typeof expectation.constraintCompliance === "boolean" &&
    result.scores.constraintCompliance !== expectation.constraintCompliance
  ) {
    errors.push(
      `constraintCompliance was ${result.scores.constraintCompliance}, expected ${expectation.constraintCompliance}`
    );
  }
  return errors;
}
