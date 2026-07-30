import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Switch,
} from "react-native";
import { addDoc, updateDoc, doc, collection, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../../lib/firebase";
import { MaterialCommunityIcons, FontAwesome } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

export default function TabThreeScreen({ route, navigation }: any) {
  const existingRecipe = route?.params?.recipe || null;
  const isEditing = Boolean(existingRecipe);

  const [title, setTitle] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [instructions, setInstructions] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (existingRecipe) {
      setTitle(existingRecipe.title || "");
      setIngredients(
        Array.isArray(existingRecipe.ingredients)
          ? existingRecipe.ingredients.join("\n")
          : existingRecipe.ingredients || ""
      );
      setInstructions(existingRecipe.instructions || "");
      setImageUrl(existingRecipe.imageUrl || "");
      setIsPublic(existingRecipe.isPublic ?? false);
    }
  }, [existingRecipe]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "Sorry, we need camera roll permissions to make this work!"
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUrl(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Authentication Error", "You must be logged in to save recipes.");
      return;
    }

    if (!title.trim() || !ingredients.trim() || !instructions.trim()) {
      Alert.alert("Missing Details", "Please fill in all required fields.");
      return;
    }

    setLoading(true);

    const recipeData = {
      title: title.trim(),
      ingredients: ingredients
        .split("\n")
        .map((i) => i.trim())
        .filter(Boolean),
      instructions: instructions.trim(),
      imageUrl: imageUrl.trim() || null,
      isPublic: Boolean(isPublic),
      userId: user.uid,
      createdBy: user.displayName || user.email?.split("@")[0] || "Chef",
      updatedAt: serverTimestamp(),
    };

    try {
      if (isEditing) {
        const recipeRef = doc(db, "recipes", existingRecipe.id);
        await updateDoc(recipeRef, recipeData);
        Alert.alert("Updated! ✨", "Your recipe settings have been saved.");
        if (navigation?.canGoBack()) navigation.goBack();
      } else {
        await addDoc(collection(db, "recipes"), {
          ...recipeData,
          createdAt: serverTimestamp(),
        });

        Alert.alert(
          "Success! 🎉",
          isPublic
            ? "Your recipe is published to the public feed!"
            : "Your recipe was saved privately to your account."
        );
        resetForm();
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not save your recipe. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setIngredients("");
    setInstructions("");
    setImageUrl("");
    setIsPublic(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1115" />
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
        >
          <View style={styles.contentContainer}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>
                {isEditing ? "Edit Recipe" : "Create Recipe"}
                <Text style={styles.brandDot}>.</Text>
              </Text>
              <Text style={styles.headerSubtitle}>
                {isEditing
                  ? "Manage visibility and details for your dish"
                  : "Craft and share your culinary creation"}
              </Text>
            </View>

            {/* Cover Image Picker */}
            <Pressable style={styles.imageCard} onPress={pickImage}>
              {imageUrl.trim() ? (
                <View style={styles.imagePreviewContainer}>
                  <Image
                    source={{ uri: imageUrl.trim() }}
                    style={styles.previewImage}
                  />
                  <View style={styles.changeBadge}>
                    <FontAwesome name="pencil" size={12} color="#0f1115" />
                    <Text style={styles.changeBadgeText}>Change</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.imagePlaceholder}>
                  <FontAwesome name="camera" size={18} color="#f59e0b" />
                  <Text style={styles.imagePlaceholderText}>
                    Select Photo from Library
                  </Text>
                </View>
              )}
            </Pressable>

            {/* Visibility Switch */}
            <View style={styles.visibilityCard}>
              <View style={styles.visibilityTextGroup}>
                <View style={styles.visibilityTitleRow}>
                  <MaterialCommunityIcons
                    name={isPublic ? "earth" : "lock-outline"}
                    size={18}
                    color={isPublic ? "#f59e0b" : "#a1a1aa"}
                  />
                  <Text style={styles.visibilityTitle}>
                    {isPublic ? "Public Recipe" : "Private Recipe"}
                  </Text>
                </View>
                <Text style={styles.visibilitySub}>
                  {isPublic
                    ? "Visible to everyone in the public feed"
                    : "Only visible on your personal account"}
                </Text>
              </View>
              <Switch
                trackColor={{ false: "#27272a", true: "#f59e0b" }}
                thumbColor={isPublic ? "#0f1115" : "#71717a"}
                ios_backgroundColor="#27272a"
                onValueChange={setIsPublic}
                value={isPublic}
              />
            </View>

            {/* Form Inputs */}
            <View style={styles.formCard}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Recipe Title <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Classic Creamy Carbonara"
                  placeholderTextColor="#71717a"
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>
                    Ingredients <Text style={styles.required}>*</Text>
                  </Text>
                  <Text style={styles.subLabel}>New line per item</Text>
                </View>
                <TextInput
                  style={[styles.input, styles.textAreaSmall]}
                  placeholder={"200g Guanciale\n4 Egg yolks\n100g Pecorino"}
                  placeholderTextColor="#71717a"
                  value={ingredients}
                  onChangeText={setIngredients}
                  multiline
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Instructions <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, styles.textAreaLarge]}
                  placeholder="Step-by-step preparation and cooking instructions..."
                  placeholderTextColor="#71717a"
                  value={instructions}
                  onChangeText={setInstructions}
                  multiline
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* Action Button */}
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
                <ActivityIndicator color="#0f1115" />
              ) : (
                <View style={styles.buttonContent}>
                  <MaterialCommunityIcons
                    name="content-save-check"
                    size={20}
                    color="#0f1115"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.submitButtonText}>Submit</Text>
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
    backgroundColor: "#0f1115",
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 110,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  // Header
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#f4f4f5",
    letterSpacing: -0.5,
  },
  brandDot: {
    color: "#f59e0b",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#a1a1aa",
    marginTop: 2,
  },

  // Visibility Control
  visibilityCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#181b20",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  visibilityTextGroup: {
    flex: 1,
    marginRight: 10,
  },
  visibilityTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  visibilityTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#f4f4f5",
  },
  visibilitySub: {
    fontSize: 11,
    color: "#71717a",
    marginTop: 2,
  },

  // Cover Image Card
  imageCard: {
    height: 110,
    borderRadius: 14,
    backgroundColor: "#181b20",
    borderWidth: 1,
    borderColor: "#27272a",
    borderStyle: "dashed",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  imagePreviewContainer: {
    width: "100%",
    height: "100%",
    position: "relative",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  changeBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "#f59e0b",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  changeBadgeText: {
    color: "#0f1115",
    fontSize: 10,
    fontWeight: "700",
  },
  imagePlaceholder: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  imagePlaceholderText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#f59e0b",
  },

  // Main Form Card
  formCard: {
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#e4e4e7",
    marginBottom: 6,
  },
  subLabel: {
    fontSize: 11,
    color: "#71717a",
  },
  required: {
    color: "#f59e0b",
  },
  input: {
    backgroundColor: "#181b20",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#f4f4f5",
  },
  textAreaSmall: {
    height: 80,
  },
  textAreaLarge: {
    height: 100,
  },

  // Submit Button
  submitButton: {
    backgroundColor: "#f59e0b",
    borderRadius: 14,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#f59e0b",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.5,
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
    color: "#d97706",
    fontSize: 15,
    fontWeight: "700",
  },
});