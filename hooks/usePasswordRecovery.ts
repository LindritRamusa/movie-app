import {
  completePasswordRecovery,
  requestPasswordRecovery,
} from "@/services/appwrite";
import { useCallback } from "react";

export const usePasswordRecovery = () => {
  const requestRecovery = useCallback(async (email: string) => {
    await requestPasswordRecovery(email);
  }, []);

  const completeRecovery = useCallback(
    async (userId: string, secret: string, password: string) => {
      await completePasswordRecovery(userId, secret, password);
    },
    []
  );

  return { requestRecovery, completeRecovery };
};
