import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Pressable,
  Linking,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import ScreenHeader from "../../components/ScreenHeader";
import { SUPPORT_EMAIL } from "../../lib/appInfo";
import { themedStyles, tc, statusBarStyle, useThemeMode } from "../../lib/theme";

const FEATURES: { icon: any; title: string; body: string }[] = [
  { icon: "pencil", title: "Create & share recipes", body: "Publish to the Community Feed or keep recipes private." },
  { icon: "search", title: "Discover dishes", body: "Search thousands of recipes and save your favorites." },
  { icon: "shopping-basket", title: "Prep & grocery lists", body: "Turn any recipe into a shopping list in one tap." },
  { icon: "users", title: "Cook with friends", body: "Connect with other chefs and send recipes in chat." },
];

export default function AboutScreen() {
  useThemeMode();
  const router = useRouter();
  const version = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={statusBarStyle()} backgroundColor={tc("#0f1115")} />
      <ScreenHeader title="About" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.logo}>
            <FontAwesome name="cutlery" size={26} color="#f59e0b" />
          </View>
          <Text style={styles.brand}>GASTRO</Text>
          <Text style={styles.tagline}>Your community kitchen companion</Text>
          <Text style={styles.version}>Version {version}</Text>
        </View>

        <View style={styles.card}>
          {FEATURES.map((f, i) => (
            <View key={f.title} style={[styles.feature, i < FEATURES.length - 1 && styles.featureBorder]}>
              <View style={styles.featureIcon}>
                <FontAwesome name={f.icon} size={14} color="#f59e0b" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureBody}>{f.body}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.credit}>
          Recipe search powered by Spoonacular. Accounts and data powered by Firebase.
        </Text>

        <View style={styles.links}>
          <Pressable onPress={() => router.push({ pathname: "/legal", params: { doc: "privacy" } } as any)}>
            <Text style={styles.link}>Privacy Policy</Text>
          </Pressable>
          <Text style={styles.dot}>·</Text>
          <Pressable onPress={() => router.push({ pathname: "/legal", params: { doc: "terms" } } as any)}>
            <Text style={styles.link}>Terms of Service</Text>
          </Pressable>
          <Text style={styles.dot}>·</Text>
          <Pressable onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => {})}>
            <Text style={styles.link}>Contact</Text>
          </Pressable>
        </View>

        <Text style={styles.copyright}>© {new Date().getFullYear()} GASTRO</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = themedStyles({
  safeArea: { flex: 1, backgroundColor: "#0f1115" },
  content: { padding: 20, paddingBottom: 48 },
  hero: { alignItems: "center", marginVertical: 20 },
  logo: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1,
    borderColor: "#f59e0b",
    backgroundColor: "#181b20",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  brand: { color: "#f4f4f5", fontSize: 26, fontWeight: "900", letterSpacing: 5 },
  tagline: { color: "#a1a1aa", fontSize: 14, marginTop: 6 },
  version: { color: "#71717a", fontSize: 12, marginTop: 8 },
  card: {
    backgroundColor: "#181b20",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#27272a",
    paddingHorizontal: 16,
  },
  feature: { flexDirection: "row", gap: 12, paddingVertical: 14, alignItems: "flex-start" },
  featureBorder: { borderBottomWidth: 1, borderBottomColor: "#27272a" },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#0f1115",
    borderWidth: 1,
    borderColor: "#27272a",
    alignItems: "center",
    justifyContent: "center",
  },
  featureTitle: { color: "#f4f4f5", fontSize: 15, fontWeight: "700" },
  featureBody: { color: "#a1a1aa", fontSize: 13, marginTop: 2, lineHeight: 18 },
  credit: { color: "#71717a", fontSize: 12, textAlign: "center", marginTop: 20, lineHeight: 18 },
  links: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 16 },
  link: { color: "#f59e0b", fontSize: 13, fontWeight: "600" },
  dot: { color: "#52525b" },
  copyright: { color: "#52525b", fontSize: 12, textAlign: "center", marginTop: 16 },
});
