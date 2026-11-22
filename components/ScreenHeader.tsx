import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

type Props = {
  title: string;
  subtitle?: string;
  /** "back" shows a chevron, "close" shows an X. Both navigate back. */
  variant?: "back" | "close";
  onBack?: () => void;
};

/**
 * Shared header for drawer screens:
 * back/close control on the left, title (and optional subtitle) on the right.
 */
export default function ScreenHeader({ title, subtitle, variant = "back", onBack }: Props) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) return onBack();
    if (router.canGoBack()) router.back();
    else router.replace("/(drawer)/(tabs)" as any);
  };

  return (
    <View style={styles.header}>
      <Pressable
        onPress={handleBack}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={variant === "close" ? "Close" : "Go back"}
        style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
      >
        <Ionicons
          name={variant === "close" ? "close" : "chevron-back"}
          size={20}
          color="#f4f4f5"
        />
      </Pressable>

      <View style={styles.titleBlock}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
          <Text style={styles.dot}>.</Text>
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1c1f26",
    borderWidth: 1,
    borderColor: "#27272a",
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.7,
  },
  titleBlock: {
    flex: 1,
    alignItems: "flex-end",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#f4f4f5",
    letterSpacing: -0.5,
    textAlign: "right",
  },
  dot: {
    color: "#f59e0b",
  },
  subtitle: {
    fontSize: 13,
    color: "#a1a1aa",
    marginTop: 2,
    textAlign: "right",
  },
});
