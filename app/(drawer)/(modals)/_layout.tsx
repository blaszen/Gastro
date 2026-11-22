import { Stack } from "expo-router";
import { useThemeMode } from "../../../lib/theme";

export default function ModalLayout() {
  useThemeMode();
  return (
    <Stack
      screenOptions={{
        presentation: "modal",
        headerShown: false,
      }}
    />
  );
}
