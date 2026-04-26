import React from "react";
import { render, fireEvent, act } from "@testing-library/react-native";

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    canGoBack: jest.fn(() => true),
  },
  usePathname: jest.fn(() => "/login"),
}));

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: jest.fn(() => ({
    signIn: jest.fn(),
    signUp: jest.fn(),
    signInError: null,
    user: null,
    isLoading: false,
    token: null,
  })),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: jest.fn(() => ({ top: 0, bottom: 0, left: 0, right: 0 })),
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("@expo/vector-icons", () => ({
  Feather: () => null,
}));

jest.mock("@/constants/colors", () => ({
  __esModule: true,
  default: {
    light: {
      primary: "#6366f1",
      primaryForeground: "#ffffff",
      background: "#f9fafb",
      foreground: "#111827",
      mutedForeground: "#6b7280",
      border: "#e5e7eb",
      emerald: "#10b981",
      amber: "#f59e0b",
    },
    dark: {
      primary: "#6366f1",
      primaryForeground: "#ffffff",
      background: "#111827",
      foreground: "#f9fafb",
      mutedForeground: "#9ca3af",
      border: "#374151",
      emerald: "#10b981",
      amber: "#f59e0b",
    },
  },
}));

import { router } from "expo-router";
import LoginScreen from "../app/login";
import SignUpScreen from "../app/signup";

beforeEach(() => {
  jest.clearAllMocks();
  (router.canGoBack as jest.Mock).mockReturnValue(true);
});

describe("Login screen — Create account button", () => {
  it("navigates to /signup when tapped, without calling signIn", () => {
    const { useAuth } = require("@/contexts/AuthContext");
    const signIn = jest.fn();
    useAuth.mockReturnValue({ signIn, signUp: jest.fn(), signInError: null });

    const { getByTestId } = render(<LoginScreen />);

    fireEvent.press(getByTestId("sign-up-button"));

    expect(router.push).toHaveBeenCalledWith("/signup");
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(signIn).not.toHaveBeenCalled();
  });

  it("does not navigate to /signup when sign-in button is tapped", async () => {
    const { useAuth } = require("@/contexts/AuthContext");
    const signIn = jest.fn().mockResolvedValue(undefined);
    useAuth.mockReturnValue({ signIn, signUp: jest.fn(), signInError: null });

    const { getByTestId } = render(<LoginScreen />);

    await act(async () => {
      fireEvent.press(getByTestId("sign-in-button"));
    });

    expect(router.push).not.toHaveBeenCalled();
  });
});

describe("Signup screen — rendering", () => {
  it("renders the back button", () => {
    const { useAuth } = require("@/contexts/AuthContext");
    useAuth.mockReturnValue({ signIn: jest.fn(), signUp: jest.fn(), signInError: null });

    const { getByTestId } = render(<SignUpScreen />);

    expect(getByTestId("signup-back-button")).toBeTruthy();
  });

  it("renders the carousel with all four feature slides", () => {
    const { useAuth } = require("@/contexts/AuthContext");
    useAuth.mockReturnValue({ signIn: jest.fn(), signUp: jest.fn(), signInError: null });

    const { getByTestId, getByText } = render(<SignUpScreen />);

    expect(getByTestId("signup-carousel")).toBeTruthy();
    expect(getByText("All your inboxes, one place")).toBeTruthy();
    expect(getByText("Unified search")).toBeTruthy();
    expect(getByText("AI-powered replies")).toBeTruthy();
    expect(getByText("Free from day one")).toBeTruthy();
  });

  it("renders the Next CTA on the first slide", () => {
    const { useAuth } = require("@/contexts/AuthContext");
    useAuth.mockReturnValue({ signIn: jest.fn(), signUp: jest.fn(), signInError: null });

    const { getByTestId } = render(<SignUpScreen />);

    expect(getByTestId("signup-next-button")).toBeTruthy();
  });

  it("renders all four dot indicators", () => {
    const { useAuth } = require("@/contexts/AuthContext");
    useAuth.mockReturnValue({ signIn: jest.fn(), signUp: jest.fn(), signInError: null });

    const { getByTestId } = render(<SignUpScreen />);

    expect(getByTestId("signup-dot-0")).toBeTruthy();
    expect(getByTestId("signup-dot-1")).toBeTruthy();
    expect(getByTestId("signup-dot-2")).toBeTruthy();
    expect(getByTestId("signup-dot-3")).toBeTruthy();
  });

  it("renders the Create account CTA on the final slide", () => {
    const { useAuth } = require("@/contexts/AuthContext");
    useAuth.mockReturnValue({ signIn: jest.fn(), signUp: jest.fn(), signInError: null });

    const { getByTestId } = render(<SignUpScreen />);

    fireEvent.press(getByTestId("signup-dot-3"));

    expect(getByTestId("signup-continue-button")).toBeTruthy();
  });
});

describe("Signup screen — back navigation", () => {
  it("calls router.back() when the back button is tapped and history exists", () => {
    const { useAuth } = require("@/contexts/AuthContext");
    useAuth.mockReturnValue({ signIn: jest.fn(), signUp: jest.fn(), signInError: null });
    (router.canGoBack as jest.Mock).mockReturnValue(true);

    const { getByTestId } = render(<SignUpScreen />);

    fireEvent.press(getByTestId("signup-back-button"));

    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("calls router.replace('/login') when tapped with no history", () => {
    const { useAuth } = require("@/contexts/AuthContext");
    useAuth.mockReturnValue({ signIn: jest.fn(), signUp: jest.fn(), signInError: null });
    (router.canGoBack as jest.Mock).mockReturnValue(false);

    const { getByTestId } = render(<SignUpScreen />);

    fireEvent.press(getByTestId("signup-back-button"));

    expect(router.replace).toHaveBeenCalledWith("/login");
    expect(router.back).not.toHaveBeenCalled();
  });
});
