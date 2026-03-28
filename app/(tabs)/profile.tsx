import { icons } from "@/constants/icons";
import { images } from "@/constants/images";
import { useAuth } from "@/store/AuthContext";
import { useSavedMovies } from "@/store/SavedMoviesContext";
import { type Href, useRouter } from "expo-router";
import { useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { Models } from "react-native-appwrite";

function getDisplayLabel(user: Models.User): string {
  const name = user.name?.trim();
  if (name) {
    return name;
  }
  const emailLocal = user.email?.split("@")[0];
  return emailLocal || "User";
}

function getInitials(user: Models.User): string {
  const label = getDisplayLabel(user);
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (
    parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
  ).toUpperCase();
}

const Profile = () => {
  const router = useRouter();
  const { user, isReady, signOut } = useAuth();
  const { savedMovies } = useSavedMovies();

  const handlePressAccountSettings = useCallback(() => {
    router.push("/account-settings" as Href);
  }, [router]);

  const handlePressSavedMovies = useCallback(() => {
    router.push("/saved");
  }, [router]);

  const handlePressLogin = useCallback(() => {
    router.push("/login");
  }, [router]);

  const handlePressRegister = useCallback(() => {
    router.push("/register");
  }, [router]);

  const handlePressLogout = useCallback(() => {
    Alert.alert(
      "Log out",
      "Sign out of your Appwrite account on this device? Saved movies stay on the device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log out",
          style: "destructive",
          onPress: () => {
            void signOut();
          },
        },
      ]
    );
  }, [signOut]);

  if (!isReady) {
    return (
      <View className="flex-1 bg-primary justify-center items-center">
        <Image
          source={images.bg}
          className="absolute w-full h-full z-0"
          resizeMode="cover"
        />
        <ActivityIndicator size="large" color="#AB8BFF" />
      </View>
    );
  }

  if (!user) {
    return (
      <View className="flex-1 bg-primary">
        <Image
          source={images.bg}
          className="absolute w-full h-full z-0"
          resizeMode="cover"
        />
        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingBottom: 120, paddingTop: 80 }}
        >
          <View className="w-full flex-row items-center mb-10">
            <Image source={icons.logo} className="w-12 h-10 mr-4" />
            <Text className="text-3xl font-bold text-white">Profile</Text>
          </View>

          <Text className="text-white text-2xl font-bold mb-2">Welcome</Text>
          <Text className="text-light-200 text-base mb-10 leading-6">
            Create an account or sign in with Appwrite email/password. Your
            session is stored on this device.
          </Text>

          <TouchableOpacity
            className="bg-accent py-3.5 rounded-xl items-center mb-4"
            onPress={handlePressLogin}
            accessibilityRole="button"
            accessibilityLabel="Sign in"
          >
            <Text className="text-white font-bold text-base">Sign in</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-dark-100 border border-dark-200 py-3.5 rounded-xl items-center"
            onPress={handlePressRegister}
            accessibilityRole="button"
            accessibilityLabel="Create account"
          >
            <Text className="text-white font-bold text-base">Create account</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-primary">
      <Image
        source={images.bg}
        className="absolute w-full h-full z-0"
        resizeMode="cover"
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="w-full flex-row mt-20 items-center px-5 mb-8">
          <Image source={icons.logo} className="w-12 h-10 mr-4" />
          <Text className="text-3xl font-bold text-white">Profile</Text>
        </View>

        <View className="items-center justify-center mb-10">
          <View className="w-28 h-28 rounded-full border-4 border-accent bg-dark-100 items-center justify-center mb-4">
            <Text className="text-accent text-3xl font-bold">
              {getInitials(user)}
            </Text>
          </View>
          <Text className="text-white text-2xl font-bold">
            {getDisplayLabel(user)}
          </Text>
          <Text className="text-light-200 text-sm mt-1 text-center px-8">
            {user.email}
          </Text>
        </View>

        <View className="px-5">
          <Text className="text-lg text-white font-bold mb-4">Settings</Text>

          <TouchableOpacity
            className="flex-row items-center justify-between bg-dark-100 p-4 rounded-xl mb-3"
            onPress={handlePressAccountSettings}
            accessibilityRole="button"
            accessibilityLabel="Account details"
          >
            <View className="flex-row items-center flex-1 mr-3">
              <Image
                source={icons.person}
                className="size-6 mr-3"
                tintColor="#fff"
              />
              <View className="flex-1">
                <Text className="text-white text-base">Account details</Text>
                <Text className="text-light-300 text-xs mt-1">
                  Name, email, password, and security
                </Text>
              </View>
            </View>
            <Image
              source={icons.arrow}
              className="size-5"
              tintColor="#9CA3AF"
            />
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center justify-between bg-dark-100 p-4 rounded-xl mb-3"
            onPress={handlePressSavedMovies}
            accessibilityRole="button"
            accessibilityLabel="Saved movies"
          >
            <View className="flex-row items-center flex-1 mr-3">
              <Image
                source={icons.save}
                className="size-6 mr-3"
                tintColor="#fff"
              />
              <View className="flex-1">
                <Text className="text-white text-base">Saved movies</Text>
                <Text className="text-light-300 text-xs mt-1">
                  {savedMovies.length} saved
                </Text>
              </View>
            </View>
            <Image
              source={icons.arrow}
              className="size-5"
              tintColor="#9CA3AF"
            />
          </TouchableOpacity>
        </View>

        <View className="px-5 mt-8">
          <TouchableOpacity
            className="flex-row items-center justify-center bg-accent py-3.5 rounded-xl border border-accent"
            onPress={handlePressLogout}
            accessibilityRole="button"
            accessibilityLabel="Log out"
          >
            <Text className="text-white text-base font-bold">Log out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

export default Profile;
