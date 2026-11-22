import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useLocalSearchParams, useRouter } from "expo-router";
import { auth } from "../../../../lib/firebase";
import { getRecipeInformation } from "../../../../lib/spoonacular";
import { toggleFavoriteRecipe } from "../../../../lib/favorites";
import { useFavoriteIds } from "../../../../lib/community";
import { addItemsToList } from "../../../../lib/grocery";
import ScreenHeader from "../../../../components/ScreenHeader";
import RecipeImage from "../../../../components/RecipeImage";
import { themedStyles, tc, statusBarStyle, useThemeMode } from "../../../../lib/theme";

const stripHtml = (html?: string) =>
  (html || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

export default function WebRecipeScreen() {
  useThemeMode();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const uid = auth.currentUser?.uid;
  const favoriteIds = useFavoriteIds(uid);
  const isFav = favoriteIds.has(String(id));

  const [recipe, setRecipe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showFullSummary, setShowFullSummary] = useState(false);

  useEffect(() => {
    if (!id) return;
    getRecipeInformation(id).then((r) => {
      setRecipe(r);
      setLoading(false);
    });
  }, [id]);

  const ingredients: string[] = (recipe?.extendedIngredients || [])
    .map((i: any) => i.original)
    .filter(Boolean);
  const steps: { number: number; step: string }[] = recipe?.analyzedInstructions?.[0]?.steps || [];
  const summary = stripHtml(recipe?.summary);

  const toggleFav = async () => {
    try {
      await toggleFavoriteRecipe(
        { id: String(id), title: recipe?.title, image: recipe?.image, sourceUrl: `/spoon/${id}` },
        isFav
      );
    } catch {
      Alert.alert("Error", "Couldn't update your favorites.");
    }
  };

  const addToGrocery = async () => {
    if (!uid || ingredients.length === 0) return;
    setAdding(true);
    try {
      const count = await addItemsToList(uid, ingredients, { list: "grocery", recipeTitle: recipe?.title });
      Alert.alert("Added to grocery list", `${count} ingredient${count === 1 ? "" : "s"} added.`, [
        { text: "OK", style: "cancel" },
        { text: "View List", onPress: () => router.push("/grocery" as any) },
      ]);
    } catch {
      Alert.alert("Error", "Couldn't add ingredients to your list.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={statusBarStyle()} backgroundColor={tc("#0f1115")} />
      <ScreenHeader title="Recipe" subtitle={recipe?.sourceName ? `from ${recipe.sourceName}` : undefined} />

      {loading ? (
        <ActivityIndicator color="#f59e0b" style={{ marginTop: 40 }} />
      ) : !recipe ? (
        <View style={styles.empty}>
          <FontAwesome name="exclamation-circle" size={28} color={tc("#71717a")} />
          <Text style={styles.emptyTitle}>Recipe unavailable</Text>
          <Text style={styles.emptyText}>We couldn't load this recipe right now. Please try again later.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View>
            <RecipeImage uri={recipe.image} title={recipe.title} style={styles.hero} />
            <Pressable style={styles.heart} onPress={toggleFav} hitSlop={8} accessibilityLabel="Favorite">
              <FontAwesome name={isFav ? "heart" : "heart-o"} size={18} color={isFav ? "#ef4444" : "#ffffff"} />
            </Pressable>
          </View>

          <Text style={styles.title}>{recipe.title}</Text>

          <View style={styles.metaRow}>
            {recipe.readyInMinutes ? (
              <View style={styles.metaChip}>
                <FontAwesome name="clock-o" size={12} color="#f59e0b" />
                <Text style={styles.metaText}>{recipe.readyInMinutes} min</Text>
              </View>
            ) : null}
            {recipe.servings ? (
              <View style={styles.metaChip}>
                <FontAwesome name="users" size={11} color="#f59e0b" />
                <Text style={styles.metaText}>{recipe.servings} servings</Text>
              </View>
            ) : null}
            {recipe.vegetarian ? (
              <View style={styles.metaChip}>
                <FontAwesome name="leaf" size={12} color="#22c55e" />
                <Text style={styles.metaText}>Vegetarian</Text>
              </View>
            ) : null}
            {recipe.glutenFree ? (
              <View style={styles.metaChip}>
                <Text style={styles.metaText}>Gluten-free</Text>
              </View>
            ) : null}
          </View>

          {summary ? (
            <Pressable onPress={() => setShowFullSummary((v) => !v)}>
              <Text style={styles.summary} numberOfLines={showFullSummary ? undefined : 4}>
                {summary}
              </Text>
              <Text style={styles.link}>{showFullSummary ? "Show less" : "Read more"}</Text>
            </Pressable>
          ) : null}

          <Pressable
            style={[styles.primaryBtn, (adding || !ingredients.length) && styles.disabled]}
            onPress={addToGrocery}
            disabled={adding || !ingredients.length}
          >
            {adding ? (
              <ActivityIndicator color={tc("#0f1115")} />
            ) : (
              <>
                <FontAwesome name="shopping-basket" size={14} color={tc("#0f1115")} />
                <Text style={styles.primaryText}>Add to Grocery List</Text>
              </>
            )}
          </Pressable>

          {/* Ingredients */}
          <View style={styles.sectionHeader}>
            <View style={styles.accentBar} />
            <Text style={styles.sectionTitle}>Ingredients</Text>
            <Text style={styles.count}>{ingredients.length}</Text>
          </View>
          <View style={styles.card}>
            {ingredients.length === 0 ? (
              <Text style={styles.muted}>No ingredients listed.</Text>
            ) : (
              ingredients.map((ing, i) => (
                <View key={i} style={[styles.ingRow, i === ingredients.length - 1 && styles.noBorder]}>
                  <View style={styles.bullet} />
                  <Text style={styles.ingText}>{ing}</Text>
                </View>
              ))
            )}
          </View>

          {/* Steps */}
          <View style={styles.sectionHeader}>
            <View style={styles.accentBar} />
            <Text style={styles.sectionTitle}>Method</Text>
          </View>
          {steps.length > 0 ? (
            steps.map((s) => (
              <View key={s.number} style={styles.stepRow}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>{s.number}</Text>
                </View>
                <Text style={styles.stepText}>{s.step}</Text>
              </View>
            ))
          ) : recipe.instructions ? (
            <View style={styles.card}>
              <Text style={styles.stepText}>{stripHtml(recipe.instructions)}</Text>
            </View>
          ) : (
            <Text style={styles.muted}>Step-by-step instructions are on the original page.</Text>
          )}

          {recipe.sourceUrl ? (
            <Pressable
              style={styles.sourceBtn}
              onPress={() => Linking.openURL(recipe.sourceUrl).catch(() => {})}
            >
              <FontAwesome name="external-link" size={13} color="#f59e0b" />
              <Text style={styles.link}>View original recipe</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = themedStyles({
  safeArea: { flex: 1, backgroundColor: "#0f1115" },
  content: { paddingHorizontal: 20, paddingBottom: 48 },
  hero: { width: "100%", height: 230, borderRadius: 22 },
  heart: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: "#f4f4f5", fontSize: 24, fontWeight: "900", letterSpacing: -0.5, marginTop: 18 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#181b20",
    borderWidth: 1,
    borderColor: "#27272a",
  },
  metaText: { color: "#f4f4f5", fontSize: 12, fontWeight: "600" },
  summary: { color: "#a1a1aa", fontSize: 14, lineHeight: 21, marginTop: 14 },
  link: { color: "#f59e0b", fontWeight: "700", fontSize: 13, marginTop: 6 },
  primaryBtn: {
    height: 50,
    borderRadius: 16,
    backgroundColor: "#f59e0b",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 18,
  },
  primaryText: { color: "#0f1115", fontWeight: "800", fontSize: 15 },
  disabled: { opacity: 0.5 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 26, marginBottom: 12 },
  accentBar: { width: 4, height: 18, borderRadius: 2, backgroundColor: "#f59e0b" },
  sectionTitle: { color: "#f4f4f5", fontSize: 18, fontWeight: "800", flex: 1 },
  count: { color: "#71717a", fontWeight: "700" },
  card: {
    backgroundColor: "#181b20",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#27272a",
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  ingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#27272a",
  },
  noBorder: { borderBottomWidth: 0 },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#f59e0b", marginTop: 7 },
  ingText: { color: "#f4f4f5", fontSize: 15, flex: 1, lineHeight: 20 },
  stepRow: { flexDirection: "row", gap: 14, marginBottom: 16 },
  stepNum: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumText: { color: "#f59e0b", fontWeight: "900" },
  stepText: { color: "#f4f4f5", fontSize: 15, lineHeight: 22, flex: 1 },
  muted: { color: "#a1a1aa", fontSize: 14, paddingVertical: 8 },
  sourceBtn: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "center", marginTop: 20 },
  empty: { alignItems: "center", marginTop: 60, paddingHorizontal: 30 },
  emptyTitle: { color: "#f4f4f5", fontSize: 17, fontWeight: "800", marginTop: 12 },
  emptyText: { color: "#a1a1aa", fontSize: 14, textAlign: "center", marginTop: 6 },
});
