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

  // ── Voice Recording & Recognition State ─────────────────────────────────────
  const [isListening, setIsListening] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const recognitionRef = useRef<any>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for mic listening state
  useEffect(() => {
    if (isListening) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.35, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isListening, pulseAnim]);

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
    setVoiceText('');
    setIsListening(true);

    // 1. Try Web Speech Recognition if available (Browser environment)
    const SpeechRecognition = typeof window !== 'undefined' &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          setVoiceText(transcript);
        };

        recognition.onerror = (e: any) => {
          console.log('Speech recognition error:', e);
        };

        recognition.onend = () => {
          // Keep active until user closes or submits
        };

        recognition.start();
        recognitionRef.current = recognition;
        return;
      } catch (err) {
        console.log('Web Speech API error:', err);
      }
    }

    // 2. Fallback to Expo AV audio recording session
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.granted) {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        const recording = new Audio.Recording();
        await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        await recording.startAsync();
        recordingRef.current = recording;
      }
    } catch (e) {
      console.log('Expo Audio recording init error:', e);
    }
  };

  const stopVoiceInputAndSend = async (customText?: string) => {
    const finalQuery = (customText || voiceText).trim();

    // Clean up recognition
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    if (recordingRef.current) {
      try { await recordingRef.current.stopAndUnloadAsync(); } catch {}
      recordingRef.current = null;
    }

    setIsListening(false);
    setVoiceText('');

    if (finalQuery) {
      send(finalQuery);
    }
  };

  // ── Keyword detection fallback ─────────────────────────────────────────────
  const detectKeywordAction = (msg: string): { type: string; [key: string]: any } | null => {
    const lower = msg.toLowerCase();
    if (/\b(incident|report|accident|hazard|crash|roadblock|crime|weather)\b/.test(lower)) {
      const type = lower.includes('accident') || lower.includes('crash') ? 'accident'
        : lower.includes('crime') || lower.includes('block') ? 'crime'
        : lower.includes('weather') || lower.includes('rain') ? 'weather' : 'hazard';
      return {
        type: 'report_incident',
        incident_type: type,
        title: msg.length > 35 ? msg.substring(0, 32) + '...' : msg,
        severity: 'high',
        description: msg,
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

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg = { role: 'user', content: msg, id: `u-${Date.now()}` };
    addChatMessage(userMsg);

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

      if (!replyText) {
        if (action?.type === 'report_incident') {
          replyText = `I have extracted the incident details for your report. You can review, auto-submit, or customize the form below:`;
        } else if (action?.type === 'navigate') {
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
    } catch {
      const fallbackAction = detectKeywordAction(msg);
      addChatMessage({
        role: 'assistant',
        content: fallbackAction ? 'Here is the requested action card:' : FALLBACK_REPLY,
        id: `a-${Date.now()}`,
        action: fallbackAction || undefined,
      });
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

      {/* ─── Voice Input Modal ───────────────────────────────────────────────── */}
      <Modal visible={isListening} transparent animationType="fade" onRequestClose={() => setIsListening(false)}>
        <View style={s.voiceModalOverlay}>
          <View style={s.voiceModalCard}>
            <TouchableOpacity style={s.voiceModalClose} onPress={() => setIsListening(false)}>
              <Ionicons name="close" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>

            <Animated.View style={[s.voicePulseRing, { transform: [{ scale: pulseAnim }] }]}>
              <View style={s.voiceMicCircle}>
                <Ionicons name="mic" size={36} color="#fff" />
              </View>
            </Animated.View>

            <Text style={s.voiceTitle}>Listening to your voice...</Text>
            <Text style={s.voiceSub}>Speak naturally (e.g. "Report an accident on 5th Street")</Text>

            {voiceText ? (
              <View style={s.voiceTranscriptBox}>
                <Text style={s.voiceTranscriptText}>{voiceText}</Text>
              </View>
            ) : null}

            {/* Quick Voice Demo Presets */}
            <Text style={s.voicePresetHeading}>TAP A VOICE PRESET TO TEST:</Text>
            <View style={s.voicePresetWrap}>
              {SAMPLE_VOICE_PRESETS.map((preset, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={s.voicePresetChip}
                  onPress={() => stopVoiceInputAndSend(preset)}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={13} color={COLORS.primary} />
                  <Text style={s.voicePresetText} numberOfLines={1}>{preset}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={s.voiceActionRow}>
              <TouchableOpacity
                style={s.voiceCancelBtn}
                onPress={() => { setIsListening(false); setVoiceText(''); }}
              >
                <Text style={s.voiceCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.voiceDoneBtn}
                onPress={() => stopVoiceInputAndSend()}
              >
                <Ionicons name="checkmark" size={16} color="#fff" />
                <Text style={s.voiceDoneText}>Send Speech</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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

    // ── Voice Input Modal ────────────────────────────────────────────────────
    voiceModalOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
      justify: 'center', alignItems: 'center', padding: SPACING.xl,
    },
    voiceModalCard: {
      width: '100%', maxWidth: 360, backgroundColor: COLORS.surface,
      borderRadius: RADIUS.xxl, padding: SPACING.xl, alignItems: 'center',
      borderWidth: 1, borderColor: COLORS.border, ...SHADOW.lg,
    },
    voiceModalClose: { position: 'absolute', top: 16, right: 16, padding: 4 },
    voicePulseRing: {
      width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(239,68,68,0.2)',
      alignItems: 'center', justifyContent: 'center', marginVertical: SPACING.md,
    },
    voiceMicCircle: {
      width: 66, height: 66, borderRadius: 33, backgroundColor: '#EF4444',
      alignItems: 'center', justifyContent: 'center', ...SHADOW.md,
    },
    voiceTitle: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold, color: COLORS.text, marginTop: 4 },
    voiceSub: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, textAlign: 'center', marginTop: 2 },
    voiceTranscriptBox: {
      width: '100%', backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.md,
      padding: SPACING.md, marginVertical: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
    },
    voiceTranscriptText: { fontSize: FONTS.sizes.sm, color: COLORS.text, fontStyle: 'italic', textAlign: 'center' },
    voicePresetHeading: { fontSize: 10, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 0.8, marginTop: 10, marginBottom: 6, alignSelf: 'flex-start' },
    voicePresetWrap: { width: '100%', gap: 6 },
    voicePresetChip: {
      flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.surfaceElevated,
      borderRadius: RADIUS.md, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: COLORS.border,
    },
    voicePresetText: { fontSize: FONTS.sizes.xs, color: COLORS.text, flex: 1 },
    voiceActionRow: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.xl, width: '100%' },
    voiceCancelBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border },
    voiceCancelText: { color: COLORS.textSecondary, fontWeight: FONTS.weights.semibold },
    voiceDoneBtn: { flex: 1.4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: COLORS.primary, paddingVertical: 12, borderRadius: RADIUS.full, ...SHADOW.sm },
    voiceDoneText: { color: '#fff', fontWeight: FONTS.weights.bold },
  });
}
