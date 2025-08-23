const Purchase = require("../models/Purchase");
const { verifyPurchaseMock } = require("../services/googlePlay");

exports.verifyPurchase = async (req, res, next) => {
  try {
    const { productId, purchaseToken } = req.body;
    if (!productId || !purchaseToken) {
      return res.status(400).json({ message: "productId & purchaseToken required" });
    }

    const result = await verifyPurchaseMock(productId, purchaseToken);
    if (!result.isValid) return res.status(400).json({ message: "Invalid purchase" });

    const purchase = await Purchase.create({
      userId: req.userId,
      productId,
      purchaseToken,
      purchaseDate: result.purchaseDate,
      expiryDate: result.expiryDate,
      isActive: true,
      raw: result.raw
    });

    res.json({ ok: true, purchase });
  } catch (err) { next(err); }
};
