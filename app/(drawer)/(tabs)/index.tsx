import { Text, View } from "@/components/Themed";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { signOut } from "firebase/auth";
import { useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Pressable
} from "react-native";
import { auth } from "../../../lib/firebase";
import { DrawerActions } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const trendingRecipes = [
  {
    id: "1",
    title: "Spaghetti Bolognese",
    image:
      "https://images.unsplash.com/photo-1600891964599-f61ba0e24092?auto=format&fit=crop&w=500&q=80",
  },
  {
    id: "2",
    title: "Vegan Salad Bowl",
    image:
      "https://images.unsplash.com/photo-1551218808-94e220e084d2?auto=format&fit=crop&w=500&q=80",
  },
  {
    id: "3",
    title: "Pancakes with Berries",
    image:
      "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=500&q=80",
  },
];

const cookingVideos = [
  {
    id: "1",
    title: "How to Chop Onions",
    thumbnail:
      "https://plus.unsplash.com/premium_photo-1726079119108-d6d1520d5f21?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: "2",
    title: "Perfect Scrambled Eggs",
    thumbnail:
      "https://plus.unsplash.com/premium_photo-1700004501749-85a6db76a1de?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8c2NyYW1ibGVkJTIwZWdnc3xlbnwwfHwwfHx8MA%3D%3D",
  },
  {
    id: "3",
    title: "Making Homemade Pizza",
    thumbnail:
      "https://images.unsplash.com/photo-1734774421809-48eac182a5cd?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8aG9tZW1hZGUlMjBwaXp6YXxlbnwwfHwwfHx8MA%3D%3D",
  },
];

const services = [
  {
    id: "1",
    title: "Hire a Personal Chef",
    image:
      "https://plus.unsplash.com/premium_photo-1661601616684-8b8a2939ce1a?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
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

  const CARD_WIDTH = SCREEN_WIDTH * 0.6;
  const CARD_HEIGHT = SCREEN_WIDTH * 0.5; // dynamic height based on screen width
  const SERVICE_CARD_EXTRA = 40; // space for button

  const renderCard = (item: any, isService: boolean = false) => (
    <TouchableOpacity
      style={[
        styles.card,
        {
          width: CARD_WIDTH,
          height: CARD_HEIGHT + SERVICE_CARD_EXTRA + (isService ? 40 : 0),
        },
      ]}
    >
      <Image
        source={{ uri: isService ? item.image : item.thumbnail || item.image }}
        style={[styles.cardImage, { height: CARD_HEIGHT }]}
      />
      {isService && (
        <View style={styles.iconOverlay}>
          <FontAwesome name={item.icon as any} size={20} color="#fff" />
        </View>
      )}
      <Text style={styles.cardTitle}>{item.title}</Text>
      {isService && (
        <TouchableOpacity style={styles.cardButton}>
          <Text style={styles.cardButtonText}>Book Now</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 50 }}
    >
      {/* Header */}
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

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <FontAwesome
          name="search"
          size={18}
          color="#888"
          style={styles.searchIcon}
        />
        <TextInput
          style={{}}
          placeholder="Type an ingredient"
          value={search}
          onChangeText={setSearch}
          placeholderTextColor='#888'
        />
      </View>

      {/* Trending Recipes */}
      <Text style={styles.sectionTitle}>Trending Recipes</Text>
      <FlatList
        data={trendingRecipes}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => renderCard(item)}
        contentContainerStyle={{ paddingHorizontal: 20, marginBottom: 20 }}
      />

      {/* How-to Cooking Videos */}
      <Text style={styles.sectionTitle}>How-to Cooking Videos</Text>
      <FlatList
        data={cookingVideos}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => renderCard(item)}
        contentContainerStyle={{ paddingHorizontal: 20, marginBottom: 20 }}
      />

      {/* Services Carousel */}
      <Text style={styles.sectionTitle}>Services Near You</Text>
      <FlatList
        data={services}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => renderCard(item, true)}
        contentContainerStyle={{ paddingHorizontal: 20, marginBottom: 20 }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    alignItems: "center",
    justifyContent: "space-between",
    flexDirection: "row",
    marginTop: 50,
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor:'auto'
  },
  leftHeader: { alignItems: "center", flexDirection: "row",backgroundColor:'auto' },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  username: { marginLeft: 10, fontSize: 16, fontWeight: "400",color:'auto' },
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
    color:'auto'
  },
  card: {
 marginRight: 15,
  borderRadius: 12,
  overflow: "hidden",
  backgroundColor: "#fff",
  // Android shadow
  elevation: 3,
  // iOS shadow
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.2,
  shadowRadius: 4,
  },
  cardImage: { width: "100%", borderRadius: 12 },
  cardTitle: {
    paddingHorizontal: 8,
    paddingTop: 5,
    fontSize: 14,
    fontWeight: "500",
    color:'auto'
  },
  cardButton: {
    backgroundColor: "#FF6347",
    margin: 8,
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: "center",
  },
  cardButtonText: { color: "#fff", fontWeight: "600" },
  iconOverlay: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 6,
    borderRadius: 20,
  },
});
