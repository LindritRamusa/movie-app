import {
  type RegisterResult,
  completeEmailChangeWithOtp,
  completeRegistrationWithEmailOtp,
  registerWithVerificationFlow,
  resendRegistrationEmailOtp,
  signInExistingUser,
} from "@/services/auth";
import {
  restoreUserSessionFromStorage,
  sendEmailVerificationOtpToAddress,
  signOutAppwrite,
  updateAccountEmail,
  updateAccountName,
  updateAccountPassword,
} from "@/services/appwrite";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Models } from "react-native-appwrite";

export type { RegisterResult };

interface AuthContextValue {
  user: Models.User | null;
  isReady: boolean;
  signIn: (email: string, password: string) => Promise<Models.User>;
  signUp: (
    name: string,
    email: string,
    password: string
  ) => Promise<RegisterResult>;
  signOut: () => Promise<void>;
  saveDisplayName: (name: string) => Promise<Models.User>;
  updatePassword: (oldPassword: string, newPassword: string) => Promise<Models.User>;
  updateEmail: (newEmail: string, currentPassword: string) => Promise<Models.User>;
  sendEmailVerificationOtp: (email: string) => Promise<{
    userId: string;
    otpSent: boolean;
  }>;
  completeEmailVerificationOtp: (userId: string, otp: string) => Promise<Models.User>;
  resendRegistrationOtp: (email: string, userId: string) => Promise<boolean>;
  resendRegistrationEmailOtp: (email: string, userId: string) => Promise<boolean>;
  completeRegistrationOtp: (userId: string, otp: string) => Promise<Models.User>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<Models.User | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const next = await restoreUserSessionFromStorage();
        if (!cancelled && next) {
          setUser(next);
        }
      } finally {
        if (!cancelled) {
          setIsReady(true);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const next = await signInExistingUser(email, password);
    setUser(next);
    return next;
  }, []);

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      const result = await registerWithVerificationFlow(name, email, password);
      if (result.kind === "signed_in") {
        setUser(result.user);
      }
      return result;
    },
    []
  );

  const signOut = useCallback(async () => {
    await signOutAppwrite();
    setUser(null);
  }, []);

  const saveDisplayName = useCallback(async (name: string) => {
    const next = await updateAccountName(name.trim());
    setUser(next);
    return next;
  }, []);

  const updatePassword = useCallback(
    async (oldPassword: string, newPassword: string) => {
      const next = await updateAccountPassword(oldPassword, newPassword);
      setUser(next);
      return next;
    },
    []
  );

  const updateEmail = useCallback(
    async (newEmail: string, currentPassword: string) => {
      const next = await updateAccountEmail(newEmail, currentPassword);
      setUser(next);
      return next;
    },
    []
  );

  const sendEmailVerificationOtp = useCallback(
    async (email: string) => sendEmailVerificationOtpToAddress(email),
    []
  );

  const completeEmailVerificationOtp = useCallback(
    async (userId: string, otp: string) => {
      const next = await completeEmailChangeWithOtp(userId, otp);
      setUser(next);
      return next;
    },
    []
  );

  const handleResendRegistrationOtp = useCallback(
    async (email: string, userId: string) =>
      resendRegistrationEmailOtp(email, userId),
    []
  );

  const handleCompleteRegistrationOtp = useCallback(
    async (userId: string, otp: string) => {
      const next = await completeRegistrationWithEmailOtp(userId, otp);
      setUser(next);
      return next;
    },
    []
  );

  const value = useMemo(
    () => ({
      user,
      isReady,
      signIn,
      signUp,
      signOut,
      saveDisplayName,
      updatePassword,
      updateEmail,
      sendEmailVerificationOtp,
      completeEmailVerificationOtp,
      resendRegistrationOtp: handleResendRegistrationOtp,
      resendRegistrationEmailOtp: handleResendRegistrationOtp,
      completeRegistrationOtp: handleCompleteRegistrationOtp,
    }),
    [
      user,
      isReady,
      signIn,
      signUp,
      signOut,
      saveDisplayName,
      updatePassword,
      updateEmail,
      sendEmailVerificationOtp,
      completeEmailVerificationOtp,
      handleResendRegistrationOtp,
      handleCompleteRegistrationOtp,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
};
