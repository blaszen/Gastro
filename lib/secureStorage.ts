import * as SecureStore from "expo-secure-store";

// Firebase Auth persistence backed by the iOS Keychain / Android Keystore.
// SecureStore values are size-limited, so large values are split into chunks.
const CHUNK = 1800;
const safe = (k: string) => k.replace(/[^A-Za-z0-9._-]/g, "_");

export const secureStorage = {
  async setItem(key: string, value: string): Promise<void> {
    const k = safe(key);
    await this.removeItem(key);
    const n = Math.ceil(value.length / CHUNK) || 1;
    for (let i = 0; i < n; i++) {
      await SecureStore.setItemAsync(`${k}.${i}`, value.slice(i * CHUNK, (i + 1) * CHUNK));
    }
    await SecureStore.setItemAsync(`${k}.n`, String(n));
  },
  async getItem(key: string): Promise<string | null> {
    const k = safe(key);
    const n = await SecureStore.getItemAsync(`${k}.n`);
    if (!n) return null;
    let out = "";
    for (let i = 0; i < Number(n); i++) {
      const part = await SecureStore.getItemAsync(`${k}.${i}`);
      if (part === null) return null;
      out += part;
    }
    return out;
  },
  async removeItem(key: string): Promise<void> {
    const k = safe(key);
    const n = await SecureStore.getItemAsync(`${k}.n`);
    for (let i = 0; i < Number(n ?? 0); i++) await SecureStore.deleteItemAsync(`${k}.${i}`);
    await SecureStore.deleteItemAsync(`${k}.n`);
  },
};
