import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  StatusBar,
  Share,
  Modal,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  where,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db, auth } from "../../lib/firebase";
import { AISLES, GroceryItem, ListType, guessAisle, listToText } from "../../lib/grocery";
import ScreenHeader from "../../components/ScreenHeader";
import { themedStyles, tc, statusBarStyle, useThemeMode } from "../../lib/theme";

const LISTS: { value: ListType; label: string; icon: any }[] = [
  { value: "grocery", label: "Grocery", icon: "shopping-basket" },
  { value: "prep", label: "Prep", icon: "list-ul" },
];

export default function GroceryScreen() {
  useThemeMode();
  const uid = auth.currentUser?.uid;
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeList, setActiveList] = useState<ListType>("grocery");
  const [newName, setNewName] = useState("");
  const [newQty, setNewQty] = useState("");
  const [editing, setEditing] = useState<GroceryItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editQty, setEditQty] = useState("");

  // Real-time listener for this user's items
  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, "groceryItems"),
      where("createdBy", "==", uid),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(
      q,
      (snapshot) => {
        setItems(
          snapshot.docs.map((d) => {
            const data = d.data() as any;
            return {
              id: d.id,
              name: data.name || "",
              quantity: data.quantity || "",
              checked: !!data.checked,
              list: data.list === "prep" ? "prep" : "grocery",
              aisle: data.aisle || guessAisle(data.name || ""),
              recipeId: data.recipeId ?? null,
              recipeTitle: data.recipeTitle ?? null,
              createdAt: data.createdAt,
            } as GroceryItem;
          })
        );
        setLoading(false);
      },
      (err) => {
        console.error("Grocery listener error:", err);
        setLoading(false);
      }
    );
  }, [uid]);

  const listItems = useMemo(() => items.filter((i) => i.list === activeList), [items, activeList]);
  const completedCount = listItems.filter((i) => i.checked).length;
  const progress = listItems.length ? (completedCount / listItems.length) * 100 : 0;

  // Grocery groups by aisle; prep groups by recipe. Checked items sink to the end.
  const sections = useMemo(() => {
    const groups = new Map<string, GroceryItem[]>();
    listItems.forEach((item) => {
      const key =
        activeList === "grocery" ? item.aisle || "Other" : item.recipeTitle || "General prep";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    });
    const order =
      activeList === "grocery"
        ? (a: string, b: string) => AISLES.indexOf(a as any) - AISLES.indexOf(b as any)
        : (a: string, b: string) =>
            a === "General prep" ? -1 : b === "General prep" ? 1 : a.localeCompare(b);
    return [...groups.keys()].sort(order).map((title) => ({
      title,
      data: groups.get(title)!.sort((a, b) => Number(a.checked) - Number(b.checked)),
    }));
  }, [listItems, activeList]);

  const addItem = async () => {
    const name = newName.trim();
    if (!name || !uid) return;
    setNewName("");
    setNewQty("");
    try {
      await addDoc(collection(db, "groceryItems"), {
        name: name.slice(0, 200),
        quantity: newQty.trim().slice(0, 40),
        checked: false,
        list: activeList,
        aisle: guessAisle(name),
        recipeId: null,
        recipeTitle: null,
        createdBy: uid,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Error adding item:", err);
      Alert.alert("Error", "Could not add that item.");
    }
  };

  const toggleCheck = (item: GroceryItem) =>
    updateDoc(doc(db, "groceryItems", item.id), { checked: !item.checked }).catch(() =>
      Alert.alert("Error", "Could not update item.")
    );

  const deleteItem = (id: string) =>
    deleteDoc(doc(db, "groceryItems", id)).catch(() =>
      Alert.alert("Error", "Could not delete item.")
    );

  const openEdit = (item: GroceryItem) => {
    setEditing(item);
    setEditName(item.name);
    setEditQty(item.quantity || "");
  };

  const saveEdit = async () => {
    if (!editing) return;
    const name = editName.trim();
    if (!name) return;
    try {
      await updateDoc(doc(db, "groceryItems", editing.id), {
        name: name.slice(0, 200),
        quantity: editQty.trim().slice(0, 40),
        aisle: name !== editing.name ? guessAisle(name) : editing.aisle,
      });
      setEditing(null);
    } catch {
      Alert.alert("Error", "Could not save changes.");
    }
  };

  const moveEditing = async () => {
    if (!editing) return;
    const target: ListType = editing.list === "grocery" ? "prep" : "grocery";
    try {
      await updateDoc(doc(db, "groceryItems", editing.id), { list: target });
      setEditing(null);
    } catch {
      Alert.alert("Error", "Could not move item.");
    }
  };

  const batchUpdate = async (targets: GroceryItem[], op: "delete" | "uncheck") => {
    if (targets.length === 0) return;
    try {
      // Firestore batches hold up to 500 writes.
      for (let i = 0; i < targets.length; i += 450) {
        const batch = writeBatch(db);
        targets.slice(i, i + 450).forEach((t) => {
          const ref = doc(db, "groceryItems", t.id);
          if (op === "delete") batch.delete(ref);
          else batch.update(ref, { checked: false });
        });
        await batch.commit();
      }
    } catch (err) {
      console.error("Batch update failed:", err);
      Alert.alert("Error", "Could not update the list.");
    }
  };

  const listLabel = activeList === "grocery" ? "grocery list" : "prep list";

  const showMenu = () => {
    Alert.alert(activeList === "grocery" ? "Grocery List" : "Prep List", undefined, [
      {
        text: "Share List",
        onPress: () =>
          Share.share({
            message: listToText(
              activeList === "grocery" ? "🛒 Grocery List" : "🔪 Prep List",
              listItems
            ),
          }).catch(() => {}),
      },
      { text: "Uncheck All", onPress: () => batchUpdate(listItems.filter((i) => i.checked), "uncheck") },
      { text: "Clear Checked", onPress: () => batchUpdate(listItems.filter((i) => i.checked), "delete") },
      {
        text: "Clear Entire List",
        style: "destructive",
        onPress: () =>
          Alert.alert("Clear list?", `Remove all ${listItems.length} items from your ${listLabel}?`, [
            { text: "Cancel", style: "cancel" },
            { text: "Clear", style: "destructive", onPress: () => batchUpdate(listItems, "delete") },
          ]),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={statusBarStyle()} backgroundColor={tc("#0f1115")} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScreenHeader
          title="Prep & Grocery"
          subtitle={
            listItems.length
              ? `${completedCount} of ${listItems.length} done`
              : activeList === "grocery"
              ? "Your shopping list"
              : "Your prep tasks"
          }
        />

        {/* List switcher + menu */}
        <View style={styles.toolbar}>
          <View style={styles.segment}>
            {LISTS.map((l) => {
              const active = l.value === activeList;
              const count = items.filter((i) => i.list === l.value && !i.checked).length;
              return (
                <Pressable
                  key={l.value}
                  style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                  onPress={() => setActiveList(l.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <FontAwesome name={l.icon} size={12} color={active ? tc("#0f1115") : tc("#a1a1aa")} />
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                    {l.label}
                    {count ? ` · ${count}` : ""}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable
            style={styles.menuBtn}
            onPress={showMenu}
            disabled={listItems.length === 0}
            accessibilityLabel="List options"
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={18}
              color={listItems.length ? tc("#f4f4f5") : tc("#52525b")}
            />
          </Pressable>
        </View>

        {listItems.length > 0 && (
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
          </View>
        )}

        {/* Add bar */}
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, styles.qtyInput]}
            placeholder="Qty"
            placeholderTextColor="#71717a"
            value={newQty}
            onChangeText={setNewQty}
            maxLength={40}
            returnKeyType="next"
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder={activeList === "grocery" ? "Add an item…" : "Add a prep task…"}
            placeholderTextColor="#71717a"
            value={newName}
            onChangeText={setNewName}
            onSubmitEditing={addItem}
            returnKeyType="done"
            maxLength={200}
          />
          <Pressable
            onPress={addItem}
            style={[styles.addBtn, !newName.trim() && styles.addBtnDisabled]}
            disabled={!newName.trim()}
            accessibilityLabel="Add item"
          >
            <FontAwesome name="plus" size={14} color={tc("#0f1115")} />
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#f59e0b" />
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={false}
            keyboardShouldPersistTaps="handled"
            renderSectionHeader={({ section }) => (
              <Text style={styles.sectionHeader}>
                {section.title} · {section.data.filter((i) => !i.checked).length}
              </Text>
            )}
            renderItem={({ item }) => (
              <View style={[styles.card, item.checked && styles.cardChecked]}>
                <Pressable
                  onPress={() => toggleCheck(item)}
                  style={styles.checkboxTouch}
                  hitSlop={8}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: item.checked }}
                >
                  <View style={[styles.checkbox, item.checked && styles.checkboxActive]}>
                    {item.checked && <FontAwesome name="check" size={10} color={tc("#0f1115")} />}
                  </View>
                </Pressable>
                <Pressable style={styles.itemBody} onPress={() => openEdit(item)}>
                  <Text
                    style={[styles.itemText, item.checked && styles.strikethrough]}
                    numberOfLines={2}
                  >
                    {item.quantity ? <Text style={styles.qtyText}>{item.quantity} </Text> : null}
                    {item.name}
                  </Text>
                  {activeList === "grocery" && item.recipeTitle ? (
                    <Text style={styles.sourceText} numberOfLines={1}>
                      for {item.recipeTitle}
                    </Text>
                  ) : null}
                </Pressable>
                <Pressable
                  onPress={() => deleteItem(item.id)}
                  style={styles.deleteBtn}
                  hitSlop={12}
                  accessibilityLabel={`Delete ${item.name}`}
                >
                  <Ionicons name="trash-outline" size={18} color={tc("#52525b")} />
                </Pressable>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconBg}>
                  <FontAwesome
                    name={activeList === "grocery" ? "shopping-basket" : "list-ul"}
                    size={24}
                    color="#f59e0b"
                  />
                </View>
                <Text style={styles.emptyTitle}>
                  {activeList === "grocery" ? "Nothing to buy yet" : "No prep tasks yet"}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {activeList === "grocery"
                    ? "Add items above, or open any recipe and tap “Add to Grocery List”."
                    : "Add tasks like “Dice 2 onions” or “Marinate chicken overnight”."}
                </Text>
              </View>
            }
          />
        )}
      </KeyboardAvoidingView>

      {/* Edit item */}
      <Modal visible={!!editing} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit item</Text>
            <Text style={styles.modalLabel}>Item</Text>
            <TextInput
              style={styles.modalInput}
              value={editName}
              onChangeText={setEditName}
              maxLength={200}
              placeholderTextColor="#71717a"
            />
            <Text style={styles.modalLabel}>Quantity</Text>
            <TextInput
              style={styles.modalInput}
              value={editQty}
              onChangeText={setEditQty}
              placeholder="e.g. 2 lbs"
              placeholderTextColor="#71717a"
              maxLength={40}
            />
            <Pressable style={styles.moveBtn} onPress={moveEditing}>
              <FontAwesome name="exchange" size={12} color="#f59e0b" />
              <Text style={styles.moveText}>
                Move to {editing?.list === "grocery" ? "Prep" : "Grocery"} list
              </Text>
            </Pressable>
            <View style={styles.modalActions}>
              <Pressable style={styles.modalSecondary} onPress={() => setEditing(null)}>
                <Text style={styles.modalSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalPrimary, !editName.trim() && styles.addBtnDisabled]}
                onPress={saveEdit}
                disabled={!editName.trim()}
              >
                <Text style={styles.modalPrimaryText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = themedStyles({
  safeArea: { flex: 1, backgroundColor: "#0f1115" },
  container: { flex: 1, backgroundColor: "#0f1115" },
  pressed: { opacity: 0.7 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },

  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  segment: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#181b20",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#27272a",
    padding: 3,
    gap: 3,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 9,
  },
  segmentBtnActive: { backgroundColor: "#f59e0b" },
  segmentText: { color: "#a1a1aa", fontWeight: "700", fontSize: 13 },
  segmentTextActive: { color: "#0f1115" },
  menuBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#181b20",
    borderWidth: 1,
    borderColor: "#27272a",
    alignItems: "center",
    justifyContent: "center",
  },

  progressBarBackground: {
    height: 6,
    backgroundColor: "#27272a",
    borderRadius: 3,
    marginHorizontal: 20,
    marginBottom: 12,
    overflow: "hidden",
  },
  progressBarFill: { height: "100%", backgroundColor: "#f59e0b", borderRadius: 3 },

  inputContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#181b20",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    color: "#f4f4f5",
    fontSize: 15,
  },
  qtyInput: { width: 70, paddingHorizontal: 10, textAlign: "center" },
  addBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#f59e0b",
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnDisabled: { opacity: 0.4 },

  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  sectionHeader: {
    color: "#a1a1aa",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 16,
    marginBottom: 8,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#181b20",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#27272a",
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
    gap: 12,
  },
  cardChecked: { opacity: 0.55 },
  checkboxTouch: { padding: 2 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#52525b",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: { backgroundColor: "#f59e0b", borderColor: "#f59e0b" },
  itemBody: { flex: 1 },
  itemText: { color: "#f4f4f5", fontSize: 15, fontWeight: "500" },
  qtyText: { color: "#f59e0b", fontWeight: "800" },
  sourceText: { color: "#71717a", fontSize: 12, marginTop: 2 },
  strikethrough: { textDecorationLine: "line-through", color: "#71717a" },
  deleteBtn: { padding: 4 },

  emptyContainer: { alignItems: "center", marginTop: 60, paddingHorizontal: 30 },
  emptyIconBg: {
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
  emptyTitle: { color: "#f4f4f5", fontSize: 17, fontWeight: "800" },
  emptySubtitle: {
    color: "#a1a1aa",
    fontSize: 14,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "#181b20",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#27272a",
    padding: 20,
  },
  modalTitle: { color: "#f4f4f5", fontSize: 18, fontWeight: "800", marginBottom: 12 },
  modalLabel: { color: "#a1a1aa", fontSize: 12, fontWeight: "700", marginBottom: 6, marginTop: 6 },
  modalInput: {
    backgroundColor: "#0f1115",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    color: "#f4f4f5",
    fontSize: 15,
  },
  moveBtn: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 16 },
  moveText: { color: "#f59e0b", fontWeight: "700", fontSize: 14 },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 20 },
  modalSecondary: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#27272a",
    alignItems: "center",
    justifyContent: "center",
  },
  modalSecondaryText: { color: "#f4f4f5", fontWeight: "700" },
  modalPrimary: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#f59e0b",
    alignItems: "center",
    justifyContent: "center",
  },
  modalPrimaryText: { color: "#0f1115", fontWeight: "800" },
});
