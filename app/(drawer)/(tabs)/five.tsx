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
  Modal,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useFocusEffect } from "@react-navigation/native";
import { fetchUserFavorites, toggleFavoriteRecipe } from "../../../lib/favorites";
import { getRecipeInformation } from "../../../lib/spoonacular";

interface ExtendedIngredient {
  id: number;
  original: string;
}

interface InstructionStep {
  number: number;
  step: string;
}

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
  instructions?: string;
  extendedIngredients?: ExtendedIngredient[];
  analyzedInstructions?: {
    steps: InstructionStep[];
  }[];
  item?: any;
}

export default function FavoritesScreen() {
  const [favorites, setFavorites] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Recipe Modal Detail States
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [recipeModalVisible, setRecipeModalVisible] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

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

    // Close modal if the deleted item is currently viewed in modal
    if (
      selectedRecipe &&
      String(selectedRecipe.recipeId || selectedRecipe.id) === recipeIdStr
    ) {
      setRecipeModalVisible(false);
    }

    try {
      await toggleFavoriteRecipe(recipe, true);
    } catch (err) {
      console.error("Error removing favorite from Firestore:", err);
      setFavorites((prev) => [...prev, recipe]);
      Alert.alert("Error", "Failed to remove favorite. Please try again.");
    }
  };

  // Handle viewing recipe details via Modal Card
  const handleViewRecipe = async (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setRecipeModalVisible(true);
    setLoadingDetails(true);

    const targetId = recipe.recipeId || recipe.id;

    if (targetId) {
      const fullDetails = await getRecipeInformation(targetId);
      if (fullDetails) {
        setSelectedRecipe((prev) => ({
          ...prev,
          ...fullDetails,
          // Preserve fallback fields if missing
          title: fullDetails.title || prev?.title,
          image: fullDetails.image || prev?.image,
        }));
      }
    }

    setLoadingDetails(false);
  };

  const handleOpenExternalLink = async (url?: string | null) => {
    if (!url) {
      Alert.alert("Notice", "External source link not available.");
      return;
    }
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error("Failed opening link:", error);
      Alert.alert("Error", "Could not open external link.");
    }
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

              // Dynamic property lookups for Firestore documents
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

              return (
                <Pressable
                  key={itemKey}
                  style={styles.card}
                  onPress={() => handleViewRecipe(recipe)}
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
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          handleViewRecipe(recipe);
                        }}
                      >
                        <Text style={styles.linkText}>View Recipe →</Text>
                      </Pressable>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* FULL RECIPE DETAIL MODAL */}
      <Modal visible={recipeModalVisible} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.recipeModalContainer}>
          <StatusBar barStyle="light-content" backgroundColor="#0f1115" />

          {/* Modal Header Controls */}
          <View style={styles.recipeModalHeader}>
            <Pressable
              style={styles.closeBtn}
              onPress={() => setRecipeModalVisible(false)}
            >
              <FontAwesome name="chevron-left" size={16} color="#f59e0b" />
              <Text style={styles.closeBtnText}>Back</Text>
            </Pressable>

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {selectedRecipe && (
                <Pressable
                  onPress={() => handleRemoveFavorite(selectedRecipe)}
                  style={{ padding: 6, marginRight: 12 }}
                >
                  <FontAwesome name="heart" size={18} color="#ef4444" />
                </Pressable>
              )}

              {selectedRecipe?.sourceUrl && (
                <Pressable
                  onPress={() => handleOpenExternalLink(selectedRecipe.sourceUrl)}
                  style={styles.externalLinkBtn}
                >
                  <FontAwesome name="external-link" size={14} color="#a1a1aa" />
                </Pressable>
              )}
            </View>
          </View>

          {selectedRecipe && (
            <ScrollView
              contentContainerStyle={{ paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Cover Image & Title */}
              {(selectedRecipe.image || selectedRecipe.imageUrl) && (
                <Image
                  source={{ uri: selectedRecipe.image || selectedRecipe.imageUrl }}
                  style={styles.recipeModalImage}
                />
              )}

              <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
                <Text style={styles.recipeModalTitle}>
                  {selectedRecipe.title ||
                    selectedRecipe.recipeTitle ||
                    selectedRecipe.name ||
                    "Specialty Dish"}
                </Text>

                {/* Quick Metrics */}
                <View style={styles.recipeMetaContainer}>
                  {selectedRecipe.readyInMinutes ? (
                    <View style={styles.recipeMetaChip}>
                      <FontAwesome name="clock-o" size={12} color="#f59e0b" />
                      <Text style={styles.recipeMetaText}>
                        {selectedRecipe.readyInMinutes} Mins
                      </Text>
                    </View>
                  ) : null}
                  {selectedRecipe.servings ? (
                    <View style={styles.recipeMetaChip}>
                      <FontAwesome name="user" size={12} color="#f59e0b" />
                      <Text style={styles.recipeMetaText}>
                        {selectedRecipe.servings} Servings
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Ingredients Section */}
                {selectedRecipe.extendedIngredients &&
                  selectedRecipe.extendedIngredients.length > 0 && (
                    <View style={styles.recipeSection}>
                      <View style={styles.titleRow}>
                        <View style={styles.amberAccentBar} />
                        <Text style={styles.sectionTitle}>Ingredients</Text>
                      </View>
                      {selectedRecipe.extendedIngredients.map((ing, idx) => (
                        <View key={ing.id || idx} style={styles.ingredientRow}>
                          <FontAwesome name="circle" size={6} color="#f59e0b" style={{ marginRight: 10 }} />
                          <Text style={styles.ingredientText}>{ing.original}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                {/* Preparation / Instructions Section */}
                <View style={styles.recipeSection}>
                  <View style={styles.titleRow}>
                    <View style={styles.amberAccentBar} />
                    <Text style={styles.sectionTitle}>Preparation Steps</Text>
                  </View>

                  {loadingDetails ? (
                    <ActivityIndicator size="small" color="#f59e0b" style={{ marginVertical: 20 }} />
                  ) : selectedRecipe?.analyzedInstructions &&
                    selectedRecipe.analyzedInstructions.length > 0 &&
                    selectedRecipe.analyzedInstructions[0].steps.length > 0 ? (
                    selectedRecipe.analyzedInstructions[0].steps.map((step) => (
                      <View key={step.number} style={styles.stepRow}>
                        <View style={styles.stepNumberBadge}>
                          <Text style={styles.stepNumberText}>{step.number}</Text>
                        </View>
                        <Text style={styles.stepText}>{step.step}</Text>
                      </View>
                    ))
                  ) : selectedRecipe?.instructions ? (
                    <Text style={styles.stepText}>
                      {selectedRecipe.instructions.replace(/<[^>]*>?/gm, "")}
                    </Text>
                  ) : (
                    <View>
                      <Text style={styles.stepText}>
                        Detailed step-by-step instructions are not directly available for this item.
                      </Text>
                      {selectedRecipe?.sourceUrl && (
                        <Pressable
                          style={{ marginTop: 10 }}
                          onPress={() => handleOpenExternalLink(selectedRecipe.sourceUrl)}
                        >
                          <Text style={{ color: "#f59e0b", fontWeight: "600" }}>
                            View full recipe source →
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </View>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
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

  // Recipe Detail Modal Styles
  recipeModalContainer: {
    flex: 1,
    backgroundColor: "#0f1115",
  },
  recipeModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#27272a",
  },
  closeBtn: {
    flexDirection: "row",
    alignItems: "center",
  },
  closeBtnText: {
    color: "#f59e0b",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  externalLinkBtn: {
    padding: 6,
  },
  recipeModalImage: {
    width: "100%",
    height: 220,
  },
  recipeModalTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 12,
  },
  recipeMetaContainer: {
    flexDirection: "row",
    marginBottom: 16,
  },
  recipeMetaChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#181b20",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  recipeMetaText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 6,
  },
  recipeSection: {
    marginTop: 16,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },
  ingredientText: {
    color: "#a1a1aa",
    fontSize: 13,
    flex: 1,
  },
  stepRow: {
    flexDirection: "row",
    marginVertical: 6,
  },
  stepNumberBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#f59e0b",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    marginTop: 2,
  },
  stepNumberText: {
    color: "#0f1115",
    fontSize: 11,
    fontWeight: "800",
  },
  stepText: {
    color: "#a1a1aa",
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
});