import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Drawer } from "expo-router/drawer";
import { DrawerContentScrollView } from "@react-navigation/drawer";
import { useRouter } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";

function CustomDrawerContent(props: any) {
  const router = useRouter();

  const menuItems = [
    {
      label: "Home",
      icon: "home",
      action: () => {
        props.navigation.closeDrawer();
        router.push("/(drawer)/(tabs)");
      },
    },
    {
      label: "My Profile",
      icon: "user",
      action: () => {
        props.navigation.closeDrawer();
        router.push("/profile");
      },
    },
    {
      label: "My Recipes",
      icon: "book",
      action: () => {
        props.navigation.closeDrawer();
        router.push("/recipes");
      },
    },
    {
      label: "Prep & Grocery",
      icon: "shopping-basket",
      action: () => {
        props.navigation.closeDrawer();
        router.push("/grocery");
      },
    },

  ];

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.container}>
      <Text style={styles.menuHeader}>Menu</Text>
      {menuItems.map((item, index) => (
        <Pressable
          key={index}
          style={({ pressed }) => [
            styles.drawerItem,
            pressed && styles.drawerItemPressed,
          ]}
          onPress={item.action}
        >
          <View style={styles.row}>
            <View style={styles.iconBox}>
              <FontAwesome name={item.icon as any} size={18} color="#334155" />
            </View>
            <Text style={styles.label} numberOfLines={1}>
              {item.label}
            </Text>
          </View>
        </Pressable>
      ))}
    </DrawerContentScrollView>
  );
}

export default function DrawerLayout() {
  return (
    <Drawer
      initialRouteName="(tabs)"
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Drawer.Screen name="(tabs)" options={{ title: "Home" }} />
      <Drawer.Screen name="profile" options={{ title: "Profile" }} />
      <Drawer.Screen name="recipes" options={{ title: "Recipes" }} />
      <Drawer.Screen name="grocery" options={{ title: "Grocery" }} />
      <Drawer.Screen name="settings" options={{ title: "Settings" }} />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
  },
  menuHeader: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    marginHorizontal: 16,
    marginBottom: 16,
  },
  drawerItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginHorizontal: 8,
    marginBottom: 4,
  },
  drawerItemPressed: {
    backgroundColor: "#f1f5f9",
  },
  row: {
    flexDirection: "row",       // Strictly forces horizontal layout
    alignItems: "center",       // Vertically aligns icon and label center
    width: "100%",              // Takes full width of drawer item
  },
  iconBox: {
    width: 32,                  // Fixed width for icon block
    height: 32,                 // Fixed height to ensure square box
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#334155",
    flexShrink: 1,              // Prevents pushing text off screen
  },
});