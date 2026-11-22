import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

const MAX_BYTES = 5 * 1024 * 1024; // keep in sync with storage.rules

/** True for URLs other devices can load (as opposed to a file on this phone). */
export const isRemoteUrl = (uri?: string | null) => !!uri && /^https?:\/\//i.test(uri);

// React Native's fetch().blob() is unreliable for local file:// URIs; XHR is the
// pattern the Firebase docs recommend for Expo.
function uriToBlob(uri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => resolve(xhr.response as Blob);
    xhr.onerror = () => reject(new Error("Could not read the selected image."));
    xhr.responseType = "blob";
    xhr.open("GET", uri, true);
    xhr.send(null);
  });
}

/**
 * Uploads a picked image (local URI) to Firebase Storage and returns its public
 * download URL. Remote URLs are returned unchanged, so it is safe to call on
 * images that were already uploaded.
 */
export async function uploadImageAsync(localUri: string, storagePath: string): Promise<string> {
  if (isRemoteUrl(localUri)) return localUri;

  const blob = await uriToBlob(localUri);
  try {
    if (blob.size > MAX_BYTES) {
      throw new Error("That image is too large. Please choose one under 5 MB.");
    }
    const fileRef = ref(storage, storagePath);
    await uploadBytes(fileRef, blob, { contentType: blob.type || "image/jpeg" });
    return await getDownloadURL(fileRef);
  } finally {
    // Free the native memory held by the blob (RN-specific).
    (blob as any).close?.();
  }
}
