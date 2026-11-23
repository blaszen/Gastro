import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentCreated, onDocumentDeleted } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

initializeApp();
const db = getFirestore();

// Set with: npx firebase-tools functions:secrets:set SPOONACULAR_KEY
const SPOONACULAR_KEY = defineSecret("SPOONACULAR_KEY");
const BASE = "https://api.spoonacular.com";

// Spoonacular's terms allow caching responses for up to 1 hour.
const CACHE_TTL_MS = 60 * 60 * 1000;
// Server-side only: client access is denied by the catch-all Firestore rule.
const CACHE_COLLECTION = "spoonacularCache";

const MAX_RESULTS = 10;

// Pasting a key into a terminal can add stray whitespace or line breaks.
const apiKey = () => SPOONACULAR_KEY.value().trim();

function cacheKey(path: string, params: URLSearchParams) {
  const sorted = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
  // Firestore doc IDs can't contain "/", so encode the whole request string.
  return encodeURIComponent(path + "?" + new URLSearchParams(sorted)).slice(0, 1400);
}

async function readCache(key: string) {
  try {
    const snap = await db.collection(CACHE_COLLECTION).doc(key).get();
    const entry = snap.data();
    if (entry && entry.expiresAt?.toMillis() > Date.now()) return entry.data;
  } catch (err) {
    logger.warn("Cache read failed", { err: String(err) });
  }
  return null;
}

async function writeCache(key: string, path: string, data: unknown) {
  try {
    await db.collection(CACHE_COLLECTION).doc(key).set({
      path,
      data,
      createdAt: Timestamp.now(),
      // A Firestore TTL policy on this field deletes expired entries automatically.
      expiresAt: Timestamp.fromMillis(Date.now() + CACHE_TTL_MS),
    });
  } catch (err) {
    // Caching is best-effort; never fail the request over it.
    logger.warn("Cache write failed", { err: String(err) });
  }
}

async function callSpoonacular(path: string, params: URLSearchParams) {
  const key = cacheKey(path, params);
  const cached = await readCache(key);
  if (cached) return cached;

  const url = new URLSearchParams(params);
  url.set("apiKey", apiKey());
  const r = await fetch(`${BASE}${path}?${url}`);

  if (r.ok) {
    const data = await r.json();
    await writeCache(key, path, data);
    return data;
  }

  // Log Spoonacular's own message (never the key) so failures are diagnosable.
  const body = (await r.text()).slice(0, 300);
  logger.error("Spoonacular request failed", { path, status: r.status, body });

  if (r.status === 401) {
    throw new HttpsError("failed-precondition", "Recipe search is misconfigured (invalid API key).");
  }
  if (r.status === 402 || r.status === 429) {
    throw new HttpsError("resource-exhausted", "Recipe search has hit its daily limit. Try again later.");
  }
  throw new HttpsError("unavailable", `Recipe search is unavailable (upstream ${r.status}).`);
}

export const spoonacularSearch = onCall(
  { secrets: [SPOONACULAR_KEY], maxInstances: 10 },
  async (req) => {
    if (!req.auth) throw new HttpsError("unauthenticated", "Sign in required.");

    const query = String(req.data?.query ?? "").trim().toLowerCase();
    if (!query) throw new HttpsError("invalid-argument", "Missing query.");
    const offset = Math.max(0, Math.min(900, Number(req.data?.offset) || 0));
    const number = Math.max(1, Math.min(MAX_RESULTS, Number(req.data?.number) || MAX_RESULTS));

    // Normalised params so identical searches share a cache entry.
    // fillIngredients is deliberately not forwarded: the list cards don't use it,
    // and full ingredients come from spoonacularRecipe when a recipe is opened.
    const params = new URLSearchParams({
      query,
      number: String(number),
      offset: String(offset),
      addRecipeInformation: "true",
    });
    const type = String(req.data?.type ?? "").trim().toLowerCase();
    if (type) params.set("type", type);

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

// ---------------------------------------------------------------------------
// Favorite counts
// Keeps recipes/{id}.favoriteCount in step with users/{uid}/favorites/{id} so
// the app can rank trending recipes and featured chefs. Spoonacular favourites
// (numeric ids) have no recipe doc and are skipped.
// ---------------------------------------------------------------------------
async function bumpFavoriteCount(recipeId: string, delta: number) {
  if (!/^[A-Za-z0-9]{15,}$/.test(recipeId)) return;
  const ref = db.collection("recipes").doc(recipeId);
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return;
      const current = Number(snap.get("favoriteCount")) || 0;
      tx.update(ref, { favoriteCount: Math.max(0, current + delta) });
    });
  } catch (err) {
    logger.warn("favoriteCount update failed", { recipeId, delta, err: String(err) });
  }
}

export const onFavoriteAdded = onDocumentCreated("users/{uid}/favorites/{recipeId}", (event) =>
  bumpFavoriteCount(event.params.recipeId, 1)
);

export const onFavoriteRemoved = onDocumentDeleted("users/{uid}/favorites/{recipeId}", (event) =>
  bumpFavoriteCount(event.params.recipeId, -1)
);
