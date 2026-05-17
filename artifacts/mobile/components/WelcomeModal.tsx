import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const STORAGE_KEY = "has_seen_welcome";

const PRO_BENEFITS = [
  "Unlimited AI requests (GPT-4o, Claude, Gemini)",
  "25 GB cloud storage",
  "Voice to Email",
  "All AI models — including latest releases",
];

interface WelcomeModalProps {
  onUpgrade: () => void;
}

export function WelcomeModal({ onUpgrade }: WelcomeModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (!val) setVisible(true);
    });
  }, []);

  function dismiss() {
    AsyncStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
  }

  function handleUpgrade() {
    dismiss();
    onUpgrade();
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={dismiss}
    >
      <View style={[s.container, { backgroundColor: colors.background, paddingBottom: insets.bottom + 20 }]}>
        {/* Header */}
        <View style={[s.header, { borderBottomColor: colors.border }]}>
          <View style={{ flex: 1 }} />
          <Text style={[s.headerTitle, { color: colors.foreground }]}>Welcome to PinnboxIO</Text>
          <Pressable style={s.closeBtn} onPress={dismiss} hitSlop={12}>
            <Feather name="x" size={20} color={colors.mutedForeground} />
          </Pressable>
        </View>

        {/* Body */}
        <View style={s.body}>
          {/* Icon + greeting */}
          <View style={[s.iconWrap, { backgroundColor: colors.primary + "18" }]}>
            <Feather name="zap" size={30} color={colors.primary} />
          </View>
          <Text style={[s.title, { color: colors.foreground }]}>You're all set! 👋</Text>
          <Text style={[s.subtitle, { color: colors.mutedForeground }]}>
            You're on the{" "}
            <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>Free plan</Text>
            {" "}— 20 AI requests/day and 1 GB storage included.
          </Text>

          {/* Pro benefits card */}
          <View style={[s.proCard, { backgroundColor: colors.primary + "0e", borderColor: colors.primary + "30" }]}>
            <View style={s.proCardHeader}>
              <Feather name="star" size={14} color={colors.primary} />
              <Text style={[s.proCardLabel, { color: colors.primary }]}>PRO UNLOCKS</Text>
            </View>
            <View style={s.benefitsList}>
              {PRO_BENEFITS.map((benefit) => (
                <View key={benefit} style={s.benefitRow}>
                  <Feather name="check" size={14} color={colors.primary} />
                  <Text style={[s.benefitText, { color: colors.foreground }]}>{benefit}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Footer buttons */}
        <View style={[s.footer, { paddingHorizontal: 24 }]}>
          <Pressable
            style={({ pressed }) => [
              s.upgradeBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={handleUpgrade}
          >
            <Feather name="star" size={16} color="#fff" />
            <Text style={s.upgradeBtnText}>Upgrade to Pro — $7.99/mo</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              s.freeBtn,
              { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
            onPress={dismiss}
          >
            <Text style={[s.freeBtnText, { color: colors.mutedForeground }]}>Start with Free</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    flex: 3,
    textAlign: "center",
  },
  closeBtn: { flex: 1, alignItems: "flex-end" },

  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    gap: 16,
  },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },

  proCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    gap: 14,
    marginTop: 4,
  },
  proCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  proCardLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
  },
  benefitsList: { gap: 10 },
  benefitRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  benefitText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 20,
  },

  footer: { gap: 10, paddingTop: 12 },
  upgradeBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  upgradeBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  freeBtn: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: "center",
  },
  freeBtnText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
});
