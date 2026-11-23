import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { doc, onSnapshot, deleteDoc } from "firebase/firestore";
import { ref as storageRef, deleteObject } from "firebase/storage";
import { MaterialCommunityIcons, Ionicons, FontAwesome } from "@expo/vector-icons";
import { db, auth, storage } from "../../../../lib/firebase";
import { addItemsToList } from "../../../../lib/grocery";
import { REPORT_REASONS, blockUser, reportRecipe } from "../../../../lib/moderation";
import { useFavoriteIds } from "../../../../lib/community";
import { toggleFavoriteRecipe } from "../../../../lib/favorites";
import RecipeImage from "../../../../components/RecipeImage";
import ShareRecipeModal from "../../../../components/ShareRecipeModal"; // Adjust path to ShareRecipeModal if needed
import { themedStyles, tc, statusBarStyle, useThemeMode } from "../../../../lib/theme";

export default function RecipeModal() {
  useThemeMode();
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [recipe, setRecipe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [shareModalVisible, setShareModalVisible] = useState(false);

  const [busy, setBusy] = useState<"grocery" | "delete" | null>(null);
  const isOwner = !!recipe && recipe.userId === auth.currentUser?.uid;
  const favoriteIds = useFavoriteIds(auth.currentUser?.uid);
  const isFav = favoriteIds.has(String(id));

  const toggleFavorite = async () => {
    if (!recipe) return;
    try {
      await toggleFavoriteRecipe(
        { id: String(id), title: recipe.title, imageUrl: recipe.imageUrl || "", sourceUrl: `/recipe/${id}` },
        isFav
      );
    } catch {
      Alert.alert("Error", "Couldn't update your favorites.");
    }
  };

  // Live so edits made elsewhere show up immediately.
  useEffect(() => {
    if (!id || typeof id !== "string") {
      setLoading(false);
      return;
    }
    return onSnapshot(
      doc(db, "recipes", id),
      (snap) => {
        setRecipe(snap.exists() ? snap.data() : null);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching recipe:", error);
        setRecipe(null);
        setLoading(false);
      }
    );
  }, [id]);

  const handleAddToGrocery = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || ingredientsList.length === 0) return;
    setBusy("grocery");
    try {
      const count = await addItemsToList(uid, ingredientsList, {
        list: "grocery",
        recipeId: typeof id === "string" ? id : null,
        recipeTitle: recipe?.title || null,
      });
      Alert.alert(
        "Added to grocery list",
        `${count} ingredient${count === 1 ? "" : "s"} added.`,
        [
          { text: "OK", style: "cancel" },
          { text: "View List", onPress: () => router.push("/grocery" as any) },
        ]
      );
    } catch (err) {
      console.error("Add to grocery failed:", err);
      Alert.alert("Error", "Couldn't add ingredients to your list.");
    } finally {
      setBusy(null);
    }
  };

  const handleReport = () => {
    const uid = auth.currentUser?.uid;
    if (!uid || !recipe) return;
    Alert.alert("Report recipe", "Why are you reporting this recipe?", [
      ...REPORT_REASONS.map((reason) => ({
        text: reason,
        onPress: async () => {
          try {
            await reportRecipe(uid, { id: String(id), title: recipe.title, userId: recipe.userId }, reason);
            Alert.alert("Thanks for reporting", "We'll review this recipe within 24 hours.");
          } catch (err) {
            console.error("Report failed:", err);
            Alert.alert("Error", "Couldn't send your report. Please try again.");
          }
        },
      })),
      { text: "Cancel", style: "cancel" as const },
    ]);
  };

  const handleBlock = () => {
    const uid = auth.currentUser?.uid;
    if (!uid || !recipe?.userId) return;
    const name = recipe.createdBy || "this chef";
    Alert.alert(
      `Block ${name}?`,
      "You won't see their recipes in your feeds. You can unblock them in Settings.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            try {
              await blockUser(uid, recipe.userId, recipe.createdBy);
              if (router.canGoBack()) router.back();
              else router.replace("/community" as any);
            } catch (err) {
              console.error("Block failed:", err);
              Alert.alert("Error", "Couldn't block this chef. Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleMore = () => {
    Alert.alert(recipe?.title || "Recipe", undefined, [
      { text: "Report Recipe", onPress: handleReport },
      { text: `Block ${recipe?.createdBy || "Chef"}`, style: "destructive", onPress: handleBlock },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleEdit = () => {
    router.push({ pathname: "/(drawer)/(tabs)/three", params: { editId: String(id) } } as any);
  };

  const handleDelete = () => {
    Alert.alert("Delete recipe?", "This permanently removes the recipe for everyone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setBusy("delete");
          try {
            const imageUrl: string | undefined = recipe?.imageUrl;
            await deleteDoc(doc(db, "recipes", String(id)));
            if (imageUrl?.includes("firebasestorage")) {
              deleteObject(storageRef(storage, imageUrl)).catch(() => {});
            }
            if (router.canGoBack()) router.back();
            else router.replace("/recipes" as any);
          } catch (err) {
            console.error("Delete failed:", err);
            Alert.alert("Error", "Couldn't delete this recipe.");
            setBusy(null);
          }
        },
      },
    ]);
  };

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
        <StatusBar barStyle={statusBarStyle()} backgroundColor={tc("#0f1115")} />
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text style={styles.loadingText}>Fetching recipe details...</Text>
      </View>
    );
  }

  if (!recipe) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle={statusBarStyle()} backgroundColor={tc("#0f1115")} />
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.closeBtn} accessibilityLabel="Go back">
            <Ionicons name="chevron-back" size={20} color={tc("#f4f4f5")} />
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
      <StatusBar barStyle={statusBarStyle()} backgroundColor={tc("#0f1115")} />

      {/* Top Action Bar: back on the left, actions on the right */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/community" as any))}
          style={styles.closeBtn}
          accessibilityLabel="Go back"
          hitSlop={6}
        >
          <Ionicons name="chevron-back" size={20} color={tc("#f4f4f5")} />
        </Pressable>

        <View style={styles.topActions}>
          <Pressable
            onPress={toggleFavorite}
            style={styles.favBtn}
            accessibilityLabel={isFav ? "Remove from favorites" : "Add to favorites"}
          >
            <FontAwesome name={isFav ? "heart" : "heart-o"} size={15} color={isFav ? "#ef4444" : tc("#f4f4f5")} />
            {recipe.favoriteCount ? <Text style={styles.favCount}>{recipe.favoriteCount}</Text> : null}
          </Pressable>
          <Pressable
            onPress={() => setShareModalVisible(true)}
            style={styles.closeBtn}
            accessibilityLabel="Send to a friend"
          >
            <FontAwesome name="paper-plane-o" size={15} color={tc("#f4f4f5")} />
          </Pressable>
          {!isOwner ? (
            <Pressable
              onPress={handleMore}
              style={styles.closeBtn}
              accessibilityLabel="More options"
            >
              <Ionicons name="ellipsis-horizontal" size={18} color={tc("#f4f4f5")} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Banner / Image Header */}
        <View style={styles.imageContainer}>
          <RecipeImage
            uri={recipe.imageUrl}
            title={recipe.title || "Specialty Dish"}
            style={StyleSheet.absoluteFillObject}
            iconSize={32}
          />

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

          <Pressable
            style={styles.authorBadge}
            onPress={() => recipe.userId && router.push(`/chef/${recipe.userId}` as any)}
            accessibilityLabel="View chef profile"
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(recipe.createdBy || "C").charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.byline}>
              Created by <Text style={styles.authorName}>{formatAuthorName(recipe.createdBy)}</Text>
            </Text>
            <Ionicons name="chevron-forward" size={14} color={tc("#71717a")} />
          </Pressable>
        </View>

        {/* Quick facts */}
        {(recipe.prepTimeMinutes || recipe.servings) ? (
          <View style={styles.metaRow}>
            {recipe.prepTimeMinutes ? (
              <View style={styles.metaChip}>
                <Ionicons name="time-outline" size={14} color="#f59e0b" />
                <Text style={styles.metaChipText}>{recipe.prepTimeMinutes} min</Text>
              </View>
            ) : null}
            {recipe.servings ? (
              <View style={styles.metaChip}>
                <Ionicons name="people-outline" size={14} color="#f59e0b" />
                <Text style={styles.metaChipText}>
                  {recipe.servings} serving{recipe.servings === 1 ? "" : "s"}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Actions */}
        <View style={styles.actionRow}>
          <Pressable
            style={[styles.primaryAction, (busy || ingredientsList.length === 0) && styles.disabled]}
            onPress={handleAddToGrocery}
            disabled={!!busy || ingredientsList.length === 0}
          >
            {busy === "grocery" ? (
              <ActivityIndicator size="small" color={tc("#0f1115")} />
            ) : (
              <>
                <FontAwesome name="shopping-basket" size={14} color={tc("#0f1115")} />
                <Text style={styles.primaryActionText}>Add to Grocery List</Text>
              </>
            )}
          </Pressable>
          {isOwner ? (
            <>
              <Pressable
                style={styles.iconAction}
                onPress={handleEdit}
                disabled={!!busy}
                accessibilityLabel="Edit recipe"
              >
                <FontAwesome name="pencil" size={15} color={tc("#f4f4f5")} />
              </Pressable>
              <Pressable
                style={[styles.iconAction, styles.iconActionDanger]}
                onPress={handleDelete}
                disabled={!!busy}
                accessibilityLabel="Delete recipe"
              >
                {busy === "delete" ? (
                  <ActivityIndicator size="small" color="#ef4444" />
                ) : (
                  <FontAwesome name="trash-o" size={15} color="#ef4444" />
                )}
              </Pressable>
            </>
          ) : null}
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

const styles = themedStyles({
  disabled: { opacity: 0.5 },
  topActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  favBtn: {
    height: 36,
    minWidth: 36,
    paddingHorizontal: 11,
    borderRadius: 18,
    backgroundColor: "#181b20",
    borderWidth: 1,
    borderColor: "#27272a",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  favCount: { color: "#f4f4f5", fontWeight: "800", fontSize: 13 },
  metaRow: { flexDirection: "row", gap: 8, marginBottom: 14, flexWrap: "wrap" },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#181b20",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metaChipText: { color: "#f4f4f5", fontSize: 13, fontWeight: "600" },
  actionRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  primaryAction: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#f59e0b",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryActionText: { color: "#0f1115", fontWeight: "800", fontSize: 14 },
  iconAction: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#181b20",
    borderWidth: 1,
    borderColor: "#27272a",
    alignItems: "center",
    justifyContent: "center",
  },
  iconActionDanger: { borderColor: "rgba(239, 68, 68, 0.3)" },
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