import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { createText } from '../../src/database/db';

export default function ImportScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'paste' | 'file'>('paste');

  const importText = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title for your text');
      return;
    }
    if (!text.trim()) {
      Alert.alert('Error', 'Please enter or upload some Korean text');
      return;
    }

    setLoading(true);
    try {
      const data = await createText(title.trim(), text.trim());
      Alert.alert(
        'Success!',
        `Imported ${data.sentence_count} sentences`,
        [
          {
            text: 'Start Learning',
            onPress: () => router.push(`/study/${data.id}`),
          },
          {
            text: 'Go Home',
            onPress: () => router.push('/(tabs)'),
          },
        ]
      );
      setTitle('');
      setText('');
    } catch (error) {
      console.error('Import error:', error);
      Alert.alert('Error', 'Failed to import text. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/plain',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const file = result.assets[0];
        const content = await FileSystem.readAsStringAsync(file.uri);
        setText(content);

        // Auto-fill title from filename if empty
        if (!title.trim() && file.name) {
          setTitle(file.name.replace(/\.[^/.]+$/, ''));
        }
      }
    } catch (error) {
      console.error('Document picker error:', error);
      Alert.alert('Error', 'Failed to read file');
    }
  };



  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Import Text</Text>
          <Text style={styles.headerSubtitle}>
            Add Korean text to start learning
          </Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Tabs */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'paste' && styles.activeTab]}
              onPress={() => setActiveTab('paste')}
            >
              <Ionicons
                name="clipboard-outline"
                size={20}
                color={activeTab === 'paste' ? '#E879F9' : '#6B7280'}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'paste' && styles.activeTabText,
                ]}
              >
                Paste Text
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'file' && styles.activeTab]}
              onPress={() => setActiveTab('file')}
            >
              <Ionicons
                name="document-outline"
                size={20}
                color={activeTab === 'file' ? '#E879F9' : '#6B7280'}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'file' && styles.activeTabText,
                ]}
              >
                Upload File
              </Text>
            </TouchableOpacity>
          </View>

          {/* Title Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>TITLE</Text>
            <TextInput
              style={styles.titleInput}
              value={title}
              onChangeText={setTitle}
              placeholder="Enter a title for your text..."
              placeholderTextColor="#6B7280"
            />
          </View>

          {/* Content Input */}
          {activeTab === 'paste' ? (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>KOREAN TEXT</Text>
              <TextInput
                style={styles.textInput}
                value={text}
                onChangeText={setText}
                placeholder="Paste your Korean text here...

예: 오늘 날씨가 정말 좋아요."
                placeholderTextColor="#6B7280"
                multiline
                textAlignVertical="top"
              />
            </View>
          ) : (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>UPLOAD FILE</Text>
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={pickDocument}
              >
                <Ionicons name="cloud-upload-outline" size={32} color="#E879F9" />
                <Text style={styles.uploadText}>Tap to select a .txt file</Text>
                <Text style={styles.uploadHint}>Supports plain text files</Text>
              </TouchableOpacity>
              {text ? (
                <View style={styles.previewContainer}>
                  <Text style={styles.previewLabel}>Preview:</Text>
                  <Text style={styles.previewText} numberOfLines={3}>
                    {text}
                  </Text>
                </View>
              ) : null}
            </View>
          )}


        </ScrollView>

        {/* Import Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.importButton,
              (!title.trim() || !text.trim()) && styles.importButtonDisabled,
            ]}
            onPress={importText}
            disabled={loading || !title.trim() || !text.trim()}
          >
            {loading ? (
              <ActivityIndicator color="#0D0D1A" />
            ) : (
              <>
                <Text style={styles.importButtonText}>Import & Start</Text>
                <Ionicons name="arrow-forward" size={20} color="#0D0D1A" />
              </>
            )}
          </TouchableOpacity>
        </View>
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#1F1F3A',
    borderRadius: 12,
    padding: 4,
    marginTop: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  activeTab: {
    backgroundColor: '#2D2D4A',
  },
  tabText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#E879F9',
  },
  inputGroup: {
    marginTop: 24,
  },
  label: {
    color: '#22C55E',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  titleInput: {
    backgroundColor: '#1F1F3A',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#2D2D4A',
  },
  textInput: {
    backgroundColor: '#1F1F3A',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    minHeight: 200,
    borderWidth: 1,
    borderColor: '#2D2D4A',
  },
  uploadButton: {
    backgroundColor: '#1F1F3A',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2D2D4A',
    borderStyle: 'dashed',
  },
  uploadText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  uploadHint: {
    color: '#6B7280',
    fontSize: 13,
    marginTop: 4,
  },
  previewContainer: {
    marginTop: 12,
    backgroundColor: '#1F1F3A',
    borderRadius: 12,
    padding: 16,
  },
  previewLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 8,
  },
  previewText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 22,
  },

  footer: {
    padding: 20,
    paddingBottom: 8,
  },
  importButton: {
    backgroundColor: '#E879F9',
    borderRadius: 28,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  importButtonDisabled: {
    backgroundColor: '#4B5563',
  },
  importButtonText: {
    color: '#0D0D1A',
    fontSize: 18,
    fontWeight: '600',
  },
});
