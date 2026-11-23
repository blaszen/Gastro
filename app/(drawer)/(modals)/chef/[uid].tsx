import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../../../../lib/firebase";
import { useChefRecipes, PublicProfile } from "../../../../lib/community";
import { blockUser } from "../../../../lib/moderation";
import {
  acceptFriendRequest,
  cancelFriendRequest,
  openChat as openChatThread,
  sendFriendRequest,
  useIncomingRequests,
  useSentRequestIds,
} from "../../../../lib/social";
import ScreenHeader from "../../../../components/ScreenHeader";
import RecipeImage from "../../../../components/RecipeImage";
import { themedStyles, tc, statusBarStyle, useThemeMode } from "../../../../lib/theme";

const GRID_GAP = 12;
const CARD_WIDTH = (Dimensions.get("window").width - 40 - GRID_GAP) / 2;

export default function ChefProfileScreen() {
  useThemeMode();
  const router = useRouter();
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const me = auth.currentUser;
  const isMe = me?.uid === uid;

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isFriend, setIsFriend] = useState(false);
  const [busy, setBusy] = useState(false);
  const sentIds = useSentRequestIds(isMe ? null : me?.uid);
  const incoming = useIncomingRequests(isMe ? null : me?.uid);
  const requestSent = !!uid && sentIds.has(uid);
  const incomingReq = incoming.find((r) => r.fromUid === uid);
  const { recipes, loading: loadingRecipes } = useChefRecipes(uid);

  const favoritesReceived = useMemo(
    () => recipes.reduce((sum, r) => sum + r.favoriteCount, 0),
    [recipes]
  );
  const name = profile?.displayName || recipes[0]?.createdBy || "Chef";

  useEffect(() => {
    if (!uid) return;
    getDoc(doc(db, "users", uid))
      .then((s) => setProfile(s.exists() ? ({ uid, ...(s.data() as any) } as PublicProfile) : { uid }))
      .catch(() => setProfile({ uid }))
      .finally(() => setLoadingProfile(false));
  }, [uid]);

  useEffect(() => {
    if (!uid || !me || isMe) return;
    return onSnapshot(
      doc(db, "users", me.uid, "friends", uid),
      (s) => setIsFriend(s.exists()),
      () => {}
    );
  }, [uid, me?.uid]);

  const act = async (fn: () => Promise<any>, msg: string) => {
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      console.error(msg, err);
      Alert.alert("Error", msg);
    } finally {
      setBusy(false);
    }
  };

  const sendRequest = () =>
    me && uid && act(() => sendFriendRequest(me, { uid, displayName: name }), "Couldn't send the request. Please try again.");

  const cancelRequest = () =>
    me && uid &&
    Alert.alert("Cancel friend request?", undefined, [
      { text: "Keep", style: "cancel" },
      { text: "Cancel Request", style: "destructive", onPress: () => act(() => cancelFriendRequest(me, uid), "Couldn't cancel the request.") },
    ]);

  const acceptRequest = () =>
    me && incomingReq && act(() => acceptFriendRequest(me, incomingReq), "Couldn't accept the request.");

  const openChat = () =>
    me && uid &&
    act(async () => {
      const id = await openChatThread(me, { uid, displayName: name, email: profile?.email, photoURL: profile?.photoURL });
      router.push(`/chat/${id}` as any);
    }, "Couldn't open the chat. Please try again.");

  const confirmBlock = () => {
    if (!me || !uid) return;
    Alert.alert(`Block ${name}?`, "You won't see their recipes. You can unblock them in Settings.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Block",
        style: "destructive",
        onPress: async () => {
          try {
            await blockUser(me.uid, uid, name);
            router.back();
          } catch {
            Alert.alert("Error", "Couldn't block this chef.");
          }
        },
      },
    ]);
  };

  const photo = profile?.photoURL?.startsWith("http") ? profile.photoURL : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={statusBarStyle()} backgroundColor={tc("#0f1115")} />
      <ScreenHeader title={isMe ? "Your Public Profile" : "Chef"} />

      {loadingProfile ? (
        <ActivityIndicator color="#f59e0b" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Identity */}
          <View style={styles.hero}>
            <View style={styles.avatarRing}>
              {photo ? (
                <Image source={{ uri: photo }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarInitial}>{name.charAt(0).toUpperCase()}</Text>
                </View>
              )}
            </View>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.headline}>{profile?.headline || "Community Chef"}</Text>
            {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

            {(profile?.cuisines || profile?.location) && (
              <View style={styles.tagRow}>
                {profile?.cuisines ? (
                  <View style={styles.tag}>
                    <FontAwesome name="cutlery" size={11} color="#f59e0b" />
                    <Text style={styles.tagText}>{profile.cuisines}</Text>
                  </View>
                ) : null}
                {profile?.location ? (
                  <View style={styles.tag}>
                    <FontAwesome name="map-marker" size={12} color="#f59e0b" />
                    <Text style={styles.tagText}>{profile.location}</Text>
                  </View>
                ) : null}
              </View>
            )}
          </View>

          {/* Stats */}
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statNum}>{recipes.length}</Text>
              <Text style={styles.statLabel}>Recipes</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statNum}>{favoritesReceived}</Text>
              <Text style={styles.statLabel}>Favorites</Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            {isMe ? (
              <Pressable style={styles.primaryBtn} onPress={() => router.push("/profile" as any)}>
                <FontAwesome name="pencil" size={14} color={tc("#0f1115")} />
                <Text style={styles.primaryText}>Edit Profile</Text>
              </Pressable>
            ) : isFriend ? (
              <Pressable style={styles.primaryBtn} onPress={openChat} disabled={busy}>
                {busy ? (
                  <ActivityIndicator color={tc("#0f1115")} />
                ) : (
                  <>
                    <FontAwesome name="comment" size={14} color={tc("#0f1115")} />
                    <Text style={styles.primaryText}>Message</Text>
                  </>
                )}
              </Pressable>
            ) : incomingReq ? (
              <Pressable style={styles.primaryBtn} onPress={acceptRequest} disabled={busy}>
                {busy ? (
                  <ActivityIndicator color={tc("#0f1115")} />
                ) : (
                  <>
                    <FontAwesome name="check" size={14} color={tc("#0f1115")} />
                    <Text style={styles.primaryText}>Accept Friend Request</Text>
                  </>
                )}
              </Pressable>
            ) : (
              <Pressable
                style={[styles.primaryBtn, requestSent && styles.secondaryBtn]}
                onPress={requestSent ? cancelRequest : sendRequest}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color={requestSent ? "#f59e0b" : tc("#0f1115")} />
                ) : (
                  <>
                    <FontAwesome
                      name={requestSent ? "clock-o" : "user-plus"}
                      size={14}
                      color={requestSent ? "#f59e0b" : tc("#0f1115")}
                    />
                    <Text style={[styles.primaryText, requestSent && styles.secondaryText]}>
                      {requestSent ? "Requested" : "Add Friend"}
                    </Text>
                  </>
                )}
              </Pressable>
            )}
            {!isMe ? (
              <Pressable style={styles.iconBtn} onPress={confirmBlock} accessibilityLabel="Block chef">
                <FontAwesome name="ban" size={16} color="#ef4444" />
              </Pressable>
            ) : null}
          </View>

          {/* Recipes */}
          <View style={styles.sectionHeader}>
            <View style={styles.accentBar} />
            <Text style={styles.sectionTitle}>Recipes</Text>
          </View>

          {loadingRecipes ? (
            <ActivityIndicator color="#f59e0b" style={{ marginTop: 20 }} />
          ) : recipes.length === 0 ? (
            <Text style={styles.muted}>No public recipes yet.</Text>
          ) : (
            <View style={styles.grid}>
              {recipes.map((r) => (
                <Pressable
                  key={r.id}
                  style={styles.gridCard}
                  onPress={() => router.push(`/recipe/${r.id}` as any)}
                >
                  <RecipeImage uri={r.imageUrl} style={styles.gridImage} iconSize={18} />
                  <Text style={styles.gridTitle} numberOfLines={2}>
                    {r.title}
                  </Text>
                  <View style={styles.gridMeta}>
                    {r.prepTimeMinutes ? (
                      <Text style={styles.gridMetaText}>
                        <FontAwesome name="clock-o" size={11} /> {r.prepTimeMinutes}m
                      </Text>
                    ) : null}
                    {r.favoriteCount ? (
                      <Text style={styles.gridMetaText}>
                        <FontAwesome name="heart" size={10} color="#ef4444" /> {r.favoriteCount}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = themedStyles({
  safeArea: { flex: 1, backgroundColor: "#0f1115" },
  content: { paddingHorizontal: 20, paddingBottom: 48 },
  hero: { alignItems: "center", marginTop: 4 },
  avatarRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 3,
    borderColor: "#f59e0b",
    padding: 3,
    marginBottom: 14,
  },
  avatar: { width: "100%", height: "100%", borderRadius: 48 },
  avatarFallback: { backgroundColor: "#27272a", alignItems: "center", justifyContent: "center" },
  avatarInitial: { color: "#f59e0b", fontSize: 36, fontWeight: "900" },
  name: { color: "#f4f4f5", fontSize: 24, fontWeight: "900", letterSpacing: -0.5, textAlign: "center" },
  headline: { color: "#f59e0b", fontSize: 13, fontWeight: "700", marginTop: 4, letterSpacing: 0.3 },
  bio: { color: "#a1a1aa", fontSize: 14, lineHeight: 20, textAlign: "center", marginTop: 10, paddingHorizontal: 8 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 14 },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "#181b20",
    borderWidth: 1,
    borderColor: "#27272a",
  },
  tagText: { color: "#f4f4f5", fontSize: 12, fontWeight: "600" },

  stats: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: "#181b20",
    borderWidth: 1,
    borderColor: "#27272a",
  },
  stat: { flex: 1, alignItems: "center" },
  statNum: { color: "#f4f4f5", fontSize: 22, fontWeight: "900" },
  statLabel: { color: "#a1a1aa", fontSize: 12, fontWeight: "600", marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: "#27272a" },

  actions: { flexDirection: "row", gap: 10, marginTop: 16, marginBottom: 26 },
  primaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#f59e0b",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryText: { color: "#0f1115", fontWeight: "800", fontSize: 15 },
  secondaryBtn: { backgroundColor: "#181b20", borderWidth: 1, borderColor: "#27272a" },
  secondaryText: { color: "#f59e0b" },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#181b20",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },

  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  accentBar: { width: 4, height: 18, borderRadius: 2, backgroundColor: "#f59e0b" },
  sectionTitle: { color: "#f4f4f5", fontSize: 18, fontWeight: "800" },
  muted: { color: "#a1a1aa", fontSize: 14 },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: GRID_GAP },
  gridCard: {
    width: CARD_WIDTH,
    borderRadius: 16,
    backgroundColor: "#181b20",
    borderWidth: 1,
    borderColor: "#27272a",
    overflow: "hidden",
    paddingBottom: 10,
  },
  gridImage: { width: "100%", height: CARD_WIDTH * 0.8 },
  gridTitle: { color: "#f4f4f5", fontSize: 14, fontWeight: "700", marginTop: 8, paddingHorizontal: 10 },
  gridMeta: { flexDirection: "row", gap: 10, marginTop: 6, paddingHorizontal: 10 },
  gridMetaText: { color: "#a1a1aa", fontSize: 12 },
});
