import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Animated, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useColors } from '../config/ThemeContext';
import { FONTS, RADIUS, SPACING, SHADOW } from '../config/theme';
import { aiAPI, incidentsAPI } from '../services/api';
import useStore from '../store/useStore';

// Safe native module resolution for Expo Go sandbox compatibility
let ExpoSpeechRecognitionModule: any = null;
let useSpeechRecognitionEventHook: any = (_event: string, _callback: any) => {};
let SpeechModule: any = null;

try {
  const _speechMod = require('expo-speech');
  // Handle both default export and named exports
  SpeechModule = _speechMod?.default || _speechMod;
} catch {}

try {
  const RecModule = require('expo-speech-recognition');
  if (RecModule?.ExpoSpeechRecognitionModule) {
    ExpoSpeechRecognitionModule = RecModule.ExpoSpeechRecognitionModule;
  }
  if (typeof RecModule?.useSpeechRecognitionEvent === 'function') {
    useSpeechRecognitionEventHook = RecModule.useSpeechRecognitionEvent;
  }
} catch {
  // Expo Go sandbox environment
}

let activeSound: Audio.Sound | null = null;

const stopCurrentSpeech = async () => {
  try { if (SpeechModule) SpeechModule.stop(); } catch {}
  if (activeSound) {
    try {
      await activeSound.stopAsync();
      await activeSound.unloadAsync();
    } catch {}
    activeSound = null;
  }
};

const speakOutLoud = async (text: string, onDone?: () => void) => {
  if (!text) {
    if (onDone) onDone();
    return;
  }
  // Clean markdown symbols & emojis for clean TTS out-loud speech
  const cleanText = text
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .replace(/[*_#`~🎵✅]/g, '')
    .trim();

  if (!cleanText) {
    if (onDone) onDone();
    return;
  }

  await stopCurrentSpeech();

  // Ensure Audio mode is set to Speaker Playback mode (fixes silent output after recording)
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
    });
  } catch (err) {
    console.log('[TTS] Audio mode error:', err);
  }

  // Small delay to ensure audio mode switch is complete
  await new Promise(resolve => setTimeout(resolve, 200));

  // Web Speech API
  if (Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).speechSynthesis) {
    try {
      (window as any).speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      if (onDone) utterance.onend = onDone;
      (window as any).speechSynthesis.speak(utterance);
      return;
    } catch {}
  }

  // Primary Failsafe: High Quality Natural Audio Stream via Audio.Sound
  try {
    const encodedText = encodeURIComponent(cleanText.substring(0, 200));
    const soundUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=en&client=tw-ob`;
    console.log('[TTS] Playing natural voice audio stream...');

    const { sound } = await Audio.Sound.createAsync(
      { uri: soundUrl },
      { shouldPlay: true, volume: 1.0 }
    );
    activeSound = sound;

    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
        if (activeSound === sound) activeSound = null;
        console.log('[TTS] Audio playback finished successfully');
        if (onDone) onDone();
      }
    });
    return;
  } catch (streamErr) {
    console.log('[TTS] Stream playback error, falling back to native TTS:', streamErr);
  }

  // Native expo-speech fallback
  if (SpeechModule && typeof SpeechModule.speak === 'function') {
    try {
      console.log('[TTS] Speaking via native SpeechModule:', cleanText.substring(0, 50) + '...');
      SpeechModule.speak(cleanText, {
        rate: Platform.OS === 'ios' ? 0.5 : 0.9,
        pitch: 1.0,
        volume: 1.0,
        language: 'en-US',
        onDone: () => {
          console.log('[TTS] Done speaking');
          if (onDone) onDone();
        },
        onStopped: () => {
          console.log('[TTS] Stopped');
          if (onDone) onDone();
        },
        onError: (e: any) => {
          console.log('[TTS] Error:', e);
          if (onDone) onDone();
        },
      });
    } catch (err) {
      console.log('[TTS] Exception:', err);
      if (onDone) onDone();
    }
  } else {
    console.log('[TTS] No speech engine available!');
    if (onDone) onDone();
  }
};

const QUICK_PROMPTS = [
  { icon: 'navigate',         label: 'Navigate',      text: 'Navigate me to Accra Central' },
  { icon: 'warning',          label: 'Report hazard', text: 'Report a serious accident blocking traffic on Main Street' },
  { icon: 'musical-notes',    label: 'Play music',    text: 'Play some music for my drive' },
  { icon: 'megaphone',        label: 'Place an ad',   text: 'I want to advertise my car wash business on the map' },
  { icon: 'shield-checkmark', label: 'Safety tips',   text: 'Give me road safety tips for night driving' },
  { icon: 'rainy',            label: 'Weather alert', text: 'Is there any weather warning I should know about?' },
];

const SAMPLE_VOICE_PRESETS = [
  "Report an oil spill hazard on 3rd Avenue",
  "Navigate me to West Hills Mall",
  "Advertise my coffee shop business on the map",
  "Play upbeat music for highway driving"
];

const FALLBACK_REPLY = "I'm having trouble connecting right now. Please try again in a moment.";

export default function AIScreen({ navigation }: any) {
  const COLORS = useColors();
  const s = makeStyles(COLORS);
  const flatRef = useRef<any>(null);
  const { chatMessages, addChatMessage, setChatMessages, userLocation, addIncident } = useStore();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [histLoading, setHistLoading] = useState(true);
  const [submittingActionId, setSubmittingActionId] = useState<string | null>(null);

  // ── Multi-step incident report conversation flow ───────────────────────────
  const incidentFlowRef = useRef<{
    step: 'type' | 'title' | 'description' | 'severity' | null;
    incident_type: string;
    title: string;
    description: string;
    severity: string;
  }>({ step: null, incident_type: '', title: '', description: '', severity: '' });

  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<'listening' | 'thinking' | 'speaking'>('listening');
  const [voiceText, setVoiceText] = useState('');
  const [voiceInputText, setVoiceInputText] = useState('');
  const webRecognitionRef = useRef<any>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const silenceTimerRef = useRef<any>(null);
  const maxRecordingTimerRef = useRef<any>(null);
  const voiceModeActiveRef = useRef(false); // tracks if voice modal session is active

  // ChatGPT Orb & Wave Visualizer Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const waveAnim = useRef(new Animated.Value(1)).current;
  const bar1Anim = useRef(new Animated.Value(14)).current;
  const bar2Anim = useRef(new Animated.Value(28)).current;
  const bar3Anim = useRef(new Animated.Value(42)).current;
  const bar4Anim = useRef(new Animated.Value(24)).current;
  const bar5Anim = useRef(new Animated.Value(16)).current;
  const transcriptTallyRef = useRef(''); // accumulates finalized segments

  // ── Native Speech Recognition Event Handlers (expo-speech-recognition) ──────
  // These hooks wire up the native STT results, end, and error events.
  useSpeechRecognitionEventHook('result', (event: any) => {
    const transcript = event?.results?.[0]?.transcript || '';
    const isFinal = event?.isFinal ?? event?.results?.[0]?.isFinal ?? false;
    if (isFinal) {
      transcriptTallyRef.current = (transcriptTallyRef.current + ' ' + transcript).trim();
      setVoiceText(transcriptTallyRef.current);
    } else {
      setVoiceText((transcriptTallyRef.current + ' ' + transcript).trim());
    }

    // Reset 2.2-second silence timer whenever user speaks (auto-detect when finished)
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      stopVoiceInputAndSend();
    }, 2200);
  });

  useSpeechRecognitionEventHook('end', () => {
    // Native recognition ended — auto-send if we have text
    const finalText = (voiceText || transcriptTallyRef.current).trim();
    stopVoiceInputAndSend(finalText);
  });

  useSpeechRecognitionEventHook('error', (event: any) => {
    console.log('Speech recognition error:', event?.error, event?.message);
  });

  // Continuous fluid movement & Soundwave Equalizer for ChatGPT Orb
  useEffect(() => {
    if (isListening || isSpeaking) {
      // 1. Organic Breathing Pulse
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 1200, useNativeDriver: false }),
          Animated.timing(pulseAnim, { toValue: 0.95, duration: 1200, useNativeDriver: false }),
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 900, useNativeDriver: false }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 900, useNativeDriver: false }),
        ])
      );

      // 2. Dynamic Rotation
      const rotateLoop = Animated.loop(
        Animated.timing(rotateAnim, { toValue: 1, duration: 8000, useNativeDriver: false })
      );

      // 3. Reactive Soundwave Bars Loop
      const barLoop = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(bar1Anim, { toValue: 36, duration: 300, useNativeDriver: false }),
            Animated.timing(bar2Anim, { toValue: 18, duration: 250, useNativeDriver: false }),
            Animated.timing(bar3Anim, { toValue: 48, duration: 350, useNativeDriver: false }),
            Animated.timing(bar4Anim, { toValue: 16, duration: 280, useNativeDriver: false }),
            Animated.timing(bar5Anim, { toValue: 32, duration: 320, useNativeDriver: false }),
          ]),
          Animated.parallel([
            Animated.timing(bar1Anim, { toValue: 12, duration: 320, useNativeDriver: false }),
            Animated.timing(bar2Anim, { toValue: 44, duration: 300, useNativeDriver: false }),
            Animated.timing(bar3Anim, { toValue: 20, duration: 280, useNativeDriver: false }),
            Animated.timing(bar4Anim, { toValue: 40, duration: 350, useNativeDriver: false }),
            Animated.timing(bar5Anim, { toValue: 14, duration: 290, useNativeDriver: false }),
          ]),
        ])
      );

      pulseLoop.start();
      rotateLoop.start();
      barLoop.start();

      return () => {
        pulseLoop.stop();
        rotateLoop.stop();
        barLoop.stop();
      };
    } else {
      pulseAnim.setValue(1);
      rotateAnim.setValue(0);
      waveAnim.setValue(1);
      bar1Anim.setValue(14);
      bar2Anim.setValue(28);
      bar3Anim.setValue(42);
      bar4Anim.setValue(24);
      bar5Anim.setValue(16);
    }
  }, [isListening, isSpeaking, voiceStatus]);

  useEffect(() => {
    aiAPI.getHistory()
      .then((msgs: any) => {
        const list = Array.isArray(msgs) ? msgs : [];
        setChatMessages(
          list.map((m: any, i: number) => ({
            role: m?.role === 'user' ? 'user' : 'assistant',
            content: typeof m?.content === 'string' ? m.content : '',
            id: m?.id ? String(m.id) : `hist-${i}-${Date.now()}`,
          }))
        );
      })
      .catch(() => {})
      .finally(() => setHistLoading(false));
  }, [setChatMessages]);

  // ── Voice Input Trigger ─────────────────────────────────────────────────────
  const startVoiceInput = async () => {
    // Clean up any ongoing timer or previous recording first
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (maxRecordingTimerRef.current) clearTimeout(maxRecordingTimerRef.current);
    if (recordingRef.current) {
      try { await recordingRef.current.stopAndUnloadAsync(); } catch {}
      recordingRef.current = null;
    }

    setVoiceText('');
    setVoiceStatus('listening');
    setIsListening(true);
    setIsSpeaking(false);
    transcriptTallyRef.current = '';
    voiceModeActiveRef.current = true;

    // Stop any active TTS out-loud speech
    stopCurrentSpeech();

    // Schedule 6-second max hard cap timer (prevents background fan/air noise from running forever)
    maxRecordingTimerRef.current = setTimeout(() => {
      console.log('[VoiceMode] Hard 6s cap reached. Processing voice input...');
      stopVoiceInputAndSend();
    }, 6000);

    // Schedule 6-second silence auto-respond timer (if user doesn't start speaking)
    silenceTimerRef.current = setTimeout(() => {
      stopVoiceInputAndSend();
    }, 6000);

    // ── Web (Expo Web) path ────────────────────────────────────────────────
    if (Platform.OS === 'web') {
      const SpeechRecognition = typeof window !== 'undefined' &&
        ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'en-US';
          recognition.onresult = (event: any) => {
            let transcript = '';
            for (let i = 0; i < event.results.length; i++) {
              transcript += event.results[i][0].transcript;
            }
            setVoiceText(transcript);

            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = setTimeout(() => {
              stopVoiceInputAndSend();
            }, 2200);
          };
          recognition.onerror = (e: any) => console.log('Web STT error:', e);
          recognition.start();
          webRecognitionRef.current = recognition;
        } catch (err) {
          console.log('Web Speech API error:', err);
          Alert.alert('Not supported', 'Voice input is not supported in this browser.');
        }
      } else {
        Alert.alert('Not supported', 'Your browser does not support speech recognition.');
      }
      return;
    }

    // ── Native (Android / iOS) path ─────────────────────────────────────────
    if (ExpoSpeechRecognitionModule) {
      try {
        const { status } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Microphone permission required',
            'Please allow microphone access in Settings to use voice input.',
          );
          return;
        }

        ExpoSpeechRecognitionModule.start({
          lang: 'en-US',
          interimResults: true,
          continuous: false,
          maxAlternatives: 1,
        });
        return;
      } catch (e) {
        console.log('Speech recognition start error:', e);
      }
    }

    // Fallback: Audio recording mode (for Expo Go environment)
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Microphone required', 'Permission to access microphone was denied.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      });
      await recording.startAsync();
      recordingRef.current = recording;

      // Monitor audio levels: reset the silence timer whenever we detect human speech (> -35 dB)
      const meteringInterval = setInterval(async () => {
        if (!recordingRef.current) {
          clearInterval(meteringInterval);
          return;
        }
        try {
          const status = await recordingRef.current.getStatusAsync();
          // metering dB: -160 = silence, -35+ = human speech (ignores low ambient air/fan noise)
          const metering = (status as any)?.metering ?? -160;
          if (metering > -35) {
            console.log('[VoiceMode] Speech detected! Level:', metering.toFixed(1), 'dB');
            // Reset silence timer — user is speaking (auto-process after 2.2s pause)
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = setTimeout(() => {
              stopVoiceInputAndSend();
            }, 2200);
          }
        } catch {}
      }, 500);

      // Store interval ref for cleanup
      (recordingRef as any)._meteringInterval = meteringInterval;
    } catch (e) {
      console.log('Expo Audio fallback error:', e);
    }
  };

  const isNoiseHallucination = (text: string): boolean => {
    const lower = text.toLowerCase().trim();
    if (lower.length < 2) return true;
    const noisePatterns = [
      /^thank\s*you\.?$/i,
      /^subtitles\s*by/i,
      /^\[.*\]$/,
      /^\(.*\)$/,
      /amara\.org/i,
      /^you$/i,
      /^bye\.?$/i,
    ];
    return noisePatterns.some((pattern) => pattern.test(lower));
  };

  const stopVoiceInputAndSend = async (customText?: string) => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (maxRecordingTimerRef.current) clearTimeout(maxRecordingTimerRef.current);
    setIsListening(false);
    let finalQuery = (customText || voiceText || transcriptTallyRef.current).trim();

    // Stop web recognition if active
    if (webRecognitionRef.current) {
      try { webRecognitionRef.current.stop(); } catch {}
      webRecognitionRef.current = null;
    }

    // Stop native speech recognition if active
    if (ExpoSpeechRecognitionModule) {
      try { ExpoSpeechRecognitionModule.stop(); } catch {}
    }

    // Stop audio recording fallback if active and capture recording URI
    let recordedUri: string | null = null;
    if (recordingRef.current) {
      // Clean up metering interval
      if ((recordingRef as any)._meteringInterval) {
        clearInterval((recordingRef as any)._meteringInterval);
        (recordingRef as any)._meteringInterval = null;
      }
      try {
        await recordingRef.current.stopAndUnloadAsync();
        recordedUri = recordingRef.current.getURI();
        console.log('[VoiceMode] Recording stopped. URI:', recordedUri);
      } catch {}
      recordingRef.current = null;
    }

    // If no text captured yet but audio was recorded (e.g. Expo Go mode), transcribe audio via Whisper API!
    if (!finalQuery && recordedUri) {
      setVoiceStatus('thinking');
      try {
        const formData = new FormData();
        // expo-av HIGH_QUALITY records as m4a (AAC) on both platforms
        formData.append('file', {
          uri: recordedUri,
          type: 'audio/m4a',
          name: `speech_${Date.now()}.m4a`,
        } as any);

        console.log('[VoiceMode] Transcribing audio with Whisper API...');
        const res = await aiAPI.transcribe(formData);
        console.log('[VoiceMode] Whisper result:', res);
        if (typeof res?.text === 'string' && res.text.trim().length > 0) {
          finalQuery = res.text.trim();
          setVoiceText(finalQuery);
        } else if (res?.error) {
          Alert.alert(
            'Backend API Key Required',
            'Voice STT requires a valid GROQ_API_KEY or GEMINI_API_KEY in your Railway environment variables. You can also type your message or select a preset prompt below.'
          );
        }
      } catch (err) {
        console.log('Voice transcription error:', err);
      }
    }

    // Filter out Whisper ambient noise hallucinations (e.g. "Thank you.")
    if (finalQuery && isNoiseHallucination(finalQuery)) {
      console.log('[VoiceMode] Filtered ambient noise hallucination:', finalQuery);
      finalQuery = '';
    }

    if (finalQuery) {
      console.log('[VoiceMode] Processing query:', finalQuery);
      setVoiceStatus('thinking');
      send(finalQuery, true);
    } else {
      console.log('[VoiceMode] No query detected. Re-starting listening...');
      setVoiceStatus('listening');
      setIsSpeaking(false);
      if (voiceModeActiveRef.current) {
        setTimeout(() => {
          if (voiceModeActiveRef.current) startVoiceInput();
        }, 400);
      }
    }
  };

  // ── Keyword detection fallback ─────────────────────────────────────────────
const extractIncidentDetails = (raw: string): string => {
  return raw
    .replace(/^(please\s+)?report\s+(an|a)?\s*(incident|hazard|accident|crash|crime|weather)?\s*/i, '')
    .replace(/^[,]?\s*(for|about|that|regarding|there'?s?|is)\s*/i, '')
    .trim();
};

const detectKeywordAction = (msg: string): { type: string; [key: string]: any } | null => {
  const lower = msg.toLowerCase();
  if (/\b(incident|report|accident|hazard|crash|roadblock|crime|weather)\b/.test(lower)) {
    const type = lower.includes('accident') || lower.includes('crash') ? 'accident'
      : lower.includes('crime') || lower.includes('block') ? 'crime'
      : lower.includes('weather') || lower.includes('rain') ? 'weather' : 'hazard';

    const extracted = extractIncidentDetails(msg) || msg;

    return {
      type: 'report_incident',
      incident_type: type,
      title: extracted.length > 35 ? extracted.substring(0, 32) + '...' : extracted,
      severity: 'high',
      description: extracted,
    };
  }
  if (/\b(navigate|directions|where is|take me)\b/i.test(lower)) {
    const dest = msg.replace(/.*(?:navigate to|take me to|where is|directions to)/i, '').trim() || 'Destination';
    return { type: 'navigate', destination: dest };
  }
  if (/\b(ad|advertise|business|promote)\b/.test(lower)) {
    return { type: 'place_ad', business_name: 'My Business', description: msg };
  }
  if (/\bmusic\b/.test(lower)) return { type: 'music', action: 'play' };
  return null;
};

  // ── Conversational incident report flow handler ─────────────────────────────
  const handleIncidentFlow = async (msg: string, isVoiceCall: boolean) => {
    const flow = incidentFlowRef.current;
    let replyText = '';

    if (flow.step === 'type') {
      // Detect incident type from user response
      const lower = msg.toLowerCase();
      if (lower.includes('accident') || lower.includes('crash')) flow.incident_type = 'accident';
      else if (lower.includes('crime') || lower.includes('theft') || lower.includes('robbery') || lower.includes('block')) flow.incident_type = 'crime';
      else if (lower.includes('weather') || lower.includes('rain') || lower.includes('flood') || lower.includes('storm')) flow.incident_type = 'weather';
      else if (lower.includes('hazard') || lower.includes('pothole') || lower.includes('spill') || lower.includes('debris')) flow.incident_type = 'hazard';
      else flow.incident_type = msg.trim() || 'hazard';

      flow.step = 'title';
      replyText = `Got it — reporting a **${flow.incident_type}** incident. Now, what should the **title** be? (e.g. "Oil spill on 3rd Avenue")`;
    } else if (flow.step === 'title') {
      flow.title = msg.trim();
      flow.step = 'description';
      replyText = `Title set to: "${flow.title}". Now, please provide the **incident details / description**:`;
    } else if (flow.step === 'description') {
      flow.description = msg.trim();
      flow.step = 'severity';
      replyText = `Details recorded. Finally, how **severe** is this incident?\n\n• **Low** — Minor, no immediate danger\n• **Medium** — Moderate concern\n• **High** — Significant danger\n• **Critical** — Extremely dangerous, urgent`;
    } else if (flow.step === 'severity') {
      const lower = msg.toLowerCase();
      if (lower.includes('critical')) flow.severity = 'critical';
      else if (lower.includes('high')) flow.severity = 'high';
      else if (lower.includes('medium') || lower.includes('moderate')) flow.severity = 'medium';
      else if (lower.includes('low') || lower.includes('minor')) flow.severity = 'low';
      else flow.severity = 'medium';

      // All details collected — auto-submit
      flow.step = null;
      replyText = `Submitting your incident report now...\n\n📋 **Type:** ${flow.incident_type}\n📝 **Title:** ${flow.title}\n📄 **Details:** ${flow.description}\n⚠️ **Severity:** ${flow.severity}`;

      addChatMessage({ role: 'assistant', content: replyText, id: `a-${Date.now()}` });

      if (isVoiceCall) {
        setVoiceStatus('speaking');
        setIsSpeaking(true);
        speakOutLoud(replyText, () => {
          setIsSpeaking(false);
          if (voiceModeActiveRef.current) {
            setTimeout(() => { if (voiceModeActiveRef.current) startVoiceInput(); }, 400);
          } else { setIsListening(false); }
        });
      }

      // Auto-submit the incident
      await submitIncidentFromFlow(flow);
      return;
    }

    addChatMessage({ role: 'assistant', content: replyText, id: `a-${Date.now()}` });

    if (isVoiceCall) {
      setVoiceStatus('speaking');
      setIsSpeaking(true);
      speakOutLoud(replyText, () => {
        setIsSpeaking(false);
        if (voiceModeActiveRef.current) {
          setTimeout(() => { if (voiceModeActiveRef.current) startVoiceInput(); }, 400);
        } else { setIsListening(false); }
      });
    }
  };

  const submitIncidentFromFlow = async (flow: { incident_type: string; title: string; description: string; severity: string }) => {
    if (!userLocation) {
      addChatMessage({ role: 'assistant', content: '❌ Could not submit — GPS location is unavailable. Please enable location services and try again.', id: `a-${Date.now()}` });
      return;
    }
    try {
      const formData = new FormData();
      formData.append('type', flow.incident_type || 'hazard');
      formData.append('title', flow.title || 'AI Reported Incident');
      formData.append('description', flow.description || flow.title || '');
      formData.append('latitude', userLocation.latitude.toString());
      formData.append('longitude', userLocation.longitude.toString());
      formData.append('severity', flow.severity || 'medium');

      const incident = await incidentsAPI.create(formData);
      addIncident(incident);

      addChatMessage({
        role: 'assistant',
        content: `✅ Report published successfully! "${flow.title}" is now live on the map for nearby drivers.`,
        id: `a-${Date.now()}`,
      });
    } catch (err: any) {
      addChatMessage({
        role: 'assistant',
        content: `❌ Failed to submit report: ${err?.error || 'Unknown error. Please try again.'}`,
        id: `a-${Date.now()}`,
      });
    }
  };

  const send = async (text?: string, isVoiceCall: boolean = false) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg = { role: 'user', content: msg, id: `u-${Date.now()}` };
    addChatMessage(userMsg);

    // Check if we are in the middle of a conversational incident flow
    if (incidentFlowRef.current.step) {
      setLoading(true);
      try {
        await handleIncidentFlow(msg, isVoiceCall);
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const history = (chatMessages || []).slice(-10);
      const res = await aiAPI.chat(msg, history);
      let replyText = typeof res?.text === 'string' && res.text.trim().length > 0 ? res.text : '';
      let action = res?.action;

      if (!action?.type) {
        const detected = detectKeywordAction(msg);
        if (detected) action = detected;
      }

      // If the action is to report an incident, start conversational flow instead
      if (action?.type === 'report_incident') {
        // Detect incident type from the original message if possible
        const lower = msg.toLowerCase();
        let detectedType = '';
        if (lower.includes('accident') || lower.includes('crash')) detectedType = 'accident';
        else if (lower.includes('crime') || lower.includes('theft') || lower.includes('robbery')) detectedType = 'crime';
        else if (lower.includes('weather') || lower.includes('rain') || lower.includes('flood')) detectedType = 'weather';
        else if (lower.includes('hazard') || lower.includes('pothole') || lower.includes('spill')) detectedType = 'hazard';

        if (detectedType) {
          // Type was already mentioned — skip to title
          incidentFlowRef.current = { step: 'title', incident_type: detectedType, title: '', description: '', severity: '' };
          replyText = `I'll help you report a **${detectedType}** incident. What should the **title** be? (e.g. "Oil spill on 3rd Avenue")`;
        } else {
          // Need to ask for type first
          incidentFlowRef.current = { step: 'type', incident_type: '', title: '', description: '', severity: '' };
          replyText = `I'll help you report an incident! First, what **type** of incident is it?\n\n• 🚗 **Accident** / Crash\n• ⚠️ **Hazard** (pothole, oil spill, debris)\n• 🚨 **Crime** (theft, roadblock)\n• 🌩️ **Weather** (flood, storm)`;
        }

        addChatMessage({ role: 'assistant', content: replyText, id: `a-${Date.now()}` });

        if (isVoiceCall) {
          setVoiceStatus('speaking');
          setIsSpeaking(true);
          speakOutLoud(replyText, () => {
            setIsSpeaking(false);
            if (voiceModeActiveRef.current) {
              setTimeout(() => { if (voiceModeActiveRef.current) startVoiceInput(); }, 400);
            } else { setIsListening(false); }
          });
        }

        setLoading(false);
        return;
      }

      if (!replyText) {
        if (action?.type === 'navigate') {
          replyText = `Opening map navigation to ${action.destination || 'your destination'}.`;
        } else if (action?.type === 'place_ad') {
          replyText = `Opening the Ad Portal so you can launch a merchant campaign on the map.`;
        } else if (action?.type === 'music') {
          replyText = `Opening the music player for your trip 🎵`;
        } else {
          replyText = FALLBACK_REPLY;
        }
      }

      addChatMessage({ role: 'assistant', content: replyText, id: `a-${Date.now()}`, action });

      const executeAppAction = (act: any) => {
        if (act?.type === 'navigate') {
          voiceModeActiveRef.current = false;
          setIsListening(false);
          setIsSpeaking(false);
          navigation.navigate('Tabs', { screen: 'Map', params: { destination: act.destination } });
        } else if (act?.type === 'music') {
          voiceModeActiveRef.current = false;
          setIsListening(false);
          setIsSpeaking(false);
          navigation.navigate('Music');
        } else if (act?.type === 'place_ad') {
          voiceModeActiveRef.current = false;
          setIsListening(false);
          setIsSpeaking(false);
          navigation.navigate('Ads', {
            business_name: act.business_name || '',
            description: act.description || '',
            radius_km: act.radius_km || 2,
          });
        }
      };

      if (isVoiceCall) {
        setVoiceStatus('speaking');
        setIsSpeaking(true);
        speakOutLoud(replyText, () => {
          setIsSpeaking(false);

          if (action?.type) {
            executeAppAction(action);
            return;
          }

          if (voiceModeActiveRef.current) {
            setTimeout(() => {
              if (voiceModeActiveRef.current) {
                startVoiceInput();
              }
            }, 400);
          } else {
            setIsListening(false);
          }
        });
      } else {
        if (action?.type) {
          executeAppAction(action);
        }
      }
    } catch {
      const fallbackAction = detectKeywordAction(msg);
      const reply = fallbackAction ? 'Here is the requested action card:' : FALLBACK_REPLY;
      addChatMessage({
        role: 'assistant',
        content: reply,
        id: `a-${Date.now()}`,
        action: fallbackAction || undefined,
      });

      if (isVoiceCall) {
        setVoiceStatus('speaking');
        setIsSpeaking(true);
        speakOutLoud(reply, () => {
          setIsSpeaking(false);
          if (voiceModeActiveRef.current) {
            setTimeout(() => {
              if (voiceModeActiveRef.current) {
                startVoiceInput();
              }
            }, 400);
          } else {
            setIsListening(false);
          }
        });
      }
    } finally {
      setLoading(false);
    }

  };

  // ── Auto-submit incident directly from AI Action Card ─────────────────────
  const autoSubmitIncident = async (action: any, msgId: string) => {
    if (!userLocation) {
      Alert.alert("Location needed", "Please enable GPS location to pin this report on the live map.");
      return;
    }
    setSubmittingActionId(msgId);
    try {
      const formData = new FormData();
      formData.append('type', action.incident_type || 'hazard');
      formData.append('title', action.title || 'AI Reported Incident');
      formData.append('description', action.description || action.title || '');
      formData.append('latitude', userLocation.latitude.toString());
      formData.append('longitude', userLocation.longitude.toString());
      formData.append('severity', action.severity || 'medium');

      const incident = await incidentsAPI.create(formData);
      addIncident(incident);

      addChatMessage({
        role: 'assistant',
        content: `✅ Report published successfully! "${action.title || 'Incident'}" is now live on the map for nearby drivers.`,
        id: `a-${Date.now()}`,
      });
    } catch (err: any) {
      Alert.alert('Error', err?.error || 'Could not auto-submit report.');
    } finally {
      setSubmittingActionId(null);
    }
  };

  const clearChat = () => {
    if (histLoading || loading) return;
    if ((chatMessages || []).length === 0) return;

    Alert.alert('Clear chat', 'Delete all chat history? This can’t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          try {
            await aiAPI.clearHistory();
          } catch {
          } finally {
            setChatMessages([]);
          }
        },
      },
    ]);
  };

  // ── Render Assistant Message + Interactive Action Cards ─────────────────────
  const renderMsg = ({ item }: { item: any }) => {
    const isUser = item?.role === 'user';
    const action = item?.action;

    return (
      <View style={[s.msgRow, isUser && s.msgRowUser]}>
        {!isUser && (
          <View style={s.aiAvatar}>
            <Ionicons name="sparkles" size={13} color={COLORS.accent} />
          </View>
        )}
        <View style={[s.bubble, isUser ? s.bubbleUser : s.bubbleAI]}>
          <Text style={[s.bubbleText, isUser && s.bubbleTextUser]}>{item?.content || ''}</Text>

          {/* Interactive AI Action Cards */}
          {action?.type === 'report_incident' && (
            <View style={s.actionCardContainer}>
              <View style={s.actionCardHeader}>
                <Ionicons name="warning" size={18} color="#EF4444" />
                <Text style={s.actionCardTitle}>Incident Report Form (Auto-Filled)</Text>
              </View>

              <View style={s.actionCardDetails}>
                <View style={s.detailBadgeRow}>
                  <Text style={s.detailBadgeType}>{(action.incident_type || 'hazard').toUpperCase()}</Text>
                  <Text style={[s.detailBadgeSev, { color: getSeverityColor(action.severity) }]}>
                    {(action.severity || 'MEDIUM').toUpperCase()} SEVERITY
                  </Text>
                </View>

                <Text style={s.detailTitle}>{action.title || 'Road Hazard Report'}</Text>
                {action.description ? (
                  <Text style={s.detailDesc} numberOfLines={2}>{action.description}</Text>
                ) : null}
              </View>

              <View style={s.actionCardButtons}>
                <TouchableOpacity
                  style={s.actionBtnPrimary}
                  onPress={() => autoSubmitIncident(action, item.id)}
                  disabled={submittingActionId === item.id}
                  activeOpacity={0.85}
                >
                  {submittingActionId === item.id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="send" size={14} color="#fff" />
                      <Text style={s.actionBtnPrimaryText}>Submit Report Now</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={s.actionBtnSecondary}
                  onPress={() => navigation.navigate('Report', {
                    type: action.incident_type || 'hazard',
                    title: action.title || '',
                    description: action.description || '',
                    severity: action.severity || 'medium',
                  })}
                  activeOpacity={0.85}
                >
                  <Ionicons name="create-outline" size={14} color={COLORS.primary} />
                  <Text style={s.actionBtnSecondaryText}>Edit in Form</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {action?.type === 'navigate' && (
            <View style={s.actionCardContainer}>
              <View style={s.actionCardHeader}>
                <Ionicons name="navigate" size={18} color={COLORS.primary} />
                <Text style={s.actionCardTitle}>Navigation Route Ready</Text>
              </View>
              <Text style={s.detailTitle}>Destination: {action.destination || 'Destination'}</Text>
              <TouchableOpacity
                style={[s.actionBtnPrimary, { marginTop: 10 }]}
                onPress={() => navigation.navigate('Tabs', { screen: 'Map' })}
                activeOpacity={0.85}
              >
                <Ionicons name="map" size={15} color="#fff" />
                <Text style={s.actionBtnPrimaryText}>Start Navigation</Text>
              </TouchableOpacity>
            </View>
          )}

          {action?.type === 'place_ad' && (
            <View style={s.actionCardContainer}>
              <View style={s.actionCardHeader}>
                <Ionicons name="megaphone" size={18} color={COLORS.accent} />
                <Text style={s.actionCardTitle}>Map Ad Campaign (Prefilled)</Text>
              </View>
              <Text style={s.detailTitle}>{action.business_name || 'My Business'}</Text>
              <TouchableOpacity
                style={[s.actionBtnPrimary, { backgroundColor: COLORS.accent, marginTop: 10 }]}
                onPress={() => navigation.navigate('Ads', {
                  business_name: action.business_name || '',
                  description: action.description || '',
                  radius_km: action.radius_km || 2,
                })}
                activeOpacity={0.85}
              >
                <Ionicons name="rocket-outline" size={15} color="#fff" />
                <Text style={s.actionBtnPrimaryText}>Launch Campaign</Text>
              </TouchableOpacity>
            </View>
          )}

          {action?.type === 'music' && (
            <View style={s.actionCardContainer}>
              <TouchableOpacity
                style={[s.actionBtnPrimary, { backgroundColor: '#7F77DD' }]}
                onPress={() => navigation.navigate('Music')}
                activeOpacity={0.85}
              >
                <Ionicons name="musical-notes" size={15} color="#fff" />
                <Text style={s.actionBtnPrimaryText}>Open Music Player</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  const hasMessages = (chatMessages || []).length > 0;

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <View style={s.aiAvatarHeader}>
            <Ionicons name="sparkles" size={16} color={COLORS.accent} />
          </View>
          <View>
            <Text style={s.headerTitle}>Pathy AI</Text>
            <View style={s.headerSubRow}>
              <View style={s.aiStatusDot} />
              <Text style={s.headerSub}>Voice & Action Assistant</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          onPress={clearChat}
          style={[s.clearBtn, !hasMessages && s.clearBtnDisabled]}
          disabled={!hasMessages}
        >
          <Ionicons name="trash-outline" size={18} color={hasMessages ? COLORS.textMuted : COLORS.border} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        {histLoading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color={COLORS.accent} />
          </View>
        ) : (
          <FlatList
            ref={flatRef}
            data={chatMessages || []}
            keyExtractor={(m: any, index: number) => (m?.id ? String(m.id) : `msg-${index}`)}
            renderItem={renderMsg}
            contentContainerStyle={s.msgList}
            onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={<WelcomeCard onStartVoice={startVoiceInput} />}
            ListFooterComponent={loading ? <TypingIndicator /> : null}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Quick prompts */}
        {!hasMessages && !histLoading && (
          <View style={s.quickWrap}>
            <Text style={s.quickLabel}>Try asking Pathy</Text>
            <View style={s.quickGrid}>
              {QUICK_PROMPTS.map((p) => (
                <TouchableOpacity key={p.text} style={s.quickChip} onPress={() => send(p.text)} activeOpacity={0.7}>
                  <View style={s.quickChipIcon}>
                    <Ionicons name={p.icon as any} size={14} color={COLORS.accent} />
                  </View>
                  <Text style={s.quickChipText} numberOfLines={1}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Input bar */}
        <View style={s.inputBar}>
          <TouchableOpacity
            style={s.inputAddBtn}
            onPress={() => Alert.alert('Attachments', 'Sharing photos and files is supported inside the Report Incident form.')}
          >
            <Ionicons name="add" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TextInput
            style={s.textInput}
            placeholder="Ask or speak to Pathy..."
            placeholderTextColor={COLORS.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            onSubmitEditing={() => send()}
          />
          {/* Mic / Voice Input Button */}
          <TouchableOpacity
            style={[s.micBtn, isListening && s.micBtnActive]}
            onPress={startVoiceInput}
            activeOpacity={0.8}
          >
            <Ionicons name={isListening ? "mic" : "mic-outline"} size={20} color={isListening ? "#fff" : COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.sendBtn, (!input.trim() || loading) && s.sendBtnDisabled]}
            onPress={() => send()}
            disabled={!input.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="arrow-up" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* ─── ChatGPT Advanced Voice UI Modal ────────────────────────────────────── */}
      <Modal visible={isListening || isSpeaking} transparent animationType="fade" onRequestClose={() => { voiceModeActiveRef.current = false; setIsListening(false); setIsSpeaking(false); try { if (SpeechModule) SpeechModule.stop(); } catch {} try { if (ExpoSpeechRecognitionModule) ExpoSpeechRecognitionModule.stop(); } catch {} }}>
        <SafeAreaView style={s.chatGptContainer}>
          {/* Top Bar: Menu | ChatGPT Status Pill | Settings */}
          <View style={s.chatGptTopBar}>
            <TouchableOpacity style={s.chatGptIconBtn} onPress={() => { voiceModeActiveRef.current = false; setIsListening(false); setIsSpeaking(false); try { if (SpeechModule) SpeechModule.stop(); } catch {} try { if (ExpoSpeechRecognitionModule) ExpoSpeechRecognitionModule.stop(); } catch {} }}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity style={s.chatGptPillBtn}>
              <View style={[
                s.chatGptStatusDot,
                voiceStatus === 'thinking' && s.dotThinking,
                voiceStatus === 'speaking' && s.dotSpeaking,
              ]} />
              <Text style={s.chatGptPillText}>Pathy Advanced Voice</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.chatGptIconBtn} onPress={() => Alert.alert('Voice Assistant', 'Connected live to Pathy AI with continuous out-loud speech.')}>
              <Ionicons name="sparkles-outline" size={20} color="#A8C0FF" />
            </TouchableOpacity>
          </View>

          {/* Center Stage: Realistic ChatGPT Fluid Gradient Orb & Soundwave */}
          <View style={s.chatGptCenterStage}>
            {/* Outer Glowing Aura Rings */}
            <Animated.View
              style={[
                s.chatGptAuraRing,
                {
                  transform: [{ scale: pulseAnim }],
                  opacity: voiceStatus === 'speaking' ? 0.6 : 0.35,
                },
              ]}
            />

            <Animated.View
              style={[
                s.chatGptAuraRingInner,
                {
                  transform: [{ scale: pulseAnim }],
                  opacity: 0.45,
                },
              ]}
            />

            {/* Main Fluid Gradient Orb */}
            <Animated.View
              style={[
                s.chatGptOrb,
                {
                  transform: [
                    { scale: pulseAnim },
                    {
                      rotate: rotateAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg'],
                      }),
                    },
                  ],
                },
              ]}
            >
              {/* Inner Cloud Gradient Shimmer layers */}
              <View style={s.orbCloudLayer1} />
              <View style={s.orbCloudLayer2} />
              <View style={s.orbCloudCore} />
            </Animated.View>

            {/* Soundwave Equalizer Bars */}
            <View style={s.soundwaveWrap}>
              <Animated.View style={[s.soundwaveBar, { height: bar1Anim, backgroundColor: '#38BDF8' }]} />
              <Animated.View style={[s.soundwaveBar, { height: bar2Anim, backgroundColor: '#6366F1' }]} />
              <Animated.View style={[s.soundwaveBar, { height: bar3Anim, backgroundColor: '#A855F7' }]} />
              <Animated.View style={[s.soundwaveBar, { height: bar4Anim, backgroundColor: '#EC4899' }]} />
              <Animated.View style={[s.soundwaveBar, { height: bar5Anim, backgroundColor: '#10B981' }]} />
            </View>

            {/* Voice Status Badge & Live Transcript */}
            <Text style={s.chatGptStatusText}>
              {voiceStatus === 'thinking'
                ? 'Thinking...'
                : voiceStatus === 'speaking'
                ? 'Pathy AI is Speaking'
                : 'Listening...'}
            </Text>

            {voiceText ? (
              <View style={s.chatGptTranscriptCard}>
                <Ionicons name="chatbubble-ellipses-outline" size={14} color="#8E8E93" style={{ marginTop: 1 }} />
                <Text style={s.chatGptTranscriptText}>{voiceText}</Text>
              </View>
            ) : null}

            {/* Quick Demo Voice Presets */}
            {voiceStatus === 'listening' && (
              <View style={s.chatGptPresetsWrap}>
                {SAMPLE_VOICE_PRESETS.map((preset, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={s.chatGptPresetChip}
                    onPress={() => stopVoiceInputAndSend(preset)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="mic-outline" size={12} color="#A8C0FF" />
                    <Text style={s.chatGptPresetText} numberOfLines={1}>{preset}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Bottom Bar: Ask Pathy Input | Mic | Close Button */}
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={s.chatGptBottomBar}>
              <View style={s.chatGptInputWrap}>
                <Ionicons name="chatbox-outline" size={18} color="#8E8E93" />
                <TextInput
                  style={s.chatGptInput}
                  placeholder="Type to talk with Pathy..."
                  placeholderTextColor="#8E8E93"
                  value={voiceInputText}
                  onChangeText={setVoiceInputText}
                  onSubmitEditing={() => {
                    if (voiceInputText.trim()) {
                      const text = voiceInputText;
                      setVoiceInputText('');
                      stopVoiceInputAndSend(text);
                    }
                  }}
                />
                {voiceInputText.trim().length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      const text = voiceInputText;
                      setVoiceInputText('');
                      stopVoiceInputAndSend(text);
                    }}
                  >
                    <Ionicons name="arrow-up-circle" size={26} color="#6366F1" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Manual Send button — stops recording and sends to AI */}
              <TouchableOpacity
                style={[s.chatGptBottomBtn, { backgroundColor: '#6366F1', borderColor: '#4F46E5' }]}
                onPress={() => stopVoiceInputAndSend()}
              >
                <Ionicons name="send" size={18} color="#fff" />
              </TouchableOpacity>

              {/* Exit voice mode button */}
              <TouchableOpacity
                style={[s.chatGptBottomBtn, { backgroundColor: '#EF4444', borderColor: '#DC2626' }]}
                onPress={() => {
                  // Stop button exits voice mode entirely
                  if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
                  voiceModeActiveRef.current = false;
                  setIsListening(false);
                  setIsSpeaking(false);
                  setVoiceText('');
                  setVoiceStatus('listening');
                  stopCurrentSpeech();
                  try { if (ExpoSpeechRecognitionModule) ExpoSpeechRecognitionModule.stop(); } catch {}
                  if (webRecognitionRef.current) {
                    try { webRecognitionRef.current.stop(); } catch {}
                    webRecognitionRef.current = null;
                  }
                  if (recordingRef.current) {
                    if ((recordingRef as any)._meteringInterval) {
                      clearInterval((recordingRef as any)._meteringInterval);
                    }
                    try { recordingRef.current.stopAndUnloadAsync(); } catch {}
                    recordingRef.current = null;
                  }
                }}
              >
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Welcome Card ─────────────────────────────────────────────────────────────
function WelcomeCard({ onStartVoice }: { onStartVoice: () => void }) {
  const COLORS = useColors();
  const s = makeStyles(COLORS);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  return (
    <View style={s.welcomeWrap}>
      <Animated.View style={[s.orbOuter, { transform: [{ scale: pulseAnim }] }]}>
        <View style={s.orbMid}>
          <TouchableOpacity style={s.orbInner} onPress={onStartVoice} activeOpacity={0.85}>
            <Ionicons name="mic" size={28} color="rgba(255,255,255,0.95)" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Text style={s.welcomeTitle}>Hi, I'm Pathy AI</Text>
      <Text style={s.welcomeText}>
        Speak or type to navigate, report road hazards,{'\n'}play music, or launch map business ads.
      </Text>

      <TouchableOpacity style={s.voiceHeroBtn} onPress={onStartVoice} activeOpacity={0.88}>
        <Ionicons name="mic-outline" size={18} color="#fff" />
        <Text style={s.voiceHeroBtnText}>Tap to Speak to AI</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────
function TypingIndicator() {
  const COLORS = useColors();
  const s = makeStyles(COLORS);
  const dotAnims = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const animations = dotAnims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(anim, { toValue: 1, duration: 350, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 350, useNativeDriver: true }),
          Animated.delay((2 - i) * 150),
        ])
      )
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, [dotAnims]);

  return (
    <View style={s.msgRow}>
      <View style={s.aiAvatar}>
        <Ionicons name="sparkles" size={13} color={COLORS.accent} />
      </View>
      <View style={[s.bubble, s.bubbleAI, { paddingVertical: 14, paddingHorizontal: 18 }]}>
        <View style={s.typingDots}>
          {dotAnims.map((anim, i) => (
            <Animated.View
              key={i}
              style={[
                s.dot,
                {
                  opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
                  transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
                },
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

function getSeverityColor(sev?: string): string {
  switch (sev?.toLowerCase()) {
    case 'low': return '#10B981';
    case 'high': return '#EF4444';
    case 'critical': return '#DC2626';
    default: return '#F59E0B';
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────
function makeStyles(COLORS: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },

    // Header
    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md,
      borderBottomWidth: 1, borderBottomColor: COLORS.border,
      backgroundColor: COLORS.surface,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
    aiAvatarHeader: {
      width: 36, height: 36, borderRadius: RADIUS.full,
      backgroundColor: COLORS.accentSoft, alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold, color: COLORS.text },
    headerSubRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
    aiStatusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#10B981' },
    headerSub: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
    clearBtn: {
      width: 36, height: 36, borderRadius: RADIUS.full,
      backgroundColor: COLORS.surfaceElevated, alignItems: 'center', justifyContent: 'center',
    },
    clearBtnDisabled: { opacity: 0.5 },

    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    msgList: { padding: SPACING.lg, gap: SPACING.sm, paddingBottom: SPACING.xl },
    msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: SPACING.sm, marginBottom: SPACING.xs },
    msgRowUser: { flexDirection: 'row-reverse' },
    aiAvatar: {
      width: 30, height: 30, borderRadius: RADIUS.full,
      backgroundColor: COLORS.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 2,
    },
    bubble: { maxWidth: '82%', borderRadius: RADIUS.lg, padding: SPACING.md },
    bubbleUser: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
    bubbleAI: {
      backgroundColor: COLORS.surface, borderBottomLeftRadius: 4,
      borderWidth: 1, borderColor: COLORS.border,
    },
    bubbleText: { fontSize: FONTS.sizes.md, color: COLORS.text, lineHeight: 22 },
    bubbleTextUser: { color: '#fff' },

    // Action Cards
    actionCardContainer: {
      marginTop: SPACING.md, padding: SPACING.md, borderRadius: RADIUS.md,
      backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border,
    },
    actionCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    actionCardTitle: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.bold, color: COLORS.text },
    actionCardDetails: { marginVertical: 4 },
    detailBadgeRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
    detailBadgeType: { fontSize: 10, fontWeight: '800', color: COLORS.primary, letterSpacing: 0.5 },
    detailBadgeSev: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    detailTitle: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.bold, color: COLORS.text },
    detailDesc: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2 },

    actionCardButtons: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
    actionBtnPrimary: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      backgroundColor: COLORS.primary, paddingVertical: 8, paddingHorizontal: 10, borderRadius: RADIUS.full,
    },
    actionBtnPrimaryText: { color: '#fff', fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.bold },
    actionBtnSecondary: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
      backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.primary,
      paddingVertical: 8, paddingHorizontal: 12, borderRadius: RADIUS.full,
    },
    actionBtnSecondaryText: { color: COLORS.primary, fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.bold },

    // Quick prompts
    quickWrap: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.md },
    quickLabel: {
      fontSize: FONTS.sizes.xs, color: COLORS.textMuted,
      fontWeight: FONTS.weights.semibold, textTransform: 'uppercase',
      letterSpacing: 0.8, marginBottom: SPACING.sm,
    },
    quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
    quickChip: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      flexBasis: '48%', flexGrow: 1,
      backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
      paddingHorizontal: SPACING.sm, paddingVertical: SPACING.sm,
      borderWidth: 1, borderColor: COLORS.border,
    },
    quickChipIcon: {
      width: 24, height: 24, borderRadius: RADIUS.full,
      backgroundColor: COLORS.accentSoft, alignItems: 'center', justifyContent: 'center',
    },
    quickChipText: { flex: 1, fontSize: FONTS.sizes.sm, color: COLORS.text, fontWeight: FONTS.weights.semibold },

    // Input bar
    inputBar: {
      flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
      paddingHorizontal: SPACING.md, paddingVertical: 8,
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.xl,
      borderWidth: 1,
      borderColor: COLORS.border,
      marginHorizontal: 16,
      marginBottom: 90,
      ...SHADOW.sm,
    },
    inputAddBtn: {
      width: 34, height: 34, borderRadius: 17,
      backgroundColor: COLORS.surfaceElevated, alignItems: 'center', justifyContent: 'center',
    },
    textInput: {
      flex: 1, color: COLORS.text, fontSize: FONTS.sizes.md,
      maxHeight: 120, paddingHorizontal: SPACING.xs, paddingVertical: 8,
    },
    micBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: COLORS.surfaceElevated, alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: COLORS.border,
    },
    micBtnActive: { backgroundColor: '#EF4444', borderColor: '#DC2626' },
    sendBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
      ...SHADOW.sm,
    },
    sendBtnDisabled: { opacity: 0.4 },

    // Welcome / Orb
    welcomeWrap: { alignItems: 'center', paddingTop: 36, paddingHorizontal: SPACING.xxl, gap: SPACING.md },
    orbOuter: {
      width: 110, height: 110, borderRadius: 55,
      backgroundColor: '#C77DFF33',
      alignItems: 'center', justifyContent: 'center',
    },
    orbMid: {
      width: 84, height: 84, borderRadius: 42,
      backgroundColor: '#7B9FF944',
      alignItems: 'center', justifyContent: 'center',
    },
    orbInner: {
      width: 60, height: 60, borderRadius: 30,
      backgroundColor: COLORS.primary,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 2, borderColor: '#fff',
      ...SHADOW.md,
    },
    welcomeTitle: {
      fontSize: FONTS.sizes.xxl, fontWeight: FONTS.weights.black,
      color: COLORS.text, textAlign: 'center', lineHeight: 32,
    },
    welcomeText: {
      fontSize: FONTS.sizes.md, color: COLORS.textSecondary,
      textAlign: 'center', lineHeight: 22,
    },
    voiceHeroBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: COLORS.primary, borderRadius: RADIUS.full,
      paddingHorizontal: SPACING.xl, paddingVertical: 12, ...SHADOW.sm, marginTop: 4,
    },
    voiceHeroBtnText: { color: '#fff', fontWeight: FONTS.weights.bold, fontSize: FONTS.sizes.md },

    // Typing
    typingDots: { flexDirection: 'row', gap: 5 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.textMuted },

    // ── ChatGPT Advanced Voice UI Styles ─────────────────────────────────────
    chatGptContainer: {
      flex: 1, backgroundColor: '#0A0A0C', justifyContent: 'space-between',
    },
    chatGptTopBar: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: SPACING.lg, paddingTop: Platform.OS === 'android' ? 16 : 8,
      paddingBottom: 10,
    },
    chatGptIconBtn: {
      width: 42, height: 42, borderRadius: 21,
      backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    },
    chatGptPillBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 16, paddingVertical: 8,
      borderRadius: RADIUS.full, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    },
    chatGptStatusDot: {
      width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981',
    },
    dotThinking: { backgroundColor: '#F59E0B' },
    dotSpeaking: { backgroundColor: '#6366F1' },
    chatGptPillText: { color: '#F3F4F6', fontWeight: FONTS.weights.bold, fontSize: 13, letterSpacing: 0.3 },

    chatGptCenterStage: {
      flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.xl,
    },
    chatGptAuraRing: {
      position: 'absolute', width: 330, height: 330, borderRadius: 165,
      backgroundColor: 'rgba(99,102,241,0.25)',
    },
    chatGptAuraRingInner: {
      position: 'absolute', width: 270, height: 270, borderRadius: 135,
      backgroundColor: 'rgba(168,85,247,0.3)',
    },

    // Main ChatGPT Fluid Gradient Orb
    chatGptOrb: {
      width: 230, height: 230, borderRadius: 115,
      backgroundColor: '#6366F1', overflow: 'hidden',
      alignItems: 'center', justifyContent: 'center',
      shadowColor: '#818CF8', shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.9, shadowRadius: 40, elevation: 25,
    },
    orbCloudLayer1: {
      position: 'absolute', width: 210, height: 210, borderRadius: 105,
      backgroundColor: '#A855F7', top: -35, left: -25, opacity: 0.85,
    },
    orbCloudLayer2: {
      position: 'absolute', width: 190, height: 190, borderRadius: 95,
      backgroundColor: '#38BDF8', bottom: -35, right: -25, opacity: 0.85,
    },
    orbCloudCore: {
      position: 'absolute', width: 130, height: 130, borderRadius: 65,
      backgroundColor: '#FFFFFF', opacity: 0.92,
      shadowColor: '#FFFFFF', shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.95, shadowRadius: 28,
    },

    // Soundwave Visualizer Equalizer
    soundwaveWrap: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 6, height: 50, marginTop: 24,
    },
    soundwaveBar: {
      width: 4, borderRadius: 2,
    },

    chatGptStatusText: {
      fontSize: 15, color: '#9CA3AF', fontWeight: FONTS.weights.semibold,
      marginTop: 12, letterSpacing: 0.6,
    },
    chatGptTranscriptCard: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: RADIUS.lg,
      paddingHorizontal: 16, paddingVertical: 12, marginTop: 14,
      maxWidth: '92%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    },
    chatGptTranscriptText: { color: '#F9FAFB', fontSize: FONTS.sizes.sm, textAlign: 'center', flex: 1 },

    chatGptPresetsWrap: {
      flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center',
      gap: 8, marginTop: 18, maxWidth: '94%',
    },
    chatGptPresetChip: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: RADIUS.full,
      paddingHorizontal: 14, paddingVertical: 8,
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    },
    chatGptPresetText: { color: '#E5E7EB', fontSize: 12, fontWeight: FONTS.weights.medium },

    // Bottom Bar
    chatGptBottomBar: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 18, paddingBottom: Platform.OS === 'ios' ? 16 : 24, paddingTop: 10,
    },
    chatGptInputWrap: {
      flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 26, paddingHorizontal: 16, height: 50,
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
    },
    chatGptInput: { flex: 1, color: '#fff', fontSize: FONTS.sizes.md },
    chatGptBottomBtn: {
      width: 50, height: 50, borderRadius: 25,
      backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    },
    chatGptCloseBtn: {
      width: 48, height: 48, borderRadius: 24,
      backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
    },
  });
}
