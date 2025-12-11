import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link, Tabs } from 'expo-router';
import { Pressable } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        // Disable the static render of the header on web
        // to prevent a hydration error in React Navigation v6.
        headerShown: useClientOnlyValue(false, true),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
 headerShown: false, // <-- hides the header
        }}
      />
      <Tabs.Screen
        name="two"
options={{
    title: 'Search',
    tabBarIcon: ({ color }) => <TabBarIcon name="search" color={color} />,
    headerShown: false, // <-- hides the header
  }}
      />
            <Tabs.Screen
        name="three"
options={{
    title: 'Create',
    tabBarIcon: ({ color }) => <TabBarIcon name="pencil" color={color} />,
    headerShown: false, // <-- hides the header
  }}
      />
                  <Tabs.Screen
        name="four"
options={{
    title: 'Learning',
    tabBarIcon: ({ color }) => <TabBarIcon name="video-camera" color={color} />,
    headerShown: false, // <-- hides the header
  }}
      />
                        <Tabs.Screen
        name="five"
options={{
    title: 'My Recipes',
    tabBarIcon: ({ color }) => <TabBarIcon name="heart" color={color} />,
    headerShown: false, // <-- hides the header
  }}
      />
    </Tabs>
  );
}
