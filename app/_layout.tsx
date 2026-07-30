import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { useColorScheme } from "@/components/useColorScheme";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useUserStore } from "../store/userStore";
import { GluestackUIProvider } from "@gluestack-ui/themed";
import "@/global.css";

// Prevent native splash screen from hiding until app readiness is verified
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  if (!loaded) return null;

  return <RootNav fontsLoaded={loaded} />;
}

function RootNav({ fontsLoaded }: { fontsLoaded: boolean }) {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const setUser = useUserStore((s) => s.setUser);

  // Custom GASTRO Splash Animation State
  const [isAuthReady, setIsAuthReady] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    // 1. Trigger splash intro animation when component mounts
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Firebase Auth Listener
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      console.log("AUTH STATE:", u);

      // Hide native splash screen once fonts & auth state check complete
      if (fontsLoaded) {
        await SplashScreen.hideAsync();
      }

      // Small delay to allow the custom brand animation to shine
      setTimeout(() => {
        setIsAuthReady(true);
        if (!u) {
          router.replace("/auth/login");
        } else {
          router.replace("/(drawer)");
        }
      }, 700);
    });

    return unsub;
  }, [fontsLoaded]);

  return (
    <GluestackUIProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <View style={{ flex: 1, backgroundColor: "#0f1115" }}>
          <Stack screenOptions={{ headerShown: false }}>
            {/* Main navigation */}
            <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
            <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
            {/* Auth screens */}
            <Stack.Screen name="auth/login" />
            <Stack.Screen name="auth/register" />

            {/* Fallback screen */}
            <Stack.Screen name="+not-found" options={{ title: "Oops!" }} />
          </Stack>

          {/* GASTRO Branded Loading / Splash Overlay */}
          {!isAuthReady && (
            <View style={styles.splashOverlay}>
              <Animated.View
                style={[
                  styles.brandContainer,
                  {
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }],
                  },
                ]}
              >
                <View style={styles.iconCircle}>
                  <FontAwesome name="cutlery" size={28} color="#f59e0b" />
                </View>
                <Text style={styles.brandTitle}>GASTRO</Text>
                <Text style={styles.brandSubtitle}>
                  KITCHEN OPERATING SYSTEM
                </Text>
              </Animated.View>
            </View>
          )}
        </View>
      </ThemeProvider>
    </GluestackUIProvider>
  );
}

const styles = StyleSheet.create({
  splashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0f1115",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 99999,
  },
  brandContainer: {
    alignItems: "center",
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#181b20",
    borderWidth: 1,
    borderColor: "#f59e0b",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#f59e0b",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  brandTitle: {
    color: "#f4f4f5",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 5,
  },
  brandSubtitle: {
    color: "#f59e0b",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2.5,
    marginTop: 6,
  },
});