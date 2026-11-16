// middleware/errorHandlers.js - the 404 handler and the central error handler.
// Both are registered at the very end of app.js.

// Runs only when no route matched the URL
export function notFound(req, res, next) {
  res.status(404).render("error", {
    title: "Page not found",
    statusCode: 404,
    message: `The page "${req.originalUrl}" does not exist.`,
  });
}

// Express recognises an error handler by its FOUR parameters (err, req, res, next).
// Every next(error) in the app ends up here, so the server never crashes and the
// user never sees a stack trace.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;

  // Technical details go to the console for the developer only
  console.error(`[ERROR] ${req.method} ${req.originalUrl} -> ${statusCode}: ${err.message}`);
  if (statusCode === 500) console.error(err.stack);

  res.status(statusCode).render("error", {
    title: "Something went wrong",
    statusCode,
    message: err.userMessage || "An unexpected error happened on our side. Please try again.",
  });
}
