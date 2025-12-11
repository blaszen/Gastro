import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
  Pressable,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../../lib/firebase";

export default function RecipeModal() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecipe() {
      const ref = doc(db, "recipes", id);
      const snap = await getDoc(ref);
      if (snap.exists()) setRecipe(snap.data());
      setLoading(false);
    }
    fetchRecipe();
  }, [id]);

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6347" />
      </View>
    );

  if (!recipe)
    return (
      <View style={styles.center}>
        <Text>Recipe not found.</Text>
      </View>
    );

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Close button */}
      <Pressable style={styles.close} onPress={() => router.back()}>
        <Text style={{ fontSize: 22 }}>×</Text>
      </Pressable>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {recipe.imageUrl && (
          <Image source={{ uri: recipe.imageUrl }} style={styles.image} />
        )}

        <Text style={styles.title}>{recipe.title}</Text>
        <Text style={styles.byline}>Posted by: {recipe.createdBy}</Text>

        <Text style={styles.section}>Ingredients</Text>
        {recipe.ingredients?.map((i, idx) => (
          <Text key={idx} style={styles.text}>• {i}</Text>
        ))}

        <Text style={styles.section}>Instructions</Text>
        <Text style={styles.text}>{recipe.instructions}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  close: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 10,
    padding: 6,
    backgroundColor: "#eee",
    borderRadius: 20,
  },
  image: {
    width: "100%",
    height: 240,
    borderRadius: 10,
    marginBottom: 20,
  },
  title: { fontSize: 26, fontWeight: "bold" },
  byline: { color: "#666", marginVertical: 6 },
  section: { fontSize: 20, fontWeight: "700", marginTop: 18 },
  text: { fontSize: 16, marginTop: 6, lineHeight: 22 },
});
