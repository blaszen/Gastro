import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "./firebase";

// The Spoonacular key lives server-side in a Firebase Cloud Function secret.
const functions = getFunctions(app);
const searchFn = httpsCallable(functions, "spoonacularSearch");
const recipeFn = httpsCallable(functions, "spoonacularRecipe");

export const getRecipeInformation = async (id) => {
  try {
    const res = await recipeFn({ id });
    return res.data;
  } catch (error) {
    console.error("Error fetching recipe details:", error);
    return null;
  }
};

/**
 * Returns { results, totalResults } on success.
 * On failure returns { results: [], totalResults: 0, error: "<user-facing message>" }
 * so screens can tell "nothing matched" apart from "search is down".
 */
export const searchRecipes = async (query, offset = 0, type) => {
  try {
    const res = await searchFn({
      query,
      type,
      number: 10,
      offset,
      addRecipeInformation: true,
      fillIngredients: true,
    });
    return res.data;
  } catch (err) {
    console.error("Spoonacular error:", err);
    const message =
      err?.code === "functions/resource-exhausted" ||
      err?.code === "functions/failed-precondition" ||
      err?.code === "functions/unavailable"
        ? err.message
        : "Recipe search is unavailable right now. Please try again.";
    return { results: [], totalResults: 0, error: message };
  }
};
