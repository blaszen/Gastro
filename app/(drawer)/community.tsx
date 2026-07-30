import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { MaterialCommunityIcons, Ionicons, FontAwesome } from "@expo/vector-icons";
import { db } from "../../lib/firebase";
import { fetchUserFavorites, toggleFavoriteRecipe } from "../../lib/favorites";

export default function CommunityFeedModal() {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Load existing favorites to highlight saved hearts
  useEffect(() => {
    async function loadFavorites() {
      try {
        const favs = await fetchUserFavorites();
        const ids = new Set<string>(
          (favs || []).map((f: any) => String(f.recipeId || f.id))
        );
        setFavoriteIds(ids);
      } catch (err) {
        console.error("Error loading user favorites:", err);
      }
    }
    loadFavorites();
  }, []);

  useEffect(() => {
    // Query ONLY public recipes
    const communityQuery = query(
      collection(db, "recipes"),
      where("isPublic", "==", true),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      communityQuery,
      (snapshot) => {
        const data = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter((recipe: any) => recipe.isPublic === true);

        setRecipes(data);
        setLoading(false);
      },
      (error) => {
        console.error("Firestore community feed error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleToggleFavorite = async (item: any) => {
    const itemIdStr = String(item.id);
    const isCurrentlyFav = favoriteIds.has(itemIdStr);

    // Optimistic UI update
    setFavoriteIds((prev) => {
      const updated = new Set(prev);
      if (isCurrentlyFav) {
        updated.delete(itemIdStr);
      } else {
        updated.add(itemIdStr);
      }
      return updated;
    });

    try {
      const displayTitle =
        item.title || item.recipeTitle || item.name || item.caption || "Specialty Dish";
      const displayImage = item.imageUrl || item.image || item.photoUrl || "";

      // Standardize payload with explicit fallback keys for Firestore
      const favPayload = {
        id: itemIdStr,
        recipeId: itemIdStr,
        title: displayTitle,
        recipeTitle: displayTitle,
        name: displayTitle,
        image: displayImage,
        imageUrl: displayImage,
        photoUrl: displayImage,
        sourceUrl: `/(modals)/recipe/${item.id}`,
        url: `/(modals)/recipe/${item.id}`,
        isCustom: true,
      };

      await toggleFavoriteRecipe(favPayload, isCurrentlyFav);
    } catch (err) {
      console.error("Failed to toggle favorite:", err);
      // Revert if error occurs
      setFavoriteIds((prev) => {
        const updated = new Set(prev);
        if (isCurrentlyFav) {
          updated.add(itemIdStr);
        } else {
          updated.delete(itemIdStr);
        }
        return updated;
      });
    }
  };

  const formatTimeAgo = (timestamp: any) => {
    if (!timestamp) return "Recently";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const formatAuthorName = (name: string) => {
    if (!name) return "Chef";
    if (name.includes("@")) return name.split("@")[0];
    if (name.length > 14) return `${name.slice(0, 10)}...`;
    return name;
  };

  const renderRecipeCard = ({ item }: { item: any }) => {
    const ingredientCount = Array.isArray(item.ingredients)
      ? item.ingredients.length
      : item.ingredients
      ? String(item.ingredients).split(",").filter(Boolean).length
      : 0;

    const isFav = favoriteIds.has(String(item.id));

    return (
      <Pressable
        onPress={() => router.push(`/(modals)/recipe/${item.id}` as any)}
        style={({ pressed }) => [
          styles.card,
          pressed && styles.cardPressed,
        ]}
      >
        {/* Card Header / Image Area */}
        <View style={styles.imageContainer}>
          {item.imageUrl || item.image ? (
            <Image source={{ uri: item.imageUrl || item.image }} style={styles.image} />
          ) : (
            <View style={styles.placeholderBanner}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="chef-hat" size={26} color="#f59e0b" />
              </View>
              <Text style={styles.placeholderTag} numberOfLines={1}>
                {item.title || item.name || "Specialty Dish"}
              </Text>
            </View>
          )}

          {/* Time Badge */}
          <View style={styles.timeBadge}>
            <Ionicons name="time-outline" size={12} color="#f4f4f5" style={{ marginRight: 4 }} />
            <Text style={styles.timeBadgeText}>
              {formatTimeAgo(item.createdAt)}
            </Text>
          </View>

          {/* Heart Favorite Button */}
          <Pressable
            style={styles.favoriteButton}
            onPress={(e) => {
              e.stopPropagation();
              handleToggleFavorite(item);
            }}
          >
            <FontAwesome
              name={isFav ? "heart" : "heart-o"}
              size={15}
              color={isFav ? "#ef4444" : "#a1a1aa"}
            />
          </Pressable>
        </View>

        {/* Card Details */}
        <View style={styles.cardDetails}>
          <Text style={styles.title} numberOfLines={1}>
            {item.title || item.name || "Untitled Recipe"}
          </Text>

          <View style={styles.metaRow}>
            {/* Author Tag */}
            <View style={styles.authorBadge}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(item.createdBy || "C").charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.byline} numberOfLines={1}>
                {formatAuthorName(item.createdBy)}
              </Text>
            </View>

            {/* Ingredient Count Badge */}
            <View style={styles.ingredientBadge}>
              <MaterialCommunityIcons
                name="silverware-fork-knife"
                size={12}
                color="#f59e0b"
                style={{ marginRight: 4 }}
              />
              <Text style={styles.ingredientBadgeText}>
                {ingredientCount} {ingredientCount === 1 ? "item" : "items"}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#0f1115" />
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text style={styles.loadingText}>Gathering community dishes...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1115" />
      <FlatList
        data={recipes}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderRecipeCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              Community Feed<Text style={styles.brandDot}>.</Text>
            </Text>
            <Text style={styles.headerSubtitle}>
              Explore public creations from other chefs
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBg}>
              <FontAwesome name="globe" size={24} color="#f59e0b" />
            </View>
            <Text style={styles.emptyTitle}>No Public Recipes</Text>
            <Text style={styles.emptyText}>
              No community dishes found yet. Share one of your recipes to get things started!
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0f1115",
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
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#f4f4f5",
    letterSpacing: -0.6,
  },
  brandDot: {
    color: "#f59e0b",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#a1a1aa",
    marginTop: 2,
  },
  card: {
    width: "100%",
    backgroundColor: "#181b20",
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#27272a",
    marginBottom: 16,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  imageContainer: {
    width: "100%",
    height: 170,
    position: "relative",
    backgroundColor: "#27272a",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  placeholderBanner: {
    width: "100%",
    height: "100%",
    backgroundColor: "#181b20",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#0f1115",
    borderWidth: 1,
    borderColor: "#27272a",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  placeholderTag: {
    fontSize: 13,
    fontWeight: "700",
    color: "#f59e0b",
    textTransform: "capitalize",
  },
  timeBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(15, 17, 21, 0.85)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: "#27272a",
  },
  timeBadgeText: {
    color: "#f4f4f5",
    fontSize: 11,
    fontWeight: "600",
  },
  favoriteButton: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(15, 17, 21, 0.85)",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: "#27272a",
  },
  cardDetails: {
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f4f4f5",
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  authorBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#0f1115",
    borderWidth: 1,
    borderColor: "#f59e0b",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  avatarText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#f59e0b",
  },
  byline: {
    color: "#a1a1aa",
    fontSize: 13,
    fontWeight: "600",
  },
  ingredientBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: "#f59e0b",
  },
  ingredientBadgeText: {
    color: "#f59e0b",
    fontSize: 12,
    fontWeight: "700",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
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