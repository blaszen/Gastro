import { useState } from "react";
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
} from "react-native";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { router } from "expo-router";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false); // <-- Add this line
const onLogin = async () => {
  if (!email || !password) {
    setError("Please enter both email and password.");
    return;
  }

  setLoading(true);
  setError("");

  try {
    await signInWithEmailAndPassword(auth, email, password);
    // You don't need router.replace() here! 
    // onAuthStateChanged in RootLayout automatically detects the login 
    // and runs router.replace("/(drawer)");
  } catch (e: any) {
    setError(e.message.replace("Firebase: ", ""));
    setLoading(false);
  }
};

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Main Card / Form Box */}
          <View style={styles.formBox}>
            <Text style={styles.title}>Login</Text>

            <TextInput
              placeholder="Email"
              placeholderTextColor="#6b7280"
              style={styles.input}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <TextInput
              placeholder="Password"
              placeholderTextColor="#6b7280"
              secureTextEntry
              style={styles.input}
              onChangeText={setPassword}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            {/* Primary Solid Button Box */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.primaryButtonBox}
              onPress={onLogin}
            >
              <Text style={styles.primaryButtonText}>Sign In</Text>
            </TouchableOpacity>

            {/* Secondary Outlined Button Box */}
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.secondaryButtonBox}
              onPress={() => router.push("/auth/register")}
            >
              <Text style={styles.secondaryButtonText}>Create an Account</Text>
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
    backgroundColor: "#ffffff",
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
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  // Form container box
  formBox: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 24,
  },
  input: {
    width: "100%",
    height: 50,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 16,
    marginVertical: 8,
    borderRadius: 10,
    backgroundColor: "#f9fafb",
    color: "#111827",
    fontSize: 16,
  },
  error: {
    color: "#ef4444",
    marginTop: 6,
    marginBottom: 6,
    fontSize: 14,
  },
  // Primary Button Container
  primaryButtonBox: {
    width: "100%",
    height: 52,
    backgroundColor: "#0e7afe",
    borderRadius: 10,
    marginTop: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  // Secondary Button Container
  secondaryButtonBox: {
    width: "100%",
    height: 52,
    borderWidth: 1.5,
    borderColor: "#0e7afe",
    backgroundColor: "#ffffff",
    borderRadius: 10,
    marginTop: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#0e7afe",
    fontSize: 16,
    fontWeight: "600",
  },
});