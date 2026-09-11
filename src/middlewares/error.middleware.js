export function notFound(req, res) {
  res.status(404).json({
    success: false,
    code: 'ROUTE_NOT_FOUND',
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || (err.name === 'ValidationError' ? 400 : 500);
  const body = {
    success: false,
    code: err.code || 'INTERNAL_SERVER_ERROR',
    message: statusCode === 500 && process.env.NODE_ENV === 'production'
      ? 'Internal server error.'
      : err.message,
  };
  if (err.details) body.details = err.details;
  if (process.env.NODE_ENV !== 'production' && statusCode === 500) body.stack = err.stack;
  res.status(statusCode).json(body);
}
