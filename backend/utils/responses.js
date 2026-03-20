export function successResponse(res, data, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data
  });
}

export function errorResponse(res, message, statusCode = 500, details = null) {
  return res.status(statusCode).json({
    success: false,
    error: {
      message,
      details
    }
  });
}
