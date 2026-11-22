import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  ActivityIndicator,
  TextInput,
  SafeAreaView,
  StatusBar,
  Alert,
  RefreshControl,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import { auth } from "../../../lib/firebase";
import { searchRecipes } from "../../../lib/spoonacular";
import { toggleFavoriteRecipe } from "../../../lib/favorites";
import {
  CommunityRecipe,
  rankFeaturedChefs,
  searchCommunity,
  trendingRecipes,
  useFavoriteIds,
  useProfiles,
  usePublicRecipes,
} from "../../../lib/community";
import { useBlockedIds } from "../../../lib/moderation";
import TabHeader from "../../../components/TabHeader";
import RecipeImage from "../../../components/RecipeImage";
import { themedStyles, tc, statusBarStyle, useThemeMode } from "../../../lib/theme";

const CATEGORIES = [
  { name: "Breakfast", icon: "coffee", type: "breakfast" },
  { name: "Lunch", icon: "cutlery", type: "main course" },
  { name: "Dinner", icon: "moon-o", type: "main course" },
  { name: "Snacks", icon: "apple", type: "snack" },
  { name: "Desserts", icon: "birthday-cake", type: "dessert" },
  { name: "Salads", icon: "leaf", type: "salad" },
  { name: "Soups", icon: "fire", type: "soup" },
] as const;

type WebRecipe = { id: number; title: string; image?: string; readyInMinutes?: number; servings?: number };

export default function DiscoverScreen() {
  useThemeMode();
  const router = useRouter();
  const uid = auth.currentUser?.uid;

  // Community data
  const { recipes: publicRecipes, loading: communityLoading } = usePublicRecipes(300);
  const blockedIds = useBlockedIds(uid);
  const favoriteIds = useFavoriteIds(uid);
  const visible = useMemo(
    () => publicRecipes.filter((r) => !blockedIds.has(r.userId)),
    [publicRecipes, blockedIds.size]
  );
  const featuredChefs = useMemo(() => rankFeaturedChefs(visible, 10), [visible]);
  const trending = useMemo(() => trendingRecipes(visible, 10), [visible]);
  const chefProfiles = useProfiles(featuredChefs.map((c) => c.uid));

  // Search state
  const [search, setSearch] = useState("");
  const [activeTerm, setActiveTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [webResults, setWebResults] = useState<WebRecipe[]>([]);
  const [webTotal, setWebTotal] = useState(0);
  const [webOffset, setWebOffset] = useState(0);
  const [webLoading, setWebLoading] = useState(false);
  const [webError, setWebError] = useState<string | null>(null);

  // Easy picks (cached server-side for an hour)
  const [easyRecipes, setEasyRecipes] = useState<WebRecipe[]>([]);
  const [easyLoading, setEasyLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const communityMatches = useMemo(
    () => (activeTerm ? searchCommunity(visible, activeTerm).slice(0, 20) : []),
    [visible, activeTerm]
  );

  const loadEasy = async () => {
    setEasyLoading(true);
    const data = await searchRecipes("easy", 0);
    if (data?.results) setEasyRecipes(data.results);
    setEasyLoading(false);
  };

  useEffect(() => {
    loadEasy();
  }, []);

  const runWebSearch = async (term: string, type?: string, more = false) => {
    setWebLoading(true);
    const offset = more ? webOffset : 0;
    const data = await searchRecipes(term, offset, type);
    setWebError(data?.error || null);
    const results: WebRecipe[] = data?.results || [];
    setWebResults((prev) => (more ? [...prev, ...results] : results));
    setWebTotal(data?.totalResults || 0);
    setWebOffset(offset + 10);
    setWebLoading(false);
  };

  const submitSearch = () => {
    const term = search.trim();
    if (!term) return;
    setActiveCategory(null);
    setActiveTerm(term);
    runWebSearch(term);
  };

  const pickCategory = (name: string, type: string) => {
    if (activeCategory === name) {
      clearSearch();
      return;
    }
    setSearch("");
    setActiveTerm("");
    setActiveCategory(name);
    runWebSearch(name, type);
  };

  const clearSearch = () => {
    setSearch("");
    setActiveTerm("");
    setActiveCategory(null);
    setWebResults([]);
    setWebError(null);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEasy();
    setRefreshing(false);
  };

  const toggleFavorite = async (recipe: any) => {
    const id = String(recipe.id);
    try {
      await toggleFavoriteRecipe(
        {
          id,
          title: recipe.title,
          imageUrl: recipe.imageUrl || recipe.image || "",
          sourceUrl: recipe.imageUrl !== undefined ? `/recipe/${id}` : `/spoon/${id}`,
        },
        favoriteIds.has(id)
      );
    } catch {
      Alert.alert("Error", "Couldn't update your favorites. Please try again.");
    }
  };

  const openWeb = (r: WebRecipe) => router.push(`/spoon/${r.id}` as any);
  const openCommunity = (r: CommunityRecipe) => router.push(`/recipe/${r.id}` as any);

  const showingResults = !!activeTerm || !!activeCategory;

  const Heart = ({ recipe }: { recipe: any }) => {
    const fav = favoriteIds.has(String(recipe.id));
    return (
      <Pressable
        style={styles.heart}
        onPress={() => toggleFavorite(recipe)}
        hitSlop={8}
        accessibilityLabel={fav ? "Remove from favorites" : "Add to favorites"}
      >
        <FontAwesome name={fav ? "heart" : "heart-o"} size={14} color={fav ? "#ef4444" : "#ffffff"} />
      </Pressable>
    );
  };

  const SectionTitle = ({ title, right }: { title: string; right?: React.ReactNode }) => (
    <View style={styles.sectionHeader}>
      <View style={styles.titleRow}>
        <View style={styles.accentBar} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {right}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={statusBarStyle()} backgroundColor={tc("#0f1115")} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f59e0b" />}
      >
        <TabHeader
          title="Discover"
          subtitle="Find your next dish"
          action={{
            icon: "bookmark-o",
            label: "Favorites",
            onPress: () => router.push("/(drawer)/(tabs)/five" as any),
          }}
        />

        {/* Search */}
        <View style={styles.searchContainer}>
          <FontAwesome name="search" size={14} color={tc("#71717a")} />
          <TextInput
            placeholder="Recipes, ingredients or chefs…"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={submitSearch}
            placeholderTextColor={tc("#71717a")}
            style={styles.searchInput}
            returnKeyType="search"
            autoCorrect={false}
          />
          {(search.length > 0 || showingResults) && (
            <Pressable onPress={clearSearch} hitSlop={10} accessibilityLabel="Clear search">
              <FontAwesome name="times-circle" size={16} color={tc("#71717a")} />
            </Pressable>
          )}
        </View>

        {/* Categories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
          keyboardShouldPersistTaps="handled"
        >
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat.name;
            return (
              <Pressable
                key={cat.name}
                onPress={() => pickCategory(cat.name, cat.type)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <FontAwesome
                  name={cat.icon as any}
                  size={12}
                  color={active ? tc("#0f1115") : tc("#a1a1aa")}
                />
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{cat.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {showingResults ? (
          <>
            {/* Community matches */}
            {activeTerm ? (
              <View style={styles.section}>
                <SectionTitle
                  title="From the Community"
                  right={<Text style={styles.count}>{communityMatches.length}</Text>}
                />
                {communityMatches.length === 0 ? (
                  <Text style={styles.mutedPad}>No community recipes match “{activeTerm}” yet.</Text>
                ) : (
                  <View style={styles.listPad}>
                    {communityMatches.map((r) => (
                      <Pressable key={r.id} style={styles.rowCard} onPress={() => openCommunity(r)}>
                        <RecipeImage uri={r.imageUrl} style={styles.rowThumb} iconSize={16} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.rowTitle} numberOfLines={1}>
                            {r.title}
                          </Text>
                          <Text style={styles.rowMeta} numberOfLines={1}>
                            by {r.createdBy || "a chef"}
                            {r.favoriteCount ? `  ·  ♥ ${r.favoriteCount}` : ""}
                          </Text>
                        </View>
                        <FontAwesome name="chevron-right" size={12} color={tc("#52525b")} />
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            ) : null}

            {/* Web results */}
            <View style={styles.section}>
              <SectionTitle
                title={activeCategory ? `${activeCategory} Ideas` : "From the Web"}
                right={webTotal ? <Text style={styles.count}>{webTotal.toLocaleString()}</Text> : null}
              />
              {webLoading && webResults.length === 0 ? (
                <ActivityIndicator color="#f59e0b" style={{ marginVertical: 24 }} />
              ) : webError ? (
                <View style={styles.notice}>
                  <FontAwesome name="exclamation-circle" size={14} color="#f59e0b" />
                  <Text style={styles.noticeText}>{webError}</Text>
                </View>
              ) : webResults.length === 0 ? (
                <Text style={styles.mutedPad}>No web recipes found. Try different keywords.</Text>
              ) : (
                <>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.hRow}
                  >
                    {webResults.map((r) => (
                      <Pressable key={r.id} style={styles.webCard} onPress={() => openWeb(r)}>
                        <View>
                          <RecipeImage uri={r.image} style={styles.webImage} />
                          <Heart recipe={r} />
                        </View>
                        <Text style={styles.cardTitle} numberOfLines={2}>
                          {r.title}
                        </Text>
                        {r.readyInMinutes ? (
                          <Text style={styles.cardMeta}>
                            <FontAwesome name="clock-o" size={11} color={tc("#a1a1aa")} /> {r.readyInMinutes} min
                          </Text>
                        ) : null}
                      </Pressable>
                    ))}
                  </ScrollView>
                  {webResults.length < webTotal && (
                    <Pressable
                      style={styles.moreBtn}
                      onPress={() =>
                        runWebSearch(
                          activeTerm || activeCategory || "",
                          CATEGORIES.find((c) => c.name === activeCategory)?.type,
                          true
                        )
                      }
                      disabled={webLoading}
                    >
                      {webLoading ? (
                        <ActivityIndicator size="small" color="#f59e0b" />
                      ) : (
                        <Text style={styles.moreText}>Load more</Text>
                      )}
                    </Pressable>
                  )}
                </>
              )}
            </View>
          </>
        ) : (
          <>
            {/* Featured chefs */}
            <View style={styles.section}>
              <SectionTitle title="Featured Chefs" />
              {communityLoading ? (
                <ActivityIndicator color="#f59e0b" style={{ marginVertical: 20 }} />
              ) : featuredChefs.length === 0 ? (
                <Text style={styles.mutedPad}>
                  Share a public recipe to become the first featured chef!
                </Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hRow}>
                  {featuredChefs.map((chef, i) => {
                    const profile = chefProfiles[chef.uid];
                    const photo = profile?.photoURL?.startsWith("http") ? profile.photoURL : null;
                    const name = profile?.displayName || chef.name;
                    return (
                      <Pressable
                        key={chef.uid}
                        style={styles.chefCard}
                        onPress={() => router.push(`/chef/${chef.uid}` as any)}
                      >
                        <RecipeImage uri={chef.coverImage} style={styles.chefCover} iconSize={14} />
                        <View style={styles.chefAvatarRing}>
                          {photo ? (
                            <Image source={{ uri: photo }} style={styles.chefAvatar} />
                          ) : (
                            <View style={[styles.chefAvatar, styles.avatarFallback]}>
                              <Text style={styles.avatarInitial}>{name.charAt(0).toUpperCase()}</Text>
                            </View>
                          )}
                        </View>
                        {i < 3 ? (
                          <View style={styles.rankPill}>
                            <Text style={styles.rankText}>#{i + 1}</Text>
                          </View>
                        ) : null}
                        <Text style={styles.chefName} numberOfLines={1}>
                          {name}
                        </Text>
                        <Text style={styles.chefHeadline} numberOfLines={1}>
                          {profile?.headline || "Community Chef"}
                        </Text>
                        <View style={styles.chefStats}>
                          <Text style={styles.chefStat}>
                            <Text style={styles.chefStatNum}>{chef.recipeCount}</Text> recipes
                          </Text>
                          <Text style={styles.chefStat}>
                            <Text style={styles.chefStatNum}>{chef.favorites}</Text> ♥
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            {/* Trending */}
            {trending.length > 0 && (
              <View style={styles.section}>
                <SectionTitle
                  title="Trending in the Community"
                  right={
                    <Pressable onPress={() => router.push("/community" as any)} hitSlop={8}>
                      <Text style={styles.link}>See all</Text>
                    </Pressable>
                  }
                />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hRow}>
                  {trending.map((r) => (
                    <Pressable key={r.id} style={styles.trendCard} onPress={() => openCommunity(r)}>
                      <View>
                        <RecipeImage uri={r.imageUrl} title={r.title} style={styles.trendImage} />
                        <Heart recipe={r} />
                        {r.favoriteCount > 0 && (
                          <View style={styles.favPill}>
                            <FontAwesome name="heart" size={10} color="#ef4444" />
                            <Text style={styles.favPillText}>{r.favoriteCount}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {r.title}
                      </Text>
                      <Text style={styles.cardMeta} numberOfLines={1}>
                        by {r.createdBy || "a chef"}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Easy picks */}
            <View style={styles.section}>
              <SectionTitle title="Quick & Easy" />
              {easyLoading && easyRecipes.length === 0 ? (
                <ActivityIndicator color="#f59e0b" style={{ marginVertical: 20 }} />
              ) : easyRecipes.length === 0 ? (
                <Text style={styles.mutedPad}>Pull down to refresh ideas.</Text>
              ) : (
                <View style={styles.listPad}>
                  {easyRecipes.map((r) => (
                    <Pressable key={r.id} style={styles.easyCard} onPress={() => openWeb(r)}>
                      <View>
                        <RecipeImage uri={r.image} style={styles.easyImage} />
                        <Heart recipe={r} />
                      </View>
                      <View style={styles.easyBody}>
                        <Text style={styles.easyTitle} numberOfLines={2}>
                          {r.title}
                        </Text>
                        <View style={styles.easyMetaRow}>
                          {r.readyInMinutes ? (
                            <View style={styles.metaChip}>
                              <FontAwesome name="clock-o" size={11} color="#f59e0b" />
                              <Text style={styles.metaChipText}>{r.readyInMinutes} min</Text>
                            </View>
                          ) : null}
                          {r.servings ? (
                            <View style={styles.metaChip}>
                              <FontAwesome name="users" size={10} color="#f59e0b" />
                              <Text style={styles.metaChipText}>{r.servings}</Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = themedStyles({
  safeArea: { flex: 1, backgroundColor: "#0f1115" },
  container: { flex: 1 },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 20,
    paddingHorizontal: 16,
    height: 50,
    borderRadius: 16,
    backgroundColor: "#181b20",
    borderWidth: 1,
    borderColor: "#27272a",
  },
  searchInput: { flex: 1, color: "#f4f4f5", fontSize: 15 },

  chipRow: { paddingHorizontal: 20, paddingVertical: 14, gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: "#181b20",
    borderWidth: 1,
    borderColor: "#27272a",
  },
  chipActive: { backgroundColor: "#f59e0b", borderColor: "#f59e0b" },
  chipText: { color: "#a1a1aa", fontWeight: "700", fontSize: 13 },
  chipTextActive: { color: "#0f1115" },

  section: { marginTop: 10, marginBottom: 14 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  accentBar: { width: 4, height: 18, borderRadius: 2, backgroundColor: "#f59e0b" },
  sectionTitle: { color: "#f4f4f5", fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
  count: { color: "#71717a", fontSize: 13, fontWeight: "700" },
  link: { color: "#f59e0b", fontSize: 13, fontWeight: "700" },
  mutedPad: { color: "#a1a1aa", fontSize: 14, paddingHorizontal: 20, lineHeight: 20 },
  listPad: { paddingHorizontal: 20, gap: 10 },
  hRow: { paddingHorizontal: 20, gap: 14 },

  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 20,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
  },
  noticeText: { color: "#f4f4f5", fontSize: 13, flex: 1 },

  heart: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    alignItems: "center",
    justifyContent: "center",
  },

  rowCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    borderRadius: 16,
    backgroundColor: "#181b20",
    borderWidth: 1,
    borderColor: "#27272a",
  },
  rowThumb: { width: 56, height: 56, borderRadius: 12 },
  rowTitle: { color: "#f4f4f5", fontSize: 15, fontWeight: "700" },
  rowMeta: { color: "#a1a1aa", fontSize: 12, marginTop: 3 },

  webCard: { width: 200 },
  webImage: { width: 200, height: 140, borderRadius: 16 },
  trendCard: { width: 230 },
  trendImage: { width: 230, height: 160, borderRadius: 18 },
  cardTitle: { color: "#f4f4f5", fontSize: 14, fontWeight: "700", marginTop: 10 },
  cardMeta: { color: "#a1a1aa", fontSize: 12, marginTop: 3 },
  favPill: {
    position: "absolute",
    left: 8,
    bottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(15, 17, 21, 0.85)",
  },
  favPillText: { color: "#f4f4f5", fontSize: 11, fontWeight: "800" },

  moreBtn: {
    alignSelf: "center",
    marginTop: 14,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#27272a",
    minWidth: 120,
    alignItems: "center",
  },
  moreText: { color: "#f59e0b", fontWeight: "700", fontSize: 13 },

  chefCard: {
    width: 156,
    borderRadius: 18,
    backgroundColor: "#181b20",
    borderWidth: 1,
    borderColor: "#27272a",
    overflow: "hidden",
    alignItems: "center",
    paddingBottom: 14,
  },
  chefCover: { width: "100%", height: 64 },
  chefAvatarRing: {
    marginTop: -28,
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 3,
    borderColor: "#181b20",
    backgroundColor: "#181b20",
  },
  chefAvatar: { width: "100%", height: "100%", borderRadius: 26 },
  avatarFallback: { backgroundColor: "#27272a", alignItems: "center", justifyContent: "center" },
  avatarInitial: { color: "#f59e0b", fontSize: 20, fontWeight: "900" },
  rankPill: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: "#f59e0b",
  },
  rankText: { color: "#0f1115", fontSize: 11, fontWeight: "900" },
  chefName: { color: "#f4f4f5", fontSize: 15, fontWeight: "800", marginTop: 8, paddingHorizontal: 10 },
  chefHeadline: { color: "#a1a1aa", fontSize: 12, marginTop: 2, paddingHorizontal: 10 },
  chefStats: { flexDirection: "row", gap: 12, marginTop: 10 },
  chefStat: { color: "#a1a1aa", fontSize: 12 },
  chefStatNum: { color: "#f4f4f5", fontWeight: "800" },

  easyCard: {
    flexDirection: "row",
    gap: 14,
    padding: 10,
    borderRadius: 18,
    backgroundColor: "#181b20",
    borderWidth: 1,
    borderColor: "#27272a",
  },
  easyImage: { width: 110, height: 96, borderRadius: 14 },
  easyBody: { flex: 1, justifyContent: "space-between", paddingVertical: 4 },
  easyTitle: { color: "#f4f4f5", fontSize: 15, fontWeight: "700", lineHeight: 20 },
  easyMetaRow: { flexDirection: "row", gap: 8 },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: "#0f1115",
  },
  metaChipText: { color: "#f4f4f5", fontSize: 12, fontWeight: "600" },
});
