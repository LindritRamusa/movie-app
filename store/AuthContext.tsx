import {
  type CompleteEmailChangeOtpResult,
  type RegisterResult,
  completeEmailChangeWithOtp,
  completeRegistrationWithEmailOtp,
  registerWithVerificationFlow,
  resendEmailChangeOtp,
  resendSignupConfirmationEmail,
  signInExistingUser,
  startEmailChangeWithReauth,
  updateAccountDisplayName,
  updateAccountPasswordReauthed,
} from "@/services/auth";
import { supabase } from "@/services/supabase";
import type { AuthProfile } from "@/types/auth-profile";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export type { CompleteEmailChangeOtpResult, RegisterResult };

const toAuthProfile = (u: SupabaseUser): AuthProfile => {
  const meta = u.user_metadata as Record<string, unknown> | undefined;
  const fromMeta =
    (typeof meta?.full_name === "string" && meta.full_name.trim()) ||
    (typeof meta?.name === "string" && meta.name.trim()) ||
    "";
  return {
    id: u.id,
    email: u.email ?? "",
    name: fromMeta,
    emailVerified: !!u.email_confirmed_at,
  };
};

interface AuthContextValue {
  user: AuthProfile | null;
  isReady: boolean;
  signIn: (email: string, password: string) => Promise<AuthProfile>;
  signUp: (
    name: string,
    email: string,
    password: string
  ) => Promise<RegisterResult>;
  signOut: () => Promise<void>;
  saveDisplayName: (name: string) => Promise<AuthProfile>;
  updatePassword: (
    oldPassword: string,
    newPassword: string
  ) => Promise<AuthProfile>;
  startEmailChange: (
    newEmail: string,
    currentPassword: string
  ) => Promise<void>;
  completeEmailChangeOtp: (
    newEmail: string,
    otp: string
  ) => Promise<CompleteEmailChangeOtpResult>;
  resendEmailChangeOtp: (newEmail: string) => Promise<boolean>;
  completeRegistrationOtp: (
    email: string,
    name: string,
    password: string,
    otp: string
  ) => Promise<AuthProfile>;
  resendSignupConfirmationEmail: (email: string, name: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthProfile | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const applySessionUser = (u: SupabaseUser | null) => {
      if (!cancelled) {
        setUser(u ? toAuthProfile(u) : null);
      }
    };

    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        applySessionUser(data.session?.user ?? null);
      } finally {
        if (!cancelled) {
          setIsReady(true);
        }
      }
    };

    void init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      applySessionUser(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
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
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  const saveDisplayName = useCallback(async (name: string) => {
    const next = await updateAccountDisplayName(name);
    setUser(next);
    return next;
  }, []);

  const updatePassword = useCallback(
    async (oldPassword: string, newPassword: string) => {
      const next = await updateAccountPasswordReauthed(oldPassword, newPassword);
      setUser(next);
      return next;
    },
    []
  );

  const startEmailChange = useCallback(
    async (newEmail: string, currentPassword: string) => {
      await startEmailChangeWithReauth(newEmail, currentPassword);
    },
    []
  );

  const handleCompleteEmailChangeOtp = useCallback(
    async (newEmail: string, otp: string) => {
      const result = await completeEmailChangeWithOtp(newEmail, otp);
      if (result.kind === "completed") {
        setUser(result.profile);
      }
      return result;
    },
    []
  );

  const handleResendEmailChangeOtp = useCallback(
    async (newEmail: string) => resendEmailChangeOtp(newEmail),
    []
  );

  const handleCompleteRegistrationOtp = useCallback(
    async (email: string, name: string, password: string, otp: string) => {
      const next = await completeRegistrationWithEmailOtp(
        email,
        name,
        password,
        otp
      );
      setUser(next);
      return next;
    },
    []
  );

  const handleResendSignup = useCallback(
    async (email: string, name: string) =>
      resendSignupConfirmationEmail(email, name),
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
      startEmailChange,
      completeEmailChangeOtp: handleCompleteEmailChangeOtp,
      resendEmailChangeOtp: handleResendEmailChangeOtp,
      completeRegistrationOtp: handleCompleteRegistrationOtp,
      resendSignupConfirmationEmail: handleResendSignup,
    }),
    [
      user,
      isReady,
      signIn,
      signUp,
      signOut,
      saveDisplayName,
      updatePassword,
      startEmailChange,
      handleCompleteEmailChangeOtp,
      handleResendEmailChangeOtp,
      handleCompleteRegistrationOtp,
      handleResendSignup,
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
