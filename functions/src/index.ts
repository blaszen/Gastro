import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";

// Set with: firebase functions:secrets:set SPOONACULAR_KEY
const SPOONACULAR_KEY = defineSecret("SPOONACULAR_KEY");
const BASE = "https://api.spoonacular.com";

// Only allow these query params through to Spoonacular.
const SEARCH_PARAMS = ["query", "number", "offset", "addRecipeInformation", "fillIngredients"];

export const spoonacularSearch = onCall(
  { secrets: [SPOONACULAR_KEY], maxInstances: 10 },
  async (req) => {
    if (!req.auth) throw new HttpsError("unauthenticated", "Sign in required.");
    const params = new URLSearchParams({ apiKey: SPOONACULAR_KEY.value() });
    for (const k of SEARCH_PARAMS) {
      const v = req.data?.[k];
      if (v !== undefined && v !== null) params.set(k, String(v));
    }
    const r = await fetch(`${BASE}/recipes/complexSearch?${params}`);
    if (!r.ok) throw new HttpsError("internal", `Upstream error ${r.status}`);
    return await r.json();
  }
);

export const spoonacularRecipe = onCall(
  { secrets: [SPOONACULAR_KEY], maxInstances: 10 },
  async (req) => {
    if (!req.auth) throw new HttpsError("unauthenticated", "Sign in required.");
    const id = String(req.data?.id ?? "");
    if (!/^\d+$/.test(id)) throw new HttpsError("invalid-argument", "Bad id.");
    const r = await fetch(`${BASE}/recipes/${id}/information?apiKey=${SPOONACULAR_KEY.value()}`);
    if (!r.ok) throw new HttpsError("internal", `Upstream error ${r.status}`);
    return await r.json();
  }
);
