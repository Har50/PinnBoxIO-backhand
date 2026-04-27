import { useGetUserPreferences, useUpdateUserPreferences, getGetUserPreferencesQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useThemeMode } from "@/contexts/ThemeContext";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function SectionHeader({ title }: { title: string }) {
  const colors = useColors();
  return (
    <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>{title}</Text>
  );
}

function SettingsRow({
  icon,
  label,
  description,
  right,
  onPress,
  destructive,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  description?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  destructive?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      style={({ pressed }) => [styles.row, { backgroundColor: colors.card, opacity: pressed && onPress ? 0.7 : 1 }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.rowIcon, { backgroundColor: destructive ? colors.destructive + "18" : colors.muted }]}>
        <Feather name={icon} size={16} color={destructive ? colors.destructive : colors.mutedForeground} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, { color: destructive ? colors.destructive : colors.foreground }]}>{label}</Text>
        {description ? (
          <Text style={[styles.rowDescription, { color: colors.mutedForeground }]}>{description}</Text>
        ) : null}
      </View>
      {right ?? (onPress ? <Feather name="chevron-right" size={16} color={colors.mutedForeground} /> : null)}
    </Pressable>
  );
}

function SettingsCard({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={[styles.card, { borderColor: colors.border }]}>
      {children}
    </View>
  );
}

function NotificationToggle({
  prefKey,
  label,
  description,
  icon,
}: {
  prefKey: "emailSummary" | "importantMessages" | "weeklyDigest";
  label: string;
  description: string;
  icon: React.ComponentProps<typeof Feather>["name"];
}) {
  const queryClient = useQueryClient();
  const { data: prefs } = useGetUserPreferences();
  const { mutate: updatePrefs } = useUpdateUserPreferences();
  const colors = useColors();

  const value = prefs?.[prefKey] ?? false;

  const toggle = () => {
    const next = { ...prefs, [prefKey]: !value };
    queryClient.setQueryData(getGetUserPreferencesQueryKey(), next);
    updatePrefs(
      { data: { [prefKey]: !value } },
      {
        onSuccess: (updated) => {
          queryClient.setQueryData(getGetUserPreferencesQueryKey(), updated);
        },
        onError: () => {
          queryClient.invalidateQueries({ queryKey: getGetUserPreferencesQueryKey() });
        },
      },
    );
  };

  return (
    <SettingsRow
      icon={icon}
      label={label}
      description={description}
      right={
        <Switch
          value={value}
          onValueChange={toggle}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#fff"
          testID={`toggle-${prefKey}`}
        />
      }
    />
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const { mode, toggleMode } = useThemeMode();
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const initials = ((user?.firstName?.[0] ?? "") + (user?.lastName?.[0] ?? "")).toUpperCase();
  const displayName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.email ?? "My Workspace";

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad + 12, paddingBottom: 100, paddingHorizontal: 20, gap: 20 }}
      showsVerticalScrollIndicator={false}
      testID="settings-screen"
    >
      <Text style={[styles.screenTitle, { color: colors.foreground }]}>Settings</Text>

      <View style={styles.section}>
        <SectionHeader title="Profile" />
        <SettingsCard>
          <View style={[styles.profileRow, { backgroundColor: colors.card }]}>
            <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>{initials || "?"}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: colors.foreground }]} numberOfLines={1}>{displayName}</Text>
              {user?.email ? (
                <Text style={[styles.profileEmail, { color: colors.mutedForeground }]} numberOfLines={1}>{user.email}</Text>
              ) : null}
            </View>
          </View>
        </SettingsCard>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Appearance" />
        <SettingsCard>
          <SettingsRow
            icon={mode === "dark" ? "moon" : "sun"}
            label="Dark mode"
            description={mode === "dark" ? "On" : "Off"}
            onPress={toggleMode}
            right={
              <Switch
                value={mode === "dark"}
                onValueChange={toggleMode}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
                testID="toggle-dark-mode"
              />
            }
          />
        </SettingsCard>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Notifications" />
        <SettingsCard>
          <NotificationToggle
            prefKey="emailSummary"
            label="Email summary"
            description="Daily digest of your messages"
            icon="mail"
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <NotificationToggle
            prefKey="importantMessages"
            label="Important messages"
            description="Alerts for high-priority items"
            icon="bell"
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <NotificationToggle
            prefKey="weeklyDigest"
            label="Weekly digest"
            description="Weekly summary of activity"
            icon="calendar"
          />
        </SettingsCard>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Account" />
        <SettingsCard>
          <SettingsRow
            icon="log-out"
            label="Sign out"
            onPress={signOut}
            destructive
          />
        </SettingsCard>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  screenTitle: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  section: { gap: 8 },
  sectionHeader: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: { fontSize: 18, fontFamily: "Inter_700Bold" },
  profileInfo: { flex: 1, minWidth: 0 },
  profileName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  profileEmail: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rowContent: { flex: 1, minWidth: 0 },
  rowLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  rowDescription: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 60 },
});
