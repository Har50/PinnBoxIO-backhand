import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useThemeMode } from "@/contexts/ThemeContext";

const WA_GREEN = "#25D366";
const LI_BLUE = "#0A66C2";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Dashboard</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="inbox">
        <Icon sf={{ default: "tray", selected: "tray.fill" }} />
        <Label>Inbox</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="whatsapp">
        <Icon sf={{ default: "bubble.left.and.bubble.right", selected: "bubble.left.and.bubble.right.fill" }} />
        <Label>WhatsApp</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="linkedin">
        <Icon sf={{ default: "person.crop.square", selected: "person.crop.square.fill" }} />
        <Label>LinkedIn</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="storage">
        <Icon sf={{ default: "externaldrive", selected: "externaldrive.fill" }} />
        <Label>Storage</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="ai">
        <Icon sf={{ default: "sparkles", selected: "sparkles" }} />
        <Label>AI</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="search">
        <Icon sf={{ default: "magnifyingglass", selected: "magnifyingglass" }} />
        <Label>Search</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="accounts">
        <Icon sf={{ default: "gearshape", selected: "gearshape.fill" }} />
        <Label>Accounts</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Icon sf={{ default: "slider.horizontal.3", selected: "slider.horizontal.3" }} />
        <Label>Settings</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
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
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="house" tintColor={color} size={22} />
            ) : (
              <Feather name="home" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: "Inbox",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="tray" tintColor={color} size={22} />
            ) : (
              <Feather name="inbox" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="whatsapp"
        options={{
          title: "WhatsApp",
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView
                name="bubble.left.and.bubble.right.fill"
                tintColor={focused ? WA_GREEN : color}
                size={22}
              />
            ) : (
              <Feather name="message-circle" size={22} color={focused ? WA_GREEN : color} />
            ),
          tabBarActiveTintColor: WA_GREEN,
        }}
      />
      <Tabs.Screen
        name="storage"
        options={{
          title: "Storage",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="externaldrive.fill" tintColor={color} size={22} />
            ) : (
              <Feather name="hard-drive" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="linkedin"
        options={{
          title: "LinkedIn",
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView
                name="person.crop.square.fill"
                tintColor={focused ? LI_BLUE : color}
                size={22}
              />
            ) : (
              <View style={{
                width: 22, height: 22, borderRadius: 4,
                backgroundColor: focused ? LI_BLUE : "transparent",
                alignItems: "center", justifyContent: "center",
                borderWidth: focused ? 0 : 1.5,
                borderColor: color,
              }}>
                <Text style={{
                  color: focused ? "#fff" : color,
                  fontSize: 12, fontFamily: "Inter_700Bold", lineHeight: 14,
                }}>in</Text>
              </View>
            ),
          tabBarActiveTintColor: LI_BLUE,
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: "AI",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="sparkles" tintColor={color} size={22} />
            ) : (
              <Feather name="zap" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen name="contacts" options={{ href: null }} />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="magnifyingglass" tintColor={color} size={22} />
            ) : (
              <Feather name="search" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="accounts"
        options={{
          title: "Accounts",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="gearshape" tintColor={color} size={22} />
            ) : (
              <Feather name="settings" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="slider.horizontal.3" tintColor={color} size={22} />
            ) : (
              <Feather name="sliders" size={22} color={color} />
            ),
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
      {isLiquidGlassAvailable() ? <NativeTabLayout /> : <ClassicTabLayout />}
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
