import { createRoot, hydrateRoot } from "react-dom/client";
import { hydrate } from "@tanstack/react-query";
import { App, createQueryClient } from "./App";
import "./index.css";

const queryClient = createQueryClient();

const dehydratedState = (
  window as unknown as { __BLOG_STATE__?: unknown }
).__BLOG_STATE__;

if (dehydratedState) {
  hydrate(queryClient, dehydratedState);
}

const rootEl = document.getElementById("root")!;
const app = <App queryClient={queryClient} />;

if (rootEl.hasChildNodes()) {
  hydrateRoot(rootEl, app);
} else {
  createRoot(rootEl).render(app);
}
