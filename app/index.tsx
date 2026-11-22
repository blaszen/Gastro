import { useEffect } from "react";
import { useUserStore } from "../store/userStore";
import { router } from "expo-router";
import { useThemeMode } from "../lib/theme";

export default function Index() {
  useThemeMode();
  const user = useUserStore((s) => s.user);

  useEffect(() => {
    if (user) router.replace("/(tabs)");
    else router.replace("/auth/login");
  }, [user]);

  return null;
}

