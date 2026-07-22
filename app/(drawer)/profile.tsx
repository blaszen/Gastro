import React from "react";
import { View, Text, StyleSheet, Image, Pressable, ScrollView } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";

export default function ProfileModal() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()} style={styles.closeBtn}>
        <FontAwesome name="times" size={20} color="#64748b" />
      </Pressable>

      <View style={styles.profileHeader}>
        <Image
          source={{ uri: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?q=80&w=200" }}
          style={styles.avatar}
        />
        <Text style={styles.name}>Chef Josh</Text>
        <Text style={styles.role}>Head Chef & Culinary Director</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>24</Text>
          <Text style={styles.statLabel}>Recipes</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>1.2k</Text>
          <Text style={styles.statLabel}>Saved</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>18</Text>
          <Text style={styles.statLabel}>Prep Lists</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.infoRow}>
          <FontAwesome name="cutlery" size={16} color="#2563eb" />
          <Text style={styles.infoText}>Cuisine Focus: Modern American & Italian</Text>
        </View>
        <View style={styles.infoRow}>
          <FontAwesome name="map-marker" size={16} color="#2563eb" />
          <Text style={styles.infoText}>San Diego, CA</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 20 },
  closeBtn: { alignSelf: "flex-end", padding: 8 },
  profileHeader: { alignItems: "center", marginTop: 10, marginBottom: 20 },
  avatar: { width: 90, height: 90, borderRadius: 45, marginBottom: 12 },
  name: { fontSize: 22, fontWeight: "700", color: "#0f172a" },
  role: { fontSize: 14, color: "#64748b", marginTop: 2 },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  statBox: { alignItems: "center" },
  statNum: { fontSize: 18, fontWeight: "700", color: "#2563eb" },
  statLabel: { fontSize: 12, color: "#64748b", marginTop: 2 },
  section: { marginTop: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#0f172a", marginBottom: 12 },
  infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 12 },
  infoText: { fontSize: 14, color: "#334155" },
});