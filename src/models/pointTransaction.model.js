const mongoose = require("mongoose");

const pointTransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    points: {
      type: Number,
      required: true,
      validate: {
        validator: (value) => value !== 0,
        message: "Points cannot be zero",
      },
    },

    type: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
      index: true,
    },

    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },

    referenceId: {
      type: String,
      trim: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["pending", "completed", "failed", "cancelled"],
      default: "completed",
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

/**
 * Keep points and transaction type consistent.
 *
 * credit → positive points
 * debit  → negative points
 */
pointTransactionSchema.pre("validate", function (next) {
  if (this.type === "credit" && this.points < 0) {
    this.points = Math.abs(this.points);
  }

  if (this.type === "debit" && this.points > 0) {
    this.points = -Math.abs(this.points);
  }

  next();
});

const PointTransaction = mongoose.model(
  "PointTransaction",
  pointTransactionSchema
);

module.exports = PointTransaction;