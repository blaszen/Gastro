import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "./firebase";

export type AiRecipe = {
  title: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  prepTimeMinutes: number;
  servings: number;
  remaining: number;
};

const generateFn = httpsCallable<{ prompt: string }, AiRecipe>(getFunctions(app), "generateRecipe", {
  timeout: 70000,
});

export async function generateRecipe(prompt: string): Promise<AiRecipe> {
  try {
    const res = await generateFn({ prompt });
    return res.data;
  } catch (err: any) {
    // Callable errors carry a user-facing message from the server.
    const code = String(err?.code || "");
    if (code.includes("resource-exhausted") || code.includes("failed-precondition") || code.includes("invalid-argument")) {
      throw new Error(err.message);
    }
    throw new Error("The recipe generator couldn't create a recipe right now. Please try again.");
  }
}

/** Turns generated steps into the Create form's instructions text. */
export const stepsToText = (steps: string[]) => steps.map((s, i) => `${i + 1}. ${s}`).join("\n");

export const PROMPT_IDEAS = [
  "Quick weeknight chicken with lemon and garlic",
  "Vegan Thai curry for 4",
  "Use up: eggs, spinach, feta",
  "Gluten-free chocolate dessert",
  "Fancy date-night pasta",
];
