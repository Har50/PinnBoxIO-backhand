import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Redirect, Stack, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ActivityIndicator, Platform, Text, View } from "react-native";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";

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
      return typeof localStorage !== "undefined" ? localStorage.getItem("commshub_session_token") : null;
    }
    const SecureStore = await import("expo-secure-store");
    return await SecureStore.getItemAsync("commshub_session_token");
  } catch {
    return null;
  }
});

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        console.warn("[QueryClient] Query failed:", error);
        return failureCount < 2;
      },
    },
    mutations: {
      onError: (error) => {
        console.warn("[QueryClient] Mutation failed:", error);
      },
    },
  },
});

const ALLOWED_UNAUTHED_PATHS = ["/login", "/signup", "/callback"];

function AuthedStack() {
  return (
    <ErrorBoundary label="TabsErrorBoundary">
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </ErrorBoundary>
  );
}

function RootLayoutNav() {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user) {
    const isAllowed = ALLOWED_UNAUTHED_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
    return (
      <>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="login" />
          <Stack.Screen name="signup" />
          <Stack.Screen name="callback" />
        </Stack>
        {!isAllowed && <Redirect href="/login" />}
      </>
    );
  }

  return <AuthedStack />;
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
      <ErrorBoundary label="RootErrorBoundary">
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ThemeProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <KeyboardProvider>
                  <RootLayoutNav />
                </KeyboardProvider>
              </GestureHandlerRootView>
            </ThemeProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
