const mongoose = require("mongoose");

const rewardTransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    rewardId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    rewardName: {
      type: String,
      required: true,
      trim: true,
    },

    pointsSpent: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: ["pending", "completed", "cancelled", "failed"],
      default: "pending",
      index: true,
    },

    transactionReference: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

const RewardTransaction = mongoose.model(
  "RewardTransaction",
  rewardTransactionSchema
);

module.exports = RewardTransaction;