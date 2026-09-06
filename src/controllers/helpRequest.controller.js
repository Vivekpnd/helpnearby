const helpRequestService = require("../services/helpRequest.service");

const {
  validateCreateHelpRequest,
  validateUpdateHelpRequest,
  validateMyRequestsQuery,
  validateNearbyRequestsQuery,
  validateDispute
} = require("../validators/helpRequest.validator");

/* =========================================================
   CREATE
========================================================= */

async function createHelpRequest(req, res, next) {
  try {
    const validation =
      validateCreateHelpRequest(req.body);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: validation.errors
      });
    }

    const {
      category,
      customCategory,
      description,
      photo,
      details,
      location,
      urgency
    } = req.body;

    const helpRequest =
      await helpRequestService.createHelpRequest({
        requesterId: req.user._id,
        category,
        customCategory,
        description,
        photo,
        details,
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
   MY REQUESTS
========================================================= */

async function getMyHelpRequests(req, res, next) {
  try {
    const validation =
      validateMyRequestsQuery(req.query);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid query parameters.",
        errors: validation.errors
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
========================================================= */

async function updateHelpRequest(req, res, next) {
  try {
    const validation =
      validateUpdateHelpRequest(req.body);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: validation.errors
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
   NEARBY
========================================================= */

async function getNearbyHelpRequests(req, res, next) {
  try {
    const validation =
      validateNearbyRequestsQuery(req.query);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid nearby request parameters.",
        errors: validation.errors
      });
    }

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

    const requests =
      await helpRequestService.getNearbyHelpRequests({
        latitude,
        longitude,
        radius: Number(
          req.query.radius || 5000
        ),
        limit: Number(
          req.query.limit || 20
        ),
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
          radius: Number(
            req.query.radius || 5000
          ),
          unit: "meters"
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/* =========================================================
   CLAIM
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
   START
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
   COMPLETE
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
   CONFIRM COMPLETE
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
   DISPUTE
========================================================= */

async function raiseDispute(req, res, next) {
  try {
    const validation =
      validateDispute(req.body);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid dispute.",
        errors: validation.errors
      });
    }

    const {
      reason,
      description
    } = req.body;

    const helpRequest =
      await helpRequestService.raiseDispute({
        requestId: req.params.id,
        userId: req.user._id,
        reason,
        description
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