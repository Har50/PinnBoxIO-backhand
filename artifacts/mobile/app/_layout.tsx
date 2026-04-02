import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Redirect, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ActivityIndicator, Platform, Text, View } from "react-native";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";
import * as SecureStore from "expo-secure-store";

const REQUIRED_ENV: Record<string, string | undefined> = {
  EXPO_PUBLIC_DOMAIN: process.env.EXPO_PUBLIC_DOMAIN,
  EXPO_PUBLIC_REPL_ID: process.env.EXPO_PUBLIC_REPL_ID,
};
const MISSING_ENV = Object.entries(REQUIRED_ENV)
  .filter(([, v]) => !v)
  .map(([k]) => k);

setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`);

setAuthTokenGetter(async () => {
  try {
    if (Platform.OS === "web") {
      return localStorage.getItem("commshub_session_token");
    }
    return await SecureStore.getItemAsync("commshub_session_token");
  } catch {
    return null;
  }
});

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user) {
    return (
      <>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="login" />
        </Stack>
        <Redirect href="/login" />
      </>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  if (MISSING_ENV.length > 0) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, backgroundColor: "#fff" }}>
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#dc2626", marginBottom: 12 }}>
          Configuration Error
        </Text>
        <Text style={{ fontSize: 14, color: "#374151", textAlign: "center", lineHeight: 22 }}>
          {"The following required environment variables are not set:\n\n" + MISSING_ENV.join("\n")}
        </Text>
        <Text style={{ fontSize: 12, color: "#9ca3af", marginTop: 16, textAlign: "center" }}>
          Set these variables in your project secrets and restart the app.
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <AuthProvider>
                <RootLayoutNav />
              </AuthProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
