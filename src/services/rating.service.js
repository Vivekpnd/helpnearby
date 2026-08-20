const mongoose = require("mongoose");

const Rating = require("../models/rating.model");
const HelpRequest = require("../models/HelpRequest");

/* =========================================================
   CONSTANTS
========================================================= */

const COMPLETED_STATUS = "COMPLETED";

/* =========================================================
   CREATE RATING
========================================================= */

/**
 * Business rules:
 *
 * 1. Help request ID must be valid.
 * 2. Request must exist.
 * 3. Request must be COMPLETED.
 * 4. Requester must own the request.
 * 5. Request must have an assigned helper.
 * 6. One help request can have only one rating.
 * 7. Rating + review + optional tip are stored together.
 */
async function createRating({
  helpRequestId,
  requesterId,
  rating,
  review,
  tipAmount
}) {
  /* -------------------------------------------------------
     Validate ObjectId
  ------------------------------------------------------- */

  if (!mongoose.Types.ObjectId.isValid(helpRequestId)) {
    const error = new Error(
      "Invalid help request ID."
    );

    error.statusCode = 400;
    throw error;
  }

  if (!mongoose.Types.ObjectId.isValid(requesterId)) {
    const error = new Error(
      "Invalid requester ID."
    );

    error.statusCode = 400;
    throw error;
  }

  /* -------------------------------------------------------
     Find completed help request
  ------------------------------------------------------- */

  const helpRequest = await HelpRequest.findOne({
    _id: helpRequestId,

    requesterId,

    status: COMPLETED_STATUS
  });

  if (!helpRequest) {
    const error = new Error(
      "Only the requester can rate a completed help request."
    );

    error.statusCode = 403;
    throw error;
  }

  /* -------------------------------------------------------
     Helper must exist
  ------------------------------------------------------- */

  if (!helpRequest.helperId) {
    const error = new Error(
      "This help request does not have an assigned helper."
    );

    error.statusCode = 409;
    throw error;
  }

  /* -------------------------------------------------------
     Prevent duplicate rating
  ------------------------------------------------------- */

  const existingRating = await Rating.findOne({
    helpRequestId
  });

  if (existingRating) {
    const error = new Error(
      "This help request has already been rated."
    );

    error.statusCode = 409;
    throw error;
  }

  /* -------------------------------------------------------
     Normalize optional values
  ------------------------------------------------------- */

  const normalizedReview =
    typeof review === "string"
      ? review.trim()
      : null;

  const normalizedTip =
    tipAmount === undefined ||
    tipAmount === null
      ? 0
      : Number(tipAmount);

  /* -------------------------------------------------------
     Create rating
  ------------------------------------------------------- */

  try {
    const createdRating =
      await Rating.create({
        helpRequestId: helpRequest._id,

        requesterId: helpRequest.requesterId,

        helperId: helpRequest.helperId,

        rating,

        review:
          normalizedReview || null,

        tipAmount: normalizedTip
      });

    return await Rating.findById(
      createdRating._id
    )
      .populate(
        "requesterId",
        "username name profilePhoto"
      )
      .populate(
        "helperId",
        "username name profilePhoto"
      )
      .populate(
        "helpRequestId",
        "category description status"
      );
  } catch (error) {
    /*
     * MongoDB unique index protection.
     *
     * Even if two requests reach this service at almost
     * exactly the same time, the unique helpRequestId index
     * prevents duplicate ratings.
     */

    if (error.code === 11000) {
      const duplicateError = new Error(
        "This help request has already been rated."
      );

      duplicateError.statusCode = 409;

      throw duplicateError;
    }

    throw error;
  }
}

/* =========================================================
   GET HELPER RATINGS
========================================================= */

async function getHelperRatings({
  helperId,
  page = 1,
  limit = 10
}) {
  if (!mongoose.Types.ObjectId.isValid(helperId)) {
    const error = new Error(
      "Invalid helper ID."
    );

    error.statusCode = 400;
    throw error;
  }

  const safePage = Math.max(
    Number(page) || 1,
    1
  );

  const safeLimit = Math.min(
    Math.max(Number(limit) || 10, 1),
    50
  );

  const skip =
    (safePage - 1) * safeLimit;

  const filter = {
    helperId
  };

  const [ratings, total] =
    await Promise.all([
      Rating.find(filter)
        .populate(
          "requesterId",
          "username name profilePhoto"
        )
        .sort({
          createdAt: -1
        })
        .skip(skip)
        .limit(safeLimit)
        .lean(),

      Rating.countDocuments(filter)
    ]);

  return {
    ratings,

    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(
        total / safeLimit
      ),
      hasNextPage:
        safePage <
        Math.ceil(total / safeLimit),
      hasPreviousPage:
        safePage > 1
    }
  };
}

/* =========================================================
   GET MY RATINGS
========================================================= */

/**
 * Returns ratings submitted by the authenticated requester.
 */
async function getMyRatings({
  requesterId,
  page = 1,
  limit = 10
}) {
  if (!mongoose.Types.ObjectId.isValid(requesterId)) {
    const error = new Error(
      "Invalid requester ID."
    );

    error.statusCode = 400;
    throw error;
  }

  const safePage = Math.max(
    Number(page) || 1,
    1
  );

  const safeLimit = Math.min(
    Math.max(Number(limit) || 10, 1),
    50
  );

  const skip =
    (safePage - 1) * safeLimit;

  const filter = {
    requesterId
  };

  const [ratings, total] =
    await Promise.all([
      Rating.find(filter)
        .populate(
          "helperId",
          "username name profilePhoto"
        )
        .populate(
          "helpRequestId",
          "category description status"
        )
        .sort({
          createdAt: -1
        })
        .skip(skip)
        .limit(safeLimit)
        .lean(),

      Rating.countDocuments(filter)
    ]);

  return {
    ratings,

    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(
        total / safeLimit
      ),
      hasNextPage:
        safePage <
        Math.ceil(total / safeLimit),
      hasPreviousPage:
        safePage > 1
    }
  };
}

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  createRating,
  getHelperRatings,
  getMyRatings
};