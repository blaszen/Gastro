import { useEffect, useMemo, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  endAt,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  startAt,
  where,
} from "firebase/firestore";
import { User } from "firebase/auth";
import { db } from "./firebase";

export type Friend = { uid: string; displayName?: string; email?: string; photoURL?: string };
export type FriendRequest = {
  id: string; // sender uid
  fromUid: string;
  fromName?: string;
  fromEmail?: string;
  createdAt?: string;
};
export type ChefResult = { uid: string; displayName?: string; email?: string; photoURL?: string; headline?: string };
export type ChatThread = {
  id: string;
  participants: string[];
  participantData?: Record<string, { displayName?: string; photoURL?: string; email?: string }>;
  lastMessage?: string;
  lastSenderId?: string;
  updatedAt?: string;
  lastRead?: Record<string, string>;
};

export const threadIdFor = (a: string, b: string) => [a, b].sort().join("_");

/**
 * Keeps the signed-in user's public profile doc current (name, photo and a
 * lower-cased name for search). Called once per app session.
 */
export async function syncPublicProfile(user: User) {
  // Only write fields auth actually knows, so we never blank out a name or
  // photo that was saved on the profile doc.
  const data: Record<string, string> = {
    uid: user.uid,
    email: (user.email || "").toLowerCase(),
  };
  if (user.displayName) {
    data.displayName = user.displayName;
    data.displayNameLower = user.displayName.toLowerCase();
  }
  if (user.photoURL) data.photoURL = user.photoURL;
  await setDoc(doc(db, "users", user.uid), data, { merge: true }).catch(() => {});
}

// ---------------------------------------------------------------- friends

export function useFriends(uid?: string | null) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      collection(db, "users", uid, "friends"),
      (snap) => {
        setFriends(snap.docs.map((d) => ({ uid: d.id, ...(d.data() as any) })));
        setLoading(false);
      },
      () => setLoading(false)
    );
  }, [uid]);
  return { friends, loading };
}

export function useIncomingRequests(uid?: string | null) {
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      query(collection(db, "users", uid, "friendRequests"), where("status", "==", "pending")),
      (snap) => setRequests(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))),
      () => {}
    );
  }, [uid]);
  return requests;
}

/** Ids of chefs I've sent a request to that is still pending. */
export function useSentRequestIds(uid?: string | null) {
  const [ids, setIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      collection(db, "users", uid, "sentRequests"),
      (snap) => setIds(new Set(snap.docs.map((d) => d.id))),
      () => {}
    );
  }, [uid]);
  return ids;
}

export async function sendFriendRequest(me: User, target: { uid: string; displayName?: string }) {
  await setDoc(doc(db, "users", target.uid, "friendRequests", me.uid), {
    fromUid: me.uid,
    fromEmail: me.email || "",
    fromName: me.displayName || "Chef",
    status: "pending",
    createdAt: new Date().toISOString(),
  });
  await setDoc(doc(db, "users", me.uid, "sentRequests", target.uid), {
    uid: target.uid,
    displayName: target.displayName || "",
    createdAt: new Date().toISOString(),
  }).catch(() => {});
}

export async function cancelFriendRequest(me: User, targetUid: string) {
  await deleteDoc(doc(db, "users", targetUid, "friendRequests", me.uid)).catch(() => {});
  await deleteDoc(doc(db, "users", me.uid, "sentRequests", targetUid)).catch(() => {});
}

export async function acceptFriendRequest(me: User, req: FriendRequest) {
  const now = new Date().toISOString();
  await setDoc(doc(db, "users", me.uid, "friends", req.fromUid), {
    uid: req.fromUid,
    email: req.fromEmail || "",
    displayName: req.fromName || "Chef",
    connectedAt: now,
  });
  // Allowed by rules only while the request still exists, so write before deleting it.
  await setDoc(doc(db, "users", req.fromUid, "friends", me.uid), {
    uid: me.uid,
    email: me.email || "",
    displayName: me.displayName || "Chef",
    connectedAt: now,
  });
  await deleteDoc(doc(db, "users", me.uid, "friendRequests", req.fromUid));
  await deleteDoc(doc(db, "users", req.fromUid, "sentRequests", me.uid)).catch(() => {});
}

export async function declineFriendRequest(me: User, fromUid: string) {
  await deleteDoc(doc(db, "users", me.uid, "friendRequests", fromUid));
  await deleteDoc(doc(db, "users", fromUid, "sentRequests", me.uid)).catch(() => {});
}

export async function removeFriend(me: User, friendUid: string) {
  await deleteDoc(doc(db, "users", me.uid, "friends", friendUid));
  await deleteDoc(doc(db, "users", friendUid, "friends", me.uid)).catch(() => {});
}

/** Finds chefs by exact email, or by display-name prefix. */
export async function searchChefs(term: string, myUid: string): Promise<ChefResult[]> {
  const t = term.trim().toLowerCase();
  if (t.length < 2) return [];
  const users = collection(db, "users");
  const q = t.includes("@")
    ? query(users, where("email", "==", t), limit(5))
    : query(users, orderBy("displayNameLower"), startAt(t), endAt(t + ""), limit(20));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ uid: d.id, ...(d.data() as any) }))
    .filter((u) => u.uid !== myUid);
}

// ---------------------------------------------------------------- chats

/** Creates (or refreshes) the 1:1 thread with another chef and returns its id. */
export async function openChat(
  me: User,
  other: { uid: string; displayName?: string; photoURL?: string; email?: string }
) {
  const id = threadIdFor(me.uid, other.uid);
  await setDoc(
    doc(db, "chats", id),
    {
      participants: [me.uid, other.uid].sort(),
      participantData: {
        [me.uid]: {
          displayName: me.displayName || "Chef",
          photoURL: me.photoURL || "",
          email: me.email || "",
        },
        [other.uid]: {
          displayName: other.displayName || "Chef",
          photoURL: other.photoURL || "",
          email: other.email || "",
        },
      },
    },
    { merge: true }
  );
  return id;
}

export function isUnread(t: ChatThread, uid: string) {
  if (!t.updatedAt || !t.lastSenderId || t.lastSenderId === uid) return false;
  const read = t.lastRead?.[uid];
  return !read || read < t.updatedAt;
}

export function useThreads(uid?: string | null) {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      query(collection(db, "chats"), where("participants", "array-contains", uid)),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) }) as ChatThread)
          .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
        setThreads(list);
        setLoading(false);
      },
      (err) => {
        console.error("Threads error:", err);
        setLoading(false);
      }
    );
  }, [uid]);
  return { threads, loading };
}

export function useUnreadChatCount(uid?: string | null) {
  const { threads } = useThreads(uid);
  return useMemo(() => (uid ? threads.filter((t) => isUnread(t, uid)).length : 0), [threads, uid]);
}

export async function markThreadRead(threadId: string, uid: string) {
  await setDoc(
    doc(db, "chats", threadId),
    { participants: threadId.split("_"), lastRead: { [uid]: new Date().toISOString() } },
    { merge: true }
  ).catch(() => {});
}

export const shortTime = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const diffDays = (now.getTime() - d.getTime()) / 86400000;
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
};
