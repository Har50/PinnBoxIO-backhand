import { useEffect } from "react";
import { useLocation } from "wouter";

const basePath = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");

export default function Login() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation(`${basePath}/sign-in`, { replace: true });
  }, [setLocation]);
  return null;
}
