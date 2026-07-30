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
import FontAwesome from "@expo/vector-icons/FontAwesome";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";
import { getAuth } from "firebase/auth";
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "../../lib/firebase"; // Adjust relative path if needed

interface ChatThread {
  id: string; // Document ID formatted as: minUid_maxUid
  participants: string[];
  participantData: {
    [uid: string]: {
      displayName: string;
      email: string;
      photoURL?: string;
    };
  };
  lastMessage: string;
  updatedAt: string;
}

export default function MessagesListScreen() {
  const router = useRouter();
  const auth = getAuth();
  const currentUser = auth.currentUser;

  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(true);

  // Listen to all active chat threads for the logged-in chef
  useEffect(() => {
    if (!currentUser) return;

    const chatsRef = collection(db, "chats");
    const q = query(
      chatsRef,
      where("participants", "array-contains", currentUser.uid),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const chatData: ChatThread[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as ChatThread[];
        setThreads(chatData);
        setLoading(false);
      },
      (err) => {
        console.error("Error loading chat list:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // Helper function to extract opponent chef's data
  const getOtherChef = (thread: ChatThread) => {
    if (!currentUser) return { displayName: "Chef", email: "", photoURL: "" };
    const otherUid = thread.participants.find((uid) => uid !== currentUser.uid);
    if (otherUid && thread.participantData?.[otherUid]) {
      return thread.participantData[otherUid];
    }
    return { displayName: "Chef", email: "", photoURL: "" };
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1115" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View style={styles.amberBar} />
            <Text style={styles.headerTitle}>Kitchen Messenger</Text>
          </View>
          <Pressable onPress={() => router.back()} style={styles.closeBtn}>
            <FontAwesome name="times" size={16} color="#a1a1aa" />
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#f59e0b" />
          </View>
        ) : threads.length === 0 ? (
          <View style={styles.centerContainer}>
            <View style={styles.emptyIconCircle}>
              <MaterialCommunityIcons
                name="message-text-outline"
                size={32}
                color="#71717a"
              />
            </View>
            <Text style={styles.emptyTitle}>No Conversations Yet</Text>
            <Text style={styles.emptySubtitle}>
              Connect with friends from your profile to start discussing recipes and prep.
            </Text>
          </View>
        ) : (
          <FlatList
            data={threads}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const otherChef = getOtherChef(item);
              return (
                <Pressable
                  style={({ pressed }) => [
                    styles.threadCard,
                    pressed && styles.threadCardPressed,
                  ]}
                  onPress={() => router.push(`/messages/${item.id}` as any)}
                >
                  <Image
                    source={{
                      uri:
                        otherChef.photoURL ||
                        "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?q=80&w=200",
                    }}
                    style={styles.avatar}
                  />

                  <View style={styles.threadInfo}>
                    <Text style={styles.chefName}>{otherChef.displayName}</Text>
                    <Text style={styles.lastMessage} numberOfLines={1}>
                      {item.lastMessage || "Tap to start chatting..."}
                    </Text>
                  </View>

                  <FontAwesome name="chevron-right" size={12} color="#52525b" />
                </Pressable>
              );
            }}
          />
        )}
      </View>
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
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#27272a",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  amberBar: {
    width: 4,
    height: 18,
    backgroundColor: "#f59e0b",
    borderRadius: 2,
    marginRight: 10,
  },
  headerTitle: {
    color: "#f4f4f5",
    fontSize: 18,
    fontWeight: "800",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#181b20",
    borderWidth: 1,
    borderColor: "#27272a",
    justifyContent: "center",
    alignItems: "center",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#181b20",
    borderWidth: 1,
    borderColor: "#27272a",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    color: "#f4f4f5",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  emptySubtitle: {
    color: "#71717a",
    fontSize: 13,
    textAlign: "center",
  },
  listContent: {
    paddingVertical: 16,
  },
  threadCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#181b20",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  threadCardPressed: {
    backgroundColor: "#27272a",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#f59e0b",
  },
  threadInfo: {
    flex: 1,
  },
  chefName: {
    color: "#f4f4f5",
    fontSize: 15,
    fontWeight: "700",
  },
  lastMessage: {
    color: "#a1a1aa",
    fontSize: 13,
    marginTop: 2,
  },
});