import { useQuery } from "@tanstack/react-query";

async function apiFetch(path: string) {
  const res = await fetch(`/api${path}`, { credentials: "include" });
  if (!res.ok) throw new Error("Request failed");
  return res.json();
}

export function useGetStripeSubscription() {
  return useQuery({
    queryKey: ["stripe", "subscription"],
    queryFn: () => apiFetch("/stripe/subscription"),
    staleTime: 60 * 1000,
  });
}

export function useGetStripeProducts() {
  return useQuery({
    queryKey: ["stripe", "products"],
    queryFn: () => apiFetch("/stripe/products"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useGetStripeConfig() {
  return useQuery({
    queryKey: ["stripe", "config"],
    queryFn: () => apiFetch("/stripe/config"),
    staleTime: 60 * 60 * 1000,
  });
}
