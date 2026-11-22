import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "./firebase";

export type CommunityRecipe = {
  id: string;
  title: string;
  imageUrl?: string | null;
  userId: string;
  createdBy?: string;
  favoriteCount: number;
  prepTimeMinutes?: number | null;
  servings?: number | null;
  ingredients?: string[];
  createdAt?: any;
};

export type FeaturedChef = {
  uid: string;
  name: string;
  recipeCount: number;
  favorites: number;
  coverImage?: string | null;
  score: number;
};

export type PublicProfile = {
  uid: string;
  displayName?: string;
  photoURL?: string;
  headline?: string;
  bio?: string;
  cuisines?: string;
  location?: string;
  email?: string;
};

const normalise = (id: string, data: any): CommunityRecipe => ({
  id,
  title: data.title || "Untitled recipe",
  imageUrl: data.imageUrl || null,
  userId: data.userId,
  createdBy: data.createdBy,
  favoriteCount: Number(data.favoriteCount) || 0,
  prepTimeMinutes: data.prepTimeMinutes ?? null,
  servings: data.servings ?? null,
  ingredients: Array.isArray(data.ingredients) ? data.ingredients : [],
  createdAt: data.createdAt,
});

/** Most recent public recipes (live). Used for search, trending and featured chefs. */
export function usePublicRecipes(max = 300) {
  const [recipes, setRecipes] = useState<CommunityRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    return onSnapshot(
      query(
        collection(db, "recipes"),
        where("isPublic", "==", true),
        orderBy("createdAt", "desc"),
        limit(max)
      ),
      (snap) => {
        setRecipes(snap.docs.map((d) => normalise(d.id, d.data())));
        setLoading(false);
      },
      (err) => {
        console.error("Public recipes error:", err);
        setLoading(false);
      }
    );
  }, [max]);
  return { recipes, loading };
}

/** Public recipes by one chef, newest first. */
export function useChefRecipes(uid?: string | null) {
  const [recipes, setRecipes] = useState<CommunityRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!uid) return;
    // Equality-only filters need no composite index; sort on the client.
    return onSnapshot(
      query(collection(db, "recipes"), where("userId", "==", uid), where("isPublic", "==", true)),
      (snap) => {
        const list = snap.docs.map((d) => normalise(d.id, d.data()));
        list.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
        setRecipes(list);
        setLoading(false);
      },
      (err) => {
        console.error("Chef recipes error:", err);
        setLoading(false);
      }
    );
  }, [uid]);
  return { recipes, loading };
}

/**
 * Ranks chefs by community love: favorites received count triple, recipes
 * posted count once. Ties go to whoever posted more.
 */
export function rankFeaturedChefs(recipes: CommunityRecipe[], top = 10): FeaturedChef[] {
  const byChef = new Map<string, FeaturedChef>();
  for (const r of recipes) {
    if (!r.userId) continue;
    const c =
      byChef.get(r.userId) ??
      { uid: r.userId, name: r.createdBy || "Chef", recipeCount: 0, favorites: 0, coverImage: null, score: 0 };
    c.recipeCount += 1;
    c.favorites += r.favoriteCount;
    if (!c.coverImage && r.imageUrl?.startsWith("http")) c.coverImage = r.imageUrl;
    byChef.set(r.userId, c);
  }
  return [...byChef.values()]
    .map((c) => ({ ...c, score: c.favorites * 3 + c.recipeCount }))
    .sort((a, b) => b.score - a.score || b.recipeCount - a.recipeCount)
    .slice(0, top);
}

/** Most-favorited public recipes; falls back to newest when nothing has favorites yet. */
export function trendingRecipes(recipes: CommunityRecipe[], top = 10) {
  return [...recipes]
    .sort((a, b) => b.favoriteCount - a.favoriteCount)
    .slice(0, top);
}

/** Title / ingredient search over loaded community recipes. */
export function searchCommunity(recipes: CommunityRecipe[], term: string) {
  const t = term.trim().toLowerCase();
  if (!t) return [];
  return recipes.filter(
    (r) =>
      r.title.toLowerCase().includes(t) ||
      (r.createdBy || "").toLowerCase().includes(t) ||
      (r.ingredients || []).some((i) => i.toLowerCase().includes(t))
  );
}

const profileCache = new Map<string, PublicProfile>();

/** Fetches public profile docs for a set of users (cached for the session). */
export function useProfiles(uids: string[]) {
  const key = uids.join(",");
  const [profiles, setProfiles] = useState<Record<string, PublicProfile>>({});
  useEffect(() => {
    let cancelled = false;
    const missing = uids.filter((u) => !profileCache.has(u));
    Promise.all(
      missing.map((u) =>
        getDoc(doc(db, "users", u))
          .then((s) => profileCache.set(u, { uid: u, ...(s.data() as any) }))
          .catch(() => profileCache.set(u, { uid: u }))
      )
    ).then(() => {
      if (cancelled) return;
      const out: Record<string, PublicProfile> = {};
      uids.forEach((u) => {
        const p = profileCache.get(u);
        if (p) out[u] = p;
      });
      setProfiles(out);
    });
    return () => {
      cancelled = true;
    };
  }, [key]);
  return profiles;
}

/** Live set of the signed-in user's favorite recipe ids. */
export function useFavoriteIds(uid?: string | null) {
  const [ids, setIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      collection(db, "users", uid, "favorites"),
      (snap) => setIds(new Set(snap.docs.map((d) => d.id))),
      () => {}
    );
  }, [uid]);
  return ids;
}

export function useMemoFeatured(recipes: CommunityRecipe[], blocked: Set<string>) {
  return useMemo(
    () => rankFeaturedChefs(recipes.filter((r) => !blocked.has(r.userId))),
    [recipes, blocked]
  );
}
