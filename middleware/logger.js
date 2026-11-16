// middleware/logger.js - custom request logger.
// For every request it prints: time, method, URL, status code and how long it took.
// Example: [16/11/2026, 15:02:11] GET /models?make=toyota&year=2020 -> 200 (412 ms)

export function requestLogger(req, res, next) {
  const start = Date.now();

  // "finish" fires after the response was sent, so the status code is known here
  res.on("finish", () => {
    const time = new Date().toLocaleString("en-GB");
    const duration = Date.now() - start;
    console.log(`[${time}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration} ms)`);
  });

  next(); // pass control to the next middleware / route
}
