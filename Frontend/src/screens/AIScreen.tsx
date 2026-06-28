import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../config/ThemeContext';
import { FONTS, RADIUS, SPACING, SHADOW } from '../config/theme';
import { aiAPI, incidentsAPI } from '../services/api';
import useStore from '../store/useStore';

const QUICK_PROMPTS = [
  { label: '🗺️ Navigate to...', text: 'Navigate me to ' },
  { label: '⚠️ Report hazard', text: 'I want to report a hazard on the road near me' },
  { label: '🎵 Play music',    text: 'Play some music for my drive' },
  { label: '📣 Place an ad',   text: 'I want to advertise my business on the map' },
  { label: '🚗 Safety tips',   text: 'Give me road safety tips for night driving' },
  { label: '☁️ Weather alert', text: 'Is there any weather warning I should know about?' },
];

export default function AIScreen({ navigation }: any) {
  const COLORS = useColors();
  const s = makeStyles(COLORS);
  const flatRef = useRef<any>(null);
  const { chatMessages, addChatMessage, setChatMessages, userLocation } = useStore();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [histLoading, setHistLoading] = useState(true);

  useEffect(() => {
    aiAPI.getHistory()
      .then((msgs: any) => setChatMessages(msgs.map((m: any) => ({ role: m.role, content: m.content, id: m.id || Math.random().toString() }))))
      .catch(() => {})
      .finally(() => setHistLoading(false));
  }, [setChatMessages]);

  const send = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg = { role: 'user', content: msg, id: Date.now().toString() };
    addChatMessage(userMsg);
    setLoading(true);

    try {
      const history = chatMessages.slice(-10);
      const res = await aiAPI.chat(msg, history);
      const aiMsg = { role: 'assistant', content: res.text, id: (Date.now() + 1).toString(), action: res.action };
      addChatMessage(aiMsg);
      if (res.action) handleAction(res.action);
    } catch {
      addChatMessage({ role: 'assistant', content: "I'm having trouble connecting right now. Please try again.", id: Date.now().toString() });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: any) => {
    switch (action.type) {
      case 'navigate':
        Alert.alert('🗺️ Navigate', `Open map and navigate to "${action.destination}"?`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Go', onPress: () => navigation.navigate('Map') },
        ]); break;
      case 'report_incident':
        Alert.alert('⚠️ Report Incident', `Report a ${action.incident_type}: "${action.title}"?`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Report Now', onPress: async () => {
              if (!userLocation) { Alert.alert('Error', 'Location not available'); return; }
              try {
                const formData = new FormData();
                formData.append('type', action.incident_type || 'other');
                formData.append('title', action.title);
                formData.append('description', action.description || '');
                formData.append('latitude', userLocation.latitude.toString());
                formData.append('longitude', userLocation.longitude.toString());
                formData.append('severity', action.severity || 'medium');
                await incidentsAPI.create(formData);
                addChatMessage({ role: 'assistant', content: '✅ Incident reported successfully on the map!', id: Date.now().toString() });
              } catch { Alert.alert('Error', 'Could not report incident'); }
            }
          },
        ]); break;
      case 'place_ad':
        Alert.alert('📣 Place Ad', `Set up a map ad for "${action.business_name}"?`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Ads', onPress: () => navigation.navigate('Ads') },
        ]); break;
      case 'music':
        navigation.navigate('Music'); break;
    }
  };

  const clearChat = () => {
    Alert.alert('Clear Chat', 'Delete all chat history?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: async () => {
          await aiAPI.clearHistory(); setChatMessages([]);
        }
      },
    ]);
  };

  const renderMsg = ({ item }: { item: any }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[s.msgRow, isUser && s.msgRowUser]}>
        {!isUser && (
          <View style={s.aiAvatar}>
            <Ionicons name="sparkles" size={13} color={COLORS.accent} />
          </View>
        )}
        <View style={[s.bubble, isUser ? s.bubbleUser : s.bubbleAI]}>
          <Text style={[s.bubbleText, isUser && s.bubbleTextUser]}>{item.content}</Text>
          {item.action && (
            <View style={s.actionChip}>
              <Ionicons name={getActionIcon(item.action.type) as any} size={11} color={COLORS.accent} />
              <Text style={s.actionChipText}>{getActionLabel(item.action)}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container}>
      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <View style={s.aiStatusDot} />
          <View>
            <Text style={s.headerTitle}>Routh Flow AI</Text>
            <Text style={s.headerSub}>Powered by Gemini</Text>
          </View>
        </View>
        <TouchableOpacity onPress={clearChat} style={s.clearBtn}>
          <Ionicons name="trash-outline" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        {histLoading ? (
          <View style={s.center}><ActivityIndicator size="large" color={COLORS.accent} /></View>
        ) : (
          <FlatList
            ref={flatRef}
            data={chatMessages}
            keyExtractor={(m) => m.id || m.created_at}
            renderItem={renderMsg}
            contentContainerStyle={s.msgList}
            onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={<WelcomeCard />}
            ListFooterComponent={loading ? <TypingIndicator /> : null}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Quick prompts (shown only when empty) */}
        {chatMessages.length === 0 && !histLoading && (
          <View style={s.quickWrap}>
            <Text style={s.quickLabel}>Try asking...</Text>
            <View style={s.quickGrid}>
              {QUICK_PROMPTS.map((p) => (
                <TouchableOpacity key={p.text} style={s.quickChip} onPress={() => send(p.text)} activeOpacity={0.8}>
                  <Text style={s.quickChipText}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ── Input Bar ── */}
        <View style={s.inputBar}>
          <TouchableOpacity style={s.inputAddBtn}>
            <Ionicons name="add" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TextInput
            style={s.textInput}
            placeholder="Ask Anything..."
            placeholderTextColor={COLORS.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            onSubmitEditing={() => send()}
          />
          <TouchableOpacity style={s.micBtn}>
            <Ionicons name="mic-outline" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.sendBtn, (!input.trim() || loading) && s.sendBtnDisabled]}
            onPress={() => send()}
            disabled={!input.trim() || loading}
          >
            {loading
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="arrow-up" size={18} color="#fff" />
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Welcome Card ─────────────────────────────────────────────────────────────
function WelcomeCard() {
  const COLORS = useColors();
  const s = makeStyles(COLORS);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 1800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={s.welcomeWrap}>
      {/* Iridescent orb matching the reference image */}
      <Animated.View style={[s.orbOuter, { transform: [{ scale: pulseAnim }] }]}>
        <View style={s.orbMid}>
          <View style={s.orbInner}>
            <Ionicons name="sparkles" size={28} color="rgba(255,255,255,0.9)" />
          </View>
        </View>
      </Animated.View>

      <Text style={s.welcomeTitle}>AI Finds Answers{'\n'}Faster</Text>
      <Text style={s.welcomeText}>
        I can help you navigate, report incidents,{'\n'}control music, and place ads on the map.
      </Text>

      {/* Feature chips — matching reference bottom row */}
      <View style={s.featureRow}>
        <FeatureChip icon="navigate" label="Smart Nav" sub="Turn-by-turn" />
        <FeatureChip icon="warning" label="Incidents" sub="AI Detection" />
        <FeatureChip icon="bar-chart" label="Reports" sub="Analytics" />
      </View>
    </View>
  );
}

function FeatureChip({ icon, label, sub }: any) {
  const COLORS = useColors();
  const s = makeStyles(COLORS);
  return (
    <View style={s.featureChip}>
      <View style={[s.featureChipIcon, { backgroundColor: COLORS.accentSoft }]}>
        <Ionicons name={icon} size={16} color={COLORS.accent} />
      </View>
      <Text style={s.featureChipLabel}>{label}</Text>
      <Text style={s.featureChipSub}>{sub}</Text>
    </View>
  );
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────
function TypingIndicator() {
  const COLORS = useColors();
  const s = makeStyles(COLORS);
  return (
    <View style={s.msgRow}>
      <View style={s.aiAvatar}>
        <Ionicons name="sparkles" size={13} color={COLORS.accent} />
      </View>
      <View style={[s.bubble, s.bubbleAI, { paddingVertical: 14, paddingHorizontal: 18 }]}>
        <View style={s.typingDots}>
          {[0, 1, 2].map((i) => <View key={i} style={[s.dot, { opacity: 0.3 + i * 0.35 }]} />)}
        </View>
      </View>
    </View>
  );
}

function getActionIcon(type: string): any {
  return { navigate: 'map', report_incident: 'warning', place_ad: 'megaphone', music: 'musical-notes' }[type] || 'flash';
}
function getActionLabel(action: any) {
  return ({ navigate: `→ Navigate to ${action.destination}`, report_incident: `→ Report ${action.incident_type}`, place_ad: `→ Place Ad`, music: `→ Music` } as Record<string, string>)[action.type] || '→ Action';
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
    aiStatusDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#10B981' },
    headerTitle: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold, color: COLORS.text },
    headerSub: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
    clearBtn: {
      width: 36, height: 36, borderRadius: RADIUS.full,
      backgroundColor: COLORS.surfaceElevated, alignItems: 'center', justifyContent: 'center',
    },

    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    msgList: { padding: SPACING.lg, gap: SPACING.sm, paddingBottom: SPACING.xl },
    msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: SPACING.sm, marginBottom: SPACING.xs },
    msgRowUser: { flexDirection: 'row-reverse' },
    aiAvatar: {
      width: 30, height: 30, borderRadius: RADIUS.full,
      backgroundColor: COLORS.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 2,
    },
    bubble: { maxWidth: '78%', borderRadius: RADIUS.lg, padding: SPACING.md },
    bubbleUser: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
    bubbleAI: {
      backgroundColor: COLORS.surface, borderBottomLeftRadius: 4,
      borderWidth: 1, borderColor: COLORS.border,
    },
    bubbleText: { fontSize: FONTS.sizes.md, color: COLORS.text, lineHeight: 22 },
    bubbleTextUser: { color: '#fff' },
    actionChip: {
      flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: SPACING.sm,
      backgroundColor: COLORS.accentSoft, borderRadius: RADIUS.full,
      paddingHorizontal: SPACING.sm, paddingVertical: 4, alignSelf: 'flex-start',
    },
    actionChipText: { fontSize: FONTS.sizes.xs, color: COLORS.accent, fontWeight: FONTS.weights.semibold },

    // Quick prompts
    quickWrap: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.md },
    quickLabel: {
      fontSize: FONTS.sizes.xs, color: COLORS.textMuted,
      fontWeight: FONTS.weights.semibold, textTransform: 'uppercase',
      letterSpacing: 0.8, marginBottom: SPACING.sm,
    },
    quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
    quickChip: {
      backgroundColor: COLORS.surface, borderRadius: RADIUS.full,
      paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
      borderWidth: 1, borderColor: COLORS.border,
    },
    quickChipText: { fontSize: FONTS.sizes.sm, color: COLORS.text },

    // Input bar — matches reference design
    inputBar: {
      flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
      paddingHorizontal: SPACING.md, paddingVertical: 8,
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.xl,
      borderWidth: 1,
      borderColor: COLORS.border,
      marginHorizontal: 16,
      marginBottom: 90, // position above the floating tab bar
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
      width: 34, height: 34, borderRadius: 17,
      backgroundColor: COLORS.surfaceElevated, alignItems: 'center', justifyContent: 'center',
    },
    sendBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
      ...SHADOW.sm,
    },
    sendBtnDisabled: { opacity: 0.4 },

    // Welcome / Orb
    welcomeWrap: { alignItems: 'center', paddingTop: 48, paddingHorizontal: SPACING.xxl, gap: SPACING.lg },
    // Layered orb (purple → blue → teal gradient via nested Views)
    orbOuter: {
      width: 120, height: 120, borderRadius: 60,
      backgroundColor: '#C77DFF33',
      alignItems: 'center', justifyContent: 'center',
    },
    orbMid: {
      width: 90, height: 90, borderRadius: 45,
      backgroundColor: '#7B9FF944',
      alignItems: 'center', justifyContent: 'center',
    },
    orbInner: {
      width: 64, height: 64, borderRadius: 32,
      backgroundColor: '#5EEAD455',
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 2, borderColor: 'rgba(199,125,255,0.4)',
    },
    welcomeTitle: {
      fontSize: FONTS.sizes.xxl, fontWeight: FONTS.weights.black,
      color: COLORS.text, textAlign: 'center', lineHeight: 34,
    },
    welcomeText: {
      fontSize: FONTS.sizes.md, color: COLORS.textSecondary,
      textAlign: 'center', lineHeight: 22,
    },
    featureRow: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.sm },
    featureChip: {
      flex: 1, alignItems: 'center', gap: 4,
      backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
      padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, ...SHADOW.xs,
    },
    featureChipIcon: { width: 32, height: 32, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
    featureChipLabel: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.bold, color: COLORS.text },
    featureChipSub: { fontSize: 10, color: COLORS.textMuted },

    // Typing
    typingDots: { flexDirection: 'row', gap: 5 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.textMuted },
  });
}
