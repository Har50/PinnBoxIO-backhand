import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useThemeMode } from "@/contexts/ThemeContext";

function TabIcon({
  name,
  color,
}: {
  name: React.ComponentProps<typeof Feather>["name"];
  color: string;
}) {
  return <Feather name={name} size={22} color={color} />;
}

function ClassicTabLayout() {
  const colors = useColors();
  const { mode } = useThemeMode();
  const isDark = mode === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.background,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.background },
              ]}
            />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: "Inbox",
          tabBarIcon: ({ color }) => <TabIcon name="inbox" color={color} />,
        }}
      />
      <Tabs.Screen
        name="storage"
        options={{
          title: "Storage",
          tabBarIcon: ({ color }) => <TabIcon name="hard-drive" color={color} />,
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: "AI",
          tabBarIcon: ({ color }) => <TabIcon name="zap" color={color} />,
        }}
      />
      <Tabs.Screen name="contacts" options={{ href: null }} />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color }) => <TabIcon name="search" color={color} />,
        }}
      />
      <Tabs.Screen
        name="accounts"
        options={{
          title: "Accounts",
          tabBarIcon: ({ color }) => <TabIcon name="layers" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => <TabIcon name="sliders" color={color} />,
        }}
      />
    </Tabs>
  );
}

function ThemeToggleOverlay() {
  const colors = useColors();
  const { mode, toggleMode } = useThemeMode();
  const insets = useSafeAreaInsets();
  const top = Platform.OS === "web" ? 78 : insets.top + 12;

  return (
    <Pressable
      onPress={toggleMode}
      style={[
        styles.themeToggle,
        {
          top,
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={mode === "dark" ? "Switch to day mode" : "Switch to dark mode"}
    >
      <Feather name={mode === "dark" ? "sun" : "moon"} size={16} color={colors.foreground} />
    </Pressable>
  );
}

export default function TabLayout() {
  return (
    <View style={{ flex: 1 }}>
      <ClassicTabLayout />
      <ThemeToggleOverlay />
    </View>
  );
}

const styles = StyleSheet.create({
  themeToggle: {
    position: "absolute",
    right: 16,
    zIndex: 100,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
});
