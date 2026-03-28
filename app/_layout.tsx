import { AuthProvider } from "@/store/AuthContext";
import { SavedMoviesProvider } from "@/store/SavedMoviesContext";
import { Stack } from "expo-router";
import { StatusBar } from "react-native";
import "./globals.css";

export default function RootLayout() {
  return (
    <AuthProvider>
      <SavedMoviesProvider>
        <StatusBar hidden={true} />

        <Stack>
          <Stack.Screen
            name="(tabs)"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="login"
            options={{ headerShown: false, animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="register"
            options={{ headerShown: false, animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="account-settings"
            options={{ headerShown: false, animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="forgot-password"
            options={{ headerShown: false, animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="reset-password"
            options={{ headerShown: false, animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="movies/[id]"
            options={{ headerShown: false }}
          />
        </Stack>
      </SavedMoviesProvider>
    </AuthProvider>
  );
}
