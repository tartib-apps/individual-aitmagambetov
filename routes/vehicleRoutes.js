// routes/vehicleRoutes.js - all URLs of the application.
// Each route connects a URL + HTTP method to a controller function.
// Validation middleware runs BEFORE the controller, so the controller
// only receives clean input.

import express from "express";
import {
  showHome,
  submitVin,
  showVinDetails,
  searchModels,
  showMakes,
} from "../controllers/vehicleController.js";
import { validateVinForm, validateVinParam, validateModelSearch } from "../middleware/validators.js";

const router = express.Router();

// GET /            -> home page with the two search forms
router.get("/", showHome);

// POST /vin        -> VIN form is submitted, validated, then redirected to the details page
router.post("/vin", validateVinForm, submitVin);

// GET /vin/:vin    -> details page: decoded information about one vehicle
router.get("/vin/:vin", validateVinParam, showVinDetails);

// GET /models?make=toyota&year=2020&filter=cor  -> list of models (result page)
router.get("/models", validateModelSearch, searchModels);

// GET /makes       -> all passenger-car makes grouped A-Z
router.get("/makes", showMakes);

export default router;
