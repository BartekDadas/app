import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#22C55E',
        tabBarInactiveTintColor: '#6B7280',
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'HOME',
          tabBarIcon: ({ color, size }) => (
            <View style={[styles.iconContainer, color === '#22C55E' && styles.activeIcon]}>
              <Ionicons name="home" size={24} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="import"
        options={{
          title: 'IMPORT',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'STATS',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'SETTINGS',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#0D0D1A',
    borderTopWidth: 1,
    borderTopColor: '#1F1F3A',
    height: 80,
    paddingTop: 8,
    paddingBottom: 20,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
  },
  iconContainer: {
    padding: 8,
    borderRadius: 20,
  },
  activeIcon: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
});
