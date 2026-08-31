
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

/* =========================================================
   SERVER CONFIGURATION
========================================================= */

// Render provides process.env.PORT automatically.
// 5000 is used only for local development.
const PORT = Number(process.env.PORT) || 5000;

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

    console.log("MongoDB connected successfully.");

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

    server.on("error", (error) => {
      console.error("HTTP server error:", error);

      if (error.code === "EADDRINUSE") {
        console.error(
          `Port ${PORT} is already in use.`
        );
      }

      process.exit(1);
    });

    /* =======================================================
       GRACEFUL SHUTDOWN
    ======================================================= */

    let isShuttingDown = false;

    const shutdown = (signal) => {
      if (isShuttingDown) {
        return;
      }

      isShuttingDown = true;

      console.log(
        `\n${signal} received. Shutting down server...`
      );

      if (!server) {
        process.exit(0);
      }

      server.close((error) => {
        if (error) {
          console.error(
            "Error while closing HTTP server:",
            error
          );

          process.exit(1);
        }

        console.log("HTTP server closed.");

        process.exit(0);
      });
    };

    process.once(
      "SIGINT",
      () => shutdown("SIGINT")
    );

    process.once(
      "SIGTERM",
      () => shutdown("SIGTERM")
    );
  } catch (error) {
    console.error("Server startup failed:");
    console.error(error);

    process.exit(1);
  }
}

/* =========================================================
   START APPLICATION
========================================================= */

startServer();

