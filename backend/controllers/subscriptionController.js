const crypto = require("crypto");

const Purchase = require("../models/Purchase");
const User = require("../models/User");

const SUBSCRIPTION_PLANS = [
  {
    id: "premium-monthly",
    name: "Premium Monthly",
    interval: "month",
    amount: 799,
    currency: "PKR",
    description: "Multiple watched areas, 15-minute reminders, nearby outage intelligence, and premium planning tools.",
  },
];

const PAYMENT_METHODS = [
  { id: "card_placeholder", label: "Card", provider: "Placeholder" },
  { id: "easypaisa_placeholder", label: "Easypaisa", provider: "Placeholder" },
  { id: "jazzcash_placeholder", label: "JazzCash", provider: "Placeholder" },
];

exports.getPlans = async (req, res) => {
  res.json({
    plans: SUBSCRIPTION_PLANS,
    paymentMethods: PAYMENT_METHODS,
    mode: "placeholder",
    message: "Placeholder checkout is enabled for now. Stripe can replace this later without changing the user flow.",
  });
};

exports.getStatus = async (req, res, next) => {
  try {
    const purchases = await Purchase.find({ userId: req.userId, isActive: true }).sort({ createdAt: -1 }).lean();
    res.json({
      role: req.user.role,
      activePurchase: purchases[0] || null,
      plans: SUBSCRIPTION_PLANS,
    });
  } catch (err) {
    next(err);
  }
};

exports.checkoutPlaceholder = async (req, res, next) => {
  try {
    const { planId, paymentMethod } = req.body;
    const plan = SUBSCRIPTION_PLANS.find((item) => item.id === planId);
    const method = PAYMENT_METHODS.find((item) => item.id === paymentMethod);

    if (!plan) {
      return res.status(400).json({ message: "Invalid plan selected" });
    }

    if (!method) {
      return res.status(400).json({ message: "Invalid payment method selected" });
    }

    const now = new Date();
    const expiryDate = new Date(now);
    expiryDate.setDate(expiryDate.getDate() + 30);

    const purchase = await Purchase.create({
      userId: req.userId,
      productId: plan.id,
      planId: plan.id,
      paymentMethod: method.id,
      provider: method.provider.toLowerCase(),
      amount: plan.amount,
      currency: plan.currency,
      status: "active",
      purchaseToken: crypto.randomUUID(),
      purchaseDate: now,
      expiryDate,
      isActive: true,
      raw: {
        mode: "placeholder",
        completedAt: now.toISOString(),
      },
    });

    await User.findByIdAndUpdate(req.userId, {
      $set: {
        role: "premium",
      },
    });

    const updatedUser = await User.findById(req.userId)
      .select("-password")
      .populate("areaId", "name city")
      .populate("watchedAreaIds", "name city");

    res.json({
      ok: true,
      mode: "placeholder",
      message: "Prototype payment completed successfully. Stripe can be connected later without changing this page.",
      purchase,
      user: updatedUser,
    });
  } catch (err) {
    next(err);
  }
};
