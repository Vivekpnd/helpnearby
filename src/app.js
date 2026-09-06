"use strict";

/* =========================================================
   ENVIRONMENT CONFIGURATION
========================================================= */

require("dotenv").config();

/* =========================================================
   EXPRESS
========================================================= */

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");

/* =========================================================
   ROUTES
========================================================= */

const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const helpRequestRoutes = require("./routes/helpRequest.routes");
const ratingRoutes = require("./routes/rating.routes");
const rewardRoutes = require("./routes/reward.routes");
const pointRoutes = require("./routes/point.routes");
const uploadRoutes = require("./routes/upload.routes");

/* =========================================================
   MIDDLEWARE
========================================================= */

const {
  authRateLimit,
} = require("./middleware/rateLimit.middleware");

/* =========================================================
   APP
========================================================= */

const app = express();

/* =========================================================
   SECURITY
========================================================= */

app.use(
  helmet()
);

/* =========================================================
   CORS
========================================================= */

app.use(
  cors({
    origin: process.env.CLIENT_URL || "*",
    credentials: true,
  })
);

/* =========================================================
   BODY PARSING
========================================================= */

app.use(
  express.json({
    limit: "1mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "1mb",
  })
);

/* =========================================================
   COOKIES
========================================================= */

app.use(
  cookieParser()
);

/* =========================================================
   HEALTH CHECK
========================================================= */

app.get(
  "/api/health",
  (req, res) => {
    res.status(200).json({
      success: true,
      message: "Help Platform API is running",
    });
  }
);

/* =========================================================
   API ROUTES
========================================================= */

/*
 * Authentication
 */
app.use(
  "/api/auth",
  authRateLimit,
  authRoutes
);

/*
 * Users
 */
app.use(
  "/api/users",
  userRoutes
);

/*
 * Help Requests
 */
app.use(
  "/api/help-requests",
  helpRequestRoutes
);

/*
 * Ratings
 */
app.use(
  "/api/ratings",
  ratingRoutes
);

/*
 * Rewards
 */
app.use(
  "/api/rewards",
  rewardRoutes
);

/*
 * Points
 */
app.use(
  "/api/points",
  pointRoutes
);

/*
 * Image Uploads
 *
 * POST /api/uploads/image
 */
app.use(
  "/api/uploads",
  uploadRoutes
);

/* =========================================================
   404 HANDLER
========================================================= */

app.use(
  (req, res) => {
    res.status(404).json({
      success: false,
      message: `Route not found: ${req.method} ${req.originalUrl}`,
    });
  }
);

/* =========================================================
   GLOBAL ERROR HANDLER
========================================================= */

app.use(
  (err, req, res, next) => {
    console.error(
      "Unhandled application error:",
      err
    );

    /*
     * Multer errors
     */
    if (
      err &&
      err.name === "MulterError"
    ) {
      return res.status(400).json({
        success: false,
        message: err.message || "File upload error.",
      });
    }

    /*
     * Generic application errors
     */
    const statusCode =
      Number(err?.statusCode) ||
      Number(err?.status) ||
      500;

    return res.status(statusCode).json({
      success: false,
      message:
        err?.message ||
        "Internal server error.",
    });
  }
);

/* =========================================================
   EXPORT EXPRESS APP
   ---------------------------------------------------------
   IMPORTANT:
   server.js imports this value and calls:

   app.listen(...)
========================================================= */

module.exports = app;

