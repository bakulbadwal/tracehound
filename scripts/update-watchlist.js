// Pulls the official OFAC SDN "advanced" XML and extracts real, currently-sanctioned
// digital currency addresses for the chains ChainHound supports (ETH/BSC/ARB, plus
// USDC/USDT which are ERC-20 tokens on the same address format). Writes the result into
// data/watchlist.json, preserving the burn/zero entries already there.
//
// Source: https://ofac.treasury.gov/faqs/topic/1641 (official file format docs)
// Run: node scripts/update-watchlist.js
//
// This is deliberately a maintenance script, not a runtime fetch — the file is ~120MB and
// updates periodically, so re-running this occasionally and committing the result is the
// right cadence, not fetching it on every trace request.

const fs = require("fs");
const path = require("path");
const { XMLParser } = require("fast-xml-parser");

const SDN_URL = "https://www.treasury.gov/ofac/downloads/sanctions/1.0/sdn_advanced.xml";
const WATCHLIST_PATH = path.join(__dirname, "..", "data", "watchlist.json");

// ChainHound only traces EVM chains, so only 0x-format addresses are ever checkable —
// OFAC's "USDT" feature type in particular covers Tether on any chain (mostly Tron/T...
// addresses), which would just be dead weight here.
const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

// FeatureTypeID -> chain label, discovered by inspecting the real XML's
// ReferenceValueSets/FeatureTypeValues section (these IDs are OFAC's own enumeration and
// are stable, but we still verify against the file's own value set at parse time below).
const TARGET_FEATURE_NAMES = new Set([
  "Digital Currency Address - ETH",
  "Digital Currency Address - USDT",
  "Digital Currency Address - USDC",
  "Digital Currency Address - ARB",
  "Digital Currency Address - BSC",
]);

function asArray(x) {
  if (x === undefined || x === null) return [];
  return Array.isArray(x) ? x : [x];
}

function primaryName(profile) {
  for (const identity of asArray(profile?.Identity)) {
    for (const alias of asArray(identity?.Alias)) {
      if (alias?.["@_Primary"] !== "true") continue;
      const namePart = asArray(alias?.DocumentedName?.DocumentedNamePart)[0];
      const value = namePart?.NamePartValue;
      const text = typeof value === "object" ? value["#text"] : value;
      if (text) return text;
    }
  }
  return "Unnamed SDN entry";
}

async function main() {
  console.log("Fetching OFAC SDN advanced XML (this file is ~120MB, may take a minute)...");
  const res = await fetch(SDN_URL);
  if (!res.ok) throw new Error(`Failed to fetch SDN list: HTTP ${res.status}`);
  const xml = await res.text();
  console.log(`Downloaded ${(xml.length / 1e6).toFixed(1)}MB, parsing...`);

  // parseTagValue must be false: fast-xml-parser's default numeric coercion treats
  // "0x..." addresses as hex number literals and silently corrupts them into floats.
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", parseTagValue: false });
  const doc = parser.parse(xml);
  const root = doc.Sanctions;

  const featureTypes = asArray(root.ReferenceValueSets?.FeatureTypeValues?.FeatureType);
  const targetFeatureTypeIds = new Set(
    featureTypes
      .filter((ft) => TARGET_FEATURE_NAMES.has(ft["#text"]))
      .map((ft) => ft["@_ID"])
  );
  console.log(`Matched ${targetFeatureTypeIds.size} of ${TARGET_FEATURE_NAMES.size} target feature types.`);

  const entries = [];
  const parties = asArray(root.DistinctParties?.DistinctParty);
  for (const party of parties) {
    const profile = party.Profile;
    if (!profile) continue;
    const features = asArray(profile.Feature).filter((f) =>
      targetFeatureTypeIds.has(f["@_FeatureTypeID"])
    );
    if (features.length === 0) continue;

    const name = primaryName(profile);

    for (const feature of features) {
      for (const version of asArray(feature.FeatureVersion)) {
        const detail = version.VersionDetail;
        const address = typeof detail === "object" ? detail["#text"] : detail;
        if (!address || typeof address !== "string" || !EVM_ADDRESS_RE.test(address)) continue;
        entries.push({
          address,
          label: `OFAC SDN: ${name}`,
          category: "sanctioned",
          source: "OFAC SDN List (sdn_advanced.xml)",
        });
      }
    }
  }

  console.log(`Extracted ${entries.length} sanctioned address entries.`);

  const existing = JSON.parse(fs.readFileSync(WATCHLIST_PATH, "utf8"));
  const preserved = existing.filter((e) => e.category === "burn");
  const merged = [...preserved, ...entries];

  fs.writeFileSync(WATCHLIST_PATH, JSON.stringify(merged, null, 2) + "\n");
  console.log(`Wrote ${merged.length} total entries to ${WATCHLIST_PATH}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
