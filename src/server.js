"use strict";

/* =========================================================
   DNS CONFIGURATION
   ---------------------------------------------------------
   Helps resolve MongoDB Atlas SRV records reliably in
   environments where the default DNS resolver causes
   connection issues.
========================================================= */

const dns = require("node:dns");

dns.setServers([
  "8.8.8.8",
  "1.1.1.1",
]);

/* =========================================================
   ENVIRONMENT CONFIGURATION
========================================================= */

require("dotenv").config();

/* =========================================================
   APPLICATION IMPORTS
========================================================= */

/*
 * IMPORTANT:
 * app.js MUST export the Express application itself:
 *
 * module.exports = app;
 *
 * Do NOT use:
 * module.exports = { app };
 */
const app = require("./app");

const connectDB = require("./config/db");

const {
  verifyEmailTransport,
  closeEmailTransport,
} = require("./services/email.service");

/* =========================================================
   SERVER CONFIGURATION
========================================================= */

// Render automatically provides process.env.PORT.
// 5000 is used for local development.
const PORT =
  Number(process.env.PORT) || 5000;

// Render requires the application to listen on
// 0.0.0.0 so it can receive external traffic.
const HOST = "0.0.0.0";

/* =========================================================
   START SERVER
========================================================= */

async function startServer() {
  let server = null;

  try {
    /* =======================================================
       VALIDATE ENVIRONMENT
    ======================================================= */

    if (!process.env.MONGO_URI) {
      throw new Error(
        "MONGO_URI is not configured in the environment."
      );
    }

    /* =======================================================
       VALIDATE EXPRESS APP
       -------------------------------------------------------
       This gives a clear error instead of:
       "app.listen is not a function"
    ======================================================= */

    if (
      typeof app !== "function" ||
      typeof app.listen !== "function"
    ) {
      throw new TypeError(
        'Invalid Express application exported from "./app". ' +
        'Make sure app.js ends with: module.exports = app;'
      );
    }

    /* =======================================================
       CONNECT TO MONGODB
    ======================================================= */

    await connectDB();

    console.log(
      "MongoDB connected successfully."
    );

    /* =======================================================
       VERIFY SMTP SERVICE
       -------------------------------------------------------
       This verifies the SMTP connection.
       It does NOT send an email.
    ======================================================= */

    let smtpReady = false;

    try {
      smtpReady =
        await verifyEmailTransport();
    } catch (smtpError) {
      console.error(
        "SMTP verification failed:",
        smtpError
      );
    }

    if (smtpReady) {
      console.log(
        "Email service is ready."
      );
    } else {
      console.error(
        "Email service is NOT ready. Email-dependent operations may fail."
      );
    }

    /* =======================================================
       START HTTP SERVER
    ======================================================= */

    server = app.listen(
      PORT,
      HOST,
      () => {
        console.log(
          `Help Platform API running on http://${HOST}:${PORT}`
        );

        console.log(
          `Health check: http://${HOST}:${PORT}/api/health`
        );
      }
    );

    /* =======================================================
       HTTP SERVER ERROR HANDLER
    ======================================================= */

    server.on(
      "error",
      (error) => {
        console.error(
          "HTTP server error:",
          error
        );

        if (
          error.code === "EADDRINUSE"
        ) {
          console.error(
            `Port ${PORT} is already in use.`
          );
        }

        process.exit(1);
      }
    );

    /* =======================================================
       GRACEFUL SHUTDOWN
    ======================================================= */

    let isShuttingDown = false;

    const shutdown = async (
      signal
    ) => {
      if (isShuttingDown) {
        return;
      }

      isShuttingDown = true;

      console.log(
        `\n${signal} received. Shutting down server...`
      );

      /* -----------------------------------------------------
         CLOSE HTTP SERVER
      ----------------------------------------------------- */

      if (server) {
        await new Promise(
          (resolve) => {
            server.close(
              (error) => {
                if (error) {
                  console.error(
                    "Error while closing HTTP server:",
                    error
                  );
                } else {
                  console.log(
                    "HTTP server closed."
                  );
                }

                resolve();
              }
            );
          }
        );
      }

      /* -----------------------------------------------------
         CLOSE SMTP TRANSPORT
      ----------------------------------------------------- */

      try {
        await closeEmailTransport();

        console.log(
          "Email service closed."
        );
      } catch (emailError) {
        console.error(
          "Error while closing email service:",
          emailError
        );
      }

      process.exit(0);
    };

    /* =======================================================
       PROCESS SIGNALS
    ======================================================= */

    process.once(
      "SIGINT",
      () => {
        void shutdown("SIGINT");
      }
    );

    process.once(
      "SIGTERM",
      () => {
        void shutdown("SIGTERM");
      }
    );
  } catch (error) {
    /* =======================================================
       STARTUP ERROR
    ======================================================= */

    console.error(
      "Server startup failed:"
    );

    console.error(error);

    /* -------------------------------------------------------
       CLOSE SMTP IF STARTUP FAILED
    ------------------------------------------------------- */

    try {
      await closeEmailTransport();

      console.log(
        "Email service closed."
      );
    } catch (emailError) {
      console.error(
        "Error while closing email service:",
        emailError
      );
    }

    process.exit(1);
  }
}

/* =========================================================
   START APPLICATION
========================================================= */

void startServer();

