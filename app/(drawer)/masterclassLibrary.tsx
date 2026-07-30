import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StatusBar,
  FlatList,
  Dimensions,
  Linking,
  Alert,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { router } from "expo-router";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const CATEGORIES = ["All", "Fundamentals", "Sauces", "Classics", "Pastry"];

// --- Masterclass Type Definition ---
export interface Video {
  id: string;
  title: string;
  subtitle: string;
  thumbnail: string;
  duration: string;
  url: string;
  category: "Fundamentals" | "Sauces" | "Classics" | "Pastry";
}

// --- Julia Child Masterclasses Data Array ---
export const juliaChildMasterclasses: Video[] = [
  // Fundamentals
  {
    id: "jc-1",
    title: "Mastering the Knife & Vegetable Precision",
    subtitle: "Mirepoix, Julienne & Chiffonade like a pro",
    category: "Fundamentals",
    thumbnail:
      "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80",
    duration: "14:20",
    url: "https://www.youtube.com/results?search_query=julia+child+knife+skills",
  },
  {
    id: "jc-2",
    title: "The Perfect French Omelet",
    subtitle: "Butter temperature, pan flicking & soft curds",
    category: "Fundamentals",
    thumbnail:
      "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&q=80",
    duration: "8:45",
    url: "https://www.youtube.com/results?search_query=julia+child+french+omelette",
  },
  {
    id: "jc-3",
    title: "How to Truss & Roast a Chicken",
    subtitle: "Crispy skin, basting, and pan sauce reduction",
    category: "Fundamentals",
    thumbnail:
      "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?auto=format&fit=crop&w=800&q=80",
    duration: "18:10",
    url: "https://www.youtube.com/results?search_query=julia+child+roast+chicken",
  },

  // Sauces
  {
    id: "jc-4",
    title: "The Art of Hollandaise & Béarnaise",
    subtitle: "Emulsification, warm whisking & restoring broken sauces",
    category: "Sauces",
    thumbnail:
      "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80",
    duration: "12:15",
    url: "https://www.youtube.com/results?search_query=julia+child+hollandaise",
  },
  {
    id: "jc-5",
    title: "Roux Foundations: Velouté & Béchamel",
    subtitle: "Roux stages, simmer timing & smooth milk integration",
    category: "Sauces",
    thumbnail:
      "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=800&q=80",
    duration: "15:30",
    url: "https://www.youtube.com/results?search_query=julia+child+bechamel",
  },

  // Classics
  {
    id: "jc-6",
    title: "Boeuf Bourguignon Step-by-Step",
    subtitle: "Searing, deglazing, pearl onions & slow braising",
    category: "Classics",
    thumbnail:
      "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=800&q=80",
    duration: "24:50",
    url: "https://www.youtube.com/results?search_query=julia+child+boeuf+bourguignon",
  },
  {
    id: "jc-7",
    title: "Coq au Vin & Red Wine Reductions",
    subtitle: "Lardons, mushrooms, cognac flambé & aromatics",
    category: "Classics",
    thumbnail:
      "https://images.unsplash.com/photo-1600891964599-f61ba0e24092?auto=format&fit=crop&w=800&q=80",
    duration: "21:05",
    url: "https://www.youtube.com/results?search_query=julia+child+coq+au+vin",
  },
  {
    id: "jc-8",
    title: "Classic French Onion Soup (Soupe à l'Oignon)",
    subtitle: "Deep onion caramelization & Gruyère croûton lid",
    category: "Classics",
    thumbnail:
      "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=800&q=80",
    duration: "16:40",
    url: "https://www.youtube.com/results?search_query=julia+child+french+onion+soup",
  },

  // Pastry
  {
    id: "jc-9",
    title: "Pâte Feuilletée (Puff Pastry)",
    subtitle: "Lamination, butter blocks & turn mechanics",
    category: "Pastry",
    thumbnail:
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80",
    duration: "28:15",
    url: "https://www.youtube.com/results?search_query=julia+child+puff+pastry",
  },
  {
    id: "jc-10",
    title: "Soufflé Technique & Meringue Folding",
    subtitle: "Ramekin lining, egg white peaks & rise discipline",
    category: "Pastry",
    thumbnail:
      "https://images.unsplash.com/photo-1579372786545-d24232daf58c?auto=format&fit=crop&w=800&q=80",
    duration: "11:50",
    url: "https://www.youtube.com/results?search_query=julia+child+souffle",
  },
];

export default function MasterclassLibraryScreen() {
  const [activeCategory, setActiveCategory] = useState("All");

  const filteredClasses =
    activeCategory === "All"
      ? juliaChildMasterclasses
      : juliaChildMasterclasses.filter(
          (item) => item.category === activeCategory
        );

  const handleOpenLink = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (err) {
      Alert.alert("Error", "Could not open video stream.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <FontAwesome name="chevron-left" size={14} color="#f4f4f5" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Techniques & Masterclasses</Text>
          <Text style={styles.headerSubtitle}>The French Chef Curriculum</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Category Pills */}
      <View style={styles.categoryContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.pill,
                activeCategory === cat && styles.pillActive,
              ]}
              onPress={() => setActiveCategory(cat)}
            >
              <Text
                style={[
                  styles.pillText,
                  activeCategory === cat && styles.pillTextActive,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Masterclass Grid */}
      <FlatList
        data={filteredClasses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.libraryCard}
            onPress={() => handleOpenLink(item.url)}
          >
            <Image source={{ uri: item.thumbnail }} style={styles.cardImage} />
            <View style={styles.cardOverlay} />
            <View style={styles.cardBadge}>
              <Text style={styles.badgeText}>{item.category}</Text>
            </View>
            <View style={styles.durationBadge}>
              <FontAwesome
                name="clock-o"
                size={10}
                color="#f4f4f5"
                style={{ marginRight: 4 }}
              />
              <Text style={styles.durationText}>{item.duration}</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f1115" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#27272a",
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#181b20",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    color: "#f4f4f5",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  headerSubtitle: {
    color: "#f59e0b",
    fontSize: 11,
    textAlign: "center",
    marginTop: 2,
  },
  categoryContainer: { paddingVertical: 12, paddingLeft: 20 },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#181b20",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  pillActive: { backgroundColor: "#f59e0b", borderColor: "#f59e0b" },
  pillText: { color: "#a1a1aa", fontSize: 12, fontWeight: "600" },
  pillTextActive: { color: "#0f1115", fontWeight: "700" },
  libraryCard: {
    height: 180,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    position: "relative",
    borderWidth: 1,
    borderColor: "#27272a",
  },
  cardImage: { width: "100%", height: "100%" },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 17, 21, 0.65)",
  },
  cardBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(15, 17, 21, 0.85)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: "#f59e0b",
  },
  badgeText: {
    color: "#f59e0b",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  durationBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(15, 17, 21, 0.85)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  durationText: { color: "#f4f4f5", fontSize: 10, fontWeight: "600" },
  cardContent: { position: "absolute", bottom: 14, left: 14, right: 14 },
  cardTitle: { color: "#f4f4f5", fontSize: 16, fontWeight: "700" },
  cardSubtitle: { color: "#a1a1aa", fontSize: 12, marginTop: 4 },
});