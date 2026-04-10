import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LLMConfig {
  provider: string;
  apiKey: string | null;
  model: string | null;
}

export const getLLMConfig = async (): Promise<LLMConfig> => {
  try {
    const provider = await AsyncStorage.getItem('llm_provider') || 'default';
    const apiKey = await AsyncStorage.getItem('llm_api_key');
    const model = await AsyncStorage.getItem('llm_model');
    
    return { provider, apiKey, model };
  } catch (error) {
    console.error('Error getting LLM config:', error);
    return { provider: 'default', apiKey: null, model: null };
  }
};

export const buildLLMHeaders = async (): Promise<Record<string, string>> => {
  const config = await getLLMConfig();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (config.provider !== 'default' && config.apiKey) {
    headers['X-LLM-Provider'] = config.provider;
    headers['X-LLM-API-Key'] = config.apiKey;
    if (config.model) {
      headers['X-LLM-Model'] = config.model;
    }
  }
  
  return headers;
};
