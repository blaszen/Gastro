import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { getAuth } from "firebase/auth";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase"; // Adjust path if needed

interface ChatThread {
  id: string;
  participants: string[];
  participantData?: {
    [uid: string]: {
      displayName: string;
      photoURL: string;
      email: string;
    };
  };
  lastMessage?: string;
  updatedAt?: any;
}

export default function MessagesScreen() {
  const router = useRouter();
  const auth = getAuth();
  const currentUser = auth.currentUser;

  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    // Fetch chat documents where current user is listed in participants array
    const chatsRef = collection(db, "chats");
    const q = query(chatsRef, where("participants", "array-contains", currentUser.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: ChatThread[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ChatThread[];

        setThreads(list);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching chat threads:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const renderThreadItem = ({ item }: { item: ChatThread }) => {
    const otherUid = item.participants.find((uid) => uid !== currentUser?.uid);
    const otherUserData = otherUid && item.participantData?.[otherUid];

    return (
      <Pressable
        style={({ pressed }) => [styles.chatCard, pressed && styles.chatCardPressed]}
        onPress={() => router.push(`/chat/${item.id}`)}
      >
        <Image
          source={{
            uri:
              otherUserData?.photoURL ||
              "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?q=80&w=200",
          }}
          style={styles.avatar}
        />

        <View style={styles.chatInfo}>
          <Text style={styles.userName}>
            {otherUserData?.displayName || "Chef"}
          </Text>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage || "Tap to start chatting..."}
          </Text>
        </View>

        <FontAwesome name="chevron-right" size={12} color="#52525b" />
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1115" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#f59e0b" />
        </View>
      ) : threads.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FontAwesome name="comments-o" size={48} color="#27272a" />
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptySubtitle}>
            Share a recipe or message a chef from the community to get started.
          </Text>
        </View>
      ) : (
        <FlatList
          data={threads}
          keyExtractor={(item) => item.id}
          renderItem={renderThreadItem}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f1115",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#27272a",
    backgroundColor: "#181b20",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#f4f4f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: {
    padding: 16,
    gap: 12,
  },
  chatCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#181b20",
    borderWidth: 1,
    borderColor: "#27272a",
    padding: 14,
    borderRadius: 16,
  },
  chatCardPressed: {
    opacity: 0.8,
    backgroundColor: "#20242c",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 14,
  },
  chatInfo: {
    flex: 1,
    marginRight: 8,
  },
  userName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#f4f4f5",
    marginBottom: 2,
  },
  lastMessage: {
    fontSize: 13,
    color: "#a1a1aa",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: "#f4f4f5",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 6,
  },
  emptySubtitle: {
    color: "#71717a",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
});