import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
  Animated, Easing, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../config/ThemeContext';
import { FONTS, RADIUS, SPACING, SHADOW } from '../config/theme';
import { authAPI } from '../services/api';

type Step = 'email' | 'code' | 'reset' | 'done';

export default function ForgotPasswordScreen({ navigation }: any) {
  const C = useColors();
  const s = makeStyles(C);
  const [step, setStep]       = useState<Step>('email');
  const [email, setEmail]     = useState('');
  const [code, setCode]       = useState('');
  const [pw, setPw]           = useState('');
  const [cpw, setCpw]         = useState('');
  const [showPw, setShowPw]   = useState(false);
  const [showCpw, setShowCpw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const opacity  = useRef(new Animated.Value(0)).current;
  const slideY   = useRef(new Animated.Value(14)).current;

  const animIn = () => {
    opacity.setValue(0); slideY.setValue(14);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(slideY,  { toValue: 0, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  };

  useEffect(() => { animIn(); }, []);

  const goTo = (next: Step) => {
    Animated.timing(opacity, { toValue: 0, duration: 130, useNativeDriver: true }).start(() => {
      setStep(next); animIn();
    });
  };

  const sendCode = async () => {
    if (!email.trim() || !email.includes('@')) { Alert.alert('Invalid email', 'Enter a valid email address.'); return; }
    setLoading(true);
    try {
      await authAPI.requestPasswordReset(email);
      setLoading(false);
      Alert.alert('Code Sent', 'A verification code has been sent to your email address.', [
        { text: 'OK', onPress: () => goTo('code') }
      ]);
    } catch (e: any) {
      setLoading(false);
      Alert.alert('Error', e.error || 'Failed to send reset code. Please try again.');
    }
  };

  const verifyCode = async () => {
    if (code.trim().length < 6) { Alert.alert('Incomplete', 'Enter the full 6-digit code.'); return; }
    setLoading(true);
    try {
      await authAPI.verifyResetCode(email, code.trim());
      setLoading(false);
      goTo('reset');
    } catch (e: any) {
      setLoading(false);
      Alert.alert('Invalid Code', e.error || 'Verification failed. Please try again.');
    }
  };

  const resetPw = async () => {
    if (pw.length < 6)  { Alert.alert('Too short', 'Password must be at least 6 characters.'); return; }
    if (pw !== cpw)     { Alert.alert("Doesn't match", 'Both password fields must be identical.'); return; }
    setLoading(true);
    try {
      await authAPI.resetPassword(email, code.trim(), pw);
      setLoading(false);
      goTo('done');
    } catch (e: any) {
      setLoading(false);
      Alert.alert('Error', e.error || 'Failed to reset password. Please try again.');
    }
  };

  const bdr  = (f: string) => focused === f ? '#006c44' : 'rgba(0,108,68,0.15)';
  const prog = { email: 1, code: 2, reset: 3, done: 4 }[step];

  const STEP_META = {
    email: { title: 'Forgot password?',  sub: "Enter your email and we'll send a reset code." },
    code:  { title: 'Check your email',  sub: `We sent a 6-digit code to ${email}` },
    reset: { title: 'New password',       sub: 'Choose a strong password for your account.' },
    done:  { title: 'Password reset!',    sub: 'You can now sign in with your new password.' },
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Back */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
        <Ionicons name="arrow-back" size={20} color={C.text} />
      </TouchableOpacity>

      {/* Progress bar */}
      <View style={s.progressTrack}>
        <Animated.View style={[s.progressFill, { width: `${(prog / 4) * 100}%` }]} />
      </View>

      <Animated.View style={[s.content, { opacity, transform: [{ translateY: slideY }] }]}>
        {/* Logo — no shadow, no box, no border */}
        <Image
          source={require('../../assets/pathy-logo.png')}
          style={s.logo}
          resizeMode="contain"
        />

        <Text style={s.title}>{STEP_META[step].title}</Text>
        <Text style={s.sub}>{STEP_META[step].sub}</Text>

        {/* Step: email */}
        {step === 'email' && (
          <>
            <View style={[s.row, { borderColor: bdr('email') }]}>
              <Ionicons name="mail-outline" size={17} color={focused === 'email' ? '#006c44' : C.textMuted} style={s.ico} />
              <TextInput style={s.inp} placeholder="hello@example.com" placeholderTextColor="rgba(0,108,68,0.35)"
                keyboardType="email-address" autoCapitalize="none"
                value={email} onChangeText={setEmail}
                onFocus={() => setFocused('email')} onBlur={() => setFocused(null)} />
            </View>
            <TouchableOpacity style={[s.btn, loading && { opacity: 0.7 }]} onPress={sendCode} disabled={loading} activeOpacity={0.88}>
              {loading ? <ActivityIndicator color="#fff" /> : <><Text style={s.btnText}>Send Code</Text><Ionicons name="arrow-forward" size={17} color="#fff" /></>}
            </TouchableOpacity>
          </>
        )}

        {/* Step: code */}
        {step === 'code' && (
          <>
            <View style={[s.row, { borderColor: bdr('code') }]}>
              <Ionicons name="key-outline" size={17} color={focused === 'code' ? '#006c44' : C.textMuted} style={s.ico} />
              <TextInput style={s.inp} placeholder="6-digit code" placeholderTextColor="rgba(0,108,68,0.35)"
                keyboardType="number-pad" maxLength={6}
                value={code} onChangeText={setCode}
                onFocus={() => setFocused('code')} onBlur={() => setFocused(null)} />
            </View>
            <TouchableOpacity style={[s.btn, loading && { opacity: 0.7 }]} onPress={verifyCode} disabled={loading} activeOpacity={0.88}>
              {loading ? <ActivityIndicator color="#fff" /> : <><Text style={s.btnText}>Verify Code</Text><Ionicons name="arrow-forward" size={17} color="#fff" /></>}
            </TouchableOpacity>
            <TouchableOpacity style={s.resend} onPress={sendCode}>
              <Text style={s.resendText}>Didn't receive it? <Text style={s.resendLink}>Resend code</Text></Text>
            </TouchableOpacity>
          </>
        )}

        {/* Step: reset */}
        {step === 'reset' && (
          <>
            <View style={[s.row, { borderColor: bdr('pw'), marginBottom: SPACING.md }]}>
              <Ionicons name="lock-closed-outline" size={17} color={focused === 'pw' ? '#006c44' : C.textMuted} style={s.ico} />
              <TextInput style={s.inp} placeholder="New password" placeholderTextColor="rgba(0,108,68,0.35)"
                secureTextEntry={!showPw} value={pw} onChangeText={setPw}
                onFocus={() => setFocused('pw')} onBlur={() => setFocused(null)} />
              <TouchableOpacity onPress={() => setShowPw(!showPw)} style={s.eye}>
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={17} color={C.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={[s.row, { borderColor: bdr('cpw') }]}>
              <Ionicons name="lock-closed-outline" size={17} color={focused === 'cpw' ? '#006c44' : C.textMuted} style={s.ico} />
              <TextInput style={s.inp} placeholder="Confirm password" placeholderTextColor="rgba(0,108,68,0.35)"
                secureTextEntry={!showCpw} value={cpw} onChangeText={setCpw}
                onFocus={() => setFocused('cpw')} onBlur={() => setFocused(null)} />
              <TouchableOpacity onPress={() => setShowCpw(!showCpw)} style={s.eye}>
                <Ionicons name={showCpw ? 'eye-off-outline' : 'eye-outline'} size={17} color={C.textMuted} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[s.btn, { marginTop: SPACING.lg }, loading && { opacity: 0.7 }]} onPress={resetPw} disabled={loading} activeOpacity={0.88}>
              {loading ? <ActivityIndicator color="#fff" /> : <><Text style={s.btnText}>Reset Password</Text><Ionicons name="checkmark" size={17} color="#fff" /></>}
            </TouchableOpacity>
          </>
        )}

        {/* Step: done */}
        {step === 'done' && (
          <>
            <View style={s.successCircle}>
              <Ionicons name="checkmark-circle" size={56} color="#006c44" />
            </View>
            <TouchableOpacity style={s.btn} onPress={() => navigation.goBack()} activeOpacity={0.88}>
              <Text style={s.btnText}>Back to Sign In</Text>
              <Ionicons name="arrow-forward" size={17} color="#fff" />
            </TouchableOpacity>
          </>
        )}
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

function makeStyles(C: any) {
  return StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.background },
  backBtn: { position: 'absolute', top: 56, left: SPACING.xl, zIndex: 10, width: 38, height: 38, borderRadius: RADIUS.full, backgroundColor: C.surfaceGlass, alignItems: 'center', justifyContent: 'center' },

  progressTrack: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: C.border },
  progressFill:  { height: 3, backgroundColor: '#006c44', borderRadius: 2 },

  content: { flex: 1, paddingHorizontal: SPACING.xl, paddingTop: 120, alignItems: 'center' },

  // Logo — purely transparent, no wrapper, no shadow, no border
  logo:   { width: 52, height: 52, marginBottom: SPACING.lg },

  title:  { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: C.text, textAlign: 'center', marginBottom: 6 },
  sub:    { fontSize: FONTS.sizes.sm, color: C.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: SPACING.xl },

  row:    { flexDirection: 'row', alignItems: 'center', width: '100%', backgroundColor: C.surface, borderRadius: RADIUS.md, borderWidth: 1.5, marginBottom: SPACING.lg },
  ico:    { marginLeft: 13 },
  inp:    { flex: 1, color: C.text, fontSize: FONTS.sizes.md, paddingVertical: 14, paddingHorizontal: SPACING.sm },
  eye:    { paddingHorizontal: 13, paddingVertical: 14 },

  btn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, width: '100%', backgroundColor: '#006c44', borderRadius: RADIUS.full, paddingVertical: 16, shadowColor: '#006c44', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 5 },
  btnText: { color: '#fff', fontSize: FONTS.sizes.md, fontWeight: '700' },

  resend:     { marginTop: SPACING.lg },
  resendText: { fontSize: FONTS.sizes.sm, color: C.textSecondary },
  resendLink: { color: '#006c44', fontWeight: '700' },

  successCircle: { marginBottom: SPACING.xl },
});
}
