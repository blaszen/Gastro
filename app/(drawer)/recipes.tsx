import React from "react";
import { View, Text, StyleSheet, FlatList, Image, Pressable } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";

const myRecipesData = [
  { id: "1", title: "House Special Flatiron Steak", category: "Mains", image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=500" },
  { id: "2", title: "Signature Salad Bowl", category: "Salads", image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500" },
  { id: "3", title: "Truffle Mushroom Risotto", category: "Mains", image: "https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?w=500" },
];

export default function MyRecipesModal() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Recipe Box</Text>
        <Pressable onPress={() => router.back()}>
          <FontAwesome name="times" size={20} color="#64748b" />
        </Pressable>
      </View>

      <FlatList
        data={myRecipesData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Image source={{ uri: item.image }} style={styles.cardImg} />
            <View style={styles.cardBody}>
              <Text style={styles.tag}>{item.category}</Text>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Pressable style={styles.editBtn}>
                <Text style={styles.editBtnText}>Edit Recipe</Text>
              </Pressable>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  title: { fontSize: 20, fontWeight: "700", color: "#0f172a" },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 14,
    overflow: "hidden",
  },
  cardImg: { width: 100, height: 100 },
  cardBody: { flex: 1, padding: 12, justifyContent: "space-between" },
  tag: { fontSize: 11, fontWeight: "700", color: "#2563eb", uppercase: true },
  cardTitle: { fontSize: 14, fontWeight: "600", color: "#0f172a" },
  editBtn: { alignSelf: "flex-start" },
  editBtnText: { fontSize: 12, fontWeight: "600", color: "#64748b" },
});