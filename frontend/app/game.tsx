import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppStore } from '../src/store/appStore';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL || '';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const GAME_DURATION = 8000; // 8 seconds
const SHIP_SIZE = 40;
const OBSTACLE_SIZE = 30;
const GAME_AREA_HEIGHT = SCREEN_HEIGHT * 0.6;

interface Obstacle {
  id: number;
  x: number;
  y: Animated.Value;
  speed: number;
}

export default function GameScreen() {
  const router = useRouter();
  const { addPoints, userStats, setUserStats } = useAppStore();
  
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'ended'>('ready');
  const [shipX, setShipX] = useState(SCREEN_WIDTH / 2 - SHIP_SIZE / 2);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION / 1000);
  const [reward, setReward] = useState(0);
  
  const shipY = useRef(new Animated.Value(0)).current;
  const obstacleIdRef = useRef(0);
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const obstacleLoopRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      clearAllIntervals();
    };
  }, []);

  const clearAllIntervals = () => {
    if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    if (obstacleLoopRef.current) clearInterval(obstacleLoopRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setObstacles([]);
    setTimeLeft(GAME_DURATION / 1000);
    startTimeRef.current = Date.now();

    // Spawn obstacles
    obstacleLoopRef.current = setInterval(() => {
      spawnObstacle();
    }, 800);

    // Timer countdown
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, GAME_DURATION - elapsed);
      setTimeLeft(Math.ceil(remaining / 1000));
      setScore(Math.floor(elapsed / 100));

      if (remaining <= 0) {
        endGame(true);
      }
    }, 100);
  };

  const spawnObstacle = () => {
    const x = Math.random() * (SCREEN_WIDTH - OBSTACLE_SIZE - 40) + 20;
    const y = new Animated.Value(-OBSTACLE_SIZE);
    const speed = 3000 + Math.random() * 2000;

    const obstacle: Obstacle = {
      id: obstacleIdRef.current++,
      x,
      y,
      speed,
    };

    setObstacles(prev => [...prev, obstacle]);

    Animated.timing(y, {
      toValue: GAME_AREA_HEIGHT + OBSTACLE_SIZE,
      duration: speed,
      useNativeDriver: true,
    }).start(() => {
      setObstacles(prev => prev.filter(o => o.id !== obstacle.id));
    });
  };

  const moveShip = (direction: 'left' | 'right') => {
    if (gameState !== 'playing') return;

    const moveAmount = 50;
    setShipX(prev => {
      if (direction === 'left') {
        return Math.max(20, prev - moveAmount);
      } else {
        return Math.min(SCREEN_WIDTH - SHIP_SIZE - 20, prev + moveAmount);
      }
    });

    // Animate ship bounce
    Animated.sequence([
      Animated.timing(shipY, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shipY, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const endGame = async (survived: boolean) => {
    clearAllIntervals();
    setGameState('ended');

    // Calculate reward based on survival time and score
    const earnedReward = survived ? Math.floor(score / 10) + 20 : Math.floor(score / 20);
    setReward(earnedReward);

    // Add points to user stats
    if (earnedReward > 0) {
      try {
        await fetch(`${API_URL}/api/stats/add-points?points=${earnedReward}`, {
          method: 'POST',
        });
        addPoints(earnedReward);
        
        // Refresh stats
        const statsRes = await fetch(`${API_URL}/api/stats`);
        const statsData = await statsRes.json();
        setUserStats(statsData);
      } catch (error) {
        console.error('Error adding game points:', error);
      }
    }
  };

  const exitGame = () => {
    clearAllIntervals();
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={exitGame} style={styles.exitButton}>
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Ship Dodger</Text>
        <View style={styles.scoreContainer}>
          <Ionicons name="flash" size={18} color="#FBBF24" />
          <Text style={styles.scoreText}>{score}</Text>
        </View>
      </View>

      {/* Timer */}
      {gameState === 'playing' && (
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>{timeLeft}s</Text>
        </View>
      )}

      {/* Game Area */}
      <View style={styles.gameArea}>
        {gameState === 'ready' && (
          <View style={styles.readyScreen}>
            <Ionicons name="rocket" size={80} color="#E879F9" />
            <Text style={styles.readyTitle}>Ship Dodger</Text>
            <Text style={styles.readySubtitle}>Dodge the asteroids!</Text>
            <Text style={styles.readyInstructions}>
              Tap left or right to move your ship
            </Text>
            <TouchableOpacity style={styles.startButton} onPress={startGame}>
              <Ionicons name="play" size={24} color="#0D0D1A" />
              <Text style={styles.startButtonText}>Start Game</Text>
            </TouchableOpacity>
          </View>
        )}

        {gameState === 'playing' && (
          <>
            {/* Obstacles */}
            {obstacles.map(obstacle => (
              <Animated.View
                key={obstacle.id}
                style={[
                  styles.obstacle,
                  {
                    left: obstacle.x,
                    transform: [{ translateY: obstacle.y }],
                  },
                ]}
              >
                <Ionicons name="planet" size={OBSTACLE_SIZE} color="#EF4444" />
              </Animated.View>
            ))}

            {/* Ship */}
            <Animated.View
              style={[
                styles.ship,
                {
                  left: shipX,
                  bottom: 100,
                  transform: [{ translateY: shipY }],
                },
              ]}
            >
              <Ionicons name="rocket" size={SHIP_SIZE} color="#22C55E" />
            </Animated.View>

            {/* Controls */}
            <View style={styles.controls}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={() => moveShip('left')}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-back" size={40} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={() => moveShip('right')}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-forward" size={40} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </>
        )}

        {gameState === 'ended' && (
          <View style={styles.endScreen}>
            <Ionicons name="trophy" size={80} color="#FBBF24" />
            <Text style={styles.endTitle}>Game Over!</Text>
            <Text style={styles.endScore}>Score: {score}</Text>
            <View style={styles.rewardContainer}>
              <Ionicons name="flash" size={24} color="#FBBF24" />
              <Text style={styles.rewardText}>+{reward} points</Text>
            </View>
            <View style={styles.endActions}>
              <TouchableOpacity style={styles.playAgainButton} onPress={startGame}>
                <Ionicons name="refresh" size={20} color="#0D0D1A" />
                <Text style={styles.playAgainText}>Play Again</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.doneButton} onPress={exitGame}>
                <Text style={styles.doneText}>Done</Text>
                <Ionicons name="checkmark" size={20} color="#0D0D1A" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D1A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  exitButton: {
    padding: 4,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F1F3A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  scoreText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  timerContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  timerText: {
    color: '#E879F9',
    fontSize: 32,
    fontWeight: '700',
  },
  gameArea: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  readyScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  readyTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    marginTop: 20,
  },
  readySubtitle: {
    color: '#9CA3AF',
    fontSize: 18,
    marginTop: 8,
  },
  readyInstructions: {
    color: '#6B7280',
    fontSize: 14,
    marginTop: 24,
    textAlign: 'center',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E879F9',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 28,
    marginTop: 40,
    gap: 10,
  },
  startButtonText: {
    color: '#0D0D1A',
    fontSize: 18,
    fontWeight: '600',
  },
  obstacle: {
    position: 'absolute',
    width: OBSTACLE_SIZE,
    height: OBSTACLE_SIZE,
  },
  ship: {
    position: 'absolute',
    width: SHIP_SIZE,
    height: SHIP_SIZE,
  },
  controls: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 30,
  },
  controlButton: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#8B5CF6',
  },
  endScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  endTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    marginTop: 20,
  },
  endScore: {
    color: '#9CA3AF',
    fontSize: 24,
    marginTop: 12,
  },
  rewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 20,
    gap: 8,
  },
  rewardText: {
    color: '#FBBF24',
    fontSize: 20,
    fontWeight: '600',
  },
  endActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 40,
  },
  playAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
    gap: 8,
  },
  playAgainText: {
    color: '#0D0D1A',
    fontSize: 16,
    fontWeight: '600',
  },
  doneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22C55E',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
    gap: 8,
  },
  doneText: {
    color: '#0D0D1A',
    fontSize: 16,
    fontWeight: '600',
  },
});
