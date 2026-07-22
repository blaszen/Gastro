import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from "react-native";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../../lib/firebase";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";

export default function TabThreeScreen() {
  const [title, setTitle] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [instructions, setInstructions] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !ingredients.trim() || !instructions.trim()) {
      Alert.alert("Missing Details", "Please fill in all required fields.");
      return;
    }

    setLoading(true);

    try {
      await addDoc(collection(db, "recipes"), {
        title: title.trim(),
        ingredients: ingredients
          .split("\n")
          .map((i) => i.trim())
          .filter(Boolean),
        instructions: instructions.trim(),
        imageUrl: imageUrl.trim() || null,
        createdBy: auth.currentUser?.email || auth.currentUser?.uid || "Chef",
        createdAt: serverTimestamp(),
      });

      Alert.alert("Success! 🎉", "Your recipe has been published to the feed.");
      setTitle("");
      setIngredients("");
      setInstructions("");
      setImageUrl("");
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not save your recipe. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Create Recipe</Text>
            <Text style={styles.headerSubtitle}>
              Craft and share your culinary creation
            </Text>
          </View>

          {/* Main Form Container */}
          <View style={styles.formCard}>
            {/* Title Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Recipe Title <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Classic Creamy Carbonara"
                placeholderTextColor="#94a3b8"
                value={title}
                onChangeText={setTitle}
              />
            </View>

            {/* Ingredients Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Ingredients <Text style={styles.required}>*</Text>
              </Text>
              <Text style={styles.subLabel}>Enter each item on a new line</Text>
              <TextInput
                style={[styles.input, styles.textAreaSmall]}
                placeholder={"200g Guanciale\n4 Egg yolks\n100g Pecorino Romano\nBlack pepper"}
                placeholderTextColor="#94a3b8"
                value={ingredients}
                onChangeText={setIngredients}
                multiline
                textAlignVertical="top"
              />
            </View>

            {/* Instructions Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Instructions <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, styles.textAreaLarge]}
                placeholder="Step-by-step preparation and cooking instructions..."
                placeholderTextColor="#94a3b8"
                value={instructions}
                onChangeText={setInstructions}
                multiline
                textAlignVertical="top"
              />
            </View>

            {/* Image URL & Live Preview */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Image URL (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="https://images.unsplash.com/photo-..."
                placeholderTextColor="#94a3b8"
                value={imageUrl}
                onChangeText={setImageUrl}
                autoCapitalize="none"
              />

              {/* Dynamic Image Preview */}
              {imageUrl.trim() ? (
                <View style={styles.previewContainer}>
                  <Text style={styles.previewLabel}>Image Preview:</Text>
                  <Image
                    source={{ uri: imageUrl.trim() }}
                    style={styles.previewImage}
                  />
                </View>
              ) : null}
            </View>

            {/* Submit Button */}
            <Pressable
              style={({ pressed }) => [
                styles.submitButton,
                loading && styles.submitButtonDisabled,
                pressed && styles.submitButtonPressed,
              ]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <View style={styles.buttonContent}>
                  <MaterialCommunityIcons name="chef-hat" size={20} color="#ffffff" style={{ marginRight: 8 }} />
                  <Text style={styles.submitButtonText}>Publish Recipe</Text>
                </View>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.6,
  },
  headerSubtitle: {
    fontSize: 15,
    color: "#64748b",
    marginTop: 2,
  },
  formCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 4,
  },
  subLabel: {
    fontSize: 12,
    color: "#94a3b8",
    marginBottom: 6,
  },
  required: {
    color: "#ef4444",
  },
  input: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#0f172a",
  },
  textAreaSmall: {
    height: 100,
  },
  textAreaLarge: {
    height: 140,
  },
  previewContainer: {
    marginTop: 12,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 6,
  },
  previewImage: {
    width: "100%",
    height: 160,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
  },
  submitButton: {
    backgroundColor: "#2563eb",
    borderRadius: 12,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  submitButtonText: {
    color: "blue",
    fontSize: 16,
    fontWeight: "700",
  },
});