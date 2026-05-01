const jwt = require("jsonwebtoken");
const { env } = require("../config/env");

function signAuthToken(user) {
  if (!env.jwtSecret || env.jwtSecret === "your_jwt_secret_here" || env.jwtSecret.includes("change_me")) {
    const error = new Error("JWT_SECRET must be set to a strong non-placeholder value");
    error.statusCode = 500;
    throw error;
  }

  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      userType: user.userType
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

function verifyAuthToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

module.exports = { signAuthToken, verifyAuthToken };
