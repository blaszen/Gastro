import { useEffect, useState } from "react";
import { collection, deleteDoc, doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "./firebase";

/** Live set of lesson ids the user has completed. */
export function useLessonProgress(uid?: string | null) {
  const [done, setDone] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }
    return onSnapshot(
      collection(db, "users", uid, "progress"),
      (snap) => {
        setDone(new Set(snap.docs.map((d) => d.id)));
        setLoading(false);
      },
      () => setLoading(false)
    );
  }, [uid]);
  return { done, loading };
}

export async function setLessonComplete(uid: string, lessonId: string, complete: boolean) {
  const ref = doc(db, "users", uid, "progress", lessonId);
  if (complete) await setDoc(ref, { completedAt: new Date().toISOString() });
  else await deleteDoc(ref);
}
