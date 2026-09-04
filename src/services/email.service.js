"use strict";

const nodemailer = require("nodemailer");

/*
|--------------------------------------------------------------------------
| Configuration
|--------------------------------------------------------------------------
*/

const SMTP_HOST = process.env.SMTP_HOST?.trim();

const SMTP_PORT = Number(
  process.env.SMTP_PORT || 587
);

const SMTP_USER =
  process.env.SMTP_USER?.trim();

const SMTP_PASSWORD =
  process.env.SMTP_PASSWORD;

const EMAIL_FROM =
  process.env.EMAIL_FROM?.trim() ||
  SMTP_USER;

const EMAIL_FROM_NAME =
  process.env.EMAIL_FROM_NAME?.trim() ||
  "HelpNearby";

const NODE_ENV =
  process.env.NODE_ENV || "development";

/*
|--------------------------------------------------------------------------
| Constants
|--------------------------------------------------------------------------
*/

const SMTP_CONNECTION_TIMEOUT = Number(
  process.env.SMTP_CONNECTION_TIMEOUT || 15000
);

const SMTP_GREETING_TIMEOUT = Number(
  process.env.SMTP_GREETING_TIMEOUT || 15000
);

const SMTP_SOCKET_TIMEOUT = Number(
  process.env.SMTP_SOCKET_TIMEOUT || 20000
);

const SMTP_POOL_MAX_CONNECTIONS = Number(
  process.env.SMTP_POOL_MAX_CONNECTIONS || 3
);

const SMTP_POOL_MAX_MESSAGES = Number(
  process.env.SMTP_POOL_MAX_MESSAGES || 100
);

/*
|--------------------------------------------------------------------------
| Internal state
|--------------------------------------------------------------------------
*/

let transporter = null;
let configurationError = null;

/*
|--------------------------------------------------------------------------
| Utility: Safe error logging
|--------------------------------------------------------------------------
|
| Never log SMTP_PASSWORD.
|--------------------------------------------------------------------------
*/

function getSafeError(error) {
  if (!error) {
    return {
      message: "Unknown email error",
    };
  }

  return {
    message: error.message,
    code: error.code,
    command: error.command,
    responseCode: error.responseCode,
    response:
      typeof error.response === "string"
        ? error.response
        : undefined,
  };
}

/*
|--------------------------------------------------------------------------
| Utility: Validate configuration
|--------------------------------------------------------------------------
*/

function validateConfiguration() {
  const missing = [];

  if (!SMTP_HOST) {
    missing.push("SMTP_HOST");
  }

  if (!process.env.SMTP_PORT) {
    missing.push("SMTP_PORT");
  }

  if (!SMTP_USER) {
    missing.push("SMTP_USER");
  }

  if (!SMTP_PASSWORD) {
    missing.push("SMTP_PASSWORD");
  }

  if (!EMAIL_FROM) {
    missing.push("EMAIL_FROM");
  }

  if (
    !Number.isInteger(SMTP_PORT) ||
    SMTP_PORT <= 0 ||
    SMTP_PORT > 65535
  ) {
    return {
      valid: false,
      error: "SMTP_PORT must be a valid TCP port",
    };
  }

  if (missing.length > 0) {
    return {
      valid: false,
      error: `Missing SMTP environment variables: ${missing.join(
        ", "
      )}`,
    };
  }

  return {
    valid: true,
  };
}

/*
|--------------------------------------------------------------------------
| Utility: Escape HTML
|--------------------------------------------------------------------------
|
| Email values such as email addresses and URLs should not be
| injected directly into HTML without escaping.
|--------------------------------------------------------------------------
*/

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/*
|--------------------------------------------------------------------------
| Create transporter
|--------------------------------------------------------------------------
*/

function createTransporter() {
  const validation =
    validateConfiguration();

  if (!validation.valid) {
    configurationError =
      validation.error;

    console.error(
      "❌ Email service configuration error:",
      validation.error
    );

    return null;
  }

  configurationError = null;

  const secure =
    SMTP_PORT === 465;

  console.log(
    "========== SMTP CONFIG =========="
  );

  console.log(
    "SMTP_HOST:",
    SMTP_HOST
  );

  console.log(
    "SMTP_PORT:",
    SMTP_PORT
  );

  console.log(
    "SMTP_SECURE:",
    secure
  );

  console.log(
    "SMTP_USER:",
    SMTP_USER
  );

  console.log(
    "SMTP_PASSWORD:",
    SMTP_PASSWORD
      ? "LOADED"
      : "MISSING"
  );

  console.log(
    "EMAIL_FROM:",
    EMAIL_FROM
  );

  console.log(
    "EMAIL_FROM_NAME:",
    EMAIL_FROM_NAME
  );

  console.log(
    "================================="
  );

  const mailTransporter =
    nodemailer.createTransport({
      host: SMTP_HOST,

      port: SMTP_PORT,

      secure,

      auth: {
        user: SMTP_USER,
        pass: SMTP_PASSWORD,
      },

      /*
       * Connection management
       */
      pool: true,

      maxConnections:
        SMTP_POOL_MAX_CONNECTIONS,

      maxMessages:
        SMTP_POOL_MAX_MESSAGES,

      /*
       * Prevent requests from hanging indefinitely.
       */
      connectionTimeout:
        SMTP_CONNECTION_TIMEOUT,

      greetingTimeout:
        SMTP_GREETING_TIMEOUT,

      socketTimeout:
        SMTP_SOCKET_TIMEOUT,

      /*
       * Modern TLS.
       */
      tls: {
        minVersion: "TLSv1.2",
      },
    });

  /*
   * Transporter-level events.
   */
  mailTransporter.on(
    "error",
    error => {
      console.error(
        "❌ SMTP transporter error:",
        getSafeError(error)
      );
    }
  );

  mailTransporter.on(
    "idle",
    () => {
      console.log(
        "📨 SMTP transporter is ready for mail."
      );
    }
  );

  return mailTransporter;
}

/*
|--------------------------------------------------------------------------
| Get singleton transporter
|--------------------------------------------------------------------------
*/

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  transporter =
    createTransporter();

  return transporter;
}

/*
|--------------------------------------------------------------------------
| Verify SMTP connection
|--------------------------------------------------------------------------
|
| This should be called when the server starts.
|--------------------------------------------------------------------------
*/

async function verifyEmailTransport() {
  const mailTransporter =
    getTransporter();

  if (!mailTransporter) {
    console.error(
      "❌ SMTP verification skipped:",
      configurationError ||
        "SMTP transporter unavailable"
    );

    return false;
  }

  try {
    await mailTransporter.verify();

    console.log(
      "✅ SMTP connection verified successfully."
    );

    return true;
  } catch (error) {
    console.error(
      "❌ SMTP connection verification failed:",
      getSafeError(error)
    );

    return false;
  }
}

/*
|--------------------------------------------------------------------------
| Build sender
|--------------------------------------------------------------------------
*/

function getSender() {
  return {
    name: EMAIL_FROM_NAME,
    address: EMAIL_FROM,
  };
}

/*
|--------------------------------------------------------------------------
| Send verification email
|--------------------------------------------------------------------------
*/

async function sendVerificationCode(
  email,
  code
) {
  const normalizedEmail =
    String(email)
      .trim()
      .toLowerCase();

  const verificationCode =
    String(code).trim();

  if (!normalizedEmail) {
    throw new Error(
      "Recipient email is required"
    );
  }

  if (!verificationCode) {
    throw new Error(
      "Verification code is required"
    );
  }

  const mailTransporter =
    getTransporter();

  /*
   * Development fallback.
   *
   * Never use this as production behavior.
   */
  if (!mailTransporter) {
    if (NODE_ENV === "development") {
      console.log(
        `[DEV ONLY] Verification code for ${normalizedEmail}: ${verificationCode}`
      );

      return {
        accepted: [normalizedEmail],
        messageId: "development-email",
        development: true,
      };
    }

    throw new Error(
      configurationError ||
        "Email service is unavailable"
    );
  }

  const safeCode =
    escapeHtml(verificationCode);

  try {
    const result =
      await mailTransporter.sendMail({
        from: getSender(),

        to: normalizedEmail,

        subject:
          "Verify your HelpNearby email",

        text: [
          "Verify your HelpNearby email.",
          "",
          `Your verification code is: ${verificationCode}`,
          "",
          "This code expires in 15 minutes.",
          "",
          "If you did not request this code, you can safely ignore this email.",
        ].join("\n"),

        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta
                charset="UTF-8"
              />
              <meta
                name="viewport"
                content="width=device-width, initial-scale=1.0"
              />
              <title>
                Verify your HelpNearby email
              </title>
            </head>

            <body
              style="
                margin:0;
                padding:0;
                background:#f5f7f5;
                font-family:Arial,Helvetica,sans-serif;
              "
            >
              <div
                style="
                  max-width:600px;
                  margin:0 auto;
                  padding:32px 20px;
                "
              >
                <div
                  style="
                    background:#ffffff;
                    border-radius:16px;
                    padding:32px;
                  "
                >
                  <h2
                    style="
                      margin:0 0 16px;
                      color:#111827;
                    "
                  >
                    Verify your email
                  </h2>

                  <p
                    style="
                      margin:0 0 24px;
                      color:#4b5563;
                      line-height:1.6;
                    "
                  >
                    Use the verification code below
                    to continue creating your
                    HelpNearby account.
                  </p>

                  <div
                    style="
                      text-align:center;
                      margin:28px 0;
                      padding:20px;
                      background:#f0fdf4;
                      border-radius:12px;
                    "
                  >
                    <span
                      style="
                        font-size:32px;
                        font-weight:700;
                        letter-spacing:8px;
                        color:#166534;
                      "
                    >
                      ${safeCode}
                    </span>
                  </div>

                  <p
                    style="
                      margin:0 0 12px;
                      color:#4b5563;
                      line-height:1.6;
                    "
                  >
                    This code expires in
                    <strong>
                      15 minutes
                    </strong>.
                  </p>

                  <p
                    style="
                      margin:24px 0 0;
                      color:#9ca3af;
                      font-size:13px;
                      line-height:1.5;
                    "
                  >
                    If you did not request this
                    verification code, you can
                    safely ignore this email.
                  </p>
                </div>
              </div>
            </body>
          </html>
        `,
      });

    console.log(
      "✅ Verification email sent:",
      {
        email: normalizedEmail,
        messageId:
          result.messageId,
        accepted:
          result.accepted,
        rejected:
          result.rejected,
      }
    );

    /*
     * SMTP accepted/rejected recipients.
     *
     * sendMail() can technically resolve even
     * when a recipient is rejected, so check it.
     */
    if (
      !result.accepted ||
      result.accepted.length === 0
    ) {
      throw new Error(
        "SMTP server did not accept the verification email"
      );
    }

    return result;
  } catch (error) {
    console.error(
      "❌ Verification email failed:",
      {
        email: normalizedEmail,
        ...getSafeError(error),
      }
    );

    throw error;
  }
}

/*
|--------------------------------------------------------------------------
| Send password reset email
|--------------------------------------------------------------------------
*/

async function sendPasswordReset(
  email,
  resetUrl
) {
  const normalizedEmail =
    String(email)
      .trim()
      .toLowerCase();

  if (!normalizedEmail) {
    throw new Error(
      "Recipient email is required"
    );
  }

  if (!resetUrl) {
    throw new Error(
      "Password reset URL is required"
    );
  }

  const mailTransporter =
    getTransporter();

  if (!mailTransporter) {
    if (NODE_ENV === "development") {
      console.log(
        `[DEV ONLY] Password reset URL for ${normalizedEmail}: ${resetUrl}`
      );

      return {
        accepted: [normalizedEmail],
        messageId:
          "development-email",
        development: true,
      };
    }

    throw new Error(
      configurationError ||
        "Email service is unavailable"
    );
  }

  const safeResetUrl =
    escapeHtml(resetUrl);

  try {
    const result =
      await mailTransporter.sendMail({
        from: getSender(),

        to: normalizedEmail,

        subject:
          "Reset your HelpNearby password",

        text: [
          "Reset your HelpNearby password.",
          "",
          `Reset your password here: ${resetUrl}`,
          "",
          "This link expires in 15 minutes.",
          "",
          "If you did not request a password reset, you can safely ignore this email.",
        ].join("\n"),

        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta
                charset="UTF-8"
              />
              <meta
                name="viewport"
                content="width=device-width, initial-scale=1.0"
              />
              <title>
                Reset your HelpNearby password
              </title>
            </head>

            <body
              style="
                margin:0;
                padding:0;
                background:#f5f7f5;
                font-family:Arial,Helvetica,sans-serif;
              "
            >
              <div
                style="
                  max-width:600px;
                  margin:0 auto;
                  padding:32px 20px;
                "
              >
                <div
                  style="
                    background:#ffffff;
                    border-radius:16px;
                    padding:32px;
                  "
                >
                  <h2
                    style="
                      margin:0 0 16px;
                      color:#111827;
                    "
                  >
                    Reset your password
                  </h2>

                  <p
                    style="
                      margin:0 0 24px;
                      color:#4b5563;
                      line-height:1.6;
                    "
                  >
                    We received a request to reset
                    your HelpNearby password.
                  </p>

                  <div
                    style="
                      margin:28px 0;
                    "
                  >
                    <a
                      href="${safeResetUrl}"
                      style="
                        display:inline-block;
                        padding:14px 24px;
                        background:#16a34a;
                        color:#ffffff;
                        text-decoration:none;
                        border-radius:10px;
                        font-weight:700;
                      "
                    >
                      Reset your password
                    </a>
                  </div>

                  <p
                    style="
                      margin:0;
                      color:#4b5563;
                      line-height:1.6;
                    "
                  >
                    This link expires in
                    <strong>
                      15 minutes
                    </strong>.
                  </p>

                  <p
                    style="
                      margin:24px 0 0;
                      color:#9ca3af;
                      font-size:13px;
                      line-height:1.5;
                    "
                  >
                    If you did not request this
                    password reset, you can safely
                    ignore this email.
                  </p>
                </div>
              </div>
            </body>
          </html>
        `,
      });

    console.log(
      "✅ Password reset email sent:",
      {
        email: normalizedEmail,
        messageId:
          result.messageId,
        accepted:
          result.accepted,
        rejected:
          result.rejected,
      }
    );

    if (
      !result.accepted ||
      result.accepted.length === 0
    ) {
      throw new Error(
        "SMTP server did not accept the password reset email"
      );
    }

    return result;
  } catch (error) {
    console.error(
      "❌ Password reset email failed:",
      {
        email: normalizedEmail,
        ...getSafeError(error),
      }
    );

    throw error;
  }
}

/*
|--------------------------------------------------------------------------
| Graceful shutdown
|--------------------------------------------------------------------------
*/

async function closeEmailTransport() {
  if (!transporter) {
    return;
  }

  try {
    transporter.close();

    console.log(
      "SMTP transporter closed."
    );
  } catch (error) {
    console.error(
      "Failed to close SMTP transporter:",
      getSafeError(error)
    );
  } finally {
    transporter = null;
  }
}

/*
|--------------------------------------------------------------------------
| Exports
|--------------------------------------------------------------------------
*/

module.exports = {
  sendVerificationCode,
  sendPasswordReset,
  verifyEmailTransport,
  closeEmailTransport,
};

