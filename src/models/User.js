const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    emailVerified: {
      type: Boolean,
      default: false
    },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
      match: /^[a-z0-9_]+$/,
      index: true
    },
    passwordHash: {
      type: String,
      required: true,
      select: false
    },
    name: {
      type: String,
      trim: true,
      maxlength: 60,
      default: null
    },
    profilePhoto: {
      type: String,
      default: null
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: {
        type: [Number],
        default: [0, 0]
      }
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    completedHelps: {
      type: Number,
      default: 0
    },
    helpPoints: {
      type: Number,
      default: 0
    },
    helperStatus: {
      type: String,
      enum: ["USER", "COMMUNITY_HELPER", "TRUSTED_HELPER"],
      default: "USER"
    }
  },
  { timestamps: true }
);

userSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("User", userSchema);
