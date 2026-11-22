import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { deleteObject, listAll, ref } from "firebase/storage";
import {
  EmailAuthProvider,
  deleteUser,
  reauthenticateWithCredential,
  User,
} from "firebase/auth";
import { db, storage } from "./firebase";

async function deleteAll(paths: { id: string; ref: any }[]) {
  await Promise.all(paths.map((d) => deleteDoc(d.ref).catch(() => {})));
}

/**
 * Removes everything the user owns: recipes, grocery/prep items, favourites,
 * friend links (both sides), pending requests, uploaded photos and the
 * profile document. Chat threads are shared with the other person and are
 * left in place.
 */
export async function deleteUserData(uid: string) {
  const [recipes, grocery, favorites, requests, friends, prepLists, blocked] = await Promise.all([
    getDocs(query(collection(db, "recipes"), where("userId", "==", uid))),
    getDocs(query(collection(db, "groceryItems"), where("createdBy", "==", uid))),
    getDocs(collection(db, "users", uid, "favorites")),
    getDocs(collection(db, "users", uid, "friendRequests")),
    getDocs(collection(db, "users", uid, "friends")),
    getDocs(collection(db, "users", uid, "prepLists")),
    getDocs(collection(db, "users", uid, "blocked")),
  ]);

  // Remove me from each friend's list, then my own copies.
  await Promise.all(
    friends.docs.map((f) => deleteDoc(doc(db, "users", f.id, "friends", uid)).catch(() => {}))
  );

  await deleteAll([
    ...recipes.docs,
    ...grocery.docs,
    ...favorites.docs,
    ...requests.docs,
    ...friends.docs,
    ...prepLists.docs,
    ...blocked.docs,
  ]);

  // Uploaded photos (best effort).
  for (const folder of [`users/${uid}`, `recipeImages/${uid}`]) {
    try {
      const listing = await listAll(ref(storage, folder));
      await Promise.all(listing.items.map((i) => deleteObject(i).catch(() => {})));
    } catch {
      // Folder may not exist.
    }
  }

  await deleteDoc(doc(db, "users", uid)).catch(() => {});
}

/** Re-confirms the password; Firebase requires a recent sign-in to delete an account. */
export async function reauthenticate(user: User, password: string) {
  if (!user.email) throw new Error("This account has no email address.");
  const cred = EmailAuthProvider.credential(user.email, password);
  await reauthenticateWithCredential(user, cred);
}

/** Deletes the user's data and then the Firebase Auth account. */
export async function deleteAccount(user: User) {
  await deleteUserData(user.uid);
  await deleteUser(user);
}
