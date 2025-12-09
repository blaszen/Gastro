import { View, Text, ScrollView, Image, StyleSheet } from "react-native";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../../lib/firebase";
import React, { useState, useEffect } from "react";

export default function RecipesScreen() {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecipes = async () => {
      const q = query(collection(db, "recipes"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      setRecipes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    };
    fetchRecipes();
  }, []);

  return (
    <ScrollView style={styles.container}>
      {loading && <Text>Loading...</Text>}
      {recipes.map(recipe => (
        <View key={recipe.id} style={styles.card}>
          {recipe.imageUrl && <Image source={{ uri: recipe.imageUrl }} style={styles.image} />}
          <Text style={styles.title}>{recipe.title}</Text>
          <Text>{recipe.instructions}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  card: { marginBottom: 20, backgroundColor: "#fff", borderRadius: 12, padding: 15, elevation: 3 },
  image: { width: "100%", height: 150, borderRadius: 10, marginBottom: 10 },
  title: { fontWeight: "600", fontSize: 16, marginBottom: 5 },
});
