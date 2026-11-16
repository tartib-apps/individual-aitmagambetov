// services/nhtsaService.js - every Axios call to the NHTSA vPIC API lives here.
// Controllers never call Axios directly; they call these functions instead.
// API documentation: https://vpic.nhtsa.dot.gov/api/

import axios from "axios";
import dotenv from "dotenv";

dotenv.config({ quiet: true });

const DEFAULT_BASE_URL = "https://vpic.nhtsa.dot.gov/api/vehicles";
const DEFAULT_TIMEOUT_MS = 8000;

// One Axios instance with shared settings: base URL, timeout and JSON format.
// Every request below automatically gets "?format=json" added.
const nhtsaApi = axios.create({
  baseURL: process.env.NHTSA_BASE_URL || DEFAULT_BASE_URL,
  timeout: Number(process.env.API_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS,
  params: { format: "json" },
});

/**
 * Turns any Axios error into a normal Error with:
 *  - statusCode: the HTTP status our own server should answer with
 *  - userMessage: a friendly sentence that is safe to show on the page
 * The technical details are logged to the console for the developer.
 */
function toFriendlyError(error, action) {
  const friendly = new Error(`NHTSA API request failed while trying to ${action}`);

  if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
    // The API did not answer within the timeout
    friendly.statusCode = 504;
    friendly.userMessage = "The vehicle database is taking too long to answer. Please try again in a moment.";
  } else if (error.response) {
    // The API answered, but with an error status (4xx / 5xx)
    const status = error.response.status;
    if (status === 429) {
      friendly.statusCode = 429;
      friendly.userMessage = "Too many requests were sent to the vehicle database. Please wait a minute and try again.";
    } else if (status === 401 || status === 403) {
      friendly.statusCode = 502;
      friendly.userMessage = "Access to the vehicle database was denied. Please check the API settings.";
    } else if (status >= 500) {
      friendly.statusCode = 502;
      friendly.userMessage = "The vehicle database is having problems right now. Please try again later.";
    } else {
      friendly.statusCode = 400;
      friendly.userMessage = "The vehicle database could not understand this request. Please check your input.";
    }
  } else {
    // No answer at all: no internet, DNS problem, server unreachable...
    friendly.statusCode = 503;
    friendly.userMessage = "Could not connect to the vehicle database. Please check your internet connection.";
  }

  console.error(`[NHTSA] ${action} failed:`, error.code || "", error.message);
  return friendly;
}

/**
 * Sends a GET request. If the request fails because of the NETWORK
 * (timeout / no connection, i.e. no response at all) it tries one more time.
 * Errors with a response (404, 500...) are not retried - trying again would not help.
 */
async function getWithRetry(url) {
  try {
    return await nhtsaApi.get(url);
  } catch (error) {
    if (error.response) throw error;
    console.warn(`[NHTSA] ${error.code} on ${url} - retrying once...`);
    return await nhtsaApi.get(url);
  }
}

/**
 * Request #1 - decode a VIN.
 * Endpoint: GET /DecodeVinValues/{vin}?format=json
 * Returns one flat object with ~150 fields (Make, Model, ModelYear, EngineHP, ...).
 */
export async function decodeVin(vin) {
  try {
    const response = await getWithRetry(`/DecodeVinValues/${encodeURIComponent(vin)}`);
    return response.data.Results[0];
  } catch (error) {
    throw toFriendlyError(error, "decode the VIN");
  }
}

/**
 * Request #2 - all models of one make in one model year.
 * Endpoint: GET /GetModelsForMakeYear/make/{make}/modelyear/{year}?format=json
 * Returns an array like [{ Make_Name, Model_ID, Model_Name }, ...]
 */
export async function getModelsForMakeYear(make, year) {
  try {
    const url = `/GetModelsForMakeYear/make/${encodeURIComponent(make)}/modelyear/${year}`;
    const response = await getWithRetry(url);
    return response.data.Results;
  } catch (error) {
    throw toFriendlyError(error, "load the models");
  }
}

/**
 * Request #3 - all makes that produce passenger cars.
 * Endpoint: GET /GetMakesForVehicleType/car?format=json
 * Returns an array like [{ MakeId, MakeName, VehicleTypeName }, ...]
 */
export async function getCarMakes() {
  try {
    const response = await getWithRetry("/GetMakesForVehicleType/car");
    return response.data.Results;
  } catch (error) {
    throw toFriendlyError(error, "load the list of makes");
  }
}
