import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { router } from "expo-router";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e: any) {
      setError(e.message.replace("Firebase: ", ""));
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header & Onboarding Section */}
          <View style={styles.headerContainer}>
            <View style={styles.badge}>
              <MaterialCommunityIcons name="chef-hat" size={16} color="#f59e0b" />
              <Text style={styles.badgeText}>KITCHEN OPERATIONS PLATFORM</Text>
            </View>

            <Text style={styles.brandTitle}>GASTRO</Text>
            <Text style={styles.tagline}>"Without order, there is only chaos."</Text>

            {/* Value Propositions Grid */}
            <View style={styles.propsContainer}>
              <View style={styles.propItem}>
                <Feather name="book-open" size={14} color="#d97706" />
                <Text style={styles.propText}>Recipe Box</Text>
              </View>
              <View style={styles.propDot} />
              <View style={styles.propItem}>
                <Feather name="pie-chart" size={14} color="#d97706" />
                <Text style={styles.propText}>Food Costing</Text>
              </View>
              <View style={styles.propDot} />
              <View style={styles.propItem}>
                <Feather name="layers" size={14} color="#d97706" />
                <Text style={styles.propText}>Batch Scaling</Text>
              </View>
            </View>
          </View>

          {/* Login Card */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Sign In</Text>

            <View style={styles.inputWrapper}>
              <Feather name="mail" size={18} color="#64748b" style={styles.inputIcon} />
              <TextInput
                placeholder="Email address"
                placeholderTextColor="#64748b"
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputWrapper}>
              <Feather name="lock" size={18} color="#64748b" style={styles.inputIcon} />
              <TextInput
                placeholder="Password"
                placeholderTextColor="#64748b"
                secureTextEntry
                style={styles.input}
                value={password}
                onChangeText={setPassword}
              />
            </View>

            {error ? (
              <View style={styles.errorContainer}>
                <Feather name="alert-circle" size={14} color="#ef4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Primary Action Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={onLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#0f172a" />
              ) : (
                <Text style={styles.primaryButtonText}>Access Kitchen</Text>
              )}
            </TouchableOpacity>

            {/* Secondary Action */}
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.secondaryButton}
              onPress={() => router.push("/auth/register")}
            >
              <Text style={styles.secondaryButtonText}>Create New Account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0b0f19", // Deep Slate / Obsidian
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },

  /* Header & Branding */
  headerContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e293b",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#334155",
    marginBottom: 16,
    gap: 6,
  },
  badgeText: {
    color: "#cbd5e1",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  brandTitle: {
    fontSize: 42,
    fontWeight: "900",
    color: "#f8fafc",
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 14,
    fontStyle: "italic",
    color: "#94a3b8",
    marginTop: 4,
  },

  /* Onboarding Highlights */
  propsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    backgroundColor: "#1e293b66",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#33415544",
  },
  propItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  propText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#e2e8f0",
  },
  propDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#475569",
    marginHorizontal: 10,
  },

  /* Form Container */
  formCard: {
    backgroundColor: "#1e293b",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "#334155",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#f8fafc",
    marginBottom: 20,
  },

  /* Inputs */
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    marginBottom: 14,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    color: "#f8fafc",
    fontSize: 15,
  },

  /* Errors */
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 13,
  },

  /* Buttons */
  primaryButton: {
    width: "100%",
    height: 50,
    backgroundColor: "#d97706", // Amber Flame Accent
    borderRadius: 12,
    marginTop: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  secondaryButton: {
    width: "100%",
    height: 48,
    borderRadius: 12,
    marginTop: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#94a3b8",
    fontSize: 14,
    fontWeight: "600",
  },
});