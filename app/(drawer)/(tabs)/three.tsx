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
import { addDoc, updateDoc, doc, getDoc, collection, serverTimestamp } from "firebase/firestore";
import { useLocalSearchParams, useRouter } from "expo-router";
import { db, auth } from "../../../lib/firebase";
import { MaterialCommunityIcons, FontAwesome } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { uploadImageAsync } from "../../../lib/uploadImage";
import { themedStyles, tc, statusBarStyle, useThemeMode } from "../../../lib/theme";

export default function TabThreeScreen() {
  useThemeMode();
  const router = useRouter();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const isEditing = typeof editId === "string" && editId.length > 0;

  const [title, setTitle] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [instructions, setInstructions] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [prepTime, setPrepTime] = useState("");
  const [servings, setServings] = useState("");
  // New recipes are public (shown in the Community Feed) unless marked private.
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingRecipe, setLoadingRecipe] = useState(false);

  // Load the recipe being edited
  useEffect(() => {
    if (!isEditing) return;
    let cancelled = false;
    setLoadingRecipe(true);
    getDoc(doc(db, "recipes", editId!))
      .then((snap) => {
        if (cancelled) return;
        const r: any = snap.data();
        if (!snap.exists() || r?.userId !== auth.currentUser?.uid) {
          Alert.alert("Can't edit", "This recipe doesn't exist or isn't yours.");
          router.setParams({ editId: "" });
          return;
        }
        setTitle(r.title || "");
        setIngredients(
          Array.isArray(r.ingredients) ? r.ingredients.join("\n") : r.ingredients || ""
        );
        setInstructions(r.instructions || "");
        setImageUrl(r.imageUrl || "");
        setPrepTime(r.prepTimeMinutes ? String(r.prepTimeMinutes) : "");
        setServings(r.servings ? String(r.servings) : "");
        setIsPublic(r.isPublic ?? true);
      })
      .catch((err) => {
        console.error("Failed to load recipe for editing:", err);
        Alert.alert("Error", "Couldn't load this recipe.");
      })
      .finally(() => !cancelled && setLoadingRecipe(false));
    return () => {
      cancelled = true;
    };
  }, [editId]);

  const exitEditing = () => {
    resetForm();
    router.setParams({ editId: "" });
  };

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
    if (title.trim().length > 200) {
      Alert.alert("Title too long", "Please keep the title under 200 characters.");
      return;
    }
    const prepMinutes = prepTime.trim() ? parseInt(prepTime, 10) : null;
    const servingCount = servings.trim() ? parseInt(servings, 10) : null;
    if ((prepMinutes !== null && (isNaN(prepMinutes) || prepMinutes <= 0 || prepMinutes > 10000)) ||
        (servingCount !== null && (isNaN(servingCount) || servingCount <= 0 || servingCount > 500))) {
      Alert.alert("Check the numbers", "Prep time and servings should be whole numbers.");
      return;
    }

    setLoading(true);

    // Upload a newly picked photo so others can see it in the Community Feed.
    let finalImageUrl: string | null = imageUrl.trim() || null;
    if (finalImageUrl) {
      try {
        finalImageUrl = await uploadImageAsync(
          finalImageUrl,
          `recipeImages/${user.uid}/${Date.now()}.jpg`
        );
      } catch (err: any) {
        console.error("Image upload failed:", err);
        Alert.alert(
          "Photo upload failed",
          err?.message?.includes("too large")
            ? err.message
            : "We couldn't upload your photo. Please try again."
        );
        setLoading(false);
        return;
      }
    }

    const recipeData = {
      title: title.trim(),
      ingredients: ingredients
        .split("\n")
        .map((i) => i.trim())
        .filter(Boolean),
      instructions: instructions.trim(),
      imageUrl: finalImageUrl,
      prepTimeMinutes: prepMinutes,
      servings: servingCount,
      isPublic: Boolean(isPublic),
      userId: user.uid,
      createdBy: user.displayName || user.email?.split("@")[0] || "Chef",
      updatedAt: serverTimestamp(),
    };

    try {
      if (isEditing) {
        await updateDoc(doc(db, "recipes", editId!), recipeData);
        const id = editId!;
        exitEditing();
        Alert.alert("Recipe updated", "Your changes have been saved.");
        router.push(`/recipe/${id}` as any);
      } else {
        const ref = await addDoc(collection(db, "recipes"), {
          ...recipeData,
          createdAt: serverTimestamp(),
        });
        resetForm();
        Alert.alert(
          "Recipe saved",
          isPublic
            ? "Your recipe is live in the Community Feed."
            : "Your recipe was saved privately to your account.",
          [
            { text: "Done", style: "cancel" },
            { text: "View Recipe", onPress: () => router.push(`/recipe/${ref.id}` as any) },
          ]
        );
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
    setPrepTime("");
    setServings("");
    setIsPublic(true);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={statusBarStyle()} backgroundColor={tc("#0f1115")} />
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
                  ? "Update the details, photo or visibility of your dish"
                  : "Craft and share your culinary creation"}
              </Text>
              {isEditing ? (
                <Pressable onPress={exitEditing} style={styles.cancelEdit} hitSlop={8}>
                  <FontAwesome name="times" size={12} color={tc("#a1a1aa")} />
                  <Text style={styles.cancelEditText}>Cancel editing</Text>
                </Pressable>
              ) : null}
            </View>

            {loadingRecipe ? (
              <ActivityIndicator color="#f59e0b" style={{ marginVertical: 24 }} />
            ) : null}

            {/* Cover Image Picker */}
            <Pressable style={styles.imageCard} onPress={pickImage}>
              {imageUrl.trim() ? (
                <View style={styles.imagePreviewContainer}>
                  <Image
                    source={{ uri: imageUrl.trim() }}
                    style={styles.previewImage}
                  />
                  <View style={styles.changeBadge}>
                    <FontAwesome name="pencil" size={12} color={tc("#0f1115")} />
                    <Text style={styles.changeBadgeText}>Change</Text>
                  </View>
                  <Pressable
                    style={styles.removeBadge}
                    onPress={() => setImageUrl("")}
                    hitSlop={8}
                    accessibilityLabel="Remove photo"
                  >
                    <FontAwesome name="trash" size={12} color={tc("#f4f4f5")} />
                  </Pressable>
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
                    color={isPublic ? "#f59e0b" : tc("#a1a1aa")}
                  />
                  <Text style={styles.visibilityTitle}>
                    {isPublic ? "Public Recipe" : "Private Recipe"}
                  </Text>
                </View>
                <Text style={styles.visibilitySub}>
                  {isPublic
                    ? "Shared to the Community Feed. Switch on to keep it private."
                    : "Only visible on your personal account"}
                </Text>
              </View>
              <Switch
                accessibilityLabel="Private recipe"
                trackColor={{ false: tc("#27272a"), true: "#f59e0b" }}
                thumbColor={isPublic ? "#71717a" : tc("#0f1115")}
                ios_backgroundColor={tc("#27272a")}
                onValueChange={(makePrivate) => setIsPublic(!makePrivate)}
                value={!isPublic}
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
                  maxLength={200}
                />
              </View>

              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Prep time (min)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="30"
                    placeholderTextColor="#71717a"
                    value={prepTime}
                    onChangeText={(t) => setPrepTime(t.replace(/[^0-9]/g, ""))}
                    keyboardType="number-pad"
                    maxLength={5}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Servings</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="4"
                    placeholderTextColor="#71717a"
                    value={servings}
                    onChangeText={(t) => setServings(t.replace(/[^0-9]/g, ""))}
                    keyboardType="number-pad"
                    maxLength={3}
                  />
                </View>
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
              disabled={loading || loadingRecipe}
            >
              {loading ? (
                <ActivityIndicator color={tc("#0f1115")} />
              ) : (
                <View style={styles.buttonContent}>
                  <MaterialCommunityIcons
                    name="content-save-check"
                    size={20}
                    color={tc("#0f1115")}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.submitButtonText}>{isEditing ? "Save Changes" : isPublic ? "Publish Recipe" : "Save Recipe"}</Text>
                </View>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = themedStyles({
  cancelEdit: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  cancelEditText: { color: "#a1a1aa", fontSize: 12, fontWeight: "700" },
  removeBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(15, 17, 21, 0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  rowInputs: { flexDirection: "row", gap: 12 },
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