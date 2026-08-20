const bcrypt = require("bcryptjs");
const Registration = require("../models/Registration");
const User = require("../models/User");
const PasswordReset = require("../models/PasswordReset");
const {
  normalizeEmail,
  normalizeUsername,
  generateCode,
  hashToken,
  generateRandomToken
} = require("../utils/crypto");
const { signAccessToken } = require("../utils/jwt");
const {
  sendVerificationCode,
  sendPasswordReset
} = require("../services/email.service");

const CODE_TTL_MS = 15 * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;

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
    helperStatus: user.helperStatus
  };
}

async function startRegistration(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid email address"
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        code: "EMAIL_EXISTS",
        message: "This email is already registered. Please log in."
      });
    }

    const code = generateCode();
    const codeHash = hashToken(code);


let registration = await Registration.findOne({ email });

if (registration) {
  registration.verificationCodeHash = codeHash;
  registration.verificationExpiresAt = new Date(
    Date.now() + CODE_TTL_MS
  );
  registration.verifiedAt = null;
  registration.attempts = 0;

  await registration.save();
} else {
  registration = await Registration.create({
    email,
    verificationCodeHash: codeHash,
    verificationExpiresAt: new Date(Date.now() + CODE_TTL_MS),
    verifiedAt: null,
    attempts: 0
  });
}

    await sendVerificationCode(email, code);

    return res.status(200).json({
      success: true,
      message: "Verification code sent to your email",
      data: { email }
    });
  } catch (error) {
    next(error);
  }
}

async function verifyRegistrationEmail(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email);
    const code = String(req.body.code || "").trim();

    const registration = await Registration.findOne({ email })
      .select("+verificationCodeHash +verificationExpiresAt");

    if (!registration) {
      return res.status(400).json({
        success: false,
        message: "Registration session not found. Start again."
      });
    }

    if (registration.attempts >= MAX_VERIFY_ATTEMPTS) {
      return res.status(429).json({
        success: false,
        message: "Too many verification attempts. Request a new code."
      });
    }

    if (registration.verificationExpiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Verification code expired. Request a new code."
      });
    }

    if (hashToken(code) !== registration.verificationCodeHash) {
      registration.attempts += 1;
      await registration.save();

      return res.status(400).json({
        success: false,
        message: "Invalid verification code"
      });
    }

registration.verifiedAt = new Date();

await registration.save();

    return res.status(200).json({
      success: true,
      message: "Email verified. Continue account setup.",
      data: { email }
    });
  } catch (error) {
    next(error);
  }
}

async function resendRegistrationEmail(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email);

    const registration = await Registration.findOne({ email });

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: "Registration session not found. Start again."
      });
    }

    const code = generateCode();

    await Registration.updateOne(
      { _id: registration._id },
      {
        verificationCodeHash: hashToken(code),
        verificationExpiresAt: new Date(Date.now() + CODE_TTL_MS),
        attempts: 0
      }
    );

    await sendVerificationCode(email, code);

    return res.status(200).json({
      success: true,
      message: "A new verification code has been sent"
    });
  } catch (error) {
    next(error);
  }
}

async function completeRegistration(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email);
    const username = normalizeUsername(req.body.username);
    const { password, confirmPassword } = req.body;

    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      return res.status(400).json({
        success: false,
        message: "Username must be 3–20 characters: letters, numbers or underscore."
      });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters."
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match."
      });
    }

    const registration = await Registration.findOne({ email });

    if (!registration || !registration.verifiedAt) {
      return res.status(403).json({
        success: false,
        message: "Verify your email before completing registration."
      });
    }

    if (await User.exists({ email })) {
      return res.status(409).json({
        success: false,
        code: "EMAIL_EXISTS",
        message: "This email is already registered."
      });
    }

    if (await User.exists({ username })) {
      return res.status(409).json({
        success: false,
        code: "USERNAME_EXISTS",
        message: "Username is already taken."
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      email,
      emailVerified: true,
      username,
      passwordHash
    });

    await Registration.deleteOne({ _id: registration._id });

    const accessToken = signAccessToken(user._id);

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      data: {
        accessToken,
        user: publicUser(user)
      }
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email or username is already in use."
      });
    }
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const identifier = String(req.body.identifier || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: "Username/email and password are required."
      });
    }

    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }]
    }).select("+passwordHash");

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials."
      });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email first."
      });
    }

    const accessToken = signAccessToken(user._id);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      data: {
        accessToken,
        user: publicUser(user)
      }
    });
  } catch (error) {
    next(error);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email);
    const user = await User.findOne({ email });

    // Same response whether account exists or not.
    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If the email is registered, a reset link will be sent."
      });
    }

    const rawToken = generateRandomToken();

    await PasswordReset.deleteMany({ userId: user._id });

    await PasswordReset.create({
      userId: user._id,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + CODE_TTL_MS)
    });

    const resetUrl =
      `${process.env.CLIENT_URL}/reset-password?token=${rawToken}`;

    await sendPasswordReset(user.email, resetUrl);

    return res.status(200).json({
      success: true,
      message: "If the email is registered, a reset link will be sent."
    });
  } catch (error) {
    next(error);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { token, password, confirmPassword } = req.body;

    if (!token || !password || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Valid token and password of at least 8 characters are required."
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match."
      });
    }

    const reset = await PasswordReset.findOne({
      tokenHash: hashToken(token),
      expiresAt: { $gt: new Date() }
    }).select("+tokenHash +expiresAt");

    if (!reset) {
      return res.status(400).json({
        success: false,
        message: "Reset link is invalid or expired."
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await User.findByIdAndUpdate(reset.userId, { passwordHash });
    await PasswordReset.deleteOne({ _id: reset._id });

    return res.status(200).json({
      success: true,
      message: "Password reset successfully. Please log in."
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  startRegistration,
  verifyRegistrationEmail,
  resendRegistrationEmail,
  completeRegistration,
  login,
  forgotPassword,
  resetPassword
};
