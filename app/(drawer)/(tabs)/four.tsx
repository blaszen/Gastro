import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Pressable,
  LayoutAnimation,
  Platform,
  UIManager,
  TextInput,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type FilterCategory = "all" | "temps" | "techniques" | "soups" | "pans" | "libations";

export default function KitchenToolsScreen() {
  const [activeTab, setActiveTab] = useState<FilterCategory>("all");

  // Accordion States
  const [showScaler, setShowScaler] = useState(true);
  const [showOrderOps, setShowOrderOps] = useState(false);
  const [showSoupArch, setShowSoupArch] = useState(true);
  const [showHotelPans, setShowHotelPans] = useState(true);
  const [showCookware, setShowCookware] = useState(false);
  const [showProteinRef, setShowProteinRef] = useState(false);
  const [showCulinaryRef, setShowCulinaryRef] = useState(false);
  const [showBeerRef, setShowBeerRef] = useState(false);
  const [showWineRef, setShowWineRef] = useState(false);

  // Scaler State
  const [baseQty, setBaseQty] = useState("100");
  const [multiplier, setMultiplier] = useState(2);

  const toggleSection = (section: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (section === "scaler") setShowScaler(!showScaler);
    if (section === "order") setShowOrderOps(!showOrderOps);
    if (section === "soup") setShowSoupArch(!showSoupArch);
    if (section === "hotelPans") setShowHotelPans(!showHotelPans);
    if (section === "cookware") setShowCookware(!showCookware);
    if (section === "protein") setShowProteinRef(!showProteinRef);
    if (section === "culinary") setShowCulinaryRef(!showCulinaryRef);
    if (section === "beer") setShowBeerRef(!showBeerRef);
    if (section === "wine") setShowWineRef(!showWineRef);
  };

  const calculateScaled = () => {
    const val = parseFloat(baseQty);
    if (isNaN(val)) return 0;
    return (val * multiplier).toFixed(1).replace(/\.0$/, "");
  };

  const isTabVisible = (cat: FilterCategory) => {
    return activeTab === "all" || activeTab === cat;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1115" />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            Kitchen Command & Tools<Text style={styles.brandDot}>.</Text>
          </Text>
          <Text style={styles.headerSubtitle}>
            Hotel pan dimensions, volume capacity, batch scaling, and station flow
          </Text>
        </View>

        {/* Filter Navigation Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
          {[
            { id: "all", label: "All Tools" },
            { id: "pans", label: "Hotel Pans & Sizing" },
            { id: "soups", label: "Soups & Starches" },
            { id: "techniques", label: "Technique & Flow" },
            { id: "temps", label: "Protein Temps" },
            { id: "libations", label: "Beer & Wine" },
          ].map((tab) => (
            <Pressable
              key={tab.id}
              style={[styles.tabItem, activeTab === tab.id && styles.tabItemActive]}
              onPress={() => setActiveTab(tab.id as FilterCategory)}
            >
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* NEW SECTION: Commercial Hotel Pan Matrix */}
        {isTabVisible("pans") && (
          <View style={styles.card}>
            <Pressable style={styles.accordionHeader} onPress={() => toggleSection("hotelPans")}>
              <View style={styles.cardHeader}>
                <MaterialCommunityIcons name="grid-large" size={20} color="#f59e0b" />
                <Text style={styles.cardTitle}>Hotel Pan Sizes & Depth Guide</Text>
              </View>
              <FontAwesome name={showHotelPans ? "chevron-up" : "chevron-down"} size={14} color="#a1a1aa" />
            </Pressable>

            {showHotelPans && (
              <View style={styles.accordionBody}>
                <Text style={styles.helperText}>
                  Standard gastro-norm / steam table dimensions, 200–600 depth codes, and volumetric capacity.
                </Text>

                <Text style={styles.sectionSubHeader}>Depth Designation Codes</Text>
                <View style={styles.referenceRow}>
                  <Text style={styles.refLabel}>200 Series (2" / 65mm)</Text>
                  <Text style={styles.refValue}>Shallow. Roasting, flat steam tables, display.</Text>
                </View>
                <View style={styles.referenceRow}>
                  <Text style={styles.refLabel}>400 Series (4" / 100mm)</Text>
                  <Text style={styles.refValue}>Standard depth. Sauces, proteins, general holding.</Text>
                </View>
                <View style={styles.referenceRow}>
                  <Text style={styles.refLabel}>600 Series (6" / 150mm)</Text>
                  <Text style={styles.refValue}>Deep storage. Soups, stocks, high-volume prep.</Text>
                </View>

                <Text style={styles.sectionSubHeader}>Pan Fraction & Volume Reference</Text>

                <View style={styles.refBlock}>
                  <Text style={styles.refBlockTitle}>Full Size (1/1) — 12" × 20"</Text>
                  <Text style={styles.refBlockText}>
                    • 200 (2.5"): ~8.5 Quarts / 8 Liters{"\n"}
                    • 400 (4.0"): ~14.5 Quarts / 13.7 Liters{"\n"}
                    • 600 (6.0"): ~21.0 Quarts / 20 Liters
                  </Text>
                </View>

                <View style={styles.refBlock}>
                  <Text style={styles.refBlockTitle}>Half Size (1/2) — 12" × 10"</Text>
                  <Text style={styles.refBlockText}>
                    • 200 (2.5"): ~4.3 Quarts{"\n"}
                    • 400 (4.0"): ~7.0 Quarts{"\n"}
                    • 600 (6.0"): ~10.5 Quarts
                  </Text>
                </View>

                <View style={styles.refBlock}>
                  <Text style={styles.refBlockTitle}>Third Size (1/3) — 12" × 6.6"</Text>
                  <Text style={styles.refBlockText}>
                    • 200 (2.5"): ~2.5 Quarts{"\n"}
                    • 400 (4.0"): ~4.0 Quarts{"\n"}
                    • 600 (6.0"): ~6.0 Quarts (Ideal for soup wells)
                  </Text>
                </View>

                <View style={styles.refBlock}>
                  <Text style={styles.refBlockTitle}>Sixth Size (1/6) — 6.9" × 6.3"</Text>
                  <Text style={styles.refBlockText}>
                    • 200 (2.5"): ~1.1 Quarts{"\n"}
                    • 400 (4.0"): ~1.8 Quarts{"\n"}
                    • 600 (6.0"): ~2.7 Quarts (Standard line cold-rail)
                  </Text>
                </View>

                <View style={styles.refBlock}>
                  <Text style={styles.refBlockTitle}>Ninth Size (1/9) — 6.9" × 4.2"</Text>
                  <Text style={styles.refBlockText}>
                    • 200 (2.5"): ~0.6 Quarts{"\n"}
                    • 400 (4.0"): ~1.0 Quart (Garnishes, finishing herbs)
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* TOOL: Soup Architecture & Starch Upgrades */}
        {isTabVisible("soups") && (
          <View style={styles.card}>
            <Pressable style={styles.accordionHeader} onPress={() => toggleSection("soup")}>
              <View style={styles.cardHeader}>
                {/* FIXED ICON: Replaced "soup" with "pot-steam" */}
                <MaterialCommunityIcons name="pot-steam" size={20} color="#f59e0b" />
                <Text style={styles.cardTitle}>Soup Architecture & Starch Hacks</Text>
              </View>
              <FontAwesome name={showSoupArch ? "chevron-up" : "chevron-down"} size={14} color="#a1a1aa" />
            </Pressable>

            {showSoupArch && (
              <View style={styles.accordionBody}>
                <Text style={styles.sectionSubHeader}>Soup = Liquid Base + Body Agent</Text>
                
                <View style={styles.refBlock}>
                  <Text style={styles.refBlockTitle}>Clear Broths & Consommés</Text>
                  <Text style={styles.refBlockText}>
                    100% Seasoned Stock/Water base. Clarified using egg-white rafts. Clean, light, high protein extraction.
                  </Text>
                </View>

                <View style={styles.refBlock}>
                  <Text style={styles.refBlockTitle}>Cream & Chowder Base</Text>
                  <Text style={styles.refBlockText}>
                    Stock + Dairy bound with Roux or potato starch. Avoid vigorous boiling after dairy addition.
                  </Text>
                </View>

                <View style={styles.refBlock}>
                  <Text style={styles.refBlockTitle}>Puree & Starch-Bound Soups</Text>
                  <Text style={styles.refBlockText}>
                    Roasted veggies blended directly with hot stock. Natural starches create body without added flour.
                  </Text>
                </View>

                <Text style={styles.sectionSubHeader}>Pro Starch Quick-Upgrades</Text>
                
                {/* FIXED FLEX LAYOUT PREVENTING SQUEEZED VERTICAL TEXT */}
                <View style={styles.referenceRow}>
                  <Text style={styles.refLabel}>Boursin Garlic & Herb Mash</Text>
                  <Text style={styles.refValue}>Fold 1 puck Boursin into hot riced potatoes</Text>
                </View>

                <View style={styles.referenceRow}>
                  <Text style={styles.refLabel}>Steamed Herb & Citrus Rice</Text>
                  <Text style={styles.refValue}>Fold chopped parsley, cilantro & lemon zest into warm rice</Text>
                </View>

                <View style={styles.referenceRow}>
                  <Text style={styles.refLabel}>Crispy Potato Starch Coating</Text>
                  <Text style={styles.refValue}>Dust protein in potato starch for ultra-shatter crust</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* TOOL: Interactive Recipe Scaler */}
        {isTabVisible("techniques") && (
          <View style={styles.card}>
            <Pressable style={styles.accordionHeader} onPress={() => toggleSection("scaler")}>
              <View style={styles.cardHeader}>
                <MaterialCommunityIcons name="calculator" size={20} color="#f59e0b" />
                <Text style={styles.cardTitle}>Live Recipe & Batch Scaler</Text>
              </View>
              <FontAwesome name={showScaler ? "chevron-up" : "chevron-down"} size={14} color="#a1a1aa" />
            </Pressable>

            {showScaler && (
              <View style={styles.accordionBody}>
                <Text style={styles.helperText}>Quickly scale weights (grams, oz) for service or batch prep.</Text>
                
                <View style={styles.scalerRow}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Base Weight (g / oz)</Text>
                    <TextInput
                      style={styles.textInput}
                      keyboardType="numeric"
                      value={baseQty}
                      onChangeText={setBaseQty}
                      placeholder="100"
                      placeholderTextColor="#52525b"
                    />
                  </View>

                  <Text style={styles.multiplierSymbol}>×</Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Batch Target</Text>
                    <View style={styles.multiplierPills}>
                      {[0.5, 1, 2, 3, 5].map((m) => (
                        <Pressable
                          key={m}
                          style={[styles.mPill, multiplier === m && styles.mPillActive]}
                          onPress={() => setMultiplier(m)}
                        >
                          <Text style={[styles.mPillText, multiplier === m && styles.mPillTextActive]}>
                            {m}x
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                </View>

                <View style={styles.scaledResultBox}>
                  <Text style={styles.scaledResultLabel}>Scaled Quantity Required:</Text>
                  <Text style={styles.scaledResultVal}>{calculateScaled()} units</Text>
                </View>
              </View>
            )}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0f1115",
  },
  container: {
    padding: 20,
    paddingBottom: 50,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#f4f4f5",
  },
  brandDot: {
    color: "#f59e0b",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#a1a1aa",
    marginTop: 4,
    lineHeight: 16,
  },
  tabBar: {
    marginBottom: 18,
    flexDirection: "row",
  },
  tabItem: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#181b20",
    borderWidth: 1,
    borderColor: "#27272a",
    marginRight: 8,
  },
  tabItemActive: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderColor: "#f59e0b",
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#a1a1aa",
  },
  tabTextActive: {
    color: "#f59e0b",
    fontWeight: "700",
  },
  card: {
    backgroundColor: "#181b20",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#f4f4f5",
  },
  accordionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  accordionBody: {
    marginTop: 12,
  },
  helperText: {
    fontSize: 12,
    color: "#a1a1aa",
    marginBottom: 12,
    lineHeight: 16,
  },
  scalerRow: {
    gap: 12,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#71717a",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  textInput: {
    backgroundColor: "#0f1115",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 8,
    padding: 10,
    color: "#f4f4f5",
    fontSize: 15,
    fontWeight: "700",
  },
  multiplierSymbol: {
    fontSize: 18,
    fontWeight: "800",
    color: "#f59e0b",
    alignSelf: "center",
  },
  multiplierPills: {
    flexDirection: "row",
    gap: 6,
  },
  mPill: {
    flex: 1,
    backgroundColor: "#0f1115",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  mPillActive: {
    backgroundColor: "#f59e0b",
    borderColor: "#f59e0b",
  },
  mPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#a1a1aa",
  },
  mPillTextActive: {
    color: "#0f1115",
  },
  scaledResultBox: {
    backgroundColor: "#0f1115",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  scaledResultLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#e4e4e7",
  },
  scaledResultVal: {
    fontSize: 16,
    fontWeight: "800",
    color: "#f59e0b",
  },
  sectionSubHeader: {
    fontSize: 11,
    fontWeight: "800",
    color: "#f59e0b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 8,
  },
  referenceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#27272a",
    gap: 12,
  },
  refLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#e4e4e7",
    flex: 1, // FIXED FLEX TO PREVENT 1-CHAR VERTICAL TEXT
  },
  refValue: {
    fontSize: 12,
    color: "#a1a1aa",
    flex: 1.5, // GIVES ADEQUATE SPACE TO LONG DESCRIPTION TEXT
    textAlign: "right",
  },
  refBlock: {
    backgroundColor: "#0f1115",
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  refBlockTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#f4f4f5",
  },
  refBlockText: {
    fontSize: 11,
    color: "#a1a1aa",
    marginTop: 3,
    lineHeight: 16,
  },
});