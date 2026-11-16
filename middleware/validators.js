// middleware/validators.js - input validation BEFORE anything is sent to the API.
// If the input is wrong, the middleware answers itself (status 400) and the
// controller never runs. If the input is fine, it cleans it and calls next().

import { homeViewData } from "../controllers/vehicleController.js";

// A VIN has exactly 17 characters: letters and digits, but never I, O or Q
// (they look too similar to 1 and 0).
const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;
// Make names: letters, digits, spaces and - & . ' (e.g. "Mercedes-Benz", "Rolls Royce")
const MAKE_PATTERN = /^[A-Za-z0-9 .&'-]{2,40}$/;
const MIN_YEAR = 1981; // VINs became standard in 1981
const MAX_FILTER_LENGTH = 30;

/** Returns an error message for the VIN, or null if it is valid. */
function checkVin(vin) {
  if (!vin) return "Please enter a VIN.";
  if (vin.length !== 17) return `A VIN has exactly 17 characters - you entered ${vin.length}.`;
  if (/[IOQ]/.test(vin)) return "A VIN never contains the letters I, O or Q.";
  if (!VIN_PATTERN.test(vin)) return "A VIN may contain only letters and digits.";
  return null;
}

// POST /vin - checks the VIN typed into the form
export function validateVinForm(req, res, next) {
  const vin = String(req.body.vin || "").trim().toUpperCase().replace(/[\s-]/g, "");
  const error = checkVin(vin);

  if (error) {
    // Show the home page again with the message and the value the user typed
    return res.status(400).render("index", homeViewData({ errors: { vin: error }, values: { vin: req.body.vin } }));
  }

  req.body.vin = vin; // continue with the cleaned value
  next();
}

// GET /vin/:vin - the VIN can also be typed directly into the address bar
export function validateVinParam(req, res, next) {
  const vin = String(req.params.vin).toUpperCase();
  const error = checkVin(vin);

  if (error) {
    const invalid = new Error(`Invalid VIN in URL: ${req.params.vin}`);
    invalid.statusCode = 400;
    invalid.userMessage = error;
    return next(invalid); // let the central error handler show the page
  }

  req.params.vin = vin;
  next();
}

// GET /models - checks make, year and the optional filter text
export function validateModelSearch(req, res, next) {
  const make = String(req.query.make || "").trim();
  const yearText = String(req.query.year || "").trim();
  const filter = String(req.query.filter || "").trim();
  const maxYear = new Date().getFullYear() + 1;
  const year = Number(yearText);
  const errors = {};

  if (!make) {
    errors.make = "Please enter a car make, for example Toyota.";
  } else if (!MAKE_PATTERN.test(make)) {
    errors.make = "The make may contain only letters, digits, spaces and - & . ' (2-40 characters).";
  }

  if (!yearText) {
    errors.year = "Please enter a model year.";
  } else if (!Number.isInteger(year) || year < MIN_YEAR || year > maxYear) {
    errors.year = `The year must be a whole number between ${MIN_YEAR} and ${maxYear}.`;
  }

  if (filter.length > MAX_FILTER_LENGTH) {
    errors.filter = `The filter can be at most ${MAX_FILTER_LENGTH} characters.`;
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).render("index", homeViewData({ errors, values: { make, year: yearText, filter } }));
  }

  // Store the cleaned values so the controller can use them directly
  res.locals.search = { make, year, filter };
  next();
}
