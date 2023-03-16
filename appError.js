class AppError extends Error {
  constructor(message, statusCode) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "FAIL" : "ERROR";

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
