// app/(drawer)/(tabs)/create.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
} from "react-native";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../../lib/firebase";

export default function TabThreeScreen() {
  const [title, setTitle] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [instructions, setInstructions] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const handleSubmit = async () => {
  if (!title.trim() || !ingredients.trim() || !instructions.trim()) {
    Alert.alert("Please fill in all required fields");
    return;
  }

  console.log({ title, ingredients, instructions, imageUrl ,}, "recipe saved");

  try {
    await addDoc(collection(db, "recipes"), {
      title: title.trim(),
      ingredients: ingredients.split("\n").map(i => i.trim()),
      instructions: instructions.trim(),
      imageUrl: imageUrl.trim() || null,
      createdBy: auth.currentUser?.uid,
      createdAt: serverTimestamp(),
    });

    Alert.alert("Recipe saved!");
    setTitle("");
    setIngredients("");
    setInstructions("");
    setImageUrl("");
  } catch (err) {
    console.error(err);
    Alert.alert("Error saving recipe");
  }
};


  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.label}>Recipe Title</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} />

      <Text style={styles.label}>Ingredients (one per line)</Text>
      <TextInput
        style={[styles.input, { height: 100 }]}
        value={ingredients}
        onChangeText={setIngredients}
        multiline
      />

      <Text style={styles.label}>Instructions</Text>
      <TextInput
        style={[styles.input, { height: 150 }]}
        value={instructions}
        onChangeText={setInstructions}
        multiline
      />



      <Text style={styles.label}>Image URL (optional)</Text>
      <TextInput style={styles.input} value={imageUrl} onChangeText={setImageUrl} />

      <Pressable style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Save Recipe</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  label: { fontWeight: "600", marginTop: 15 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 10,
    marginTop: 5,
  },
  button: {
    backgroundColor: "#FF6347",
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "600" },
});
