import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase";

export const REPORT_REASONS = [
  "Spam or misleading",
  "Offensive or hateful",
  "Sexual or inappropriate",
  "Copyright or stolen content",
  "Dangerous food advice",
  "Other",
] as const;

/** Files a report for review. Reports can only be created, never read, by clients. */
export async function reportRecipe(
  reporterId: string,
  recipe: { id: string; title?: string; userId?: string },
  reason: string
) {
  await addDoc(collection(db, "reports"), {
    type: "recipe",
    recipeId: recipe.id,
    recipeTitle: recipe.title || "",
    reportedUserId: recipe.userId || "",
    reporterId,
    reason,
    createdAt: serverTimestamp(),
  });
}

export async function blockUser(uid: string, blockedUid: string, displayName?: string) {
  await setDoc(doc(db, "users", uid, "blocked", blockedUid), {
    uid: blockedUid,
    displayName: displayName || "",
    blockedAt: new Date().toISOString(),
  });
}

export async function unblockUser(uid: string, blockedUid: string) {
  await deleteDoc(doc(db, "users", uid, "blocked", blockedUid));
}

export type BlockedUser = { uid: string; displayName?: string };

/** Live list of chefs the signed-in user has blocked. */
export function useBlockedUsers(uid?: string | null) {
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      collection(db, "users", uid, "blocked"),
      (snap) => setBlocked(snap.docs.map((d) => ({ uid: d.id, ...(d.data() as any) }))),
      () => {}
    );
  }, [uid]);
  return blocked;
}

/** Set of blocked user ids, for filtering feeds. */
export function useBlockedIds(uid?: string | null) {
  const blocked = useBlockedUsers(uid);
  return new Set(blocked.map((b) => b.uid));
}
