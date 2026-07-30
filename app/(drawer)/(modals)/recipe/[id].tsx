import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { MaterialCommunityIcons, Ionicons, FontAwesome } from "@expo/vector-icons";
import { db } from "../../../../lib/firebase";
import ShareRecipeModal from "../../../../components/ShareRecipeModal"; // Adjust path to ShareRecipeModal if needed

export default function RecipeModal() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [recipe, setRecipe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [shareModalVisible, setShareModalVisible] = useState(false);

  useEffect(() => {
    async function fetchRecipe() {
      if (!id || typeof id !== "string") return;
      try {
        const ref = doc(db, "recipes", id);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setRecipe(snap.data());
        }
      } catch (error) {
        console.error("Error fetching recipe:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchRecipe();
  }, [id]);

  const formatAuthorName = (name: string) => {
    if (!name) return "Chef";
    if (name.includes("@")) return name.split("@")[0];
    return name;
  };

  const ingredientsList: string[] = Array.isArray(recipe?.ingredients)
    ? recipe.ingredients
    : recipe?.ingredients
    ? String(recipe.ingredients).split(",").map((item) => item.trim()).filter(Boolean)
    : [];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#0f1115" />
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text style={styles.loadingText}>Fetching recipe details...</Text>
      </View>
    );
  }

  if (!recipe) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#0f1115" />
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color="#a1a1aa" />
          </Pressable>
        </View>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconBg}>
            <MaterialCommunityIcons name="silverware-fork-knife" size={24} color="#f59e0b" />
          </View>
          <Text style={styles.emptyTitle}>Recipe Not Found</Text>
          <Text style={styles.emptyText}>
            This recipe may have been deleted or is currently unavailable.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1115" />

      {/* Top Action Bar */}
      <View style={styles.topBar}>
        {/* Share Button */}
        <Pressable
          onPress={() => setShareModalVisible(true)}
          style={({ pressed }) => [styles.shareBtn, pressed && styles.pressed]}
        >
          <FontAwesome name="share-alt" size={13} color="#f59e0b" />
          <Text style={styles.shareBtnText}>Share</Text>
        </Pressable>

        {/* Close Button */}
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
        >
          <Ionicons name="close" size={20} color="#a1a1aa" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Banner / Image Header */}
        <View style={styles.imageContainer}>
          {recipe.imageUrl ? (
            <Image source={{ uri: recipe.imageUrl }} style={styles.image} />
          ) : (
            <View style={styles.placeholderBanner}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="chef-hat" size={32} color="#f59e0b" />
              </View>
              <Text style={styles.placeholderTag} numberOfLines={1}>
                {recipe.title || "Specialty Dish"}
              </Text>
            </View>
          )}

          {/* Privacy Status Badge */}
          <View style={styles.privacyBadge}>
            <Ionicons
              name={recipe.isPublic ? "globe-outline" : "lock-closed-outline"}
              size={12}
              color="#f59e0b"
              style={{ marginRight: 4 }}
            />
            <Text style={styles.privacyBadgeText}>
              {recipe.isPublic ? "Public" : "Private"}
            </Text>
          </View>
        </View>

        {/* Title & Author Meta Header */}
        <View style={styles.detailsHeader}>
          <Text style={styles.title}>{recipe.title || "Untitled Recipe"}</Text>

          <View style={styles.authorBadge}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(recipe.createdBy || "C").charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.byline}>
              Created by <Text style={styles.authorName}>{formatAuthorName(recipe.createdBy)}</Text>
            </Text>
          </View>
        </View>

        {/* Ingredients Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <MaterialCommunityIcons name="silverware-fork-knife" size={18} color="#f59e0b" />
            <Text style={styles.sectionTitle}>Ingredients</Text>
            <View style={styles.countPill}>
              <Text style={styles.countPillText}>{ingredientsList.length}</Text>
            </View>
          </View>

          {ingredientsList.length > 0 ? (
            <View style={styles.listCard}>
              {ingredientsList.map((item, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.ingredientRow,
                    idx === ingredientsList.length - 1 && styles.noBorder,
                  ]}
                >
                  <View style={styles.bulletDot} />
                  <Text style={styles.ingredientText}>{item}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noDataText}>No ingredients listed.</Text>
          )}
        </View>

        {/* Instructions Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <MaterialCommunityIcons name="book-open-outline" size={18} color="#f59e0b" />
            <Text style={styles.sectionTitle}>Instructions</Text>
          </View>

          <View style={styles.listCard}>
            <Text style={styles.instructionsText}>
              {recipe.instructions || "No instructions provided for this recipe."}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Share Modal */}
      <ShareRecipeModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        recipe={{
          id: (typeof id === "string" ? id : "") || "",
          title: recipe.title || "Untitled Recipe",
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0f1115",
  },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  shareBtnText: {
    color: "#f59e0b",
    fontSize: 12,
    fontWeight: "700",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#181b20",
    borderWidth: 1,
    borderColor: "#27272a",
    justifyContent: "center",
    alignItems: "center",
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f1115",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#a1a1aa",
    fontWeight: "600",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },

  // Image Area
  imageContainer: {
    width: "100%",
    height: 210,
    borderRadius: 18,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#181b20",
    borderWidth: 1,
    borderColor: "#27272a",
    marginBottom: 20,
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  placeholderBanner: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#0f1115",
    borderWidth: 1,
    borderColor: "#27272a",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  placeholderTag: {
    fontSize: 14,
    fontWeight: "700",
    color: "#f59e0b",
    textTransform: "capitalize",
  },
  privacyBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(15, 17, 21, 0.85)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: "#27272a",
  },
  privacyBadgeText: {
    color: "#f4f4f5",
    fontSize: 11,
    fontWeight: "600",
  },

  // Details Header
  detailsHeader: {
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#f4f4f5",
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  authorBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#0f1115",
    borderWidth: 1,
    borderColor: "#f59e0b",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#f59e0b",
  },
  byline: {
    color: "#a1a1aa",
    fontSize: 13,
    fontWeight: "500",
  },
  authorName: {
    color: "#f4f4f5",
    fontWeight: "700",
  },

  // Sections
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f4f4f5",
    letterSpacing: -0.3,
  },
  countPill: {
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: "#f59e0b",
    marginLeft: 4,
  },
  countPillText: {
    color: "#f59e0b",
    fontSize: 11,
    fontWeight: "700",
  },

  // Cards
  listCard: {
    backgroundColor: "#181b20",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#27272a",
    padding: 16,
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#27272a",
  },
  noBorder: {
    borderBottomWidth: 0,
    paddingBottom: 2,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#f59e0b",
    marginRight: 12,
  },
  ingredientText: {
    color: "#e4e4e7",
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  instructionsText: {
    color: "#e4e4e7",
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "400",
  },
  noDataText: {
    color: "#71717a",
    fontSize: 13,
    fontStyle: "italic",
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  emptyIconBg: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#181b20",
    borderWidth: 1,
    borderColor: "#27272a",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f4f4f5",
  },
  emptyText: {
    fontSize: 13,
    color: "#71717a",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
    maxWidth: 240,
  },
});