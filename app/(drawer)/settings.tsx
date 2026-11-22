import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  SafeAreaView,
  StatusBar,
  Modal,
  TextInput,
  ActivityIndicator,
  Linking,
  Image,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { signOut, sendPasswordResetEmail, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { reauthenticate, deleteAccount } from "../../lib/account";
import { useUserStore } from "../../store/userStore";
import { useThemeMode, ThemePreference, themedStyles, tc, statusBarStyle } from "../../lib/theme";
import ScreenHeader from "../../components/ScreenHeader";

import { SUPPORT_EMAIL } from "../../lib/appInfo";
import { unblockUser, useBlockedUsers } from "../../lib/moderation";

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: any }[] = [
  { value: "system", label: "System", icon: "mobile" },
  { value: "light", label: "Light", icon: "sun-o" },
  { value: "dark", label: "Dark", icon: "moon-o" },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { preference, setPreference } = useThemeMode();
  const setUser = useUserStore((s) => s.setUser);
  const user = auth.currentUser;

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";
  const buildNumber =
    (Constants.expoConfig?.ios as any)?.buildNumber ?? Constants.nativeBuildVersion ?? "";

  // Display name editor
  const [nameModal, setNameModal] = useState(false);
  const [nameDraft, setNameDraft] = useState(user?.displayName || "");
  const [savingName, setSavingName] = useState(false);

  // Blocked chefs
  const blocked = useBlockedUsers(user?.uid);
  const [blockedModal, setBlockedModal] = useState(false);

  // Account deletion
  const [deleteModal, setDeleteModal] = useState(false);
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(drawer)/(tabs)" as any);
  };

  const handleLogout = () => {
    Alert.alert("Log out?", "You'll need to sign in again to use GASTRO.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut(auth);
            setUser(null);
            router.replace("/auth/login");
          } catch (err) {
            console.error("Logout error:", err);
            Alert.alert("Error", "Couldn't log out. Please try again.");
          }
        },
      },
    ]);
  };

  const saveName = async () => {
    const name = nameDraft.trim();
    if (!user || !name) return;
    if (name.length > 40) {
      Alert.alert("Name too long", "Please use 40 characters or fewer.");
      return;
    }
    setSavingName(true);
    try {
      await updateProfile(user, { displayName: name });
      await setDoc(
        doc(db, "users", user.uid),
        { uid: user.uid, displayName: name, updatedAt: new Date().toISOString() },
        { merge: true }
      );
      setNameModal(false);
    } catch (err) {
      console.error("Name update failed:", err);
      Alert.alert("Error", "Couldn't update your name. Please try again.");
    } finally {
      setSavingName(false);
    }
  };

  const handlePasswordReset = () => {
    if (!user?.email) return;
    Alert.alert(
      "Change password",
      `We'll email a password reset link to ${user.email}.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send Link",
          onPress: async () => {
            try {
              await sendPasswordResetEmail(auth, user.email!);
              Alert.alert("Check your inbox", "Follow the link in the email to set a new password.");
            } catch (err) {
              console.error("Reset email failed:", err);
              Alert.alert("Error", "Couldn't send the reset email. Please try again later.");
            }
          },
        },
      ]
    );
  };

  const confirmDelete = async () => {
    if (!user) return;
    if (!password) {
      setDeleteError("Enter your password to confirm.");
      return;
    }
    setDeleting(true);
    setDeleteError("");
    try {
      // Confirm identity first so nothing is deleted if the password is wrong.
      await reauthenticate(user, password);
      await deleteAccount(user);
      setDeleteModal(false);
      setUser(null);
      router.replace("/auth/login");
      Alert.alert("Account deleted", "Your account and data have been removed.");
    } catch (err: any) {
      const code = err?.code || "";
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setDeleteError("That password isn't right.");
      } else if (code === "auth/too-many-requests") {
        setDeleteError("Too many attempts. Please wait and try again.");
      } else {
        console.error("Account deletion failed:", err);
        setDeleteError("Couldn't delete your account. Please try again.");
      }
    } finally {
      setDeleting(false);
    }
  };

  const openEmail = (subject: string, body = "") => {
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    Linking.openURL(url).catch(() =>
      Alert.alert("No email app", `Email us at ${SUPPORT_EMAIL}`)
    );
  };

  const deviceInfo = `\n\n---\nApp ${appVersion}${buildNumber ? ` (${buildNumber})` : ""} · ${Platform.OS} ${Platform.Version}`;

  const Row = ({
    icon,
    label,
    value,
    onPress,
    danger,
  }: {
    icon: any;
    label: string;
    value?: string;
    onPress?: () => void;
    danger?: boolean;
  }) => (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && onPress && styles.pressed]}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
    >
      <View style={styles.rowLeft}>
        <View style={[styles.iconContainer, danger && styles.iconDanger]}>
          <FontAwesome name={icon} size={14} color={danger ? "#ef4444" : "#f59e0b"} />
        </View>
        <Text style={[styles.rowLabel, danger && styles.dangerText]}>{label}</Text>
      </View>
      <View style={styles.rowRight}>
        {value ? (
          <Text style={styles.rowValue} numberOfLines={1}>
            {value}
          </Text>
        ) : null}
        {onPress ? <FontAwesome name="chevron-right" size={12} color={tc("#52525b")} /> : null}
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={statusBarStyle()} backgroundColor={tc("#0f1115")} />
      <ScreenHeader title="Settings" onBack={handleBack} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Account summary */}
        <Pressable style={styles.profileCard} onPress={() => router.push("/profile" as any)}>
          {user?.photoURL?.startsWith("http") ? (
            <Image source={{ uri: user.photoURL }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitial}>
                {(user?.displayName || user?.email || "C").charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName} numberOfLines={1}>
              {user?.displayName || "Add your name"}
            </Text>
            <Text style={styles.profileEmail} numberOfLines={1}>
              {user?.email}
            </Text>
          </View>
          <FontAwesome name="chevron-right" size={12} color={tc("#52525b")} />
        </Pressable>

        {/* Appearance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <View style={styles.segment}>
            {THEME_OPTIONS.map((opt) => {
              const active = preference === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                  onPress={() => setPreference(opt.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <FontAwesome
                    name={opt.icon}
                    size={14}
                    color={active ? tc("#0f1115") : tc("#a1a1aa")}
                  />
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            <Row icon="user" label="Edit Profile" onPress={() => router.push("/profile" as any)} />
            <View style={styles.divider} />
            <Row
              icon="id-card-o"
              label="Display Name"
              value={user?.displayName || "Not set"}
              onPress={() => {
                setNameDraft(user?.displayName || "");
                setNameModal(true);
              }}
            />
            <View style={styles.divider} />
            <Row icon="envelope-o" label="Email" value={user?.email || ""} />
            <View style={styles.divider} />
            <Row icon="lock" label="Change Password" onPress={handlePasswordReset} />
            <View style={styles.divider} />
            <Row
              icon="ban"
              label="Blocked Chefs"
              value={blocked.length ? String(blocked.length) : "None"}
              onPress={() => setBlockedModal(true)}
            />
          </View>
        </View>

        {/* Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <View style={styles.card}>
            <Row
              icon="question-circle"
              label="Contact Support"
              onPress={() => openEmail("GASTRO Support", deviceInfo)}
            />
            <View style={styles.divider} />
            <Row
              icon="bug"
              label="Report a Problem"
              onPress={() =>
                openEmail("GASTRO Bug Report", `What happened?\n\nWhat did you expect?${deviceInfo}`)
              }
            />
            <View style={styles.divider} />
            <Row
              icon="lightbulb-o"
              label="Suggest a Feature"
              onPress={() => openEmail("GASTRO Feature Idea", deviceInfo)}
            />
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.card}>
            <Row icon="info-circle" label="About GASTRO" onPress={() => router.push("/about" as any)} />
            <View style={styles.divider} />
            <Row
              icon="shield"
              label="Privacy Policy"
              onPress={() => router.push({ pathname: "/legal", params: { doc: "privacy" } } as any)}
            />
            <View style={styles.divider} />
            <Row
              icon="file-text-o"
              label="Terms of Service"
              onPress={() => router.push({ pathname: "/legal", params: { doc: "terms" } } as any)}
            />
          </View>
        </View>

        {/* Log out */}
        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <FontAwesome name="sign-out" size={16} color="#ef4444" />
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>

        {/* Danger zone */}
        <View style={styles.card}>
          <Row
            icon="trash-o"
            label="Delete Account"
            danger
            onPress={() => {
              setPassword("");
              setDeleteError("");
              setDeleteModal(true);
            }}
          />
        </View>

        <Text style={styles.versionText}>
          GASTRO {appVersion}
          {buildNumber ? ` (${buildNumber})` : ""}
        </Text>
      </ScrollView>

      {/* Display name modal */}
      <Modal visible={nameModal} transparent animationType="fade" onRequestClose={() => setNameModal(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Display Name</Text>
            <Text style={styles.modalBody}>This is how other chefs see you.</Text>
            <TextInput
              style={styles.input}
              value={nameDraft}
              onChangeText={setNameDraft}
              placeholder="Your name"
              placeholderTextColor="#71717a"
              autoFocus
              maxLength={40}
              returnKeyType="done"
              onSubmitEditing={saveName}
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.modalSecondary} onPress={() => setNameModal(false)}>
                <Text style={styles.modalSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalPrimary, (!nameDraft.trim() || savingName) && styles.disabled]}
                onPress={saveName}
                disabled={!nameDraft.trim() || savingName}
              >
                {savingName ? (
                  <ActivityIndicator color={tc("#0f1115")} />
                ) : (
                  <Text style={styles.modalPrimaryText}>Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Blocked chefs modal */}
      <Modal visible={blockedModal} transparent animationType="fade" onRequestClose={() => setBlockedModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Blocked Chefs</Text>
            {blocked.length === 0 ? (
              <Text style={styles.modalBody}>
                You haven't blocked anyone. You can block a chef from the ⋯ menu on any of their recipes.
              </Text>
            ) : (
              <ScrollView style={{ maxHeight: 320 }}>
                {blocked.map((b) => (
                  <View key={b.uid} style={styles.blockedRow}>
                    <Text style={styles.rowLabel} numberOfLines={1}>
                      {b.displayName || "Chef"}
                    </Text>
                    <Pressable
                      style={styles.unblockBtn}
                      onPress={() =>
                        user && unblockUser(user.uid, b.uid).catch(() =>
                          Alert.alert("Error", "Couldn't unblock. Please try again.")
                        )
                      }
                    >
                      <Text style={styles.unblockText}>Unblock</Text>
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            )}
            <View style={styles.modalActions}>
              <Pressable style={styles.modalSecondary} onPress={() => setBlockedModal(false)}>
                <Text style={styles.modalSecondaryText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete account modal */}
      <Modal visible={deleteModal} transparent animationType="fade" onRequestClose={() => setDeleteModal(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalCard}>
            <Text style={[styles.modalTitle, styles.dangerText]}>Delete account?</Text>
            <Text style={styles.modalBody}>
              This permanently deletes your account, recipes, grocery lists, favorites, friends and
              photos. This can't be undone.
            </Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password to confirm"
              placeholderTextColor="#71717a"
              secureTextEntry
              autoCapitalize="none"
              textContentType="password"
            />
            {deleteError ? <Text style={styles.errorText}>{deleteError}</Text> : null}
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalSecondary}
                onPress={() => setDeleteModal(false)}
                disabled={deleting}
              >
                <Text style={styles.modalSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalDanger, deleting && styles.disabled]}
                onPress={confirmDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.modalDangerText}>Delete</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = themedStyles({
  safeArea: { flex: 1, backgroundColor: "#0f1115" },
  blockedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#27272a",
    gap: 12,
  },
  unblockBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  unblockText: { color: "#f59e0b", fontWeight: "700", fontSize: 13 },
  container: { flex: 1, backgroundColor: "#0f1115" },
  content: { padding: 20, paddingTop: 4, paddingBottom: 48 },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.5 },

  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#181b20",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#27272a",
    padding: 14,
    marginBottom: 24,
  },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarFallback: {
    backgroundColor: "#27272a",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { color: "#f59e0b", fontSize: 18, fontWeight: "800" },
  profileName: { color: "#f4f4f5", fontSize: 16, fontWeight: "700" },
  profileEmail: { color: "#a1a1aa", fontSize: 13, marginTop: 2 },

  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#a1a1aa",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 4,
  },

  segment: {
    flexDirection: "row",
    backgroundColor: "#181b20",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#27272a",
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  segmentBtnActive: { backgroundColor: "#f59e0b" },
  segmentText: { color: "#a1a1aa", fontWeight: "700", fontSize: 13 },
  segmentTextActive: { color: "#0f1115" },

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
    gap: 12,
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 },
  rowValue: { color: "#a1a1aa", fontSize: 13, maxWidth: 170 },
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
  iconDanger: { borderColor: "rgba(239, 68, 68, 0.3)" },
  rowLabel: { fontSize: 15, fontWeight: "600", color: "#f4f4f5" },
  dangerText: { color: "#ef4444" },
  divider: { height: 1, backgroundColor: "#27272a" },

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
    marginBottom: 16,
  },
  logoutText: { fontSize: 15, fontWeight: "700", color: "#ef4444" },
  versionText: {
    textAlign: "center",
    fontSize: 12,
    color: "#52525b",
    fontWeight: "500",
    marginTop: 20,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "#181b20",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#27272a",
    padding: 20,
  },
  modalTitle: { color: "#f4f4f5", fontSize: 18, fontWeight: "800", marginBottom: 6 },
  modalBody: { color: "#a1a1aa", fontSize: 14, lineHeight: 20, marginBottom: 16 },
  input: {
    backgroundColor: "#0f1115",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    color: "#f4f4f5",
    fontSize: 15,
  },
  errorText: { color: "#ef4444", fontSize: 13, marginTop: 10 },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 18 },
  modalSecondary: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#27272a",
    alignItems: "center",
    justifyContent: "center",
  },
  modalSecondaryText: { color: "#f4f4f5", fontWeight: "700" },
  modalPrimary: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#f59e0b",
    alignItems: "center",
    justifyContent: "center",
  },
  modalPrimaryText: { color: "#0f1115", fontWeight: "800" },
  modalDanger: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
  },
  modalDangerText: { color: "#ffffff", fontWeight: "800" },
});
