import { useAuth } from "@/contexts/AuthContext";
import { APP_NAME } from "@workspace/brand";
import colors from "@/constants/colors";
import { Feather } from "@expo/vector-icons";
import {
  InboxIllustration,
  SearchIllustration,
  AIIllustration,
  FreeIllustration,
} from "@/components/OnboardingIllustrations";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRef, useState } from "react";

const c = colors.light;

const SLIDES = [
  {
    illustration: <InboxIllustration primary={c.primary} />,
    title: "All your inboxes, one place",
    description:
      "Connect Gmail, Outlook, WhatsApp, LinkedIn and more — read and reply from a single unified feed.",
  },
  {
    illustration: <SearchIllustration emerald={c.emerald} />,
    title: "Unified search",
    description:
      "Find any message across every connected channel in seconds, no matter where it was sent.",
  },
  {
    illustration: <AIIllustration amber={c.amber} />,
    title: "AI-powered replies",
    description:
      "Let the built-in AI draft replies and summarise long threads so you can focus on what matters.",
  },
  {
    illustration: <FreeIllustration primary={c.primary} />,
    title: "Free from day one",
    description:
      "Every feature unlocked the moment you sign up — no credit card, no hidden fees.",
  },
];

const TOTAL = SLIDES.length;

export default function SignUpScreen() {
  const { signUp, signInError } = useAuth();
  const insets = useSafeAreaInsets();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const isFinal = activeIndex === TOTAL - 1;

  async function handleContinue() {
    setIsLoading(true);
    try {
      await signUp();
    } finally {
      setIsLoading(false);
    }
  }

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/login");
    }
  }

  function goToSlide(index: number) {
    scrollRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
    setActiveIndex(index);
  }

  function handleNext() {
    if (activeIndex < TOTAL - 1) {
      goToSlide(activeIndex + 1);
    }
  }

  function handleScroll(event: { nativeEvent: { contentOffset: { x: number } } }) {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (index !== activeIndex && index >= 0 && index < TOTAL) {
      setActiveIndex(index);
    }
  }

  return (
    <View style={[styles.container, { paddingTop: topPad, paddingBottom: bottomPad + 16 }]}>
      <View style={[styles.header, { paddingTop: 8 }]}>
        <Pressable onPress={handleBack} style={styles.backButton} testID="signup-back-button">
          <Feather name="arrow-left" size={20} color={c.foreground} />
        </Pressable>
        <Text style={styles.headerTitle}>Create account</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.heroSection}>
        <View style={styles.logoBox}>
          <Text style={styles.logoText}>PB</Text>
        </View>
        <Text style={styles.heroTitle}>Welcome to {APP_NAME}</Text>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.carousel}
        contentContainerStyle={styles.carouselContent}
        testID="signup-carousel"
      >
        {SLIDES.map((slide, i) => (
          <View key={i} style={[styles.slide, { width: SCREEN_WIDTH }]}>
            <View style={styles.slideIllustrationBox}>
              {slide.illustration}
            </View>
            <Text style={styles.slideTitle}>{slide.title}</Text>
            <Text style={styles.slideDescription}>{slide.description}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <Pressable
            key={i}
            onPress={() => goToSlide(i)}
            style={[styles.dot, i === activeIndex && styles.dotActive]}
            testID={`signup-dot-${i}`}
            accessibilityLabel={`Go to slide ${i + 1}`}
          />
        ))}
      </View>

      <View style={styles.footer}>
        {signInError ? (
          <View style={styles.errorBanner}>
            <Feather name="alert-circle" size={14} color="#dc2626" style={{ marginTop: 2 }} />
            <Text style={styles.errorText}>{signInError}</Text>
          </View>
        ) : null}

        {isFinal ? (
          <Pressable
            style={[styles.continueButton, isLoading && styles.continueButtonDisabled]}
            onPress={handleContinue}
            disabled={isLoading}
            testID="signup-continue-button"
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <Feather name="user-plus" size={18} color="#ffffff" />
                <Text style={styles.continueButtonText}>Create my free account</Text>
              </>
            )}
          </Pressable>
        ) : (
          <Pressable
            style={styles.nextButton}
            onPress={handleNext}
            testID="signup-next-button"
          >
            <Text style={styles.nextButtonText}>Next</Text>
            <Feather name="arrow-right" size={16} color={c.primary} />
          </Pressable>
        )}

        <Text style={styles.footerNote}>
          By continuing you agree to our{" "}
          <Text style={styles.footerLink}>Terms</Text> and{" "}
          <Text style={styles.footerLink}>Privacy Policy</Text>.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: c.foreground,
    letterSpacing: -0.2,
  },
  heroSection: {
    alignItems: "center",
    gap: 10,
    paddingTop: 12,
    paddingBottom: 8,
  },
  logoBox: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: c.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: c.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  logoText: {
    color: c.primaryForeground,
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  heroTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: c.foreground,
    letterSpacing: -0.4,
    textAlign: "center",
  },
  carousel: {
    flex: 1,
  },
  carouselContent: {
    alignItems: "center",
  },
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
    gap: 16,
  },
  slideIllustrationBox: {
    width: 140,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  slideTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: c.foreground,
    letterSpacing: -0.4,
    textAlign: "center",
  },
  slideDescription: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: c.mutedForeground,
    textAlign: "center",
    lineHeight: 22,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: c.border,
  },
  dotActive: {
    width: 22,
    backgroundColor: c.primary,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  continueButton: {
    backgroundColor: c.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  continueButtonDisabled: {
    opacity: 0.6,
  },
  continueButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.1,
  },
  nextButton: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    borderWidth: 1.5,
    borderColor: c.primary,
  },
  nextButtonText: {
    color: c.primary,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.1,
  },
  footerNote: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: c.mutedForeground,
    textAlign: "center",
    lineHeight: 17,
  },
  footerLink: {
    color: c.primary,
    fontFamily: "Inter_500Medium",
  },
  errorBanner: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#dc2626",
    flex: 1,
    lineHeight: 18,
  },
});
