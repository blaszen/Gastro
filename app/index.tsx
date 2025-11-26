import { useEffect } from "react";
import { useUserStore } from "../store/userStore";
import { router } from "expo-router";

export default function Index() {
  const user = useUserStore((s) => s.user);

  useEffect(() => {
    if (user) router.replace("/(tabs)");
    else router.replace("/auth/login");
  }, [user]);

  return null;
}

