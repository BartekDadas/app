import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import { loadModel, isModelLoaded } from '../../src/services/llmService';

// Example small models that work well on mobile
const RECOMMENDED_MODELS = [
    {
        name: 'Qwen2.5 0.5B Instruct (Q4)',
        url: 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf?download=true',
        size: '398 MB',
        filename: 'qwen2.5-0.5b-instruct-q4_k_m.gguf'
    },
    {
        name: 'Llama-3.2-1B-Instruct (Q4)',
        url: 'https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf?download=true',
        size: '792 MB',
        filename: 'Llama-3.2-1B-Instruct-Q4_K_M.gguf'
    },
    {
        name: 'Gemma 4 2B Instruct (Q4)',
        url: 'https://huggingface.co/bartowski/gemma-4-2b-it-GGUF/resolve/main/gemma-4-2b-it-Q4_K_M.gguf?download=true',
        size: '2.5 GB',
        filename: 'gemma-4-2b-it-Q4_K_M.gguf'
    }
];

export default function ModelsScreen() {
    const [downloading, setDownloading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [downloadTask, setDownloadTask] = useState<FileSystem.DownloadResumable | null>(null);
    const [localModels, setLocalModels] = useState<string[]>([]);
    const [activeModel, setActiveModel] = useState<string | null>(null);
    const [customUrl, setCustomUrl] = useState('');

    useEffect(() => {
        refreshLocalModels();
    }, []);

    const refreshLocalModels = async () => {
        try {
            const files = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory!);
            const ggufs = files.filter(f => f.endsWith('.gguf'));
            setLocalModels(ggufs);
        } catch (e) {
            console.error(e);
        }
    };

    const startDownload = async (model: typeof RECOMMENDED_MODELS[0]) => {
        const fileUri = `${FileSystem.documentDirectory}${model.filename}`;
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        if (fileInfo.exists) {
            Alert.alert('Exists', 'Model is already downloaded!');
            return;
        }

        setDownloading(true);
        setProgress(0);

        // Hugging Face uses 302 redirects for GGUF files. expo-file-system sometimes fails to follow them natively.
        // We use fetch with method HEAD to follow redirects and get the final CDN URL.
        let finalUrl = model.url;
        try {
            const headResponse = await fetch(model.url, { method: 'HEAD' });
            if (headResponse.url) {
                finalUrl = headResponse.url;
            }
        } catch (headErr) {
            console.warn("HEAD request failed, falling back to GET to resolve redirect.", headErr);
            // Fallback: sometimes HEAD is blocked, we can abort a GET request as soon as we have headers
            const ctrl = new AbortController();
            const getResponse = await fetch(model.url, { method: 'GET', signal: ctrl.signal });
            if (getResponse.url) finalUrl = getResponse.url;
            ctrl.abort(); // Cancel the actual body download
        }

        const task = FileSystem.createDownloadResumable(
            finalUrl,
            fileUri,
            {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
                    'Accept': '*/*, application/octet-stream',
                    'Accept-Encoding': 'gzip, deflate, br'
                }
            },
            (downloadProgress) => {
                const p = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
                setProgress(p);
            }
        );

        setDownloadTask(task);

        try {
            const result = await task.downloadAsync();
            if (result) {
                Alert.alert('Success', 'Model downloaded successfully');
                refreshLocalModels();
            }
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Download failed or was cancelled');
        } finally {
            setDownloading(false);
            setDownloadTask(null);
        }
    };

    const cancelDownload = async () => {
        if (downloadTask) {
            await downloadTask.cancelAsync();
            setDownloadTask(null);
            setDownloading(false);
            setProgress(0);
        }
    };

    const handleCustomDownload = () => {
        if (!customUrl || !customUrl.trim()) return;
        try {
            const urlObj = new URL(customUrl.trim());
            let filename = urlObj.pathname.split('/').pop();
            if (!filename || !filename.endsWith('.gguf')) {
                filename = `custom_${Date.now()}.gguf`;
            }
            startDownload({
                name: 'Custom Model',
                url: customUrl.trim(),
                size: 'Unknown',
                filename
            });
            setCustomUrl('');
        } catch (e) {
            Alert.alert('Invalid URL', 'Please enter a valid URL');
        }
    };

    const importLocalModel = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: false,
            });

            if (result.canceled) return;

            const file = result.assets[0];
            let filename = file.name;

            if (!filename.endsWith('.gguf')) {
                Alert.alert('Warning', 'The selected file does not have a .gguf extension. It might not work properly.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Import Anyway', onPress: () => processFileImport(file.uri, filename) }
                ]);
            } else {
                processFileImport(file.uri, filename);
            }
        } catch (error) {
            console.error('Import error:', error);
            Alert.alert('Error', 'Failed to pick the file');
        }
    };

    const processFileImport = async (sourceUri: string, filename: string) => {
        try {
            const destinationUri = `${FileSystem.documentDirectory}${filename}`;
            const fileInfo = await FileSystem.getInfoAsync(destinationUri);
            if (fileInfo.exists) {
                Alert.alert('Exists', 'Model with this name already exists in the app.');
                return;
            }

            Alert.alert('Importing', 'Copying model to app storage... this may take a moment.');
            await FileSystem.copyAsync({
                from: sourceUri,
                to: destinationUri
            });

            Alert.alert('Success', 'Model imported successfully');
            refreshLocalModels();
        } catch (error) {
            console.error('Copy error:', error);
            Alert.alert('Error', 'Failed to copy the file to app storage');
        }
    };

    const activateModel = async (filename: string) => {
        try {
            Alert.alert('Loading', 'Loading AI into RAM... This may take a moment.');
            const fileUri = `${FileSystem.documentDirectory}${filename}`;
            await loadModel(fileUri);
            setActiveModel(filename);
            Alert.alert('Success', 'Model loaded into RAM!');
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to load model. Device might not have enough RAM.');
        }
    };

    const deleteModel = async (filename: string) => {
        try {
            await FileSystem.deleteAsync(`${FileSystem.documentDirectory}${filename}`);
            refreshLocalModels();
            if (activeModel === filename) setActiveModel(null);
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Offline AI Models</Text>
                <Text style={styles.headerSubtitle}>Download GGUF models to run locally</Text>
            </View>

            <ScrollView style={styles.content}>
                <Text style={styles.sectionTitle}>RECOMMENDED MODELS</Text>
                {RECOMMENDED_MODELS.map(model => (
                    <View key={model.filename} style={styles.card}>
                        <View>
                            <Text style={styles.cardTitle}>{model.name}</Text>
                            <Text style={styles.cardMeta}>{model.size}</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => startDownload(model)}
                            disabled={downloading}
                        >
                            <Ionicons name="cloud-download" size={20} color="#0D0D1A" />
                        </TouchableOpacity>
                    </View>
                ))}

                {downloading && (
                    <View style={styles.downloadContainer}>
                        <Text style={styles.downloadText}>Downloading... {(progress * 100).toFixed(1)}%</Text>
                        <View style={styles.progressBar}>
                            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                        </View>
                        <TouchableOpacity style={styles.cancelBtn} onPress={cancelDownload}>
                            <Text style={styles.cancelTxt}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <Text style={[styles.sectionTitle, { marginTop: 24 }]}>CUSTOM MODEL URL</Text>
                <View style={[styles.card, { flexDirection: 'column', alignItems: 'stretch' }]}>
                    <TextInput
                        style={{ backgroundColor: '#0D0D1A', color: '#FFF', padding: 12, borderRadius: 8, marginBottom: 12 }}
                        placeholder="https://huggingface.co/.../model.gguf"
                        placeholderTextColor="#6B7280"
                        value={customUrl}
                        onChangeText={setCustomUrl}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    <TouchableOpacity
                        style={[styles.actionButton, { alignItems: 'center', opacity: (!customUrl.trim() || downloading) ? 0.5 : 1 }]}
                        onPress={handleCustomDownload}
                        disabled={downloading || !customUrl.trim()}
                    >
                        <Text style={{ color: '#FFF', fontWeight: '600' }}>Download Custom Model</Text>
                    </TouchableOpacity>

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 12 }}>
                        <View style={{ flex: 1, height: 1, backgroundColor: '#2D2D4A' }} />
                        <Text style={{ color: '#6B7280', marginHorizontal: 16 }}>OR</Text>
                        <View style={{ flex: 1, height: 1, backgroundColor: '#2D2D4A' }} />
                    </View>

                    <TouchableOpacity
                        style={[styles.actionButton, { alignItems: 'center', backgroundColor: '#3B82F6', opacity: downloading ? 0.5 : 1 }]}
                        onPress={importLocalModel}
                        disabled={downloading}
                    >
                        <Text style={{ color: '#FFF', fontWeight: '600' }}>Select Local File</Text>
                    </TouchableOpacity>
                </View>

                <Text style={[styles.sectionTitle, { marginTop: 24 }]}>DOWNLOADED MODELS</Text>
                {localModels.length === 0 ? (
                    <Text style={styles.emptyText}>No models downloaded yet.</Text>
                ) : (
                    localModels.map(filename => (
                        <View key={filename} style={styles.card}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.cardTitle}>{filename}</Text>
                                {activeModel === filename && (
                                    <Text style={styles.activeText}>Active in Memory</Text>
                                )}
                            </View>
                            <View style={styles.row}>
                                {activeModel !== filename && (
                                    <TouchableOpacity
                                        style={[styles.actionButton, { backgroundColor: '#22C55E' }]}
                                        onPress={() => activateModel(filename)}
                                    >
                                        <Ionicons name="play" size={20} color="#0D0D1A" />
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: '#EF4444', marginLeft: 8 }]}
                                    onPress={() => deleteModel(filename)}
                                >
                                    <Ionicons name="trash" size={20} color="#FFFFFF" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0D0D1A' },
    header: { padding: 20 },
    headerTitle: { color: '#FFF', fontSize: 28, fontWeight: '700' },
    headerSubtitle: { color: '#9CA3AF', marginTop: 4 },
    content: { paddingHorizontal: 20 },
    sectionTitle: { color: '#22C55E', letterSpacing: 1.5, fontSize: 12, fontWeight: '600', marginBottom: 12 },
    card: { backgroundColor: '#1F1F3A', padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    cardTitle: { color: '#FFF', fontSize: 16, fontWeight: '600' },
    cardMeta: { color: '#9CA3AF', marginTop: 4 },
    actionButton: { backgroundColor: '#E879F9', padding: 10, borderRadius: 8 },
    downloadContainer: { backgroundColor: '#1F1F3A', padding: 16, borderRadius: 12, marginVertical: 12 },
    downloadText: { color: '#FFF', marginBottom: 8 },
    progressBar: { height: 4, backgroundColor: '#2D2D4A', borderRadius: 2 },
    progressFill: { height: '100%', backgroundColor: '#E879F9' },
    cancelBtn: { marginTop: 12, alignSelf: 'flex-end' },
    cancelTxt: { color: '#EF4444' },
    emptyText: { color: '#6B7280', textAlign: 'center', marginTop: 24 },
    row: { flexDirection: 'row' },
    activeText: { color: '#22C55E', fontSize: 12, marginTop: 4 }
});
