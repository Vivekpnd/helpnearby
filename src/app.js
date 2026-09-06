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

/*
 * IMPORTANT FOR RENDER / REVERSE PROXY
 *
 * Render places the application behind a reverse proxy.
 * This allows Express and express-rate-limit to correctly
 * process X-Forwarded-For and determine the client IP.
 *
 * Do NOT remove this in production.
 */
app.set("trust proxy", 1);

/* =========================================================
   SECURITY
========================================================= */

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

/* =========================================================
   CORS
========================================================= */

/*
 * CLIENT_URL should contain your frontend/mobile-web origin
 * when applicable.
 *
 * Example:
 *
 * CLIENT_URL=https://your-frontend.com
 *
 * For React Native native requests, CORS generally does not
 * apply in the same way as a browser.
 */

const configuredClientUrl =
  process.env.CLIENT_URL?.trim();

if (configuredClientUrl) {
  app.use(
    cors({
      origin: configuredClientUrl,
      credentials: true,
    })
  );
} else {
  /*
   * No browser frontend has been configured.
   *
   * This keeps the API reachable while avoiding:
   *
   * origin: "*"
   * credentials: true
   *
   * which is invalid for credentialed browser requests.
   */
  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );
}

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

/*
 * GET /api/health
 *
 * Used by Render and manual browser/Postman testing.
 */

app.get(
  "/api/health",
  (req, res) => {
    return res.status(200).json({
      success: true,
      message: "Help Platform API is running",
    });
  }
);

/* =========================================================
   API ROUTES
========================================================= */

/*
 * ---------------------------------------------------------
 * Authentication
 * ---------------------------------------------------------
 *
 * POST /api/auth/register
 * POST /api/auth/login
 * POST /api/auth/register/verify-email
 * POST /api/auth/forgot-password
 * POST /api/auth/reset-password
 *
 * Authentication routes are protected by the auth
 * rate limiter.
 */

app.use(
  "/api/auth",
  authRateLimit,
  authRoutes
);

/*
 * ---------------------------------------------------------
 * Users
 * ---------------------------------------------------------
 */

app.use(
  "/api/users",
  userRoutes
);

/*
 * ---------------------------------------------------------
 * Help Requests
 * ---------------------------------------------------------
 */

app.use(
  "/api/help-requests",
  helpRequestRoutes
);

/*
 * ---------------------------------------------------------
 * Ratings
 * ---------------------------------------------------------
 */

app.use(
  "/api/ratings",
  ratingRoutes
);

/*
 * ---------------------------------------------------------
 * Rewards
 * ---------------------------------------------------------
 */

app.use(
  "/api/rewards",
  rewardRoutes
);

/*
 * ---------------------------------------------------------
 * Points
 * ---------------------------------------------------------
 */

app.use(
  "/api/points",
  pointRoutes
);

/*
 * ---------------------------------------------------------
 * Image Uploads
 * ---------------------------------------------------------
 *
 * POST /api/uploads/image
 *
 * The upload route itself is responsible for authentication
 * and multipart/form-data handling.
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
    return res.status(404).json({
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
    /*
     * Prevent unused-parameter lint issues while keeping
     * Express error-handler signature intact.
     */
    void next;

    console.error(
      "Unhandled application error:",
      {
        name: err?.name,
        message: err?.message,
        code: err?.code,
        statusCode:
          err?.statusCode ||
          err?.status,
      }
    );

    /* -----------------------------------------------------
       Multer errors
    ----------------------------------------------------- */

    if (
      err &&
      err.name === "MulterError"
    ) {
      return res.status(400).json({
        success: false,
        message:
          err.message ||
          "File upload error.",
      });
    }

    /* -----------------------------------------------------
       JSON parsing errors
    ----------------------------------------------------- */

    if (
      err &&
      err instanceof SyntaxError &&
      err.status === 400 &&
      err.type === "entity.parse.failed"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid JSON request body.",
      });
    }

    /* -----------------------------------------------------
       Payload too large
    ----------------------------------------------------- */

    if (
      err &&
      (
        err.type === "entity.too.large" ||
        err.status === 413
      )
    ) {
      return res.status(413).json({
        success: false,
        message:
          "Request payload is too large.",
      });
    }

    /* -----------------------------------------------------
       Generic application errors
    ----------------------------------------------------- */

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