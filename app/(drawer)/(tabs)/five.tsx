import { useRouter } from "expo-router";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { db } from "../../../lib/firebase";

export default function TabFiveScreen() {
  const [recipes, setRecipes] = useState([]);
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

  const renderItem = ({ item }) => (
<Pressable
  onPress={() => router.push(`/(modals)/recipe/${item.id}`)}
  style={styles.card}
>
  {item.imageUrl && <Image source={{ uri: item.imageUrl }} style={styles.image} />}
  <Text style={styles.title}>{item.title}</Text>
  <Text style={styles.byline}>Posted by: {item.createdBy || "Unknown"}</Text>
  <Text numberOfLines={2} style={styles.preview}>
    {Array.isArray(item.ingredients) ? item.ingredients.join(", ") : String(item.ingredients).slice(0, 80)}
  </Text>
</Pressable>
  );

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#FF6347" />
      </View>
    );
  }

  return (
    <FlatList
      data={recipes}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={{ padding: 15 }}
    />
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: {
    backgroundColor: "#fff",
    padding: 15,
    marginBottom: 15,
    borderRadius: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  image: { width: "100%", height: 160, borderRadius: 10, marginBottom: 10 },
  title: { fontSize: 18, fontWeight: "700" },
  byline: { color: "#555", fontSize: 12, marginTop: 4 },
  preview: { color: "#444", marginTop: 8 },
});
