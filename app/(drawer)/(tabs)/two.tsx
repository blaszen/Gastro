import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Linking,
  SafeAreaView,
  StatusBar,
  Alert,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { signOut } from "firebase/auth";
import { auth } from "../../../lib/firebase";
import { searchRecipes } from "../../../lib/spoonacular";
import { fetchUserFavorites, toggleFavoriteRecipe } from "../../../lib/favorites";
import { useRouter } from "expo-router";
import { DrawerActions, useNavigation } from "@react-navigation/native";

export default function TwoScreen() {
  const navigation = useNavigation();

  // STATE
  const [search, setSearch] = useState("");
  const [recipeResults, setRecipeResults] = useState<any[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // FAVORITES STATE
  const [favorites, setFavorites] = useState<string[]>([]);

  // Load user's initial favorites from Firestore
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const favIds = await fetchUserFavorites();
        setFavorites(favIds);
      } catch (err) {
        console.log("Error loading favorites:", err);
      }
    };
    loadFavorites();
  }, []);

  // Handle favorite toggle (Optimistic Update)
  const handleToggleFavorite = async (recipe: any) => {
    const recipeIdStr = String(recipe.id);
    const isCurrentlyFav = favorites.includes(recipeIdStr);

    // Optimistically update local UI state immediately
    setFavorites((prev) =>
      isCurrentlyFav
        ? prev.filter((id) => id !== recipeIdStr)
        : [...prev, recipeIdStr]
    );

    try {
      // Sync with Firestore
      await toggleFavoriteRecipe(recipe, isCurrentlyFav);
    } catch (err) {
      console.log("Error updating favorite in Firestore:", err);
      // Revert local state if sync fails
      setFavorites((prev) =>
        isCurrentlyFav
          ? [...prev, recipeIdStr]
          : prev.filter((id) => id !== recipeIdStr)
      );
      Alert.alert("Error", "Could not update favorites. Please try again.");
    }
  };

// LOGOUT
const handleLogout = async () => {
  try {
    // 1. Sign out of Firebase
    await signOut(auth);

    // 2. Reset navigation stack to Login screen
    navigation.reset({
      index: 0,
      routes: [{ name: "Login" as never }], // Replace "Login" with your exact login route name
    });
  } catch (err) {
    console.error("Logout error:", err);
    Alert.alert("Logout Error", "Unable to sign out. Please try again.");
  }
};

  // Scroll Ref for Search Results
  const scrollRef = useRef<ScrollView>(null);
  const [lastScrollIndex, setLastScrollIndex] = useState(0);

  // MAIN SEARCH FUNCTION
  const fetchSpoonacular = async (newSearch = false) => {
    if (search.trim().length === 0) return;

    setLoading(true);
    setNoResults(false);
    setActiveCategory(null);

    const newOffset = newSearch ? 0 : offset;
    const data = await searchRecipes(search, newOffset);

    if (!data?.results || data.results.length === 0) {
      setNoResults(true);
      setRecipeResults([]);
    } else {
      if (newSearch) {
        setRecipeResults(data.results);
        setOffset(10);
        setLastScrollIndex(0);
      } else {
        setRecipeResults((prev) => [...prev, ...data.results]);
        setLastScrollIndex(offset);
        setOffset(offset + 10);
      }
      setTotalResults(data.totalResults);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (lastScrollIndex > 0 && scrollRef.current) {
      const cardWidth = 220;
      const marginRight = 14;
      const scrollX = lastScrollIndex * (cardWidth + marginRight);
      scrollRef.current.scrollTo({ x: scrollX, animated: true });
    }
  }, [recipeResults]);

  // CATEGORIES WITH ICONS
  const categories = [
    { name: "Breakfast", icon: "coffee", type: "breakfast" },
    { name: "Lunch", icon: "cutlery", type: "main course" },
    { name: "Dinner", icon: "moon-o", type: "main course" },
    { name: "Snacks", icon: "apple", type: "snack" },
    { name: "Desserts", icon: "birthday-cake", type: "dessert" },
  ];

  const fetchSpoonacularCategory = async (catName: string, type: string) => {
    setLoading(true);
    setNoResults(false);
    setActiveCategory(catName);

    const data = await searchRecipes(catName, 0, type);
    if (!data?.results || data.results.length === 0) {
      setNoResults(true);
      setRecipeResults([]);
    } else {
      setRecipeResults(data.results);
      setOffset(10);
      setTotalResults(data.totalResults);
    }
    setLoading(false);
  };

  // SIMPLE RECIPES
  const [simpleRecipes, setSimpleRecipes] = useState<any[]>([]);
  const [simpleOffset, setSimpleOffset] = useState(0);
  const [simpleLoading, setSimpleLoading] = useState(false);

  const fetchSimpleRecipes = async (newSearch = false) => {
    setSimpleLoading(true);
    const currentOffset = newSearch ? 0 : simpleOffset;
    const data = await searchRecipes("easy", currentOffset);

    if (data?.results) {
      if (newSearch) {
        setSimpleRecipes(data.results);
        setSimpleOffset(10);
      } else {
        setSimpleRecipes((prev) => [...prev, ...data.results]);
        setSimpleOffset(currentOffset + 10);
      }
    }
    setSimpleLoading(false);
  };

  useEffect(() => {
    fetchSimpleRecipes(true);
  }, []);

  const openRecipeLink = (url?: string) => {
    if (url) Linking.openURL(url);
    else Alert.alert("Notice", "Source URL not available for this recipe.");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1115" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 50 }}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            style={styles.profileButton}
          >
            <View style={styles.avatarWrapper}>
              <Image
                style={styles.avatar}
                source={{
                  uri: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?q=80&w=200",
                }}
              />
              <View style={styles.onlineBadge} />
            </View>
            <View style={styles.profileText}>
              <Text style={styles.greeting}>Head Chef</Text>
              <Text style={styles.username}>Chef Josh</Text>
            </View>
          </Pressable>

          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <FontAwesome name="sign-out" size={15} color="#ef4444" />
          </Pressable>
        </View>

        {/* SEARCH BAR */}
        <View style={styles.searchWrapper}>
          <View style={styles.searchContainer}>
            <FontAwesome name="search" size={14} color="#71717a" style={styles.searchIcon} />
            <TextInput
              placeholder="Search recipes, ingredients, or techniques..."
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={() => fetchSpoonacular(true)}
              placeholderTextColor="#71717a"
              style={styles.searchInput}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch("")} style={styles.clearButton}>
                <FontAwesome name="times-circle" size={14} color="#71717a" />
              </Pressable>
            )}
          </View>
        </View>

        {/* NO RESULTS / LOADING STATES */}
        {!loading && noResults && (
          <View style={styles.emptyContainer}>
            <FontAwesome name="search-minus" size={32} color="#3f3f46" />
            <Text style={styles.emptyText}>No creations found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your keywords or categories.</Text>
          </View>
        )}

        {loading && (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="small" color="#f59e0b" />
          </View>
        )}

        {/* SEARCH / CATEGORY RESULTS FEED */}
        {recipeResults.length > 0 && (
          <View style={styles.sectionMargin}>
            <View style={styles.sectionHeader}>
              <View style={styles.titleRow}>
                <View style={styles.amberAccentBar} />
                <Text style={styles.sectionTitle}>
                  {activeCategory ? `${activeCategory} Specials` : "Search Results"}
                </Text>
              </View>
              <Text style={styles.resultsCount}>{totalResults} items</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingLeft: 20, paddingRight: 8 }}
              ref={scrollRef}
            >
              {recipeResults.map((item) => {
                const isFav = favorites.includes(String(item.id));
                return (
                  <Pressable
                    key={item.id}
                    style={styles.resultCard}
                    onPress={() => openRecipeLink(item.sourceUrl)}
                  >
                    <View style={styles.imageContainer}>
                      <Image source={{ uri: item.image }} style={styles.resultImage} />
                      {/* Favorite Button */}
                      <Pressable
                        style={styles.favoriteBadge}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(item);
                        }}
                      >
                        <FontAwesome
                          name={isFav ? "heart" : "heart-o"}
                          size={14}
                          color={isFav ? "#ef4444" : "#f59e0b"}
                        />
                      </Pressable>
                    </View>
                    <View style={styles.resultContent}>
                      <Text style={styles.resultTitle} numberOfLines={2}>
                        {item.title}
                      </Text>
                      <Text style={styles.actionLinkText}>View Recipe →</Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>

            {!loading && recipeResults.length < totalResults && (
              <Pressable
                onPress={() => fetchSpoonacular(false)}
                style={styles.moreButton}
              >
                <Text style={styles.moreButtonText}>Load More</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* CATEGORIES */}
        <View style={styles.sectionHeaderWithBar}>
          <View style={styles.amberAccentBar} />
          <Text style={styles.sectionTitleHeader}>Categories</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingLeft: 20, paddingRight: 8 }}
        >
          {categories.map((cat) => {
            const isActive = activeCategory === cat.name;
            return (
              <Pressable
                key={cat.name}
                onPress={() => fetchSpoonacularCategory(cat.name, cat.type)}
                style={[
                  styles.categoryCard,
                  isActive && styles.categoryCardActive,
                ]}
              >
                <FontAwesome
                  name={cat.icon as any}
                  size={13}
                  color={isActive ? "#0f1115" : "#a1a1aa"}
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={[
                    styles.categoryText,
                    isActive && styles.categoryTextActive,
                  ]}
                >
                  {cat.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* FEATURED CHEFS */}
        <View style={styles.sectionHeaderWithBar}>
          <View style={styles.amberAccentBar} />
          <Text style={styles.sectionTitleHeader}>Featured Chefs</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingLeft: 20, paddingRight: 8 }}
        >
          {[1, 2, 3, 4, 5].map((chef) => (
            <View key={chef} style={styles.chefCard}>
              <View style={styles.chefAvatarWrapper}>
                <Image
                  source={{
                    uri: `https://randomuser.me/api/portraits/men/${chef + 30}.jpg`,
                  }}
                  style={styles.chefAvatar}
                />
              </View>
              <Text style={styles.chefName}>Chef {chef}</Text>
            </View>
          ))}
        </ScrollView>

        {/* SIMPLE & EASY RECIPES (Vertical Feed) */}
        <View style={styles.sectionHeaderWithBar}>
          <View style={styles.amberAccentBar} />
          <Text style={styles.sectionTitleHeader}>Scratch-Made & Easy</Text>
        </View>
        <View style={{ paddingHorizontal: 20 }}>
          {simpleRecipes.map((r) => {
            const isFav = favorites.includes(String(r.id));
            return (
              <Pressable
                key={r.id}
                style={styles.simpleCard}
                onPress={() => openRecipeLink(r.sourceUrl)}
              >
                <View style={styles.imageContainer}>
                  <Image source={{ uri: r.image }} style={styles.simpleImage} />
                  {/* Favorite Button */}
                  <Pressable
                    style={styles.favoriteBadge}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleToggleFavorite(r);
                    }}
                  >
                    <FontAwesome
                      name={isFav ? "heart" : "heart-o"}
                      size={15}
                      color={isFav ? "#ef4444" : "#f59e0b"}
                    />
                  </Pressable>
                </View>
                <View style={styles.simpleCardBody}>
                  <Text style={styles.simpleTitle} numberOfLines={2}>
                    {r.title}
                  </Text>
                  <View style={styles.simpleCardFooter}>
                    <Text style={styles.easyBadge}>Quick & Easy</Text>
                    <Text style={styles.simpleButtonText}>View Recipe →</Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        {!simpleLoading && simpleRecipes.length >= 10 && (
          <Pressable
            onPress={() => fetchSimpleRecipes(false)}
            style={styles.moreButton}
          >
            <Text style={styles.moreButtonText}>Discover More</Text>
          </Pressable>
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

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  profileButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarWrapper: {
    position: "relative",
    borderWidth: 1.5,
    borderColor: "#f59e0b",
    borderRadius: 25,
    padding: 2,
    backgroundColor: "#181b20",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  onlineBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22c55e",
    borderWidth: 2,
    borderColor: "#0f1115",
  },
  profileText: {
    marginLeft: 12,
  },
  greeting: {
    fontSize: 11,
    fontWeight: "600",
    color: "#f59e0b",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  username: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f4f4f5",
    marginTop: 1,
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#181b20",
    borderWidth: 1,
    borderColor: "#27272a",
    justifyContent: "center",
    alignItems: "center",
  },

  // Search Bar
  searchWrapper: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#181b20",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#f4f4f5",
  },
  clearButton: {
    padding: 4,
  },

  // Titles & Section Headers
  sectionMargin: {
    marginTop: 8,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 14,
  },
  sectionHeaderWithBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  amberAccentBar: {
    width: 4,
    height: 16,
    backgroundColor: "#f59e0b",
    borderRadius: 2,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f4f4f5",
    letterSpacing: 0.3,
  },
  sectionTitleHeader: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f4f4f5",
    letterSpacing: 0.3,
  },
  resultsCount: {
    fontSize: 12,
    fontWeight: "600",
    color: "#a1a1aa",
  },

  // Horizontal Result Cards
  resultCard: {
    width: 210,
    backgroundColor: "#181b20",
    borderRadius: 16,
    marginRight: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#27272a",
    marginBottom: 8,
  },
  imageContainer: {
    position: "relative",
  },
  resultImage: {
    width: "100%",
    height: 130,
    backgroundColor: "#27272a",
  },
  favoriteBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(15, 17, 21, 0.85)",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: "#f59e0b",
  },
  resultContent: {
    padding: 12,
    justifyContent: "space-between",
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#f4f4f5",
    lineHeight: 19,
    marginBottom: 8,
  },
  actionLinkText: {
    color: "#f59e0b",
    fontSize: 12,
    fontWeight: "600",
  },

  // Categories
  categoryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#181b20",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  categoryCardActive: {
    backgroundColor: "#f59e0b",
    borderColor: "#f59e0b",
  },
  categoryText: {
    fontWeight: "600",
    color: "#a1a1aa",
    fontSize: 13,
  },
  categoryTextActive: {
    color: "#0f1115",
    fontWeight: "700",
  },

  // Chefs
  chefCard: {
    alignItems: "center",
    marginRight: 18,
  },
  chefAvatarWrapper: {
    padding: 2,
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: "#f59e0b",
  },
  chefAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  chefName: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "600",
    color: "#a1a1aa",
  },

  // Simple Recipes (Vertical Cards)
  simpleCard: {
    width: "100%",
    backgroundColor: "#181b20",
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  simpleImage: {
    width: "100%",
    height: 160,
    backgroundColor: "#27272a",
  },
  simpleCardBody: {
    padding: 14,
  },
  simpleTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#f4f4f5",
    marginBottom: 10,
    lineHeight: 20,
  },
  simpleCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  easyBadge: {
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
  simpleButtonText: {
    color: "#f59e0b",
    fontSize: 12,
    fontWeight: "600",
  },

  // Utility Buttons / Empty States
  moreButton: {
    marginTop: 12,
    alignSelf: "center",
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: "#181b20",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  moreButtonText: {
    color: "#f59e0b",
    fontWeight: "600",
    fontSize: 13,
  },
  emptyContainer: {
    paddingHorizontal: 20,
    paddingVertical: 32,
    alignItems: "center",
  },
  emptyText: {
    color: "#f4f4f5",
    fontSize: 15,
    fontWeight: "600",
    marginTop: 8,
  },
  emptySubtext: {
    color: "#71717a",
    fontSize: 13,
    marginTop: 2,
  },
  loaderBox: {
    paddingVertical: 16,
  },
});