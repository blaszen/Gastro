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
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";
import { getAuth, updateProfile } from "firebase/auth";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  orderBy,
} from "firebase/firestore";
import * as ImagePicker from "expo-image-picker";
import { db } from "../../lib/firebase";
import ScreenHeader from "../../components/ScreenHeader";
import { uploadImageAsync, isRemoteUrl } from "../../lib/uploadImage";
import RecipeImage from "../../components/RecipeImage";
import { themedStyles, tc, statusBarStyle, useThemeMode } from "../../lib/theme";

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
  useThemeMode();
  const router = useRouter();
  const auth = getAuth();
  const currentUser = auth.currentUser;

  // Local state for immediate UI feedback on photo change
  const [photoURL, setPhotoURL] = useState<string>(currentUser?.photoURL || "");

  // Profile details & activity stats
  const [profile, setProfile] = useState<{
    headline?: string;
    bio?: string;
    cuisines?: string;
    location?: string;
  }>({});
  const [myRecipes, setMyRecipes] = useState<any[]>([]);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [editVisible, setEditVisible] = useState(false);
  const [draft, setDraft] = useState({ displayName: "", headline: "", bio: "", cuisines: "", location: "" });
  const [savingProfile, setSavingProfile] = useState(false);

  const memberSince = currentUser?.metadata?.creationTime
    ? new Date(currentUser.metadata.creationTime).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      })
    : null;
  const publicCount = myRecipes.filter((r) => r.isPublic).length;

  useEffect(() => {
    if (!currentUser) return;
    const unsubProfile = onSnapshot(
      doc(db, "users", currentUser.uid),
      (snap) => setProfile((snap.data() as any) || {}),
      () => {}
    );
    const unsubRecipes = onSnapshot(
      query(
        collection(db, "recipes"),
        where("userId", "==", currentUser.uid),
        orderBy("createdAt", "desc")
      ),
      (snap) => setMyRecipes(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => {}
    );
    const unsubFavs = onSnapshot(
      collection(db, "users", currentUser.uid, "favorites"),
      (snap) => setFavoritesCount(snap.size),
      () => {}
    );
    return () => {
      unsubProfile();
      unsubRecipes();
      unsubFavs();
    };
  }, [currentUser?.uid]);

  const openEditProfile = () => {
    setDraft({
      displayName: currentUser?.displayName || "",
      headline: profile.headline || "",
      bio: profile.bio || "",
      cuisines: profile.cuisines || "",
      location: profile.location || "",
    });
    setEditVisible(true);
  };

  const saveProfile = async () => {
    if (!currentUser) return;
    const name = draft.displayName.trim();
    if (!name) {
      Alert.alert("Name required", "Please enter a display name.");
      return;
    }
    setSavingProfile(true);
    try {
      if (name !== currentUser.displayName) {
        await updateProfile(currentUser, { displayName: name });
      }
      await setDoc(
        doc(db, "users", currentUser.uid),
        {
          uid: currentUser.uid,
          displayName: name,
          headline: draft.headline.trim().slice(0, 60),
          bio: draft.bio.trim().slice(0, 300),
          cuisines: draft.cuisines.trim().slice(0, 80),
          location: draft.location.trim().slice(0, 60),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      setEditVisible(false);
    } catch (err) {
      console.error("Profile save failed:", err);
      Alert.alert("Error", "Couldn't save your profile. Please try again.");
    } finally {
      setSavingProfile(false);
    }
  };
  const [updatingPhoto, setUpdatingPhoto] = useState(false);

  // Search & Modal State
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchEmail, setSearchEmail] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [foundUser, setFoundUser] = useState<FriendUser | null>(null);

  // Social Lists State
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [loadingSocial, setLoadingSocial] = useState(true);

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
            photoURL: photoURL,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (err) {
        console.error("Error auto-syncing profile:", err);
      }
    };

    syncProfile();
  }, [currentUser, photoURL]);

  // Handle Image Selection & Upload
  const handleEditProfilePicture = async () => {
    if (!currentUser) return;

    // Request permissions
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(
        "Permission Denied",
        "Permission to access camera roll is required to update your profile photo."
      );
      return;
    }

    // Pick Image
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (pickerResult.canceled || !pickerResult.assets[0].uri) {
      return;
    }

    const selectedUri = pickerResult.assets[0].uri;
    setUpdatingPhoto(true);

    try {
      // 1. Upload to Firebase Storage so the photo is visible on every device
      const downloadUrl = await uploadImageAsync(
        selectedUri,
        `users/${currentUser.uid}/avatar.jpg`
      );

      // 2. Update Firebase Auth Profile
      await updateProfile(currentUser, {
        photoURL: downloadUrl,
      });

      // 3. Update Firestore User Document
      const userDocRef = doc(db, "users", currentUser.uid);
      await setDoc(
        userDocRef,
        {
          photoURL: downloadUrl,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // 4. Update Local UI State
      setPhotoURL(downloadUrl);
      Alert.alert("Success", "Profile picture updated successfully!");
    } catch (err) {
      console.error("Error updating profile picture:", err);
      Alert.alert(
        "Error",
        (err as any)?.message?.includes("too large")
          ? (err as any).message
          : "Failed to update profile picture. Please try again."
      );
    } finally {
      setUpdatingPhoto(false);
    }
  };

  // Listen to current user's friends and requests
  useEffect(() => {
    if (!currentUser) return;

    const reqRef = collection(db, "users", currentUser.uid, "friendRequests");
    const unsubscribeReqs = onSnapshot(reqRef, (snapshot) => {
      const reqs: FriendRequest[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as FriendRequest[];
      setFriendRequests(reqs);
    });

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
      const usersRef = collection(db, "users");
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
      Alert.alert(
        "Error",
        `Failed to search: ${err instanceof Error ? err.message : err}`
      );
    } finally {
      setSearchLoading(false);
    }
  };

  // Send friend request
  const handleSendRequest = async () => {
    if (!currentUser || !foundUser) return;

    try {
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

  // Accept friend request
  const handleAcceptRequest = async (request: FriendRequest) => {
    if (!currentUser) return;

    try {
      const myFriendRef = doc(db, "users", currentUser.uid, "friends", request.fromUid);
      await setDoc(myFriendRef, {
        uid: request.fromUid,
        email: request.fromEmail,
        displayName: request.fromName || "Chef",
      });

      const targetFriendRef = doc(db, "users", request.fromUid, "friends", currentUser.uid);
      await setDoc(targetFriendRef, {
        uid: currentUser.uid,
        email: currentUser.email || "",
        displayName: currentUser.displayName || "Chef",
      });

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
      <StatusBar barStyle={statusBarStyle()} backgroundColor={tc("#0f1115")} />
      <ScreenHeader title="My Profile" />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <Pressable
            style={styles.avatarWrapper}
            onPress={handleEditProfilePicture}
            disabled={updatingPhoto}
          >
            {isRemoteUrl(photoURL) ? (
              <Image source={{ uri: photoURL }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitial}>
                  {(currentUser?.displayName || currentUser?.email || "C").charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            
            {/* Camera Overlay Badge */}
            <View style={styles.cameraBadge}>
              {updatingPhoto ? (
                <ActivityIndicator size="small" color={tc("#0f1115")} />
              ) : (
                <FontAwesome name="camera" size={12} color={tc("#0f1115")} />
              )}
            </View>
          </Pressable>

          <Text style={styles.name}>
            {currentUser?.displayName || "Add your name"}
          </Text>
          <Text style={styles.role}>{profile.headline || "Home Cook"}</Text>
          {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
        </View>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <Pressable style={[styles.findChefBtn, { flex: 1 }]} onPress={() => setIsSearchVisible(true)}>
            <FontAwesome name="user-plus" size={16} color={tc("#0f1115")} />
            <Text style={styles.findChefBtnText}>Friend a Chef</Text>
          </Pressable>
          <Pressable style={styles.editProfileBtn} onPress={openEditProfile}>
            <FontAwesome name="pencil" size={14} color={tc("#f4f4f5")} />
            <Text style={styles.editProfileText}>Edit</Text>
          </Pressable>
        </View>

        {/* Stats Section */}
        <View style={styles.statsRow}>
          <Pressable style={styles.statBox} onPress={() => router.push("/recipes" as any)}>
            <Text style={styles.statNum}>{myRecipes.length}</Text>
            <Text style={styles.statLabel}>Recipes</Text>
          </Pressable>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{publicCount}</Text>
            <Text style={styles.statLabel}>Shared</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{friends.length}</Text>
            <Text style={styles.statLabel}>Friends</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{favoritesCount}</Text>
            <Text style={styles.statLabel}>Favorites</Text>
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
                    <FontAwesome name="check" size={12} color={tc("#0f1115")} />
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
                No friends added yet. Tap "Friend a Chef" above to connect with peers!
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

        {/* Recent recipes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.amberAccentBar} />
            <Text style={styles.sectionTitle}>Recent Recipes</Text>
          </View>
          {myRecipes.length === 0 ? (
            <Pressable style={styles.emptyCard} onPress={() => router.push("/(drawer)/(tabs)/three" as any)}>
              <Text style={styles.emptyText}>
                You haven't created a recipe yet. Tap here to make your first one!
              </Text>
            </Pressable>
          ) : (
            <View style={styles.infoCard}>
              {myRecipes.slice(0, 3).map((r) => (
                <Pressable
                  key={r.id}
                  style={styles.friendRow}
                  onPress={() => router.push(`/recipe/${r.id}` as any)}
                >
                  <RecipeImage uri={r.imageUrl} style={styles.recipeThumb} iconSize={14} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.friendName} numberOfLines={1}>
                      {r.title || "Untitled recipe"}
                    </Text>
                    <Text style={styles.friendEmail}>{r.isPublic ? "Public" : "Private"}</Text>
                  </View>
                  <FontAwesome name="chevron-right" size={12} color={tc("#52525b")} />
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* About section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.amberAccentBar} />
            <Text style={styles.sectionTitle}>About</Text>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.iconCircle}>
                <FontAwesome name="cutlery" size={14} color="#f59e0b" />
              </View>
              <Text style={styles.infoText}>
                {profile.cuisines ? `Cuisine focus: ${profile.cuisines}` : "Add your favorite cuisines"}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.iconCircle}>
                <FontAwesome name="map-marker" size={14} color="#f59e0b" />
              </View>
              <Text style={styles.infoText}>{profile.location || "Add your location"}</Text>
            </View>
            {memberSince ? (
              <View style={styles.infoRow}>
                <View style={styles.iconCircle}>
                  <FontAwesome name="calendar" size={13} color="#f59e0b" />
                </View>
                <Text style={styles.infoText}>Member since {memberSince}</Text>
              </View>
            ) : null}
            <View style={styles.infoRow}>
              <View style={styles.iconCircle}>
                <FontAwesome name="envelope-o" size={13} color="#f59e0b" />
              </View>
              <Text style={styles.infoText}>{currentUser?.email}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* SEARCH CHEF MODAL */}
      <Modal visible={isSearchVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setIsSearchVisible(false)} hitSlop={10} accessibilityLabel="Close">
                <FontAwesome name="times" size={18} color={tc("#a1a1aa")} />
              </Pressable>
              <Text style={styles.modalTitle}>Find a Chef</Text>
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
                <ActivityIndicator size="small" color={tc("#0f1115")} />
              ) : (
                <Text style={styles.searchSubmitBtnText}>Search User</Text>
              )}
            </Pressable>

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

      {/* EDIT PROFILE MODAL */}
      <Modal visible={editVisible} animationType="slide" transparent onRequestClose={() => setEditVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setEditVisible(false)} hitSlop={10} accessibilityLabel="Close">
                <FontAwesome name="times" size={18} color={tc("#a1a1aa")} />
              </Pressable>
              <Text style={styles.modalTitle}>Edit Profile</Text>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 420 }}>
              {([
                ["displayName", "Display name", "e.g. Josh", 40, false],
                ["headline", "Headline", "e.g. Sous Chef, Home Baker", 60, false],
                ["bio", "Bio", "A little about your cooking", 300, true],
                ["cuisines", "Favorite cuisines", "e.g. Mexican, Italian", 80, false],
                ["location", "Location", "e.g. San Diego, CA", 60, false],
              ] as const).map(([key, label, placeholder, max, multiline]) => (
                <View key={key} style={{ marginBottom: 12 }}>
                  <Text style={styles.editLabel}>{label}</Text>
                  <TextInput
                    style={[styles.editInput, multiline && styles.editInputMulti]}
                    value={(draft as any)[key]}
                    onChangeText={(t) => setDraft((d) => ({ ...d, [key]: t }))}
                    placeholder={placeholder}
                    placeholderTextColor="#71717a"
                    maxLength={max}
                    multiline={multiline}
                    textAlignVertical={multiline ? "top" : "center"}
                  />
                </View>
              ))}
            </ScrollView>
            <Pressable
              style={[styles.searchSubmitBtn, savingProfile && { opacity: 0.6 }]}
              onPress={saveProfile}
              disabled={savingProfile}
            >
              {savingProfile ? (
                <ActivityIndicator size="small" color={tc("#0f1115")} />
              ) : (
                <Text style={styles.searchSubmitBtnText}>Save Profile</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = themedStyles({
  avatarFallback: { backgroundColor: "#27272a", alignItems: "center", justifyContent: "center" },
  avatarInitial: { color: "#f59e0b", fontSize: 34, fontWeight: "800" },
  bio: { color: "#a1a1aa", fontSize: 14, textAlign: "center", marginTop: 8, lineHeight: 20, paddingHorizontal: 12 },
  actionsRow: { flexDirection: "row", gap: 10, marginBottom: 4 },
  editProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#27272a",
    backgroundColor: "#181b20",
    marginBottom: 20,
  },
  editProfileText: { color: "#f4f4f5", fontWeight: "700", fontSize: 14 },
  recipeThumb: { width: 40, height: 40, borderRadius: 10 },
  editLabel: { color: "#a1a1aa", fontSize: 12, fontWeight: "700", marginBottom: 6 },
  editInput: {
    backgroundColor: "#0f1115",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 46,
    color: "#f4f4f5",
    fontSize: 15,
  },
  editInputMulti: { minHeight: 90, paddingTop: 12 },
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
    position: "relative",
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  cameraBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "#f59e0b",
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#0f1115",
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