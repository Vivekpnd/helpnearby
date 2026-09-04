"use strict";

const bcrypt = require("bcryptjs");

const Registration = require("../models/Registration");
const User = require("../models/User");
const PasswordReset = require("../models/PasswordReset");

const {
  normalizeEmail,
  normalizeUsername,
  generateCode,
  hashToken,
  generateRandomToken,
} = require("../utils/crypto");

const {
  signAccessToken,
} = require("../utils/jwt");

const {
  sendVerificationCode,
  sendPasswordReset,
} = require("../services/email.service");

/*
|--------------------------------------------------------------------------
| Configuration
|--------------------------------------------------------------------------
*/

const CODE_TTL_MS =
  15 * 60 * 1000;

const MAX_VERIFY_ATTEMPTS = 5;

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function publicUser(user) {
  return {
    id: user._id,
    email: user.email,
    emailVerified: user.emailVerified,
    username: user.username,
    name: user.name,
    profilePhoto: user.profilePhoto,
    location: user.location,
    rating: user.rating,
    completedHelps: user.completedHelps,
    helpPoints: user.helpPoints,
    helperStatus: user.helperStatus,
  };
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );
}

function isValidUsername(username) {
  return /^[a-z0-9_]{3,20}$/.test(
    username
  );
}

function isValidPassword(password) {
  return (
    typeof password === "string" &&
    password.length >= 8
  );
}

function getErrorMessage(error) {
  if (
    error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "An unexpected error occurred.";
}

/*
|--------------------------------------------------------------------------
| START REGISTRATION
|--------------------------------------------------------------------------
|
| POST /api/auth/register/email
|
| 1. Validate email
| 2. Check existing user
| 3. Generate verification code
| 4. Store hashed code
| 5. Send verification email
| 6. Return success
|
|--------------------------------------------------------------------------
*/

async function startRegistration(
  req,
  res,
  next
) {
  try {
    const email = normalizeEmail(
      req.body?.email
    );

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message:
          "Enter a valid email address.",
      });
    }

    /*
     * Do not allow registration when an actual
     * account already exists.
     */
    const existingUser =
      await User.findOne({
        email,
      }).select("_id");

    if (existingUser) {
      return res.status(409).json({
        success: false,
        code: "EMAIL_EXISTS",
        message:
          "This email is already registered. Please log in.",
      });
    }

    /*
     * Generate a fresh verification code.
     *
     * Only the hash is stored in MongoDB.
     */
    const code = generateCode();

    const codeHash =
      hashToken(code);

    const expiresAt = new Date(
      Date.now() + CODE_TTL_MS
    );

    /*
     * Find an existing temporary registration
     * or create a new one.
     */
    let registration =
      await Registration.findOne({
        email,
      });

    if (registration) {
      registration.verificationCodeHash =
        codeHash;

      registration.verificationExpiresAt =
        expiresAt;

      registration.verifiedAt = null;

      registration.attempts = 0;

      await registration.save();
    } else {
      registration =
        await Registration.create({
          email,
          verificationCodeHash:
            codeHash,
          verificationExpiresAt:
            expiresAt,
          verifiedAt: null,
          attempts: 0,
        });
    }

    /*
     * SMTP is an external service.
     *
     * sendVerificationCode() now has its own
     * connection/greeting/socket timeouts, so
     * this request cannot wait indefinitely.
     */
    try {
      await sendVerificationCode(
        email,
        code
      );
    } catch (emailError) {
      console.error(
        "❌ Registration verification email failed:",
        {
          email,
          message:
            getErrorMessage(
              emailError
            ),
          code:
            emailError?.code,
          responseCode:
            emailError?.responseCode,
        }
      );

      /*
       * Keep the registration record.
       *
       * This allows the user to use the resend
       * endpoint instead of losing the registration
       * session completely.
       */
      return res.status(503).json({
        success: false,
        code: "EMAIL_SERVICE_UNAVAILABLE",
        message:
          "We could not send the verification email right now. Please try again shortly.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Verification code sent to your email.",
      data: {
        email,
      },
    });
  } catch (error) {
    console.error(
      "❌ Start registration failed:",
      error
    );

    return next(error);
  }
}

/*
|--------------------------------------------------------------------------
| VERIFY REGISTRATION EMAIL
|--------------------------------------------------------------------------
|
| POST /api/auth/register/verify-email
|
|--------------------------------------------------------------------------
*/

async function verifyRegistrationEmail(
  req,
  res,
  next
) {
  try {
    const email = normalizeEmail(
      req.body?.email
    );

    const code = String(
      req.body?.code || ""
    ).trim();

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message:
          "Enter a valid email address.",
      });
    }

    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({
        success: false,
        message:
          "Enter the 6-digit verification code.",
      });
    }

    const registration =
      await Registration.findOne({
        email,
      }).select(
        "+verificationCodeHash +verificationExpiresAt"
      );

    if (!registration) {
      return res.status(400).json({
        success: false,
        message:
          "Registration session not found. Start again.",
      });
    }

    /*
     * Already verified.
     */
    if (registration.verifiedAt) {
      return res.status(200).json({
        success: true,
        message:
          "Email is already verified. Continue account setup.",
        data: {
          email,
        },
      });
    }

    /*
     * Brute-force protection.
     */
    if (
      Number(
        registration.attempts || 0
      ) >= MAX_VERIFY_ATTEMPTS
    ) {
      return res.status(429).json({
        success: false,
        code: "VERIFY_ATTEMPTS_EXCEEDED",
        message:
          "Too many verification attempts. Request a new code.",
      });
    }

    /*
     * Expiration check.
     */
    if (
      !registration.verificationExpiresAt ||
      registration.verificationExpiresAt <
        new Date()
    ) {
      return res.status(400).json({
        success: false,
        code: "CODE_EXPIRED",
        message:
          "Verification code expired. Request a new code.",
      });
    }

    /*
     * Compare hashes.
     *
     * The raw verification code is never
     * stored in the database.
     */
    const incomingCodeHash =
      hashToken(code);

    if (
      incomingCodeHash !==
      registration.verificationCodeHash
    ) {
      registration.attempts =
        Number(
          registration.attempts || 0
        ) + 1;

      await registration.save();

      const attemptsRemaining =
        Math.max(
          0,
          MAX_VERIFY_ATTEMPTS -
            registration.attempts
        );

      return res.status(400).json({
        success: false,
        code: "INVALID_CODE",
        message:
          attemptsRemaining > 0
            ? "Invalid verification code."
            : "Too many verification attempts. Request a new code.",
      });
    }

    /*
     * Mark email as verified.
     */
    registration.verifiedAt =
      new Date();

    registration.attempts = 0;

    await registration.save();

    return res.status(200).json({
      success: true,
      message:
        "Email verified. Continue account setup.",
      data: {
        email,
      },
    });
  } catch (error) {
    console.error(
      "❌ Email verification failed:",
      error
    );

    return next(error);
  }
}

/*
|--------------------------------------------------------------------------
| RESEND REGISTRATION EMAIL
|--------------------------------------------------------------------------
|
| POST /api/auth/register/resend-verification
|
|--------------------------------------------------------------------------
*/

async function resendRegistrationEmail(
  req,
  res,
  next
) {
  try {
    const email = normalizeEmail(
      req.body?.email
    );

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message:
          "Enter a valid email address.",
      });
    }

    const registration =
      await Registration.findOne({
        email,
      });

    if (!registration) {
      return res.status(404).json({
        success: false,
        message:
          "Registration session not found. Start again.",
      });
    }

    /*
     * Don't resend if already verified.
     */
    if (registration.verifiedAt) {
      return res.status(400).json({
        success: false,
        message:
          "This email is already verified. Continue account setup.",
      });
    }

    const code =
      generateCode();

    const codeHash =
      hashToken(code);

    const expiresAt = new Date(
      Date.now() + CODE_TTL_MS
    );

    /*
     * Update registration with a new code.
     */
    registration.verificationCodeHash =
      codeHash;

    registration.verificationExpiresAt =
      expiresAt;

    registration.attempts = 0;

    await registration.save();

    /*
     * Send email with SMTP timeout protection.
     */
    try {
      await sendVerificationCode(
        email,
        code
      );
    } catch (emailError) {
      console.error(
        "❌ Resend verification email failed:",
        {
          email,
          message:
            getErrorMessage(
              emailError
            ),
          code:
            emailError?.code,
          responseCode:
            emailError?.responseCode,
        }
      );

      return res.status(503).json({
        success: false,
        code: "EMAIL_SERVICE_UNAVAILABLE",
        message:
          "We could not send the verification email right now. Please try again shortly.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "A new verification code has been sent.",
    });
  } catch (error) {
    console.error(
      "❌ Resend registration email failed:",
      error
    );

    return next(error);
  }
}

/*
|--------------------------------------------------------------------------
| COMPLETE REGISTRATION
|--------------------------------------------------------------------------
|
| POST /api/auth/register/complete
|
|--------------------------------------------------------------------------
*/

async function completeRegistration(
  req,
  res,
  next
) {
  try {
    const email = normalizeEmail(
      req.body?.email
    );

    const username =
      normalizeUsername(
        req.body?.username
      );

    const password =
      typeof req.body?.password ===
      "string"
        ? req.body.password
        : "";

    const confirmPassword =
      typeof req.body
        ?.confirmPassword === "string"
        ? req.body.confirmPassword
        : "";

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message:
          "Enter a valid email address.",
      });
    }

    if (
      !username ||
      !isValidUsername(username)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Username must be 3–20 characters: letters, numbers or underscore.",
      });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 8 characters.",
      });
    }

    if (
      password !==
      confirmPassword
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Passwords do not match.",
      });
    }

    /*
     * Registration must exist and email must
     * already be verified.
     */
    const registration =
      await Registration.findOne({
        email,
      });

    if (
      !registration ||
      !registration.verifiedAt
    ) {
      return res.status(403).json({
        success: false,
        code: "EMAIL_NOT_VERIFIED",
        message:
          "Verify your email before completing registration.",
      });
    }

    /*
     * Prevent duplicate email.
     */
    const existingEmail =
      await User.exists({
        email,
      });

    if (existingEmail) {
      /*
       * Clean up the temporary registration
       * because the account already exists.
       */
      await Registration.deleteOne({
        _id: registration._id,
      });

      return res.status(409).json({
        success: false,
        code: "EMAIL_EXISTS",
        message:
          "This email is already registered. Please log in.",
      });
    }

    /*
     * Prevent duplicate username.
     */
    const existingUsername =
      await User.exists({
        username,
      });

    if (existingUsername) {
      return res.status(409).json({
        success: false,
        code: "USERNAME_EXISTS",
        message:
          "Username is already taken.",
      });
    }

    /*
     * Hash password using bcrypt.
     */
    const passwordHash =
      await bcrypt.hash(
        password,
        12
      );

    /*
     * Create permanent user.
     */
    const user =
      await User.create({
        email,
        emailVerified: true,
        username,
        passwordHash,
      });

    /*
     * Registration is no longer needed after
     * successful account creation.
     */
    await Registration.deleteOne({
      _id: registration._id,
    });

    /*
     * Generate JWT.
     */
    const accessToken =
      signAccessToken(
        user._id
      );

    return res.status(201).json({
      success: true,
      message:
        "Account created successfully.",
      data: {
        accessToken,
        user: publicUser(user),
      },
    });
  } catch (error) {
    /*
     * MongoDB unique index protection.
     */
    if (
      error?.code === 11000
    ) {
      const duplicateField =
        Object.keys(
          error.keyPattern ||
            {}
        )[0];

      if (
        duplicateField ===
        "username"
      ) {
        return res.status(409).json({
          success: false,
          code: "USERNAME_EXISTS",
          message:
            "Username is already taken.",
        });
      }

      if (
        duplicateField ===
        "email"
      ) {
        return res.status(409).json({
          success: false,
          code: "EMAIL_EXISTS",
          message:
            "This email is already registered.",
        });
      }

      return res.status(409).json({
        success: false,
        message:
          "Email or username is already in use.",
      });
    }

    console.error(
      "❌ Complete registration failed:",
      error
    );

    return next(error);
  }
}

/*
|--------------------------------------------------------------------------
| LOGIN
|--------------------------------------------------------------------------
|
| POST /api/auth/login
|
|--------------------------------------------------------------------------
*/

async function login(
  req,
  res,
  next
) {
  try {
    const identifier =
      String(
        req.body?.identifier ||
          ""
      )
        .trim()
        .toLowerCase();

    const password =
      typeof req.body?.password ===
      "string"
        ? req.body.password
        : "";

    if (
      !identifier ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Username/email and password are required.",
      });
    }

    const user =
      await User.findOne({
        $or: [
          {
            email: identifier,
          },
          {
            username: identifier,
          },
        ],
      }).select(
        "+passwordHash"
      );

    /*
     * Keep the response generic so we don't
     * unnecessarily expose whether an account
     * exists.
     */
    if (
      !user ||
      !user.passwordHash
    ) {
      return res.status(401).json({
        success: false,
        code: "INVALID_CREDENTIALS",
        message:
          "Invalid credentials.",
      });
    }

    const passwordMatches =
      await bcrypt.compare(
        password,
        user.passwordHash
      );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        code: "INVALID_CREDENTIALS",
        message:
          "Invalid credentials.",
      });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,
        code: "EMAIL_NOT_VERIFIED",
        message:
          "Please verify your email first.",
      });
    }

    const accessToken =
      signAccessToken(
        user._id
      );

    return res.status(200).json({
      success: true,
      message:
        "Login successful.",
      data: {
        accessToken,
        user: publicUser(user),
      },
    });
  } catch (error) {
    console.error(
      "❌ Login failed:",
      error
    );

    return next(error);
  }
}

/*
|--------------------------------------------------------------------------
| FORGOT PASSWORD
|--------------------------------------------------------------------------
|
| POST /api/auth/forgot-password
|
|--------------------------------------------------------------------------
*/

async function forgotPassword(
  req,
  res,
  next
) {
  try {
    const email = normalizeEmail(
      req.body?.email
    );

    /*
     * Always return the same response to avoid
     * exposing whether an email is registered.
     */
    const genericResponse = {
      success: true,
      message:
        "If the email is registered, a reset link will be sent.",
    };

    if (!email || !isValidEmail(email)) {
      return res.status(200).json(
        genericResponse
      );
    }

    const user =
      await User.findOne({
        email,
      });

    if (!user) {
      return res.status(200).json(
        genericResponse
      );
    }

    /*
     * Generate a cryptographically random
     * password-reset token.
     */
    const rawToken =
      generateRandomToken();

    const tokenHash =
      hashToken(rawToken);

    /*
     * Remove older reset tokens.
     */
    await PasswordReset.deleteMany({
      userId: user._id,
    });

    /*
     * Store only the token hash.
     */
    await PasswordReset.create({
      userId: user._id,
      tokenHash,
      expiresAt: new Date(
        Date.now() + CODE_TTL_MS
      ),
    });

    const clientUrl =
      process.env.CLIENT_URL?.trim();

    if (!clientUrl) {
      console.error(
        "❌ CLIENT_URL is not configured for password reset."
      );

      /*
       * Don't expose server configuration
       * to the client.
       */
      return res.status(200).json(
        genericResponse
      );
    }

    const resetUrl =
      `${clientUrl.replace(
        /\/$/,
        ""
      )}/reset-password?token=${encodeURIComponent(
        rawToken
      )}`;

    /*
     * Sending email can fail independently
     * of MongoDB.
     *
     * Keep the public response generic.
     */
    try {
      await sendPasswordReset(
        user.email,
        resetUrl
      );
    } catch (emailError) {
      console.error(
        "❌ Password reset email failed:",
        {
          email,
          message:
            getErrorMessage(
              emailError
            ),
          code:
            emailError?.code,
          responseCode:
            emailError?.responseCode,
        }
      );

      /*
       * Remove the reset token because the
       * email was not successfully sent.
       */
      await PasswordReset.deleteMany({
        userId: user._id,
      });

      return res.status(200).json(
        genericResponse
      );
    }

    return res.status(200).json(
      genericResponse
    );
  } catch (error) {
    console.error(
      "❌ Forgot password failed:",
      error
    );

    return next(error);
  }
}

/*
|--------------------------------------------------------------------------
| RESET PASSWORD
|--------------------------------------------------------------------------
|
| POST /api/auth/reset-password
|
|--------------------------------------------------------------------------
*/

async function resetPassword(
  req,
  res,
  next
) {
  try {
    const token =
      typeof req.body?.token ===
      "string"
        ? req.body.token.trim()
        : "";

    const password =
      typeof req.body?.password ===
      "string"
        ? req.body.password
        : "";

    const confirmPassword =
      typeof req.body
        ?.confirmPassword === "string"
        ? req.body.confirmPassword
        : "";

    if (!token) {
      return res.status(400).json({
        success: false,
        message:
          "A valid reset token is required.",
      });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 8 characters.",
      });
    }

    if (
      password !==
      confirmPassword
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Passwords do not match.",
      });
    }

    const tokenHash =
      hashToken(token);

    const reset =
      await PasswordReset.findOne({
        tokenHash,
        expiresAt: {
          $gt: new Date(),
        },
      }).select(
        "+tokenHash +expiresAt"
      );

    if (!reset) {
      return res.status(400).json({
        success: false,
        code: "RESET_TOKEN_INVALID",
        message:
          "Reset link is invalid or expired.",
      });
    }

    const passwordHash =
      await bcrypt.hash(
        password,
        12
      );

    const updatedUser =
      await User.findByIdAndUpdate(
        reset.userId,
        {
          passwordHash,
        },
        {
          new: true,
        }
      );

    if (!updatedUser) {
      /*
       * Remove stale reset token if the
       * associated account no longer exists.
       */
      await PasswordReset.deleteOne({
        _id: reset._id,
      });

      return res.status(400).json({
        success: false,
        message:
          "Unable to reset the password for this account.",
      });
    }

    /*
     * Token becomes invalid immediately
     * after successful password reset.
     */
    await PasswordReset.deleteOne({
      _id: reset._id,
    });

    return res.status(200).json({
      success: true,
      message:
        "Password reset successfully. Please log in.",
    });
  } catch (error) {
    console.error(
      "❌ Reset password failed:",
      error
    );

    return next(error);
  }
}

/*
|--------------------------------------------------------------------------
| Exports
|--------------------------------------------------------------------------
*/

module.exports = {
  startRegistration,
  verifyRegistrationEmail,
  resendRegistrationEmail,
  completeRegistration,
  login,
  forgotPassword,
  resetPassword,
};

