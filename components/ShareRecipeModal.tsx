import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { getAuth } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useRouter } from "expo-router";
import { db } from "../lib/firebase"; // Adjust relative path if needed

interface Friend {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  expoPushToken?: string;
}

interface ShareRecipeModalProps {
  visible: boolean;
  onClose: () => void;
  recipe: {
    id: string;
    title: string;
  };
}

// Push notification helper using Expo's Push API
async function sendPushNotification(
  expoPushToken: string,
  title: string,
  body: string,
  data?: object
) {
  if (!expoPushToken) return;

  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: expoPushToken,
        sound: "default",
        title,
        body,
        data: data || {},
      }),
    });
  } catch (error) {
    console.error("Error sending push notification:", error);
  }
}

export default function ShareRecipeModal({
  visible,
  onClose,
  recipe,
}: ShareRecipeModalProps) {
  const router = useRouter();
  const auth = getAuth();
  const currentUser = auth.currentUser;

  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingUid, setSendingUid] = useState<string | null>(null);
  const [sentUids, setSentUids] = useState<Record<string, boolean>>({});

  // Fetch connected friends and their primary user records
  useEffect(() => {
    if (!visible || !currentUser) return;

    const fetchFriends = async () => {
      setLoading(true);
      try {
        const friendsRef = collection(db, "users", currentUser.uid, "friends");
        const snapshot = await getDocs(friendsRef);

        const friendPromises = snapshot.docs.map(async (friendDoc) => {
          const friendSubData = friendDoc.data();
          const targetUid = friendDoc.id;

          // Fetch primary user doc to ensure push token and profile picture exist
          const userDocSnap = await getDoc(doc(db, "users", targetUid));
          const userData = userDocSnap.exists() ? userDocSnap.data() : {};

          return {
            uid: targetUid,
            displayName:
              userData.displayName || friendSubData.displayName || "Chef",
            email: userData.email || friendSubData.email || "",
            photoURL: userData.photoURL || friendSubData.photoURL || "",
            expoPushToken: userData.expoPushToken || "",
          } as Friend;
        });

        const friendList = await Promise.all(friendPromises);
        setFriends(friendList);
      } catch (err) {
        console.error("Error fetching friends list:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFriends();
  }, [visible, currentUser]);

  const handleSendRecipe = async (friend: Friend) => {
    if (!currentUser || !recipe) return;

    setSendingUid(friend.uid);

    try {
      // 1. Generate deterministic 1-on-1 thread ID
      const threadId = [currentUser.uid, friend.uid].sort().join("_");

      // 2. Upsert the main thread metadata
      const threadRef = doc(db, "chats", threadId);
      await setDoc(
        threadRef,
        {
          participants: [currentUser.uid, friend.uid],
          participantData: {
            [currentUser.uid]: {
              displayName: currentUser.displayName || "Chef",
              email: currentUser.email || "",
              photoURL: currentUser.photoURL || "",
            },
            [friend.uid]: {
              displayName: friend.displayName || "Chef",
              email: friend.email || "",
              photoURL: friend.photoURL || "",
            },
          },
          lastMessage: `Shared recipe: ${recipe.title}`,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // 3. Add message document to messages subcollection
      const messagesRef = collection(db, "chats", threadId, "messages");
      await addDoc(messagesRef, {
        senderId: currentUser.uid,
        text: `Hey, check out this recipe: "${recipe.title}"!`,
        sharedRecipeId: recipe.id,
        sharedRecipeTitle: recipe.title,
        type: "recipe_share",
        createdAt: serverTimestamp(),
      });

      // 4. Send Expo Push Notification if recipient has token registered
      if (friend.expoPushToken) {
        const senderName = currentUser.displayName || "A fellow Chef";
        await sendPushNotification(
          friend.expoPushToken,
          `New Recipe from ${senderName}`,
          `Shared "${recipe.title}" with you!`,
          { threadId, recipeId: recipe.id }
        );
      }

      // 5. Update local state to mark sent
      setSentUids((prev) => ({ ...prev, [friend.uid]: true }));
    } catch (err) {
      console.error("Error sharing recipe:", err);
      Alert.alert("Error", "Could not send recipe. Please try again.");
    } finally {
      setSendingUid(null);
    }
  };

const handleOpenChat = (friendUid: string) => {
  if (!currentUser) return;
  const threadId = [currentUser.uid, friendUid].sort().join("_");
  onClose();
  
  // Update this path to match your folder structure (/chat/[id])
  router.push(`/chat/${threadId}`);
};
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Send Recipe to Chef</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {recipe?.title}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <FontAwesome name="times" size={16} color="#a1a1aa" />
            </Pressable>
          </View>

          {/* Friends List */}
          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="small" color="#f59e0b" />
            </View>
          ) : friends.length === 0 ? (
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>
                No connected chefs found in your network yet.
              </Text>
            </View>
          ) : (
            <FlatList
              data={friends}
              keyExtractor={(item) => item.uid}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const isSending = sendingUid === item.uid;
                const isSent = sentUids[item.uid];
return (
    // Wrap the ENTIRE card in Pressable so clicking anywhere on the friend sends/opens chat
    <Pressable
      style={({ pressed }) => [
        styles.friendCard,
        pressed && { opacity: 0.8, backgroundColor: "#1f242d" },
      ]}
      onPress={() => {
        if (isSent) {
          handleOpenChat(item.uid);
        } else {
          handleSendRecipe(item);
        }
      }}
      disabled={isSending}
    >
      <Image
        source={{
          uri:
            item.photoURL ||
            "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?q=80&w=200",
        }}
        style={styles.avatar}
      />
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>
          {item.displayName || "Chef"}
        </Text>
        <Text style={styles.friendEmail}>{item.email}</Text>
      </View>

      {isSent ? (
        <View style={styles.sentBtn}>
          <Text style={styles.sentBtnText}>View Chat</Text>
        </View>
      ) : (
        <View style={styles.sendBtn}>
          {isSending ? (
            <ActivityIndicator size="small" color="#0f1115" />
          ) : (
            <>
              <FontAwesome
                name="paper-plane"
                size={12}
                color="#0f1115"
              />
              <Text style={styles.sendBtnText}>Send</Text>
            </>
          )}
        </View>
      )}
    </Pressable>
  );
}}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#181b20",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "70%",
    borderWidth: 1,
    borderColor: "#27272a",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#27272a",
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#f4f4f5",
  },
  subtitle: {
    fontSize: 12,
    color: "#f59e0b",
    fontWeight: "600",
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#0f1115",
    justifyContent: "center",
    alignItems: "center",
  },
  centerContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: {
    color: "#71717a",
    fontSize: 13,
    textAlign: "center",
  },
  listContent: {
    paddingBottom: 20,
  },
  friendCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0f1115",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    color: "#f4f4f5",
    fontSize: 14,
    fontWeight: "700",
  },
  friendEmail: {
    color: "#71717a",
    fontSize: 12,
  },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f59e0b",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  sendBtnPressed: {
    opacity: 0.8,
  },
  sendBtnText: {
    color: "#0f1115",
    fontWeight: "800",
    fontSize: 12,
  },
  sentBtn: {
    backgroundColor: "#27272a",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  sentBtnText: {
    color: "#f59e0b",
    fontWeight: "700",
    fontSize: 12,
  },
});