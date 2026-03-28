import * as Linking from "expo-linking";

export const getPasswordRecoveryRedirectUrl = (): string => {
  const override = process.env.EXPO_PUBLIC_PASSWORD_RECOVERY_URL;
  if (typeof override === "string" && override.trim().length > 0) {
    return override.trim();
  }
  return Linking.createURL("reset-password");
};
