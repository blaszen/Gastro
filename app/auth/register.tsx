import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { router } from "expo-router";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

const onRegister = async () => {
  if (!email || !password) {
    setError("Please fill in all fields.");
    return;
  }

  setError("");
  setLoading(true);

  try {
    await createUserWithEmailAndPassword(auth, email, password);
    // Redirect to the main app drawer upon registration
    router.replace("/(drawer)"); 
  } catch (e: any) {
    const friendlyError = e.message
      ? e.message.replace("Firebase: ", "")
      : "An unexpected error occurred.";
    setError(friendlyError);
  } finally {
    setLoading(false);
  }
};

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1115" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.formContainer}>
          {/* Brand Header */}
          <View style={styles.headerContainer}>
            <Text style={styles.title}>
              Create Account<Text style={styles.brandDot}>.</Text>
            </Text>
            <Text style={styles.subtitle}>
              Join the culinary network and start prepping.
            </Text>
          </View>

          {/* Form Inputs */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <TextInput
              placeholder="chef@kitchen.com"
              placeholderTextColor="#71717a"
              style={styles.input}
              onChangeText={setEmail}
              value={email}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              placeholder="••••••••"
              placeholderTextColor="#71717a"
              secureTextEntry
              style={styles.input}
              onChangeText={setPassword}
              value={password}
            />
          </View>

          {/* Error Message */}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Action Buttons */}
          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={onRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#0f1115" />
            ) : (
              <Text style={styles.btnText}>Sign Up</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backContainer}
            activeOpacity={0.7}
          >
            <Text style={styles.backText}>
              Already have an account? <Text style={styles.backHighlight}>Log in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  formContainer: {
    width: "100%",
  },

  // Header Styles
  headerContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#f4f4f5",
    letterSpacing: -0.8,
  },
  brandDot: {
    color: "#f59e0b",
  },
  subtitle: {
    fontSize: 14,
    color: "#a1a1aa",
    marginTop: 6,
    fontWeight: "500",
  },

  // Input Field Styles
  inputGroup: {
    gap: 6,
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#a1a1aa",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 10,
    marginLeft: 2,
  },
  input: {
    backgroundColor: "#181b20",
    borderWidth: 1,
    borderColor: "#27272a",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    fontSize: 15,
    color: "#f4f4f5",
    fontWeight: "500",
  },

  // Error Text
  errorText: {
    color: "#ef4444",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 8,
    marginLeft: 2,
  },

  // Primary Button Styles
  btn: {
    backgroundColor: "#f59e0b",
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: "#0f1115",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
  },

  // Secondary Link Styles
  backContainer: {
    marginTop: 24,
    alignItems: "center",
  },
  backText: {
    fontSize: 14,
    color: "#a1a1aa",
    fontWeight: "500",
  },
  backHighlight: {
    color: "#f59e0b",
    fontWeight: "700",
  },
});