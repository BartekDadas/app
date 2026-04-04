import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppStore } from '../../src/store/appStore';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface TextItem {
  id: string;
  title: string;
  sentence_count: number;
  created_at: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const { userStats, setUserStats } = useAppStore();
  const [texts, setTexts] = useState<TextItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      // Fetch texts
      const textsRes = await fetch(`${API_URL}/api/texts`);
      const textsData = await textsRes.json();
      setTexts(textsData);

      // Fetch stats
      const statsRes = await fetch(`${API_URL}/api/stats`);
      const statsData = await statsRes.json();
      setUserStats(statsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const startStudy = (textId: string) => {
    router.push(`/study/${textId}`);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E879F9" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Ionicons name="book" size={28} color="#E879F9" />
          <Text style={styles.logoText}>Midnight Scholar</Text>
        </View>
        <View style={styles.pointsContainer}>
          <Ionicons name="flash" size={18} color="#FBBF24" />
          <Text style={styles.pointsText}>{userStats.total_points.toLocaleString()}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E879F9" />
        }
      >
        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="flame" size={24} color="#F97316" />
            <Text style={styles.statValue}>{userStats.streak_count}</Text>
            <Text style={styles.statLabel}>Streak</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
            <Text style={styles.statValue}>{userStats.sentences_completed}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="trending-up" size={24} color="#3B82F6" />
            <Text style={styles.statValue}>{userStats.accuracy_percent}%</Text>
            <Text style={styles.statLabel}>Accuracy</Text>
          </View>
        </View>

        {/* Texts List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>YOUR TEXTS</Text>
          
          {texts.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={64} color="#4B5563" />
              <Text style={styles.emptyTitle}>No texts yet</Text>
              <Text style={styles.emptySubtitle}>
                Import a Korean text to start learning
              </Text>
              <TouchableOpacity
                style={styles.importButton}
                onPress={() => router.push('/(tabs)/import')}
              >
                <Ionicons name="add" size={20} color="#0D0D1A" />
                <Text style={styles.importButtonText}>Import Text</Text>
              </TouchableOpacity>
            </View>
          ) : (
            texts.map((text) => (
              <TouchableOpacity
                key={text.id}
                style={styles.textCard}
                onPress={() => startStudy(text.id)}
                activeOpacity={0.7}
              >
                <View style={styles.textCardContent}>
                  <View style={styles.textIcon}>
                    <Ionicons name="document-text" size={24} color="#E879F9" />
                  </View>
                  <View style={styles.textInfo}>
                    <Text style={styles.textTitle}>{text.title}</Text>
                    <Text style={styles.textMeta}>
                      {text.sentence_count} sentences
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color="#6B7280" />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D1A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9CA3AF',
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F1F3A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  pointsText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1F1F3A',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2D2D4A',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8,
  },
  statLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#22C55E',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 2,
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    backgroundColor: '#1F1F3A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2D2D4A',
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtitle: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E879F9',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 24,
    gap: 8,
  },
  importButtonText: {
    color: '#0D0D1A',
    fontSize: 16,
    fontWeight: '600',
  },
  textCard: {
    backgroundColor: '#1F1F3A',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2D2D4A',
  },
  textCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  textIcon: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(232, 121, 249, 0.15)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInfo: {
    flex: 1,
    marginLeft: 14,
  },
  textTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  textMeta: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 4,
  },
});
