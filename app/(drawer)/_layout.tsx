import { Drawer } from "expo-router/drawer";

export default function DrawerLayout() {
  return (
    <Drawer
      initialRouteName="(tabs)"
      screenOptions={{
        headerShown: false, // <- hides the header on all drawer screens
      }}
    >
      {/* Tabs navigator inside drawer */}
      <Drawer.Screen
        name="(tabs)"
        options={{
          title: "Home Tabs",
          drawerLabel: "Home",
        }}
      />

      {/* Other drawer screens */}
      <Drawer.Screen
        name="profile"
        options={{
          title: "Profile",
          drawerLabel: "Profile",
        }}
      />
    </Drawer>
  );
}
