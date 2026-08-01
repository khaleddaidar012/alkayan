const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    if (!req.user) {
      return res.status(401).json({ message: 'User not found' });
    }
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized, token invalid' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized for this action' });
    }
    next();
  };
};

const checkPermission = (module, action) => {
  return (req, res, next) => {
    if (req.user.role === 'admin') return next();
    const defaults = User.getDefaultPermissionsForRole(req.user.role);
    if (defaults[module]?.[action]) return next();
    if (req.user.permissions?.[module]?.[action]) return next();
    return res.status(403).json({ message: `Not authorized: missing ${module}.${action} permission` });
  };
};

module.exports = { protect, authorize, checkPermission };
