import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";

export type ActivityItem = {
  id: string; // recipe id
  title: string;
  imageUrl?: string | null;
  authorName: string;
  authorId: string;
  createdAt: Date | null;
  isMine: boolean;
  isPublic: boolean;
};

const FEED_SIZE = 30;

const toDate = (v: any): Date | null =>
  v?.toDate ? v.toDate() : typeof v === "string" || typeof v === "number" ? new Date(v) : null;

function toActivity(d: any, uid: string): ActivityItem {
  const data = d.data();
  return {
    id: d.id,
    title: data.title || "Untitled recipe",
    imageUrl: data.imageUrl || null,
    authorName: data.createdBy || "A chef",
    authorId: data.userId,
    createdAt: toDate(data.createdAt),
    isMine: data.userId === uid,
    isPublic: data.isPublic === true,
  };
}

/** When the user last opened Notifications (stored on their profile doc). */
export function useNotificationsSeenAt(uid?: string | null) {
  const [seenAt, setSeenAt] = useState<Date | null>(null);
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      doc(db, "users", uid),
      (snap) => setSeenAt(toDate(snap.data()?.notificationsSeenAt)),
      () => {}
    );
  }, [uid]);
  return seenAt;
}

/**
 * Recipe activity: the community's latest public recipes plus your own
 * uploads (public or private), newest first.
 */
export function useActivityFeed(uid?: string | null) {
  const [community, setCommunity] = useState<ActivityItem[]>([]);
  const [mine, setMine] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    let pending = 2;
    const done = () => {
      pending = Math.max(0, pending - 1);
      if (pending === 0) setLoading(false);
    };

    const unsubCommunity = onSnapshot(
      query(
        collection(db, "recipes"),
        where("isPublic", "==", true),
        orderBy("createdAt", "desc"),
        limit(FEED_SIZE)
      ),
      (snap) => {
        setCommunity(snap.docs.map((d) => toActivity(d, uid)));
        done();
      },
      (err) => {
        console.error("Community activity error:", err);
        done();
      }
    );

    const unsubMine = onSnapshot(
      query(
        collection(db, "recipes"),
        where("userId", "==", uid),
        orderBy("createdAt", "desc"),
        limit(FEED_SIZE)
      ),
      (snap) => {
        setMine(snap.docs.map((d) => toActivity(d, uid)));
        done();
      },
      (err) => {
        console.error("My activity error:", err);
        done();
      }
    );

    return () => {
      unsubCommunity();
      unsubMine();
    };
  }, [uid]);

  const items = useMemo(() => {
    const byId = new Map<string, ActivityItem>();
    [...community, ...mine].forEach((i) => byId.set(i.id, i));
    return [...byId.values()]
      .sort((a, b) => (b.createdAt?.getTime() ?? Date.now()) - (a.createdAt?.getTime() ?? Date.now()))
      .slice(0, FEED_SIZE);
  }, [community, mine]);

  return { items, loading };
}

/** Pending friend requests for the signed-in user. */
export function usePendingRequestCount(uid?: string | null) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      query(collection(db, "users", uid, "friendRequests"), where("status", "==", "pending")),
      (snap) => setCount(snap.size),
      () => {}
    );
  }, [uid]);
  return count;
}

/** Badge count: pending requests + community recipes posted since you last looked. */
export function useNotificationBadge(uid?: string | null) {
  const requests = usePendingRequestCount(uid);
  const seenAt = useNotificationsSeenAt(uid);
  const [newRecipes, setNewRecipes] = useState(0);

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      query(
        collection(db, "recipes"),
        where("isPublic", "==", true),
        orderBy("createdAt", "desc"),
        limit(FEED_SIZE)
      ),
      (snap) => {
        const since = seenAt?.getTime() ?? 0;
        setNewRecipes(
          snap.docs.filter((d) => {
            const data = d.data();
            const t = toDate(data.createdAt)?.getTime() ?? 0;
            return data.userId !== uid && t > since;
          }).length
        );
      },
      () => {}
    );
  }, [uid, seenAt]);

  return requests + newRecipes;
}

export async function markNotificationsSeen(uid: string) {
  await setDoc(
    doc(db, "users", uid),
    { uid, notificationsSeenAt: new Date().toISOString() },
    { merge: true }
  ).catch(() => {});
}
