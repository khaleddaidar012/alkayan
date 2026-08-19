const mongoose = require('mongoose');

function objectIdParam(paramName) {
  return (req, res, next, value) => {
    if (value === undefined) return next();
    if (!mongoose.Types.ObjectId.isValid(value)) {
      return res.status(400).json({ message: `Invalid ${paramName} format` });
    }
    next();
  };
}

function validateObjectId(req, res, next) {
  const idParams = ['id', 'customerId', 'paymentId', 'programId', 'taskId', 'goalId', 'userId', 'logId'];
  for (const param of idParams) {
    const value = req.params[param];
    if (value !== undefined && !mongoose.Types.ObjectId.isValid(value)) {
      return res.status(400).json({ message: `Invalid ${param} format` });
    }
  }
  next();
}

module.exports = { objectIdParam, validateObjectId };