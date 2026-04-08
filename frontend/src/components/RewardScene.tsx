import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface RewardSceneProps {
  pointsEarned: number;
  onComplete: () => void;
  sceneType?: 'ship' | 'blocks' | 'random';
}

// Ship dodging obstacles scene
const ShipDodgeScene = ({ onAnimationEnd }: { onAnimationEnd: () => void }) => {
  const shipY = useRef(new Animated.Value(SCREEN_HEIGHT * 0.4)).current;
  const shipX = useRef(new Animated.Value(60)).current;
  
  const obstacles = [
    { id: 1, x: useRef(new Animated.Value(SCREEN_WIDTH)).current, y: 80 },
    { id: 2, x: useRef(new Animated.Value(SCREEN_WIDTH + 150)).current, y: 200 },
    { id: 3, x: useRef(new Animated.Value(SCREEN_WIDTH + 300)).current, y: 120 },
    { id: 4, x: useRef(new Animated.Value(SCREEN_WIDTH + 400)).current, y: 280 },
    { id: 5, x: useRef(new Animated.Value(SCREEN_WIDTH + 500)).current, y: 160 },
  ];

  const stars = Array.from({ length: 15 }).map(() => ({
    x: useRef(new Animated.Value(Math.random() * SCREEN_WIDTH)).current,
    y: Math.random() * SCREEN_HEIGHT * 0.5,
    size: Math.random() * 3 + 1,
    opacity: useRef(new Animated.Value(Math.random())).current,
  }));

  useEffect(() => {
    // Ship movement - dodging pattern
    const shipAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shipY, { toValue: SCREEN_HEIGHT * 0.25, duration: 400, useNativeDriver: true }),
        Animated.timing(shipY, { toValue: SCREEN_HEIGHT * 0.45, duration: 500, useNativeDriver: true }),
        Animated.timing(shipY, { toValue: SCREEN_HEIGHT * 0.3, duration: 350, useNativeDriver: true }),
        Animated.timing(shipY, { toValue: SCREEN_HEIGHT * 0.5, duration: 450, useNativeDriver: true }),
        Animated.timing(shipY, { toValue: SCREEN_HEIGHT * 0.35, duration: 400, useNativeDriver: true }),
      ])
    );

    // Ship thrust forward
    const thrustAnimation = Animated.timing(shipX, {
      toValue: SCREEN_WIDTH * 0.35,
      duration: 3000,
      useNativeDriver: true,
    });

    // Obstacles moving left
    const obstacleAnimations = obstacles.map((obs, index) => 
      Animated.timing(obs.x, {
        toValue: -60,
        duration: 2500 - index * 100,
        useNativeDriver: true,
      })
    );

    // Star twinkling
    const starAnimations = stars.map(star =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(star.opacity, { toValue: 1, duration: 500 + Math.random() * 500, useNativeDriver: true }),
          Animated.timing(star.opacity, { toValue: 0.2, duration: 500 + Math.random() * 500, useNativeDriver: true }),
        ])
      )
    );

    shipAnimation.start();
    thrustAnimation.start();
    Animated.parallel(obstacleAnimations).start();
    starAnimations.forEach(a => a.start());

    const timer = setTimeout(onAnimationEnd, 3500);
    return () => {
      clearTimeout(timer);
      shipAnimation.stop();
    };
  }, []);

  return (
    <View style={styles.sceneContainer}>
      {/* Stars background */}
      {stars.map((star, index) => (
        <Animated.View
          key={index}
          style={[
            styles.star,
            {
              left: star.x,
              top: star.y,
              width: star.size,
              height: star.size,
              opacity: star.opacity,
            },
          ]}
        />
      ))}

      {/* Obstacles */}
      {obstacles.map((obs) => (
        <Animated.View
          key={obs.id}
          style={[
            styles.obstacle,
            {
              top: obs.y,
              transform: [{ translateX: obs.x }],
            },
          ]}
        >
          <Ionicons name="planet" size={40} color="#EF4444" />
        </Animated.View>
      ))}

      {/* Ship */}
      <Animated.View
        style={[
          styles.ship,
          {
            transform: [
              { translateY: shipY },
              { translateX: shipX },
            ],
          },
        ]}
      >
        <View style={styles.shipGlow} />
        <Ionicons name="rocket" size={48} color="#22C55E" />
        {/* Engine flame */}
        <View style={styles.engineFlame}>
          <Ionicons name="flame" size={20} color="#FBBF24" />
        </View>
      </Animated.View>
    </View>
  );
};

// Block fitting scene (Tetris-like)
const BlockFitScene = ({ onAnimationEnd }: { onAnimationEnd: () => void }) => {
  const blockY = useRef(new Animated.Value(-100)).current;
  const blockRotation = useRef(new Animated.Value(0)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const rowScale = useRef(new Animated.Value(1)).current;
  const [showPerfect, setShowPerfect] = useState(false);

  const gridBlocks = [
    // Bottom row with gap
    { x: 0, y: 3, color: '#8B5CF6' },
    { x: 1, y: 3, color: '#8B5CF6' },
    { x: 2, y: 3, color: '#8B5CF6' },
    // Gap at x: 3
    { x: 4, y: 3, color: '#3B82F6' },
    { x: 5, y: 3, color: '#3B82F6' },
    
    // Second row
    { x: 0, y: 2, color: '#22C55E' },
    { x: 1, y: 2, color: '#22C55E' },
    { x: 4, y: 2, color: '#E879F9' },
    { x: 5, y: 2, color: '#E879F9' },
    
    // Third row partial
    { x: 0, y: 1, color: '#F97316' },
    { x: 5, y: 1, color: '#FBBF24' },
  ];

  useEffect(() => {
    // Block falling and rotating
    Animated.sequence([
      Animated.parallel([
        Animated.timing(blockY, {
          toValue: 220,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(blockRotation, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      // Perfect fit flash
      Animated.timing(flashOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(flashOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowPerfect(true);
      // Row clear animation
      Animated.sequence([
        Animated.timing(rowScale, {
          toValue: 1.1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(rowScale, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    });

    const timer = setTimeout(onAnimationEnd, 3500);
    return () => clearTimeout(timer);
  }, []);

  const BLOCK_SIZE = 45;
  const GRID_OFFSET_X = (SCREEN_WIDTH - 6 * BLOCK_SIZE) / 2;
  const GRID_OFFSET_Y = SCREEN_HEIGHT * 0.35;

  return (
    <View style={styles.sceneContainer}>
      {/* Grid background */}
      <View style={[styles.gridBackground, { left: GRID_OFFSET_X - 5, top: GRID_OFFSET_Y - 5 }]}>
        {/* Grid lines */}
        {Array.from({ length: 7 }).map((_, i) => (
          <View
            key={`v${i}`}
            style={[
              styles.gridLine,
              {
                left: i * BLOCK_SIZE,
                top: 0,
                width: 1,
                height: 4 * BLOCK_SIZE + 10,
              },
            ]}
          />
        ))}
        {Array.from({ length: 5 }).map((_, i) => (
          <View
            key={`h${i}`}
            style={[
              styles.gridLine,
              {
                left: 0,
                top: i * BLOCK_SIZE,
                width: 6 * BLOCK_SIZE + 10,
                height: 1,
              },
            ]}
          />
        ))}
      </View>

      {/* Existing blocks */}
      {gridBlocks.map((block, index) => (
        <Animated.View
          key={index}
          style={[
            styles.gridBlock,
            {
              left: GRID_OFFSET_X + block.x * BLOCK_SIZE,
              top: GRID_OFFSET_Y + block.y * BLOCK_SIZE,
              backgroundColor: block.color,
              transform: block.y === 3 ? [{ scale: rowScale }] : [],
            },
          ]}
        />
      ))}

      {/* Falling block */}
      <Animated.View
        style={[
          styles.fallingBlock,
          {
            left: GRID_OFFSET_X + 3 * BLOCK_SIZE,
            transform: [
              { translateY: blockY },
              { rotate: blockRotation.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '360deg'],
              })},
            ],
          },
        ]}
      >
        <View style={[styles.gridBlock, { backgroundColor: '#E879F9' }]} />
      </Animated.View>

      {/* Flash effect */}
      <Animated.View
        style={[
          styles.flashEffect,
          { opacity: flashOpacity },
        ]}
      />

      {/* Perfect text */}
      {showPerfect && (
        <View style={styles.perfectContainer}>
          <Text style={styles.perfectText}>PERFECT FIT!</Text>
        </View>
      )}
    </View>
  );
};

export default function RewardScene({ pointsEarned, onComplete, sceneType = 'random' }: RewardSceneProps) {
  const fadeIn = useRef(new Animated.Value(0)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;
  const pointsScale = useRef(new Animated.Value(0)).current;
  const [scene, setScene] = useState<'ship' | 'blocks'>('ship');
  const [showPoints, setShowPoints] = useState(false);

  useEffect(() => {
    // Determine scene type
    if (sceneType === 'random') {
      setScene(Math.random() > 0.5 ? 'ship' : 'blocks');
    } else {
      setScene(sceneType);
    }

    // Fade in
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleAnimationEnd = () => {
    setShowPoints(true);
    Animated.spring(pointsScale, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();

    // Fade out and complete
    setTimeout(() => {
      Animated.timing(fadeOut, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        onComplete();
      });
    }, 1000);
  };

  return (
    <Animated.View style={[styles.container, { opacity: Animated.multiply(fadeIn, fadeOut) }]}>
      <View style={styles.overlay}>
        {/* Scene title */}
        <View style={styles.titleContainer}>
          <Ionicons name="checkmark-circle" size={32} color="#22C55E" />
          <Text style={styles.title}>Excellent!</Text>
        </View>

        {/* Animation scene */}
        {scene === 'ship' ? (
          <ShipDodgeScene onAnimationEnd={handleAnimationEnd} />
        ) : (
          <BlockFitScene onAnimationEnd={handleAnimationEnd} />
        )}

        {/* Points earned */}
        {showPoints && (
          <Animated.View style={[styles.pointsContainer, { transform: [{ scale: pointsScale }] }]}>
            <Ionicons name="flash" size={28} color="#FBBF24" />
            <Text style={styles.pointsText}>+{pointsEarned}</Text>
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(13, 13, 26, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    top: 60,
    gap: 10,
  },
  title: {
    color: '#22C55E',
    fontSize: 28,
    fontWeight: '700',
  },
  sceneContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.6,
    position: 'relative',
    overflow: 'hidden',
  },
  // Ship scene styles
  star: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
  obstacle: {
    position: 'absolute',
  },
  ship: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  shipGlow: {
    position: 'absolute',
    width: 60,
    height: 60,
    backgroundColor: 'rgba(34, 197, 94, 0.3)',
    borderRadius: 30,
    left: -6,
    top: -6,
  },
  engineFlame: {
    position: 'absolute',
    left: -15,
    top: 14,
    transform: [{ rotate: '-90deg' }],
  },
  // Block scene styles
  gridBackground: {
    position: 'absolute',
    width: 280,
    height: 190,
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(107, 114, 128, 0.3)',
  },
  gridBlock: {
    position: 'absolute',
    width: 43,
    height: 43,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  fallingBlock: {
    position: 'absolute',
    top: 0,
  },
  flashEffect: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
  },
  perfectContainer: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
  },
  perfectText: {
    color: '#FBBF24',
    fontSize: 32,
    fontWeight: '800',
    textShadowColor: 'rgba(251, 191, 36, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  // Points styles
  pointsContainer: {
    position: 'absolute',
    bottom: 100,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#FBBF24',
    gap: 8,
  },
  pointsText: {
    color: '#FBBF24',
    fontSize: 32,
    fontWeight: '700',
  },
});
