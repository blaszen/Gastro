import React from "react";
import { Image, Pressable, Text, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { auth } from "../lib/firebase";
import { themedStyles, tc, useThemeMode } from "../lib/theme";

type Action = {
  icon: React.ComponentProps<typeof FontAwesome>["name"];
  onPress: () => void;
  label: string;
  badge?: number;
};

type Props = {
  title: string;
  subtitle?: string;
  action?: Action;
};

/**
 * Header for the main tabs: your avatar on the left opens the menu, the
 * screen title sits on the right (matching ScreenHeader's back-left /
 * title-right layout), with an optional icon button beside it.
 */
export default function TabHeader({ title, subtitle, action }: Props) {
  useThemeMode();
  const navigation = useNavigation();
  const user = auth.currentUser;
  const initial = (user?.displayName || user?.email || "C").charAt(0).toUpperCase();

  return (
    <View style={styles.header}>
      <Pressable
        onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        style={styles.avatarRing}
        accessibilityRole="button"
        accessibilityLabel="Open menu"
        hitSlop={6}
      >
        {user?.photoURL?.startsWith("http") ? (
          <Image source={{ uri: user.photoURL }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>{initial}</Text>
          </View>
        )}
        <View style={styles.menuDot}>
          <FontAwesome name="bars" size={7} color={tc("#0f1115")} />
        </View>
      </Pressable>

      <View style={styles.right}>
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
        {action ? (
          <Pressable
            onPress={action.onPress}
            style={styles.actionBtn}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            hitSlop={6}
          >
            <FontAwesome name={action.icon} size={16} color={tc("#f4f4f5")} />
            {action.badge ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{action.badge > 9 ? "9+" : action.badge}</Text>
              </View>
            ) : null}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = themedStyles({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 14,
  },
  pressed: { opacity: 0.7 },
  avatarRing: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: "#f59e0b",
    padding: 2,
  },
  avatar: { width: "100%", height: "100%", borderRadius: 20 },
  avatarFallback: { backgroundColor: "#27272a", alignItems: "center", justifyContent: "center" },
  avatarInitial: { color: "#f59e0b", fontSize: 16, fontWeight: "800" },
  menuDot: {
    position: "absolute",
    right: -3,
    bottom: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#f59e0b",
    borderWidth: 2,
    borderColor: "#0f1115",
    alignItems: "center",
    justifyContent: "center",
  },
  right: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 12 },
  titleBlock: { flexShrink: 1, alignItems: "flex-end" },
  title: { fontSize: 26, fontWeight: "900", color: "#f4f4f5", letterSpacing: -0.6, textAlign: "right" },
  dot: { color: "#f59e0b" },
  subtitle: { fontSize: 13, color: "#a1a1aa", marginTop: 2, textAlign: "right" },
  actionBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#181b20",
    borderWidth: 1,
    borderColor: "#27272a",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#ffffff", fontSize: 10, fontWeight: "800" },
});
