const mongoose = require("mongoose");

const RATING_VALUES = [1, 2, 3, 4, 5];

const ratingSchema = new mongoose.Schema(
  {
    /* =======================================================
       HELP REQUEST
    ======================================================= */

    helpRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HelpRequest",
      required: true,
      unique: true,
      index: true
    },

    /* =======================================================
       REQUESTER
    ======================================================= */

    requesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    /* =======================================================
       HELPER
    ======================================================= */

    helperId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    /* =======================================================
       RATING
    ======================================================= */

    rating: {
      type: Number,
      required: true,
      enum: RATING_VALUES
    },

    /* =======================================================
       REVIEW
    ======================================================= */

    review: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null
    },

    /* =======================================================
       OPTIONAL TIP
       
       Tip is optional.
       0 means no tip.
    ======================================================= */

    tipAmount: {
      type: Number,
      min: 0,
      default: 0
    },

    /* =======================================================
       TIMESTAMP
    ======================================================= */

    createdAt: {
      type: Date,
      default: Date.now
    },

    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

/* =========================================================
   HELPER RATING LOOKUP
========================================================= */

ratingSchema.index({
  helperId: 1,
  createdAt: -1
});

/* =========================================================
   REQUESTER RATING HISTORY
========================================================= */

ratingSchema.index({
  requesterId: 1,
  createdAt: -1
});

module.exports = mongoose.model(
  "Rating",
  ratingSchema
);