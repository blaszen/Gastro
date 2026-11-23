import React, { useState, useEffect, useRef } from "react";
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
  Linking,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { auth, db } from "../../../lib/firebase";
import { collection, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import RecipeImage from "../../../components/RecipeImage";
import TabHeader from "../../../components/TabHeader";
import { useNotificationBadge } from "../../../lib/notifications";
import { useBlockedIds } from "../../../lib/moderation";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { searchRecipes, getRecipeInformation } from "../../../lib/spoonacular";
import { router } from "expo-router";
import { fetchUserFavorites, toggleFavoriteRecipe } from "../../../lib/favorites";
import { themedStyles, tc, statusBarStyle, useThemeMode } from "../../../lib/theme";
import { LEVELS, Level } from "../../../lib/curriculum";
import { useLessonProgress } from "../../../lib/progress";
import { CATEGORIES } from "../../../lib/partners";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// --- Data Types ---
interface ExtendedIngredient {
  id: number;
  original: string;
}

interface InstructionStep {
  number: number;
  step: string;
}

interface Recipe {
  id: string | number;
  title: string;
  image: string;
  time?: string | number;
  readyInMinutes?: number;
  tag?: string;
  rating?: string;
  url?: string;
  sourceUrl?: string;
  summary?: string;
  servings?: number;
  instructions?: string;
  extendedIngredients?: ExtendedIngredient[];
  analyzedInstructions?: {
    steps: InstructionStep[];
  }[];
}

interface Video {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  url: string;
}

interface Service {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  icon: keyof typeof FontAwesome.glyphMap;
  url: string;
}





export default function TabOneScreen() {
  useThemeMode();
  // FAVORITES STATE
  const [favorites, setFavorites] = useState<string[]>([]);

  // Load user's initial favorites from Firestore on mount
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const favIds = await fetchUserFavorites();
        setFavorites(favIds);
      } catch (err) {
        console.log("Error loading favorites:", err);
      }
    };
    loadFavorites();
  }, []);

  // Handle favorite toggle with Optimistic UI Updates
  const handleToggleFavorite = async (recipe: any) => {
    const recipeIdStr = String(recipe.id);
    const isCurrentlyFav = favorites.includes(recipeIdStr);

    // 1. Optimistically update UI immediately
    setFavorites((prev) =>
      isCurrentlyFav
        ? prev.filter((id) => id !== recipeIdStr)
        : [...prev, recipeIdStr]
    );

    try {
      // 2. Sync with Firestore
      await toggleFavoriteRecipe(recipe, isCurrentlyFav);
    } catch (err) {
      console.log("Error updating favorite in Firestore:", err);
      // 3. Revert if call fails
      setFavorites((prev) =>
        isCurrentlyFav
          ? [...prev, recipeIdStr]
          : prev.filter((id) => id !== recipeIdStr)
      );
      Alert.alert("Error", "Could not update favorites. Please try again.");
    }
  };

  // Recipe detail modal state
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [recipeModalVisible, setRecipeModalVisible] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const handleRecipePress = async (recipe: Recipe) => {
    setLoadingDetails(true);
    setRecipeModalVisible(true);

    const fullDetails = await getRecipeInformation(recipe.id);

    if (fullDetails) {
      setSelectedRecipe(fullDetails);
    } else {
      setSelectedRecipe(recipe);
    }

    setLoadingDetails(false);
  };

  const [search, setSearch] = useState("");
  const navigation = useNavigation();

  // Dynamic Spoonacular API Search State
  const [recipeResults, setRecipeResults] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [totalResults, setTotalResults] = useState(0);
  const [offset, setOffset] = useState(0);

  // Latest community recipes for the home feed
  const [communityRecipes, setCommunityRecipes] = useState<any[]>([]);
  const notificationCount = useNotificationBadge(auth.currentUser?.uid);
  const blockedIds = useBlockedIds(auth.currentUser?.uid);
  const { done: lessonsDone } = useLessonProgress(auth.currentUser?.uid);

  useEffect(() => {
    const q = query(
      collection(db, "recipes"),
      where("isPublic", "==", true),
      orderBy("createdAt", "desc"),
      limit(10)
    );
    return onSnapshot(
      q,
      (snap) => setCommunityRecipes(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))),
      (err) => console.error("Community feed error:", err)
    );
  }, []);

  // Scroll Ref
  const scrollRef = useRef<ScrollView>(null);
  const [lastScrollIndex, setLastScrollIndex] = useState(0);

  const currentUser = auth.currentUser;
  const greetingName =
    currentUser?.displayName || currentUser?.email?.split("@")[0] || "Chef";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const handleOpenLink = async (url?: string) => {
    if (!url) {
      Alert.alert("Notice", "Source URL not available for this item.");
      return;
    }
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error("Failed opening link:", error);
      Alert.alert("Error", "Could not open link.");
    }
  };

  const fetchSpoonacular = async (newSearch = false) => {
    if (search.trim().length === 0) return;

    setLoading(true);
    setNoResults(false);

    const newOffset = newSearch ? 0 : offset;
    const data = await searchRecipes(search, newOffset);
    setSearchError(data?.error || null);

    if (!data?.results || data.results.length === 0) {
      setNoResults(true);
      setRecipeResults([]);
    } else {
      if (newSearch) {
        setRecipeResults(data.results);
        setOffset(10);
        setLastScrollIndex(0);
      } else {
        setRecipeResults((prev) => [...prev, ...data.results]);
        setLastScrollIndex(offset);
        setOffset(offset + 10);
      }
      setTotalResults(data.totalResults);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (lastScrollIndex > 0 && scrollRef.current) {
      const cardWidth = SCREEN_WIDTH * 0.62;
      const marginRight = 14;
      const scrollX = lastScrollIndex * (cardWidth + marginRight);
      scrollRef.current.scrollTo({ x: scrollX, animated: true });
    }
  }, [recipeResults]);

  const CARD_WIDTH = SCREEN_WIDTH * 0.62;
  const SERVICE_CARD_WIDTH = SCREEN_WIDTH * 0.82;

  const renderRecipeCard = (item: Recipe) => {
    const isFav = favorites.includes(String(item.id));

    return (
      <TouchableOpacity
        key={item.id}
        activeOpacity={0.88}
        style={[styles.card, { width: CARD_WIDTH }]}
        onPress={() => handleRecipePress(item)}
      >
        <View style={styles.imageWrapper}>
          <Image
            source={{ uri: item.image }}
            style={styles.cardImage}
            resizeMode="cover"
          />

          {/* Favorite Heart Badge Overlay */}
          <Pressable
            style={styles.favoriteBadge}
            onPress={(e) => {
              e.stopPropagation(); // Prevents opening modal when clicking heart
              handleToggleFavorite(item);
            }}
          >
            <FontAwesome
              name={isFav ? "heart" : "heart-o"}
              size={14}
              color={isFav ? "#ef4444" : "#f59e0b"}
            />
          </Pressable>

          {item.tag && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.tag}</Text>
            </View>
          )}

          {(item.time || item.readyInMinutes) && (
            <View style={styles.timeBadge}>
              <FontAwesome
                name="clock-o"
                size={10}
                color="#f59e0b"
                style={{ marginRight: 4 }}
              />
              <Text style={styles.timeText}>
                {item.readyInMinutes ? `${item.readyInMinutes}m` : item.time}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={styles.metaRow}>
            <FontAwesome name="star" size={12} color="#f59e0b" />
            <Text style={styles.ratingText}>{item.rating || "4.8"}</Text>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.metaText}>Featured</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderLevelCard = ({ item }: { item: Level }) => {
    const levelDone = item.lessons.filter((x) => lessonsDone.has(x.id)).length;
    return (
      <TouchableOpacity
        activeOpacity={0.88}
        style={[styles.card, { width: CARD_WIDTH }]}
        onPress={() => router.push("/masterclassLibrary" as never)}
      >
        <View style={styles.imageWrapper}>
          <Image source={{ uri: item.image }} style={styles.cardImage} resizeMode="cover" />
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>LEVEL {item.number}</Text>
          </View>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.subText}>
            {levelDone ? `${levelDone}/${item.lessons.length} lessons done` : `${item.lessons.length} lessons`}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderServiceCard = ({ item }: { item: (typeof CATEGORIES)[number] }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[styles.serviceCard, { width: SERVICE_CARD_WIDTH }]}
      onPress={() => router.push({ pathname: "/services", params: { category: item.key } } as never)}
    >
      <Image
        source={{ uri: item.image }}
        style={styles.serviceImage}
        resizeMode="cover"
      />
      <View style={styles.darkGradient} />

      <View style={styles.serviceIconContainer}>
        <FontAwesome name={item.icon as any} size={13} color="#f59e0b" />
      </View>

      <View style={styles.serviceContent}>
        <Text style={styles.serviceTitle}>{item.title}</Text>
        <Text style={styles.serviceSubtitle}>{item.subtitle}</Text>

        <View style={styles.serviceCta}>
          <Text style={styles.serviceCtaText}>See local partners</Text>
          <FontAwesome name="arrow-right" size={10} color="#f59e0b" />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={statusBarStyle()} backgroundColor={tc("#0f1115")} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <TabHeader
          title={greeting}
          subtitle={greetingName}
          action={{
            icon: "bell-o",
            label: "Notifications",
            badge: notificationCount,
            onPress: () => router.push("/notifications" as any),
          }}
        />

        {/* In-App Recipe Detail Modal */}
        <Modal visible={recipeModalVisible} animationType="slide" transparent={false}>
          <SafeAreaView style={styles.recipeModalContainer}>
            <StatusBar barStyle={statusBarStyle()} backgroundColor={tc("#0f1115")} />

            {/* Modal Header Controls */}
            <View style={styles.recipeModalHeader}>
              <Pressable
                style={styles.closeBtn}
                onPress={() => setRecipeModalVisible(false)}
              >
                <FontAwesome name="chevron-left" size={16} color="#f59e0b" />
                <Text style={styles.closeBtnText}>Back</Text>
              </Pressable>

              <View style={{ flexDirection: "row", alignItems: "center" }}>
                {selectedRecipe && (
                  <Pressable
                    onPress={() => handleToggleFavorite(selectedRecipe)}
                    style={{ padding: 6, marginRight: 12 }}
                  >
                    <FontAwesome
                      name={favorites.includes(String(selectedRecipe.id)) ? "heart" : "heart-o"}
                      size={18}
                      color={favorites.includes(String(selectedRecipe.id)) ? "#ef4444" : tc("#a1a1aa")}
                    />
                  </Pressable>
                )}

                {selectedRecipe?.sourceUrl && (
                  <Pressable
                    onPress={() => handleOpenLink(selectedRecipe.sourceUrl)}
                    style={styles.externalLinkBtn}
                  >
                    <FontAwesome name="external-link" size={14} color={tc("#a1a1aa")} />
                  </Pressable>
                )}
              </View>
            </View>

            {selectedRecipe && (
              <ScrollView
                contentContainerStyle={{ paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
              >
                {/* Cover Image & Title */}
                <Image
                  source={{ uri: selectedRecipe.image }}
                  style={styles.recipeModalImage}
                />

                <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
                  <Text style={styles.recipeModalTitle}>{selectedRecipe.title}</Text>

                  {/* Quick Metrics */}
                  <View style={styles.recipeMetaContainer}>
                    {selectedRecipe.readyInMinutes && (
                      <View style={styles.recipeMetaChip}>
                        <FontAwesome name="clock-o" size={12} color="#f59e0b" />
                        <Text style={styles.recipeMetaText}>
                          {selectedRecipe.readyInMinutes} Mins
                        </Text>
                      </View>
                    )}
                    {selectedRecipe.servings && (
                      <View style={styles.recipeMetaChip}>
                        <FontAwesome name="user" size={12} color="#f59e0b" />
                        <Text style={styles.recipeMetaText}>
                          {selectedRecipe.servings} Servings
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Ingredients Section */}
                  {selectedRecipe.extendedIngredients &&
                    selectedRecipe.extendedIngredients.length > 0 && (
                      <View style={styles.recipeSection}>
                        <View style={styles.titleRow}>
                          <View style={styles.amberAccentBar} />
                          <Text style={styles.sectionTitle}>Ingredients</Text>
                        </View>
                        {selectedRecipe.extendedIngredients.map((ing, idx) => (
                          <View key={ing.id || idx} style={styles.ingredientRow}>
                            <FontAwesome name="circle" size={6} color="#f59e0b" style={{ marginRight: 10 }} />
                            <Text style={styles.ingredientText}>{ing.original}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                  {/* Preparation / Instructions Section */}
                  <View style={styles.recipeSection}>
                    <View style={styles.titleRow}>
                      <View style={styles.amberAccentBar} />
                      <Text style={styles.sectionTitle}>Preparation Steps</Text>
                    </View>

                    {loadingDetails ? (
                      <ActivityIndicator size="small" color="#f59e0b" style={{ marginVertical: 20 }} />
                    ) : selectedRecipe?.analyzedInstructions &&
                      selectedRecipe.analyzedInstructions.length > 0 &&
                      selectedRecipe.analyzedInstructions[0].steps.length > 0 ? (
                      selectedRecipe.analyzedInstructions[0].steps.map((step) => (
                        <View key={step.number} style={styles.stepRow}>
                          <View style={styles.stepNumberBadge}>
                            <Text style={styles.stepNumberText}>{step.number}</Text>
                          </View>
                          <Text style={styles.stepText}>{step.step}</Text>
                        </View>
                      ))
                    ) : selectedRecipe?.instructions ? (
                      <Text style={styles.stepText}>
                        {selectedRecipe.instructions.replace(/<[^>]*>?/gm, "")}
                      </Text>
                    ) : (
                      <View>
                        <Text style={styles.stepText}>
                          Detailed step-by-step instructions are not directly available for this item.
                        </Text>
                        {selectedRecipe?.sourceUrl && (
                          <Pressable
                            style={{ marginTop: 10 }}
                            onPress={() => handleOpenLink(selectedRecipe.sourceUrl)}
                          >
                            <Text style={{ color: "#f59e0b", fontWeight: "600" }}>
                              View full recipe source →
                            </Text>
                          </Pressable>
                        )}
                      </View>
                    )}
                  </View>
                </View>
              </ScrollView>
            )}
          </SafeAreaView>
        </Modal>

        {/* Quick Actions */}
        <View style={styles.utilityGrid}>
          {([
            ["pencil", "Create Recipe", "Share a dish", "/(drawer)/(tabs)/three"],
            ["shopping-basket", "Grocery List", "Prep & shop", "/grocery"],
            ["globe", "Community", "See what's cooking", "/community"],
          ] as const).map(([icon, title, sub, href]) => (
            <TouchableOpacity
              key={title}
              style={styles.utilityCard}
              onPress={() => router.push(href as any)}
            >
              <View style={styles.utilityIconWrapper}>
                <FontAwesome name={icon} size={14} color="#f59e0b" />
              </View>
              <Text style={styles.utilityTitle}>{title}</Text>
              <Text style={styles.utilitySub}>{sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Fresh from the community */}
        {communityRecipes.filter((r) => !blockedIds.has(r.userId)).length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <View style={styles.sectionHeader}>
              <View style={styles.titleRow}>
                <View style={styles.amberAccentBar} />
                <Text style={styles.sectionTitle}>Fresh from the Community</Text>
              </View>
              <TouchableOpacity activeOpacity={0.7} onPress={() => router.push("/community" as any)}>
                <Text style={styles.seeAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.listContainer}
            >
              {communityRecipes.filter((r) => !blockedIds.has(r.userId)).map((r) => (
                <Pressable
                  key={r.id}
                  style={styles.communityCard}
                  onPress={() => router.push(`/recipe/${r.id}` as any)}
                >
                  <RecipeImage uri={r.imageUrl} title={r.title} style={styles.communityImage} />
                  <Text style={styles.communityTitle} numberOfLines={1}>
                    {r.title || "Untitled"}
                  </Text>
                  <Text style={styles.communityAuthor} numberOfLines={1}>
                    by {r.createdBy || "a chef"}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Search bar */}
        <View style={styles.searchContainer}>
          <FontAwesome
            name="search"
            size={14}
            color="#71717a"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search recipes, ingredients, or techniques..."
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => fetchSpoonacular(true)}
            placeholderTextColor="#71717a"
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable
              onPress={() => {
                setSearch("");
                setRecipeResults([]);
                setNoResults(false);
              }}
            >
              <FontAwesome name="times-circle" size={14} color="#71717a" />
            </Pressable>
          )}
        </View>

        {/* Loading & No Results States */}
        {loading && (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="small" color="#f59e0b" />
          </View>
        )}

        {!loading && noResults && (
          <View style={styles.emptyContainer}>
            <FontAwesome name="search-minus" size={28} color={tc("#3f3f46")} />
            <Text style={styles.emptyText}>{searchError ? "Search unavailable" : "No creations found"}</Text>
            {searchError ? (
              <Text style={[styles.emptyText, { fontSize: 12, marginTop: 4, textAlign: "center" }]}>{searchError}</Text>
            ) : null}
          </View>
        )}

        {/* Search Results / Culinary Highlights */}
        {recipeResults.length > 0 && (
          <View style={{ marginBottom: 28 }}>
            <View style={styles.sectionHeader}>
              <View style={styles.titleRow}>
                <View style={styles.amberAccentBar} />
                <Text style={styles.sectionTitle}>Search Results</Text>
              </View>
              <Text style={styles.resultsCount}>{totalResults} items</Text>
            </View>

            <ScrollView
              ref={scrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.listContainer}
            >
              {recipeResults.map((item) => renderRecipeCard(item))}
            </ScrollView>

            {!loading && recipeResults.length < totalResults && (
              <Pressable
                onPress={() => fetchSpoonacular(false)}
                style={styles.moreButton}
              >
                <Text style={styles.moreButtonText}>Load More</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Masterclasses & Techniques */}
        <View style={styles.sectionHeader}>
          <View style={styles.titleRow}>
            <View style={styles.amberAccentBar} />
            <Text style={styles.sectionTitle}>Masterclass: Basics to Chef</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/masterclassLibrary" as never)}
          >
            <Text style={styles.seeAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={LEVELS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          renderItem={renderLevelCard}
          contentContainerStyle={styles.listContainer}
        />

        {/* White-labeled Culinary Services */}
        <View style={styles.sectionHeader}>
          <View style={styles.titleRow}>
            <View style={styles.amberAccentBar} />
            <Text style={styles.sectionTitle}>Culinary Services</Text>
          </View>
          <TouchableOpacity activeOpacity={0.7} onPress={() => router.push("/services" as never)}>
            <Text style={styles.seeAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={CATEGORIES}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.key}
          renderItem={renderServiceCard}
          contentContainerStyle={styles.listContainer}
        />
      </ScrollView>

    </SafeAreaView>
  );
}

const styles = themedStyles({
  avatarFallback: { backgroundColor: "#27272a", alignItems: "center", justifyContent: "center" },
  avatarInitial: { color: "#f59e0b", fontSize: 16, fontWeight: "800" },
  bellBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
  },
  bellBadgeText: { color: "#ffffff", fontSize: 10, fontWeight: "800" },
  communityCard: { width: 160, marginRight: 14 },
  communityImage: { width: 160, height: 120, borderRadius: 14, marginBottom: 8 },
  communityTitle: { color: "#f4f4f5", fontSize: 14, fontWeight: "700" },
  communityAuthor: { color: "#a1a1aa", fontSize: 12, marginTop: 2 },
  safeArea: {
    flex: 1,
    backgroundColor: "#0f1115",
  },
  container: {
    flex: 1,
    backgroundColor: "#0f1115",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  leftHeader: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  avatarBorder: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: "#f59e0b",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  headerTextContainer: {
    flex: 1,
  },
  greeting: {
    color: "#a1a1aa",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  username: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: "rgba(239, 68, 68, 0.2)",
  },
  utilityGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  utilityCard: {
    flex: 1,
    backgroundColor: "#181a20",
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  utilityIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#27272a",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  utilityTitle: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 2,
  },
  utilitySub: {
    color: "#71717a",
    fontSize: 10,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#181a20",
    borderRadius: 12,
    marginHorizontal: 20,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: "#27272a",
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: "#ffffff",
    fontSize: 13,
  },
  loaderBox: {
    paddingVertical: 20,
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 30,
  },
  emptyText: {
    color: "#71717a",
    fontSize: 14,
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  amberAccentBar: {
    width: 3,
    height: 14,
    backgroundColor: "#f59e0b",
    borderRadius: 2,
    marginRight: 8,
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  seeAllText: {
    color: "#f59e0b",
    fontSize: 12,
    fontWeight: "600",
  },
  resultsCount: {
    color: "#71717a",
    fontSize: 12,
  },
  listContainer: {
    paddingLeft: 20,
    paddingRight: 8,
  },
  card: {
    backgroundColor: "#181a20",
    borderRadius: 14,
    marginRight: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#27272a",
  },
  imageWrapper: {
    position: "relative",
    width: "100%",
    height: 120,
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  favoriteBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(15, 17, 21, 0.85)",
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: "#f59e0b",
    zIndex: 10,
  },
  badge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(15, 17, 21, 0.85)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: "#3f3f46",
  },
  badgeText: {
    color: "#f59e0b",
    fontSize: 10,
    fontWeight: "700",
  },
  timeBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(15, 17, 21, 0.85)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  timeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "600",
  },
  cardContent: {
    padding: 12,
  },
  cardTitle: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    color: "#f59e0b",
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 4,
  },
  dot: {
    color: "#3f3f46",
    marginHorizontal: 6,
  },
  metaText: {
    color: "#71717a",
    fontSize: 11,
  },
  playOverlay: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -16 }, { translateY: -16 }],
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f59e0b",
    justifyContent: "center",
    alignItems: "center",
  },
  durationBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(15, 17, 21, 0.85)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "600",
  },
  subText: {
    color: "#71717a",
    fontSize: 11,
  },
  moreButton: {
    alignSelf: "center",
    marginTop: 14,
    backgroundColor: "#181a20",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#f59e0b",
  },
  moreButtonText: {
    color: "#f59e0b",
    fontSize: 12,
    fontWeight: "700",
  },
  serviceCard: {
    height: 140,
    borderRadius: 14,
    marginRight: 14,
    overflow: "hidden",
    position: "relative",
    justifyContent: "flex-end",
    padding: 14,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  serviceImage: {
    ...StyleSheet.absoluteFillObject,
  },
  darkGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 17, 21, 0.75)",
  },
  serviceIconContainer: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(15, 17, 21, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: "#f59e0b",
  },
  serviceContent: {
    zIndex: 2,
  },
  serviceTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  serviceSubtitle: {
    color: "#a1a1aa",
    fontSize: 11,
    marginBottom: 8,
  },
  serviceCta: {
    flexDirection: "row",
    alignItems: "center",
  },
  serviceCtaText: {
    color: "#f59e0b",
    fontSize: 11,
    fontWeight: "700",
    marginRight: 6,
  },
  // Modal Common Overlay Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#181a20",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  inputLabel: {
    color: "#a1a1aa",
    fontSize: 12,
    marginBottom: 6,
    marginTop: 8,
  },
  modalInput: {
    backgroundColor: "#0f1115",
    color: "#ffffff",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#27272a",
    marginBottom: 12,
  },
  // Recipe Detail Modal Styles
  recipeModalContainer: {
    flex: 1,
    backgroundColor: "#0f1115",
  },
  recipeModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#27272a",
  },
  closeBtn: {
    flexDirection: "row",
    alignItems: "center",
  },
  closeBtnText: {
    color: "#f59e0b",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  externalLinkBtn: {
    padding: 6,
  },
  recipeModalImage: {
    width: "100%",
    height: 220,
  },
  recipeModalTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 12,
  },
  recipeMetaContainer: {
    flexDirection: "row",
    marginBottom: 16,
  },
  recipeMetaChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#181a20",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  recipeMetaText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 6,
  },
  recipeSection: {
    marginTop: 16,
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },
  ingredientText: {
    color: "#a1a1aa",
    fontSize: 13,
    flex: 1,
  },
  stepRow: {
    flexDirection: "row",
    marginVertical: 6,
  },
  stepNumberBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#f59e0b",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    marginTop: 2,
  },
  stepNumberText: {
    color: "#0f1115",
    fontSize: 11,
    fontWeight: "800",
  },
  stepText: {
    color: "#a1a1aa",
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
});