const crypto = require("crypto");

function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

function normalizeUsername(username) {
  return String(username).trim().toLowerCase();
}

function generateCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function hashToken(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function generateRandomToken() {
  return crypto.randomBytes(32).toString("hex");
}

module.exports = {
  normalizeEmail,
  normalizeUsername,
  generateCode,
  hashToken,
  generateRandomToken
};
