import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Animated,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../config/ThemeContext';
import { FONTS, RADIUS, SPACING, SHADOW } from '../config/theme';
import { authAPI } from '../services/api';
import useStore from '../store/useStore';

// Steps: 'email' → 'code' → 'reset' → 'done'
type Step = 'email' | 'code' | 'reset' | 'done';

export default function ForgotPasswordScreen({ navigation }: any) {
  const C = useColors();
  const s = makeStyles(C);
  const { token } = useStore();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(1)).current;

  const fadeTransition = (cb: () => void) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      cb();
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    });
  };

  const handleSendCode = async () => {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Invalid email', 'Please enter a valid email address.'); return;
    }
    setLoading(true);
    try {
      await authAPI.requestPasswordReset(email.trim());
    } catch (e: any) {
      Alert.alert('Error', e?.error || 'Something went wrong.'); setLoading(false); return;
    }
    setLoading(false);
    fadeTransition(() => setStep('code'));
  };

  const handleVerifyCode = async () => {
    if (code.length < 4) {
      Alert.alert('Invalid code', 'Please enter the full verification code.'); return;
    }
    setLoading(true);
    try {
      await authAPI.verifyResetCode(email.trim(), code.trim());
    } catch (e: any) {
      Alert.alert('Invalid code', e?.error || 'That code is incorrect or expired.'); setLoading(false); return;
    }
    setLoading(false);
    fadeTransition(() => setStep('reset'));
  };

  const handleReset = async () => {
    if (password.length < 6) {
      Alert.alert('Too short', 'Password must be at least 6 characters.'); return;
    }
    if (password !== confirm) {
      Alert.alert("Passwords don't match", 'Make sure both fields are identical.'); return;
    }
    setLoading(true);
    try {
      await authAPI.resetPassword(email.trim(), code.trim(), password);
    } catch (e: any) {
      Alert.alert('Error', e?.error || 'Could not reset password.'); setLoading(false); return;
    }
    setLoading(false);
    fadeTransition(() => setStep('done'));
  };

  const border = (f: string) => focused === f ? C.primary : 'rgba(0,108,68,0.15)';

  const STEP_CONFIG = {
    email: { icon: 'mail-outline' as const, title: 'Forgot password?', sub: "Enter your email and we'll send you a reset code.", progress: 1 },
    code:  { icon: 'key-outline' as const,  title: 'Check your email', sub: `We sent a 6-digit code to ${email}`, progress: 2 },
    reset: { icon: 'lock-closed-outline' as const, title: 'New password', sub: 'Choose a strong password for your account.', progress: 3 },
    done:  { icon: 'checkmark-circle-outline' as const, title: 'Password reset!', sub: 'Your password has been updated successfully.', progress: 4 },
  };
  const cfg = STEP_CONFIG[step];

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* BG blobs */}
      <View style={s.blobTR} />
      <View style={s.blobBL} />

      {/* Back button */}
      <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
        <Ionicons name="arrow-back" size={22} color={C.text} />
      </TouchableOpacity>

      {/* Progress dots */}
      <View style={s.progressRow}>
        {[1, 2, 3, 4].map(i => (
          <View key={i} style={[s.progressDot, cfg.progress >= i && s.progressDotActive]} />
        ))}
      </View>

      <Animated.View style={[s.content, { opacity: fadeAnim }]}>

        {/* Icon */}
        <BlurView intensity={50} tint="light" style={s.iconBadge}>
          <Ionicons name={cfg.icon} size={32} color={step === 'done' ? '#006c44' : C.primary} />
        </BlurView>

        <Text style={s.title}>{cfg.title}</Text>
        <Text style={s.sub}>{cfg.sub}</Text>

        <BlurView intensity={70} tint="light" style={s.card}>

          {/* Step: email */}
          {step === 'email' && (
            <>
              <Text style={s.label}>Email address</Text>
              <View style={[s.inputWrap, { borderColor: border('email') }]}>
                <Ionicons name="mail-outline" size={17} color={focused === 'email' ? C.primary : C.textMuted} style={s.icon} />
                <TextInput
                  style={s.input}
                  placeholder="hello@example.com"
                  placeholderTextColor="rgba(0,108,68,0.35)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                />
              </View>
              <TouchableOpacity style={[s.btn, loading && { opacity: 0.7 }]} onPress={handleSendCode} disabled={loading} activeOpacity={0.88}>
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <View style={s.btnInner}>
                    <Text style={s.btnText}>Send Reset Code</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* Step: code */}
          {step === 'code' && (
            <>
              <Text style={s.label}>Verification code</Text>
              <View style={[s.inputWrap, { borderColor: border('code') }]}>
                <Ionicons name="key-outline" size={17} color={focused === 'code' ? C.primary : C.textMuted} style={s.icon} />
                <TextInput
                  style={s.input}
                  placeholder="Enter 6-digit code"
                  placeholderTextColor="rgba(0,108,68,0.35)"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={code}
                  onChangeText={setCode}
                  onFocus={() => setFocused('code')}
                  onBlur={() => setFocused(null)}
                />
              </View>
              <TouchableOpacity style={[s.btn, loading && { opacity: 0.7 }]} onPress={handleVerifyCode} disabled={loading} activeOpacity={0.88}>
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <View style={s.btnInner}>
                    <Text style={s.btnText}>Verify Code</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={s.resendBtn} onPress={handleSendCode}>
                <Text style={s.resendText}>Didn't receive it? <Text style={s.resendLink}>Resend code</Text></Text>
              </TouchableOpacity>
            </>
          )}

          {/* Step: reset */}
          {step === 'reset' && (
            <>
              <Text style={s.label}>New password</Text>
              <View style={[s.inputWrap, { borderColor: border('pw'), marginBottom: SPACING.md }]}>
                <Ionicons name="lock-closed-outline" size={17} color={focused === 'pw' ? C.primary : C.textMuted} style={s.icon} />
                <TextInput
                  style={s.input} placeholder="••••••••"
                  placeholderTextColor="rgba(0,108,68,0.35)"
                  secureTextEntry={!showPw} value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocused('pw')} onBlur={() => setFocused(null)}
                />
                <TouchableOpacity onPress={() => setShowPw(!showPw)} style={s.eye}>
                  <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={17} color={C.textMuted} />
                </TouchableOpacity>
              </View>
              <Text style={s.label}>Confirm new password</Text>
              <View style={[s.inputWrap, { borderColor: border('cpw') }]}>
                <Ionicons name="lock-closed-outline" size={17} color={focused === 'cpw' ? C.primary : C.textMuted} style={s.icon} />
                <TextInput
                  style={s.input} placeholder="••••••••"
                  placeholderTextColor="rgba(0,108,68,0.35)"
                  secureTextEntry={!showConfirm} value={confirm}
                  onChangeText={setConfirm}
                  onFocus={() => setFocused('cpw')} onBlur={() => setFocused(null)}
                />
                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={s.eye}>
                  <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={17} color={C.textMuted} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={[s.btn, { marginTop: SPACING.lg }, loading && { opacity: 0.7 }]} onPress={handleReset} disabled={loading} activeOpacity={0.88}>
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <View style={s.btnInner}>
                    <Text style={s.btnText}>Reset Password</Text>
                    <Ionicons name="checkmark" size={18} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* Step: done */}
          {step === 'done' && (
            <>
              <View style={s.successIcon}>
                <Ionicons name="checkmark-circle" size={64} color="#006c44" />
              </View>
              <Text style={s.successText}>
                {token ? 'Your password has been updated successfully.' : 'You can now sign in with your new password.'}
              </Text>
              <TouchableOpacity
                style={s.btn}
                onPress={() => token ? navigation.navigate('Profile') : navigation.navigate('Login')}
                activeOpacity={0.88}
              >
                <View style={s.btnInner}>
                  <Text style={s.btnText}>{token ? 'Back to Profile' : 'Back to Sign In'}</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </View>
              </TouchableOpacity>
            </>
          )}

        </BlurView>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

function makeStyles(C: any) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.background, paddingTop: 60 },
    blobTR: { position: 'absolute', top: -80, right: -80, width: 260, height: 260, borderRadius: 130, backgroundColor: C.text === '#F9FAFB' ? 'rgba(76,175,125,0.06)' : '#e7fff1', opacity: 0.9 },
    blobBL: { position: 'absolute', bottom: -60, left: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: C.text === '#F9FAFB' ? 'rgba(76,175,125,0.04)' : '#e1f9eb', opacity: 0.7 },

    backBtn: { position: 'absolute', top: 56, left: SPACING.xl, zIndex: 10, width: 40, height: 40, borderRadius: RADIUS.full, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border, ...SHADOW.xs },

    progressRow: { flexDirection: 'row', justifyContent: 'center', gap: SPACING.sm, marginBottom: SPACING.xl, marginTop: SPACING.md },
    progressDot: { width: 28, height: 6, borderRadius: 3, backgroundColor: C.border },
    progressDotActive: { backgroundColor: C.primary },

    content: { flex: 1, paddingHorizontal: SPACING.xl, alignItems: 'center', paddingTop: SPACING.lg },
    iconBadge: { width: 80, height: 80, borderRadius: 24, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg, borderWidth: 1, borderColor: C.border, ...SHADOW.sm },
    title: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: C.text, textAlign: 'center', marginBottom: 8 },
    sub: { fontSize: FONTS.sizes.sm, color: C.textSecondary, textAlign: 'center', marginBottom: SPACING.xl, paddingHorizontal: SPACING.md, lineHeight: 20 },

    card: { width: '100%', borderRadius: RADIUS.xl, overflow: 'hidden', borderWidth: 1, borderColor: C.border, padding: SPACING.xl, backgroundColor: C.text === '#F9FAFB' ? 'rgba(30,40,55,0.85)' : 'rgba(255,255,255,0.8)', ...SHADOW.sm },

    label: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: C.text, marginBottom: SPACING.xs },
    inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: RADIUS.md, borderWidth: 1.5, marginBottom: SPACING.lg },
    icon: { marginLeft: 14 },
    input: { flex: 1, fontSize: FONTS.sizes.md, color: C.text, paddingVertical: 14, paddingHorizontal: SPACING.sm },
    eye: { paddingHorizontal: 14, paddingVertical: 14 },

    btn: { backgroundColor: C.primary, borderRadius: RADIUS.full, paddingVertical: 16, alignItems: 'center', shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 12, elevation: 6 },
    btnInner: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    btnText: { color: '#fff', fontSize: FONTS.sizes.md, fontWeight: '700' },

    resendBtn: { alignItems: 'center', marginTop: SPACING.md },
    resendText: { fontSize: FONTS.sizes.xs, color: C.textSecondary },
    resendLink: { color: C.primary, fontWeight: '600' },

    successIcon: { alignItems: 'center', marginBottom: SPACING.lg },
    successText: { fontSize: FONTS.sizes.sm, color: C.textSecondary, textAlign: 'center', marginBottom: SPACING.xl, lineHeight: 20 },
  });
}
