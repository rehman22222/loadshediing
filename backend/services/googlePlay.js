// services/googlePlay.js
// Mock verifier used during development/testing.
// Replace with real Google Play / App Store validation later.

async function verifyPurchaseMock(productId, purchaseToken) {
  // Fake rules so you can test:
  // - any token that starts with "valid_" is accepted for 30 days
  // - anything else is rejected
  const ok = typeof purchaseToken === "string" && purchaseToken.startsWith("valid_");
  if (!ok) return { isValid: false };

  const now = new Date();
  const expiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  return {
    isValid: true,
    purchaseDate: now,
    expiryDate: expiry,
    raw: { productId, purchaseToken, provider: "mock" }
  };
}

module.exports = { verifyPurchaseMock };
