import React, { useState, useRef, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  useWindowDimensions,
  FlatList,
  Pressable,
  Image,
  SafeAreaView,
  StatusBar,
  Platform,
  Alert,
  Modal,
  ScrollView,
  ViewToken,
} from "react-native";
import { Video, ResizeMode } from "expo-av";
import FontAwesome from "@expo/vector-icons/FontAwesome";

interface RecipeStep {
  stepNumber: number;
  title: string;
  instruction: string;
}

interface CulinaryMasterclassPost {
  id: string;
  chef: {
    name: string;
    role: string;
    avatar: string;
  };
  videoUri: string;
  title: string;
  techniqueTag: string;
  prepTime: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced" | "Master";
  servings: string;
  description: string;
  ingredients: string[];
  steps: RecipeStep[];
  isSaved?: boolean;
}

const CULINARY_POSTS: CulinaryMasterclassPost[] = [
  {
    id: "class_1",
    chef: {
      name: "Chef Marco Riva",
      role: "Executive Chef & Butcher",
      avatar:
        "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?q=80&w=200",
    },
    videoUri:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    title: "Precision Sear & Butter Basting 45-Day Dry Aged Ribeye",
    techniqueTag: "Proteins & Maillard Reaction",
    prepTime: "25 mins",
    difficulty: "Intermediate",
    servings: "2 Portions",
    description:
      "Master high-heat cast iron searing, aromatics temperature control, and spoon-basting techniques for optimal internal edge-to-edge cooking.",
    ingredients: [
      "1x 16oz Dry-Aged Ribeye (1.5” thick)",
      "4 tbsp Unsalted High-Fat Butter",
      "3 sprigs Fresh Rosemary & Thyme",
      "4 cloves Garlic (smashed)",
      "Flaky Sea Salt & Coarse Black Pepper",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Tempering & Surface Prep",
        instruction:
          "Bring beef to room temperature for 45 minutes. Thoroughly pat dry with paper towels to ensure crisp crust development.",
      },
      {
        stepNumber: 2,
        title: "High-Heat Thermal Sear",
        instruction:
          "Heat cast iron pan until wisps of smoke appear. Sear steak 2 minutes per side until deep mahogany crust forms.",
      },
      {
        stepNumber: 3,
        title: "Aromatic Butter Baste",
        instruction:
          "Reduce heat slightly. Add butter, garlic, and herbs. Tilt pan toward you and continuously spoon foaming butter over steak for 90 seconds.",
      },
    ],
  },
  {
    id: "class_2",
    chef: {
      name: "Chef Elena Rossi",
      role: "Pasta Specialist",
      avatar:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200",
    },
    videoUri:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    title: "Emulsion Mastery: Roman Cacio e Pepe from Scratch",
    techniqueTag: "Starch-Fat Emulsification",
    prepTime: "15 mins",
    difficulty: "Advanced",
    servings: "4 Portions",
    description:
      "Learn how to bind coarse Pecorino Romano and cracked black pepper using pasta starch water without clumping or breaking the cheese sauce.",
    ingredients: [
      "400g Tonnarelli or Spaghetti",
      "200g Pecorino Romano (finely microplaned)",
      "2 tbsp Whole Black Peppercorns (freshly cracked)",
      "Reserved Starch Water (high temp)",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Toast the Pepper",
        instruction:
          "Toast cracked peppercorns in a dry skillet over medium heat until fragrant (approx 1 minute). Add half a ladle of pasta water to stop toast.",
      },
      {
        stepNumber: 2,
        title: "Pecorino Paste Creation",
        instruction:
          "In a bowl, mix microplaned cheese with warm pasta water using a whisk until a smooth, thick paste forms.",
      },
      {
        stepNumber: 3,
        title: "Off-Heat Emulsification",
        instruction:
          "Transfer al dente pasta to skillet off direct heat. Stir in cheese paste rapidly, tossing continuously to build a glossy, velvety emulsion.",
      },
    ],
  },
];

export default function CulinaryLearningFeedScreen() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const [posts, setPosts] = useState<CulinaryMasterclassPost[]>(CULINARY_POSTS);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<CulinaryMasterclassPost | null>(null);

  // Autoplay handler on scroll
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setActiveVideoIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useMemo(
    () => ({ itemVisiblePercentThreshold: 80 }),
    []
  );

  const toggleSave = (id: string) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) => {
        if (post.id === id) {
          return { ...post, isSaved: !post.isSaved };
        }
        return post;
      })
    );
  };

  const renderMasterclassItem = ({
    item,
    index,
  }: {
    item: CulinaryMasterclassPost;
    index: number;
  }) => {
    const isPlaying = index === activeVideoIndex;

    return (
      <View style={[styles.cardContainer, { width: screenWidth, height: screenHeight }]}>
        {/* Fullscreen Video Background */}
        <Video
          style={[styles.videoPlayer, { width: screenWidth, height: screenHeight }]}
          source={{ uri: item.videoUri }}
          resizeMode={ResizeMode.COVER}
          shouldPlay={isPlaying}
          isLooping
          isMuted={isMuted}
        />

        {/* Global Sound Control */}
        <Pressable
          style={styles.muteButton}
          onPress={() => setIsMuted((prev) => !prev)}
        >
          <FontAwesome
            name={isMuted ? "volume-off" : "volume-up"}
            size={14}
            color="#f4f4f5"
          />
        </Pressable>

        {/* Right Chef Tools Action Bar */}
        <View style={styles.rightActions}>
          {/* Chef Profile Badge */}
          <View style={styles.avatarActionContainer}>
            <Image source={{ uri: item.chef.avatar }} style={styles.userAvatar} />
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
          </View>

          {/* Open Recipe Sheet Button */}
          <Pressable
            style={styles.actionButton}
            onPress={() => setSelectedRecipe(item)}
          >
            <View style={styles.iconCircle}>
              <FontAwesome name="book" size={20} color="#f59e0b" />
            </View>
            <Text style={styles.actionText}>Recipe</Text>
          </Pressable>

          {/* Save / Bookmark Button */}
          <Pressable
            style={styles.actionButton}
            onPress={() => toggleSave(item.id)}
          >
            <View style={styles.iconCircle}>
              <FontAwesome
                name={item.isSaved ? "bookmark" : "bookmark-o"}
                size={20}
                color={item.isSaved ? "#f59e0b" : "#f4f4f5"}
              />
            </View>
            <Text style={styles.actionText}>{item.isSaved ? "Saved" : "Save"}</Text>
          </Pressable>

          {/* Share Masterclass Button */}
          <Pressable
            style={styles.actionButton}
            onPress={() => Alert.alert("Share Class", "Link copied to clipboard.")}
          >
            <View style={styles.iconCircle}>
              <FontAwesome name="share-alt" size={20} color="#f4f4f5" />
            </View>
            <Text style={styles.actionText}>Share</Text>
          </Pressable>
        </View>

        {/* Bottom Overlay: Kitchen Specs & Quick Launch */}
        <View style={styles.bottomOverlay}>
          {/* Technique Tag */}
          <View style={styles.tagBadge}>
            <Text style={styles.tagBadgeText}>{item.techniqueTag}</Text>
          </View>

          {/* Video Title */}
          <Text style={styles.classTitle}>{item.title}</Text>

          {/* Chef Metadata */}
          <View style={styles.chefRow}>
            <Text style={styles.chefName}>{item.chef.name}</Text>
            <Text style={styles.chefRole}>• {item.chef.role}</Text>
          </View>

          {/* Operational Quick Specs */}
          <View style={styles.specsRow}>
            <View style={styles.specChip}>
              <FontAwesome name="clock-o" size={12} color="#f59e0b" />
              <Text style={styles.specText}>{item.prepTime}</Text>
            </View>
            <View style={styles.specChip}>
              <FontAwesome name="bar-chart" size={12} color="#f59e0b" />
              <Text style={styles.specText}>{item.difficulty}</Text>
            </View>
            <View style={styles.specChip}>
              <FontAwesome name="cutlery" size={12} color="#f59e0b" />
              <Text style={styles.specText}>{item.servings}</Text>
            </View>
          </View>

          {/* Recipe Card Call-To-Action */}
          <Pressable
            style={styles.viewRecipeButton}
            onPress={() => setSelectedRecipe(item)}
          >
            <FontAwesome name="list-alt" size={14} color="#0f1115" />
            <Text style={styles.viewRecipeButtonText}>View Prep & Technique Sheet</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1115" />

      {/* Floating Header */}
      <View style={styles.topHeader}>
        <Text style={styles.headerTitle}>Culinary Academy</Text>
        <View style={styles.headerSubTabContainer}>
          <Text style={[styles.subTabText, styles.activeSubTab]}>Techniques</Text>
          <Text style={styles.subTabDot}>•</Text>
          <Text style={styles.subTabText}>Masterclasses</Text>
        </View>
      </View>

      {/* Vertical Snap Autoplay Feed */}
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderMasterclassItem}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={screenHeight}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        removeClippedSubviews={Platform.OS === "android"}
      />

      {/* Culinary Recipe / Method Modal Sheet */}
      <Modal
        visible={!!selectedRecipe}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedRecipe(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTag}>{selectedRecipe?.techniqueTag}</Text>
                <Text style={styles.modalTitle}>{selectedRecipe?.title}</Text>
              </View>
              <Pressable
                style={styles.closeButton}
                onPress={() => setSelectedRecipe(null)}
              >
                <FontAwesome name="times" size={18} color="#f4f4f5" />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollBody}
            >
              <Text style={styles.sectionHeader}>Overview</Text>
              <Text style={styles.descriptionText}>{selectedRecipe?.description}</Text>

              <Text style={styles.sectionHeader}>Mise en Place (Ingredients)</Text>
              {selectedRecipe?.ingredients.map((item, idx) => (
                <View key={`ing-${idx}`} style={styles.ingredientRow}>
                  <View style={styles.bulletPoint} />
                  <Text style={styles.ingredientText}>{item}</Text>
                </View>
              ))}

              <Text style={styles.sectionHeader}>Technique Execution Steps</Text>
              {selectedRecipe?.steps.map((step) => (
                <View key={`step-${step.stepNumber}`} style={styles.stepCard}>
                  <View style={styles.stepHeaderRow}>
                    <Text style={styles.stepNumberBadge}>STEP {step.stepNumber}</Text>
                    <Text style={styles.stepTitle}>{step.title}</Text>
                  </View>
                  <Text style={styles.stepInstruction}>{step.instruction}</Text>
                </View>
              ))}
            </ScrollView>
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

  // Top Navigation Header
  topHeader: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 20,
    left: 0,
    right: 0,
    zIndex: 30,
    alignItems: "center",
  },
  headerTitle: {
    color: "#f59e0b",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  headerSubTabContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  subTabText: {
    color: "#71717a",
    fontSize: 15,
    fontWeight: "600",
  },
  activeSubTab: {
    color: "#f4f4f5",
    fontWeight: "700",
  },
  subTabDot: {
    color: "#52525b",
    marginHorizontal: 8,
  },

  // Screen/Card layout
  cardContainer: {
    backgroundColor: "#0f1115",
    position: "relative",
    justifyContent: "center",
  },
  videoPlayer: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },

  // Mute Toggle
  muteButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 100 : 70,
    right: 16,
    zIndex: 25,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(24, 27, 32, 0.85)",
    borderWidth: 1,
    borderColor: "#27272a",
    justifyContent: "center",
    alignItems: "center",
  },

  // Right Side Chef Controls
  rightActions: {
    position: "absolute",
    right: 14,
    bottom: 110,
    zIndex: 20,
    alignItems: "center",
  },
  avatarActionContainer: {
    position: "relative",
    marginBottom: 20,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "#f59e0b",
    backgroundColor: "#181b20",
  },
  proBadge: {
    position: "absolute",
    bottom: -6,
    alignSelf: "center",
    backgroundColor: "#f59e0b",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  proBadgeText: {
    color: "#0f1115",
    fontSize: 8,
    fontWeight: "800",
  },
  actionButton: {
    alignItems: "center",
    marginBottom: 18,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(24, 27, 32, 0.85)",
    borderWidth: 1,
    borderColor: "#27272a",
    justifyContent: "center",
    alignItems: "center",
  },
  actionText: {
    color: "#f4f4f5",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 4,
  },

  // Bottom Details
  bottomOverlay: {
    position: "absolute",
    bottom: 30,
    left: 16,
    right: 80,
    zIndex: 20,
  },
  tagBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(15, 17, 21, 0.9)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: "#f59e0b",
    marginBottom: 8,
  },
  tagBadgeText: {
    color: "#f59e0b",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  classTitle: {
    color: "#f4f4f5",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
    marginBottom: 4,
  },
  chefRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  chefName: {
    color: "#f59e0b",
    fontSize: 12,
    fontWeight: "600",
  },
  chefRole: {
    color: "#a1a1aa",
    fontSize: 12,
    marginLeft: 4,
  },
  specsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  specChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(24, 27, 32, 0.85)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
    borderWidth: 0.5,
    borderColor: "#27272a",
  },
  specText: {
    color: "#f4f4f5",
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 5,
  },
  viewRecipeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f59e0b",
    paddingVertical: 10,
    borderRadius: 8,
  },
  viewRecipeButtonText: {
    color: "#0f1115",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 8,
  },

  // Modal / Recipe Sheet
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#0f1115",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    padding: 20,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#181b20",
  },
  modalTag: {
    color: "#f59e0b",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  modalTitle: {
    color: "#f4f4f5",
    fontSize: 17,
    fontWeight: "700",
    marginTop: 2,
    maxWidth: 260,
  },
  closeButton: {
    backgroundColor: "#181b20",
    padding: 8,
    borderRadius: 16,
  },
  modalScrollBody: {
    paddingVertical: 16,
  },
  sectionHeader: {
    color: "#f59e0b",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 8,
  },
  descriptionText: {
    color: "#a1a1aa",
    fontSize: 13,
    lineHeight: 18,
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  bulletPoint: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#f59e0b",
    marginRight: 10,
  },
  ingredientText: {
    color: "#f4f4f5",
    fontSize: 13,
  },
  stepCard: {
    backgroundColor: "#181b20",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  stepHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  stepNumberBadge: {
    color: "#f59e0b",
    fontSize: 10,
    fontWeight: "800",
    marginRight: 8,
  },
  stepTitle: {
    color: "#f4f4f5",
    fontSize: 13,
    fontWeight: "700",
  },
  stepInstruction: {
    color: "#a1a1aa",
    fontSize: 12,
    lineHeight: 17,
  },
});