import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LLM_PROVIDERS = [
  { id: 'default', name: 'Default (Emergent)', icon: 'flash', color: '#FBBF24' },
  { id: 'openai', name: 'OpenAI', icon: 'logo-electron', color: '#10B981' },
  { id: 'anthropic', name: 'Anthropic Claude', icon: 'cube', color: '#8B5CF6' },
  { id: 'gemini', name: 'Google Gemini', icon: 'logo-google', color: '#3B82F6' },
];

const MODELS = {
  openai: ['gpt-4o', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-5.2', 'gpt-5.1'],
  anthropic: ['claude-sonnet-4-5-20250929', 'claude-4-sonnet-20250514', 'claude-haiku-4-5-20251001'],
  gemini: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-3-flash-preview'],
};

export default function SettingsScreen() {
  const [provider, setProvider] = useState('default');
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasCustomKey, setHasCustomKey] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedProvider = await AsyncStorage.getItem('llm_provider');
      const savedKey = await AsyncStorage.getItem('llm_api_key');
      const savedModel = await AsyncStorage.getItem('llm_model');
      
      if (savedProvider) setProvider(savedProvider);
      if (savedKey) {
        setApiKey(savedKey);
        setHasCustomKey(true);
      }
      if (savedModel) setSelectedModel(savedModel);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await AsyncStorage.setItem('llm_provider', provider);
      if (apiKey.trim()) {
        await AsyncStorage.setItem('llm_api_key', apiKey.trim());
        setHasCustomKey(true);
      }
      if (selectedModel) {
        await AsyncStorage.setItem('llm_model', selectedModel);
      }
      Alert.alert('Success', 'Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const clearApiKey = async () => {
    Alert.alert(
      'Clear API Key',
      'Are you sure you want to remove your custom API key? The app will use the default key.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('llm_api_key');
            setApiKey('');
            setHasCustomKey(false);
            setProvider('default');
            await AsyncStorage.setItem('llm_provider', 'default');
          },
        },
      ]
    );
  };

  const getModelsForProvider = () => {
    if (provider === 'default') return [];
    return MODELS[provider as keyof typeof MODELS] || [];
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>LLM Settings</Text>
            <Text style={styles.headerSubtitle}>
              Configure your own API key for translations
            </Text>
          </View>

          {/* Current Status */}
          <View style={styles.statusCard}>
            <View style={styles.statusIcon}>
              <Ionicons
                name={hasCustomKey ? 'key' : 'flash'}
                size={24}
                color={hasCustomKey ? '#22C55E' : '#FBBF24'}
              />
            </View>
            <View style={styles.statusInfo}>
              <Text style={styles.statusTitle}>
                {hasCustomKey ? 'Custom API Key Active' : 'Using Default Key'}
              </Text>
              <Text style={styles.statusDesc}>
                {hasCustomKey
                  ? `Provider: ${LLM_PROVIDERS.find(p => p.id === provider)?.name}`
                  : 'Emergent Universal Key'}
              </Text>
            </View>
          </View>

          {/* Provider Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>LLM PROVIDER</Text>
            <View style={styles.providersGrid}>
              {LLM_PROVIDERS.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.providerCard,
                    provider === p.id && styles.providerCardActive,
                  ]}
                  onPress={() => {
                    setProvider(p.id);
                    setSelectedModel('');
                  }}
                >
                  <View
                    style={[
                      styles.providerIcon,
                      { backgroundColor: `${p.color}20` },
                    ]}
                  >
                    <Ionicons name={p.icon as any} size={24} color={p.color} />
                  </View>
                  <Text style={styles.providerName}>{p.name}</Text>
                  {provider === p.id && (
                    <View style={styles.checkmark}>
                      <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* API Key Input */}
          {provider !== 'default' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>API KEY</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.apiKeyInput}
                  value={apiKey}
                  onChangeText={setApiKey}
                  placeholder={`Enter your ${LLM_PROVIDERS.find(p => p.id === provider)?.name} API key...`}
                  placeholderTextColor="#6B7280"
                  secureTextEntry={!showKey}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowKey(!showKey)}
                >
                  <Ionicons
                    name={showKey ? 'eye-off' : 'eye'}
                    size={22}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.inputHint}>
                Your API key is stored locally and never sent to our servers.
              </Text>
            </View>
          )}

          {/* Model Selection */}
          {provider !== 'default' && getModelsForProvider().length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>MODEL</Text>
              <View style={styles.modelsContainer}>
                {getModelsForProvider().map((model) => (
                  <TouchableOpacity
                    key={model}
                    style={[
                      styles.modelChip,
                      selectedModel === model && styles.modelChipActive,
                    ]}
                    onPress={() => setSelectedModel(model)}
                  >
                    <Text
                      style={[
                        styles.modelChipText,
                        selectedModel === model && styles.modelChipTextActive,
                      ]}
                    >
                      {model}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Info Card */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={24} color="#3B82F6" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>How to get an API key?</Text>
              <Text style={styles.infoText}>
                • OpenAI: platform.openai.com/api-keys{"\n"}
                • Anthropic: console.anthropic.com{"\n"}
                • Google: aistudio.google.com/apikey
              </Text>
            </View>
          </View>

          {/* Clear Button */}
          {hasCustomKey && (
            <TouchableOpacity style={styles.clearButton} onPress={clearApiKey}>
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
              <Text style={styles.clearButtonText}>Clear Custom API Key</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Save Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.saveButton,
              (provider !== 'default' && !apiKey.trim()) && styles.saveButtonDisabled,
            ]}
            onPress={saveSettings}
            disabled={saving || (provider !== 'default' && !apiKey.trim())}
          >
            {saving ? (
              <Text style={styles.saveButtonText}>Saving...</Text>
            ) : (
              <>
                <Ionicons name="checkmark" size={20} color="#0D0D1A" />
                <Text style={styles.saveButtonText}>Save Settings</Text>
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
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F1F3A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#2D2D4A',
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusInfo: {
    flex: 1,
    marginLeft: 14,
  },
  statusTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  statusDesc: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#22C55E',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  providersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  providerCard: {
    width: '47%',
    backgroundColor: '#1F1F3A',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2D2D4A',
  },
  providerCardActive: {
    borderColor: '#22C55E',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  providerIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  providerName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  checkmark: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F1F3A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2D2D4A',
  },
  apiKeyInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    padding: 16,
  },
  eyeButton: {
    padding: 16,
  },
  inputHint: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 8,
  },
  modelsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modelChip: {
    backgroundColor: '#1F1F3A',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2D2D4A',
  },
  modelChipActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderColor: '#8B5CF6',
  },
  modelChipText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '500',
  },
  modelChipTextActive: {
    color: '#E879F9',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    marginBottom: 16,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
  },
  infoText: {
    color: '#9CA3AF',
    fontSize: 12,
    lineHeight: 20,
    marginTop: 6,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    marginBottom: 16,
    gap: 8,
  },
  clearButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    padding: 20,
    paddingBottom: 8,
  },
  saveButton: {
    backgroundColor: '#22C55E',
    borderRadius: 28,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#4B5563',
  },
  saveButtonText: {
    color: '#0D0D1A',
    fontSize: 18,
    fontWeight: '600',
  },
});
