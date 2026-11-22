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

export const searchRecipes = async (query, offset = 0) => {
  try {
    const res = await searchFn({
      query,
      number: 10,
      offset,
      addRecipeInformation: true,
      fillIngredients: true,
    });
    return res.data;
  } catch (err) {
    console.error("Spoonacular error:", err);
    return { results: [], totalResults: 0 };
  }
};
