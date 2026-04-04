import { create } from 'zustand';

interface UserStats {
  total_points: number;
  streak_count: number;
  sentences_completed: number;
  total_attempts: number;
  accuracy_percent: number;
}

interface Sentence {
  id: string;
  text_id: string;
  sentence_ko: string;
  order_index: number;
  romanization?: string;
  reference_meaning?: string;
  key_points: string[];
  difficulty_level: string;
}

interface EvaluationResult {
  score: number;
  passed: boolean;
  missing_points: string[];
  hint: string;
  semantic_score: number;
  concept_score: number;
  points_earned: number;
}

interface AppState {
  // User Stats
  userStats: UserStats;
  setUserStats: (stats: UserStats) => void;
  addPoints: (points: number) => void;

  // Current Study Session
  currentTextId: string | null;
  currentSentenceIndex: number;
  sentences: Sentence[];
  setCurrentTextId: (textId: string | null) => void;
  setSentences: (sentences: Sentence[]) => void;
  setCurrentSentenceIndex: (index: number) => void;
  nextSentence: () => void;

  // Last Evaluation
  lastEvaluation: EvaluationResult | null;
  setLastEvaluation: (result: EvaluationResult | null) => void;

  // Hint Level
  currentHintLevel: number;
  incrementHintLevel: () => void;
  resetHintLevel: () => void;

  // Game State
  showGame: boolean;
  setShowGame: (show: boolean) => void;
  gameReward: number;
  setGameReward: (reward: number) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // User Stats
  userStats: {
    total_points: 0,
    streak_count: 0,
    sentences_completed: 0,
    total_attempts: 0,
    accuracy_percent: 0,
  },
  setUserStats: (stats) => set({ userStats: stats }),
  addPoints: (points) =>
    set((state) => ({
      userStats: {
        ...state.userStats,
        total_points: state.userStats.total_points + points,
      },
    })),

  // Current Study Session
  currentTextId: null,
  currentSentenceIndex: 0,
  sentences: [],
  setCurrentTextId: (textId) => set({ currentTextId: textId, currentSentenceIndex: 0 }),
  setSentences: (sentences) => set({ sentences }),
  setCurrentSentenceIndex: (index) => set({ currentSentenceIndex: index }),
  nextSentence: () => {
    const { currentSentenceIndex, sentences } = get();
    if (currentSentenceIndex < sentences.length - 1) {
      set({ currentSentenceIndex: currentSentenceIndex + 1, currentHintLevel: 0 });
    }
  },

  // Last Evaluation
  lastEvaluation: null,
  setLastEvaluation: (result) => set({ lastEvaluation: result }),

  // Hint Level
  currentHintLevel: 0,
  incrementHintLevel: () =>
    set((state) => ({ currentHintLevel: Math.min(state.currentHintLevel + 1, 4) })),
  resetHintLevel: () => set({ currentHintLevel: 0 }),

  // Game State
  showGame: false,
  setShowGame: (show) => set({ showGame: show }),
  gameReward: 0,
  setGameReward: (reward) => set({ gameReward: reward }),
}));
