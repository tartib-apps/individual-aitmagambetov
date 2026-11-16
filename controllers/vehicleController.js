// controllers/vehicleController.js - request handling logic (the "C" in MVC).
// Each function: reads the (already validated) input -> calls the API service
// -> processes the data with the model -> renders an EJS view.
// Errors are passed to next(error) so the central error handler shows a friendly page.

import { decodeVin, getModelsForMakeYear, getCarMakes } from "../services/nhtsaService.js";
import { formatVinResult, formatModels, groupMakesByLetter } from "../models/vehicleModel.js";

// Shown in the <datalist> of the model search form (only a hint, any make can be typed)
const POPULAR_MAKES = ["Toyota", "Honda", "Hyundai", "Kia", "Chevrolet", "Ford", "Nissan", "Volkswagen", "BMW", "Mercedes-Benz", "Lexus", "Tesla"];

// Example VINs the user can click on the home page
const SAMPLE_VINS = [
  { vin: "1HGCV1F34JA123456", label: "2018 Honda Accord" },
  { vin: "5YJ3E1EA7KF317000", label: "2019 Tesla Model 3" },
  { vin: "4T1B11HK5JU123456", label: "2018 Toyota Camry" },
];

/**
 * Data that the home page always needs. Also used by the validators when they
 * re-render the home page with error messages.
 */
export function homeViewData(extra = {}) {
  return {
    title: "Home",
    popularMakes: POPULAR_MAKES,
    sampleVins: SAMPLE_VINS,
    years: { min: 1981, max: new Date().getFullYear() + 1 },
    errors: {},
    values: {},
    ...extra,
  };
}

// GET / - home page with the VIN form and the model search form
export function showHome(req, res) {
  res.render("index", homeViewData());
}

// POST /vin - the VIN is already validated, so we only redirect to its details page.
// (Post/Redirect/Get pattern: refreshing the details page will not re-send the form.)
export function submitVin(req, res) {
  res.redirect(`/vin/${req.body.vin}`);
}

// GET /vin/:vin - decodes the VIN with the API and shows the details page
export async function showVinDetails(req, res, next) {
  try {
    const raw = await decodeVin(req.params.vin);
    const vehicle = formatVinResult(raw);

    // The API answered, but could not recognise this VIN -> "no results" state
    if (!vehicle) {
      return res.status(404).render("vin", {
        title: "VIN not found",
        vin: req.params.vin,
        vehicle: null,
        apiMessage: raw.ErrorText,
      });
    }

    res.render("vin", { title: vehicle.title, vin: req.params.vin, vehicle, apiMessage: null });
  } catch (error) {
    next(error);
  }
}

// GET /models?make=..&year=..&filter=.. - list of models for one make and year
export async function searchModels(req, res, next) {
  const { make, year, filter } = res.locals.search; // cleaned by validateModelSearch

  try {
    const rawModels = await getModelsForMakeYear(make, year);
    const models = formatModels(rawModels, filter);

    res.render("models", {
      title: `${make} models ${year}`,
      make,
      year,
      filter,
      models,
      totalFound: rawModels.length,
    });
  } catch (error) {
    next(error);
  }
}

// GET /makes - every passenger-car make grouped by first letter
export async function showMakes(req, res, next) {
  try {
    const rawMakes = await getCarMakes();
    const groups = groupMakesByLetter(rawMakes);
    const total = groups.reduce((sum, group) => sum + group.makes.length, 0);

    res.render("makes", {
      title: "All makes",
      groups,
      total,
      year: new Date().getFullYear(),
    });
  } catch (error) {
    next(error);
  }
}
