const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const helpRequestRoutes = require("./routes/helpRequest.routes");
const ratingRoutes = require("./routes/rating.routes");
const rewardRoutes = require("./routes/reward.routes");
const pointRoutes = require("./routes/point.routes");

const {
  authRateLimit
} = require("./middleware/rateLimit.middleware");

const app = express();

/* =========================================================
   SECURITY MIDDLEWARE
========================================================= */

app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true
  })
);

/* =========================================================
   BODY PARSERS
========================================================= */

app.use(
  express.json({
    limit: "1mb"
  })
);

app.use(
  express.urlencoded({
    extended: true
  })
);

app.use(cookieParser());

/* =========================================================
   HEALTH CHECK
========================================================= */

app.get("/api/health", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Help Platform API is running"
  });
});

/* =========================================================
   API ROUTES
========================================================= */

/* =========================================================
   AUTHENTICATION

   /api/auth/...
========================================================= */

app.use(
  "/api/auth",
  authRateLimit,
  authRoutes
);

/* =========================================================
   USERS

   /api/users/...
========================================================= */

app.use(
  "/api/users",
  userRoutes
);

/* =========================================================
   HELP REQUESTS

   /api/help-requests/...
========================================================= */

app.use(
  "/api/help-requests",
  helpRequestRoutes
);

/* =========================================================
   RATINGS

   /api/ratings/...
========================================================= */

app.use(
  "/api/ratings",
  ratingRoutes
);

/* =========================================================
   REWARDS

   /api/rewards/...
========================================================= */

app.use(
  "/api/rewards",
  rewardRoutes
);

/* =========================================================
   POINTS

   /api/points/...
========================================================= */

app.use(
  "/api/points",
  pointRoutes
);

/* =========================================================
   404 - ROUTE NOT FOUND
========================================================= */

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

/* =========================================================
   GLOBAL ERROR HANDLER
========================================================= */

app.use((err, req, res, next) => {
  console.error("API Error:", err);

  /* =======================================================
     MONGOOSE VALIDATION ERROR
  ======================================================= */

  if (err.name === "ValidationError") {
    const errors = {};

    Object.keys(err.errors).forEach((field) => {
      errors[field] =
        err.errors[field].message;
    });

    return res.status(400).json({
      success: false,
      message: "Validation failed.",
      errors
    });
  }

  /* =======================================================
     INVALID MONGODB OBJECT ID
  ======================================================= */

  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: `Invalid ${err.path}.`
    });
  }

  /* =======================================================
     DUPLICATE MONGODB KEY
  ======================================================= */

  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      message:
        "Duplicate resource already exists."
    });
  }

  /* =======================================================
     DEVELOPMENT ERROR
  ======================================================= */

  if (
    process.env.NODE_ENV === "development"
  ) {
    return res.status(
      err.statusCode || 500
    ).json({
      success: false,
      message:
        err.message ||
        "Internal server error",
      stack: err.stack
    });
  }

  /* =======================================================
     PRODUCTION ERROR
  ======================================================= */

  return res.status(
    err.statusCode || 500
  ).json({
    success: false,
    message:
      err.message ||
      "Internal server error"
  });
});

/* =========================================================
   EXPORT
========================================================= */

module.exports = app;