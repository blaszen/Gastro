import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Switch,
  Alert,
  SafeAreaView,
  StatusBar,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { auth } from "../../lib/firebase";

export default function SettingsModal() {
  const router = useRouter();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(true);

const handleLogout = async () => {
  try {
    // 1. Clear Zustand / local user store
    setUser(null);

    // 2. Sign out of Firebase
    await signOut(auth);

    // 3. Route to login
    router.replace("/auth/login");
  } catch (err) {
    console.error("Logout error:", err);
  }
};
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(drawer)/(tabs)" as any);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1115" />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backBtn}>
            <FontAwesome name="arrow-left" size={16} color="#f4f4f5" />
          </Pressable>
          <Text style={styles.title}>Settings</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            <Pressable
              style={styles.row}
              onPress={() => router.push("/profile" as any)}
            >
              <View style={styles.rowLeft}>
                <View style={styles.iconContainer}>
                  <FontAwesome name="user" size={14} color="#f59e0b" />
                </View>
                <Text style={styles.rowLabel}>Edit Profile</Text>
              </View>
              <FontAwesome name="chevron-right" size={12} color="#52525b" />
            </Pressable>

            <View style={styles.divider} />

            <Pressable
              style={styles.row}
              onPress={() => Alert.alert("Security", "Security options clicked")}
            >
              <View style={styles.rowLeft}>
                <View style={styles.iconContainer}>
                  <FontAwesome name="lock" size={14} color="#f59e0b" />
                </View>
                <Text style={styles.rowLabel}>Security & Password</Text>
              </View>
              <FontAwesome name="chevron-right" size={12} color="#52525b" />
            </Pressable>
          </View>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={styles.iconContainer}>
                  <FontAwesome name="bell" size={14} color="#f59e0b" />
                </View>
                <Text style={styles.rowLabel}>Push Notifications</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: "#27272a", true: "rgba(245, 158, 11, 0.4)" }}
                thumbColor={notificationsEnabled ? "#f59e0b" : "#71717a"}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={styles.iconContainer}>
                  <FontAwesome name="moon-o" size={14} color="#f59e0b" />
                </View>
                <Text style={styles.rowLabel}>Dark Mode</Text>
              </View>
              <Switch
                value={darkModeEnabled}
                onValueChange={setDarkModeEnabled}
                trackColor={{ false: "#27272a", true: "rgba(245, 158, 11, 0.4)" }}
                thumbColor={darkModeEnabled ? "#f59e0b" : "#71717a"}
              />
            </View>
          </View>
        </View>

        {/* Support & About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support & About</Text>
          <View style={styles.card}>
            <Pressable
              style={styles.row}
              onPress={() => Alert.alert("Help", "Contact support at help@example.com")}
            >
              <View style={styles.rowLeft}>
                <View style={styles.iconContainer}>
                  <FontAwesome name="question-circle" size={14} color="#f59e0b" />
                </View>
                <Text style={styles.rowLabel}>Help & Support</Text>
              </View>
              <FontAwesome name="chevron-right" size={12} color="#52525b" />
            </Pressable>

            <View style={styles.divider} />

            <Pressable
              style={styles.row}
              onPress={() => Alert.alert("Terms", "Terms of Service details")}
            >
              <View style={styles.rowLeft}>
                <View style={styles.iconContainer}>
                  <FontAwesome name="file-text-o" size={14} color="#f59e0b" />
                </View>
                <Text style={styles.rowLabel}>Terms & Privacy Policy</Text>
              </View>
              <FontAwesome name="chevron-right" size={12} color="#52525b" />
            </Pressable>
          </View>
        </View>

        {/* Log Out Action */}
        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <FontAwesome name="sign-out" size={16} color="#ef4444" />
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>

        <Text style={styles.versionText}>App Version 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0f1115",
  },
  container: {
    flex: 1,
    backgroundColor: "#0f1115",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#181b20",
    borderWidth: 1,
    borderColor: "#27272a",
    justifyContent: "center",
    alignItems: "center",
  },
  headerSpacer: {
    width: 36,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#f4f4f5",
    letterSpacing: -0.4,
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#a1a1aa",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 4,
  },

  // Cards & Rows
  card: {
    backgroundColor: "#181b20",
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#0f1115",
    borderWidth: 1,
    borderColor: "#27272a",
    justifyContent: "center",
    alignItems: "center",
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#f4f4f5",
  },
  divider: {
    height: 1,
    backgroundColor: "#27272a",
  },

  // Logout Button
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    gap: 8,
    marginTop: 8,
    marginBottom: 16,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ef4444",
  },
  versionText: {
    textAlign: "center",
    fontSize: 12,
    color: "#52525b",
    fontWeight: "500",
  },
});