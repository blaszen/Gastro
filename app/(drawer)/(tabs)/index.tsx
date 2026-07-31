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
import { signOut } from "firebase/auth";
import { auth } from "../../../lib/firebase";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { searchRecipes, getRecipeInformation }from "../../../lib/spoonacular";
import { useAudioPlayer } from "expo-audio";
import { router } from "expo-router";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const ALARM_SOUND_URI =
  "https://actions.google.com/sounds/v1/alarms/beep_short.ogg";

// --- Data Types ---
// Add / Update Recipe Interface
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

type ConversionCategory = "weight" | "volume" | "temp" | "length";

interface ConversionOption {
  label: string;
  convert: (val: number) => string;
  unitLabel: string;
}

// Map conversion types by category
const CONVERSION_OPTIONS: Record<ConversionCategory, ConversionOption[]> = {
  weight: [
    { label: "Ounces (oz) → Grams (g)", convert: (v) => `${(v * 28.3495).toFixed(1)} g`, unitLabel: "oz" },
    { label: "Grams (g) → Ounces (oz)", convert: (v) => `${(v / 28.3495).toFixed(2)} oz`, unitLabel: "g" },
    { label: "Pounds (lbs) → Kilograms (kg)", convert: (v) => `${(v * 0.453592).toFixed(2)} kg`, unitLabel: "lbs" },
    { label: "Kilograms (kg) → Pounds (lbs)", convert: (v) => `${(v / 0.453592).toFixed(2)} lbs`, unitLabel: "kg" },
  ],
  volume: [
    { label: "Tablespoons (tbsp) → Cups", convert: (v) => `${(v / 16).toFixed(2)} cups`, unitLabel: "tbsp" },
    { label: "Cups → Tablespoons (tbsp)", convert: (v) => `${(v * 16).toFixed(1)} tbsp`, unitLabel: "cups" },
    { label: "Fluid Oz (fl oz) → Milliliters (ml)", convert: (v) => `${(v * 29.5735).toFixed(1)} ml`, unitLabel: "fl oz" },
    { label: "Milliliters (ml) → Fluid Oz (fl oz)", convert: (v) => `${(v / 29.5735).toFixed(2)} fl oz`, unitLabel: "ml" },
    { label: "Liters (L) → Gallons (gal)", convert: (v) => `${(v * 0.264172).toFixed(2)} gal`, unitLabel: "L" },
    { label: "Gallons (gal) → Liters (L)", convert: (v) => `${(v / 0.264172).toFixed(2)} L`, unitLabel: "gal" },
  ],
  temp: [
    { label: "Fahrenheit (°F) → Celsius (°C)", convert: (v) => `${(((v - 32) * 5) / 9).toFixed(1)} °C`, unitLabel: "°F" },
    { label: "Celsius (°C) → Fahrenheit (°F)", convert: (v) => `${((v * 9) / 5 + 32).toFixed(1)} °F`, unitLabel: "°C" },
  ],
  length: [
    { label: "Inches (in) → Centimeters (cm)", convert: (v) => `${(v * 2.54).toFixed(2)} cm`, unitLabel: "in" },
    { label: "Centimeters (cm) → Inches (in)", convert: (v) => `${(v / 2.54).toFixed(2)} in`, unitLabel: "cm" },
  ],
};

const cookingVideos: Video[] = [
  {
    id: "1",
    title: "Mastering Knife Skills & Precise Prep",
    thumbnail:
      "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80",
    duration: "3:45",
    url: "https://www.youtube.com/watch?v=dCGS067s0zo",
  },
  {
    id: "2",
    title: "Classic Sauces & Emulsions",
    thumbnail:
      "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80",
    duration: "5:10",
    url: "https://www.youtube.com/watch?v=PUP7U5vTMM0",
  },
  {
    id: "3",
    title: "Artisanal Dough & Fermentation",
    thumbnail:
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80",
    duration: "12:30",
    url: "https://www.youtube.com/watch?v=sv3TXMSv6Lw",
  },
];

const services: Service[] = [
  {
    id: "1",
    title: "Private Dining & Tasting Menus",
    subtitle: "Custom multi-course plated experiences",
    image:
      "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=1000&q=80",
    icon: "cutlery",
    url: "https://www.google.com/maps/search/private+chef+dining",
  },
  {
    id: "2",
    title: "Artisanal Meal Solutions",
    subtitle: "Chef-designed macronutrient balance delivered",
    image:
      "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1000&q=80",
    icon: "leaf",
    url: "https://www.google.com/maps/search/meal+prep+delivery",
  },
  {
    id: "3",
    title: "Bespoke Event Catering",
    subtitle: "Elevated craft dining & signature cocktail bars",
    image:
      "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1000&q=80",
    icon: "glass",
    url: "https://www.google.com/maps/search/catering+services",
  },
];

export default function TabOneScreen() {
  // Inside TabOneScreen component state declaration:
const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
const [recipeModalVisible, setRecipeModalVisible] = useState(false);
// Add loading state for recipe details if needed
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
  const [totalResults, setTotalResults] = useState(0);
  const [offset, setOffset] = useState(0);

  // Modal States
  const [converterVisible, setConverterVisible] = useState(false);
  const [eightySixVisible, setEightySixVisible] = useState(false);
  const [timerVisible, setTimerVisible] = useState(false);

  // Kitchen Timer State
  const [secondsLeft, setSecondsLeft] = useState(300); // 5 mins default
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const player = useAudioPlayer(ALARM_SOUND_URI);

  // Quick Converter Local State
  const [selectedCategory, setSelectedCategory] =
    useState<ConversionCategory>("weight");
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(0);
  const [convertAmount, setConvertAmount] = useState("1");

  // 86 List State
  const [eightySixItems, setEightySixItems] = useState([
    "Flatiron Steak",
    "Wild Mushroom Risotto",
  ]);
  const [newItem, setNewItem] = useState("");

  // Scroll Ref
  const scrollRef = useRef<ScrollView>(null);
  const [lastScrollIndex, setLastScrollIndex] = useState(0);

  const userEmail = auth.currentUser?.email || "";

  // Timer Countdown Effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isTimerRunning && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      try {
        player.seekTo(0);
        player.play();
      } catch (err) {
        console.log("Audio alert playback error:", err);
      }
      Alert.alert("Timer Complete!", "Your kitchen timer has finished.");
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, secondsLeft, player]);

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

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace("/auth/login");
    } catch (err) {
      console.error("Logout error:", err);
      Alert.alert("Logout Error", "Unable to sign out properly.");
    }
  };

  const fetchSpoonacular = async (newSearch = false) => {
    if (search.trim().length === 0) return;

    setLoading(true);
    setNoResults(false);

    const newOffset = newSearch ? 0 : offset;
    const data = await searchRecipes(search, newOffset);

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

  const currentOptions = CONVERSION_OPTIONS[selectedCategory];
  const currentOption = currentOptions[selectedOptionIndex] || currentOptions[0];

  const getConvertedValue = () => {
    const val = parseFloat(convertAmount);
    if (isNaN(val)) return "---";
    return currentOption.convert(val);
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handleAdd86Item = () => {
    if (newItem.trim().length > 0) {
      setEightySixItems([...eightySixItems, newItem.trim()]);
      setNewItem("");
    }
  };

  const handleRemove86Item = (index: number) => {
    setEightySixItems(eightySixItems.filter((_, i) => i !== index));
  };

  const renderRecipeCard = (item: Recipe) => (
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

  const renderVideoCard = ({ item }: { item: Video }) => (
    <TouchableOpacity
      activeOpacity={0.88}
      style={[styles.card, { width: CARD_WIDTH }]}
      onPress={() => handleOpenLink(item.url)}
    >
      <View style={styles.imageWrapper}>
        <Image
          source={{ uri: item.thumbnail }}
          style={styles.cardImage}
          resizeMode="cover"
        />
        <View style={styles.playOverlay}>
          <FontAwesome
            name="play"
            size={12}
            color="#0f1115"
            style={{ marginLeft: 2 }}
          />
        </View>
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{item.duration}</Text>
        </View>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.subText}>Watch Masterclass</Text>
      </View>
    </TouchableOpacity>
  );

  const renderServiceCard = ({ item }: { item: Service }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[styles.serviceCard, { width: SERVICE_CARD_WIDTH }]}
      onPress={() => handleOpenLink(item.url)}
    >
      <Image
        source={{ uri: item.image }}
        style={styles.serviceImage}
        resizeMode="cover"
      />
      <View style={styles.darkGradient} />

      <View style={styles.serviceIconContainer}>
        <FontAwesome name={item.icon} size={13} color="#f59e0b" />
      </View>

      <View style={styles.serviceContent}>
        <Text style={styles.serviceTitle}>{item.title}</Text>
        <Text style={styles.serviceSubtitle}>{item.subtitle}</Text>

        <View style={styles.serviceCta}>
          <Text style={styles.serviceCtaText}>Explore Craft Services</Text>
          <FontAwesome name="arrow-right" size={10} color="#f59e0b" />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1115" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            style={styles.leftHeader}
          >
            <View style={styles.avatarBorder}>
              <Image
                style={styles.avatar}
                source={{
                  uri: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?q=80&w=200",
                }}
              />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.greeting}>Welcome</Text>
              <Text
                style={styles.username}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                Chef {userEmail}
              </Text>
            </View>
          </Pressable>

          <Pressable style={styles.iconButton} onPress={handleLogout}>
            <FontAwesome name="sign-out" size={15} color="#ef4444" />
          </Pressable>
        </View>
{/* In-App Recipe Detail Modal */}
<Modal visible={recipeModalVisible} animationType="slide" transparent={false}>
  <SafeAreaView style={styles.recipeModalContainer}>
    <StatusBar barStyle="light-content" backgroundColor="#0f1115" />
    
    {/* Modal Header Controls */}
    <View style={styles.recipeModalHeader}>
      <Pressable 
        style={styles.closeBtn} 
        onPress={() => setRecipeModalVisible(false)}
      >
        <FontAwesome name="chevron-left" size={16} color="#f59e0b" />
        <Text style={styles.closeBtnText}>Back</Text>
      </Pressable>
      
      {selectedRecipe?.sourceUrl && (
        <Pressable 
          onPress={() => handleOpenLink(selectedRecipe.sourceUrl)}
          style={styles.externalLinkBtn}
        >
          <FontAwesome name="external-link" size={14} color="#a1a1aa" />
        </Pressable>
      )}
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
    
    /* Option 1: Structured Analyzed Steps */
    selectedRecipe.analyzedInstructions[0].steps.map((step) => (
      <View key={step.number} style={styles.stepRow}>
        <View style={styles.stepNumberBadge}>
          <Text style={styles.stepNumberText}>{step.number}</Text>
        </View>
        <Text style={styles.stepText}>{step.step}</Text>
      </View>
    ))
  ) : selectedRecipe?.instructions ? (
    
    /* Option 2: Fallback to Raw Instructions Text (strip HTML tags) */
    <Text style={styles.stepText}>
      {selectedRecipe.instructions.replace(/<[^>]*>?/gm, "")}
    </Text>
  ) : (
    
    /* Option 3: Fallback Source Link */
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
        {/* Quick Utility Tools Grid */}
        <View style={styles.utilityGrid}>
          <TouchableOpacity
            style={styles.utilityCard}
            onPress={() => setConverterVisible(true)}
          >
            <View style={styles.utilityIconWrapper}>
              <FontAwesome name="exchange" size={14} color="#f59e0b" />
            </View>
            <Text style={styles.utilityTitle}>Unit Converter</Text>
            <Text style={styles.utilitySub}>Weight, Vol, Temp, Length</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.utilityCard}
            onPress={() => setEightySixVisible(true)}
          >
            <View style={styles.utilityIconWrapper}>
              <FontAwesome name="ban" size={14} color="#ef4444" />
            </View>
            <Text style={styles.utilityTitle}>86 Board</Text>
            <Text style={styles.utilitySub}>
              {eightySixItems.length} items out
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.utilityCard}
            onPress={() => setTimerVisible(true)}
          >
            <View style={styles.utilityIconWrapper}>
              <FontAwesome name="dashboard" size={14} color="#3b82f6" />
            </View>
            <Text style={styles.utilityTitle}>Kitchen Timers</Text>
            <Text style={styles.utilitySub}>
              {isTimerRunning ? formatTimer(secondsLeft) : "Prep & Service"}
            </Text>
          </TouchableOpacity>
        </View>

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
            <FontAwesome name="search-minus" size={28} color="#3f3f46" />
            <Text style={styles.emptyText}>No creations found</Text>
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
            <Text style={styles.sectionTitle}>Techniques & Masterclasses</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/masterclassLibrary" as never)}
          >
            <Text style={styles.seeAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={cookingVideos}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          renderItem={renderVideoCard}
          contentContainerStyle={styles.listContainer}
        />

        {/* White-labeled Culinary Services */}
        <View style={styles.sectionHeader}>
          <View style={styles.titleRow}>
            <View style={styles.amberAccentBar} />
            <Text style={styles.sectionTitle}>Culinary Services</Text>
          </View>
        </View>

        <FlatList
          data={services}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          renderItem={renderServiceCard}
          contentContainerStyle={styles.listContainer}
        />
      </ScrollView>

      {/* Expanded Multi-Option Converter Modal */}
      <Modal visible={converterVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Multi-Unit Kitchen Converter</Text>
              <Pressable onPress={() => setConverterVisible(false)}>
                <FontAwesome name="times" size={18} color="#a1a1aa" />
              </Pressable>
            </View>

            {/* Category Selector */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScrollView}>
              {(["weight", "volume", "temp", "length"] as ConversionCategory[]).map((cat) => (
                <Pressable
                  key={cat}
                  style={[
                    styles.catChip,
                    selectedCategory === cat && styles.catChipActive,
                  ]}
                  onPress={() => {
                    setSelectedCategory(cat);
                    setSelectedOptionIndex(0);
                  }}
                >
                  <Text
                    style={[
                      styles.catChipText,
                      selectedCategory === cat && styles.catChipTextActive,
                    ]}
                  >
                    {cat.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Sub-Conversion Pair Selector */}
            <Text style={styles.inputLabel}>Select Conversion Unit:</Text>
            <ScrollView style={{ maxHeight: 110, marginBottom: 12 }}>
              {currentOptions.map((opt, idx) => (
                <Pressable
                  key={idx}
                  style={[
                    styles.optionRow,
                    selectedOptionIndex === idx && styles.optionRowActive,
                  ]}
                  onPress={() => setSelectedOptionIndex(idx)}
                >
                  <Text
                    style={[
                      styles.optionRowText,
                      selectedOptionIndex === idx && styles.optionRowTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {selectedOptionIndex === idx && (
                    <FontAwesome name="check" size={12} color="#f59e0b" />
                  )}
                </Pressable>
              ))}
            </ScrollView>

            {/* Amount Input */}
            <Text style={styles.inputLabel}>
              Enter Value ({currentOption.unitLabel}):
            </Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="decimal-pad"
              value={convertAmount}
              onChangeText={setConvertAmount}
              placeholderTextColor="#71717a"
            />

            {/* Result Box */}
            <View style={styles.resultBox}>
              <Text style={styles.resultLabel}>Converted Total:</Text>
              <Text style={styles.resultValue}>{getConvertedValue()}</Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* 86 List Modal */}
      <Modal visible={eightySixVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>86 Board (Out of Stock)</Text>
              <Pressable onPress={() => setEightySixVisible(false)}>
                <FontAwesome name="times" size={18} color="#a1a1aa" />
              </Pressable>
            </View>

            <View style={styles.add86Row}>
              <TextInput
                style={[styles.modalInput, { flex: 1, marginBottom: 0 }]}
                placeholder="Add 86'd item..."
                placeholderTextColor="#71717a"
                value={newItem}
                onChangeText={setNewItem}
              />
              <Pressable style={styles.add86Btn} onPress={handleAdd86Item}>
                <FontAwesome name="plus" size={14} color="#0f1115" />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 200, marginTop: 12 }}>
              {eightySixItems.map((item, index) => (
                <View key={index} style={styles.eightySixRow}>
                  <Text style={styles.eightySixText}>{item}</Text>
                  <Pressable onPress={() => handleRemove86Item(index)}>
                    <FontAwesome name="trash" size={14} color="#ef4444" />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Interactive Kitchen Timer Modal */}
      <Modal visible={timerVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Line & Prep Timer</Text>
              <Pressable onPress={() => setTimerVisible(false)}>
                <FontAwesome name="times" size={18} color="#a1a1aa" />
              </Pressable>
            </View>

            {/* Quick Presets */}
            <View style={styles.presetRow}>
              {[3, 5, 10, 15].map((mins) => (
                <Pressable
                  key={mins}
                  style={[
                    styles.presetBtn,
                    secondsLeft === mins * 60 && styles.presetBtnActive,
                  ]}
                  onPress={() => {
                    setIsTimerRunning(false);
                    setSecondsLeft(mins * 60);
                  }}
                >
                  <Text style={styles.presetText}>{mins}m</Text>
                </Pressable>
              ))}
            </View>

            {/* Display */}
            <View style={styles.displayBox}>
              <Text style={styles.displayText}>{formatTimer(secondsLeft)}</Text>
            </View>

            {/* Controls */}
            <View style={styles.controlRow}>
              <Pressable
                style={[
                  styles.actionBtn,
                  { backgroundColor: isTimerRunning ? "#ef4444" : "#22c55e" },
                ]}
                onPress={() => setIsTimerRunning(!isTimerRunning)}
              >
                <FontAwesome
                  name={isTimerRunning ? "pause" : "play"}
                  size={16}
                  color="#ffffff"
                />
              </Pressable>

              <Pressable
                style={[styles.actionBtn, { backgroundColor: "#27272a" }]}
                onPress={() => {
                  setIsTimerRunning(false);
                  setSecondsLeft(300);
                }}
              >
                <FontAwesome name="refresh" size={16} color="#f4f4f5" />
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0f1115",
  },
  container: {
    flex: 1,
    backgroundColor: "#0f1115",
  },

  // Header
  header: {
    alignItems: "center",
    justifyContent: "space-between",
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
  },
  leftHeader: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  avatarBorder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#181b20",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#f59e0b",
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  headerTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  greeting: {
    fontSize: 11,
    fontWeight: "600",
    color: "#f59e0b",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f4f4f5",
    marginTop: 1,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#181b20",
    borderWidth: 1,
    borderColor: "#27272a",
    justifyContent: "center",
    alignItems: "center",
  },

  // Utilities Grid
  utilityGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 18,
  },
  utilityCard: {
    flex: 1,
    backgroundColor: "#181b20",
    borderRadius: 14,
    padding: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  utilityIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#0f1115",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  utilityTitle: {
    color: "#f4f4f5",
    fontSize: 12,
    fontWeight: "700",
  },
  utilitySub: {
    color: "#71717a",
    fontSize: 10,
    marginTop: 2,
  },

  // Search Bar
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#181b20",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#f4f4f5",
  },

  // States & Pagination
  loaderBox: {
    paddingVertical: 16,
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 13,
    color: "#71717a",
    marginTop: 6,
  },
  resultsCount: {
    fontSize: 12,
    color: "#71717a",
  },
  moreButton: {
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#181b20",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#27272a",
    marginTop: 8,
  },
  moreButtonText: {
    color: "#f59e0b",
    fontSize: 12,
    fontWeight: "600",
  },

  // Section Headers
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  amberAccentBar: {
    width: 4,
    height: 16,
    backgroundColor: "#f59e0b",
    borderRadius: 2,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f4f4f5",
  },
  seeAllText: {
    fontSize: 12,
    color: "#f59e0b",
    fontWeight: "600",
  },
  listContainer: {
    paddingLeft: 20,
    paddingRight: 6,
    marginBottom: 20,
  },

  // Recipe & Video Cards
  card: {
    backgroundColor: "#181b20",
    borderRadius: 14,
    marginRight: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#27272a",
  },
  imageWrapper: {
    height: 120,
    position: "relative",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  badge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(15, 17, 21, 0.85)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: "#f59e0b",
    fontSize: 10,
    fontWeight: "700",
  },
  timeBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(15, 17, 21, 0.85)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  timeText: {
    color: "#f4f4f5",
    fontSize: 10,
    fontWeight: "500",
  },
  playOverlay: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -16,
    marginLeft: -16,
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
    paddingVertical: 3,
    borderRadius: 6,
  },
  durationText: {
    color: "#f4f4f5",
    fontSize: 10,
  },
  cardContent: {
    padding: 12,
  },
  cardTitle: {
    color: "#f4f4f5",
    fontSize: 13,
    fontWeight: "700",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  ratingText: {
    color: "#f4f4f5",
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 4,
  },
  dot: {
    color: "#71717a",
    marginHorizontal: 6,
  },
  metaText: {
    color: "#71717a",
    fontSize: 11,
  },
  subText: {
    color: "#f59e0b",
    fontSize: 11,
    marginTop: 4,
  },

  // Service Cards
  serviceCard: {
    height: 150,
    borderRadius: 16,
    marginRight: 14,
    overflow: "hidden",
    position: "relative",
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
    left: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(24, 27, 32, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  serviceContent: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
  },
  serviceTitle: {
    color: "#f4f4f5",
    fontSize: 14,
    fontWeight: "700",
  },
  serviceSubtitle: {
    color: "#a1a1aa",
    fontSize: 11,
    marginTop: 2,
  },
  serviceCta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  serviceCtaText: {
    color: "#f59e0b",
    fontSize: 11,
    fontWeight: "600",
    marginRight: 6,
  },

  // Modal Overlay & Base
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalContent: {
    width: "100%",
    backgroundColor: "#181b20",
    borderRadius: 16,
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
    color: "#f4f4f5",
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
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#27272a",
    paddingHorizontal: 12,
    height: 42,
    color: "#f4f4f5",
    marginBottom: 12,
  },

  // Converter Modal Specifics
  catScrollView: {
    flexDirection: "row",
    marginBottom: 12,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#0f1115",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  catChipActive: {
    backgroundColor: "#f59e0b",
    borderColor: "#f59e0b",
  },
  catChipText: {
    color: "#a1a1aa",
    fontSize: 10,
    fontWeight: "700",
  },
  catChipTextActive: {
    color: "#0f1115",
  },
  optionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#0f1115",
    marginBottom: 6,
  },
  optionRowActive: {
    borderColor: "#f59e0b",
    borderWidth: 1,
  },
  optionRowText: {
    color: "#a1a1aa",
    fontSize: 12,
  },
  optionRowTextActive: {
    color: "#f59e0b",
    fontWeight: "600",
  },
  resultBox: {
    marginTop: 10,
    padding: 12,
    backgroundColor: "#0f1115",
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#27272a",
  },
  resultLabel: {
    color: "#a1a1aa",
    fontSize: 11,
  },
  resultValue: {
    color: "#f59e0b",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 2,
  },

  // 86 Modal Specifics
  add86Row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  add86Btn: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: "#f59e0b",
    justifyContent: "center",
    alignItems: "center",
  },
  eightySixRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#27272a",
  },
  eightySixText: {
    color: "#f4f4f5",
    fontSize: 13,
  },

  // Timer Modal Specifics
  presetRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  presetBtn: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: "#0f1115",
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  presetBtnActive: {
    borderColor: "#f59e0b",
    backgroundColor: "#181b20",
  },
  presetText: {
    color: "#f4f4f5",
    fontSize: 12,
    fontWeight: "600",
  },
  displayBox: {
    backgroundColor: "#0f1115",
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  displayText: {
    fontSize: 36,
    fontWeight: "700",
    color: "#f59e0b",
    fontVariant: ["tabular-nums"],
  },
  controlRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
  },
  actionBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },// Recipe Modal Styles
recipeModalContainer: {
  flex: 1,
  backgroundColor: "#0f1115",
},
recipeModalHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingHorizontal: 20,
  paddingVertical: 14,
  backgroundColor: "#181b20",
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
  fontWeight: "700",
  marginLeft: 8,
},
externalLinkBtn: {
  padding: 6,
},
recipeModalImage: {
  width: "100%",
  height: 220,
},
recipeModalTitle: {
  fontSize: 20,
  fontWeight: "800",
  color: "#f4f4f5",
  marginBottom: 12,
},
recipeMetaContainer: {
  flexDirection: "row",
  marginBottom: 20,
},
recipeMetaChip: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#181b20",
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 8,
  marginRight: 10,
  borderWidth: 1,
  borderColor: "#27272a",
},
recipeMetaText: {
  color: "#f4f4f5",
  fontSize: 12,
  fontWeight: "600",
  marginLeft: 6,
},
recipeSection: {
  marginTop: 16,
  marginBottom: 12,
},
ingredientRow: {
  flexDirection: "row",
  alignItems: "center",
  paddingVertical: 8,
  borderBottomWidth: 1,
  borderBottomColor: "#181b20",
},
ingredientText: {
  color: "#d4d4d8",
  fontSize: 13,
},
stepRow: {
  flexDirection: "row",
  marginBottom: 14,
  alignItems: "flex-start",
},
stepNumberBadge: {
  width: 24,
  height: 24,
  borderRadius: 12,
  backgroundColor: "#f59e0b",
  justifyContent: "center",
  alignItems: "center",
  marginRight: 12,
  marginTop: 2,
},
stepNumberText: {
  color: "#0f1115",
  fontWeight: "800",
  fontSize: 12,
},
stepText: {
  flex: 1,
  color: "#d4d4d8",
  fontSize: 13,
  lineHeight: 20,
},
});