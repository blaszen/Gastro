import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  StyleSheet,
  ActivityIndicator,
  Linking,
  SafeAreaView,
  StatusBar,
  Alert,
  RefreshControl,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { fetchUserFavorites, toggleFavoriteRecipe } from "../../../lib/favorites";

interface Recipe {
  id: string | number;
  recipeId?: string | number;
  title?: string;
  recipeTitle?: string;
  name?: string;
  caption?: string;
  image?: string;
  imageUrl?: string;
  photoUrl?: string;
  sourceUrl?: string;
  url?: string;
  readyInMinutes?: number;
  servings?: number;
  item?: any;
}

export default function FavoritesScreen() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Fetch full favorite recipes on mount and screen focus
  const loadFavoritesData = async () => {
    try {
      setLoading(true);
      const favRecipes = await fetchUserFavorites();
      setFavorites(favRecipes || []);
    } catch (err) {
      console.error("Error loading favorites:", err);
      Alert.alert("Error", "Could not load saved favorites.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadFavoritesData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadFavoritesData();
  };

  // Remove recipe from favorites (Optimistic update)
  const handleRemoveFavorite = async (recipe: Recipe) => {
    const recipeIdStr = String(recipe.recipeId || recipe.id);

    // Optimistically filter out from UI
    setFavorites((prev) =>
      prev.filter((r) => String(r.recipeId || r.id) !== recipeIdStr)
    );

    try {
      await toggleFavoriteRecipe(recipe, true);
    } catch (err) {
      console.error("Error removing favorite from Firestore:", err);
      setFavorites((prev) => [...prev, recipe]);
      Alert.alert("Error", "Failed to remove favorite. Please try again.");
    }
  };

  const openRecipeLink = (url?: string | null, recipeId?: string | number) => {
    if (url) {
      if (url.startsWith("/(")) {
        router.push(url as any);
        return;
      }
      if (url.startsWith("http")) {
        Linking.openURL(url);
        return;
      }
    }

    if (recipeId) {
      router.push(`/(modals)/recipe/${recipeId}` as any);
      return;
    }

    Alert.alert("Notice", "Recipe link not available.");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1115" />

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={styles.amberAccentBar} />
          <Text style={styles.headerTitle}>Saved Creations</Text>
        </View>
        <Text style={styles.badgeCount}>{favorites.length} Saved</Text>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#f59e0b"
            colors={["#f59e0b"]}
          />
        }
      >
        {/* LOADING STATE */}
        {loading && !refreshing && (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="small" color="#f59e0b" />
          </View>
        )}

        {/* EMPTY STATE */}
        {!loading && favorites.length === 0 && (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrapper}>
              <FontAwesome name="heart-o" size={32} color="#3f3f46" />
            </View>
            <Text style={styles.emptyTitle}>No Favorites Saved Yet</Text>
            <Text style={styles.emptySubtext}>
              Tap the heart icon on any recipe or dish creation to build your personal cookbook library.
            </Text>
          </View>
        )}

        {/* FAVORITES GRID LIST */}
        {!loading && favorites.length > 0 && (
          <View style={styles.gridContainer}>
            {favorites.map((recipe: any, index: number) => {
              const targetId = recipe.recipeId || recipe.id;
              const itemKey = targetId ? `fav-${targetId}` : `fav-idx-${index}`;

              // Dynamic property lookups to catch raw Firestore documents
              const displayTitle =
                recipe.title ||
                recipe.recipeTitle ||
                recipe.name ||
                recipe.caption ||
                recipe.item?.title ||
                recipe.item?.recipeTitle ||
                recipe.item?.name ||
                "Specialty Dish";

              const displayImage =
                recipe.image ||
                recipe.imageUrl ||
                recipe.photoUrl ||
                recipe.item?.image ||
                recipe.item?.imageUrl;

              const displayUrl =
                recipe.sourceUrl ||
                recipe.url ||
                (targetId ? `/(modals)/recipe/${targetId}` : null);

              return (
                <Pressable
                  key={itemKey}
                  style={styles.card}
                  onPress={() => openRecipeLink(displayUrl, targetId)}
                >
                  <View style={styles.imageWrapper}>
                    {displayImage ? (
                      <Image source={{ uri: displayImage }} style={styles.image} />
                    ) : (
                      <View style={styles.placeholderBanner}>
                        <View style={styles.iconCircle}>
                          <MaterialCommunityIcons name="chef-hat" size={26} color="#f59e0b" />
                        </View>
                      </View>
                    )}

                    {/* Remove Favorite Button */}
                    <Pressable
                      style={styles.favoriteBadge}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleRemoveFavorite(recipe);
                      }}
                    >
                      <FontAwesome name="heart" size={14} color="#ef4444" />
                    </Pressable>
                  </View>

                  <View style={styles.cardBody}>
                    <Text style={styles.recipeTitle} numberOfLines={2}>
                      {displayTitle}
                    </Text>

                    <View style={styles.cardFooter}>
                      <Text style={styles.savedBadge}>Bookmarked</Text>
                      <Text style={styles.linkText}>View Recipe →</Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0f1115",
  },
  container: {
    flex: 1,
    backgroundColor: "#0f1115",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#181b20",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  amberAccentBar: {
    width: 4,
    height: 18,
    backgroundColor: "#f59e0b",
    borderRadius: 2,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f4f4f5",
    letterSpacing: 0.3,
  },
  badgeCount: {
    fontSize: 12,
    fontWeight: "600",
    color: "#a1a1aa",
    backgroundColor: "#181b20",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  gridContainer: {
    marginTop: 16,
  },
  card: {
    width: "100%",
    backgroundColor: "#181b20",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  imageWrapper: {
    position: "relative",
    width: "100%",
    height: 160,
    backgroundColor: "#27272a",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholderBanner: {
    width: "100%",
    height: "100%",
    backgroundColor: "#181b20",
    justifyContent: "center",
    alignItems: "center",
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#0f1115",
    borderWidth: 1,
    borderColor: "#27272a",
    justifyContent: "center",
    alignItems: "center",
  },
  favoriteBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(15, 17, 21, 0.85)",
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: "#f59e0b",
  },
  cardBody: {
    padding: 14,
  },
  recipeTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#f4f4f5",
    lineHeight: 20,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  savedBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: "#f59e0b",
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: "#f59e0b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  linkText: {
    color: "#f59e0b",
    fontSize: 12,
    fontWeight: "600",
  },
  loaderBox: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyContainer: {
    paddingVertical: 60,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#181b20",
    borderWidth: 1,
    borderColor: "#27272a",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    color: "#f4f4f5",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptySubtext: {
    color: "#71717a",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 260,
  },
});