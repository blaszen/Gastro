import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";

// Set with: npx firebase-tools functions:secrets:set SPOONACULAR_KEY
const SPOONACULAR_KEY = defineSecret("SPOONACULAR_KEY");
const BASE = "https://api.spoonacular.com";

// Only allow these query params through to Spoonacular.
const SEARCH_PARAMS = [
  "query",
  "type",
  "number",
  "offset",
  "addRecipeInformation",
  "fillIngredients",
];

// Pasting a key into a terminal can add stray whitespace or line breaks.
const apiKey = () => SPOONACULAR_KEY.value().trim();

async function callSpoonacular(path: string, params: URLSearchParams) {
  params.set("apiKey", apiKey());
  const r = await fetch(`${BASE}${path}?${params}`);
  if (r.ok) return r.json();

  // Log Spoonacular's own message (never the key) so failures are diagnosable.
  const body = (await r.text()).slice(0, 300);
  logger.error("Spoonacular request failed", { path, status: r.status, body });

  if (r.status === 401) {
    throw new HttpsError("failed-precondition", "Recipe search is misconfigured (invalid API key).");
  }
  if (r.status === 402 || r.status === 429) {
    throw new HttpsError("resource-exhausted", "Recipe search has hit its daily limit. Try again tomorrow.");
  }
  throw new HttpsError("unavailable", `Recipe search is unavailable (upstream ${r.status}).`);
}

export const spoonacularSearch = onCall(
  { secrets: [SPOONACULAR_KEY], maxInstances: 10 },
  async (req) => {
    if (!req.auth) throw new HttpsError("unauthenticated", "Sign in required.");
    const params = new URLSearchParams();
    for (const k of SEARCH_PARAMS) {
      const v = req.data?.[k];
      if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
    }
    return callSpoonacular("/recipes/complexSearch", params);
  }
);

export const spoonacularRecipe = onCall(
  { secrets: [SPOONACULAR_KEY], maxInstances: 10 },
  async (req) => {
    if (!req.auth) throw new HttpsError("unauthenticated", "Sign in required.");
    const id = String(req.data?.id ?? "");
    if (!/^\d+$/.test(id)) throw new HttpsError("invalid-argument", "Bad id.");
    return callSpoonacular(`/recipes/${id}/information`, new URLSearchParams());
  }
);
