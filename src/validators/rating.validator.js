const RATING_VALUES = [1, 2, 3, 4, 5];

/* =========================================================
   CREATE RATING VALIDATOR
========================================================= */

function validateCreateRating(data = {}) {
  const errors = {};

  /* -------------------------------------------------------
     Rating
  ------------------------------------------------------- */

  const rating = Number(data.rating);

  if (
    !Number.isInteger(rating) ||
    !RATING_VALUES.includes(rating)
  ) {
    errors.rating =
      "Rating must be an integer between 1 and 5.";
  }

  /* -------------------------------------------------------
     Review
  ------------------------------------------------------- */

  if (
    data.review !== undefined &&
    data.review !== null
  ) {
    if (typeof data.review !== "string") {
      errors.review =
        "Review must be a string.";
    } else if (data.review.trim().length > 1000) {
      errors.review =
        "Review cannot exceed 1000 characters.";
    }
  }

  /* -------------------------------------------------------
     Optional Tip
  ------------------------------------------------------- */

  if (
    data.tipAmount !== undefined &&
    data.tipAmount !== null
  ) {
    const tipAmount = Number(data.tipAmount);

    if (
      !Number.isFinite(tipAmount) ||
      tipAmount < 0
    ) {
      errors.tipAmount =
        "Tip amount must be a valid positive number or 0.";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

module.exports = {
  validateCreateRating
};