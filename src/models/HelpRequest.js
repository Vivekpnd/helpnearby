const mongoose = require("mongoose");

/* =========================================================
   CONSTANTS
========================================================= */

const HELP_CATEGORIES = [
  "car_wash",
  "puncture_help",
  "form_filling",
  "grocery_help",
  "delivery_help",
  "moving_help",
  "technical_help",
  "other"
];

const HELP_REQUEST_STATUSES = [
  "DRAFT",
  "SEARCHING",
  "ASSIGNED",
  "IN_PROGRESS",
  "AWAITING_CONFIRMATION",
  "COMPLETED",
  "CANCELLED",
  "DISPUTED",
  "RESOLVED"
];

const URGENCY_LEVELS = [
  "now",
  "today",
  "flexible"
];

const DISPUTE_REASONS = [
  "HELP_NOT_COMPLETED",
  "POOR_SERVICE",
  "SAFETY_ISSUE",
  "PAYMENT_ISSUE",
  "OTHER"
];

const DISPUTE_STATUSES = [
  "OPEN",
  "UNDER_REVIEW",
  "RESOLVED",
  "REJECTED"
];

/* =========================================================
   HELP REQUEST SCHEMA
========================================================= */

const helpRequestSchema = new mongoose.Schema(
  {
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
       ASSIGNED HELPER
    ======================================================= */

    helperId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true
    },

    /* =======================================================
       REQUEST DETAILS
    ======================================================= */

    category: {
      type: String,
      required: true,
      enum: HELP_CATEGORIES,
      trim: true,
      index: true
    },

    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 1000
    },

    photo: {
      type: String,
      trim: true,
      default: null
    },

    /* =======================================================
       LOCATION
       
       GeoJSON Point:
       [longitude, latitude]
    ======================================================= */

    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
        default: "Point"
      },

      coordinates: {
        type: [Number],
        required: true,

        validate: {
          validator: function (coordinates) {
            if (
              !Array.isArray(coordinates) ||
              coordinates.length !== 2
            ) {
              return false;
            }

            const [
              longitude,
              latitude
            ] = coordinates;

            return (
              Number.isFinite(longitude) &&
              Number.isFinite(latitude) &&
              longitude >= -180 &&
              longitude <= 180 &&
              latitude >= -90 &&
              latitude <= 90
            );
          },

          message:
            "Location must contain valid [longitude, latitude] coordinates."
        }
      }
    },

    /* =======================================================
       URGENCY
    ======================================================= */

    urgency: {
      type: String,
      required: true,
      enum: URGENCY_LEVELS,
      default: "flexible",
      index: true
    },

    /* =======================================================
       REQUEST STATUS
    ======================================================= */

    status: {
      type: String,
      required: true,
      enum: HELP_REQUEST_STATUSES,
      default: "SEARCHING",
      index: true
    },

    /* =======================================================
       LIFECYCLE TIMESTAMPS
    ======================================================= */

    claimedAt: {
      type: Date,
      default: null
    },

    startedAt: {
      type: Date,
      default: null
    },

    completedAt: {
      type: Date,
      default: null
    },

    confirmedAt: {
      type: Date,
      default: null
    },

    cancelledAt: {
      type: Date,
      default: null
    },

    /* =======================================================
       DISPUTE
       
       Dispute is embedded inside the HelpRequest because
       the MVP currently supports one active dispute per
       help request.
    ======================================================= */

    dispute: {
      /* -----------------------------------------------------
         Whether this request has a dispute
      ----------------------------------------------------- */

      isDisputed: {
        type: Boolean,
        default: false
      },

      /* -----------------------------------------------------
         Dispute reason
      ----------------------------------------------------- */

      reason: {
        type: String,
        enum: DISPUTE_REASONS,
        default: null
      },

      /* -----------------------------------------------------
         Detailed explanation
      ----------------------------------------------------- */

      description: {
        type: String,
        trim: true,
        maxlength: 2000,
        default: null
      },

      /* -----------------------------------------------------
         User who raised the dispute
      ----------------------------------------------------- */

      raisedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
      },

      /* -----------------------------------------------------
         Dispute status
      ----------------------------------------------------- */

      status: {
        type: String,
        enum: DISPUTE_STATUSES,
        default: null
      },

      /* -----------------------------------------------------
         Dispute creation time
      ----------------------------------------------------- */

      createdAt: {
        type: Date,
        default: null
      }
    }
  },

  /* =========================================================
     SCHEMA OPTIONS
  ========================================================= */

  {
    timestamps: true
  }
);

/* =========================================================
   GEO-SPATIAL INDEX
========================================================= */

helpRequestSchema.index({
  location: "2dsphere"
});

/* =========================================================
   SEARCHING + CATEGORY + LOCATION
========================================================= */

helpRequestSchema.index({
  status: 1,
  category: 1,
  location: "2dsphere"
});

/* =========================================================
   HELPER + STATUS
========================================================= */

helpRequestSchema.index({
  helperId: 1,
  status: 1
});

/* =========================================================
   REQUESTER ACTIVITY
========================================================= */

helpRequestSchema.index({
  requesterId: 1,
  status: 1,
  createdAt: -1
});

/* =========================================================
   RECENT REQUESTS
========================================================= */

helpRequestSchema.index({
  createdAt: -1
});

/* =========================================================
   MODEL
========================================================= */

module.exports = mongoose.model(
  "HelpRequest",
  helpRequestSchema
);