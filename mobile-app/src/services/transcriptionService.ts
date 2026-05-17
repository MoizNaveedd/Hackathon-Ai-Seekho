/**
 * Karigar.ai - Speech Recognition Service
 * 
 * Uses the requested 'react-native-voice-to-text' package to trigger 
 * native speech-to-text recognition.
 * If recognition fails, gets cancelled, or no speech is detected, 
 * it returns an empty string.
 */

import { startSpeechToText} from 'react-native-voice-to-text';

/**
 * Initiates native speech recognition via react-native-voice-to-text.
 * Returns the transcribed text, or an empty string if recognition fails/gets cancelled.
 */
export async function transcribeVoiceLive(): Promise<string> {
  try {
    console.log("🎙️ Triggering react-native-voice-to-text native speech recognition...");
    
    // Call the native speech-to-text recognition promise
    const result = await startSpeechToText();
    
    if (result && typeof result === 'string' && result.trim() !== '') {
      console.log("✨ Native Speech Recognition Success:", result);
      return result.trim();
    }
    
    return "";
  } catch (error: any) {
    console.warn("⚠️ Native speech recognition error or no speech detected:", error?.message || error);
    return "";
  }
}
