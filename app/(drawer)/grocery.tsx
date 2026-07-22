import React, { useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";

const initialItems = [
  { id: "1", name: "Fresh Garlic (2 lbs)", checked: false },
  { id: "2", name: "Heavy Cream (1 Gal)", checked: true },
  { id: "3", name: "Flatiron Steaks (12 Portions)", checked: false },
  { id: "4", name: "Extra Virgin Olive Oil", checked: false },
];

export default function GroceryModal() {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);

  const toggleCheck = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Kitchen Prep & Grocery List</Text>
        <Pressable onPress={() => router.back()}>
          <FontAwesome name="times" size={20} color="#64748b" />
        </Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20 }}
        renderItem={({ item }) => (
          <Pressable onPress={() => toggleCheck(item.id)} style={styles.row}>
            <FontAwesome
              name={item.checked ? "check-square" : "square-o"}
              size={20}
              color={item.checked ? "#2563eb" : "#94a3b8"}
            />
            <Text style={[styles.itemText, item.checked && styles.strikethrough]}>
              {item.name}
            </Text>
          </Pressable>
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
  title: { fontSize: 18, fontWeight: "700", color: "#0f172a" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f8fafc",
    gap: 12,
  },
  itemText: { fontSize: 15, color: "#334155" },
  strikethrough: { textDecorationLine: "line-through", color: "#94a3b8" },
});