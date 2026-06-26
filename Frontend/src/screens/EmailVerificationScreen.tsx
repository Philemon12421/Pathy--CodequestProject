import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FONTS, RADIUS, SPACING, SHADOW, getColors } from '../config/theme';

const C = getColors('light');
const CODE_LENGTH = 6;

export default function EmailVerificationScreen({ navigation, route }: any) {
  const email = route?.params?.email || 'your email';
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(30);
  const inputRefs = useRef<TextInput[]>([]);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleKey = (val: string, index: number) => {
    const digit = val.replace(/[^0-9]/g, '').slice(-1);
    const next = [...code];
    next[index] = digit;
    setCode(next);
    if (digit && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleBackspace = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const verify = async () => {
    const full = code.join('');
    if (full.length < CODE_LENGTH) {
      shake();
      Alert.alert('Incomplete', 'Please enter all 6 digits.');
      return;
    }
    setLoading(true);
    try {
      // TODO: call authAPI.verifyEmail(email, full)
      await new Promise(r => setTimeout(r, 1200));
      Alert.alert('Verified!', 'Your email has been verified.', [
        { text: 'Continue', onPress: () => navigation.replace('Main') },
      ]);
    } catch {
      shake();
      Alert.alert('Invalid code', 'That code is incorrect or expired. Try again.');
      setCode(Array(CODE_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally { setLoading(false); }
  };

  const resend = async () => {
    if (resendCooldown > 0) return;
    setResendCooldown(30);
    // TODO: call authAPI.resendVerification(email)
    Alert.alert('Sent!', 'A new code has been sent to your email.');
  };

  const filled = code.filter(Boolean).length;

  return (
    <SafeAreaView style={s.root}>
      {/* Back */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
        <Ionicons name="arrow-back" size={22} color={C.text} />
      </TouchableOpacity>

      {/* Header */}
      <View style={s.header}>
        <Text style={s.appName}>Pathy</Text>
      </View>

      <View style={s.content}>
        {/* Icon */}
        <View style={s.iconWrap}>
          <Ionicons name="mail-unread-outline" size={40} color="#006c44" />
        </View>

        <Text style={s.title}>Verify your email</Text>
        <Text style={s.sub}>
          We've sent a {CODE_LENGTH}-digit verification code to{'\n'}
          <Text style={s.emailText}>{email}</Text>
        </Text>

        {/* OTP boxes */}
        <Animated.View style={[s.codeRow, { transform: [{ translateX: shakeAnim }] }]}>
          {Array(CODE_LENGTH).fill(0).map((_, i) => (
            <View key={i} style={[s.codeBox, code[i] ? s.codeBoxFilled : {}, i === filled && s.codeBoxActive]}>
              <TextInput
                ref={ref => { if (ref) inputRefs.current[i] = ref; }}
                style={s.codeInput}
                keyboardType="number-pad"
                maxLength={1}
                value={code[i]}
                onChangeText={v => handleKey(v, i)}
                onKeyPress={e => handleBackspace(e, i)}
                selectTextOnFocus
                caretHidden
              />
            </View>
          ))}
        </Animated.View>

        {/* Verify button */}
        <TouchableOpacity
          style={[s.verifyBtn, (filled < CODE_LENGTH || loading) && { opacity: 0.6 }]}
          onPress={verify}
          disabled={filled < CODE_LENGTH || loading}
          activeOpacity={0.88}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.verifyText}>Verify Code</Text>
          }
        </TouchableOpacity>

        {/* Resend */}
        <View style={s.resendRow}>
          <Text style={s.resendLabel}>Didn't receive the code?</Text>
          <TouchableOpacity onPress={resend} disabled={resendCooldown > 0}>
            <Text style={[s.resendLink, resendCooldown > 0 && { color: C.textMuted }]}>
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer */}
      <View style={s.footer}>
        <View style={s.footerDivider} />
        <View style={s.footerRow}>
          <Ionicons name="shield-checkmark-outline" size={18} color={C.textMuted} />
          <Text style={s.footerText}>SECURE VERIFICATION</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },
  backBtn: { position: 'absolute', top: 56, left: SPACING.xl, zIndex: 10, width: 40, height: 40, borderRadius: RADIUS.full, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' },
  header: { alignItems: 'center', paddingTop: 60, marginBottom: SPACING.xxl },
  appName: { fontSize: FONTS.sizes.xl, fontWeight: '800', color: '#006c44' },

  content: { flex: 1, paddingHorizontal: SPACING.xl, alignItems: 'center' },
  iconWrap: { width: 88, height: 88, borderRadius: RADIUS.full, backgroundColor: '#e1f9eb', alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.xl },
  title: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: C.text, marginBottom: SPACING.sm },
  sub: { fontSize: FONTS.sizes.md, color: C.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: SPACING.xxl },
  emailText: { fontWeight: '700', color: C.text },

  codeRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.xxl },
  codeBox: {
    width: 48, height: 60, borderRadius: RADIUS.lg,
    borderWidth: 1.5, borderColor: 'rgba(0,108,68,0.2)',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f8faf9',
  },
  codeBoxFilled: { backgroundColor: '#e1f9eb', borderColor: '#006c44' },
  codeBoxActive: { borderColor: '#006c44', borderWidth: 2, backgroundColor: '#fff' },
  codeInput: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: '#0b1f17', textAlign: 'center', width: '100%', height: '100%' },

  verifyBtn: { width: '100%', backgroundColor: '#006c44', borderRadius: RADIUS.full, paddingVertical: 18, alignItems: 'center', shadowColor: '#006c44', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6, marginBottom: SPACING.xl },
  verifyText: { color: '#fff', fontSize: FONTS.sizes.md, fontWeight: '700' },

  resendRow: { alignItems: 'center', gap: SPACING.xs },
  resendLabel: { fontSize: FONTS.sizes.sm, color: C.textSecondary },
  resendLink: { fontSize: FONTS.sizes.sm, color: '#006c44', fontWeight: '700' },

  footer: { paddingBottom: SPACING.xl },
  footerDivider: { height: 1, backgroundColor: '#f0f0f0', marginBottom: SPACING.lg },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm },
  footerText: { fontSize: 11, color: C.textMuted, fontWeight: '600', letterSpacing: 1.5 },
});
