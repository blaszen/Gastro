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
  ActivityIndicator,
  Image,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { getAuth } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../lib/firebase"; // Adjust path to match your structure

interface Message {
  id: string;
  senderId: string;
  text: string;
  type?: string;
  sharedRecipeId?: string;
  sharedRecipeTitle?: string;
  createdAt: any;
}

interface ParticipantInfo {
  displayName: string;
  photoURL: string;
  email: string;
}

export default function ChatScreen() {
  const { id: threadId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const auth = getAuth();
  const currentUser = auth.currentUser;

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [otherUser, setOtherUser] = useState<ParticipantInfo | null>(null);

  const flatListRef = useRef<FlatList>(null);

  // 1. Fetch metadata for the other participant
  useEffect(() => {
    if (!threadId || !currentUser) return;

    const fetchThreadMeta = async () => {
      try {
        const threadDoc = await getDoc(doc(db, "chats", threadId));
        if (threadDoc.exists()) {
          const data = threadDoc.data();
          const participants: string[] = data.participants || [];
          const otherUid = participants.find((uid) => uid !== currentUser.uid);

          if (otherUid && data.participantData?.[otherUid]) {
            setOtherUser(data.participantData[otherUid]);
          } else if (otherUid) {
            // Fallback: fetch user record directly if missing from participantData
            const uDoc = await getDoc(doc(db, "users", otherUid));
            if (uDoc.exists()) {
              setOtherUser(uDoc.data() as ParticipantInfo);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching chat metadata:", err);
      }
    };

    fetchThreadMeta();
  }, [threadId, currentUser]);

  // 2. Real-time message listener
  useEffect(() => {
    if (!threadId) return;

    const messagesRef = collection(db, "chats", threadId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Message[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Message[];

        setMessages(list);
        setLoading(false);
      },
      (error) => {
        console.error("Error listening to messages:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [threadId]);

  // Send a text message
  const handleSendMessage = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || !currentUser || !threadId) return;

    setInputText("");

    try {
      const messagesRef = collection(db, "chats", threadId, "messages");
      await addDoc(messagesRef, {
        senderId: currentUser.uid,
        text: trimmed,
        type: "text",
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const renderMessageItem = ({ item }: { item: Message }) => {
    const isMe = item.senderId === currentUser?.uid;
    const isRecipe = item.type === "recipe_share" || !!item.sharedRecipeId;

    return (
      <View
        style={[
          styles.messageRow,
          isMe ? styles.messageRowMe : styles.messageRowOther,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isMe ? styles.bubbleMe : styles.bubbleOther,
            isRecipe && styles.recipeBubble,
          ]}
        >
          {/* Shared Recipe Attachment Block */}
          {isRecipe && (
            <View style={styles.recipeCard}>
              <View style={styles.recipeCardHeader}>
                <View style={styles.recipeBadge}>
                  <FontAwesome name="cutlery" size={12} color="#f59e0b" />
                  <Text style={styles.recipeBadgeText}>Shared Recipe</Text>
                </View>
              </View>
              <Text style={styles.recipeTitle}>
                {item.sharedRecipeTitle || "View Recipe"}
              </Text>
              {item.sharedRecipeId && (
                <Pressable
                  style={styles.viewRecipeBtn}
                  onPress={() =>
                    router.push({
                      pathname: "/recipes",
                      params: { recipeId: item.sharedRecipeId },
                    })
                  }
                >
                  <Text style={styles.viewRecipeBtnText}>Open Recipe</Text>
                  <FontAwesome name="chevron-right" size={10} color="#0f1115" />
                </Pressable>
              )}
            </View>
          )}

          {/* Standard Message Text */}
          {item.text ? (
            <Text
              style={[
                styles.messageText,
                isMe ? styles.textMe : styles.textOther,
              ]}
            >
              {item.text}
            </Text>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1115" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <FontAwesome name="chevron-left" size={16} color="#f59e0b" />
        </Pressable>

        <Image
          source={{
            uri:
              otherUser?.photoURL ||
              "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?q=80&w=200",
          }}
          style={styles.avatar}
        />

        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>
            {otherUser?.displayName || "Chef"}
          </Text>
          <Text style={styles.headerSubtitle}>Kitchen Network</Text>
        </View>
      </View>

      {/* Messages Feed */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#f59e0b" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessageItem}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
            onLayout={() =>
              flatListRef.current?.scrollToEnd({ animated: false })
            }
          />
        )}

        {/* Bottom Input Field */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#71717a"
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <Pressable
            style={({ pressed }) => [
              styles.sendBtn,
              !inputText.trim() && styles.sendBtnDisabled,
              pressed && { opacity: 0.8 },
            ]}
            onPress={handleSendMessage}
            disabled={!inputText.trim()}
          >
            <FontAwesome name="paper-plane" size={14} color="#0f1115" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#f4f4f5",
  },
  headerSubtitle: {
    fontSize: 11,
    color: "#71717a",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  messageRowMe: {
    justifyContent: "flex-end",
  },
  messageRowOther: {
    justifyContent: "flex-start",
  },
  messageBubble: {
    maxWidth: "80%",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMe: {
    backgroundColor: "#f59e0b",
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: "#181b20",
    borderWidth: 1,
    borderColor: "#27272a",
    borderBottomLeftRadius: 4,
  },
  recipeBubble: {
    padding: 8,
    width: 240,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  textMe: {
    color: "#0f1115",
    fontWeight: "600",
  },
  textOther: {
    color: "#f4f4f5",
  },

  // Shared Recipe Component Card
  recipeCard: {
    backgroundColor: "#0f1115",
    borderRadius: 12,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  recipeCardHeader: {
    flexDirection: "row",
    marginBottom: 6,
  },
  recipeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  recipeBadgeText: {
    color: "#f59e0b",
    fontSize: 10,
    fontWeight: "700",
  },
  recipeTitle: {
    color: "#f4f4f5",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 10,
  },
  viewRecipeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f59e0b",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  viewRecipeBtnText: {
    color: "#0f1115",
    fontSize: 11,
    fontWeight: "800",
  },

  // Input Bar
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#181b20",
    borderTopWidth: 1,
    borderTopColor: "#27272a",
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: "#0f1115",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    color: "#f4f4f5",
    fontSize: 14,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#f59e0b",
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
});