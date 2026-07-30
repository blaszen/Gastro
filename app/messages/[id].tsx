import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getAuth } from "firebase/auth";
import {
  collection,
  doc,
  addDoc,
  setDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../lib/firebase"; // Adjust relative path if needed

interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  sharedRecipeId?: string;
  sharedRecipeTitle?: string;
  createdAt: any;
}

export default function DirectChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); // Chat thread ID
  const router = useRouter();
  const auth = getAuth();
  const currentUser = auth.currentUser;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);

  const flatListRef = useRef<FlatList>(null);

  // Real-time listener for thread messages
  useEffect(() => {
    if (!id) return;

    const msgsRef = collection(db, "chats", id as string, "messages");
    const q = query(msgsRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs: ChatMessage[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as ChatMessage[];
        setMessages(msgs);
        setLoading(false);
      },
      (err) => {
        console.error("Error loading chat messages:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [id]);

  // Send text message
  const handleSendMessage = async () => {
    const cleanText = inputText.trim();
    if (!cleanText || !currentUser || !id) return;

    setInputText("");

    try {
      const msgsRef = collection(db, "chats", id as string, "messages");
      await addDoc(msgsRef, {
        senderId: currentUser.uid,
        text: cleanText,
        createdAt: serverTimestamp(),
      });

      // Update parent chat thread with lastMessage snippet
      const chatDocRef = doc(db, "chats", id as string);
      await setDoc(
        chatDocRef,
        {
          lastMessage: cleanText,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1115" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        {/* Top Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <FontAwesome name="chevron-left" size={14} color="#f59e0b" />
          </Pressable>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Chef Chat</Text>
            <Text style={styles.headerSubtitle}>Direct Kitchen Line</Text>
          </View>
        </View>

        {/* Message Stream */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#f59e0b" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
            renderItem={({ item }) => {
              const isMine = item.senderId === currentUser?.uid;

              return (
                <View
                  style={[
                    styles.messageBubble,
                    isMine ? styles.myBubble : styles.theirBubble,
                  ]}
                >
                  {/* Shared Recipe Card (If attached) */}
                  {item.sharedRecipeTitle && (
                    <View style={styles.sharedRecipeCard}>
                      <View style={styles.recipeCardHeader}>
                        <MaterialCommunityIcons
                          name="silverware-fork-knife"
                          size={14}
                          color="#f59e0b"
                        />
                        <Text style={styles.recipeCardLabel}>Shared Recipe</Text>
                      </View>
                      <Text style={styles.recipeCardTitle}>
                        {item.sharedRecipeTitle}
                      </Text>
                    </View>
                  )}

                  <Text
                    style={[
                      styles.messageText,
                      isMine ? styles.myMessageText : styles.theirMessageText,
                    ]}
                  >
                    {item.text}
                  </Text>
                </View>
              );
            }}
          />
        )}

        {/* Bottom Input Field Bar */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Type a message..."
            placeholderTextColor="#71717a"
            value={inputText}
            onChangeText={setInputText}
            multiline
          />

          <Pressable style={styles.sendBtn} onPress={handleSendMessage}>
            <FontAwesome name="paper-plane" size={14} color="#0f1115" />
          </Pressable>
        </View>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#27272a",
    backgroundColor: "#181b20",
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    color: "#f4f4f5",
    fontSize: 16,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: "#f59e0b",
    fontSize: 11,
    fontWeight: "600",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  messageList: {
    padding: 16,
    paddingBottom: 20,
  },
  messageBubble: {
    maxWidth: "80%",
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  myBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#f59e0b",
    borderBottomRightRadius: 2,
  },
  theirBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#181b20",
    borderWidth: 1,
    borderColor: "#27272a",
    borderBottomLeftRadius: 2,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  myMessageText: {
    color: "#0f1115",
    fontWeight: "600",
  },
  theirMessageText: {
    color: "#f4f4f5",
  },
  sharedRecipeCard: {
    backgroundColor: "#0f1115",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.4)",
  },
  recipeCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  recipeCardLabel: {
    color: "#f59e0b",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  recipeCardTitle: {
    color: "#f4f4f5",
    fontSize: 13,
    fontWeight: "700",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#181b20",
    borderTopWidth: 1,
    borderTopColor: "#27272a",
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: "#0f1115",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: "#f4f4f5",
    fontSize: 14,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f59e0b",
    justifyContent: "center",
    alignItems: "center",
  },
});