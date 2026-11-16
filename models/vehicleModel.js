// models/vehicleModel.js - the "M" in MVC.
// The API returns raw data (a VIN result has ~150 fields, most of them empty).
// These functions SELECT, CONVERT, CALCULATE, FILTER and SORT that data
// so the views receive only clean, ready-to-display values.

// Unit conversion factors
const HP_TO_KW = 0.7457;
const LB_TO_KG = 0.4536;
const MPH_TO_KMH = 1.609;
const INCH_TO_CM = 2.54;

// Safety features we check in a decoded VIN (API field name -> label for the page)
const SAFETY_FEATURES = {
  ABS: "Anti-lock brakes (ABS)",
  ESC: "Electronic stability control",
  TractionControl: "Traction control",
  ForwardCollisionWarning: "Forward collision warning",
  CIB: "Automatic emergency braking",
  LaneDepartureWarning: "Lane departure warning",
  LaneKeepSystem: "Lane keeping assist",
  BlindSpotMon: "Blind spot monitoring",
  AdaptiveCruiseControl: "Adaptive cruise control",
  RearVisibilitySystem: "Rear-view camera",
  ParkAssist: "Parking assist",
  DaytimeRunningLight: "Daytime running lights",
};

// The API uses these words for "this feature exists"
const PRESENT_VALUES = ["Standard", "Optional"];

/** Returns the value only if it is a real value (not empty / "Not Applicable"). */
function clean(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  if (text === "" || text === "Not Applicable" || text === "0") return null;
  return text;
}

/** Rounds a number and adds a unit, e.g. withUnit(143.2, "kW") -> "143 kW". */
function withUnit(number, unit) {
  return `${Math.round(number).toLocaleString("en-US")} ${unit}`.trim();
}

/** Builds the "Engine" text, e.g. "1.5 L, 4 cylinders, In-Line, Turbo". */
function describeEngine(raw) {
  const parts = [];
  if (clean(raw.DisplacementL)) parts.push(`${Number(raw.DisplacementL).toFixed(1)} L`);
  if (clean(raw.EngineCylinders)) parts.push(`${raw.EngineCylinders} cylinders`);
  if (clean(raw.EngineConfiguration)) parts.push(raw.EngineConfiguration);
  if (raw.Turbo === "Yes") parts.push("Turbo");
  return parts.length > 0 ? parts.join(", ") : null;
}

/** Engine power in hp and the calculated value in kW. */
function describePower(raw) {
  const hp = Number(clean(raw.EngineHP));
  if (!hp) return null;
  return `${withUnit(hp, "hp")} (${withUnit(hp * HP_TO_KW, "kW")})`;
}

/**
 * Converts the raw VIN result into the object used by views/vin.ejs.
 * Returns null when the API could not identify the vehicle at all.
 */
export function formatVinResult(raw) {
  // Without a make and a year the VIN was not recognised
  if (!clean(raw.Make) || !clean(raw.ModelYear)) return null;

  const modelYear = Number(raw.ModelYear);
  const age = new Date().getFullYear() - modelYear;

  // Group the useful fields into sections. Each item is [label, value].
  const sections = [
    {
      title: "General",
      items: [
        ["Body type", clean(raw.BodyClass)],
        ["Vehicle type", clean(raw.VehicleType)],
        ["Doors", clean(raw.Doors)],
        ["Seats", clean(raw.Seats)],
        ["Seat rows", clean(raw.SeatRows)],
        ["Steering", clean(raw.SteeringLocation)],
      ],
    },
    {
      title: "Engine & drivetrain",
      items: [
        ["Engine", describeEngine(raw)],
        ["Power", describePower(raw)],
        ["Fuel", clean(raw.FuelTypePrimary)],
        ["Electrification", clean(raw.ElectrificationLevel)],
        ["Transmission", clean(raw.TransmissionStyle)],
        ["Drive type", clean(raw.DriveType)],
      ],
    },
    {
      title: "Dimensions & performance",
      items: [
        ["Curb weight", clean(raw.CurbWeightLB) && withUnit(raw.CurbWeightLB * LB_TO_KG, "kg")],
        ["Wheelbase", clean(raw.WheelBaseShort) && withUnit(raw.WheelBaseShort * INCH_TO_CM, "cm")],
        ["Wheel size", clean(raw.WheelSizeFront) && `${raw.WheelSizeFront} inch`],
        ["Top speed", clean(raw.TopSpeedMPH) && withUnit(raw.TopSpeedMPH * MPH_TO_KMH, "km/h")],
      ],
    },
    {
      title: "Manufacturing",
      items: [
        ["Manufacturer", clean(raw.Manufacturer)],
        ["Plant", [clean(raw.PlantCity), clean(raw.PlantCountry)].filter(Boolean).join(", ") || null],
        ["Base price", clean(raw.BasePrice) && `$${withUnit(raw.BasePrice, "")}`],
      ],
    },
  ]
    // keep only items that have a value, then drop sections that became empty
    .map((section) => ({ ...section, items: section.items.filter(([, value]) => Boolean(value)) }))
    .filter((section) => section.items.length > 0);

  // Safety: check every feature from the list above
  const safetyFeatures = Object.entries(SAFETY_FEATURES).map(([field, label]) => ({
    label,
    present: PRESENT_VALUES.includes(raw[field]),
  }));
  const safetyCount = safetyFeatures.filter((feature) => feature.present).length;

  // ErrorCode "0" means "decoded without problems". Anything else is a warning.
  const warnings = String(raw.ErrorCode) === "0" ? [] : String(raw.ErrorText).split("; ").filter(Boolean);

  return {
    vin: raw.VIN,
    title: [modelYear, clean(raw.Make), clean(raw.Model), clean(raw.Trim)].filter(Boolean).join(" "),
    make: clean(raw.Make),
    model: clean(raw.Model),
    modelYear,
    age,
    ageLabel: age <= 0 ? "New" : `${age} ${age === 1 ? "year" : "years"} old`,
    sections,
    safetyFeatures,
    safetyCount,
    safetyTotal: safetyFeatures.length,
    warnings,
  };
}

/**
 * Prepares the model list for views/models.ejs:
 * removes duplicates, filters by the optional text, sorts A-Z.
 */
export function formatModels(rawModels, filterText = "") {
  const filter = filterText.toLowerCase();

  // A Map with Model_ID as key removes duplicate models
  const unique = new Map(rawModels.map((model) => [model.Model_ID, model]));

  return [...unique.values()]
    .map((model) => ({ id: model.Model_ID, name: model.Model_Name.trim(), make: model.Make_Name }))
    .filter((model) => model.name.toLowerCase().includes(filter))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Groups the list of makes by first letter for views/makes.ejs:
 * [{ letter: "A", makes: ["ACURA", "ALFA ROMEO", ...] }, ...]
 */
export function groupMakesByLetter(rawMakes) {
  const names = [...new Set(rawMakes.map((make) => make.MakeName.trim()))].sort((a, b) => a.localeCompare(b));

  const groups = names.reduce((result, name) => {
    const first = name[0].toUpperCase();
    const letter = /[A-Z]/.test(first) ? first : "#"; // makes starting with a digit go to "#"
    const existing = result[letter] || [];
    return { ...result, [letter]: [...existing, name] };
  }, {});

  return Object.keys(groups)
    .sort()
    .map((letter) => ({ letter, makes: groups[letter] }));
}
