// controllers/feedbackController.js
const mongoose = require("mongoose");
const Feedback = require("../models/Feedback");

exports.createFeedback = async (req, res, next) => {
  try {
    const { areaId, outageId, message, contact } = req.body;
    if (!message) return res.status(400).json({ message: "message required" });

    if (areaId && !mongoose.isValidObjectId(areaId)) {
      return res.status(400).json({ message: "invalid areaId" });
    }
    if (outageId && !mongoose.isValidObjectId(outageId)) {
      return res.status(400).json({ message: "invalid outageId" });
    }

    const doc = await Feedback.create({
      userId: req.userId,
      areaId: areaId || undefined,
      outageId: outageId || undefined,
      message,
      contact
    });

    const populated = await Feedback.findById(doc._id)
      .populate("userId", "username email")
      .populate("areaId", "name city")
      .populate("outageId", "areaName startTime endTime status");

    res.status(201).json(populated);
  } catch (err) { next(err); }
};

exports.getFeedbacks = async (req, res, next) => {
  try {
    const docs = await Feedback.find()
      .populate("userId", "username email")
      .populate("areaId", "name city")
      .populate("outageId", "areaName startTime endTime status")
      .sort({ createdAt: -1 });
    res.json(docs);
  } catch (err) { next(err); }
};

exports.getFeedbackByArea = async (req, res, next) => {
  try {
    const { areaId } = req.params;
    if (!mongoose.isValidObjectId(areaId)) {
      return res.status(400).json({ message: "invalid areaId" });
    }
    const docs = await Feedback.find({ areaId })
      .populate("userId", "username email")
      .populate("areaId", "name city")
      .sort({ createdAt: -1 });
    res.json(docs);
  } catch (err) { next(err); }
};

exports.getFeedbackByOutage = async (req, res, next) => {
  try {
    const { outageId } = req.params;
    if (!mongoose.isValidObjectId(outageId)) {
      return res.status(400).json({ message: "invalid outageId" });
    }
    const docs = await Feedback.find({ outageId })
      .populate("userId", "username email")
      .populate("outageId", "areaName startTime endTime status")
      .sort({ createdAt: -1 });
    res.json(docs);
  } catch (err) { next(err); }
};

exports.getMyFeedback = async (req, res, next) => {
  try {
    const docs = await Feedback.find({ userId: req.userId })
      .populate("areaId", "name city")
      .populate("outageId", "areaName startTime endTime status")
      .sort({ createdAt: -1 });
    res.json(docs);
  } catch (err) { next(err); }
};