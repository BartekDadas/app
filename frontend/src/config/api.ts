import Constants from 'expo-constants';

// Get API URL from environment variables
const getApiUrl = (): string => {
  const url = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 
              process.env.EXPO_PUBLIC_BACKEND_URL;
  
  if (!url) {
    console.warn('EXPO_PUBLIC_BACKEND_URL is not set. API calls may fail.');
    // Return empty string in development but warn
    return '';
  }
  
  return url;
};

export const API_URL = getApiUrl();
