import { GoogleGenAI, Type, Schema, Modality } from "@google/genai";
import { DictionaryEntry } from "../types";

// Initialize GenAI
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Dictionary Logic ---

export const explainTerm = async (term: string, context?: string): Promise<Omit<DictionaryEntry, 'id' | 'timestamp' | 'imageUrl'>> => {
  
  const promptContext = context ? `Context provided by user: "${context}". Ensure the explanation fits this context.` : "No specific context provided.";

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      definitionEnglish: { type: Type.STRING, description: "Definition in English, suitable for advanced learners (IELTS 6.5+)." },
      definitionMandarin: { type: Type.STRING, description: "Definition in Mandarin Chinese." },
      examples: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            english: { type: Type.STRING, description: "Example sentence in North American English." },
            mandarin: { type: Type.STRING, description: "Mandarin translation of the example." },
          },
          required: ["english", "mandarin"]
        }
      },
      usageNote: { 
        type: Type.STRING, 
        description: "A fun, concise, friend-like usage guide. Must cover: 1. Cultural context/scenarios. 2. Tone. 3. Related words (synonyms or easily confused words) and the differences. Avoid textbook style. Be direct and concise." 
      },
      imagePrompt: { type: Type.STRING, description: "A concise visual description to generate an image representing this concept." }
    },
    required: ["definitionEnglish", "definitionMandarin", "examples", "usageNote", "imagePrompt"]
  };

  const systemInstruction = `You are a friendly, expert Canadian English tutor for Mandarin speakers (IELTS 6.5+ level). 
  Your goal is to explain words/phrases/sentences naturally. 
  Provide the English definition first to encourage immersion, then the Mandarin.
  Use Canadian spelling (e.g., colour, centre) and cultural references where appropriate.
  
  For the 'usageNote':
  - Adopt a chatty, friend-like tone.
  - Cover cultural context, usage scenarios, and tone.
  - CRITICAL: Mention related words, synonyms, or words that look similar but are often confused, and explain the differences.
  - Be very concise and direct. No textbook fluff.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Explain the term: "${term}". ${promptContext}`,
    config: {
      systemInstruction: systemInstruction,
      responseMimeType: "application/json",
      responseSchema: schema
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  
  return JSON.parse(text);
};

// --- Image Generation ---

export const generateConceptImage = async (prompt: string): Promise<string | undefined> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', // Nano banana for speed/efficiency as per requirements
      contents: {
        parts: [{ text: `A high quality, bright, minimalist illustration representing: ${prompt}` }]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
        }
      }
    });

    // Iterate to find the image part
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    return undefined;
  } catch (e) {
    console.error("Image generation failed", e);
    return undefined;
  }
};

// --- TTS ---

// Helper: Decode base64 to Uint8Array
const decodeBase64 = (base64: string) => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper: Convert PCM Int16 -> AudioBuffer
// Gemini TTS output is raw PCM, usually 24kHz, 16-bit, mono
const pcmToAudioBuffer = (
  data: Uint8Array, 
  ctx: AudioContext, 
  sampleRate: number = 24000
): AudioBuffer => {
  // Create Int16Array view of the buffer
  const pcm16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
  const buffer = ctx.createBuffer(1, pcm16.length, sampleRate);
  const channelData = buffer.getChannelData(0);
  
  for (let i = 0; i < pcm16.length; i++) {
    // Convert Int16 to Float32 [-1.0, 1.0]
    channelData[i] = pcm16[i] / 32768.0;
  }
  return buffer;
}

export const playTTS = async (text: string): Promise<void> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, // Kore sounds relatively neutral/fem
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) return;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioContext = new AudioContextClass({ sampleRate: 24000 });
    
    const bytes = decodeBase64(base64Audio);
    
    // Manually decode PCM data because browser decodeAudioData expects file headers (WAV/MP3)
    const audioBuffer = pcmToAudioBuffer(bytes, audioContext, 24000);
    
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start();

  } catch (e) {
    console.error("TTS failed", e);
  }
};

// --- Chat ---

export const sendChatMessage = async (history: {role: 'user'|'model', text: string}[], newMessage: string, contextTerm: string): Promise<string> => {
  // We construct a chat session conceptually
  const systemInstruction = `You are a helpful Canadian English tutor. The user is currently studying the term: "${contextTerm}". Answer their follow-up questions concisely and helpfuly.`;
  
  const chat = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: { systemInstruction },
    history: history.map(h => ({
        role: h.role,
        parts: [{ text: h.text }]
    }))
  });

  const result = await chat.sendMessage({ message: newMessage });
  return result.text || "I couldn't understand that.";
};

// --- Story Mode ---

export const generateStoryFromList = async (terms: string[]): Promise<string> => {
  const prompt = `Write a short, funny, and coherent story (approx 150 words) that includes the following words/phrases: ${terms.join(', ')}. Highlight the used words in **bold** within the story. Ensure the tone is North American casual.`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  return response.text || "Could not generate story.";
};