import React from "react";
import { Text, StyleSheet, ScrollView, SafeAreaView, StatusBar, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import ScreenHeader from "../../components/ScreenHeader";
import { SUPPORT_EMAIL } from "../../lib/appInfo";
import { themedStyles, tc, statusBarStyle, useThemeMode } from "../../lib/theme";

// NOTE: Review these documents before public release; they describe what the
// app does today but are not legal advice.
const UPDATED = "November 22, 2026";

const PRIVACY: { h: string; p: string }[] = [
  {
    h: "What we collect",
    p: "Your email address and password (handled by Firebase Authentication), the display name and profile details you choose to add, your profile photo, the recipes, photos, grocery and prep lists you create, your favorites, friend connections and chat messages.",
  },
  {
    h: "How we use it",
    p: "To run your account and show your content in the app. Public recipes are visible to other signed-in users in the Community Feed; private recipes are visible only to you. Your display name, email and photo are visible to other users so they can find and connect with you.",
  },
  {
    h: "Service providers",
    p: "Data is stored with Google Firebase (authentication, database and file storage). Recipe searches are sent to Spoonacular through our server; your account details are not shared with Spoonacular. If you use Generate with AI, the text you type is sent through our server to Google's Gemini model on Google Cloud to write the recipe; it isn't linked to your name or email.",
  },
  {
    h: "What we don't do",
    p: "We don't sell your data, show third-party ads, or track you across other apps and websites.",
  },
  {
    h: "Deleting your data",
    p: "You can delete your account at any time in Settings → Delete Account. This removes your profile, recipes, lists, favorites, friend connections and uploaded photos. Messages you sent in shared chats may remain visible to the other person.",
  },
  {
    h: "Contact",
    p: `Questions about privacy? Email ${SUPPORT_EMAIL}.`,
  },
];

const TERMS: { h: string; p: string }[] = [
  {
    h: "Using GASTRO",
    p: "You must provide accurate account information and keep your password secure. You're responsible for activity on your account.",
  },
  {
    h: "Your content",
    p: "You own the recipes and photos you post. By publishing a recipe publicly you allow other GASTRO users to view it and share it within the app. Only post content you have the right to share.",
  },
  {
    h: "Community rules",
    p: "Don't post anything illegal, hateful, harassing, sexually explicit, or that infringes someone else's rights. We may remove content or suspend accounts that break these rules. Report problems to us by email.",
  },
  {
    h: "Recipes and safety",
    p: "Recipes are shared by users and third parties and are provided for general information. Check ingredients for allergens and follow safe food-handling practices.",
  },
  {
    h: "Availability",
    p: "We work to keep GASTRO running but can't guarantee it will always be available or error-free. Features may change over time.",
  },
  {
    h: "Ending your account",
    p: "You can delete your account at any time from Settings. We may end access for accounts that violate these terms.",
  },
  {
    h: "Contact",
    p: `Questions about these terms? Email ${SUPPORT_EMAIL}.`,
  },
];

export default function LegalScreen() {
  useThemeMode();
  const { doc } = useLocalSearchParams<{ doc?: string }>();
  const isTerms = doc === "terms";
  const sections = isTerms ? TERMS : PRIVACY;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={statusBarStyle()} backgroundColor={tc("#0f1115")} />
      <ScreenHeader title={isTerms ? "Terms of Service" : "Privacy Policy"} subtitle={`Updated ${UPDATED}`} />
      <ScrollView contentContainerStyle={styles.content}>
        {sections.map((s) => (
          <View key={s.h} style={styles.section}>
            <Text style={styles.heading}>{s.h}</Text>
            <Text style={styles.body}>{s.p}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = themedStyles({
  safeArea: { flex: 1, backgroundColor: "#0f1115" },
  content: { padding: 20, paddingTop: 4, paddingBottom: 48 },
  section: { marginBottom: 20 },
  heading: { color: "#f4f4f5", fontSize: 16, fontWeight: "800", marginBottom: 6 },
  body: { color: "#a1a1aa", fontSize: 14, lineHeight: 21 },
});
