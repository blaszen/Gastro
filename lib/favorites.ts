import { getAuth } from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "./firebase";

// Helper to reliably get the current authenticated user ID
const getCurrentUserId = (): string => {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User must be logged in to access favorites.");
  }
  return user.uid;
};

/**
 * Fetch ONLY the current logged-in user's favorites
 */
export const fetchUserFavorites = async () => {
  try {
    const userId = getCurrentUserId();
    const favoritesRef = collection(db, "users", userId, "favorites");
    const snapshot = await getDocs(favoritesRef);

    return snapshot.docs.map((document) => {
      const data = document.data();
      return {
        id: document.id,
        recipeId: data.recipeId || document.id,
        ...data,
      };
    });
  } catch (error) {
    console.error("Error fetching user favorites:", error);
    return [];
  }
};

/**
 * Toggle favorite status scoped strictly to the logged-in user
 */
export const toggleFavoriteRecipe = async (
  recipe: any,
  isCurrentlyFav: boolean
) => {
  const userId = getCurrentUserId();
  const recipeId = String(recipe.recipeId || recipe.id);

  // Document path: /users/{userId}/favorites/{recipeId}
  const favDocRef = doc(db, "users", userId, "favorites", recipeId);

  if (isCurrentlyFav) {
    await deleteDoc(favDocRef);
  } else {
    const displayTitle =
      recipe.title ||
      recipe.recipeTitle ||
      recipe.name ||
      recipe.caption ||
      "Specialty Dish";

    const displayImage =
      recipe.imageUrl || recipe.image || recipe.photoUrl || "";

    const payload = {
      id: recipeId,
      recipeId: recipeId,
      userId: userId, // Bind user ID inside the document as well
      title: displayTitle,
      recipeTitle: displayTitle,
      image: displayImage,
      imageUrl: displayImage,
      sourceUrl: recipe.sourceUrl || recipe.url || `/(modals)/recipe/${recipeId}`,
      createdAt: new Date().toISOString(),
    };

    await setDoc(favDocRef, payload, { merge: true });
  }
};