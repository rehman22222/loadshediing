const stringSimilarity = require("string-similarity");
const { normalizeName } = require("./geo");

const DEFAULT_MIN_SCORE = 0.38;

function normalizeSearchText(value) {
  return normalizeName(value)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/&/g, " and ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function compactKey(value) {
  return normalizeSearchText(value).replace(/[^a-z0-9]/g, "");
}

function getTokens(value) {
  return normalizeSearchText(value)
    .split(" ")
    .filter((token) => token.length > 1);
}

function safeSimilarity(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length === 1 || b.length === 1) {
    return a[0] === b[0] ? 0.6 : 0;
  }
  return stringSimilarity.compareTwoStrings(a, b);
}

function scoreAreaName(query, candidateName) {
  const queryText = normalizeSearchText(query);
  const candidateText = normalizeSearchText(candidateName);

  if (!queryText || !candidateText) return 0;
  if (queryText === candidateText) return 1;

  const queryCompact = compactKey(queryText);
  const candidateCompact = compactKey(candidateText);
  let score = 0;

  if (candidateText.includes(queryText)) score = Math.max(score, 0.96);
  if (queryCompact && candidateCompact.includes(queryCompact)) score = Math.max(score, 0.94);

  const queryTokens = getTokens(queryText);
  const candidateTokens = getTokens(candidateText);

  if (queryTokens.length && candidateTokens.length) {
    const tokenScores = queryTokens.map((queryToken) => {
      if (candidateTokens.includes(queryToken)) return 1;
      if (candidateTokens.some((candidateToken) => candidateToken.includes(queryToken))) return 0.92;
      if (candidateTokens.some((candidateToken) => candidateToken.length >= 3 && queryToken.includes(candidateToken))) {
        return 0.82;
      }
      return Math.max(...candidateTokens.map((candidateToken) => safeSimilarity(queryToken, candidateToken)));
    });

    const tokenAverage = tokenScores.reduce((sum, item) => sum + item, 0) / tokenScores.length;
    const tokenCoverage = tokenScores.filter((item) => item >= 0.72).length / tokenScores.length;
    score = Math.max(score, tokenAverage * 0.68 + tokenCoverage * 0.32);

    const everyTokenPresent = queryTokens.every((token) => candidateCompact.includes(compactKey(token)));
    if (everyTokenPresent) {
      score = Math.max(score, 0.9);
    }
  }

  score = Math.max(
    score,
    safeSimilarity(queryText, candidateText) * 0.9,
    safeSimilarity(queryCompact, candidateCompact) * 0.92
  );

  return Math.min(score, 1);
}

function scoreArea(query, area) {
  return Math.max(scoreAreaName(query, area.name), scoreAreaName(query, area.normalizedName || ""));
}

function rankAreasBySearch(areas, query, options = {}) {
  const minScore = options.minScore ?? DEFAULT_MIN_SCORE;
  const queryText = normalizeSearchText(query);

  if (!queryText) {
    return areas.map((area) => ({ area, matchScore: 1 }));
  }

  return areas
    .map((area) => ({ area, matchScore: scoreArea(queryText, area) }))
    .filter((item) => item.matchScore >= minScore)
    .sort((a, b) => b.matchScore - a.matchScore || a.area.name.localeCompare(b.area.name));
}

module.exports = {
  DEFAULT_MIN_SCORE,
  compactKey,
  normalizeSearchText,
  rankAreasBySearch,
  scoreAreaName,
};
