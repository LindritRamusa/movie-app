import {
  applyRecoverySession,
  requestPasswordRecovery,
  updatePasswordWithRecoverySession,
} from "@/services/supabase";
import { useCallback } from "react";

export const usePasswordRecovery = () => {
  const requestRecovery = useCallback(async (email: string) => {
    await requestPasswordRecovery(email);
  }, []);

  const completeRecovery = useCallback(
    async (
      accessToken: string,
      refreshToken: string,
      newPassword: string
    ) => {
      await applyRecoverySession(accessToken, refreshToken);
      await updatePasswordWithRecoverySession(newPassword);
    },
    []
  );

  return { requestRecovery, completeRecovery };
};
