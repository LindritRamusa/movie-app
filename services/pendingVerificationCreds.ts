import * as SecureStore from "expo-secure-store";

const STORAGE_KEY = "movie_app_pending_email_verification_v2";

export interface PendingVerificationCreds {
  email: string;
  password: string;
  userId: string;
}

export const savePendingVerificationCreds = async (
  email: string,
  password: string,
  userId: string
): Promise<void> => {
  const payload: PendingVerificationCreds = { email, password, userId };
  await SecureStore.setItemAsync(
    STORAGE_KEY,
    JSON.stringify(payload),
    { keychainAccessible: SecureStore.WHEN_UNLOCKED }
  );
};

export const getPendingVerificationCreds =
  async (): Promise<PendingVerificationCreds | null> => {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw) as Partial<PendingVerificationCreds>;
      if (
        typeof parsed.email === "string" &&
        typeof parsed.password === "string" &&
        typeof parsed.userId === "string"
      ) {
        return {
          email: parsed.email,
          password: parsed.password,
          userId: parsed.userId,
        };
      }
    } catch {}
    return null;
  };

export const clearPendingVerificationCreds = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(STORAGE_KEY);
};
