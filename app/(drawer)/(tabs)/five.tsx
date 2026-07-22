import { useRouter } from "expo-router";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { db } from "../../../lib/firebase";

export default function TabFiveScreen() {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const q = query(collection(db, "recipes"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRecipes(data);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

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

  // Truncates long Firebase UIDs like "goakhchwrwV1OZ1..." into "goakhc..."
  const formatAuthorName = (name: string) => {
    if (!name) return "Anonymous Chef";
    if (name.includes("@")) return name.split("@")[0]; // Email fallback
    if (name.length > 12) return `${name.slice(0, 8)}...`;
    return name;
  };

  const renderRecipeCard = ({ item }: { item: any }) => {
    const ingredientCount = Array.isArray(item.ingredients)
      ? item.ingredients.length
      : item.ingredients
      ? String(item.ingredients).split(",").filter(Boolean).length
      : 0;

    return (
      <Pressable
        onPress={() => router.push(`/(modals)/recipe/${item.id}`)}
        style={({ pressed }) => [
          styles.card,
          pressed && styles.cardPressed,
        ]}
      >
        {/* Card Header / Image Area */}
        <View style={styles.imageContainer}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.image} />
          ) : (
            /* Modern Chef Gradient/Pattern Banner */
            <View style={styles.placeholderBanner}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="chef-hat" size={32} color="#0e7afe" />
              </View>
              <Text style={styles.placeholderTag}>Kitchen Recipe</Text>
            </View>
          )}

          {/* Floating Time Pill */}
          <View style={styles.timeBadge}>
            <Ionicons name="time-outline" size={12} color="#ffffff" style={{ marginRight: 4 }} />
            <Text style={styles.timeBadgeText}>
              {formatTimeAgo(item.createdAt)}
            </Text>
          </View>
        </View>

        {/* Card Body Details */}
        <View style={styles.cardDetails}>
          <Text style={styles.title} numberOfLines={1}>
            {item.title || "Untitled Recipe"}
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

            {/* Ingredient Count Tag */}
            <View style={styles.ingredientBadge}>
              <MaterialCommunityIcons name="silverware-fork-knife" size={12} color="#475569" style={{ marginRight: 4 }} />
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
        <ActivityIndicator size="large" color="#0e7afe" />
        <Text style={styles.loadingText}>Fetching recipe feed...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={recipes}
        keyExtractor={(item) => item.id}
        renderItem={renderRecipeCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Recipe Feed</Text>
            <Text style={styles.headerSubtitle}>
              Explore newly created kitchen dishes
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="book-open-page-variant-outline" size={56} color="#94a3b8" />
            <Text style={styles.emptyTitle}>No Recipes Found</Text>
            <Text style={styles.emptyText}>
              Head over to the create tab to craft your first dish!
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
    backgroundColor: "#f8fafc",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.6,
  },
  headerSubtitle: {
    fontSize: 15,
    color: "#64748b",
    marginTop: 2,
  },
  card: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 18,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  imageContainer: {
    width: "100%",
    height: 160, // Fixed clean height for full-width banner
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  placeholderBanner: {
    width: "100%",
    height: "100%",
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#dbeafe",
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0e7afe",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 6,
  },
  placeholderTag: {
    fontSize: 12,
    fontWeight: "600",
    color: "#3b82f6",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  timeBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  timeBadgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "600",
  },
  cardDetails: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
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
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#dbeafe",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  avatarText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1d4ed8",
  },
  byline: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "600",
  },
  ingredientBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  ingredientBadgeText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    marginTop: 12,
  },
  emptyText: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },
});