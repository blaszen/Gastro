import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, Slot, useRouter } from "expo-router";
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from '@/components/useColorScheme';
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useUserStore } from "../store/userStore";
import { GluestackUIProvider } from "@gluestack-ui/themed";
import '@/global.css';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return <RootNav />;
}

function RootNav() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const setUser = useUserStore((s) => s.setUser);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      console.log("AUTH STATE:", u);

      if (!u) {
        router.replace("/auth/login");
      } else {
        // router.replace("/(drawer)/(tabs)/index"); // 👈 send authenticated users to drawer
        router.replace("/(drawer)");

      }
    });

    return unsub;
  }, []);
  
  return (
    <GluestackUIProvider>
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
          {/* Drawer navigation */}
          <Stack.Screen name="(drawer)" options={{ headerShown: false }} />

          {/* Auth screens */}
          <Stack.Screen name="auth/login" />
          <Stack.Screen name="auth/register" />
        </Stack>
    </ThemeProvider>
        </GluestackUIProvider>
  
  );
}
