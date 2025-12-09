// app/(drawer)/(tabs)/two.tsx
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Linking
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { signOut } from "firebase/auth";
import { auth } from "../../../lib/firebase";
import { useState,useEffect} from "react";
import { searchRecipes } from "../../../lib/spoonacular";
import { useRef } from "react";
import { DrawerActions } from "@react-navigation/native";
export default function TwoScreen() {
  const navigation = useNavigation();

  // STATE
  const [search, setSearch] = useState("");
  const [recipeResults, setRecipeResults] = useState([]);
  const [totalResults, setTotalResults] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
const [noResults, setNoResults] = useState(false);
const [suggestion, setSuggestion] = useState(""); // for "Did you mean"
  // LOGOUT
  const onLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.log("Logout error:", err);
    }
  };

  // search results scroll to *updated* SEE MORE
  const scrollRef = useRef<ScrollView>(null);
  const [lastScrollIndex, setLastScrollIndex] = useState(0);
  // MAIN SEARCH FUNCTION
const fetchSpoonacular = async (newSearch = false) => {
  if (search.trim().length === 0) return;

  setLoading(true);
  setNoResults(false);
  setSuggestion("");

  const newOffset = newSearch ? 0 : offset;
  const data = await searchRecipes(search, newOffset);

  if (!data.results || data.results.length === 0) {
    setNoResults(true);

    // Optional: naive suggestion logic (based on common typos)
    // You could integrate a fuzzy search library later
    setSuggestion("Try checking your spelling or using a different keyword.");
  } else {
    if (newSearch) {
      setRecipeResults(data.results);
      setOffset(10);
      setLastScrollIndex(0); // reset scroll
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
    const cardWidth = 180; // same as resultCard width
    const marginRight = 15; // same as resultCard marginRight
    const scrollX = lastScrollIndex * (cardWidth + marginRight);

    scrollRef.current.scrollTo({ x: scrollX, animated: true });
  }
}, [recipeResults]);

//categories
const categories = ["Breakfast", "Lunch", "Dinner", "Snacks", "Desserts"];
const spoonacularTypes = ["breakfast", "main course", "main course", "snack", "dessert"];
const fetchSpoonacularCategory = async (type: string) => {
  setLoading(true);
  const data = await searchRecipes(search, 0, type); // type param
  setRecipeResults(data.results);
  setOffset(10);
  setTotalResults(data.totalResults);
  setLoading(false);

};
//Add state to hold simple recipes:
const [simpleRecipes, setSimpleRecipes] = useState([]);
const [simpleOffset, setSimpleOffset] = useState(0);
const [simpleLoading, setSimpleLoading] = useState(false);
const simpleScrollRef = useRef<ScrollView>(null);
//2️⃣ Create Fetch Function
const fetchSimpleRecipes = async (newSearch = false) => {
  setSimpleLoading(true);
  const offset = newSearch ? 0 : simpleOffset;

  const data = await searchRecipes("easy", offset); // keyword = "easy"

  if (newSearch) {
    setSimpleRecipes(data.results);
    setSimpleOffset(10);
  } else {
    setSimpleRecipes((prev) => [...prev, ...data.results]);
    setSimpleOffset(offset + 10);
  }

  setSimpleLoading(false);
};
useEffect(() => {
  fetchSimpleRecipes(true);
}, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 50 }}>
      
      {/* HEADER */}
      <View style={styles.header}>
<View style={styles.leftHeader}>
  <Pressable
    onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
    style={{ flexDirection: "row", alignItems: "center" }}
  >
    <Image
      style={styles.avatar}
      source={{
        uri: "https://images.unsplash.com/photo-1764377723223-2353064702b1?q=80",
      }}
    />
    <Text style={styles.username}>Chef Josh</Text>
  </Pressable>
</View>
        <FontAwesome name="bell" size={25} onPress={onLogout} />
      </View>

      {/* SEARCH BAR */}
      <View style={styles.searchContainer}>
        <FontAwesome name="search" size={18} color="#888" style={styles.searchIcon} />

        <TextInput
          placeholder="Type an ingredient"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => fetchSpoonacular(true)} // TRIGGER SEARCH
          placeholderTextColor="#888"
          style={{ flex: 1 }}
        />
      </View>
{!loading && noResults && (
  <Text style={{ marginHorizontal: 20, marginTop: 10, color: "#888", fontStyle: "italic" }}>
    No results found. {suggestion}
  </Text>
)}
      {/* LOADER */}
      {loading && (
        <ActivityIndicator
          size="small"
          style={{ marginTop: 10 }}
        />
      )}

      {/* SEARCH RESULTS */}
      {recipeResults.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Search Results</Text>

       <ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  style={styles.resultsContainer}
  ref={scrollRef}
>
  {recipeResults.map((item) => (
    <View key={item.id} style={styles.resultCard}>
      <Image source={{ uri: item.image }} style={styles.resultImage} />

      <Text style={styles.resultTitle} numberOfLines={2}>
        {item.title}
      </Text>

      <Pressable
        style={styles.resultButton}
        onPress={() => {
          if (item.sourceUrl) Linking.openURL(item.sourceUrl);
          else alert("Source URL not available");
        }}
      >
        <Text style={styles.resultButtonText}>View</Text>
      </Pressable>
    </View>
  ))}
</ScrollView>



          {/* SEE MORE */}
          {!loading && recipeResults.length < totalResults && (
            <Pressable
              onPress={() => fetchSpoonacular(false)}
              style={styles.moreButton}
            >
              <Text style={{ color: "#fff", fontWeight: "600" }}>See More</Text>
            </Pressable>
          )}
        </>
      )}

    {/* --- CATEGORIES --- */}
<Text style={styles.sectionTitle}>Categories</Text>
<ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: 20 }}>
  {categories.map((cat, i) => (
    <Pressable 
      key={i} 
      onPress={() => fetchSpoonacularCategory(spoonacularTypes[i])}
      style={styles.categoryCard}
    >
      <Text style={styles.categoryText}>{cat}</Text>
    </Pressable>
  ))}
      </ScrollView>

      {/* --- POPULAR CHEFS --- */}
      <Text style={styles.sectionTitle}>Popular Chefs</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: 20 }}>
        {[1, 2, 3, 4].map((chef) => (
          <View key={chef} style={styles.chefCard}>
            <Image
              source={{ uri: "https://randomuser.me/api/portraits/men/32.jpg" }}
              style={styles.chefAvatar}
            />
            <Text style={styles.chefName}>Chef {chef}</Text>
          </View>
        ))}
      </ScrollView>

      {/* --- SIMPLE RECIPES --- */}
     <Text style={styles.sectionTitle}>Simple Recipes</Text>
<ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  style={{ paddingLeft: 20 }}
  ref={simpleScrollRef}
>
  {simpleRecipes.map((r) => (
    <View key={r.id} style={styles.recipeCard}>
      <Image source={{ uri: r.image }} style={styles.recipeImage} />
      <Text style={styles.recipeTitle} numberOfLines={2}>{r.title}</Text>
      <Pressable
        style={styles.recipeButton}
        onPress={() => {
          if (r.sourceUrl) Linking.openURL(r.sourceUrl);
          else alert("Source URL not available");
        }}
      >
        <Text style={styles.recipeButtonText}>View</Text>
      </Pressable>
    </View>
  ))}
</ScrollView>

{!simpleLoading && simpleRecipes.length >= 10 && (
  <Pressable
    onPress={() => fetchSimpleRecipes(false)}
    style={styles.moreButton}
  >
    <Text style={{ color: "#fff", fontWeight: "600" }}>See More</Text>
  </Pressable>
)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  header: {
    marginTop: 50,
    marginHorizontal: 20,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  leftHeader: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  username: { marginLeft: 10, fontSize: 16, fontWeight: "400" },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
    marginHorizontal: 20,
    marginBottom: 10,
  },

  searchIcon: { marginRight: 8 },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginHorizontal: 20,
    marginBottom: 10,
    paddingTop: 20,
  },

  resultsContainer: { paddingLeft: 20, marginBottom: 20 },

  resultCard: {
    width: 180,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginRight: 15,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },

  resultImage: { width: "100%", height: 110 },
  resultTitle: { margin: 8, fontWeight: "600" },

  resultButton: {
    backgroundColor: "#FF6347",
    margin: 8,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: "center",
  },

  resultButtonText: { color: "#fff", fontWeight: "600" },

  moreButton: {
    marginTop: 10,
    alignSelf: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#FF6347",
    borderRadius: 8,
  },

  // Categories
  categoryCard: {
    backgroundColor: "#FFEDD5",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginRight: 12,
  },
  categoryText: { fontWeight: "600", color: "#FF5722" },

  // Chefs
  chefCard: { alignItems: "center", marginRight: 15 },
  chefAvatar: { width: 70, height: 70, borderRadius: 35 },
  chefName: { marginTop: 6 },

  // Simple Recipes
  recipeCard: {
    width: 160,
    backgroundColor: "#fff",
    marginRight: 15,
    borderRadius: 12,
    overflow: "hidden",
    elevation: 3,
    marginBottom: 20,
    marginTop: 10,
  },

  recipeImage: { width: "100%", height: 100 },
  recipeTitle: { fontWeight: "600", margin: 8 },

  recipeButton: {
    backgroundColor: "#FF6347",
    margin: 8,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: "center",
  },

  recipeButtonText: { color: "#fff", fontWeight: "600" },
});
