const mongoose = require("mongoose");
const PointTransaction = require("../models/pointTransaction.model");

/**
 * Get user's current point balance
 */
const getPointBalance = async (user) => {
  if (!user?._id) {
    const error = new Error("Authentication required");
    error.statusCode = 401;
    throw error;
  }

  const result = await PointTransaction.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(user._id),
        status: "completed",
      },
    },
    {
      $group: {
        _id: null,
        balance: {
          $sum: "$points",
        },
      },
    },
  ]);

  const balance = result.length > 0 ? result[0].balance : 0;

  return {
    balance,
  };
};

/**
 * Get user's point transaction history
 */
const getPointHistory = async (user, query = {}) => {
  if (!user?._id) {
    const error = new Error("Authentication required");
    error.statusCode = 401;
    throw error;
  }

  const filter = {
    user: user._id,
  };

  if (query.type) {
    filter.type = query.type;
  }

  if (query.status) {
    filter.status = query.status;
  }

  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    PointTransaction.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    PointTransaction.countDocuments(filter),
  ]);

  return {
    transactions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get a specific point transaction
 */
const getPointTransactionById = async (user, transactionId) => {
  if (!user?._id) {
    const error = new Error("Authentication required");
    error.statusCode = 401;
    throw error;
  }

  if (!mongoose.Types.ObjectId.isValid(transactionId)) {
    const error = new Error("Invalid transaction ID");
    error.statusCode = 400;
    throw error;
  }

  const transaction = await PointTransaction.findOne({
    _id: transactionId,
    user: user._id,
  }).lean();

  if (!transaction) {
    const error = new Error("Point transaction not found");
    error.statusCode = 404;
    throw error;
  }

  return transaction;
};

/**
 * Add points to a user
 *
 * This should eventually be called by trusted backend flows,
 * such as successful help completion.
 */
const addPoints = async (user, data) => {
  if (!user?._id) {
    const error = new Error("Authentication required");
    error.statusCode = 401;
    throw error;
  }

  const { points, reason, referenceId, metadata } = data;

  if (!points || points <= 0) {
    const error = new Error("Points must be greater than 0");
    error.statusCode = 400;
    throw error;
  }

  const transaction = await PointTransaction.create({
    user: user._id,
    points,
    type: "credit",
    reason: reason || "Help completed",
    referenceId,
    metadata: metadata || {},
    status: "completed",
  });

  return transaction;
};

/**
 * Deduct points from a user
 *
 * Used when redeeming rewards.
 */
const deductPoints = async (user, data) => {
  if (!user?._id) {
    const error = new Error("Authentication required");
    error.statusCode = 401;
    throw error;
  }

  const { points, reason, referenceId, metadata } = data;

  if (!points || points <= 0) {
    const error = new Error("Points must be greater than 0");
    error.statusCode = 400;
    throw error;
  }

  /*
   * Calculate current balance before deducting.
   */
  const balanceData = await getPointBalance(user);
  const currentBalance = balanceData.balance;

  if (currentBalance < points) {
    const error = new Error("Insufficient points");
    error.statusCode = 400;
    throw error;
  }

  const transaction = await PointTransaction.create({
    user: user._id,
    points: -Math.abs(points),
    type: "debit",
    reason: reason || "Reward redemption",
    referenceId,
    metadata: metadata || {},
    status: "completed",
  });

  return {
    transaction,
    balance: currentBalance - points,
  };
};

module.exports = {
  getPointBalance,
  getPointHistory,
  getPointTransactionById,
  addPoints,
  deductPoints,
};