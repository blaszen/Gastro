import { router } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { auth } from "../../lib/firebase";

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
    <View style={{ padding: 20, marginTop: 120 }}>
      <Text style={{ fontSize: 32, fontWeight: "600", color: "default" }}>
        Login
      </Text>

      <TextInput
        placeholder="Email"
        style={styles.input}
        onChangeText={setEmail}
        autoCapitalize="none"
      />

      <TextInput
        placeholder="Password"
        secureTextEntry
        style={styles.input}
        onChangeText={setPassword}
      />

      {error ? <Text style={{ color: "red" }}>{error}</Text> : null}

      <TouchableOpacity style={styles.btn} onPress={onLogin}>
        <Text style={styles.btnText}>Sign In</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/auth/register")}>
        <Text style={{ marginTop: 20, color: "white" }}>Create an account</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = {
  input: {
    borderWidth: 1,
    padding: 12,
    marginVertical: 8,
    borderRadius: 8,
    color: "default",
  },
  btn: {
    backgroundColor: "#0e7afe",
    padding: 14,
    borderRadius: 8,
    marginTop: 20,
  },
  btnText: {
    color: "white",
    textAlign: "center",
    fontWeight: "600",
  },
};
