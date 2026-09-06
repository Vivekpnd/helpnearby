"use strict";

/*
|--------------------------------------------------------------------------
| HelpNearby Email Service
|--------------------------------------------------------------------------
|
| Uses Brevo HTTPS API instead of SMTP.
|
| WHY:
| Render Free blocks outbound SMTP ports such as:
| 25, 465 and 587.
|
| Brevo HTTPS API uses normal HTTPS traffic on port 443,
| so it works with the Render Free plan.
|
|--------------------------------------------------------------------------
*/

require("dotenv").config();

/* =========================================================
   CONFIGURATION
========================================================= */

const BREVO_API_URL =
  "https://api.brevo.com/v3/smtp/email";

const BREVO_ACCOUNT_URL =
  "https://api.brevo.com/v3/account";

const BREVO_API_KEY =
  process.env.BREVO_API_KEY?.trim();

const EMAIL_FROM =
  process.env.EMAIL_FROM?.trim();

const EMAIL_FROM_NAME =
  process.env.EMAIL_FROM_NAME?.trim() ||
  "HelpNearby";

const NODE_ENV =
  process.env.NODE_ENV ||
  "development";

const EMAIL_REQUEST_TIMEOUT =
  Number(
    process.env.EMAIL_REQUEST_TIMEOUT || 15000
  );

/* =========================================================
   INTERNAL STATE
========================================================= */

let configurationError = null;

/* =========================================================
   SAFE ERROR HANDLING
========================================================= */

/*
 * Never log sensitive credentials such as:
 *
 * BREVO_API_KEY
 * SMTP_PASSWORD
 * JWT_SECRET
 * MONGO_URI
 * CLOUDINARY_API_SECRET
 */

function getSafeError(error) {
  if (!error) {
    return {
      message: "Unknown email error",
    };
  }

  return {
    message:
      error?.message ||
      "Unknown email error",

    code:
      error?.code || undefined,

    status:
      error?.status || undefined,

    statusCode:
      error?.statusCode || undefined,
  };
}

/* =========================================================
   VALIDATE CONFIGURATION
========================================================= */

function validateConfiguration() {
  const missing = [];

  if (!BREVO_API_KEY) {
    missing.push("BREVO_API_KEY");
  }

  if (!EMAIL_FROM) {
    missing.push("EMAIL_FROM");
  }

  if (missing.length > 0) {
    return {
      valid: false,

      error:
        `Missing email environment variables: ${missing.join(
          ", "
        )}`,
    };
  }

  if (
    !Number.isFinite(
      EMAIL_REQUEST_TIMEOUT
    ) ||
    EMAIL_REQUEST_TIMEOUT <= 0
  ) {
    return {
      valid: false,

      error:
        "EMAIL_REQUEST_TIMEOUT must be a positive number.",
    };
  }

  return {
    valid: true,
  };
}

/* =========================================================
   HTML ESCAPING
========================================================= */

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* =========================================================
   EMAIL CONFIGURATION LOGGING
========================================================= */

function logConfiguration() {
  console.log(
    "========== BREVO EMAIL CONFIG =========="
  );

  console.log(
    "BREVO_API_KEY:",
    BREVO_API_KEY
      ? "LOADED"
      : "MISSING"
  );

  console.log(
    "EMAIL_FROM:",
    EMAIL_FROM || "MISSING"
  );

  console.log(
    "EMAIL_FROM_NAME:",
    EMAIL_FROM_NAME
  );

  console.log(
    "NODE_ENV:",
    NODE_ENV
  );

  console.log(
    "EMAIL_REQUEST_TIMEOUT:",
    EMAIL_REQUEST_TIMEOUT
  );

  console.log(
    "========================================"
  );
}

/* =========================================================
   BREVO HTTPS REQUEST
========================================================= */

async function brevoRequest(
  endpoint,
  options = {}
) {
  if (!BREVO_API_KEY) {
    throw new Error(
      "BREVO_API_KEY is not configured."
    );
  }

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => {
        controller.abort();
      },
      EMAIL_REQUEST_TIMEOUT
    );

  try {
    const response =
      await fetch(
        endpoint,
        {
          ...options,

          signal:
            controller.signal,

          headers: {
            accept:
              "application/json",

            "content-type":
              "application/json",

            "api-key":
              BREVO_API_KEY,

            ...(options.headers || {}),
          },
        }
      );

    /*
     * Brevo normally returns JSON.
     * Handle empty/non-JSON responses safely.
     */

    let result = null;

    try {
      result =
        await response.json();
    } catch {
      result = null;
    }

    if (!response.ok) {
      const error =
        new Error(
          result?.message ||
          result?.code ||
          `Brevo API request failed with status ${response.status}`
        );

      error.status =
        response.status;

      error.statusCode =
        response.status;

      error.code =
        result?.code;

      throw error;
    }

    return result;
  } catch (error) {
    if (
      error?.name ===
      "AbortError"
    ) {
      const timeoutError =
        new Error(
          "Brevo API request timed out."
        );

      timeoutError.code =
        "EMAIL_API_TIMEOUT";

      timeoutError.statusCode =
        504;

      throw timeoutError;
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

/* =========================================================
   VERIFY BREVO API
========================================================= */

/*
 * Kept under the same function name used by server.js:
 *
 * verifyEmailTransport()
 *
 * This no longer verifies SMTP.
 *
 * It verifies that:
 *
 * 1. BREVO_API_KEY exists
 * 2. EMAIL_FROM exists
 * 3. Brevo API is reachable
 * 4. Brevo API key is valid
 */

async function verifyEmailTransport() {
  const validation =
    validateConfiguration();

  if (!validation.valid) {
    configurationError =
      validation.error;

    console.error(
      "❌ Brevo email configuration error:",
      validation.error
    );

    return false;
  }

  configurationError = null;

  logConfiguration();

  try {
    await brevoRequest(
      BREVO_ACCOUNT_URL,
      {
        method: "GET",
      }
    );

    console.log(
      "✅ Brevo email API connection verified successfully."
    );

    return true;
  } catch (error) {
    console.error(
      "❌ Brevo email API verification failed:",
      getSafeError(error)
    );

    return false;
  }
}

/* =========================================================
   SENDER
========================================================= */

function getSender() {
  return {
    name:
      EMAIL_FROM_NAME,

    email:
      EMAIL_FROM,
  };
}

/* =========================================================
   SEND EMAIL
========================================================= */

async function sendEmail({
  to,
  subject,
  textContent,
  htmlContent,
}) {
  const normalizedEmail =
    String(to || "")
      .trim()
      .toLowerCase();

  if (!normalizedEmail) {
    throw new Error(
      "Recipient email is required."
    );
  }

  if (!subject) {
    throw new Error(
      "Email subject is required."
    );
  }

  if (!htmlContent && !textContent) {
    throw new Error(
      "Email content is required."
    );
  }

  const validation =
    validateConfiguration();

  if (!validation.valid) {
    configurationError =
      validation.error;

    throw new Error(
      configurationError
    );
  }

  try {
    const emailPayload = {
      sender:
        getSender(),

      to: [
        {
          email:
            normalizedEmail,
        },
      ],

      subject:
        String(subject),

      textContent:
        textContent
          ? String(textContent)
          : undefined,

      htmlContent:
        htmlContent
          ? String(htmlContent)
          : undefined,
    };

    const result =
      await brevoRequest(
        BREVO_API_URL,
        {
          method: "POST",

          body:
            JSON.stringify(
              emailPayload
            ),
        }
      );

    console.log(
      "✅ Email sent successfully:",
      {
        email:
          normalizedEmail,

        messageId:
          result?.messageId ||
          null,

        provider:
          "brevo-api",
      }
    );

    return {
      ...result,

      accepted: [
        normalizedEmail,
      ],

      rejected: [],

      messageId:
        result?.messageId ||
        null,

      provider:
        "brevo-api",
    };
  } catch (error) {
    console.error(
      "❌ Email sending failed:",
      {
        email:
          normalizedEmail,

        ...getSafeError(error),
      }
    );

    throw error;
  }
}

/* =========================================================
   SEND VERIFICATION EMAIL
========================================================= */

async function sendVerificationCode(
  email,
  code
) {
  const normalizedEmail =
    String(email || "")
      .trim()
      .toLowerCase();

  const verificationCode =
    String(code || "").trim();

  if (!normalizedEmail) {
    throw new Error(
      "Recipient email is required."
    );
  }

  if (!verificationCode) {
    throw new Error(
      "Verification code is required."
    );
  }

  const safeCode =
    escapeHtml(
      verificationCode
    );

  const result =
    await sendEmail({
      to:
        normalizedEmail,

      subject:
        "Verify your HelpNearby email",

      textContent: [
        "Verify your HelpNearby email.",
        "",
        `Your verification code is: ${verificationCode}`,
        "",
        "This code expires in 15 minutes.",
        "",
        "If you did not request this code, you can safely ignore this email.",
      ].join("\n"),

      htmlContent: `
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8" />

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
        box-shadow:0 4px 20px rgba(0,0,0,0.05);
      "
    >

      <h2
        style="
          margin:0 0 16px;
          color:#111827;
          font-size:24px;
        "
      >
        Verify your email
      </h2>

      <p
        style="
          margin:0 0 24px;
          color:#4b5563;
          line-height:1.6;
          font-size:15px;
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
          padding:24px;
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

      <div
        style="
          margin-top:28px;
          padding-top:20px;
          border-top:1px solid #e5e7eb;
        "
      >
        <p
          style="
            margin:0;
            color:#9ca3af;
            font-size:12px;
          "
        >
          HelpNearby
        </p>
      </div>

    </div>
  </div>
</body>

</html>
      `,
    });

  return result;
}

/* =========================================================
   SEND PASSWORD RESET EMAIL
========================================================= */

async function sendPasswordReset(
  email,
  resetUrl
) {
  const normalizedEmail =
    String(email || "")
      .trim()
      .toLowerCase();

  if (!normalizedEmail) {
    throw new Error(
      "Recipient email is required."
    );
  }

  if (!resetUrl) {
    throw new Error(
      "Password reset URL is required."
    );
  }

  const safeResetUrl =
    escapeHtml(
      String(resetUrl)
    );

  const result =
    await sendEmail({
      to:
        normalizedEmail,

      subject:
        "Reset your HelpNearby password",

      textContent: [
        "Reset your HelpNearby password.",
        "",
        `Reset your password here: ${resetUrl}`,
        "",
        "This link expires in 15 minutes.",
        "",
        "If you did not request a password reset, you can safely ignore this email.",
      ].join("\n"),

      htmlContent: `
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8" />

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
        box-shadow:0 4px 20px rgba(0,0,0,0.05);
      "
    >

      <h2
        style="
          margin:0 0 16px;
          color:#111827;
          font-size:24px;
        "
      >
        Reset your password
      </h2>

      <p
        style="
          margin:0 0 24px;
          color:#4b5563;
          line-height:1.6;
          font-size:15px;
        "
      >
        We received a request to reset
        your HelpNearby password.
      </p>

      <div
        style="
          margin:28px 0;
          text-align:center;
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
        If you did not request a password reset,
        you can safely ignore this email.
      </p>

      <div
        style="
          margin-top:28px;
          padding-top:20px;
          border-top:1px solid #e5e7eb;
        "
      >
        <p
          style="
            margin:0;
            color:#9ca3af;
            font-size:12px;
          "
        >
          HelpNearby
        </p>
      </div>

    </div>
  </div>
</body>

</html>
      `,
    });

  return result;
}

/* =========================================================
   CLOSE EMAIL TRANSPORT
========================================================= */

/*
 * Kept for compatibility with server.js.
 *
 * Brevo HTTPS API does not maintain a persistent SMTP
 * transporter, so there is nothing to close.
 */

async function closeEmailTransport() {
  console.log(
    "Brevo email API does not require a persistent transport. Nothing to close."
  );
}

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  sendVerificationCode,
  sendPasswordReset,
  verifyEmailTransport,
  closeEmailTransport,
};