import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ScrollView,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppStore } from '../../src/store/appStore';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface EvaluationResult {
  score: number;
  passed: boolean;
  missing_points: string[];
  hint: string;
  semantic_score: number;
  concept_score: number;
  points_earned: number;
}

export default function StudyScreen() {
  const { textId } = useLocalSearchParams<{ textId: string }>();
  const router = useRouter();
  const {
    sentences,
    setSentences,
    currentSentenceIndex,
    setCurrentSentenceIndex,
    currentHintLevel,
    incrementHintLevel,
    resetHintLevel,
    userStats,
    setUserStats,
    addPoints,
  } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [userAnswer, setUserAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const currentSentence = sentences[currentSentenceIndex];
  const progress = sentences.length > 0 ? ((currentSentenceIndex + 1) / sentences.length) * 100 : 0;

  useEffect(() => {
    loadSentences();
  }, [textId]);

  useEffect(() => {
    if (currentSentence && !currentSentence.reference_meaning) {
      analyzeSentence();
    }
  }, [currentSentence]);

  useEffect(() => {
    if (showResult) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
    }
  }, [showResult]);

  const loadSentences = async () => {
    try {
      const response = await fetch(`${API_URL}/api/texts/${textId}/sentences`);
      const data = await response.json();
      setSentences(data);
      setCurrentSentenceIndex(0);
      resetHintLevel();
    } catch (error) {
      console.error('Error loading sentences:', error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeSentence = async () => {
    if (!currentSentence) return;
    setAnalyzing(true);
    try {
      await fetch(`${API_URL}/api/sentences/${currentSentence.id}/analyze`, {
        method: 'POST',
      });
      // Reload to get updated data
      const response = await fetch(`${API_URL}/api/texts/${textId}/sentences`);
      const data = await response.json();
      setSentences(data);
    } catch (error) {
      console.error('Error analyzing sentence:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const submitAnswer = async () => {
    if (!userAnswer.trim() || !currentSentence) return;

    Keyboard.dismiss();
    setSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/api/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sentence_id: currentSentence.id,
          user_answer: userAnswer.trim(),
          hint_level: currentHintLevel,
        }),
      });

      const evalResult: EvaluationResult = await response.json();
      setResult(evalResult);
      setShowResult(true);

      if (evalResult.passed) {
        addPoints(evalResult.points_earned);
      }

      // Refresh stats
      const statsRes = await fetch(`${API_URL}/api/stats`);
      const statsData = await statsRes.json();
      setUserStats(statsData);
    } catch (error) {
      console.error('Error submitting answer:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const getHint = async () => {
    if (!currentSentence) return;

    const nextLevel = currentHintLevel + 1;
    try {
      const response = await fetch(
        `${API_URL}/api/hints/${currentSentence.id}/${nextLevel}`
      );
      const data = await response.json();
      setHint(data.hint);
      incrementHintLevel();
    } catch (error) {
      console.error('Error getting hint:', error);
    }
  };

  const nextSentence = () => {
    setShowResult(false);
    setResult(null);
    setUserAnswer('');
    setHint(null);
    resetHintLevel();

    if (currentSentenceIndex < sentences.length - 1) {
      setCurrentSentenceIndex(currentSentenceIndex + 1);
    } else {
      // Completed all sentences - show game
      router.push('/game');
    }
  };

  const playMiniGame = () => {
    router.push('/game');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E879F9" />
          <Text style={styles.loadingText}>Loading sentences...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentSentence) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="checkmark-circle" size={64} color="#22C55E" />
          <Text style={styles.completedText}>All sentences completed!</Text>
          <TouchableOpacity style={styles.homeButton} onPress={() => router.back()}>
            <Text style={styles.homeButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="close" size={24} color="#9CA3AF" />
            </TouchableOpacity>
            <View style={styles.logoContainer}>
              <Ionicons name="book" size={24} color="#E879F9" />
              <Text style={styles.logoText}>Midnight Scholar</Text>
            </View>
          </View>
          <View style={styles.pointsContainer}>
            <Ionicons name="flash" size={16} color="#FBBF24" />
            <Text style={styles.pointsText}>{userStats.total_points.toLocaleString()}</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Progress Info */}
          <View style={styles.progressInfo}>
            <Text style={styles.progressLabel}>CURRENT PROGRESS</Text>
            <View style={styles.progressRow}>
              <Text style={styles.sentenceCount}>
                Sentence {currentSentenceIndex + 1}
                <Text style={styles.sentenceTotal}> / {sentences.length}</Text>
              </Text>
              <Text style={styles.progressPercent}>{Math.round(progress)}%</Text>
            </View>
          </View>

          {/* Sentence Card */}
          <View style={styles.sentenceCard}>
            <View style={styles.quoteIcon}>
              <Ionicons name="chatbox-ellipses" size={24} color="#E879F9" />
            </View>
            <Text style={styles.koreanText}>{currentSentence.sentence_ko}</Text>
            {currentSentence.romanization && (
              <Text style={styles.romanization}>{currentSentence.romanization}</Text>
            )}
            {analyzing && (
              <View style={styles.analyzingContainer}>
                <ActivityIndicator size="small" color="#E879F9" />
                <Text style={styles.analyzingText}>Analyzing sentence...</Text>
              </View>
            )}
          </View>

          {/* Hint Display */}
          {hint && (
            <View style={styles.hintCard}>
              <Ionicons name="bulb" size={20} color="#FBBF24" />
              <Text style={styles.hintText}>{hint}</Text>
            </View>
          )}

          {/* Result Display */}
          {showResult && result && (
            <Animated.View
              style={[
                styles.resultCard,
                result.passed ? styles.resultCardPass : styles.resultCardFail,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
              ]}
            >
              <View style={styles.resultHeader}>
                <Ionicons
                  name={result.passed ? 'checkmark-circle' : 'close-circle'}
                  size={32}
                  color={result.passed ? '#22C55E' : '#EF4444'}
                />
                <View style={styles.resultScores}>
                  <Text style={styles.resultScore}>{result.score}%</Text>
                  <Text style={styles.resultLabel}>
                    {result.passed ? 'Passed!' : 'Try Again'}
                  </Text>
                </View>
                {result.passed && result.points_earned > 0 && (
                  <View style={styles.pointsEarned}>
                    <Ionicons name="flash" size={16} color="#FBBF24" />
                    <Text style={styles.pointsEarnedText}>+{result.points_earned}</Text>
                  </View>
                )}
              </View>

              <View style={styles.scoreBreakdown}>
                <View style={styles.scoreItem}>
                  <Text style={styles.scoreItemLabel}>Semantic</Text>
                  <Text style={styles.scoreItemValue}>{result.semantic_score}%</Text>
                </View>
                <View style={styles.scoreItem}>
                  <Text style={styles.scoreItemLabel}>Concepts</Text>
                  <Text style={styles.scoreItemValue}>{result.concept_score}%</Text>
                </View>
              </View>

              {result.hint && (
                <Text style={styles.resultHint}>{result.hint}</Text>
              )}

              {result.passed && (
                <View style={styles.resultActions}>
                  <TouchableOpacity style={styles.gameButton} onPress={playMiniGame}>
                    <Ionicons name="game-controller" size={20} color="#0D0D1A" />
                    <Text style={styles.gameButtonText}>Play Game</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.nextButton} onPress={nextSentence}>
                    <Text style={styles.nextButtonText}>Next</Text>
                    <Ionicons name="arrow-forward" size={20} color="#0D0D1A" />
                  </TouchableOpacity>
                </View>
              )}
            </Animated.View>
          )}

          {/* Input Section */}
          {!showResult && (
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>YOUR TRANSLATION</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  value={userAnswer}
                  onChangeText={setUserAnswer}
                  placeholder="Enter English translation..."
                  placeholderTextColor="#6B7280"
                  multiline
                  textAlignVertical="top"
                />
                <View style={styles.inputActions}>
                  <TouchableOpacity
                    style={styles.hintButton}
                    onPress={getHint}
                    disabled={currentHintLevel >= 4}
                  >
                    <Ionicons
                      name="help-circle"
                      size={24}
                      color={currentHintLevel >= 4 ? '#4B5563' : '#9CA3AF'}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Submit Button */}
        {!showResult ? (
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!userAnswer.trim() || submitting) && styles.submitButtonDisabled,
              ]}
              onPress={submitAnswer}
              disabled={!userAnswer.trim() || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#0D0D1A" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>Submit</Text>
                  <Ionicons name="arrow-forward" size={20} color="#0D0D1A" />
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : !result?.passed ? (
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                setShowResult(false);
                setResult(null);
              }}
            >
              <Ionicons name="refresh" size={20} color="#FFFFFF" />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D1A',
  },
  keyboardView: {
    flex: 1,
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
  completedText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  homeButton: {
    backgroundColor: '#E879F9',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
    marginTop: 24,
  },
  homeButtonText: {
    color: '#0D0D1A',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F1F3A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  pointsText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  progressContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#2D2D4A',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  progressInfo: {
    marginTop: 16,
    marginBottom: 20,
  },
  progressLabel: {
    color: '#22C55E',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  sentenceCount: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
  },
  sentenceTotal: {
    color: '#6B7280',
    fontSize: 20,
    fontWeight: '400',
  },
  progressPercent: {
    color: '#22C55E',
    fontSize: 20,
    fontWeight: '600',
  },
  sentenceCard: {
    backgroundColor: '#1F1F3A',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2D2D4A',
    alignItems: 'center',
  },
  quoteIcon: {
    marginBottom: 16,
  },
  koreanText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 38,
  },
  romanization: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
    backgroundColor: 'rgba(156, 163, 175, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  analyzingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  analyzingText: {
    color: '#E879F9',
    fontSize: 13,
  },
  hintCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.2)',
    gap: 10,
  },
  hintText: {
    flex: 1,
    color: '#FCD34D',
    fontSize: 14,
    lineHeight: 20,
  },
  resultCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  resultCardPass: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  resultCardFail: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resultScores: {
    flex: 1,
  },
  resultScore: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
  },
  resultLabel: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  pointsEarned: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  pointsEarnedText: {
    color: '#FBBF24',
    fontSize: 16,
    fontWeight: '600',
  },
  scoreBreakdown: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 16,
  },
  scoreItem: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  scoreItemLabel: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  scoreItemValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 4,
  },
  resultHint: {
    color: '#D1D5DB',
    fontSize: 14,
    marginTop: 16,
    lineHeight: 20,
  },
  resultActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  gameButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    paddingVertical: 14,
    borderRadius: 24,
    gap: 8,
  },
  gameButtonText: {
    color: '#0D0D1A',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22C55E',
    paddingVertical: 14,
    borderRadius: 24,
    gap: 8,
  },
  nextButtonText: {
    color: '#0D0D1A',
    fontSize: 16,
    fontWeight: '600',
  },
  inputSection: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#22C55E',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  inputContainer: {
    backgroundColor: '#1F1F3A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2D2D4A',
    overflow: 'hidden',
  },
  textInput: {
    color: '#FFFFFF',
    fontSize: 16,
    padding: 16,
    minHeight: 100,
  },
  inputActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#2D2D4A',
  },
  hintButton: {
    padding: 4,
  },
  footer: {
    padding: 20,
    paddingBottom: 8,
  },
  submitButton: {
    backgroundColor: '#E879F9',
    borderRadius: 28,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#4B5563',
  },
  submitButtonText: {
    color: '#0D0D1A',
    fontSize: 18,
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: '#2D2D4A',
    borderRadius: 28,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
