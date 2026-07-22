import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { router } from "expo-router";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const onLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace("/chat");
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>

      <TextInput
        placeholder="Email"
        placeholderTextColor="#666666"
        style={styles.input}
        onChangeText={setEmail}
        autoCapitalize="none"
      />

      <TextInput
        placeholder="Password"
        placeholderTextColor="#666666"
        secureTextEntry
        style={styles.input}
        onChangeText={setPassword}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.btn} onPress={onLogin}>
        <Text style={styles.btnText}>Sign In</Text>
      </TouchableOpacity>

<TouchableOpacity 
  style={styles.linkBtn} 
  onPress={() => router.push("/auth/register")}
>
  <Text style={styles.linkText}>Create an account</Text>
</TouchableOpacity>
    </View>
  );
}

const styles = {
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 120,
    backgroundColor: "#ffffff", // Ensures screen stays white in Dark Mode
  },
  title: {
    fontSize: 32,
    fontWeight: "600" as const,
    color: "#000000",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    marginVertical: 8,
    borderRadius: 8,
    backgroundColor: "#ffffff", // Locks input background to white
    color: "#000000",           // Locks typed text color to black
  },
  btn: {
    backgroundColor: "#0e7afe",
    padding: 14,
    borderRadius: 8,
    marginTop: 20,
  },
  btnText: {
    color: "#ffffff",
    textAlign: "center" as const,
    fontWeight: "600" as const,
  },
  linkText: {
color: "#0e7afe", // Uses the same accent blue as your Sign In button
  fontSize: 15,
  fontWeight: "500",
  },
  error: {
    color: "#dc2626",
    marginTop: 4,
  },linkBtn: {
  marginTop: 16,
  paddingVertical: 8,
  alignItems: "center",
},
};