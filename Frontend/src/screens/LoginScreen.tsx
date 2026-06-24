import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Image,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  ScrollView, Alert, Animated,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { FONTS, RADIUS, SPACING, SHADOW, getColors } from '../config/theme';
import { authAPI } from '../services/api';
import useStore from '../store/useStore';

// Auth screens always light
const C = getColors('light');

// ─── Sandbox bypass ───────────────────────────────────────────────────────────
// Only visible when running in Expo Go / development (__DEV__ === true).
// In a production build this button is completely removed by the bundler.
// Tapping it injects a fake token + fake user directly into Zustand store,
// bypassing the backend entirely — safe for UI testing.
const SANDBOX_USER = { id: 0, name: 'Demo User', email: 'demo@pathy.app', role: 'user' };
const SANDBOX_TOKEN = 'sandbox_dev_token';

export default function LoginScreen() {
  const setAuth = useStore((s) => s.setAuth);
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  // Smooth fade when toggling Sign In ↔ Create Account
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const switchTab = (toLogin: boolean) => {
    if (toLogin === isLogin) return;
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
    ]).start(() => {
      setIsLogin(toLogin);
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  };

  const handle = async () => {
    if (!isLogin) {
      if (form.password !== form.confirmPassword) {
        Alert.alert("Passwords don't match", 'Make sure both password fields are the same.'); return;
      }
      if (!agreed) {
        Alert.alert('Terms required', 'Please agree to continue.'); return;
      }
    }
    setLoading(true);
    try {
      const fn = isLogin ? authAPI.login : authAPI.register;
      const res = await fn(form);
      setAuth(res.token, res.user);
    } catch (err: any) {
      Alert.alert('Error', err.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const border = (field: string) =>
    focused === field ? C.primary : 'rgba(0,108,68,0.15)';

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Background blobs */}
      <View style={s.blobTR} />
      <View style={s.blobBL} />

      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand */}
        <View style={s.brand}>
          <BlurView intensity={50} tint="light" style={s.logoBadge}>
            <Image
              source={require('../../assets/pathy-logo.png')}
              style={s.logoImg}
              resizeMode="contain"
            />
          </BlurView>
          <Text style={s.appName}>Pathy</Text>
        </View>

        {/* Tab toggle */}
        <View style={s.tabWrap}>
          <BlurView intensity={40} tint="light" style={s.tabBlur}>
            <View style={s.tabRow}>
              {['Sign In', 'Create Account'].map((label, i) => {
                const active = isLogin ? i === 0 : i === 1;
                return (
                  <TouchableOpacity
                    key={label}
                    style={[s.tabBtn, active && s.tabBtnActive]}
                    onPress={() => switchTab(i === 0)}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.tabText, active && s.tabTextActive]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </BlurView>
        </View>

        {/* Form card */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <BlurView intensity={75} tint="light" style={s.card}>

            <Text style={s.heading}>{isLogin ? 'Welcome back 👋' : 'Create your account'}</Text>
            <Text style={s.sub}>{isLogin ? 'Sign in to continue your journey' : 'Join the community of everyday explorers'}</Text>

            {/* Full name — sign up only */}
            {!isLogin && (
              <Field label="Full Name" icon="person-outline" focused={focused === 'name'}
                input={
                  <TextInput style={s.input} placeholder="Your full name"
                    placeholderTextColor="rgba(0,108,68,0.35)"
                    value={form.name} onChangeText={(v) => setForm({ ...form, name: v })}
                    onFocus={() => setFocused('name')} onBlur={() => setFocused(null)} />
                } borderColor={border('name')} />
            )}

            {/* Email */}
            <Field label="Email" icon="mail-outline" focused={focused === 'email'}
              input={
                <TextInput style={s.input} placeholder="hello@example.com"
                  placeholderTextColor="rgba(0,108,68,0.35)"
                  keyboardType="email-address" autoCapitalize="none"
                  value={form.email} onChangeText={(v) => setForm({ ...form, email: v })}
                  onFocus={() => setFocused('email')} onBlur={() => setFocused(null)} />
              } borderColor={border('email')} />

            {/* Password */}
            <View style={s.fieldGroup}>
              <View style={s.labelRow}>
                <Text style={s.label}>Password</Text>
                {isLogin && (
                  <TouchableOpacity onPress={() => Alert.alert('Reset password', 'Password reset coming soon.')}>
                    <Text style={s.forgotLink}>Forgot password?</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={[s.inputWrap, { borderColor: border('pw') }]}>
                <Ionicons name="lock-closed-outline" size={17} color={focused === 'pw' ? C.primary : C.textMuted} style={s.icon} />
                <TextInput style={s.input} placeholder="••••••••"
                  placeholderTextColor="rgba(0,108,68,0.35)"
                  secureTextEntry={!showPw}
                  value={form.password} onChangeText={(v) => setForm({ ...form, password: v })}
                  onFocus={() => setFocused('pw')} onBlur={() => setFocused(null)} />
                <TouchableOpacity onPress={() => setShowPw(!showPw)} style={s.eye}>
                  <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={17} color={C.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm password — sign up only */}
            {!isLogin && (
              <View style={s.fieldGroup}>
                <Text style={s.label}>Confirm Password</Text>
                <View style={[s.inputWrap, { borderColor: border('cpw') }]}>
                  <Ionicons name="lock-closed-outline" size={17} color={focused === 'cpw' ? C.primary : C.textMuted} style={s.icon} />
                  <TextInput style={s.input} placeholder="••••••••"
                    placeholderTextColor="rgba(0,108,68,0.35)"
                    secureTextEntry={!showConfirm}
                    value={form.confirmPassword} onChangeText={(v) => setForm({ ...form, confirmPassword: v })}
                    onFocus={() => setFocused('cpw')} onBlur={() => setFocused(null)} />
                  <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={s.eye}>
                    <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={17} color={C.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Terms — sign up only */}
            {!isLogin && (
              <TouchableOpacity style={s.termsRow} onPress={() => setAgreed(!agreed)} activeOpacity={0.7}>
                <View style={[s.checkbox, agreed && s.checkboxOn]}>
                  {agreed && <Ionicons name="checkmark" size={12} color="#fff" />}
                </View>
                <Text style={s.termsText}>
                  I agree to the <Text style={s.termsLink}>Terms of Service</Text> and <Text style={s.termsLink}>Privacy Policy</Text>
                </Text>
              </TouchableOpacity>
            )}

            {/* CTA */}
            <TouchableOpacity style={[s.btn, loading && { opacity: 0.7 }]} onPress={handle} disabled={loading} activeOpacity={0.88}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <View style={s.btnInner}>
                    <Text style={s.btnText}>{isLogin ? 'Sign In' : 'Create Account'}</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  </View>
              }
            </TouchableOpacity>

            {/* Divider */}
            <View style={s.divider}>
              <View style={s.divLine} />
              <Text style={s.divText}>OR CONTINUE WITH</Text>
              <View style={s.divLine} />
            </View>

            {/* Social */}
            <View style={s.socialRow}>
              <TouchableOpacity style={s.socialBtn} activeOpacity={0.85}>
                <Ionicons name="logo-google" size={18} color={C.text} />
                <Text style={s.socialText}>Google</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.socialBtn} activeOpacity={0.85}>
                <Ionicons name="logo-apple" size={19} color={C.text} />
                <Text style={s.socialText}>Apple</Text>
              </TouchableOpacity>
            </View>

          </BlurView>
        </Animated.View>

        {/* Switch link */}
        <TouchableOpacity onPress={() => switchTab(!isLogin)} style={s.switchRow}>
          <Text style={s.switchText}>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <Text style={s.switchLink}>{isLogin ? 'Sign Up' : 'Sign In'}</Text>
          </Text>
        </TouchableOpacity>

        {/* ── Sandbox bypass — DEV only ─────────────────────────────────────
             This block is stripped from production builds automatically.
             Tap to skip the backend and go straight to the app with a fake user. */}
        {__DEV__ && (
          <TouchableOpacity
            style={s.sandboxBtn}
            onPress={() => setAuth(SANDBOX_TOKEN, SANDBOX_USER)}
            activeOpacity={0.85}
          >
            <Ionicons name="flask-outline" size={15} color="#7c3aed" />
            <Text style={s.sandboxText}>Dev Sandbox — Skip Login</Text>
          </TouchableOpacity>
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Reusable Field wrapper ──────────────────────────────────────────────────
function Field({ label, icon, input, borderColor, focused }: any) {
  return (
    <View style={s.fieldGroup}>
      <Text style={s.label}>{label}</Text>
      <View style={[s.inputWrap, { borderColor }]}>
        <Ionicons name={icon} size={17} color={focused ? C.primary : C.textMuted} style={s.icon} />
        {input}
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },

  blobTR: {
    position: 'absolute', top: -80, right: -80,
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: '#e7fff1', opacity: 0.85,
  },
  blobBL: {
    position: 'absolute', bottom: -60, left: -60,
    width: 240, height: 240, borderRadius: 120,
    backgroundColor: '#e1f9eb', opacity: 0.7,
  },

  scroll: { flexGrow: 1, paddingHorizontal: SPACING.xl, paddingTop: 64, paddingBottom: 48 },

  // Brand
  brand: { alignItems: 'center', marginBottom: SPACING.xl },
  logoBadge: {
    width: 72, height: 72, borderRadius: 20, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: 'rgba(0,108,68,0.12)', ...SHADOW.sm,
  },
  logoImg: { width: 44, height: 44 },
  appName: { fontSize: 30, fontWeight: '800', color: C.primary, letterSpacing: -0.5 },

  // Tabs
  tabWrap: { marginBottom: SPACING.lg },
  tabBlur: {
    borderRadius: RADIUS.md, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(0,108,68,0.1)',
  },
  tabRow: {
    flexDirection: 'row', padding: 4,
    backgroundColor: 'rgba(231,255,241,0.6)',
  },
  tabBtn: {
    flex: 1, paddingVertical: 11,
    alignItems: 'center', borderRadius: RADIUS.sm - 2,
  },
  tabBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#006c44', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 6, elevation: 3,
  },
  tabText: { fontSize: FONTS.sizes.sm, fontWeight: '500', color: 'rgba(0,108,68,0.45)' },
  tabTextActive: { color: C.primary, fontWeight: '700' },

  // Card
  card: {
    borderRadius: RADIUS.xl, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(0,108,68,0.1)',
    padding: SPACING.xl,
    backgroundColor: 'rgba(255,255,255,0.8)',
    ...SHADOW.sm,
  },
  heading: { fontSize: FONTS.sizes.xl, fontWeight: '700', color: C.text, marginBottom: 4 },
  sub: { fontSize: FONTS.sizes.sm, color: C.textSecondary, marginBottom: SPACING.xl },

  // Fields
  fieldGroup: { marginBottom: SPACING.md },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.xs },
  label: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: C.text, marginBottom: SPACING.xs },
  forgotLink: { fontSize: FONTS.sizes.xs, color: C.primary, fontWeight: '600' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: RADIUS.md, borderWidth: 1.5,
  },
  icon: { marginLeft: 14 },
  input: {
    flex: 1, fontSize: FONTS.sizes.md, color: '#0b1f17',
    paddingVertical: 14, paddingHorizontal: SPACING.sm,
  },
  eye: { paddingHorizontal: 14, paddingVertical: 14 },

  // Terms
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, marginBottom: SPACING.lg, marginTop: SPACING.xs },
  checkbox: {
    width: 20, height: 20, borderRadius: 5,
    borderWidth: 1.5, borderColor: 'rgba(0,108,68,0.3)',
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
    backgroundColor: '#fff',
  },
  checkboxOn: { backgroundColor: C.primary, borderColor: C.primary },
  termsText: { flex: 1, fontSize: FONTS.sizes.xs, color: C.textSecondary, lineHeight: 19 },
  termsLink: { color: C.primary, fontWeight: '600' },

  // CTA
  btn: {
    backgroundColor: C.primary, borderRadius: RADIUS.full,
    paddingVertical: 16, alignItems: 'center', marginTop: SPACING.sm,
    shadowColor: '#006c44', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28, shadowRadius: 12, elevation: 6,
  },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  btnText: { color: '#fff', fontSize: FONTS.sizes.md, fontWeight: '700' },

  // Divider
  divider: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.xl, marginBottom: SPACING.lg },
  divLine: { flex: 1, height: 1, backgroundColor: 'rgba(0,108,68,0.12)' },
  divText: { fontSize: 10, color: C.textMuted, fontWeight: '600', letterSpacing: 0.8 },

  // Social
  socialRow: { flexDirection: 'row', gap: SPACING.md },
  socialBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: RADIUS.full,
    paddingVertical: 14, borderWidth: 1.5, borderColor: 'rgba(0,108,68,0.15)',
  },
  socialText: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: C.text },

  // Switch
  switchRow: { alignItems: 'center', marginTop: SPACING.lg },
  switchText: { fontSize: FONTS.sizes.sm, color: C.textSecondary },
  switchLink: { color: C.primary, fontWeight: '700' },

  // Sandbox bypass button
  sandboxBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.sm, marginTop: SPACING.xl,
    paddingVertical: 12, paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.full,
    borderWidth: 1.5, borderColor: 'rgba(124,58,237,0.3)',
    backgroundColor: 'rgba(124,58,237,0.06)',
  },
  sandboxText: { fontSize: FONTS.sizes.xs, color: '#7c3aed', fontWeight: '600' },
});
