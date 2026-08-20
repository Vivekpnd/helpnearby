const mongoose = require("mongoose");

/**
 * Validate MongoDB ObjectId
 */
const isValidObjectId = (value) => {
  return mongoose.Types.ObjectId.isValid(value);
};

/**
 * Validate point transaction ID
 */
const validateTransactionId = (req, res, next) => {
  const { transactionId } = req.params;

  if (!transactionId) {
    return res.status(400).json({
      success: false,
      message: "transactionId is required",
    });
  }

  if (!isValidObjectId(transactionId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid transactionId",
    });
  }

  next();
};

/**
 * Validate point history query
 */
const validatePointHistoryQuery = (req, res, next) => {
  const { type, status, page, limit } = req.query;

  if (type !== undefined && !["credit", "debit"].includes(type)) {
    return res.status(400).json({
      success: false,
      message: "type must be either credit or debit",
    });
  }

  if (
    status !== undefined &&
    !["pending", "completed", "failed", "cancelled"].includes(status)
  ) {
    return res.status(400).json({
      success: false,
      message:
        "status must be pending, completed, failed, or cancelled",
    });
  }

  if (page !== undefined) {
    const pageNumber = Number(page);

    if (!Number.isInteger(pageNumber) || pageNumber < 1) {
      return res.status(400).json({
        success: false,
        message: "page must be a positive integer",
      });
    }
  }

  if (limit !== undefined) {
    const limitNumber = Number(limit);

    if (
      !Number.isInteger(limitNumber) ||
      limitNumber < 1 ||
      limitNumber > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "limit must be between 1 and 100",
      });
    }
  }

  next();
};

/**
 * Validate adding points
 *
 * This endpoint should eventually be protected
 * so normal users cannot arbitrarily award themselves points.
 */
const validateAddPoints = (req, res, next) => {
  const { points, reason, referenceId } = req.body;

  if (
    points === undefined ||
    typeof points !== "number" ||
    !Number.isFinite(points) ||
    points <= 0
  ) {
    return res.status(400).json({
      success: false,
      message: "points must be a number greater than 0",
    });
  }

  if (reason !== undefined && typeof reason !== "string") {
    return res.status(400).json({
      success: false,
      message: "reason must be a string",
    });
  }

  if (
    referenceId !== undefined &&
    typeof referenceId !== "string"
  ) {
    return res.status(400).json({
      success: false,
      message: "referenceId must be a string",
    });
  }

  next();
};

/**
 * Validate deducting points
 */
const validateDeductPoints = (req, res, next) => {
  const { points, reason, referenceId } = req.body;

  if (
    points === undefined ||
    typeof points !== "number" ||
    !Number.isFinite(points) ||
    points <= 0
  ) {
    return res.status(400).json({
      success: false,
      message: "points must be a number greater than 0",
    });
  }

  if (reason !== undefined && typeof reason !== "string") {
    return res.status(400).json({
      success: false,
      message: "reason must be a string",
    });
  }

  if (
    referenceId !== undefined &&
    typeof referenceId !== "string"
  ) {
    return res.status(400).json({
      success: false,
      message: "referenceId must be a string",
    });
  }

  next();
};

module.exports = {
  validateTransactionId,
  validatePointHistoryQuery,
  validateAddPoints,
  validateDeductPoints,
};