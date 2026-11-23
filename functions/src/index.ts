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

// ---------------------------------------------------------------- AI recipes
// Gemini on Vertex AI, called with the function's own service account, so no
// API key is needed. Billed to the project's Blaze plan.
const GEMINI_MODEL = "gemini-3.5-flash";
const AI_DAILY_LIMIT = 15;
const AI_USAGE_COLLECTION = "aiUsage"; // server-only (catch-all rule denies clients)

async function accessToken() {
  const res = await fetch(
    "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
    { headers: { "Metadata-Flavor": "Google" } }
  );
  if (!res.ok) throw new Error(`metadata token ${res.status}`);
  return ((await res.json()) as { access_token: string }).access_token;
}

const RECIPE_SCHEMA = {
  type: "OBJECT",
  properties: {
    refused: { type: "BOOLEAN" },
    title: { type: "STRING" },
    description: { type: "STRING" },
    ingredients: { type: "ARRAY", items: { type: "STRING" } },
    instructions: { type: "ARRAY", items: { type: "STRING" } },
    prepTimeMinutes: { type: "INTEGER" },
    servings: { type: "INTEGER" },
  },
  required: ["refused", "title", "ingredients", "instructions", "prepTimeMinutes", "servings"],
};

const SYSTEM_PROMPT = `You are GASTRO's recipe developer. Turn the cook's request into one complete, tested-style home recipe.
Rules:
- Ingredients: one per item, with quantities in US units and metric in parentheses where useful (e.g. "2 cups (480 ml) chicken stock").
- Instructions: clear numbered-style steps without the numbers, each one action, with times, temperatures (°F and °C) and doneness cues.
- Respect any dietary needs, allergies, equipment, time limits or ingredients the cook mentions.
- prepTimeMinutes is total active plus cooking time. servings is a whole number.
- Use safe food-handling temperatures for meat, poultry, fish and eggs.
- If the request is not about food or cooking, or asks for something unsafe or inedible, set refused to true and leave the other fields minimal.`;

export const generateRecipe = onCall({ maxInstances: 10, timeoutSeconds: 60 }, async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in to use the recipe generator.");

  const prompt = String(req.data?.prompt || "").trim().slice(0, 600);
  if (prompt.length < 3) throw new HttpsError("invalid-argument", "Describe the dish you want.");

  // Per-user daily limit keeps costs predictable.
  const day = new Date().toISOString().slice(0, 10);
  const usageRef = db.collection(AI_USAGE_COLLECTION).doc(`${uid}_${day}`);
  const used = await db.runTransaction(async (tx) => {
    const n = ((await tx.get(usageRef)).data()?.count as number) || 0;
    if (n >= AI_DAILY_LIMIT) return n;
    tx.set(usageRef, { uid, day, count: n + 1, expiresAt: Timestamp.fromMillis(Date.now() + 3 * 86400000) });
    return n;
  });
  if (used >= AI_DAILY_LIMIT) {
    throw new HttpsError("resource-exhausted", `You've used all ${AI_DAILY_LIMIT} AI recipes for today. Try again tomorrow.`);
  }

  const project = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
  const url = `https://aiplatform.googleapis.com/v1/projects/${project}/locations/global/publishers/google/models/${GEMINI_MODEL}:generateContent`;

  let res: Awaited<ReturnType<typeof fetch>>;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
          responseSchema: RECIPE_SCHEMA,
        },
      }),
    });
  } catch (err) {
    logger.error("Gemini request failed", { err: String(err) });
    throw new HttpsError("unavailable", "The recipe generator is unavailable. Please try again.");
  }

  if (!res.ok) {
    logger.error("Gemini error", { status: res.status, body: (await res.text()).slice(0, 2000) });
    throw new HttpsError("internal", "The recipe generator couldn't create a recipe. Please try again.");
  }

  const body: any = await res.json();
  const text = body?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("") || "";
  let recipe: any;
  try {
    recipe = JSON.parse(text);
  } catch {
    logger.error("Gemini returned non-JSON", { text: text.slice(0, 500) });
    throw new HttpsError("internal", "The recipe generator returned something unexpected. Please try again.");
  }
  if (recipe.refused) {
    throw new HttpsError("failed-precondition", "That doesn't look like a recipe request. Try describing a dish.");
  }

  const strList = (v: unknown, max: number) =>
    (Array.isArray(v) ? v : []).map((s) => String(s).trim()).filter(Boolean).slice(0, max);

  return {
    title: String(recipe.title || "").slice(0, 120),
    description: String(recipe.description || "").slice(0, 400),
    ingredients: strList(recipe.ingredients, 40),
    instructions: strList(recipe.instructions, 30),
    prepTimeMinutes: Math.max(0, Math.min(1440, Number(recipe.prepTimeMinutes) || 0)),
    servings: Math.max(1, Math.min(50, Number(recipe.servings) || 1)),
    remaining: AI_DAILY_LIMIT - used - 1,
  };
});
