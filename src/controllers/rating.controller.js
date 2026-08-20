const ratingService = require("../services/rating.service");

const {
  validateCreateRating
} = require("../validators/rating.validator");

/* =========================================================
   CREATE RATING
   POST /api/ratings
========================================================= */

async function createRating(req, res, next) {
  try {
    /* -------------------------------------------------------
       Validate request body
    ------------------------------------------------------- */

    const {
      isValid,
      errors
    } = validateCreateRating(req.body);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors
      });
    }

    /* -------------------------------------------------------
       Create rating
    ------------------------------------------------------- */

    const rating =
      await ratingService.createRating({
        helpRequestId:
          req.body.helpRequestId,

        requesterId:
          req.user._id,

        rating:
          Number(req.body.rating),

        review:
          req.body.review,

        tipAmount:
          req.body.tipAmount
      });

    return res.status(201).json({
      success: true,
      message:
        "Rating submitted successfully.",

      data: {
        rating
      }
    });
  } catch (error) {
    next(error);
  }
}

/* =========================================================
   GET HELPER RATINGS
   GET /api/ratings/helper/:helperId
========================================================= */

async function getHelperRatings(req, res, next) {
  try {
    const {
      page = 1,
      limit = 10
    } = req.query;

    const result =
      await ratingService.getHelperRatings({
        helperId:
          req.params.helperId,

        page,

        limit
      });

    return res.status(200).json({
      success: true,
      message:
        "Helper ratings fetched successfully.",

      data: result
    });
  } catch (error) {
    next(error);
  }
}

/* =========================================================
   GET MY RATINGS
   GET /api/ratings/my
========================================================= */

async function getMyRatings(req, res, next) {
  try {
    const {
      page = 1,
      limit = 10
    } = req.query;

    const result =
      await ratingService.getMyRatings({
        requesterId:
          req.user._id,

        page,

        limit
      });

    return res.status(200).json({
      success: true,
      message:
        "Your ratings fetched successfully.",

      data: result
    });
  } catch (error) {
    next(error);
  }
}

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  createRating,
  getHelperRatings,
  getMyRatings
};