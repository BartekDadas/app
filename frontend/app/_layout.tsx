import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, Text, Image, ScrollView, ActivityIndicator } from 'react-native';
import { getDb } from '../src/database/db';

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <View style={styles.splashContainer}>
      <StatusBar style="light" />
      <View style={styles.splashContent}>
        <Image source={require('../assets/images/app-image.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.splashTitle}>Midnight Scholar</Text>
        <Text style={[styles.logText, styles.logError, { marginTop: 20 }]}>
          FATAL RENDER ERROR:
        </Text>
        <Text style={[styles.logText, styles.logError]}>
          {error.message}
        </Text>
      </View>
    </View>
  );
}

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [logs, setLogs] = useState<string[]>(['App starting...']);
  const [hasError, setHasError] = useState(false);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, msg]);
  };

  useEffect(() => {
    let isMounted = true;
    async function init() {
      try {
        addLog('Initializing database...');
        await getDb();
        if (!isMounted) return;
        addLog('Database initialized successfully.');

        addLog('Bootstrapping complete.');
        // Add a slight delay to ensure UI transition is smooth
        setTimeout(() => {
          if (isMounted) setIsReady(true);
        }, 600);
      } catch (e: any) {
        if (!isMounted) return;
        addLog(`ERROR: ${e.message || e.toString()}`);
        setHasError(true);
      }
    }
    init();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!isReady || hasError) {
    return (
      <View style={styles.splashContainer}>
        <StatusBar style="light" />
        <View style={styles.splashContent}>
          <Image source={require('../assets/images/app-image.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.splashTitle}>Midnight Scholar</Text>

          {!hasError && <ActivityIndicator size="large" color="#E879F9" style={{ marginVertical: 20 }} />}

          <ScrollView style={styles.logContainer} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            {logs.map((log, index) => (
              <Text
                key={index}
                style={[styles.logText, log.startsWith('ERROR:') && styles.logError]}
              >
                {'>'} {log}
              </Text>
            ))}
          </ScrollView>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0D0D1A' },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="study/[textId]"
          options={{
            headerShown: false,
            presentation: 'modal',
            animation: 'slide_from_bottom'
          }}
        />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D1A',
  },
  splashContainer: {
    flex: 1,
    backgroundColor: '#0D0D1A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  splashContent: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: '30%',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  splashTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 30,
  },
  logContainer: {
    flex: 1,
    width: '100%',
    marginTop: 20,
    backgroundColor: '#1F1F3A',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2D2D4A',
  },
  logText: {
    color: '#10B981', // Terminal green
    fontFamily: 'monospace',
    fontSize: 12,
    marginBottom: 6,
  },
  logError: {
    color: '#EF4444', // Red for errors
    fontWeight: 'bold',
  },
});
