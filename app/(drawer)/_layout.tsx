import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, Image, StatusBar } from "react-native";
import { Drawer } from "expo-router/drawer";
import { DrawerContentScrollView } from "@react-navigation/drawer";
import { useRouter, usePathname } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { getAuth } from "firebase/auth";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../../lib/firebase";

function CustomDrawerContent(props: any) {
  const router = useRouter();
  const currentPath = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  // User Profile State
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const userEmail = currentUser?.email || "Chef Guest";
  // Extract display name from email or fall back to 'Chef'
  const displayName = currentUser?.displayName || userEmail.split("@")[0];

  // Placeholder state for future level system (Curriculum / Challenges)
  const [chefLevel] = useState("Level 1 Chef");

  // Real-time listener for pending notifications / friend requests
  useEffect(() => {
    if (!currentUser) return;

    const reqRef = collection(db, "users", currentUser.uid, "friendRequests");
    const q = query(reqRef, where("status", "==", "pending"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setUnreadCount(snapshot.size);
      },
      (err) => console.error("Error fetching notification badge count:", err)
    );

    return () => unsubscribe();
  }, [currentUser]);

  const menuItems = [
    {
      label: "Home",
      icon: "cutlery",
      path: "/(drawer)/(tabs)",
      badge: 0,
      action: () => {
        props.navigation.closeDrawer();
        router.push("/(drawer)/(tabs)");
      },
    },
    {
      label: "Messages",
      icon: "comments",
      path: "/messages",
      badge: 0,
      action: () => {
        props.navigation.closeDrawer();
        router.push("/messages" as any);
      },
    },
    {
      label: "Notifications",
      icon: "bell",
      path: "/notifications",
      badge: unreadCount,
      action: () => {
        props.navigation.closeDrawer();
        router.push("/notifications" as any);
      },
    },
    {
      label: "My Profile",
      icon: "user-o",
      path: "/profile",
      badge: 0,
      action: () => {
        props.navigation.closeDrawer();
        router.push("/profile" as any);
      },
    },
    {
      label: "My Recipes",
      icon: "book",
      path: "/recipes",
      badge: 0,
      action: () => {
        props.navigation.closeDrawer();
        router.push("/recipes" as any);
      },
    },
    {
      label: "Other Chef's Recipes",
      icon: "globe",
      path: "/community",
      badge: 0,
      action: () => {
        props.navigation.closeDrawer();
        router.push("/community" as any);
      },
    },
    {
      label: "Prep & Grocery",
      icon: "shopping-basket",
      path: "/grocery",
      badge: 0,
      action: () => {
        props.navigation.closeDrawer();
        router.push("/grocery" as any);
      },
    },
    {
      label: "Settings",
      icon: "sliders",
      path: "/settings",
      badge: 0,
      action: () => {
        props.navigation.closeDrawer();
        router.push("/(drawer)/settings" as any);
      },
    },
  ];

  return (
    <View style={styles.outerContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1115" />
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.brandTitle}>
            Gastro<Text style={styles.brandDot}>.</Text>
          </Text>
          <Text style={styles.brandSubtitle}>Community Culinary Hub</Text>
        </View>

        {/* Profile Header */}
        <View style={styles.profileRow}>
          <Image
            source={{
              uri: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?q=80&w=200",
            }}
            style={styles.avatar}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName} numberOfLines={1}>
              Chef {displayName}
            </Text>
            <Text style={styles.profileEmail} numberOfLines={1}>
              {userEmail}
            </Text>
            <View style={styles.badgePill}>
              <FontAwesome name="star" size={9} color="#f59e0b" />
              <Text style={styles.badgeText}>{chefLevel}</Text>
            </View>
          </View>
        </View>

        {/* Section Title */}
        <Text style={styles.sectionTitle}>EXPLORE</Text>

        {/* Navigation List */}
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => {
            const isActive = currentPath.includes(item.path);

            return (
              <Pressable
                key={index}
                style={({ pressed }) => [
                  styles.navItem,
                  isActive && styles.navItemActive,
                  pressed && styles.navItemPressed,
                ]}
                onPress={item.action}
              >
                <View style={styles.navRow}>
                  <View
                    style={[
                      styles.iconWrapper,
                      isActive && styles.iconWrapperActive,
                    ]}
                  >
                    <FontAwesome
                      name={item.icon as any}
                      size={15}
                      color={isActive ? "#f59e0b" : "#a1a1aa"}
                    />
                  </View>
                  <Text
                    style={[
                      styles.navLabel,
                      isActive && styles.navLabelActive,
                    ]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>

                  {item.badge > 0 && (
                    <View style={styles.notificationBadge}>
                      <Text style={styles.notificationBadgeText}>
                        {item.badge}
                      </Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </DrawerContentScrollView>

      {/* Floating Kitchen Feed Banner */}
      <View style={styles.footer}>
        <View style={styles.communityBanner}>
          <View style={styles.communityIconBg}>
            <FontAwesome name="users" size={14} color="#f59e0b" />
          </View>
          <View style={styles.communityContent}>
            <Text style={styles.communityTitle}>Kitchen Feed</Text>
            <Text style={styles.communitySubtitle}>
              1.4k chefs cooking right now
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function DrawerLayout() {
  return (
    <Drawer
      initialRouteName="(tabs)"
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: "#0f1115",
          width: "78%",
        },
      }}
    >
      <Drawer.Screen name="(tabs)" options={{ title: "Home" }} />
      <Drawer.Screen name="messages" options={{ title: "Messages" }} />
      <Drawer.Screen name="notifications" options={{ title: "Notifications" }} />
      <Drawer.Screen name="profile" options={{ title: "Profile" }} />
      <Drawer.Screen name="recipes" options={{ title: "Recipes" }} />
      <Drawer.Screen name="community" options={{ title: "CommunityRecipes" }} />
      <Drawer.Screen name="grocery" options={{ title: "Grocery" }} />
      <Drawer.Screen name="settings" options={{ title: "Settings" }} />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: "#0f1115",
  },
  scrollContent: {
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 24,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#f4f4f5",
    letterSpacing: -0.8,
  },
  brandDot: {
    color: "#f59e0b",
  },
  brandSubtitle: {
    fontSize: 12,
    color: "#71717a",
    fontWeight: "500",
    marginTop: 2,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#181b20",
    borderWidth: 1,
    borderColor: "#27272a",
    padding: 12,
    borderRadius: 18,
    marginBottom: 28,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  profileInfo: {
    flex: 1,
    justifyContent: "center",
    gap: 2,
  },
  profileName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#f4f4f5",
  },
  profileEmail: {
    fontSize: 11,
    color: "#a1a1aa",
    marginBottom: 2,
  },
  badgePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.25)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: "flex-start",
    gap: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#f59e0b",
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#52525b",
    letterSpacing: 1.2,
    marginBottom: 12,
    paddingLeft: 4,
  },
  menuContainer: {
    width: "100%",
    gap: 4,
  },
  navItem: {
    borderRadius: 14,
    width: "100%",
    borderWidth: 1,
    borderColor: "transparent",
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    width: "100%",
  },
  navItemActive: {
    backgroundColor: "#181b20",
    borderColor: "#27272a",
  },
  navItemPressed: {
    backgroundColor: "#181b20",
    opacity: 0.8,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#181b20",
    borderWidth: 1,
    borderColor: "#27272a",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  iconWrapperActive: {
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  navLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#a1a1aa",
    flex: 1,
  },
  navLabelActive: {
    color: "#f59e0b",
    fontWeight: "700",
  },
  notificationBadge: {
    backgroundColor: "#f59e0b",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  notificationBadgeText: {
    color: "#0f1115",
    fontSize: 11,
    fontWeight: "800",
  },
  footer: {
    padding: 20,
    paddingBottom: 32,
  },
  communityBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#181b20",
    borderWidth: 1,
    borderColor: "#27272a",
    padding: 12,
    borderRadius: 16,
    gap: 12,
  },
  communityIconBg: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  communityContent: {
    flex: 1,
  },
  communityTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#f4f4f5",
  },
  communitySubtitle: {
    fontSize: 11,
    color: "#a1a1aa",
    marginTop: 1,
  },
});