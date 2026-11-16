// app.js - entry point of the CarCheck application.
// It loads the settings from .env, registers the middleware in the right order,
// connects the routes and starts the Express server.

import express from "express";
import dotenv from "dotenv";
import vehicleRoutes from "./routes/vehicleRoutes.js";
import { requestLogger } from "./middleware/logger.js";
import { notFound, errorHandler } from "./middleware/errorHandlers.js";

// Read the variables from the .env file into process.env
dotenv.config({ quiet: true });

const app = express();
const port = process.env.PORT || 3000;

// ---------- View engine ----------
// res.render("index") will look for views/index.ejs
app.set("view engine", "ejs");

// ---------- Built-in middleware ----------
app.use(express.static("public")); // serves /styles/main.css, images, etc.
app.use(express.urlencoded({ extended: true })); // reads data from HTML forms into req.body
app.use(express.json()); // reads JSON bodies into req.body

// ---------- Custom middleware ----------
app.use(requestLogger); // logs method, URL, status and time of every request

// Variables available in every EJS view (used in the header and footer)
app.use((req, res, next) => {
  res.locals.currentYear = new Date().getFullYear();
  res.locals.currentPath = req.path;
  next();
});

// ---------- Routes ----------
app.use("/", vehicleRoutes);

// ---------- Error handling (must be the last middleware) ----------
app.use(notFound); // no route matched -> 404 page
app.use(errorHandler); // any error passed with next(error) ends up here

app.listen(port, () => {
  console.log(`CarCheck is running on http://localhost:${port}`);
});
