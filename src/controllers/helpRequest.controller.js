const helpRequestService = require("../services/helpRequest.service");

const {
  validateCreateHelpRequest,
  validateUpdateHelpRequest,
  validateMyRequestsQuery,
  validateNearbyRequestsQuery
} = require("../validators/helpRequest.validator");

/* =========================================================
   CREATE
   POST /api/help-requests
========================================================= */

async function createHelpRequest(req, res, next) {
  try {
    const {
      isValid,
      errors
    } = validateCreateHelpRequest(req.body);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors
      });
    }

    const {
      category,
      description,
      photo,
      location,
      urgency
    } = req.body;

    const helpRequest =
      await helpRequestService.createHelpRequest({
        requesterId: req.user._id,
        category,
        description,
        photo,
        location,
        urgency
      });

    return res.status(201).json({
      success: true,
      message:
        "Help request created successfully.",
      data: {
        helpRequest
      }
    });
  } catch (error) {
    next(error);
  }
}

/* =========================================================
   GET SINGLE
   GET /api/help-requests/:id
========================================================= */

async function getHelpRequest(req, res, next) {
  try {
    const helpRequest =
      await helpRequestService.getHelpRequestById(
        req.params.id
      );

    if (!helpRequest) {
      return res.status(404).json({
        success: false,
        message: "Help request not found."
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Help request retrieved successfully.",
      data: {
        helpRequest
      }
    });
  } catch (error) {
    next(error);
  }
}

/* =========================================================
   GET MY REQUESTS
   GET /api/help-requests/my
========================================================= */

async function getMyHelpRequests(req, res, next) {
  try {
    const {
      isValid,
      errors
    } = validateMyRequestsQuery(req.query);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid query parameters.",
        errors
      });
    }

    const result =
      await helpRequestService.getMyHelpRequests({
        userId: req.user._id,
        role: req.query.role || "all",
        status: req.query.status,
        page: req.query.page || 1,
        limit: req.query.limit || 20
      });

    return res.status(200).json({
      success: true,
      message:
        "Help request activity retrieved successfully.",
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/* =========================================================
   UPDATE
   PATCH /api/help-requests/:id
========================================================= */

async function updateHelpRequest(req, res, next) {
  try {
    const {
      isValid,
      errors
    } = validateUpdateHelpRequest(req.body);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors
      });
    }

    const helpRequest =
      await helpRequestService.updateHelpRequest({
        requestId: req.params.id,
        requesterId: req.user._id,
        updates: req.body
      });

    return res.status(200).json({
      success: true,
      message:
        "Help request updated successfully.",
      data: {
        helpRequest
      }
    });
  } catch (error) {
    next(error);
  }
}

/* =========================================================
   CANCEL
   POST /api/help-requests/:id/cancel
========================================================= */

async function cancelHelpRequest(req, res, next) {
  try {
    const helpRequest =
      await helpRequestService.cancelHelpRequest({
        requestId: req.params.id,
        userId: req.user._id
      });

    return res.status(200).json({
      success: true,
      message:
        "Help request cancelled successfully.",
      data: {
        helpRequest
      }
    });
  } catch (error) {
    next(error);
  }
}

/* =========================================================
   GET NEARBY REQUESTS
   GET /api/help-requests/nearby
========================================================= */

async function getNearbyHelpRequests(req, res, next) {
  try {
    const {
      isValid,
      errors
    } = validateNearbyRequestsQuery(req.query);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid nearby request parameters.",
        errors
      });
    }

    /*
     * Helper coordinates come from the authenticated
     * user's profile/location.
     *
     * We never accept requesterId/location ownership
     * information from the client.
     */

    const user = req.user;

    if (
      !user.location ||
      !Array.isArray(
        user.location.coordinates
      ) ||
      user.location.coordinates.length !== 2
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Your location is required to find nearby help requests."
      });
    }

    const [
      longitude,
      latitude
    ] = user.location.coordinates;

    const radius = Number(
      req.query.radius || 5000
    );

    const limit = Number(
      req.query.limit || 20
    );

    const requests =
      await helpRequestService.getNearbyHelpRequests({
        latitude,
        longitude,
        radius,
        limit,
        category: req.query.category,
        urgency: req.query.urgency
      });

    return res.status(200).json({
      success: true,
      message:
        "Nearby help requests retrieved successfully.",
      data: {
        requests,
        meta: {
          count: requests.length,
          radius,
          unit: "meters"
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/* =========================================================
   CLAIM HELP REQUEST
   POST /api/help-requests/:id/claim
========================================================= */

async function claimHelpRequest(req, res, next) {
  try {
    const helpRequest =
      await helpRequestService.claimHelpRequest({
        requestId: req.params.id,
        helperId: req.user._id
      });

    return res.status(200).json({
      success: true,
      message:
        "Help request claimed successfully.",
      data: {
        helpRequest
      }
    });
  } catch (error) {
    next(error);
  }
}

/* =========================================================
   START HELP
   POST /api/help-requests/:id/start
========================================================= */

async function startHelpRequest(req, res, next) {
  try {
    const helpRequest =
      await helpRequestService.startHelpRequest({
        requestId: req.params.id,
        helperId: req.user._id
      });

    return res.status(200).json({
      success: true,
      message:
        "Help session started successfully.",
      data: {
        helpRequest
      }
    });
  } catch (error) {
    next(error);
  }
}

/* =========================================================
   COMPLETE HELP
   POST /api/help-requests/:id/complete
========================================================= */

async function completeHelpRequest(req, res, next) {
  try {
    const helpRequest =
      await helpRequestService.completeHelpRequest({
        requestId: req.params.id,
        helperId: req.user._id
      });

    return res.status(200).json({
      success: true,
      message:
        "Help marked as completed. Waiting for requester confirmation.",
      data: {
        helpRequest
      }
    });
  } catch (error) {
    next(error);
  }
}

/* =========================================================
   CONFIRM COMPLETION
   POST /api/help-requests/:id/confirm-complete
========================================================= */

async function confirmHelpCompletion(
  req,
  res,
  next
) {
  try {
    const helpRequest =
      await helpRequestService.confirmHelpCompletion({
        requestId: req.params.id,
        requesterId: req.user._id
      });

    return res.status(200).json({
      success: true,
      message:
        "Help completion confirmed successfully.",
      data: {
        helpRequest
      }
    });
  } catch (error) {
    next(error);
  }
}

/* =========================================================
   RAISE DISPUTE
   POST /api/help-requests/:id/dispute
========================================================= */

async function raiseDispute(req, res, next) {
  try {
    const {
      reason,
      description
    } = req.body;

    /* -------------------------------------------------------
       Basic validation
    ------------------------------------------------------- */

    if (
      !reason ||
      typeof reason !== "string" ||
      !reason.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Dispute reason is required."
      });
    }

    if (
      !description ||
      typeof description !== "string" ||
      !description.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Dispute description is required."
      });
    }

    /* -------------------------------------------------------
       Delegate business logic to service
    ------------------------------------------------------- */

    const helpRequest =
      await helpRequestService.raiseDispute({
        requestId: req.params.id,

        userId: req.user._id,

        reason: reason.trim(),

        description: description.trim()
      });

    return res.status(200).json({
      success: true,
      message:
        "Dispute raised successfully.",
      data: {
        helpRequest
      }
    });
  } catch (error) {
    next(error);
  }
}

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  createHelpRequest,
  getHelpRequest,
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