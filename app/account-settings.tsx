import { icons } from "@/constants/icons";
import { images } from "@/constants/images";
import { MAX_PASSWORD_LEN, MIN_PASSWORD_LEN } from "@/constants/auth";
import { useAuth } from "@/store/AuthContext";
import { formatAppwriteError } from "@/utils/appwriteErrors";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

const AccountSettings = () => {
  const router = useRouter();
  const {
    user,
    isReady,
    saveDisplayName,
    updatePassword,
    updateEmail,
    sendEmailVerificationOtp,
    completeEmailVerificationOtp,
    resendRegistrationEmailOtp,
  } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailOtpStep, setEmailOtpStep] = useState<{
    userId: string;
    email: string;
  } | null>(null);
  const [emailOtpCode, setEmailOtpCode] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState<
    "name" | "email" | "emailOtp" | "password" | null
  >(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.name?.trim() || "");
    }
  }, [user]);

  const handleChangeDisplayName = useCallback((text: string) => {
    setDisplayName(text);
  }, []);

  const handleChangeNewEmail = useCallback((text: string) => {
    setNewEmail(text);
  }, []);

  const handleChangeEmailPassword = useCallback((text: string) => {
    setEmailPassword(text);
  }, []);

  const handleChangeOldPassword = useCallback((text: string) => {
    setOldPassword(text);
  }, []);

  const handleChangeNewPassword = useCallback((text: string) => {
    setNewPassword(text);
  }, []);

  const handleChangeConfirmPassword = useCallback((text: string) => {
    setConfirmPassword(text);
  }, []);

  const handleChangeEmailOtpCode = useCallback((text: string) => {
    setEmailOtpCode(text.replace(/\s/g, ""));
  }, []);

  const handlePressBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/profile");
    }
  }, [router]);

  const handlePressSaveName = useCallback(async () => {
    const trimmed = displayName.trim();
    if (!trimmed) {
      return;
    }
    setSaving("name");
    try {
      await saveDisplayName(trimmed);
      Alert.alert("Saved", "Your display name was updated.");
    } catch (e) {
      Alert.alert("Could not save name", formatAppwriteError(e, "general"));
    } finally {
      setSaving(null);
    }
  }, [displayName, saveDisplayName]);

  const handlePressUpdateEmail = useCallback(async () => {
    if (!user) {
      return;
    }
    const next = newEmail.trim().toLowerCase();
    if (!next) {
      Alert.alert("Email required", "Enter a new email address.");
      return;
    }
    if (next === user.email?.toLowerCase()) {
      Alert.alert("Same email", "Enter a different email than your current one.");
      return;
    }
    if (!emailPassword) {
      Alert.alert("Password required", "Enter your current password to change email.");
      return;
    }
    Alert.alert(
      "Change email?",
      "We will update your email and send a one-time code to the new address to verify it.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          onPress: () => {
            void (async () => {
              setSaving("email");
              try {
                await updateEmail(next, emailPassword);
                const { userId, otpSent } = await sendEmailVerificationOtp(next);
                setNewEmail("");
                setEmailPassword("");
                setEmailOtpCode("");
                setEmailOtpStep({ userId, email: next });
                if (!otpSent) {
                  Alert.alert(
                    "Code not sent",
                    "Your email was updated, but we could not send a verification code. Check that Email OTP is enabled in Appwrite, then tap Resend code below.",
                  );
                } else {
                  Alert.alert(
                    "Check your email",
                    `We sent a verification code to ${next}. Enter it below.`,
                  );
                }
              } catch (e) {
                Alert.alert(
                  "Could not update email",
                  formatAppwriteError(e, "general")
                );
              } finally {
                setSaving(null);
              }
            })();
          },
        },
      ]
    );
  }, [user, newEmail, emailPassword, updateEmail, sendEmailVerificationOtp]);

  const handlePressVerifyEmailOtp = useCallback(async () => {
    if (!emailOtpStep) {
      return;
    }
    if (!emailOtpCode.trim()) {
      Alert.alert("Code required", "Enter the code from your email.");
      return;
    }
    setSaving("emailOtp");
    try {
      await completeEmailVerificationOtp(
        emailOtpStep.userId,
        emailOtpCode
      );
      setEmailOtpStep(null);
      setEmailOtpCode("");
      Alert.alert("Email verified", "Your new email is verified.");
    } catch (e) {
      Alert.alert(
        "Could not verify",
        formatAppwriteError(e, "otp")
      );
    } finally {
      setSaving(null);
    }
  }, [
    emailOtpStep,
    emailOtpCode,
    completeEmailVerificationOtp,
  ]);

  const handlePressResendEmailOtp = useCallback(async () => {
    if (!emailOtpStep) {
      return;
    }
    setSaving("emailOtp");
    try {
      const ok = await resendRegistrationEmailOtp(
        emailOtpStep.email,
        emailOtpStep.userId
      );
      if (!ok) {
        Alert.alert(
          "Could not resend",
          "Wait a minute, then try again. Ensure Email OTP is enabled in Appwrite.",
        );
      } else {
        Alert.alert("Sent", "Check your inbox for a new code.");
      }
    } finally {
      setSaving(null);
    }
  }, [emailOtpStep, resendRegistrationEmailOtp]);

  const handlePressCancelEmailOtp = useCallback(() => {
    setEmailOtpStep(null);
    setEmailOtpCode("");
  }, []);

  const handlePressUpdatePassword = useCallback(async () => {
    if (newPassword.length < MIN_PASSWORD_LEN) {
      Alert.alert(
        "Password too short",
        `Use at least ${MIN_PASSWORD_LEN} characters.`
      );
      return;
    }
    if (newPassword.length > MAX_PASSWORD_LEN) {
      Alert.alert("Password too long", `Use at most ${MAX_PASSWORD_LEN} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Mismatch", "New password and confirmation do not match.");
      return;
    }
    if (!oldPassword) {
      Alert.alert("Current password", "Enter your current password.");
      return;
    }
    setSaving("password");
    try {
      await updatePassword(oldPassword, newPassword);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      Alert.alert("Password updated", "Your password was changed.");
    } catch (e) {
      Alert.alert(
        "Could not update password",
        formatAppwriteError(e, "general")
      );
    } finally {
      setSaving(null);
    }
  }, [oldPassword, newPassword, confirmPassword, updatePassword]);

  if (!isReady) {
    return (
      <SafeAreaView className="flex-1 bg-primary justify-center items-center">
        <Image
          source={images.bg}
          className="absolute w-full h-full z-0"
          resizeMode="cover"
        />
        <ActivityIndicator size="large" color="#AB8BFF" />
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView className="flex-1 bg-primary">
        <Image
          source={images.bg}
          className="absolute w-full h-full z-0"
          resizeMode="cover"
        />
        <View className="flex-1 justify-center items-center px-5">
          <Text className="text-light-200 text-center">
            Sign in to manage your account.
          </Text>
          <TouchableOpacity
            className="mt-6 bg-accent py-3 px-6 rounded-xl"
            onPress={() => router.replace("/login")}
          >
            <Text className="text-white font-semibold">Sign in</Text>
          </TouchableOpacity>
        </View>
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
            className="flex-row items-center mt-2 mb-6 self-start"
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

          <Text className="text-3xl font-bold text-white mb-1">Account</Text>
          <Text className="text-light-300 text-sm mb-8">
            Signed in as {user.email}
          </Text>

          <Text className="text-lg text-white font-bold mb-3">Display name</Text>
          <TextInput
            className="bg-dark-100 text-white rounded-xl px-4 py-3 mb-3 border border-dark-200"
            value={displayName}
            onChangeText={handleChangeDisplayName}
            placeholder="Your name"
            placeholderTextColor="#9CA4AB"
            autoCapitalize="words"
            autoCorrect={false}
            maxLength={128}
            editable={saving === null}
          />
          <TouchableOpacity
            className="bg-accent py-3 rounded-xl items-center mb-10"
            onPress={() => void handlePressSaveName()}
            disabled={saving !== null || !displayName.trim()}
          >
            <Text className="text-white font-semibold">
              {saving === "name" ? "Saving…" : "Save name"}
            </Text>
          </TouchableOpacity>

          <Text className="text-lg text-white font-bold mb-3">Email</Text>
          <Text className="text-light-300 text-xs mb-2">
            Enter a new email and your current password. We will send a one-time
            code to the new address to verify it.
          </Text>
          <TextInput
            className="bg-dark-100 text-white rounded-xl px-4 py-3 mb-3 border border-dark-200"
            value={newEmail}
            onChangeText={handleChangeNewEmail}
            placeholder="new.email@example.com"
            placeholderTextColor="#9CA4AB"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={saving === null && !emailOtpStep}
            autoComplete="email"
          />
          <Text className="text-light-200 text-sm mb-1">Current password</Text>
          <TextInput
            className="bg-dark-100 text-white rounded-xl px-4 py-3 mb-3 border border-dark-200"
            value={emailPassword}
            onChangeText={handleChangeEmailPassword}
            placeholder="Required to change email"
            placeholderTextColor="#9CA4AB"
            secureTextEntry
            editable={saving === null && !emailOtpStep}
            autoComplete="password"
          />
          <TouchableOpacity
            className={`bg-dark-100 border border-dark-200 py-3 rounded-xl items-center ${
              emailOtpStep ? "mb-4" : "mb-10"
            }`}
            onPress={() => void handlePressUpdateEmail()}
            disabled={saving !== null || !user || !!emailOtpStep}
          >
            <Text className="text-white font-semibold">
              {saving === "email" ? "Updating…" : "Update email"}
            </Text>
          </TouchableOpacity>

          {emailOtpStep ? (
            <View className="mt-2 mb-10 border border-accent/40 rounded-2xl p-4 bg-dark-100/80">
              <Text className="text-white font-bold text-base mb-1">
                Verify new email
              </Text>
              <Text className="text-light-300 text-xs mb-4">
                Code sent to {emailOtpStep.email}. Enter the numbers from the
                email.
              </Text>
              <Text className="text-light-200 text-sm mb-1">Verification code</Text>
              <TextInput
                className="bg-primary text-white rounded-xl px-4 py-3 mb-6 border border-dark-200"
                value={emailOtpCode}
                onChangeText={handleChangeEmailOtpCode}
                placeholder="Code from email"
                placeholderTextColor="#9CA4AB"
                keyboardType="number-pad"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!saving}
                textContentType="oneTimeCode"
              />
              <TouchableOpacity
                className="bg-accent py-3 rounded-xl items-center mb-3"
                onPress={() => void handlePressVerifyEmailOtp()}
                disabled={!!saving}
              >
                <Text className="text-white font-semibold">
                  {saving === "emailOtp" ? "Verifying…" : "Verify email"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-dark-200 py-3 rounded-xl items-center mb-3"
                onPress={() => void handlePressResendEmailOtp()}
                disabled={!!saving}
              >
                <Text className="text-white font-semibold">
                  {saving === "emailOtp" ? "Please wait…" : "Resend code"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="py-2 rounded-xl items-center"
                onPress={handlePressCancelEmailOtp}
                disabled={!!saving}
              >
                <Text className="text-light-300 text-sm">Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <Text className="text-lg text-white font-bold mb-3">Password</Text>
          <Text className="text-light-200 text-sm mb-1">Current password</Text>
          <TextInput
            className="bg-dark-100 text-white rounded-xl px-4 py-3 mb-3 border border-dark-200"
            value={oldPassword}
            onChangeText={handleChangeOldPassword}
            placeholder="Current password"
            placeholderTextColor="#9CA4AB"
            secureTextEntry
            editable={saving === null}
            autoComplete="password"
          />
          <Text className="text-light-200 text-sm mb-1">New password</Text>
          <TextInput
            className="bg-dark-100 text-white rounded-xl px-4 py-3 mb-3 border border-dark-200"
            value={newPassword}
            onChangeText={handleChangeNewPassword}
            placeholder={`At least ${MIN_PASSWORD_LEN} characters`}
            placeholderTextColor="#9CA4AB"
            secureTextEntry
            editable={saving === null}
            autoComplete="new-password"
          />
          <Text className="text-light-200 text-sm mb-1">Confirm new password</Text>
          <TextInput
            className="bg-dark-100 text-white rounded-xl px-4 py-3 mb-3 border border-dark-200"
            value={confirmPassword}
            onChangeText={handleChangeConfirmPassword}
            placeholder="Repeat new password"
            placeholderTextColor="#9CA4AB"
            secureTextEntry
            editable={saving === null}
            autoComplete="new-password"
          />
          <TouchableOpacity
            className="bg-accent py-3 rounded-xl items-center"
            onPress={() => void handlePressUpdatePassword()}
            disabled={saving !== null}
          >
            <Text className="text-white font-semibold">
              {saving === "password" ? "Updating…" : "Update password"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default AccountSettings;
