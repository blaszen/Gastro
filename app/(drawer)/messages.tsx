import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  Image,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  TextInput,
  Alert,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { auth } from "../../lib/firebase";
import {
  ChatThread,
  ChefResult,
  Friend,
  acceptFriendRequest,
  cancelFriendRequest,
  declineFriendRequest,
  isUnread,
  openChat,
  removeFriend,
  searchChefs,
  sendFriendRequest,
  shortTime,
  useFriends,
  useIncomingRequests,
  useSentRequestIds,
  useThreads,
} from "../../lib/social";
import { useProfiles } from "../../lib/community";
import { useBlockedIds } from "../../lib/moderation";
import ScreenHeader from "../../components/ScreenHeader";
import { themedStyles, tc, statusBarStyle, useThemeMode } from "../../lib/theme";

type Tab = "chats" | "friends";

function Avatar({ name, photo, size = 48 }: { name?: string; photo?: string; size?: number }) {
  useThemeMode();
  if (photo?.startsWith("http")) {
    return <Image source={{ uri: photo }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View
      style={[
        styles.avatarFallback,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[styles.avatarInitial, { fontSize: size * 0.38 }]}>
        {(name || "C").charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

export default function MessagesScreen() {
  useThemeMode();
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const me = auth.currentUser;
  const uid = me?.uid;

  const [tab, setTab] = useState<Tab>(params.tab === "friends" ? "friends" : "chats");
  useEffect(() => {
    if (params.tab === "friends") setTab("friends");
  }, [params.tab]);

  const { threads, loading: threadsLoading } = useThreads(uid);
  const { friends, loading: friendsLoading } = useFriends(uid);
  const incoming = useIncomingRequests(uid);
  const sentIds = useSentRequestIds(uid);
  const blockedIds = useBlockedIds(uid);

  // Photos/names for everyone on screen come from their live profile docs.
  const otherIds = useMemo(() => {
    const ids = new Set<string>();
    threads.forEach((t) => t.participants.forEach((p) => p !== uid && ids.add(p)));
    friends.forEach((f) => ids.add(f.uid));
    incoming.forEach((r) => ids.add(r.fromUid));
    return [...ids].sort();
  }, [threads, friends, incoming, uid]);
  const profiles = useProfiles(otherIds);

  const friendIds = useMemo(() => new Set(friends.map((f) => f.uid)), [friends]);
  const visibleThreads = threads.filter((t) => {
    const other = t.participants.find((p) => p !== uid);
    return other && !blockedIds.has(other) && (t.lastMessage || t.updatedAt);
  });
  const unreadCount = uid ? visibleThreads.filter((t) => isUnread(t, uid)).length : 0;

  // Chef search
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<ChefResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    const t = term.trim();
    if (t.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        setResults((await searchChefs(t, uid)).filter((r) => !blockedIds.has(r.uid)));
      } catch (err) {
        console.error("Chef search failed:", err);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [term, uid]);

  const nameFor = (id: string, fallback?: string) =>
    profiles[id]?.displayName || fallback || "Chef";
  const photoFor = (id: string, fallback?: string) => profiles[id]?.photoURL || fallback || "";

  const startChat = async (other: { uid: string; displayName?: string; email?: string; photoURL?: string }) => {
    if (!me) return;
    setBusyId(other.uid);
    try {
      const id = await openChat(me, {
        uid: other.uid,
        displayName: nameFor(other.uid, other.displayName),
        photoURL: photoFor(other.uid, other.photoURL),
        email: other.email,
      });
      router.push(`/chat/${id}` as any);
    } catch (err) {
      console.error("Open chat failed:", err);
      Alert.alert("Error", "Couldn't open the chat. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const run = async (id: string, fn: () => Promise<any>, errorMsg: string) => {
    setBusyId(id);
    try {
      await fn();
    } catch (err) {
      console.error(errorMsg, err);
      Alert.alert("Error", errorMsg);
    } finally {
      setBusyId(null);
    }
  };

  const friendOptions = (f: Friend) => {
    if (!me) return;
    const name = nameFor(f.uid, f.displayName);
    Alert.alert(name, undefined, [
      { text: "View Profile", onPress: () => router.push(`/chef/${f.uid}` as any) },
      {
        text: "Remove Friend",
        style: "destructive",
        onPress: () =>
          Alert.alert(`Remove ${name}?`, "You can send a new request later.", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Remove",
              style: "destructive",
              onPress: () => run(f.uid, () => removeFriend(me, f.uid), "Couldn't remove friend."),
            },
          ]),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  // ---------------------------------------------------------------- chats
  const renderThread = ({ item }: { item: ChatThread }) => {
    const other = item.participants.find((p) => p !== uid)!;
    const data = item.participantData?.[other];
    const unread = !!uid && isUnread(item, uid);
    const name = nameFor(other, data?.displayName);
    return (
      <Pressable style={[styles.card, unread && styles.cardUnread]} onPress={() => router.push(`/chat/${item.id}` as any)}>
        <Avatar name={name} photo={photoFor(other, data?.photoURL)} />
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <Text style={[styles.name, unread && styles.nameUnread]} numberOfLines={1}>
              {name}
            </Text>
            <Text style={[styles.time, unread && styles.timeUnread]}>{shortTime(item.updatedAt)}</Text>
          </View>
          <Text style={[styles.preview, unread && styles.previewUnread]} numberOfLines={1}>
            {item.lastSenderId === uid ? "You: " : ""}
            {item.lastMessage || "Say hello 👋"}
          </Text>
        </View>
        {unread ? <View style={styles.unreadDot} /> : null}
      </Pressable>
    );
  };

  // ---------------------------------------------------------------- friends
  const relation = (id: string) =>
    friendIds.has(id) ? "friend" : sentIds.has(id) ? "sent" : incoming.some((r) => r.fromUid === id) ? "incoming" : "none";

  const ResultRow = ({ r }: { r: ChefResult }) => {
    const rel = relation(r.uid);
    return (
      <View style={styles.row}>
        <Pressable style={styles.rowMain} onPress={() => router.push(`/chef/${r.uid}` as any)}>
          <Avatar name={r.displayName} photo={r.photoURL} size={42} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>
              {r.displayName || "Chef"}
            </Text>
            <Text style={styles.sub} numberOfLines={1}>
              {r.headline || "Community Chef"}
            </Text>
          </View>
        </Pressable>
        {busyId === r.uid ? (
          <ActivityIndicator color="#f59e0b" />
        ) : rel === "friend" ? (
          <Pressable style={styles.smallBtn} onPress={() => startChat(r)}>
            <FontAwesome name="comment" size={12} color={tc("#0f1115")} />
            <Text style={styles.smallBtnText}>Message</Text>
          </Pressable>
        ) : rel === "sent" ? (
          <Pressable
            style={styles.ghostBtn}
            onPress={() => me && run(r.uid, () => cancelFriendRequest(me, r.uid), "Couldn't cancel request.")}
          >
            <Text style={styles.ghostBtnText}>Requested</Text>
          </Pressable>
        ) : rel === "incoming" ? (
          <Pressable
            style={styles.smallBtn}
            onPress={() => {
              const req = incoming.find((x) => x.fromUid === r.uid);
              if (me && req) run(r.uid, () => acceptFriendRequest(me, req), "Couldn't accept request.");
            }}
          >
            <Text style={styles.smallBtnText}>Accept</Text>
          </Pressable>
        ) : (
          <Pressable
            style={styles.smallBtn}
            onPress={() => me && run(r.uid, () => sendFriendRequest(me, r), "Couldn't send request.")}
          >
            <FontAwesome name="user-plus" size={12} color={tc("#0f1115")} />
            <Text style={styles.smallBtnText}>Add</Text>
          </Pressable>
        )}
      </View>
    );
  };

  const FriendsTab = (
    <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
      <View style={styles.searchBox}>
        <FontAwesome name="search" size={14} color={tc("#71717a")} />
        <TextInput
          style={styles.searchInput}
          placeholder="Find chefs by name or email"
          placeholderTextColor={tc("#71717a")}
          value={term}
          onChangeText={setTerm}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {searching ? <ActivityIndicator size="small" color="#f59e0b" /> : null}
        {term.length > 0 && !searching ? (
          <Pressable onPress={() => setTerm("")} hitSlop={10}>
            <FontAwesome name="times-circle" size={16} color={tc("#71717a")} />
          </Pressable>
        ) : null}
      </View>

      {term.trim().length >= 2 ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Results</Text>
          {!searching && results.length === 0 ? (
            <Text style={styles.muted}>
              No chefs found. Try their full email, or the start of their name.
            </Text>
          ) : (
            results.map((r) => <ResultRow key={r.uid} r={r} />)
          )}
        </View>
      ) : null}

      {incoming.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Friend Requests · {incoming.length}</Text>
          {incoming.map((req) => (
            <View key={req.id} style={styles.row}>
              <Pressable style={styles.rowMain} onPress={() => router.push(`/chef/${req.fromUid}` as any)}>
                <Avatar name={nameFor(req.fromUid, req.fromName)} photo={photoFor(req.fromUid)} size={42} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {nameFor(req.fromUid, req.fromName)}
                  </Text>
                  <Text style={styles.sub}>wants to connect</Text>
                </View>
              </Pressable>
              {busyId === req.fromUid ? (
                <ActivityIndicator color="#f59e0b" />
              ) : (
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Pressable
                    style={styles.iconBtn}
                    onPress={() => me && run(req.fromUid, () => declineFriendRequest(me, req.fromUid), "Couldn't decline request.")}
                    accessibilityLabel="Decline"
                  >
                    <FontAwesome name="times" size={14} color={tc("#a1a1aa")} />
                  </Pressable>
                  <Pressable
                    style={styles.smallBtn}
                    onPress={() => me && run(req.fromUid, () => acceptFriendRequest(me, req), "Couldn't accept request.")}
                  >
                    <Text style={styles.smallBtnText}>Accept</Text>
                  </Pressable>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Friends · {friends.length}</Text>
        {friendsLoading ? (
          <ActivityIndicator color="#f59e0b" style={{ marginTop: 12 }} />
        ) : friends.length === 0 ? (
          <View style={styles.emptyCard}>
            <FontAwesome name="users" size={22} color="#f59e0b" />
            <Text style={styles.emptyCardTitle}>Build your kitchen crew</Text>
            <Text style={styles.muted}>
              Search above, or tap a chef in Discover or the Community Feed and hit Add Friend.
            </Text>
          </View>
        ) : (
          friends
            .filter((f) => !blockedIds.has(f.uid))
            .sort((a, b) => nameFor(a.uid, a.displayName).localeCompare(nameFor(b.uid, b.displayName)))
            .map((f) => (
              <View key={f.uid} style={styles.row}>
                <Pressable style={styles.rowMain} onPress={() => router.push(`/chef/${f.uid}` as any)}>
                  <Avatar name={nameFor(f.uid, f.displayName)} photo={photoFor(f.uid, f.photoURL)} size={42} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name} numberOfLines={1}>
                      {nameFor(f.uid, f.displayName)}
                    </Text>
                    <Text style={styles.sub} numberOfLines={1}>
                      {profiles[f.uid]?.headline || "Friend"}
                    </Text>
                  </View>
                </Pressable>
                {busyId === f.uid ? (
                  <ActivityIndicator color="#f59e0b" />
                ) : (
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Pressable style={styles.iconBtn} onPress={() => friendOptions(f)} accessibilityLabel="Options">
                      <FontAwesome name="ellipsis-h" size={14} color={tc("#a1a1aa")} />
                    </Pressable>
                    <Pressable style={styles.iconBtnAccent} onPress={() => startChat(f)} accessibilityLabel="Message">
                      <FontAwesome name="comment" size={14} color={tc("#0f1115")} />
                    </Pressable>
                  </View>
                )}
              </View>
            ))
        )}
      </View>

      {sentIds.size > 0 && (
        <Text style={styles.footNote}>
          {sentIds.size} pending request{sentIds.size === 1 ? "" : "s"} sent
        </Text>
      )}
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={statusBarStyle()} backgroundColor={tc("#0f1115")} />
      <ScreenHeader title="Messages" subtitle="Chats & friends" />

      <View style={styles.segment}>
        {([
          ["chats", `Chats${unreadCount ? ` · ${unreadCount}` : ""}`],
          ["friends", `Friends${incoming.length ? ` · ${incoming.length} new` : ""}`],
        ] as const).map(([key, label]) => (
          <Pressable
            key={key}
            style={[styles.segmentBtn, tab === key && styles.segmentBtnActive]}
            onPress={() => setTab(key)}
          >
            <Text style={[styles.segmentText, tab === key && styles.segmentTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {tab === "friends" ? (
        FriendsTab
      ) : threadsLoading ? (
        <ActivityIndicator color="#f59e0b" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={visibleThreads}
          keyExtractor={(t) => t.id}
          renderItem={renderThread}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            friends.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
                <Pressable style={styles.quickItem} onPress={() => setTab("friends")}>
                  <View style={styles.quickNew}>
                    <FontAwesome name="pencil" size={16} color={tc("#0f1115")} />
                  </View>
                  <Text style={styles.quickName} numberOfLines={1}>
                    New
                  </Text>
                </Pressable>
                {friends
                  .filter((f) => !blockedIds.has(f.uid))
                  .map((f) => (
                    <Pressable key={f.uid} style={styles.quickItem} onPress={() => startChat(f)}>
                      <Avatar name={nameFor(f.uid, f.displayName)} photo={photoFor(f.uid, f.photoURL)} size={52} />
                      <Text style={styles.quickName} numberOfLines={1}>
                        {nameFor(f.uid, f.displayName).split(" ")[0]}
                      </Text>
                    </Pressable>
                  ))}
              </ScrollView>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <FontAwesome name="comments-o" size={30} color="#f59e0b" />
              </View>
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptySub}>
                {friends.length
                  ? "Tap a friend above to start chatting."
                  : "Add some friends, then message them or send them recipes."}
              </Text>
              {!friends.length && (
                <Pressable style={styles.cta} onPress={() => setTab("friends")}>
                  <FontAwesome name="user-plus" size={14} color={tc("#0f1115")} />
                  <Text style={styles.ctaText}>Find Chefs</Text>
                </Pressable>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = themedStyles({
  container: { flex: 1, backgroundColor: "#0f1115" },
  list: { paddingHorizontal: 20, paddingBottom: 40 },

  segment: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 14,
    padding: 4,
    gap: 4,
    borderRadius: 14,
    backgroundColor: "#181b20",
    borderWidth: 1,
    borderColor: "#27272a",
  },
  segmentBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  segmentBtnActive: { backgroundColor: "#f59e0b" },
  segmentText: { color: "#a1a1aa", fontWeight: "700", fontSize: 13 },
  segmentTextActive: { color: "#0f1115" },

  avatarFallback: { backgroundColor: "#27272a", alignItems: "center", justifyContent: "center" },
  avatarInitial: { color: "#f59e0b", fontWeight: "900" },

  quickRow: { gap: 16, paddingBottom: 16, paddingTop: 2 },
  quickItem: { alignItems: "center", width: 58 },
  quickNew: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#f59e0b",
    alignItems: "center",
    justifyContent: "center",
  },
  quickName: { color: "#a1a1aa", fontSize: 12, marginTop: 6, fontWeight: "600" },

  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 12,
    marginBottom: 10,
    borderRadius: 18,
    backgroundColor: "#181b20",
    borderWidth: 1,
    borderColor: "#27272a",
  },
  cardUnread: { borderColor: "rgba(245, 158, 11, 0.45)" },
  cardBody: { flex: 1 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  name: { color: "#f4f4f5", fontSize: 15, fontWeight: "700", flexShrink: 1 },
  nameUnread: { fontWeight: "900" },
  time: { color: "#71717a", fontSize: 12 },
  timeUnread: { color: "#f59e0b", fontWeight: "700" },
  preview: { color: "#a1a1aa", fontSize: 14, marginTop: 3 },
  previewUnread: { color: "#f4f4f5", fontWeight: "600" },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#f59e0b" },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "#181b20",
    borderWidth: 1,
    borderColor: "#27272a",
  },
  searchInput: { flex: 1, color: "#f4f4f5", fontSize: 15 },

  section: { marginTop: 20 },
  sectionLabel: {
    color: "#a1a1aa",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    marginBottom: 8,
    borderRadius: 16,
    backgroundColor: "#181b20",
    borderWidth: 1,
    borderColor: "#27272a",
  },
  rowMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  sub: { color: "#a1a1aa", fontSize: 12, marginTop: 2 },
  smallBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f59e0b",
  },
  smallBtnText: { color: "#0f1115", fontWeight: "800", fontSize: 13 },
  ghostBtn: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#27272a",
    alignItems: "center",
    justifyContent: "center",
  },
  ghostBtnText: { color: "#a1a1aa", fontWeight: "700", fontSize: 13 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#27272a",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnAccent: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f59e0b",
    alignItems: "center",
    justifyContent: "center",
  },
  muted: { color: "#a1a1aa", fontSize: 13, lineHeight: 19, textAlign: "center" },
  emptyCard: {
    alignItems: "center",
    gap: 8,
    padding: 22,
    borderRadius: 18,
    backgroundColor: "#181b20",
    borderWidth: 1,
    borderColor: "#27272a",
  },
  emptyCardTitle: { color: "#f4f4f5", fontSize: 16, fontWeight: "800" },
  footNote: { color: "#71717a", fontSize: 12, textAlign: "center", marginTop: 16 },

  empty: { alignItems: "center", marginTop: 50, paddingHorizontal: 24 },
  emptyIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#181b20",
    borderWidth: 1,
    borderColor: "#27272a",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: { color: "#f4f4f5", fontSize: 18, fontWeight: "800" },
  emptySub: { color: "#a1a1aa", fontSize: 14, textAlign: "center", marginTop: 6, lineHeight: 20 },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 18,
    paddingHorizontal: 20,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#f59e0b",
  },
  ctaText: { color: "#0f1115", fontWeight: "800", fontSize: 15 },
});
