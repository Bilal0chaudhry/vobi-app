import { normalizeNumbers } from "./textNormalizer";

const NUM_WORD =
  /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand)\b/;

const TOPIC_PATTERNS = {
  eligibility: /\beligib|\bcoverage\b/i,
  networkStatus: /\bin[- ]network\b|\bout[- ]of[- ]network\b|\bparticipat|\bnetwork\b/i,
  deductible: /\bdeductible\b/i,
  oopMax: /\bout[- ]of[- ]pocket\b|\boop\b|\bmax\w*\b.*\bpocket|\bmaximum\b/i,
  copay: /\bcopay\b|\bco[- ]?pay\b|\bcoinsurance\b/i,
  cpt: /\bcpt\b/i,
  buyAndBill: /\bbuy\s*(and|&)\s*bill\b/i,
  priorAuth: /\bprior\s*auth|\bauthoriz/i,
  referral: /\breferral\b|\bpcp\b/i,
  formulary: /\bformular|\bpreferred\s*(drug|med)|\bformulary\b/i,
};

const DISPUTE_PHRASES =
  /just to clarify|that seems|are you sure|doesn't add up|doesn't seem|making sure|double check|hmm.*clarif/i;

function hasDollarAmount(text) {
  return (
    /\$\s?\d/.test(text) ||
    /\d+\s*(dollars?|hundred|thousand)\b/.test(text) ||
    (NUM_WORD.test(text) && /\bdollars?\b/.test(text)) ||
    (NUM_WORD.test(text) && /\bhundred\b/.test(text))
  );
}

function hasPercentage(text) {
  return (
    /\d+\s*(%|percent)\b/.test(text) ||
    (NUM_WORD.test(text) && /\bpercent\b/.test(text))
  );
}

function hasConfirmation(text) {
  return /\byes\b|\byeah\b|\bcorrect\b|\bthat'?s right\b|\bright\b/.test(text);
}

export function detectTopics(message) {
  const found = [];
  for (const [topic, pattern] of Object.entries(TOPIC_PATTERNS)) {
    if (pattern.test(message)) found.push(topic);
  }
  return found;
}

export function isDispute(message) {
  return DISPUTE_PHRASES.test(message);
}

export function updateChecklistFromRep(text, checklist, pendingTopics, cptCodes) {
  const next = { ...checklist };
  const dollar = hasDollarAmount(text);
  const pct = hasPercentage(text);
  const confirm = hasConfirmation(text);
  let remaining = [...pendingTopics];

  if (/\beligib\w*\b/.test(text) || /\bactive\b/.test(text) || /\bcoverage.+effective\b/.test(text)) {
    next.eligibility = "complete";
    remaining = remaining.filter((t) => t !== "eligibility");
  }

  if (/\bin[- ]network\b/i.test(text) || /\bout[- ]of[- ]network\b/i.test(text) || /\bparticipat\w*/i.test(text)) {
    next.networkStatus = "complete";
    remaining = remaining.filter((t) => t !== "networkStatus");
  }

  if (/\bdeductible\b/.test(text) && (dollar || confirm)) {
    next.deductible = "complete";
    remaining = remaining.filter((t) => t !== "deductible");
  }

  if (
    (/\bout[- ]of[- ]pocket\b/.test(text) || /\boop\b/.test(text) || /\bmax\w*\b.*\bpocket\b/.test(text)) &&
    (dollar || confirm)
  ) {
    next.oopMax = "complete";
    remaining = remaining.filter((t) => t !== "oopMax");
  }

  if (
    (/\bcopay\b/.test(text) || /\bco[- ]?pay\b/.test(text) || /\bcoinsurance\b/.test(text)) &&
    (dollar || pct || confirm)
  ) {
    next.copay = "complete";
    remaining = remaining.filter((t) => t !== "copay");
  }

  if (/\bbuy\s*(and|&)\s*bill\b/i.test(text) || (remaining.includes("buyAndBill") && confirm)) {
    next.buyAndBill = "complete";
    remaining = remaining.filter((t) => t !== "buyAndBill");
  }

  if (/\bprior\s*auth\w*\b/i.test(text) || /\bauthoriz\w*/i.test(text)) {
    next.priorAuth = "complete";
    remaining = remaining.filter((t) => t !== "priorAuth");
  }

  if (/\breferral\b/i.test(text) || /\bpcp\b/i.test(text)) {
    next.referral = "complete";
    remaining = remaining.filter((t) => t !== "referral");
  }

  if (/\bformular\w*/i.test(text) || /\bpreferred\s*(drug|med)\b/i.test(text)) {
    next.formulary = "complete";
    remaining = remaining.filter((t) => t !== "formulary");
  }

  if ((dollar || pct) && remaining.length > 0) {
    const financialTopics = ["deductible", "oopMax", "copay"];
    const match = remaining.find((t) => financialTopics.includes(t) && next[t] !== "complete");
    if (match) {
      next[match] = "complete";
      remaining = remaining.filter((t) => t !== match);
    }
  }

  if (confirm && remaining.length > 0) {
    const nonCptTopics = ["eligibility", "networkStatus", "deductible", "oopMax", "copay", "buyAndBill", "priorAuth", "referral", "formulary"];
    const resolvable = remaining.filter((t) => nonCptTopics.includes(t) && next[t] !== "complete");
    for (const topic of resolvable) {
      next[topic] = "complete";
    }
    remaining = remaining.filter((t) => !resolvable.includes(t));
  }

  const normalizedText = normalizeNumbers(text);
  const cleanText = normalizedText.replace(/[^a-z0-9]/gi, "");

  const cpt1Clean = cptCodes[0]?.replace(/[^a-z0-9]/gi, "");
  if (cpt1Clean && cleanText.includes(cpt1Clean)) next.cpt1 = "complete";

  const cpt2Clean = cptCodes[1]?.replace(/[^a-z0-9]/gi, "");
  if (cpt2Clean && cleanText.includes(cpt2Clean)) next.cpt2 = "complete";

  if (remaining.includes("cpt") && (/\byes\b|\byeah\b|\bcovered\b|\bauthorized\b/.test(text))) {
    if (next.cpt1 === "pending") next.cpt1 = "complete";
    else if (next.cpt2 === "pending") next.cpt2 = "complete";
    remaining = remaining.filter((t) => t !== "cpt");
  }

  return { checklist: next, pendingTopics: remaining };
}
