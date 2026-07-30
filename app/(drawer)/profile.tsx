import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  SafeAreaView,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  FlatList,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";
import { getAuth } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../../lib/firebase";

interface FriendUser {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
}

interface FriendRequest {
  id: string;
  fromUid: string;
  fromEmail: string;
  fromName?: string;
  status: "pending" | "accepted";
}

export default function ProfileModal() {
// Force-sync user profile to Firestore so they are searchable
useEffect(() => {
  if (!currentUser || !currentUser.email) return;

  const syncProfile = async () => {
    try {
      const userDocRef = doc(db, "users", currentUser.uid);
      await setDoc(
        userDocRef,
        {
          uid: currentUser.uid,
          email: currentUser.email.trim().toLowerCase(),
          displayName: currentUser.displayName || "Chef",
          photoURL: currentUser.photoURL || "",
          updatedAt: new Date().toISOString(),
        },
        { merge: true } // Preserves existing subcollections/fields while writing missing email
      );
      console.log("Successfully synced profile for:", currentUser.email);
    } catch (err) {
      console.error("Error auto-syncing profile:", err);
    }
  };

  syncProfile();
}, [currentUser]);
  
  const router = useRouter();
  const auth = getAuth();
  const currentUser = auth.currentUser;

  // Search & Modal State
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchEmail, setSearchEmail] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [foundUser, setFoundUser] = useState<FriendUser | null>(null);

  // Social Lists State
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [loadingSocial, setLoadingSocial] = useState(true);

  // Listen to current user's friends and requests
  useEffect(() => {
    if (!currentUser) return;

    // 1. Listen for Incoming Friend Requests
    const reqRef = collection(db, "users", currentUser.uid, "friendRequests");
    const unsubscribeReqs = onSnapshot(reqRef, (snapshot) => {
      const reqs: FriendRequest[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as FriendRequest[];
      setFriendRequests(reqs);
    });

    // 2. Listen for Friends List
    const friendsRef = collection(db, "users", currentUser.uid, "friends");
    const unsubscribeFriends = onSnapshot(friendsRef, (snapshot) => {
      const friendsList: FriendUser[] = snapshot.docs.map((d) => ({
        uid: d.id,
        ...d.data(),
      })) as FriendUser[];
      setFriends(friendsList);
      setLoadingSocial(false);
    });

    return () => {
      unsubscribeReqs();
      unsubscribeFriends();
    };
  }, [currentUser]);

  // Search user by email
// Search user by email
  const handleSearchUser = async () => {
    if (!searchEmail.trim()) {
      Alert.alert("Error", "Please enter an email address.");
      return;
    }

    if (searchEmail.trim().toLowerCase() === currentUser?.email?.toLowerCase()) {
      Alert.alert("Notice", "You cannot send a friend request to yourself.");
      return;
    }

    setSearchLoading(true);
    setFoundUser(null);

    try {
      // --- DEBUG CHECK ---
      // Fetch all docs to see if the users collection has data
      const usersRef = collection(db, "users");
      const allDocs = await getDocs(usersRef);
      console.log("All users in DB:", allDocs.docs.map((d) => d.data()));
      // --------------------

      const q = query(
        usersRef,
        where("email", "==", searchEmail.trim().toLowerCase())
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        Alert.alert("Not Found", "No chef found with that email address.");
      } else {
        const userDoc = querySnapshot.docs[0];
        setFoundUser({
          uid: userDoc.id,
          ...userDoc.data(),
        } as FriendUser);
      }
    } catch (err) {
      console.error("Error searching user:", err);
      Alert.alert("Error", `Failed to search: ${err instanceof Error ? err.message : err}`);
    } finally {
      setSearchLoading(false);
    }
  };

  // Send friend request to target chef
  const handleSendRequest = async () => {
    if (!currentUser || !foundUser) return;

    try {
      // Document path: /users/{targetUid}/friendRequests/{currentUserUid}
      const targetReqRef = doc(
        db,
        "users",
        foundUser.uid,
        "friendRequests",
        currentUser.uid
      );

      await setDoc(targetReqRef, {
        fromUid: currentUser.uid,
        fromEmail: currentUser.email || "",
        fromName: currentUser.displayName || "Chef",
        status: "pending",
        createdAt: new Date().toISOString(),
      });

      Alert.alert("Success", `Friend request sent to ${foundUser.email}`);
      setIsSearchVisible(false);
      setSearchEmail("");
      setFoundUser(null);
    } catch (err) {
      console.error("Error sending request:", err);
      Alert.alert("Error", "Could not send friend request.");
    }
  };

  // Accept incoming friend request
  const handleAcceptRequest = async (request: FriendRequest) => {
    if (!currentUser) return;

    try {
      // Add to my friends list
      const myFriendRef = doc(db, "users", currentUser.uid, "friends", request.fromUid);
      await setDoc(myFriendRef, {
        uid: request.fromUid,
        email: request.fromEmail,
        displayName: request.fromName || "Chef",
      });

      // Add to sender's friends list
      const targetFriendRef = doc(db, "users", request.fromUid, "friends", currentUser.uid);
      await setDoc(targetFriendRef, {
        uid: currentUser.uid,
        email: currentUser.email || "",
        displayName: currentUser.displayName || "Chef",
      });

      // Delete request document
      const reqRef = doc(db, "users", currentUser.uid, "friendRequests", request.id);
      await deleteDoc(reqRef);

      Alert.alert("Connected!", "You are now connected with this chef.");
    } catch (err) {
      console.error("Error accepting request:", err);
      Alert.alert("Error", "Failed to accept friend request.");
    }
  };

  // Decline friend request
  const handleDeclineRequest = async (requestId: string) => {
    if (!currentUser) return;
    try {
      const reqRef = doc(db, "users", currentUser.uid, "friendRequests", requestId);
      await deleteDoc(reqRef);
    } catch (err) {
      console.error("Error declining request:", err);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1115" />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Close Button */}
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <FontAwesome name="times" size={18} color="#a1a1aa" />
        </Pressable>

        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarWrapper}>
            <Image
              source={{
                uri:
                  currentUser?.photoURL ||
                  "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?q=80&w=200",
              }}
              style={styles.avatar}
            />
          </View>
          <Text style={styles.name}>
            {currentUser?.displayName || "Chef Josh"}
          </Text>
          <Text style={styles.role}>Head Chef & Culinary Director</Text>
        </View>

        {/* Action: Find a Chef */}
        <Pressable
          style={styles.findChefBtn}
          onPress={() => setIsSearchVisible(true)}
        >
          <FontAwesome name="user-plus" size={16} color="#0f1115" />
          <Text style={styles.findChefBtnText}>Friend a Chef</Text>
        </Pressable>

        {/* Stats Section */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>24</Text>
            <Text style={styles.statLabel}>Recipes</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{friends.length}</Text>
            <Text style={styles.statLabel}>Friends</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNum}>18</Text>
            <Text style={styles.statLabel}>Prep Lists</Text>
          </View>
        </View>

        {/* Incoming Requests Section */}
        {friendRequests.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.amberAccentBar} />
              <Text style={styles.sectionTitle}>Friend Requests</Text>
            </View>
            {friendRequests.map((req) => (
              <View key={req.id} style={styles.requestCard}>
                <View style={styles.requestInfo}>
                  <Text style={styles.requestName}>{req.fromName}</Text>
                  <Text style={styles.requestEmail}>{req.fromEmail}</Text>
                </View>
                <View style={styles.requestActions}>
                  <Pressable
                    style={styles.acceptBtn}
                    onPress={() => handleAcceptRequest(req)}
                  >
                    <FontAwesome name="check" size={12} color="#0f1115" />
                  </Pressable>
                  <Pressable
                    style={styles.declineBtn}
                    onPress={() => handleDeclineRequest(req.id)}
                  >
                    <FontAwesome name="times" size={12} color="#ef4444" />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Friends List Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.amberAccentBar} />
            <Text style={styles.sectionTitle}>
              Culinary Network ({friends.length})
            </Text>
          </View>

          {loadingSocial ? (
            <ActivityIndicator size="small" color="#f59e0b" style={{ marginVertical: 12 }} />
          ) : friends.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                No friends added yet. Tap "Find a Chef" above to connect with peers!
              </Text>
            </View>
          ) : (
            <View style={styles.infoCard}>
              {friends.map((friend) => (
                <View key={friend.uid} style={styles.friendRow}>
                  <View style={styles.iconCircle}>
                    <MaterialCommunityIcons name="chef-hat" size={16} color="#f59e0b" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.friendName}>
                      {friend.displayName || "Chef"}
                    </Text>
                    <Text style={styles.friendEmail}>{friend.email}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.amberAccentBar} />
            <Text style={styles.sectionTitle}>Preferences</Text>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.iconCircle}>
                <FontAwesome name="cutlery" size={14} color="#f59e0b" />
              </View>
              <Text style={styles.infoText}>
                Cuisine Focus: Modern American & Italian
              </Text>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.iconCircle}>
                <FontAwesome name="map-marker" size={14} color="#f59e0b" />
              </View>
              <Text style={styles.infoText}>San Diego, CA</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* SEARCH CHEF MODAL */}
      <Modal visible={isSearchVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Find a Chef</Text>
              <Pressable onPress={() => setIsSearchVisible(false)}>
                <FontAwesome name="times" size={18} color="#a1a1aa" />
              </Pressable>
            </View>

            <Text style={styles.modalSubtitle}>
              Search for culinary colleagues by their account email address.
            </Text>

            <View style={styles.searchInputWrapper}>
              <FontAwesome name="search" size={14} color="#71717a" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Enter chef's email address..."
                placeholderTextColor="#71717a"
                value={searchEmail}
                onChangeText={setSearchEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <Pressable
              style={styles.searchSubmitBtn}
              onPress={handleSearchUser}
              disabled={searchLoading}
            >
              {searchLoading ? (
                <ActivityIndicator size="small" color="#0f1115" />
              ) : (
                <Text style={styles.searchSubmitBtnText}>Search User</Text>
              )}
            </Pressable>

            {/* Found User Result */}
            {foundUser && (
              <View style={styles.foundUserCard}>
                <View style={styles.iconCircle}>
                  <FontAwesome name="user" size={16} color="#f59e0b" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.foundUserName}>
                    {foundUser.displayName || "Chef"}
                  </Text>
                  <Text style={styles.foundUserEmail}>{foundUser.email}</Text>
                </View>
                <Pressable style={styles.addFriendBtn} onPress={handleSendRequest}>
                  <Text style={styles.addFriendBtnText}>Send Request</Text>
                </Pressable>
              </View>
            )}
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
  container: {
    flex: 1,
    backgroundColor: "#0f1115",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  closeBtn: {
    alignSelf: "flex-end",
    padding: 8,
    backgroundColor: "#181b20",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  profileHeader: {
    alignItems: "center",
    marginTop: 4,
    marginBottom: 16,
  },
  avatarWrapper: {
    padding: 3,
    borderRadius: 52,
    borderWidth: 2,
    borderColor: "#f59e0b",
    marginBottom: 12,
    backgroundColor: "#181b20",
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  name: {
    fontSize: 22,
    fontWeight: "800",
    color: "#f4f4f5",
    letterSpacing: -0.4,
  },
  role: {
    fontSize: 13,
    fontWeight: "600",
    color: "#a1a1aa",
    marginTop: 2,
  },
  findChefBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f59e0b",
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },
  findChefBtnText: {
    color: "#0f1115",
    fontSize: 14,
    fontWeight: "700",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#181b20",
    paddingVertical: 18,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#27272a",
    marginBottom: 24,
  },
  statBox: {
    alignItems: "center",
    flex: 1,
  },
  statNum: {
    fontSize: 20,
    fontWeight: "800",
    color: "#f59e0b",
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#a1a1aa",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#27272a",
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  amberAccentBar: {
    width: 4,
    height: 16,
    backgroundColor: "#f59e0b",
    borderRadius: 2,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f4f4f5",
    letterSpacing: 0.2,
  },
  infoCard: {
    backgroundColor: "#181b20",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#0f1115",
    borderWidth: 1,
    borderColor: "#27272a",
    justifyContent: "center",
    alignItems: "center",
  },
  infoText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#e4e4e7",
    flex: 1,
  },
  requestCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#181b20",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#27272a",
    marginBottom: 8,
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    color: "#f4f4f5",
    fontSize: 14,
    fontWeight: "700",
  },
  requestEmail: {
    color: "#a1a1aa",
    fontSize: 12,
  },
  requestActions: {
    flexDirection: "row",
    gap: 8,
  },
  acceptBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f59e0b",
    justifyContent: "center",
    alignItems: "center",
  },
  declineBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: "#ef4444",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyCard: {
    backgroundColor: "#181b20",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#27272a",
  },
  emptyText: {
    color: "#71717a",
    fontSize: 13,
    textAlign: "center",
  },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  friendName: {
    color: "#f4f4f5",
    fontSize: 14,
    fontWeight: "700",
  },
  friendEmail: {
    color: "#a1a1aa",
    fontSize: 12,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    padding: 20,
  },
  modalContainer: {
    backgroundColor: "#181b20",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#f4f4f5",
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#a1a1aa",
    marginBottom: 16,
  },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0f1115",
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#27272a",
    height: 44,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: "#f4f4f5",
    fontSize: 14,
  },
  searchSubmitBtn: {
    backgroundColor: "#f59e0b",
    height: 42,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  searchSubmitBtnText: {
    color: "#0f1115",
    fontSize: 14,
    fontWeight: "700",
  },
  foundUserCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0f1115",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#27272a",
    marginTop: 16,
    gap: 10,
  },
  foundUserName: {
    color: "#f4f4f5",
    fontSize: 14,
    fontWeight: "700",
  },
  foundUserEmail: {
    color: "#a1a1aa",
    fontSize: 12,
  },
  addFriendBtn: {
    backgroundColor: "#27272a",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addFriendBtnText: {
    color: "#f59e0b",
    fontSize: 12,
    fontWeight: "700",
  },
});