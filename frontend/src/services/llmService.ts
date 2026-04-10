import { initLlama, LlamaContext } from 'llama.rn';
import { getSentence, updateSentenceAnalysis } from '../database/db';

let llamaContext: any = null;

export const loadModel = async (modelPath: string) => {
    if (llamaContext) {
        try { await llamaContext.release(); } catch (e) { }
    }
    llamaContext = await initLlama({
        model: modelPath,
        use_mlock: true,
        n_ctx: 2048,
        n_gpu_layers: 50,
    });
    return true;
};

export const isModelLoaded = () => {
    return llamaContext !== null;
};

const getCompletion = async (prompt: string, maxTokens: number = 200) => {
    if (!llamaContext) {
        throw new Error("Local LLM model is not loaded. Please download and load a model in the Models tab.");
    }
    const result = await llamaContext.completion({
        prompt: prompt,
        n_predict: maxTokens,
        temperature: 0.7,
    });
    return result.text;
};

const parseJsonOutput = (text: string, defaultObj: any) => {
    try {
        const clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        const start = clean.indexOf('{');
        const end = clean.lastIndexOf('}');
        if (start >= 0 && end >= 0) {
            return JSON.parse(clean.substring(start, end + 1));
        }
        return JSON.parse(clean);
    } catch (e) {
        console.warn("LLM JSON Parse Error:", text);
        return defaultObj;
    }
};

export const analyzeSentenceOffline = async (sentenceId: string) => {
    const sentence = await getSentence(sentenceId);
    const prompt = `<|im_start|>system\nYou are a Korean expert. Respond ONLY with valid JSON. Do not add markdown or conversational text.<|im_end|>\n<|im_start|>user\nAnalyze this Korean sentence: "${sentence.sentence_ko}". JSON format: {"reference_meaning": string, "romanization": string, "key_points": [string, string, string], "difficulty_level": string}<|im_end|>\n<|im_start|>assistant\n{`;

    try {
        let response = await getCompletion(prompt, 200);
        // Prepend { since it was part of the prompt to force JSON
        response = "{" + response;

        const defaultFallback = {
            reference_meaning: "Analysis failed to parse",
            romanization: "",
            key_points: ["Model output was not valid JSON"],
            difficulty_level: "A1"
        };

        const analysis = parseJsonOutput(response, defaultFallback);
        await updateSentenceAnalysis(sentenceId, analysis);

    } catch (e) {
        console.warn("LLM Warning:", e);
        await updateSentenceAnalysis(sentenceId, {
            reference_meaning: `Local AI Error: ${e}`,
            romanization: "",
            key_points: [],
            difficulty_level: "A1"
        });
    }
};

export const translateWordOffline = async (word: string) => {
    const prompt = `<|im_start|>system\nYou are a Korean dictionary. Respond ONLY with valid JSON.<|im_end|>\n<|im_start|>user\nTranslate "${word}". JSON format: {"translation": string, "romanization": string, "part_of_speech": string}<|im_end|>\n<|im_start|>assistant\n{`;

    try {
        let response = await getCompletion(prompt, 100);
        response = "{" + response;
        const result = parseJsonOutput(response, { translation: "Error parsing", romanization: "", part_of_speech: "" });
        return { word, ...result };
    } catch (e) {
        return { word, translation: "Local AI Error", romanization: "-", part_of_speech: "?" };
    }
};

export const evaluateAnswerOffline = async (sentenceId: string, userAnswer: string, hintLevel: number) => {
    const sentence = await getSentence(sentenceId);
    const prompt = `<|im_start|>system\nYou are a Korean teacher. Compare the student's translation to the reference meaning. Evaluate semantic accuracy. Respond ONLY with JSON.<|im_end|>\n<|im_start|>user\nKorean: ${sentence.sentence_ko}\nReference: ${sentence.reference_meaning}\nStudent: ${userAnswer}\n\nJSON Output: {"semantic_score": number (0-100), "missing_points": [string], "hint": string (max 1 sentence)}<|im_end|>\n<|im_start|>assistant\n{`;

    try {
        let response = await getCompletion(prompt, 150);
        response = "{" + response;
        const evalData = parseJsonOutput(response, { semantic_score: 50, missing_points: [], hint: "Keep trying." });

        const semantic_score = evalData.semantic_score || 50;
        const final_score = semantic_score;
        const passed = final_score >= 80;
        const attempts = 1;
        const hints_used = hintLevel;
        let points_earned = 0;

        if (passed) {
            points_earned = Math.max(10, 100 - (hints_used * 15));
        }

        return {
            score: final_score,
            passed: passed,
            missing_points: evalData.missing_points || [],
            hint: evalData.hint || "Keep practicing!",
            semantic_score: semantic_score,
            concept_score: semantic_score,
            points_earned
        };
    } catch (e) {
        return {
            score: 0, passed: false, missing_points: [], hint: `AI Error: ${e}`, semantic_score: 0, concept_score: 0, points_earned: 0
        };
    }
};

export const getHintOffline = async (sentenceId: string, level: number) => {
    const sentence = await getSentence(sentenceId);

    if (level === 1) return { level, hint: "Focus on the verb ending." };
    if (level >= 3) return { level, hint: sentence.reference_meaning || "Error: No reference" };

    const prompt = `<|im_start|>system\nYou are a teacher. Give a very short 1-sentence hint for dissecting this Korean sentence, without revealing the full English translation.<|im_end|>\n<|im_start|>user\nSentence: ${sentence.sentence_ko}<|im_end|>\n<|im_start|>assistant\nHint: `;

    try {
        const response = await getCompletion(prompt, 50);
        return { level, hint: response.trim() };
    } catch (e) {
        return { level, hint: "AI Error: Model not loaded." };
    }
};
