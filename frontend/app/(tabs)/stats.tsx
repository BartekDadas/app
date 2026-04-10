import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../src/store/appStore';
import { getUserStats } from '../../src/database/db';

export default function StatsScreen() {
  const { userStats, setUserStats } = useAppStore();
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const data = await getUserStats();
      if (data) setUserStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const statCards = [
    {
      icon: 'flash',
      color: '#FBBF24',
      value: userStats.total_points.toLocaleString(),
      label: 'Total Points',
      bg: 'rgba(251, 191, 36, 0.15)',
    },
    {
      icon: 'flame',
      color: '#F97316',
      value: userStats.streak_count.toString(),
      label: 'Day Streak',
      bg: 'rgba(249, 115, 22, 0.15)',
    },
    {
      icon: 'checkmark-done-circle',
      color: '#22C55E',
      value: userStats.sentences_completed.toString(),
      label: 'Sentences Mastered',
      bg: 'rgba(34, 197, 94, 0.15)',
    },
    {
      icon: 'analytics',
      color: '#3B82F6',
      value: `${userStats.accuracy_percent}%`,
      label: 'Accuracy Rate',
      bg: 'rgba(59, 130, 246, 0.15)',
    },
    {
      icon: 'repeat',
      color: '#8B5CF6',
      value: userStats.total_attempts.toString(),
      label: 'Total Attempts',
      bg: 'rgba(139, 92, 246, 0.15)',
    },
  ];

  const achievements = [
    {
      icon: 'star',
      title: 'First Steps',
      desc: 'Complete your first sentence',
      unlocked: userStats.sentences_completed >= 1,
    },
    {
      icon: 'medal',
      title: 'Dedicated',
      desc: 'Complete 10 sentences',
      unlocked: userStats.sentences_completed >= 10,
    },
    {
      icon: 'trophy',
      title: 'Scholar',
      desc: 'Reach 1000 points',
      unlocked: userStats.total_points >= 1000,
    },
    {
      icon: 'ribbon',
      title: 'Perfect Run',
      desc: 'Get 90% accuracy',
      unlocked: userStats.accuracy_percent >= 90,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E879F9" />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Your Progress</Text>
          <Text style={styles.headerSubtitle}>Track your Korean learning journey</Text>
        </View>

        {/* Main Stats */}
        <View style={styles.statsGrid}>
          {statCards.map((stat, index) => (
            <View key={index} style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: stat.bg }]}>
                <Ionicons name={stat.icon as any} size={28} color={stat.color} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Achievements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACHIEVEMENTS</Text>
          <View style={styles.achievementsGrid}>
            {achievements.map((achievement, index) => (
              <View
                key={index}
                style={[
                  styles.achievementCard,
                  !achievement.unlocked && styles.achievementLocked,
                ]}
              >
                <View
                  style={[
                    styles.achievementIcon,
                    achievement.unlocked
                      ? styles.achievementIconUnlocked
                      : styles.achievementIconLocked,
                  ]}
                >
                  <Ionicons
                    name={achievement.icon as any}
                    size={24}
                    color={achievement.unlocked ? '#FBBF24' : '#4B5563'}
                  />
                </View>
                <Text
                  style={[
                    styles.achievementTitle,
                    !achievement.unlocked && styles.achievementTitleLocked,
                  ]}
                >
                  {achievement.title}
                </Text>
                <Text style={styles.achievementDesc}>{achievement.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Tips */}
        <View style={styles.tipsSection}>
          <View style={styles.tipCard}>
            <Ionicons name="bulb" size={24} color="#FBBF24" />
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Learning Tip</Text>
              <Text style={styles.tipText}>
                Focus on understanding the sentence structure. Korean follows Subject-Object-Verb order!
              </Text>
            </View>
          </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#9CA3AF',
    fontSize: 15,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  statCard: {
    width: '47%',
    backgroundColor: '#1F1F3A',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2D2D4A',
  },
  statIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
  },
  statLabel: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 4,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: '#22C55E',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 2,
    marginBottom: 16,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  achievementCard: {
    width: '47%',
    backgroundColor: '#1F1F3A',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2D2D4A',
  },
  achievementLocked: {
    opacity: 0.5,
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  achievementIconUnlocked: {
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
  },
  achievementIconLocked: {
    backgroundColor: '#2D2D4A',
  },
  achievementTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  achievementTitleLocked: {
    color: '#6B7280',
  },
  achievementDesc: {
    color: '#6B7280',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
  tipsSection: {
    marginBottom: 32,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.2)',
  },
  tipContent: {
    flex: 1,
    marginLeft: 12,
  },
  tipTitle: {
    color: '#FBBF24',
    fontSize: 14,
    fontWeight: '600',
  },
  tipText: {
    color: '#D1D5DB',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
  },
});
