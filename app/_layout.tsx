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
import { View, Text, StyleSheet, Animated, Image } from "react-native";
import { AppThemeProvider, useThemeMode, tc } from "../lib/theme";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase";
import { syncPublicProfile } from "../lib/social";
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

  return (
    <AppThemeProvider>
      <RootNav fontsLoaded={loaded} />
    </AppThemeProvider>
  );
}

function RootNav({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { mode } = useThemeMode();
  const router = useRouter();
  const setUser = useUserStore((s) => s.setUser);

  // Custom GASTRO Splash Animation State
  const [isAuthReady, setIsAuthReady] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current; // wordmark
  const scaleAnim = useRef(new Animated.Value(14)).current; // wordmark slide (px)
  const overlayAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. Trigger splash intro animation when component mounts
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 450,
        delay: 120,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 0,
        friction: 8,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Firebase Auth Listener
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      // Keep the public profile searchable (name, lowercase name, photo).
      if (u) syncPublicProfile(u);

      // Hide native splash screen once fonts & auth state check complete
      if (fontsLoaded) {
        await SplashScreen.hideAsync();
      }

      // Small delay to allow the custom brand animation to shine
      setTimeout(() => {
        if (!u) {
          router.replace("/auth/login");
        } else {
          router.replace("/(drawer)");
        }
        // Fade the brand overlay out over the first screen.
        Animated.timing(overlayAnim, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }).start(() => setIsAuthReady(true));
      }, 750);
    });

    return unsub;
  }, [fontsLoaded]);

  return (
    <GluestackUIProvider>
      <ThemeProvider value={mode === "dark" ? DarkTheme : DefaultTheme}>
        <View style={{ flex: 1, backgroundColor: tc(tc("#0f1115")) }}>
          <Stack screenOptions={{ headerShown: false }}>
            {/* Main navigation */}
            <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
            <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="lesson/[id]" options={{ headerShown: false }} />
            {/* Auth screens */}
            <Stack.Screen name="auth/login" />
            <Stack.Screen name="auth/register" />
            <Stack.Screen name="auth/forgot-password" />

            {/* Fallback screen */}
            <Stack.Screen name="+not-found" options={{ title: "Oops!" }} />
          </Stack>

          {/* GASTRO Branded Loading / Splash Overlay */}
          {!isAuthReady && (
            <Animated.View style={[splash.overlay, { opacity: overlayAnim }]} pointerEvents="none">
              {/* Same image, size and position as the native splash, so the hand-off is seamless */}
              <Image source={require("../assets/images/splash-icon.png")} style={splash.mark} />
              <Animated.View
                style={[
                  splash.wordmark,
                  { opacity: fadeAnim, transform: [{ translateY: scaleAnim }] },
                ]}
              >
                <Text style={splash.title}>GASTRO</Text>
                <Text style={splash.subtitle}>COOK · SHARE · LEARN</Text>
              </Animated.View>
            </Animated.View>
          )}
        </View>
      </ThemeProvider>
    </GluestackUIProvider>
  );
}

// Not themed: the launch screen is always dark, like the native splash.
const splash = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0f1115",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 99999,
  },
  mark: { width: 200, height: 200 },
  wordmark: { position: "absolute", top: "50%", marginTop: 92, alignItems: "center" },
  title: { color: "#f4f4f5", fontSize: 26, fontWeight: "900", letterSpacing: 6 },
  subtitle: { color: "#f59e0b", fontSize: 10, fontWeight: "700", letterSpacing: 3, marginTop: 6 },
});
