import { MIN_PASSWORD_LEN } from "@/constants/auth";
import { icons } from "@/constants/icons";
import { images } from "@/constants/images";
import { useAuth } from "@/store/AuthContext";
import { formatAppwriteError } from "@/utils/appwriteErrors";
import { Link, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const Register = () => {
  const router = useRouter();
  const {
    signUp,
    resendRegistrationOtp,
    completeRegistrationOtp,
  } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [otpSubmitting, setOtpSubmitting] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingOtp, setPendingOtp] = useState<{
    email: string;
    userId: string;
    otpSent: boolean;
  } | null>(null);
  const submitLockRef = useRef(false);

  const handleChangeName = useCallback((text: string) => {
    setName(text);
  }, []);

  const handleChangeEmail = useCallback((text: string) => {
    setEmail(text);
  }, []);

  const handleChangePassword = useCallback((text: string) => {
    setPassword(text);
  }, []);

  const handleChangeOtp = useCallback((text: string) => {
    setOtpCode(text.replace(/\s/g, ""));
  }, []);

  const handlePressSubmit = useCallback(async () => {
    if (submitLockRef.current) {
      return;
    }
    setFormError(null);
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPassword = password;
    if (!trimmedName || !trimmedEmail || !trimmedPassword) {
      setFormError("Fill in name, email, and password.");
      return;
    }
    if (trimmedPassword.length < MIN_PASSWORD_LEN) {
      setFormError(`Password must be at least ${MIN_PASSWORD_LEN} characters.`);
      return;
    }
    submitLockRef.current = true;
    setSubmitting(true);
    try {
      const result = await signUp(trimmedName, trimmedEmail, trimmedPassword);
      if (result.kind === "signed_in") {
        router.replace("/(tabs)/profile");
        return;
      }
      setPendingOtp({
        email: result.email,
        userId: result.userId,
        otpSent: result.otpSent,
      });
      setOtpCode("");
    } catch (e) {
      setFormError(formatAppwriteError(e, "auth"));
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  }, [email, name, password, router, signUp]);

  const handlePressConfirmOtp = useCallback(async () => {
    if (!pendingOtp || otpSubmitting) {
      return;
    }
    setFormError(null);
    setOtpSubmitting(true);
    try {
      await completeRegistrationOtp(pendingOtp.userId, otpCode);
      router.replace("/(tabs)/profile");
    } catch (e) {
      setFormError(formatAppwriteError(e, "otp"));
    } finally {
      setOtpSubmitting(false);
    }
  }, [completeRegistrationOtp, otpCode, otpSubmitting, pendingOtp, router]);

  const handlePressResendOtp = useCallback(async () => {
    if (!pendingOtp || resendLoading) {
      return;
    }
    setResendLoading(true);
    setFormError(null);
    try {
      const ok = await resendRegistrationOtp(
        pendingOtp.email,
        pendingOtp.userId
      );
      setPendingOtp((prev) =>
        prev ? { ...prev, otpSent: ok } : prev
      );
      if (!ok) {
        setFormError(
          "Could not send a new code. Check that Email OTP is enabled in Appwrite Auth, and wait a minute before trying again."
        );
      }
    } catch (e) {
      setFormError(formatAppwriteError(e, "otp"));
    } finally {
      setResendLoading(false);
    }
  }, [pendingOtp, resendLoading, resendRegistrationOtp]);

  const handlePressBack = useCallback(() => {
    if (pendingOtp) {
      setPendingOtp(null);
      setOtpCode("");
      setFormError(null);
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/profile");
    }
  }, [pendingOtp, router]);

  const handlePressGoToSignIn = useCallback(() => {
    router.replace("/login");
  }, [router]);

  if (pendingOtp) {
    return (
      <SafeAreaView className="flex-1 bg-primary">
        <Image
          source={images.bg}
          className="absolute w-full h-full z-0"
          resizeMode="cover"
        />
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            className="flex-1 px-5 pt-4"
            contentContainerStyle={{ paddingBottom: 48 }}
            keyboardShouldPersistTaps="handled"
          >
            <TouchableOpacity
              onPress={handlePressBack}
              className="flex-row items-center mt-2 mb-8 self-start"
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Image
                source={icons.arrow}
                className="size-6 mr-2 rotate-180"
                tintColor="#fff"
              />
              <Text className="text-white text-base">Back</Text>
            </TouchableOpacity>

            <View className="flex-row items-center mb-6">
              <Image source={icons.logo} className="w-12 h-10 mr-4" />
              <Text className="text-3xl font-bold text-white">Enter code</Text>
            </View>

            <Text className="text-light-200 text-sm mb-4">
              We sent a one-time code to{" "}
              <Text className="text-white font-semibold">{pendingOtp.email}</Text>
              . Enter it below to verify and sign in. Codes expire in about 15
              minutes.
              {!pendingOtp.otpSent
                ? " If you did not get a code, turn on Email OTP in Appwrite and tap Resend."
                : ""}
            </Text>

            <Text className="text-light-200 text-sm mb-1">Verification code</Text>
            <TextInput
              className="bg-dark-100 text-white rounded-xl px-4 py-3 mb-4 border border-dark-200"
              value={otpCode}
              onChangeText={handleChangeOtp}
              placeholder="Code from email"
              placeholderTextColor="#9CA4AB"
              keyboardType="number-pad"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!otpSubmitting && !resendLoading}
              textContentType="oneTimeCode"
            />

            {formError ? (
              <Text className="text-red-400 text-sm mb-4">{formError}</Text>
            ) : null}

            <TouchableOpacity
              className="bg-accent py-3.5 rounded-xl items-center mb-3"
              onPress={() => void handlePressConfirmOtp()}
              disabled={otpSubmitting || resendLoading}
            >
              <Text className="text-white font-bold text-base">
                {otpSubmitting ? "Verifying…" : "Verify and continue"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-dark-100 py-3.5 rounded-xl items-center border border-dark-200 mb-3"
              onPress={() => void handlePressResendOtp()}
              disabled={resendLoading || otpSubmitting}
            >
              <Text className="text-white font-semibold text-base">
                {resendLoading ? "Sending…" : "Resend code"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="py-3.5 rounded-xl items-center border border-dark-200 mb-3"
              onPress={handlePressGoToSignIn}
              disabled={resendLoading || otpSubmitting}
            >
              <Text className="text-white font-semibold text-base">
                Go to sign in
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-primary">
      <Image
        source={images.bg}
        className="absolute w-full h-full z-0"
        resizeMode="cover"
      />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            onPress={handlePressBack}
            className="flex-row items-center mt-2 mb-8 self-start"
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Image
              source={icons.arrow}
              className="size-6 mr-2 rotate-180"
              tintColor="#fff"
            />
            <Text className="text-white text-base">Back</Text>
          </TouchableOpacity>

          <View className="flex-row items-center mb-8">
            <Image source={icons.logo} className="w-12 h-10 mr-4" />
            <Text className="text-3xl font-bold text-white">Create account</Text>
          </View>

          <Text className="text-light-200 text-sm mb-6">
            After sign up, Appwrite sends a one-time code to your email (Email OTP).
            You are signed in only after you enter that code on the next screen.
          </Text>

          <Text className="text-light-200 text-sm mb-1">Name</Text>
          <TextInput
            className="bg-dark-100 text-white rounded-xl px-4 py-3 mb-4 border border-dark-200"
            value={name}
            onChangeText={handleChangeName}
            placeholder="Your name"
            placeholderTextColor="#9CA4AB"
            autoCapitalize="words"
            editable={!submitting}
          />

          <Text className="text-light-200 text-sm mb-1">Email</Text>
          <TextInput
            className="bg-dark-100 text-white rounded-xl px-4 py-3 mb-4 border border-dark-200"
            value={email}
            onChangeText={handleChangeEmail}
            placeholder="you@example.com"
            placeholderTextColor="#9CA4AB"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!submitting}
            autoComplete="email"
          />

          <Text className="text-light-200 text-sm mb-1">Password</Text>
          <TextInput
            className="bg-dark-100 text-white rounded-xl px-4 py-3 mb-4 border border-dark-200"
            value={password}
            onChangeText={handleChangePassword}
            placeholder={`At least ${MIN_PASSWORD_LEN} characters`}
            placeholderTextColor="#9CA4AB"
            secureTextEntry
            editable={!submitting}
            autoComplete="new-password"
          />

          {formError ? (
            <Text className="text-red-400 text-sm mb-4">{formError}</Text>
          ) : null}

          <TouchableOpacity
            className="bg-accent py-3.5 rounded-xl items-center mb-4"
            onPress={() => void handlePressSubmit()}
            disabled={submitting}
          >
            <Text className="text-white font-bold text-base">
              {submitting ? "Creating account…" : "Create account"}
            </Text>
          </TouchableOpacity>

          <Link href="/login" asChild>
            <TouchableOpacity className="items-center py-3" disabled={submitting}>
              <Text className="text-light-200 text-sm">
                Already have an account?{" "}
                <Text className="text-accent font-semibold">Sign in</Text>
              </Text>
            </TouchableOpacity>
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Register;
