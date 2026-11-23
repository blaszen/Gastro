import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  SafeAreaView,
  StatusBar,
  Linking,
  ActivityIndicator,
  Alert,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useLocalSearchParams } from "expo-router";
import ScreenHeader from "../../components/ScreenHeader";
import RecipeImage from "../../components/RecipeImage";
import { CATEGORIES, GET_LISTED_URL, Partner, PartnerCategory, usePartners } from "../../lib/partners";
import { themedStyles, tc, statusBarStyle, useThemeMode } from "../../lib/theme";

type Filter = "all" | PartnerCategory;

const open = (url: string) => Linking.openURL(url).catch(() => Alert.alert("Couldn't open that link"));

function PartnerCard({ p }: { p: Partner }) {
  useThemeMode();
  const cat = CATEGORIES.find((c) => c.key === p.category);
  const primary = p.website
    ? { label: p.category === "private-chef" ? "Book" : "Order", icon: "external-link", url: p.website }
    : p.phone
    ? { label: "Call", icon: "phone", url: `tel:${p.phone.replace(/[^\d+]/g, "")}` }
    : p.email
    ? { label: "Email", icon: "envelope", url: `mailto:${p.email}` }
    : null;

  return (
    <View style={styles.card}>
      <RecipeImage uri={p.imageUrl || cat?.image} title={p.name} style={styles.cardImage} iconSize={30} />
      {p.featured ? (
        <View style={styles.featured}>
          <FontAwesome name="star" size={10} color="#0f1115" />
          <Text style={styles.featuredText}>Featured</Text>
        </View>
      ) : null}
      <View style={styles.cardBody}>
        <Text style={styles.cardCat}>{cat?.title || "Culinary Service"}</Text>
        <Text style={styles.cardName}>{p.name}</Text>
        {p.tagline ? <Text style={styles.cardTagline}>{p.tagline}</Text> : null}
        {p.area ? (
          <View style={styles.areaRow}>
            <FontAwesome name="map-marker" size={12} color={tc("#71717a")} />
            <Text style={styles.areaText}>{p.area}</Text>
          </View>
        ) : null}
        <View style={styles.actions}>
          {primary ? (
            <Pressable style={styles.primaryBtn} onPress={() => open(primary.url)}>
              <FontAwesome name={primary.icon as any} size={13} color={tc("#0f1115")} />
              <Text style={styles.primaryText}>{primary.label}</Text>
            </Pressable>
          ) : null}
          {p.phone && primary?.icon !== "phone" ? (
            <Pressable
              style={styles.iconBtn}
              onPress={() => open(`tel:${p.phone!.replace(/[^\d+]/g, "")}`)}
              accessibilityLabel="Call"
            >
              <FontAwesome name="phone" size={15} color="#f59e0b" />
            </Pressable>
          ) : null}
          {p.instagram ? (
            <Pressable
              style={styles.iconBtn}
              onPress={() => open(`https://instagram.com/${p.instagram!.replace(/^@/, "")}`)}
              accessibilityLabel="Instagram"
            >
              <FontAwesome name="instagram" size={16} color="#f59e0b" />
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export default function CulinaryServicesScreen() {
  useThemeMode();
  const params = useLocalSearchParams<{ category?: string }>();
  const [filter, setFilter] = useState<Filter>("all");
  useEffect(() => {
    if (params.category && CATEGORIES.some((c) => c.key === params.category)) setFilter(params.category as Filter);
  }, [params.category]);

  const { partners, loading } = usePartners();
  const shown = useMemo(
    () => (filter === "all" ? partners : partners.filter((p) => p.category === filter)),
    [partners, filter]
  );
  const activeCat = CATEGORIES.find((c) => c.key === filter);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={statusBarStyle()} backgroundColor={tc("#0f1115")} />
      <ScreenHeader title="Culinary Services" subtitle="Local chefs & meal prep in San Diego" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {([["all", "All"], ...CATEGORIES.map((c) => [c.key, c.title])] as [Filter, string][]).map(([key, label]) => (
            <Pressable
              key={key}
              style={[styles.chip, filter === key && styles.chipActive]}
              onPress={() => setFilter(key)}
            >
              <Text style={[styles.chipText, filter === key && styles.chipTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {loading ? (
          <ActivityIndicator color="#f59e0b" style={{ marginTop: 40 }} />
        ) : shown.length ? (
          shown.map((p) => <PartnerCard key={p.id} p={p} />)
        ) : (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <FontAwesome name={(activeCat?.icon as any) || "cutlery"} size={26} color="#f59e0b" />
            </View>
            <Text style={styles.emptyTitle}>
              {activeCat ? `${activeCat.title} coming soon` : "Partners coming soon"}
            </Text>
            <Text style={styles.emptySub}>
              We're hand-picking San Diego's best private chefs, meal prep companies and caterers. Check back
              soon.
            </Text>
          </View>
        )}

        {/* Supply side: invite businesses to get listed */}
        <View style={styles.listCard}>
          <FontAwesome name="handshake-o" size={22} color="#f59e0b" />
          <Text style={styles.listTitle}>Are you a chef or meal prep company?</Text>
          <Text style={styles.listSub}>
            Get a free listing on Gastro and reach home cooks across San Diego.
          </Text>
          <Pressable style={styles.listBtn} onPress={() => open(GET_LISTED_URL)}>
            <Text style={styles.listBtnText}>Get Listed Free</Text>
            <FontAwesome name="arrow-right" size={12} color={tc("#0f1115")} />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = themedStyles({
  container: { flex: 1, backgroundColor: "#0f1115" },
  content: { paddingHorizontal: 20, paddingBottom: 48 },

  chips: { gap: 8, paddingBottom: 16 },
  chip: {
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    backgroundColor: "#181b20",
    borderWidth: 1,
    borderColor: "#27272a",
  },
  chipActive: { backgroundColor: "#f59e0b", borderColor: "#f59e0b" },
  chipText: { color: "#a1a1aa", fontWeight: "700", fontSize: 13 },
  chipTextActive: { color: "#0f1115" },

  card: {
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#181b20",
    borderWidth: 1,
    borderColor: "#27272a",
    marginBottom: 16,
  },
  cardImage: { width: "100%", height: 160 },
  featured: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: "#f59e0b",
  },
  featuredText: { color: "#0f1115", fontSize: 11, fontWeight: "900" },
  cardBody: { padding: 16 },
  cardCat: { color: "#f59e0b", fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.8 },
  cardName: { color: "#f4f4f5", fontSize: 19, fontWeight: "900", marginTop: 4 },
  cardTagline: { color: "#a1a1aa", fontSize: 14, marginTop: 4, lineHeight: 20 },
  areaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  areaText: { color: "#71717a", fontSize: 12, fontWeight: "600" },
  actions: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 },
  primaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f59e0b",
  },
  primaryText: { color: "#0f1115", fontWeight: "900", fontSize: 15 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#27272a",
    alignItems: "center",
    justifyContent: "center",
  },

  empty: { alignItems: "center", paddingVertical: 36, paddingHorizontal: 16 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#181b20",
    borderWidth: 1,
    borderColor: "#27272a",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: { color: "#f4f4f5", fontSize: 18, fontWeight: "800" },
  emptySub: { color: "#a1a1aa", fontSize: 14, textAlign: "center", marginTop: 6, lineHeight: 20 },

  listCard: {
    alignItems: "center",
    gap: 8,
    padding: 22,
    marginTop: 8,
    borderRadius: 22,
    backgroundColor: "rgba(245, 158, 11, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  listTitle: { color: "#f4f4f5", fontSize: 17, fontWeight: "900", textAlign: "center" },
  listSub: { color: "#a1a1aa", fontSize: 14, textAlign: "center", lineHeight: 20 },
  listBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
    paddingHorizontal: 20,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f59e0b",
  },
  listBtnText: { color: "#0f1115", fontWeight: "900", fontSize: 15 },
});
