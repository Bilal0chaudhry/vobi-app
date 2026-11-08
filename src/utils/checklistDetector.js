import { normalizeNumbers } from "./textNormalizer.js";

const NUM_WORD =
  /\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand)\b/i;

const TOPIC_PATTERNS = {
  eligibility: /\beligib|\bcoverage\s*status\b|\bbenefit\s*year\b|\bplan\s*active\b|\bactive\s*coverage\b/i,
  networkStatus: /\bin[- ]?network\b|\bout[- ]?of[- ]?network\b|\bparticipat|\bnetwork\b|\bplan\s*type\b/i,
  deductible: /\bdeductible\b/i,
  oopMax: /\bout[- ]?of[- ]?pocket\b|\boop\b|\bmax\w*\b.*\bpocket|\bpocket\s*max/i,
  copay: /\bcopay\b|\bco[- ]?pay\b|\bcoinsurance\b|\ballowed\s*amount\b/i,
  cpt: /\bcpt\b|\bprocedure\s*code/i,
  buyAndBill: /\bbuy\s*(and|&)\s*bill\b|\bspecialty\s*pharmacy\b|\bmedical\s*benefit\b/i,
  priorAuth: /\bprior\s*auth|\bauthoriz|\bpa\s*required\b|\bneed\s*auth/i,
  referral: /\breferral\b|\bpcp\b/i,
  formulary: /\bformular|\bpreferred\b|\bj[- ]?codes?\b/i,
  referenceNumber: /\breference\s*(number|#|num)?\b|\bref\s*(number|#)\b|\bcall\s*id\b|\bconfirmation\s*(number|#)\b/i,
};

const DISPUTE_PHRASES =
  /just to clarify|that seems|are you sure|doesn't add up|doesn't seem|making sure|double check|hmm.*clarif|could you say.*again|could you repeat|i meant/i;

// Phrases where the rep is asking Vobi to hold/wait rather than answering
const HOLD_ONLY_RE =
  /^\s*(hold\s*on|one\s*(second|moment|sec|minute)|just\s*a\s*(second|moment|sec|minute)|give\s*me\s*(a|one)\s*(second|moment|sec|minute)|let\s*me\s*(check|look|pull|see)|bear\s*with\s*me)[.,!\s]*$/i;

// Phrases where the rep is only asking Vobi for patient/provider identifiers
const REP_COUNTER_QUESTION_RE =
  /\b(what('?s|\s+is)\s+the\s+(patient|member|dob|date\s+of\s+birth|npi|tax\s+id|tin|code)|would\s+you\s+tell\s+me\s+the\s+patient|can\s+(i|you)\s+(get|have|give)\s+the\s+(patient|member|dob|date\s+of\s+birth|npi))\b/i;

function stripWaitTimeWords(text) {
  return text.replace(
    /\b(one|a|two|few)\s+(seconds?|moments?|minutes?|secs?|mins?)\b/gi,
    ""
  );
}

function hasDollarAmount(text) {
  const cleaned = stripWaitTimeWords(text);
  return (
    /\$\s?\d/.test(cleaned) ||
    /\d+\s*(dollars?|bucks?|hundred|thousand)\b/i.test(cleaned) ||
    (NUM_WORD.test(cleaned) && /\b(dollars?|hundred|thousand)\b/i.test(cleaned)) ||
    /\b(no|zero|none)\s+(deductible|copay|co[- ]?pay|coinsurance|out[- ]?of[- ]?pocket)\b/i.test(cleaned) ||
    /\b(fully\s+met|already\s+met|is\s+met|waived|nothing\s+left|nothing\s+remaining)\b/i.test(cleaned)
  );
}

function hasPercentage(text) {
  const cleaned = stripWaitTimeWords(text);
  return (
    /\d+\s*(%|percent)\b/i.test(cleaned) ||
    (NUM_WORD.test(cleaned) && /\bpercent\b/i.test(cleaned))
  );
}

function hasNumber(text) {
  const cleaned = stripWaitTimeWords(text);
  return /\b\d+\b/.test(cleaned) || NUM_WORD.test(cleaned);
}

function hasAnswerConfirmation(text) {
  return /\byes\b|\byeah\b|\byep\b|\bno\b|\bnope\b|\bnone\b|\bcorrect\b|\bthat'?s\s*right\b|\bright\b|\bcovered\b|\bnot\s*covered\b|\bnot\s*required\b|\bno\s*(prior\s*)?auth\b|\bdoesn'?t\s*(need|require)\b|\bdon'?t\s*(need|require)\b|\bit'?s\s*good\b|\bactive\b|\bwaived\b|\bmet\b/i.test(
    text
  );
}

function extractQuestionFocus(message) {
  // Split Vobi's turn into sentences; focus on sentences with "?" or the final sentence
  // so introductory statements ("I'm checking benefits for J7323 and 20610. What's the eligibility status?")
  // don't prematurely queue J7323/20610 before Vobi actually asks about them.
  const sentences = message
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (sentences.length <= 1) return message;
  const questionSentences = sentences.filter((s) => s.includes("?"));
  if (questionSentences.length > 0) {
    return questionSentences.join(" ");
  }
  return sentences[sentences.length - 1];
}

export function detectTopics(message, cptCodes = []) {
  const focus = extractQuestionFocus(message);
  const found = [];
  for (const [topic, pattern] of Object.entries(TOPIC_PATTERNS)) {
    if (pattern.test(focus)) found.push(topic);
  }

  // Only queue specific CPT codes (cpt1 / cpt2) when the question focus mentions the code
  // and isn't purely a "Do either X or Y need prior auth?" question.
  const isPurePriorAuthQuestion =
    /\b(either|any\s+of)\b/i.test(focus) &&
    /\b(prior\s*auth|authoriz)/i.test(focus) &&
    !/\b(covered|allowed\s*amount|copay|coinsurance)\b/i.test(focus);

  if (!isPurePriorAuthQuestion) {
    const cleanFocus = normalizeNumbers(focus).replace(/[^a-z0-9]/gi, "").toLowerCase();
    const cpt1Clean = cptCodes?.[0]?.replace(/[^a-z0-9]/gi, "").toLowerCase();
    const cpt2Clean = cptCodes?.[1]?.replace(/[^a-z0-9]/gi, "").toLowerCase();

    if (cpt1Clean && cleanFocus.includes(cpt1Clean)) {
      found.push("cpt1");
    }
    if (cpt2Clean && cleanFocus.includes(cpt2Clean)) {
      found.push("cpt2");
    }
  }

  return found;
}

export function isDispute(message) {
  return DISPUTE_PHRASES.test(message);
}

export function updateChecklistFromRep(text, checklist, pendingTopics, cptCodes = []) {
  const next = { ...checklist };
  let remaining = [...pendingTopics];

  if (!text || !text.trim()) {
    return { checklist: next, pendingTopics: remaining };
  }

  // 1. Ignore pure hold/wait responses ("hold on one second", "let me check")
  if (HOLD_ONLY_RE.test(text.trim())) {
    return { checklist: next, pendingTopics: remaining };
  }

  const dollar = hasDollarAmount(text);
  const pct = hasPercentage(text);
  const num = hasNumber(text);
  const confirm = hasAnswerConfirmation(text);
  const isCounterQuestionOnly =
    REP_COUNTER_QUESTION_RE.test(text) &&
    !/\b(in[- ]?network|out[- ]?of[- ]?network|active|hmo|ppo|pos|epo|covered|deductible)\b/i.test(text);

  // 2. Direct keyword + value matches (work even if rep volunteers info out of order)
  if (
    /\beligib\w*\b/i.test(text) ||
    /\bactive\b/i.test(text) ||
    /\bcoverage.+effective\b/i.test(text) ||
    /\bbenefit\s*year\b/i.test(text)
  ) {
    next.eligibility = "complete";
    remaining = remaining.filter((t) => t !== "eligibility");
  }

  if (
    /\bin[- ]?network\b/i.test(text) ||
    /\bout[- ]?of[- ]?network\b/i.test(text) ||
    /\bparticipat\w*/i.test(text) ||
    /\b(hmo|ppo|pos|epo)\b/i.test(text)
  ) {
    next.networkStatus = "complete";
    remaining = remaining.filter((t) => t !== "networkStatus");
  }

  if (/\bdeductible\b/i.test(text) && (dollar || num || confirm)) {
    next.deductible = "complete";
    remaining = remaining.filter((t) => t !== "deductible");
  }

  if (
    (/\bout[- ]?of[- ]?pocket\b/i.test(text) || /\boop\b/i.test(text) || /\bmax\w*\b.*\bpocket\b/i.test(text)) &&
    (dollar || num || confirm)
  ) {
    next.oopMax = "complete";
    remaining = remaining.filter((t) => t !== "oopMax");
  }

  if (
    (/\bcopay\b/i.test(text) ||
      /\bco[- ]?pay\b/i.test(text) ||
      /\bcoinsurance\b/i.test(text) ||
      /\ballowed\s*amount\b/i.test(text)) &&
    (dollar || pct || num || confirm)
  ) {
    next.copay = "complete";
    remaining = remaining.filter((t) => t !== "copay");
  }

  if (
    /\bbuy\s*(and|&|or)?\s*(bill|go)\b/i.test(text) ||
    /\bspecialty\s*pharmacy\b/i.test(text) ||
    /\bmedical\s*(benefit|specialty)\b/i.test(text) ||
    (!isCounterQuestionOnly && remaining.includes("buyAndBill") && confirm)
  ) {
    next.buyAndBill = "complete";
    remaining = remaining.filter((t) => t !== "buyAndBill");
  }

  if (
    /\bprior\s*auth\w*\b/i.test(text) ||
    /\bauthoriz\w*/i.test(text) ||
    /\b(doesn'?t|don'?t|no)\s*(need|require)\s*(any\s*)?(prior|auth|pa|file)/i.test(text) ||
    (!isCounterQuestionOnly && remaining.includes("priorAuth") && confirm)
  ) {
    next.priorAuth = "complete";
    remaining = remaining.filter((t) => t !== "priorAuth");
  }

  if (
    /\breferral\b/i.test(text) ||
    /\bpcp\b/i.test(text) ||
    (!isCounterQuestionOnly && remaining.includes("referral") && confirm)
  ) {
    next.referral = "complete";
    remaining = remaining.filter((t) => t !== "referral");
  }

  if (
    /\bformular\w*/i.test(text) ||
    /\bpreferred\s*(drug|med|j[- ]?code|brand)?\b/i.test(text) ||
    /\bnon[- ]?formular\w*/i.test(text) ||
    (!isCounterQuestionOnly && remaining.includes("formulary") && text.trim().length > 1)
  ) {
    next.formulary = "complete";
    remaining = remaining.filter((t) => t !== "formulary");
  }

  const normalizedText = normalizeNumbers(text);
  const cleanText = normalizedText.replace(/[^a-z0-9]/gi, "").toLowerCase();

  if (
    /\breference\b/i.test(text) ||
    /\bref\s*(number|#)/i.test(text) ||
    /\bconfirmation\s*(number|#)/i.test(text) ||
    (!isCounterQuestionOnly &&
      remaining.includes("referenceNumber") &&
      (/\d/.test(normalizedText) || /[a-z0-9]{3,}/i.test(cleanText)))
  ) {
    next.referenceNumber = "complete";
    remaining = remaining.filter((t) => t !== "referenceNumber");
  }

  // If the rep only asked Vobi for patient/provider info ("what's the patient name?"),
  // do not consume remaining pendingTopics via generic fallback rules.
  if (isCounterQuestionOnly) {
    return { checklist: next, pendingTopics: remaining };
  }

  // 3. Financial fallback for pending topics
  if ((dollar || pct || num) && remaining.length > 0) {
    const financialTopics = ["deductible", "oopMax", "copay"];
    const match = remaining.find((t) => financialTopics.includes(t) && next[t] !== "complete");
    if (match) {
      next[match] = "complete";
      remaining = remaining.filter((t) => t !== match);
    }
  }

  // 4. CPT code resolution (explicit code mention or answer to pending cpt1/cpt2)
  const cpt1Clean = cptCodes?.[0]?.replace(/[^a-z0-9]/gi, "").toLowerCase();
  if (cpt1Clean && cleanText.includes(cpt1Clean)) {
    next.cpt1 = "complete";
    remaining = remaining.filter((t) => t !== "cpt1");
  }

  const cpt2Clean = cptCodes?.[1]?.replace(/[^a-z0-9]/gi, "").toLowerCase();
  if (cpt2Clean && cleanText.includes(cpt2Clean)) {
    next.cpt2 = "complete";
    remaining = remaining.filter((t) => t !== "cpt2");
  }

  if (confirm || num || dollar || pct) {
    if (remaining.includes("cpt1") && next.cpt1 !== "complete") {
      next.cpt1 = "complete";
      remaining = remaining.filter((t) => t !== "cpt1");
    }
    if (remaining.includes("cpt2") && next.cpt2 !== "complete") {
      next.cpt2 = "complete";
      remaining = remaining.filter((t) => t !== "cpt2");
    }
    if (remaining.includes("cpt")) {
      if (next.cpt1 === "pending") next.cpt1 = "complete";
      else if (next.cpt2 === "pending") next.cpt2 = "complete";
      remaining = remaining.filter((t) => t !== "cpt");
    }
  }

  // 5. General confirmation fallback for remaining pending topics
  if (confirm && remaining.length > 0) {
    const nonCptTopics = [
      "eligibility",
      "networkStatus",
      "deductible",
      "oopMax",
      "copay",
      "buyAndBill",
      "priorAuth",
      "referral",
      "formulary",
    ];
    const resolvable = remaining.filter((t) => nonCptTopics.includes(t) && next[t] !== "complete");
    for (const topic of resolvable) {
      next[topic] = "complete";
    }
    remaining = remaining.filter((t) => !resolvable.includes(t));
  }

  return { checklist: next, pendingTopics: remaining };
}
