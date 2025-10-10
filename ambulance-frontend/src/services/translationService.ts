// Free translation service using MyMemory API
const MYMEMORY_API = 'https://api.mymemory.translated.net/get';

const languageMap: { [key: string]: string } = {
  'en': 'en',
  'hi': 'hi',
  'bn': 'bn',
  'ta': 'ta',
  'te': 'te',
  'gu': 'gu'
};

export const translateText = async (text: string, targetLang: string): Promise<string> => {
  if (targetLang === 'en' || !text) return text;
  
  try {
    const response = await fetch(
      `${MYMEMORY_API}?q=${encodeURIComponent(text)}&langpair=en|${languageMap[targetLang]}`
    );
    
    const data = await response.json();
    
    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      return data.responseData.translatedText;
    }
    
    return text;
  } catch (error) {
    console.log('Translation error:', error);
    return text;
  }
};

const translationCache = new Map<string, string>();

export const translateHospitalName = async (hospitalName: string, targetLang: string): Promise<string> => {
  if (targetLang === 'en') return hospitalName;
  
  const cacheKey = `${hospitalName}_${targetLang}`;
  const cached = translationCache.get(cacheKey);
  if (cached) return cached;
  
  const translated = await translateText(hospitalName, targetLang);
  translationCache.set(cacheKey, translated);
  
  return translated;
};