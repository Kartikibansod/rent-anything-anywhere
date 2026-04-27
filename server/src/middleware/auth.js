const { User } = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const { verifyAuthToken } = require("../utils/token");

const authenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const payload = verifyAuthToken(token);
  const user = await User.findById(payload.sub);

  if (!user || !user.isActive) {
    return res.status(401).json({ message: "Invalid or expired authentication" });
  }

  req.user = user;
  next();
});

function authorize(...roles) {
  return function authorizeRole(req, res, next) {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "You do not have permission to access this resource" });
    }

    next();
  };
}

const protect = authenticate;

module.exports = authenticate;
module.exports.authenticate = authenticate;
module.exports.protect = protect;
module.exports.authorize = authorize;