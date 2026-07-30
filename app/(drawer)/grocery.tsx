import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  StatusBar,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";

// Firebase Imports
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db, auth } from "../../lib/firebase";

interface GroceryItem {
  id: string;
  name: string;
  checked: boolean;
  createdAt?: any;
}

export default function GroceryModal() {
  const router = useRouter();
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [newItemText, setNewItemText] = useState("");
  const [loading, setLoading] = useState(true);

  // 1. REAL-TIME LISTENER
  useEffect(() => {
    // Query items sorted by creation time
    const q = query(
      collection(db, "groceryItems"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedItems: GroceryItem[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<GroceryItem, "id">),
        }));
        setItems(fetchedItems);
        setLoading(false);
      },
      (error) => {
        console.error("Firestore grocery subscription error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // 2. TOGGLE CHECKED STATE
  const toggleCheck = async (id: string, currentChecked: boolean) => {
    try {
      const itemRef = doc(db, "groceryItems", id);
      await updateDoc(itemRef, {
        checked: !currentChecked,
      });
    } catch (err) {
      console.error("Error toggling item:", err);
      Alert.alert("Error", "Could not update item.");
    }
  };

  // 3. ADD NEW ITEM
  const addItem = async () => {
    if (!newItemText.trim()) return;

    const textToAdd = newItemText.trim();
    setNewItemText(""); // Clear input immediately for snappy UI

    try {
      await addDoc(collection(db, "groceryItems"), {
        name: textToAdd,
        checked: false,
        createdBy: auth.currentUser?.uid || "anonymous",
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Error adding item:", err);
      Alert.alert("Error", "Could not add item to list.");
    }
  };

  // 4. DELETE SINGLE ITEM
  const deleteItem = async (id: string) => {
    try {
      await deleteDoc(doc(db, "groceryItems", id));
    } catch (err) {
      console.error("Error deleting item:", err);
      Alert.alert("Error", "Could not delete item.");
    }
  };

  // 5. CLEAR ALL CHECKED ITEMS (Batch Delete)
  const clearCompleted = async () => {
    const checkedItems = items.filter((item) => item.checked);
    if (checkedItems.length === 0) return;

    try {
      const batch = writeBatch(db);
      checkedItems.forEach((item) => {
        batch.delete(doc(db, "groceryItems", item.id));
      });
      await batch.commit();
    } catch (err) {
      console.error("Error clearing checked items:", err);
      Alert.alert("Error", "Could not clear checked items.");
    }
  };

  const completedCount = items.filter((item) => item.checked).length;
  const progressPercent =
    items.length > 0 ? (completedCount / items.length) * 100 : 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1115" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>
              Prep & Grocery<Text style={styles.brandDot}>.</Text>
            </Text>
            <Text style={styles.subtitle}>
              {completedCount} of {items.length} items acquired
            </Text>
          </View>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.closeBtn,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="close" size={20} color="#a1a1aa" />
          </Pressable>
        </View>

        {/* Progress Tracker */}
        {items.length > 0 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBackground}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${progressPercent}%` },
                ]}
              />
            </View>
            {completedCount > 0 && (
              <Pressable onPress={clearCompleted} style={styles.clearBtn}>
                <Text style={styles.clearBtnText}>Clear checked</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Input Bar */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Add ingredient or prep item..."
            placeholderTextColor="#71717a"
            value={newItemText}
            onChangeText={setNewItemText}
            onSubmitEditing={addItem}
            returnKeyType="done"
          />
          <Pressable
            onPress={addItem}
            style={({ pressed }) => [
              styles.addBtn,
              !newItemText.trim() && styles.addBtnDisabled,
              pressed && styles.pressed,
            ]}
            disabled={!newItemText.trim()}
          >
            <FontAwesome name="plus" size={14} color="#0f1115" />
          </Pressable>
        </View>

        {/* Grocery Items List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#f59e0b" />
            <Text style={styles.loadingText}>Syncing grocery list...</Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.card,
                  item.checked && styles.cardChecked,
                ]}
              >
                <Pressable
                  onPress={() => toggleCheck(item.id, item.checked)}
                  style={styles.checkboxTouch}
                >
                  <View
                    style={[
                      styles.checkbox,
                      item.checked && styles.checkboxActive,
                    ]}
                  >
                    {item.checked && (
                      <FontAwesome name="check" size={10} color="#0f1115" />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.itemText,
                      item.checked && styles.strikethrough,
                    ]}
                  >
                    {item.name}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => deleteItem(item.id)}
                  style={({ pressed }) => [
                    styles.deleteBtn,
                    pressed && styles.pressed,
                  ]}
                  hitSlop={12}
                >
                  <Ionicons name="trash-outline" size={18} color="#52525b" />
                </Pressable>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconBg}>
                  <FontAwesome name="shopping-basket" size={24} color="#f59e0b" />
                </View>
                <Text style={styles.emptyTitle}>List is Empty</Text>
                <Text style={styles.emptySubtitle}>
                  Add ingredients above to start preparing for your next dish!
                </Text>
              </View>
            }
          />
        )}
      </KeyboardAvoidingView>
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
  pressed: {
    opacity: 0.7,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: "#a1a1aa",
    fontWeight: "600",
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#f4f4f5",
    letterSpacing: -0.5,
  },
  brandDot: {
    color: "#f59e0b",
  },
  subtitle: {
    fontSize: 13,
    color: "#a1a1aa",
    fontWeight: "500",
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#181b20",
    borderWidth: 1,
    borderColor: "#27272a",
    justifyContent: "center",
    alignItems: "center",
  },

  // Progress Bar
  progressContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  progressBarBackground: {
    flex: 1,
    height: 6,
    backgroundColor: "#181b20",
    borderRadius: 3,
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: "#27272a",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#f59e0b",
    borderRadius: 3,
  },
  clearBtn: {
    paddingVertical: 2,
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#f59e0b",
  },

  // Input
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 10,
  },
  input: {
    flex: 1,
    height: 48,
    backgroundColor: "#181b20",
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#f4f4f5",
    borderWidth: 1,
    borderColor: "#27272a",
  },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#f59e0b",
    justifyContent: "center",
    alignItems: "center",
  },
  addBtnDisabled: {
    backgroundColor: "#3f3f46",
  },

  // List Items
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 10,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#181b20",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  cardChecked: {
    backgroundColor: "#121418",
    borderColor: "#27272a",
    opacity: 0.7,
  },
  checkboxTouch: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#52525b",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  checkboxActive: {
    backgroundColor: "#f59e0b",
    borderColor: "#f59e0b",
  },
  itemText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#f4f4f5",
    flex: 1,
  },
  strikethrough: {
    textDecorationLine: "line-through",
    color: "#71717a",
  },
  deleteBtn: {
    padding: 6,
    marginLeft: 8,
  },

  // Empty State
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyIconBg: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#181b20",
    borderWidth: 1,
    borderColor: "#27272a",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f4f4f5",
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#71717a",
    textAlign: "center",
    marginTop: 6,
    maxWidth: 240,
    lineHeight: 18,
  },
});