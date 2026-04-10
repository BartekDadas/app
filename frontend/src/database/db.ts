import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES } from './schema';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { splitKoreanText } from '../utils/textSplitter';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export const getDb = async () => {
    if (dbInstance) return dbInstance;
    dbInstance = await SQLite.openDatabaseAsync('midnightscholar.db');
    // Initialize tables
    await dbInstance.execAsync(CREATE_TABLES);
    return dbInstance;
};

// ==================== TEXT MANAGEMENT ====================

export const createText = async (title: string, raw_text: string) => {
    const db = await getDb();
    const textId = uuidv4();
    const sentences = splitKoreanText(raw_text);

    if (sentences.length === 0) {
        throw new Error('No valid sentences found in text');
    }

    // Use a transaction
    await db.withTransactionAsync(async () => {
        await db.runAsync(
            'INSERT INTO texts (id, title, raw_text, sentence_count) VALUES (?, ?, ?, ?)',
            [textId, title, raw_text, sentences.length]
        );

        for (let i = 0; i < sentences.length; i++) {
            await db.runAsync(
                'INSERT INTO sentences (id, text_id, sentence_ko, order_index) VALUES (?, ?, ?, ?)',
                [uuidv4(), textId, sentences[i], i]
            );
        }
    });

    return { id: textId, title, sentence_count: sentences.length, created_at: new Date().toISOString() };
};

export const getTexts = async () => {
    const db = await getDb();
    return await db.getAllAsync('SELECT * FROM texts ORDER BY created_at DESC');
};

export const deleteText = async (textId: string) => {
    const db = await getDb();
    await db.runAsync('DELETE FROM texts WHERE id = ?', [textId]);
    await db.runAsync('DELETE FROM sentences WHERE text_id = ?', [textId]);
    await db.runAsync('DELETE FROM user_progress WHERE text_id = ?', [textId]);
};

// ==================== SENTENCES ====================

export const getSentences = async (textId: string) => {
    const db = await getDb();
    const rows: any[] = await db.getAllAsync('SELECT * FROM sentences WHERE text_id = ? ORDER BY order_index ASC', [textId]);
    return rows.map(r => ({
        ...r,
        key_points: r.key_points ? JSON.parse(r.key_points) : [],
        analyzed: r.analyzed === 1
    }));
};

export const getSentence = async (sentenceId: string) => {
    const db = await getDb();
    const row: any = await db.getFirstAsync('SELECT * FROM sentences WHERE id = ?', [sentenceId]);
    if (!row) throw new Error('Sentence not found');
    return {
        ...row,
        key_points: row.key_points ? JSON.parse(row.key_points) : [],
        analyzed: row.analyzed === 1
    };
};

export const updateSentenceAnalysis = async (sentenceId: string, analysis: any) => {
    const db = await getDb();
    await db.runAsync(
        'UPDATE sentences SET reference_meaning = ?, romanization = ?, key_points = ?, difficulty_level = ?, analyzed = 1 WHERE id = ?',
        [
            analysis.reference_meaning || '',
            analysis.romanization || '',
            JSON.stringify(analysis.key_points || []),
            analysis.difficulty_level || 'A1',
            sentenceId
        ]
    );
};

// ==================== USER STATS ====================

export const getUserStats = async () => {
    const db = await getDb();
    const stats: any = await db.getFirstAsync('SELECT * FROM user_stats WHERE user_id = ?', ['default_user']);
    if (!stats) return null;
    return {
        ...stats,
        accuracy_percent: stats.total_attempts > 0 ? Number(((stats.sentences_completed / stats.total_attempts) * 100).toFixed(1)) : 0
    };
};

export const getProgressForText = async (textId: string) => {
    const db = await getDb();
    const rows: any[] = await db.getAllAsync('SELECT * FROM user_progress WHERE text_id = ?', [textId]);
    return rows.map(r => ({
        ...r,
        passed: r.passed === 1
    }));
};

export const logUserProgress = async (sentenceId: string, textId: string, passed: boolean, bestScore: number, hintsUsed: number, pointsEarned: number) => {
    const db = await getDb();

    await db.withTransactionAsync(async () => {
        // Query existing progress
        const progress: any = await db.getFirstAsync('SELECT * FROM user_progress WHERE sentence_id = ?', [sentenceId]);

        const attempts = (progress ? progress.attempts : 0) + 1;
        const maxHintsUsed = progress ? Math.max(progress.hints_used, hintsUsed) : hintsUsed;
        const isPassed = passed ? 1 : (progress && progress.passed ? 1 : 0);
        let maxScore = progress ? Math.max(progress.best_score, bestScore) : bestScore;
        if (passed && (!progress || !progress.passed)) {
            maxScore = bestScore;
        }

        if (progress) {
            await db.runAsync(
                'UPDATE user_progress SET attempts = ?, passed = ?, best_score = ?, hints_used = ?, last_attempt = CURRENT_TIMESTAMP WHERE id = ?',
                [attempts, isPassed, maxScore, maxHintsUsed, progress.id]
            );
        } else {
            await db.runAsync(
                'INSERT INTO user_progress (id, sentence_id, text_id, attempts, passed, best_score, hints_used) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [uuidv4(), sentenceId, textId, attempts, isPassed, maxScore, maxHintsUsed]
            );
        }

        // Only add points once per sentence
        if (passed && (!progress || !progress.passed)) {
            await db.runAsync(
                'UPDATE user_stats SET total_points = total_points + ?, sentences_completed = sentences_completed + 1, total_attempts = total_attempts + 1, last_activity = CURRENT_TIMESTAMP WHERE user_id = ?',
                [pointsEarned, 'default_user']
            );
        } else {
            // Just update attempts count
            await db.runAsync(
                'UPDATE user_stats SET total_attempts = total_attempts + 1, last_activity = CURRENT_TIMESTAMP WHERE user_id = ?',
                ['default_user']
            );
        }
    });
};
