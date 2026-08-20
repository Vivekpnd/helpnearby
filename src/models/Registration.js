const mongoose = require("mongoose");

const registrationSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },
    verificationCodeHash: {
      type: String,
      required: true,
      select: false
    },
    verificationExpiresAt: {
      type: Date,
      required: true,
      select: false
    },
    verifiedAt: {
      type: Date,
      default: null
    },
    attempts: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

registrationSchema.index({ verificationExpiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Registration", registrationSchema);
