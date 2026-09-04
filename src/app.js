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

const app = require("./app");
const connectDB = require("./config/db");

const {
  verifyEmailTransport,
  closeEmailTransport,
} = require("./services/email.service");

/* =========================================================
   SERVER CONFIGURATION
========================================================= */

// Render provides process.env.PORT automatically.
// 5000 is used only for local development.
const PORT =
  Number(process.env.PORT) || 5000;

// IMPORTANT:
// Render requires the server to listen on 0.0.0.0.
// Do NOT use "localhost" here.
const HOST = "0.0.0.0";

/* =========================================================
   START SERVER
========================================================= */

async function startServer() {
  let server;

  try {
    /* -------------------------------------------------------
       Validate environment configuration
    ------------------------------------------------------- */

    if (!process.env.MONGO_URI) {
      throw new Error(
        "MONGO_URI is not configured in the environment."
      );
    }

    /* -------------------------------------------------------
       Connect to MongoDB
    ------------------------------------------------------- */

    await connectDB();

    console.log(
      "MongoDB connected successfully."
    );

    /* -------------------------------------------------------
       Verify SMTP configuration
       -------------------------------------------------------
       This does NOT send an email.

       It verifies that the backend can establish
       communication with the configured SMTP server.

       The email service itself has connection,
       greeting and socket timeouts, so a broken SMTP
       configuration cannot hang the server forever.
    ------------------------------------------------------- */

    const smtpReady =
      await verifyEmailTransport();

    if (smtpReady) {
      console.log(
        "Email service is ready."
      );
    } else {
      /*
       * Do not stop the entire API when SMTP is
       * unavailable.
       *
       * Other API functionality such as health
       * checks, authentication routes that do not
       * require email, and other application APIs
       * can continue running.
       *
       * Email endpoints will return controlled
       * errors from the email service.
       */
      console.error(
        "Email service is NOT ready. Email-dependent operations may fail."
      );
    }

    /* -------------------------------------------------------
       Start HTTP server
    ------------------------------------------------------- */

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
       SERVER ERROR HANDLER
    ======================================================= */

    server.on(
      "error",
      (error) => {
        console.error(
          "HTTP server error:",
          error
        );

        if (
          error.code ===
          "EADDRINUSE"
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

      /*
       * If HTTP server was never started,
       * still close the SMTP transporter.
       */
      if (!server) {
        try {
          await closeEmailTransport();
        } catch (error) {
          console.error(
            "Error while closing email service:",
            error
          );
        }

        process.exit(0);

        return;
      }

      /*
       * Stop accepting new HTTP requests.
       */
      server.close(
        async (error) => {
          if (error) {
            console.error(
              "Error while closing HTTP server:",
              error
            );

            try {
              await closeEmailTransport();
            } catch (emailError) {
              console.error(
                "Error while closing email service:",
                emailError
              );
            }

            process.exit(1);

            return;
          }

          console.log(
            "HTTP server closed."
          );

          /*
           * Close pooled SMTP connections.
           */
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
        }
      );
    };

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
    console.error(
      "Server startup failed:"
    );

    console.error(error);

    /*
     * Make sure the SMTP transporter is not
     * left open if startup fails.
     */
    try {
      await closeEmailTransport();
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

