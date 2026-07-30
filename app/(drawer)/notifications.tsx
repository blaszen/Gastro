import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";
import { getAuth } from "firebase/auth";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../../lib/firebase"; // Adjust path to your firebase config

interface FriendRequest {
  id: string;
  fromUid: string;
  fromEmail: string;
  fromName?: string;
  status: "pending" | "accepted";
  createdAt?: string;
}

export default function NotificationsModalScreen() {
  const router = useRouter();
  const auth = getAuth();
  const currentUser = auth.currentUser;

  const [activeTab, setActiveTab] = useState<"incoming" | "sent">("incoming");
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Real-time listener for incoming friend requests
  useEffect(() => {
    // 1. Exit early if no authenticated user
    if (!currentUser?.uid) {
      setIncomingRequests([]);
      setLoading(false);
      return;
    }

    const reqRef = collection(db, "users", currentUser.uid, "friendRequests");

    // 2. Attach real-time listener
    const unsubscribe = onSnapshot(
      reqRef,
      (snapshot) => {
        const reqs: FriendRequest[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as FriendRequest[];

        setIncomingRequests(reqs.filter((r) => r.status === "pending"));
        setLoading(false);
      },
      (error) => {
        // Quietly ignore logout permission drops when auth state clears
        if (error.code === "permission-denied") {
          return;
        }
        console.error("Error listening to friend requests:", error);
        setLoading(false);
      }
    );

    // 3. Clean up the listener on unmount or user change
    return () => unsubscribe();
  }, [currentUser?.uid]);

  // Accept Request Logic
  const handleAcceptRequest = async (request: FriendRequest) => {
    if (!currentUser) return;
    setActionLoadingId(request.id);

    try {
      // 1. Add sender to CURRENT user's friends list
      const myFriendRef = doc(
        db,
        "users",
        currentUser.uid,
        "friends",
        request.fromUid
      );
      await setDoc(myFriendRef, {
        uid: request.fromUid,
        email: request.fromEmail,
        displayName: request.fromName || "Chef",
        connectedAt: new Date().toISOString(),
      });

      // 2. Add CURRENT user to sender's friends list
      const senderFriendRef = doc(
        db,
        "users",
        request.fromUid,
        "friends",
        currentUser.uid
      );
      await setDoc(senderFriendRef, {
        uid: currentUser.uid,
        email: currentUser.email || "",
        displayName: currentUser.displayName || "Chef",
        connectedAt: new Date().toISOString(),
      });

      // 3. Delete the friend request document
      const requestDocRef = doc(
        db,
        "users",
        currentUser.uid,
        "friendRequests",
        request.id
      );
      await deleteDoc(requestDocRef);

      Alert.alert(
        "Connected!",
        `You and ${request.fromName || request.fromEmail} are now connected.`
      );
    } catch (err) {
      console.error("Error accepting request:", err);
      Alert.alert("Error", "Could not accept request. Please try again.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Decline Request Logic
  const handleDeclineRequest = async (requestId: string) => {
    if (!currentUser) return;
    setActionLoadingId(requestId);

    try {
      const requestDocRef = doc(
        db,
        "users",
        currentUser.uid,
        "friendRequests",
        requestId
      );
      await deleteDoc(requestDocRef);
    } catch (err) {
      console.error("Error declining request:", err);
      Alert.alert("Error", "Could not decline request.");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1115" />
      <View style={styles.container}>
        {/* Header Bar */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View style={styles.amberBar} />
            <Text style={styles.headerTitle}>Requests & Notifications</Text>
          </View>
          <Pressable onPress={() => router.back()} style={styles.closeBtn}>
            <FontAwesome name="times" size={16} color="#a1a1aa" />
          </Pressable>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <Pressable
            style={[
              styles.tabBtn,
              activeTab === "incoming" && styles.activeTabBtn,
            ]}
            onPress={() => setActiveTab("incoming")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "incoming" && styles.activeTabText,
              ]}
            >
              Requests ({incomingRequests.length})
            </Text>
          </Pressable>
        </View>

        {/* Content Section */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#f59e0b" />
          </View>
        ) : incomingRequests.length === 0 ? (
          <View style={styles.centerContainer}>
            <View style={styles.emptyIconCircle}>
              <MaterialCommunityIcons
                name="bell-outline"
                size={32}
                color="#71717a"
              />
            </View>
            <Text style={styles.emptyTitle}>All Caught Up</Text>
            <Text style={styles.emptySubtitle}>
              You have no pending friend requests right now.
            </Text>
          </View>
        ) : (
          <FlatList
            data={incomingRequests}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.requestCard}>
                <View style={styles.avatarCircle}>
                  <MaterialCommunityIcons
                    name="chef-hat"
                    size={20}
                    color="#f59e0b"
                  />
                </View>

                <View style={styles.infoWrapper}>
                  <Text style={styles.chefName}>
                    {item.fromName || "Chef"}
                  </Text>
                  <Text style={styles.chefEmail}>{item.fromEmail}</Text>
                  <Text style={styles.requestTime}>Wants to connect with you</Text>
                </View>

                {actionLoadingId === item.id ? (
                  <ActivityIndicator size="small" color="#f59e0b" />
                ) : (
                  <View style={styles.actionButtons}>
                    <Pressable
                      style={styles.acceptBtn}
                      onPress={() => handleAcceptRequest(item)}
                    >
                      <FontAwesome name="check" size={14} color="#0f1115" />
                    </Pressable>
                    <Pressable
                      style={styles.declineBtn}
                      onPress={() => handleDeclineRequest(item.id)}
                    >
                      <FontAwesome name="times" size={14} color="#ef4444" />
                    </Pressable>
                  </View>
                )}
              </View>
            )}
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
    letterSpacing: -0.3,
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
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#181b20",
    borderRadius: 10,
    padding: 4,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  activeTabBtn: {
    backgroundColor: "#27272a",
  },
  tabText: {
    color: "#a1a1aa",
    fontSize: 13,
    fontWeight: "600",
  },
  activeTabText: {
    color: "#f59e0b",
    fontWeight: "700",
  },
  listContent: {
    paddingBottom: 24,
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
  requestCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#181b20",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#0f1115",
    borderWidth: 1,
    borderColor: "#27272a",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoWrapper: {
    flex: 1,
  },
  chefName: {
    color: "#f4f4f5",
    fontSize: 15,
    fontWeight: "700",
  },
  chefEmail: {
    color: "#a1a1aa",
    fontSize: 12,
  },
  requestTime: {
    color: "#f59e0b",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  acceptBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f59e0b",
    justifyContent: "center",
    alignItems: "center",
  },
  declineBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: "#ef4444",
    justifyContent: "center",
    alignItems: "center",
  },
});