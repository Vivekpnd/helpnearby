const {
  HELP_CATEGORIES,
  URGENCY_LEVELS,
  HELP_REQUEST_STATUS
} = require("../constants/helpRequest.constants");

/* =========================================================
   CREATE VALIDATION
========================================================= */

function validateCreateHelpRequest(data = {}) {
  const errors = {};

  const {
    category,
    description,
    photo,
    location,
    urgency
  } = data;

  if (
    typeof category !== "string" ||
    !HELP_CATEGORIES.includes(category.trim())
  ) {
    errors.category = `Category must be one of: ${HELP_CATEGORIES.join(
      ", "
    )}.`;
  }

  if (
    typeof description !== "string" ||
    description.trim().length < 5 ||
    description.trim().length > 1000
  ) {
    errors.description =
      "Description must be between 5 and 1000 characters.";
  }

  if (
    photo !== undefined &&
    photo !== null &&
    typeof photo !== "string"
  ) {
    errors.photo = "Photo must be a valid string or null.";
  }

  validateLocation(location, errors);

  if (!URGENCY_LEVELS.includes(urgency)) {
    errors.urgency = `Urgency must be one of: ${URGENCY_LEVELS.join(
      ", "
    )}.`;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/* =========================================================
   UPDATE VALIDATION
========================================================= */

function validateUpdateHelpRequest(data = {}) {
  const errors = {};

  const allowedFields = [
    "category",
    "description",
    "photo",
    "location",
    "urgency"
  ];

  const providedFields = Object.keys(data);

  if (providedFields.length === 0) {
    errors.request = "At least one field is required.";
  }

  const invalidFields = providedFields.filter(
    (field) => !allowedFields.includes(field)
  );

  if (invalidFields.length > 0) {
    errors.fields = `These fields cannot be updated: ${invalidFields.join(
      ", "
    )}.`;
  }

  if (data.category !== undefined) {
    if (
      typeof data.category !== "string" ||
      !HELP_CATEGORIES.includes(data.category.trim())
    ) {
      errors.category = `Category must be one of: ${HELP_CATEGORIES.join(
        ", "
      )}.`;
    }
  }

  if (data.description !== undefined) {
    if (
      typeof data.description !== "string" ||
      data.description.trim().length < 5 ||
      data.description.trim().length > 1000
    ) {
      errors.description =
        "Description must be between 5 and 1000 characters.";
    }
  }

  if (data.photo !== undefined) {
    if (
      data.photo !== null &&
      typeof data.photo !== "string"
    ) {
      errors.photo = "Photo must be a valid string or null.";
    }
  }

  if (data.urgency !== undefined) {
    if (!URGENCY_LEVELS.includes(data.urgency)) {
      errors.urgency = `Urgency must be one of: ${URGENCY_LEVELS.join(
        ", "
      )}.`;
    }
  }

  if (data.location !== undefined) {
    validateLocation(data.location, errors);
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/* =========================================================
   LOCATION VALIDATION
========================================================= */

function validateLocation(location, errors) {
  if (!location || typeof location !== "object") {
    errors.location = "Location is required.";
    return;
  }

  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);

  if (
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90
  ) {
    errors.latitude =
      "Latitude must be between -90 and 90.";
  }

  if (
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    errors.longitude =
      "Longitude must be between -180 and 180.";
  }
}

/* =========================================================
   QUERY VALIDATION
========================================================= */

function validateMyRequestsQuery(query = {}) {
  const errors = {};

  const allowedRoles = [
    "requester",
    "helper",
    "all"
  ];

  const allowedStatuses = Object.values(
    HELP_REQUEST_STATUS
  );

  if (
    query.role !== undefined &&
    !allowedRoles.includes(query.role)
  ) {
    errors.role =
      "Role must be requester, helper, or all.";
  }

  if (
    query.status !== undefined &&
    !allowedStatuses.includes(query.status)
  ) {
    errors.status =
      `Status must be one of: ${allowedStatuses.join(", ")}.`;
  }

  if (query.page !== undefined) {
    const page = Number(query.page);

    if (!Number.isInteger(page) || page < 1) {
      errors.page =
        "Page must be a positive integer.";
    }
  }

  if (query.limit !== undefined) {
    const limit = Number(query.limit);

    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      errors.limit =
        "Limit must be between 1 and 100.";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

module.exports = {
  validateCreateHelpRequest,
  validateUpdateHelpRequest,
  validateMyRequestsQuery
};
/* =========================================================
   NEARBY REQUEST QUERY VALIDATION
========================================================= */

function validateNearbyRequestsQuery(query = {}) {
  const errors = {};

  const radius = Number(query.radius ?? 5000);
  const limit = Number(query.limit ?? 20);

  if (
    !Number.isFinite(radius) ||
    radius <= 0 ||
    radius > 50000
  ) {
    errors.radius =
      "Radius must be greater than 0 and cannot exceed 50000 meters.";
  }

  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100
  ) {
    errors.limit =
      "Limit must be an integer between 1 and 100.";
  }

  if (
    query.category !== undefined &&
    typeof query.category !== "string"
  ) {
    errors.category = "Category must be a string.";
  }

  if (
    query.urgency !== undefined &&
    !["now", "today", "flexible"].includes(query.urgency)
  ) {
    errors.urgency =
      "Urgency must be one of: now, today, flexible.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
const {
  DISPUTE_REASONS
} = require("../constants/helpRequest.constants");

function validateDispute(data = {}) {
  const errors = {};

  if (!DISPUTE_REASONS.includes(data.reason)) {
    errors.reason =
      `Reason must be one of: ${DISPUTE_REASONS.join(", ")}.`;
  }

  if (
    typeof data.description !== "string" ||
    data.description.trim().length < 10 ||
    data.description.trim().length > 2000
  ) {
    errors.description =
      "Description must be between 10 and 2000 characters.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

module.exports = {
  validateCreateHelpRequest,
  validateUpdateHelpRequest,
  validateMyRequestsQuery,
  validateNearbyRequestsQuery,
  validateDispute
};