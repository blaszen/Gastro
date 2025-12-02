import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { router } from "expo-router";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const onRegister = async () => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      router.replace("/chat");
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <View style={{ padding: 20, marginTop: 120 }}>
      <Text style={{ fontSize: 32, fontWeight: "600" }}>Create Account</Text>

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

      <TouchableOpacity style={styles.btn} onPress={onRegister}>
        <Text style={styles.btnText}>Sign Up</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()}>
        <Text style={{ marginTop: 20,color:'white'}}>Back to login</Text>
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
    color:'white'
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
