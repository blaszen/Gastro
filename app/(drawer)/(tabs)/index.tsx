import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  FlatList,
  Image,
  TouchableOpacity,
  Pressable,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { signOut } from "firebase/auth";
import { auth } from "../../../lib/firebase";
import { DrawerActions, useNavigation } from "@react-navigation/native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const trendingRecipes = [
  {
    id: "1",
    title: "Spaghetti Bolognese",
    image:
      "https://images.unsplash.com/photo-1600891964599-f61ba0e24092?auto=format&fit=crop&w=500&q=80",
    time: "25 min",
  },
  {
    id: "2",
    title: "Vegan Salad Bowl",
    image:
      "https://images.unsplash.com/photo-1551218808-94e220e084d2?auto=format&fit=crop&w=500&q=80",
    time: "15 min",
  },
  {
    id: "3",
    title: "Pancakes with Berries",
    image:
      "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=500&q=80",
    time: "20 min",
  },
];

const cookingVideos = [
  {
    id: "1",
    title: "How to Chop Onions",
    thumbnail:
      "https://plus.unsplash.com/premium_photo-1726079119108-d6d1520d5f21?q=80&w=1170&auto=format&fit=crop",
    duration: "3:45",
  },
  {
    id: "2",
    title: "Perfect Scrambled Eggs",
    thumbnail:
      "https://plus.unsplash.com/premium_photo-1700004501749-85a6db76a1de?w=500&auto=format&fit=crop",
    duration: "5:10",
  },
  {
    id: "3",
    title: "Making Homemade Pizza",
    thumbnail:
      "https://images.unsplash.com/photo-1734774421809-48eac182a5cd?w=500&auto=format&fit=crop",
    duration: "12:30",
  },
];

const services = [
  {
    id: "1",
    title: "Hire a Personal Chef",
    image:
      "https://plus.unsplash.com/premium_photo-1661601616684-8b8a2939ce1a?q=80&w=2070&auto=format&fit=crop",
    icon: "cutlery",
  },
  {
    id: "2",
    title: "Meal Prep Plans",
    image:
      "https://images.unsplash.com/photo-1598514981916-f76c7c5e3f62?auto=format&fit=crop&w=500&q=80",
    icon: "leaf",
  },
  {
    id: "3",
    title: "Caterers Near You",
    image:
      "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=500&q=80",
    icon: "birthday-cake",
  },
];

export default function TabOneScreen() {
  const [search, setSearch] = useState("");
  const navigation = useNavigation();

  const onLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.log("Logout error:", err);
    }
  };

  const CARD_WIDTH = SCREEN_WIDTH * 0.58;

  const renderRecipeCard = ({ item }: { item: any }) => (
    <TouchableOpacity activeOpacity={0.85} style={[styles.card, { width: CARD_WIDTH }]}>
      <Image source={{ uri: item.image }} style={styles.cardImage} resizeMode="cover" />
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.title}
        </Text>
        {item.time && (
          <View style={styles.metaRow}>
            <FontAwesome name="clock-o" size={12} color="#64748b" />
            <Text style={styles.metaText}>{item.time}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderVideoCard = ({ item }: { item: any }) => (
    <TouchableOpacity activeOpacity={0.85} style={[styles.card, { width: CARD_WIDTH }]}>
      <View style={styles.imageWrapper}>
        <Image source={{ uri: item.thumbnail }} style={styles.cardImage} resizeMode="cover" />
        <View style={styles.playBadge}>
          <FontAwesome name="play" size={10} color="#ffffff" />
        </View>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.metaText}>{item.duration} mins</Text>
      </View>
    </TouchableOpacity>
  );

  const renderServiceCard = ({ item }: { item: any }) => (
    <TouchableOpacity activeOpacity={0.85} style={[styles.card, { width: CARD_WIDTH }]}>
      <View style={styles.imageWrapper}>
        <Image source={{ uri: item.image }} style={styles.cardImage} resizeMode="cover" />
        <View style={styles.iconOverlay}>
          <FontAwesome name={item.icon as any} size={14} color="#ffffff" />
        </View>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <TouchableOpacity style={styles.serviceButton}>
          <Text style={styles.serviceButtonText}>Explore Service</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            style={styles.leftHeader}
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
            <FontAwesome name="bell-o" size={18} color="#0f172a" />
          </Pressable>
        </View>

        {/* Search bar */}
        <View style={styles.searchContainer}>
          <FontAwesome name="search" size={16} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search recipes, chefs, or ingredients..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#94a3b8"
          />
        </View>

        {/* Trending Recipes */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Trending Recipes</Text>
          <Text style={styles.seeAllText}>See all</Text>
        </View>
        <FlatList
          data={trendingRecipes}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          renderItem={renderRecipeCard}
          contentContainerStyle={styles.listContainer}
        />

        {/* How-to Cooking Videos */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>How-to Cooking Videos</Text>
          <Text style={styles.seeAllText}>See all</Text>
        </View>
        <FlatList
          data={cookingVideos}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          renderItem={renderVideoCard}
          contentContainerStyle={styles.listContainer}
        />

        {/* Services Carousel */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Services Near You</Text>
        </View>
        <FlatList
          data={services}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          renderItem={renderServiceCard}
          contentContainerStyle={styles.listContainer}
        />
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
    alignItems: "center",
    justifyContent: "space-between",
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  leftHeader: {
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#0f172a",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2563eb",
  },
  listContainer: {
    paddingLeft: 20,
    paddingRight: 8,
    marginBottom: 24,
  },
  card: {
    marginRight: 14,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  imageWrapper: {
    position: "relative",
  },
  cardImage: {
    width: "100%",
    height: 125,
    backgroundColor: "#f1f5f9",
  },
  cardContent: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  metaText: {
    fontSize: 12,
    color: "#64748b",
    marginLeft: 4,
  },
  playBadge: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  iconOverlay: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  serviceButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 6,
  },
  serviceButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
});