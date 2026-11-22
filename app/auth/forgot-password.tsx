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
import { Feather } from "@expo/vector-icons";
import { sendPasswordResetEmail } from "firebase/auth";
import { router, useLocalSearchParams } from "expo-router";
import { auth } from "../../lib/firebase";

export default function ForgotPassword() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(typeof params.email === "string" ? params.email : "");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/auth/login");
  };

  const onSend = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter the email address you signed up with.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await sendPasswordResetEmail(auth, trimmed);
      setSent(true);
    } catch (e: any) {
      const code = e?.code || "";
      if (code === "auth/invalid-email") {
        setError("That email address doesn't look right.");
      } else if (code === "auth/user-not-found") {
        // Don't reveal whether an account exists.
        setSent(true);
      } else if (code === "auth/too-many-requests") {
        setError("Too many attempts. Please wait a few minutes and try again.");
      } else if (code === "auth/network-request-failed") {
        setError("No connection. Check your internet and try again.");
      } else {
        setError("Couldn't send the reset email. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={goBack}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Back to sign in"
            hitSlop={10}
          >
            <Feather name="chevron-left" size={20} color="#f8fafc" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Reset Password</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formCard}>
            {sent ? (
              <>
                <View style={styles.iconCircle}>
                  <Feather name="mail" size={22} color="#f59e0b" />
                </View>
                <Text style={styles.formTitle}>Check your inbox</Text>
                <Text style={styles.bodyText}>
                  If an account exists for{" "}
                  <Text style={styles.emailText}>{email.trim()}</Text>, we've sent a
                  link to reset your password. It may take a minute to arrive, so check
                  your spam folder too.
                </Text>

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.primaryButton}
                  onPress={() => router.replace("/auth/login")}
                >
                  <Text style={styles.primaryButtonText}>Back to Sign In</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.secondaryButton}
                  onPress={() => setSent(false)}
                >
                  <Text style={styles.secondaryButtonText}>Use a different email</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.formTitle}>Forgot your password?</Text>
                <Text style={styles.bodyText}>
                  Enter your account email and we'll send you a link to set a new one.
                </Text>

                <View style={styles.inputWrapper}>
                  <Feather name="mail" size={18} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    placeholder="Email address"
                    placeholderTextColor="#64748b"
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    returnKeyType="send"
                    onSubmitEditing={onSend}
                    autoFocus={!email}
                  />
                </View>

                {error ? (
                  <View style={styles.errorContainer}>
                    <Feather name="alert-circle" size={14} color="#ef4444" />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.primaryButton, loading && styles.buttonDisabled]}
                  onPress={onSend}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#0f172a" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Send Reset Link</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#0b0f19" },
  flex: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#f8fafc",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  formCard: {
    backgroundColor: "#1e293b",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "#334155",
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#f8fafc",
    marginBottom: 8,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#94a3b8",
    marginBottom: 20,
  },
  emailText: { color: "#f8fafc", fontWeight: "600" },
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
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: 50, color: "#f8fafc", fontSize: 15 },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
  },
  errorText: { color: "#ef4444", fontSize: 13, flexShrink: 1 },
  primaryButton: {
    width: "100%",
    height: 50,
    backgroundColor: "#d97706",
    borderRadius: 12,
    marginTop: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.6 },
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
  secondaryButtonText: { color: "#94a3b8", fontSize: 14, fontWeight: "600" },
});
