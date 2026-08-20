const mongoose = require("mongoose");

const HelpRequest = require("../models/HelpRequest");

const {
  HELP_REQUEST_STATUS
} = require("../constants/helpRequest.constants");

/* =========================================================
   CREATE HELP REQUEST
========================================================= */

async function createHelpRequest({
  requesterId,
  category,
  description,
  photo,
  location,
  urgency
}) {
  const helpRequest = await HelpRequest.create({
    requesterId,
    category: category.trim(),
    description: description.trim(),
    photo: photo ? photo.trim() : null,

    location: {
      type: "Point",
      coordinates: [
        Number(location.longitude),
        Number(location.latitude)
      ]
    },

    urgency,

    // Backend controls initial status.
    status: HELP_REQUEST_STATUS.SEARCHING
  });

  return helpRequest;
}

/* =========================================================
   GET HELP REQUEST BY ID
========================================================= */

async function getHelpRequestById(requestId) {
  if (!mongoose.Types.ObjectId.isValid(requestId)) {
    const error = new Error("Invalid help request ID.");
    error.statusCode = 400;
    throw error;
  }

  const helpRequest = await HelpRequest.findById(requestId)
    .populate(
      "requesterId",
      "username email name profilePhoto rating completedHelps helpPoints"
    )
    .populate(
      "helperId",
      "username name profilePhoto rating completedHelps helpPoints"
    )
    .lean();

  return helpRequest;
}

/* =========================================================
   GET MY HELP REQUESTS
========================================================= */

async function getMyHelpRequests({
  userId,
  role,
  status,
  page = 1,
  limit = 20
}) {
  const filter = {};

  /*
   * requester:
   * requests created by the current user.
   *
   * helper:
   * requests assigned to the current user.
   *
   * all:
   * both requester and helper activity.
   */

  if (role === "requester") {
    filter.requesterId = userId;
  } else if (role === "helper") {
    filter.helperId = userId;
  } else {
    filter.$or = [
      { requesterId: userId },
      { helperId: userId }
    ];
  }

  if (status) {
    filter.status = status;
  }

  const pageNumber = Math.max(Number(page), 1);
  const pageLimit = Math.min(
    Math.max(Number(limit), 1),
    100
  );

  const skip = (pageNumber - 1) * pageLimit;

  const [requests, total] = await Promise.all([
    HelpRequest.find(filter)
      .populate(
        "requesterId",
        "username name profilePhoto rating"
      )
      .populate(
        "helperId",
        "username name profilePhoto rating"
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageLimit)
      .lean(),

    HelpRequest.countDocuments(filter)
  ]);

  return {
    requests,

    pagination: {
      page: pageNumber,
      limit: pageLimit,
      total,
      totalPages: Math.ceil(total / pageLimit),
      hasNextPage: pageNumber * pageLimit < total,
      hasPreviousPage: pageNumber > 1
    }
  };
}

/* =========================================================
   UPDATE HELP REQUEST
========================================================= */

async function updateHelpRequest({
  requestId,
  requesterId,
  updates
}) {
  if (!mongoose.Types.ObjectId.isValid(requestId)) {
    const error = new Error("Invalid help request ID.");
    error.statusCode = 400;
    throw error;
  }

  /*
   * Only SEARCHING requests can be edited.
   *
   * Once a helper claims the request, the requester
   * cannot modify the core request information.
   */

  const helpRequest = await HelpRequest.findOne({
    _id: requestId,
    requesterId,
    status: HELP_REQUEST_STATUS.SEARCHING
  });

  if (!helpRequest) {
    const error = new Error(
      "Help request cannot be edited. It may not exist, may not belong to you, or may already be assigned."
    );

    error.statusCode = 404;
    throw error;
  }

  if (updates.category !== undefined) {
    helpRequest.category = updates.category.trim();
  }

  if (updates.description !== undefined) {
    helpRequest.description = updates.description.trim();
  }

  if (updates.photo !== undefined) {
    helpRequest.photo = updates.photo
      ? updates.photo.trim()
      : null;
  }

  if (updates.urgency !== undefined) {
    helpRequest.urgency = updates.urgency;
  }

  if (updates.location !== undefined) {
    helpRequest.location = {
      type: "Point",
      coordinates: [
        Number(updates.location.longitude),
        Number(updates.location.latitude)
      ]
    };
  }

  await helpRequest.save();

  return helpRequest;
}

/* =========================================================
   CANCEL HELP REQUEST
========================================================= */

async function cancelHelpRequest({
  requestId,
  userId
}) {
  if (!mongoose.Types.ObjectId.isValid(requestId)) {
    const error = new Error("Invalid help request ID.");
    error.statusCode = 400;
    throw error;
  }

  /*
   * Phase 2 rule:
   *
   * Requester can cancel while SEARCHING.
   *
   * We are intentionally not allowing arbitrary
   * cancellation after assignment at this stage.
   */

  const helpRequest = await HelpRequest.findOne({
    _id: requestId,
    requesterId: userId,
    status: {
      $in: [
        HELP_REQUEST_STATUS.SEARCHING,
        HELP_REQUEST_STATUS.ASSIGNED,
        HELP_REQUEST_STATUS.IN_PROGRESS
      ]
    }
  });

  if (!helpRequest) {
    const error = new Error(
      "Help request cannot be cancelled in its current state."
    );

    error.statusCode = 409;
    throw error;
  }

  helpRequest.status = HELP_REQUEST_STATUS.CANCELLED;
  helpRequest.cancelledAt = new Date();

  await helpRequest.save();

  return helpRequest;
}

/* =========================================================
   GET NEARBY HELP REQUESTS
========================================================= */

async function getNearbyHelpRequests({
  latitude,
  longitude,
  radius = 5000,
  limit = 20,
  category,
  urgency
}) {
  const matchStage = {
    status: HELP_REQUEST_STATUS.SEARCHING
  };

  /*
   * Category filtering is optional.
   *
   * If the helper selects a category,
   * only matching requests are returned.
   */
  if (category) {
    matchStage.category = category;
  }

  /*
   * Urgency filtering is optional.
   */
  if (urgency) {
    matchStage.urgency = urgency;
  }

  const requests = await HelpRequest.aggregate([
    /* =====================================================
       GEO SEARCH
    ===================================================== */

    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [
            Number(longitude),
            Number(latitude)
          ]
        },

        key: "location",

        distanceField: "distance",

        spherical: true,

        maxDistance: Number(radius),

        query: matchStage
      }
    },

    /* =====================================================
       LIMIT RESULTS
    ===================================================== */

    {
      $limit: Number(limit)
    },

    /* =====================================================
       CONVERT METERS TO KILOMETERS
    ===================================================== */

    {
      $addFields: {
        distanceKm: {
          $round: [
            {
              $divide: ["$distance", 1000]
            },
            2
          ]
        }
      }
    },

    /* =====================================================
       REQUESTER INFORMATION
    ===================================================== */

    {
      $lookup: {
        from: "users",
        localField: "requesterId",
        foreignField: "_id",
        as: "requester"
      }
    },

    {
      $unwind: {
        path: "$requester",
        preserveNullAndEmptyArrays: true
      }
    },

    /* =====================================================
       RESPONSE FIELDS
    ===================================================== */

    {
      $project: {
        requesterId: 1,
        helperId: 1,

        category: 1,
        description: 1,
        photo: 1,

        location: 1,

        urgency: 1,
        status: 1,

        createdAt: 1,

        distance: {
          $round: ["$distance", 0]
        },

        distanceKm: 1,

        requester: {
          _id: "$requester._id",
          username: "$requester.username",
          name: "$requester.name",
          profilePhoto: "$requester.profilePhoto",
          rating: "$requester.rating"
        }
      }
    }
  ]);

  return requests;
}

/* =========================================================
   ATOMIC CLAIM / ASSIGN HELP REQUEST
========================================================= */

async function claimHelpRequest({
  requestId,
  helperId
}) {
  if (!mongoose.Types.ObjectId.isValid(requestId)) {
    const error = new Error(
      "Invalid help request ID."
    );

    error.statusCode = 400;

    throw error;
  }

  if (!mongoose.Types.ObjectId.isValid(helperId)) {
    const error = new Error(
      "Invalid helper ID."
    );

    error.statusCode = 400;

    throw error;
  }

  /*
   * =======================================================
   * IMPORTANT
   * =======================================================
   *
   * We intentionally do NOT:
   *
   * 1. find request
   * 2. check SEARCHING
   * 3. modify request
   *
   * separately.
   *
   * That would create a race condition.
   *
   * Instead, status=SEARCHING is part of the MongoDB
   * update filter itself.
   */

  const claimedRequest =
    await HelpRequest.findOneAndUpdate(
      {
        _id: requestId,

        status:
          HELP_REQUEST_STATUS.SEARCHING,

        /*
         * A requester cannot claim their own request.
         */
        requesterId: {
          $ne: helperId
        },

        /*
         * Request must not already have a helper.
         */
        helperId: null
      },

      {
        $set: {
          helperId,

          status:
            HELP_REQUEST_STATUS.ASSIGNED,

          claimedAt: new Date()
        }
      },

      {
        new: true,

        /*
         * Ensures mongoose returns the updated
         * document rather than the previous one.
         */
        runValidators: true
      }
    )
      .populate(
        "requesterId",
        "username name profilePhoto rating completedHelps"
      )
      .populate(
        "helperId",
        "username name profilePhoto rating completedHelps"
      );

  /*
   * No document modified means the request was not
   * claimable.
   *
   * This can happen because:
   *
   * - request does not exist
   * - already claimed
   * - no longer SEARCHING
   * - requester attempted self-claim
   */
  if (!claimedRequest) {
    const error = new Error(
      "Help request is no longer available for claiming."
    );

    error.statusCode = 409;

    throw error;
  }

  return claimedRequest;
}

/* =========================================================
   START HELP REQUEST
   ASSIGNED → IN_PROGRESS
========================================================= */

async function startHelpRequest({
  requestId,
  helperId
}) {
  if (!mongoose.Types.ObjectId.isValid(requestId)) {
    const error = new Error("Invalid help request ID.");
    error.statusCode = 400;
    throw error;
  }

  const helpRequest =
    await HelpRequest.findOneAndUpdate(
      {
        _id: requestId,
        helperId,
        status: HELP_REQUEST_STATUS.ASSIGNED
      },
      {
        $set: {
          status: HELP_REQUEST_STATUS.IN_PROGRESS,
          startedAt: new Date()
        }
      },
      {
        new: true,
        runValidators: true
      }
    )
      .populate(
        "requesterId",
        "username name profilePhoto rating completedHelps"
      )
      .populate(
        "helperId",
        "username name profilePhoto rating completedHelps"
      );

  if (!helpRequest) {
    const error = new Error(
      "Help request cannot be started. It may not be assigned to you or is no longer in ASSIGNED state."
    );

    error.statusCode = 409;
    throw error;
  }

  return helpRequest;
}

/* =========================================================
   HELPER MARKS HELP COMPLETE
   IN_PROGRESS → AWAITING_CONFIRMATION
========================================================= */

async function completeHelpRequest({
  requestId,
  helperId
}) {
  if (!mongoose.Types.ObjectId.isValid(requestId)) {
    const error = new Error("Invalid help request ID.");
    error.statusCode = 400;
    throw error;
  }

  const helpRequest =
    await HelpRequest.findOneAndUpdate(
      {
        _id: requestId,
        helperId,
        status: HELP_REQUEST_STATUS.IN_PROGRESS
      },
      {
        $set: {
          status:
            HELP_REQUEST_STATUS.AWAITING_CONFIRMATION,

          completedAt: new Date()
        }
      },
      {
        new: true,
        runValidators: true
      }
    )
      .populate(
        "requesterId",
        "username name profilePhoto rating completedHelps"
      )
      .populate(
        "helperId",
        "username name profilePhoto rating completedHelps"
      );

  if (!helpRequest) {
    const error = new Error(
      "Help request cannot be completed. It may not be assigned to you or is not currently IN_PROGRESS."
    );

    error.statusCode = 409;
    throw error;
  }

  return helpRequest;
}

/* =========================================================
   REQUESTER CONFIRMS COMPLETION
   AWAITING_CONFIRMATION → COMPLETED
========================================================= */

async function confirmHelpCompletion({
  requestId,
  requesterId
}) {
  if (!mongoose.Types.ObjectId.isValid(requestId)) {
    const error = new Error("Invalid help request ID.");
    error.statusCode = 400;
    throw error;
  }

  const helpRequest =
    await HelpRequest.findOneAndUpdate(
      {
        _id: requestId,
        requesterId,
        status:
          HELP_REQUEST_STATUS.AWAITING_CONFIRMATION
      },
      {
        $set: {
          status:
            HELP_REQUEST_STATUS.COMPLETED,

          confirmedAt: new Date()
        }
      },
      {
        new: true,
        runValidators: true
      }
    )
      .populate(
        "requesterId",
        "username name profilePhoto rating completedHelps"
      )
      .populate(
        "helperId",
        "username name profilePhoto rating completedHelps"
      );

  if (!helpRequest) {
    const error = new Error(
      "Completion cannot be confirmed. The request may not belong to you or is not awaiting confirmation."
    );

    error.statusCode = 409;
    throw error;
  }

  return helpRequest;
}
/* =========================================================
   RAISE DISPUTE
========================================================= */

async function raiseDispute({
  requestId,
  userId,
  reason,
  description
}) {
  if (!mongoose.Types.ObjectId.isValid(requestId)) {
    const error = new Error("Invalid help request ID.");
    error.statusCode = 400;
    throw error;
  }

  const helpRequest = await HelpRequest.findOne({
    _id: requestId,

    $or: [
      { requesterId: userId },
      { helperId: userId }
    ],

    status: {
      $in: [
        HELP_REQUEST_STATUS.IN_PROGRESS,
        HELP_REQUEST_STATUS.AWAITING_CONFIRMATION,
        HELP_REQUEST_STATUS.COMPLETED
      ]
    }
  });

  if (!helpRequest) {
    const error = new Error(
      "This help request cannot be disputed."
    );

    error.statusCode = 409;
    throw error;
  }

  if (helpRequest.dispute?.isDisputed) {
    const error = new Error(
      "A dispute has already been raised for this request."
    );

    error.statusCode = 409;
    throw error;
  }

  helpRequest.status =
    HELP_REQUEST_STATUS.DISPUTED;

  helpRequest.dispute = {
    isDisputed: true,
    reason,
    description: description.trim(),
    raisedBy: userId,
    status: "OPEN",
    createdAt: new Date()
  };

  await helpRequest.save();

  return helpRequest;
}

module.exports = {
  createHelpRequest,
  getHelpRequestById,
  getMyHelpRequests,
  updateHelpRequest,
  cancelHelpRequest,
  getNearbyHelpRequests,
  claimHelpRequest,
  startHelpRequest,
  completeHelpRequest,
  confirmHelpCompletion,
  raiseDispute
};