import { renderToString } from "react-dom/server";
import { dehydrate, type QueryClient } from "@tanstack/react-query";
import { App, createQueryClient } from "./App";

export interface RenderResult {
  html: string;
  headTags: string;
  state: string;
}

type SeedFn = (queryClient: QueryClient) => void;

function serializeState(state: unknown): string {
  return JSON.stringify(state).replace(/</g, "\\u003c");
}

export function render(fullPath: string, seed?: SeedFn): RenderResult {
  const queryClient = createQueryClient();
  if (seed) {
    seed(queryClient);
  }

  const helmetContext: { helmet?: Record<string, { toString(): string }> } = {};

  const html = renderToString(
    <App queryClient={queryClient} helmetContext={helmetContext} ssrPath={fullPath} />,
  );

  const helmet = helmetContext.helmet;
  const headTags = [
    helmet?.title?.toString(),
    helmet?.meta?.toString(),
    helmet?.link?.toString(),
    helmet?.script?.toString(),
  ]
    .filter(Boolean)
    .join("\n    ");

  const dehydrated = dehydrate(queryClient);
  const state = `<script>window.__BLOG_STATE__=${serializeState(dehydrated)}</script>`;

  return { html, headTags, state };
}
