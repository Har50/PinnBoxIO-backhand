import React from "react";

jest.mock("react-native-svg", () => ({}));

import {
  InboxIllustration,
  SearchIllustration,
  AIIllustration,
  FreeIllustration,
} from "../components/OnboardingIllustrations";

const PRIMARY = "#6366f1";
const EMERALD = "#10b981";
const AMBER = "#f59e0b";

type AnyElement = React.ReactElement<Record<string, unknown>>;

type VisualProps = {
  fill?: string;
  stroke?: string;
  opacity?: number | string;
  strokeWidth?: number | string;
};

function extractVisualProps(node: unknown): VisualProps[] {
  /*
   * Why direct function invocation instead of react-test-renderer?
   *
   * The jest-expo preset mocks both react-native-svg and React Native's
   * host components (View, etc.) as no-ops, so renderer.create().toJSON()
   * always returns null for these SVG illustration components.
   *
   * Instead we call each illustration component directly (they are pure,
   * hook-free functions) to obtain the JSX element tree, then recursively
   * walk it to collect every fill/stroke/opacity/strokeWidth prop.
   * Snapshotting this prop list locks in all dark-mode tint/opacity values
   * and will fail with a clear diff if any color expression changes.
   *
   * If an illustration ever adopts hooks or context, switch to a solution
   * that wraps the render in the appropriate providers before extracting.
   */
  if (!node || typeof node !== "object") return [];
  const el = node as AnyElement;
  const result: VisualProps[] = [];
  const { fill, stroke, opacity, strokeWidth } = (el.props ?? {}) as VisualProps;
  if (fill !== undefined || stroke !== undefined || opacity !== undefined) {
    result.push({ fill, stroke, opacity, strokeWidth });
  }
  const children = el.props?.children;
  if (children) {
    const childArr = Array.isArray(children) ? children : [children];
    for (const child of childArr) {
      result.push(...extractVisualProps(child));
    }
  }
  return result;
}

describe("OnboardingIllustrations visual props snapshots", () => {
  describe("InboxIllustration", () => {
    it("light mode visual props match snapshot", () => {
      const tree = InboxIllustration({ primary: PRIMARY, dark: false });
      expect(extractVisualProps(tree)).toMatchSnapshot();
    });

    it("dark mode visual props match snapshot", () => {
      const tree = InboxIllustration({ primary: PRIMARY, dark: true });
      expect(extractVisualProps(tree)).toMatchSnapshot();
    });
  });

  describe("SearchIllustration", () => {
    it("light mode visual props match snapshot", () => {
      const tree = SearchIllustration({ emerald: EMERALD, dark: false });
      expect(extractVisualProps(tree)).toMatchSnapshot();
    });

    it("dark mode visual props match snapshot", () => {
      const tree = SearchIllustration({ emerald: EMERALD, dark: true });
      expect(extractVisualProps(tree)).toMatchSnapshot();
    });
  });

  describe("AIIllustration", () => {
    it("light mode visual props match snapshot", () => {
      const tree = AIIllustration({ amber: AMBER, dark: false });
      expect(extractVisualProps(tree)).toMatchSnapshot();
    });

    it("dark mode visual props match snapshot", () => {
      const tree = AIIllustration({ amber: AMBER, dark: true });
      expect(extractVisualProps(tree)).toMatchSnapshot();
    });
  });

  describe("FreeIllustration", () => {
    it("light mode visual props match snapshot", () => {
      const tree = FreeIllustration({ primary: PRIMARY, dark: false });
      expect(extractVisualProps(tree)).toMatchSnapshot();
    });

    it("dark mode visual props match snapshot", () => {
      const tree = FreeIllustration({ primary: PRIMARY, dark: true });
      expect(extractVisualProps(tree)).toMatchSnapshot();
    });
  });
});
