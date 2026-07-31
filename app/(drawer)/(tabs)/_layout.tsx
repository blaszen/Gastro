import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

import { useClientOnlyValue } from '@/components/useClientOnlyValue';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={22} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#f59e0b', // Amber accent for active tab
        tabBarInactiveTintColor: '#71717a', // Muted gray for inactive tabs
        headerShown: useClientOnlyValue(false, true),
        tabBarStyle: {
          backgroundColor: '#0f1115', // Dark base color matching screen canvases
          borderTopColor: '#27272a', // Subtle dark border line
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 8,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabBarIcon name="cutlery" color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: 'Search',
          tabBarIcon: ({ color }) => <TabBarIcon name="search" color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="three"
        options={{
          title: 'Create',
          tabBarIcon: ({ color }) => <TabBarIcon name="pencil" color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="four"
        options={{
          title: 'Tools',
          tabBarIcon: ({ color }) => <TabBarIcon name="wrench" color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="five"
        options={{
          title: 'Favorites',
          tabBarIcon: ({ color }) => <TabBarIcon name="bookmark" color={color} />,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}