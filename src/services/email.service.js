const nodemailer = require("nodemailer");

function getTransporter() {
  console.log("========== SMTP CONFIG ==========");
  console.log("SMTP_HOST:", process.env.SMTP_HOST);
  console.log("SMTP_PORT:", process.env.SMTP_PORT);
  console.log("SMTP_USER:", process.env.SMTP_USER);
  console.log(
    "SMTP_PASSWORD:",
    process.env.SMTP_PASSWORD ? "LOADED" : "MISSING"
  );
  console.log("EMAIL_FROM:", process.env.EMAIL_FROM);
  console.log("=================================");

  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_PORT ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASSWORD
  ) {
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
}

async function sendVerificationCode(email, code) {
  const transporter = getTransporter();

  if (!transporter) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[DEV ONLY] Email verification code for ${email}: ${code}`);
      return;
    }
    throw new Error("SMTP is not configured");
  }

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to: email,
    subject: "Verify your Help Platform email",
    html: `
      <div style="font-family:Arial,sans-serif">
        <h2>Verify your email</h2>
        <p>Your Help Platform verification code is:</p>
        <h1 style="letter-spacing:6px">${code}</h1>
        <p>This code expires in 15 minutes.</p>
      </div>
    `
  });
}

async function sendPasswordReset(email, resetUrl) {
  const transporter = getTransporter();

  if (!transporter) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[DEV ONLY] Password reset URL for ${email}: ${resetUrl}`);
      return;
    }
    throw new Error("SMTP is not configured");
  }

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to: email,
    subject: "Reset your Help Platform password",
    html: `
      <div style="font-family:Arial,sans-serif">
        <h2>Password reset</h2>
        <p>Use the link below to set a new password:</p>
        <p><a href="${resetUrl}">Reset password</a></p>
        <p>This link expires in 15 minutes.</p>
      </div>
    `
  });
}

module.exports = {
  sendVerificationCode,
  sendPasswordReset
};
