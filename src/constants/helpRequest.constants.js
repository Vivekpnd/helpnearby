const HELP_CATEGORIES = Object.freeze([
  "car_wash",
  "puncture_help",
  "form_filling",
  "grocery_help",
  "delivery_help",
  "moving_help",
  "technical_help",
  "other"
]);

const URGENCY_LEVELS = Object.freeze([
  "now",
  "today",
  "flexible"
]);

const HELP_REQUEST_STATUS = Object.freeze({
  DRAFT: "DRAFT",
  SEARCHING: "SEARCHING",
  ASSIGNED: "ASSIGNED",
  IN_PROGRESS: "IN_PROGRESS",
  AWAITING_CONFIRMATION: "AWAITING_CONFIRMATION",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  DISPUTED: "DISPUTED",
  RESOLVED: "RESOLVED"
});

const HELPER_STATUS = Object.freeze({
  AVAILABLE: "AVAILABLE",
  UNAVAILABLE: "UNAVAILABLE"
});

const DISPUTE_REASONS = Object.freeze([
  "HELP_NOT_COMPLETED",
  "POOR_SERVICE",
  "SAFETY_ISSUE",
  "PAYMENT_ISSUE",
  "OTHER"
]);

const DISPUTE_STATUS = Object.freeze({
  OPEN: "OPEN",
  UNDER_REVIEW: "UNDER_REVIEW",
  RESOLVED: "RESOLVED",
  REJECTED: "REJECTED"
});

module.exports = {
  HELP_CATEGORIES,
  URGENCY_LEVELS,
  HELP_REQUEST_STATUS,
  HELPER_STATUS,
  DISPUTE_REASONS,
  DISPUTE_STATUS
};