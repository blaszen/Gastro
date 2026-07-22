// app/(drawer)/(tabs)/two.tsx
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
import { useNavigation, DrawerActions } from "@react-navigation/native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { signOut } from "firebase/auth";
import { auth } from "../../../lib/firebase";
import { searchRecipes } from "../../../lib/spoonacular";

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

  // LOGOUT
  const onLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.log("Logout error:", err);
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
      const cardWidth = 190;
      const marginRight = 14;
      const scrollX = lastScrollIndex * (cardWidth + marginRight);
      scrollRef.current.scrollTo({ x: scrollX, animated: true });
    }
  }, [recipeResults]);

  // CATEGORIES
  const categories = ["Breakfast", "Lunch", "Dinner", "Snacks", "Desserts"];
  const spoonacularTypes = ["breakfast", "main course", "main course", "snack", "dessert"];

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            style={styles.profileButton}
          >
            <Image
              style={styles.avatar}
              source={{
                uri: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?q=80&w=200",
              }}
            />
            <View>
              <Text style={styles.greeting}>Welcome back,</Text>
              <Text style={styles.username}>Chef Josh</Text>
            </View>
          </Pressable>

          <Pressable style={styles.iconButton} onPress={onLogout}>
            <FontAwesome name="bell-o" size={20} color="#0f172a" />
          </Pressable>
        </View>

        {/* SEARCH BAR */}
        <View style={styles.searchContainer}>
          <FontAwesome name="search" size={16} color="#64748b" style={styles.searchIcon} />
          <TextInput
            placeholder="Search recipes or ingredients..."
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => fetchSpoonacular(true)}
            placeholderTextColor="#94a3b8"
            style={styles.searchInput}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <FontAwesome name="times-circle" size={16} color="#94a3b8" />
            </Pressable>
          )}
        </View>

        {/* NO RESULTS / LOADING */}
        {!loading && noResults && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No recipes found for your query.</Text>
            <Text style={styles.emptySubtext}>Try checking your spelling or using different keywords.</Text>
          </View>
        )}

        {loading && (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="small" color="#2563eb" />
          </View>
        )}

        {/* SEARCH RESULTS FEED */}
        {recipeResults.length > 0 && (
          <View style={styles.sectionMargin}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {activeCategory ? `${activeCategory} Recipes` : "Search Results"}
              </Text>
              <Text style={styles.resultsCount}>{totalResults} items</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingLeft: 20, paddingRight: 8 }}
              ref={scrollRef}
            >
              {recipeResults.map((item) => (
                <View key={item.id} style={styles.resultCard}>
                  <Image source={{ uri: item.image }} style={styles.resultImage} />
                  <View style={styles.resultContent}>
                    <Text style={styles.resultTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Pressable
                      style={styles.resultButton}
                      onPress={() => {
                        if (item.sourceUrl) Linking.openURL(item.sourceUrl);
                        else Alert.alert("Notice", "Source URL not available for this recipe.");
                      }}
                    >
                      <Text style={styles.resultButtonText}>View Recipe</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </ScrollView>

            {!loading && recipeResults.length < totalResults && (
              <Pressable
                onPress={() => fetchSpoonacular(false)}
                style={styles.moreButton}
              >
                <Text style={styles.moreButtonText}>Load More Results</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* CATEGORIES */}
        <Text style={styles.sectionTitleHeader}>Categories</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingLeft: 20, paddingRight: 8 }}
        >
          {categories.map((cat, i) => {
            const isActive = activeCategory === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => fetchSpoonacularCategory(cat, spoonacularTypes[i])}
                style={[
                  styles.categoryCard,
                  isActive && styles.categoryCardActive,
                ]}
              >
                <Text
                  style={[
                    styles.categoryText,
                    isActive && styles.categoryTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* POPULAR CHEFS */}
        <Text style={styles.sectionTitleHeader}>Featured Chefs</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingLeft: 20, paddingRight: 8 }}
        >
          {[1, 2, 3, 4, 5].map((chef) => (
            <View key={chef} style={styles.chefCard}>
              <Image
                source={{
                  uri: `https://randomuser.me/api/portraits/men/${chef + 30}.jpg`,
                }}
                style={styles.chefAvatar}
              />
              <Text style={styles.chefName}>Chef {chef}</Text>
            </View>
          ))}
        </ScrollView>

        {/* SIMPLE RECIPES */}
        <Text style={styles.sectionTitleHeader}>Simple & Easy Recipes</Text>
        <View style={{ paddingHorizontal: 20 }}>
          {simpleRecipes.map((r) => (
            <View key={r.id} style={styles.simpleCard}>
              <Image source={{ uri: r.image }} style={styles.simpleImage} />
              <View style={styles.simpleCardBody}>
                <Text style={styles.simpleTitle} numberOfLines={2}>
                  {r.title}
                </Text>
                <Pressable
                  style={styles.simpleButton}
                  onPress={() => {
                    if (r.sourceUrl) Linking.openURL(r.sourceUrl);
                    else Alert.alert("Notice", "Source URL not available for this recipe.");
                  }}
                >
                  <Text style={styles.simpleButtonText}>View Recipe</Text>
                </Pressable>
              </View>
            </View>
          ))}
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
    backgroundColor: "#ffffff",
  },
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  profileButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
  },
  greeting: {
    fontSize: 12,
    color: "#64748b",
    marginLeft: 12,
  },
  username: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },

  // Search Input
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#0f172a",
  },

  // Section Headers
  sectionMargin: {
    marginTop: 8,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  sectionTitleHeader: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    marginHorizontal: 20,
    marginTop: 22,
    marginBottom: 12,
  },
  resultsCount: {
    fontSize: 12,
    color: "#64748b",
  },

  // Search Horizontal Results Card
  resultCard: {
    width: 190,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    marginRight: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  resultImage: {
    width: "100%",
    height: 120,
    backgroundColor: "#f1f5f9",
  },
  resultContent: {
    padding: 10,
    justifyContent: "space-between",
    flex: 1,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
    lineHeight: 18,
    marginBottom: 8,
  },
  resultButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: "center",
  },
  resultButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },

  // Categories
  categoryCard: {
    backgroundColor: "#f1f5f9",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  categoryCardActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  categoryText: {
    fontWeight: "600",
    color: "#475569",
    fontSize: 14,
  },
  categoryTextActive: {
    color: "#ffffff",
  },

  // Featured Chefs
  chefCard: {
    alignItems: "center",
    marginRight: 18,
  },
  chefAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: "#2563eb",
  },
  chefName: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
  },

  // Simple Recipes (Vertical Full Cards)
  simpleCard: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  simpleImage: {
    width: "100%",
    height: 180,
    backgroundColor: "#f1f5f9",
  },
  simpleCardBody: {
    padding: 14,
  },
  simpleTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 10,
  },
  simpleButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  simpleButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },

  // Pagination & Loaders
  moreButton: {
    marginTop: 12,
    alignSelf: "center",
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: "#f1f5f9",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  moreButtonText: {
    color: "#334155",
    fontWeight: "600",
    fontSize: 13,
  },
  emptyContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: "center",
  },
  emptyText: {
    color: "#64748b",
    fontSize: 14,
    fontWeight: "600",
  },
  emptySubtext: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 2,
  },
  loaderBox: {
    paddingVertical: 12,
  },
});