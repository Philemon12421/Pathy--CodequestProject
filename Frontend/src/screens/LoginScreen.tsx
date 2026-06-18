import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../config/ThemeContext';
import { FONTS, RADIUS, SPACING, SHADOW } from '../config/theme';
import { authAPI } from '../services/api';
import useStore from '../store/useStore';

export default function LoginScreen() {
  const COLORS = useColors();
  const s = makeStyles(COLORS);
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const setAuth = useStore((s) => s.setAuth);

  const handle = async () => {
    setLoading(true);
    try {
      const fn = isLogin ? authAPI.login : authAPI.register;
      const res = await fn(form);
      setAuth(res.token, res.user);
    } catch (err: any) {
      Alert.alert('Error', err.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* ── Decorative gradient blobs ── */}
        <View style={s.blobTopRight} />
        <View style={s.blobBottomLeft} />

        {/* ── Logo / Brand ── */}
        <View style={s.logoSection}>
          <View style={s.logoCircle}>
            <View style={s.logoInner}>
              <Ionicons name="shield-checkmark" size={32} color="#FFFFFF" />
            </View>
          </View>
          <Text style={s.appName}>Routh Flow</Text>
          <Text style={s.tagline}>Your AI-powered safety companion</Text>
        </View>

        {/* ── Card ── */}
        <View style={s.card}>
          {/* Tab toggle */}
          <View style={s.tabRow}>
            <TouchableOpacity
              style={[s.tabBtn, isLogin && s.tabBtnActive]}
              onPress={() => setIsLogin(true)}
            >
              <Text style={[s.tabBtnText, isLogin && s.tabBtnTextActive]}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.tabBtn, !isLogin && s.tabBtnActive]}
              onPress={() => setIsLogin(false)}
            >
              <Text style={[s.tabBtnText, !isLogin && s.tabBtnTextActive]}>Create Account</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.heading}>{isLogin ? 'Welcome back 👋' : 'Join Routh Flow'}</Text>

          {!isLogin && (
            <View style={s.inputWrap}>
              <View style={s.inputIconWrap}>
                <Ionicons name="person-outline" size={16} color={COLORS.textMuted} />
              </View>
              <TextInput
                style={s.input}
                placeholder="Full name"
                placeholderTextColor={COLORS.textMuted}
                value={form.name}
                onChangeText={(v) => setForm({ ...form, name: v })}
              />
            </View>
          )}

          <View style={s.inputWrap}>
            <View style={s.inputIconWrap}>
              <Ionicons name="mail-outline" size={16} color={COLORS.textMuted} />
            </View>
            <TextInput
              style={s.input}
              placeholder="Email address"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={form.email}
              onChangeText={(v) => setForm({ ...form, email: v })}
            />
          </View>

          <View style={s.inputWrap}>
            <View style={s.inputIconWrap}>
              <Ionicons name="lock-closed-outline" size={16} color={COLORS.textMuted} />
            </View>
            <TextInput
              style={[s.input, { flex: 1 }]}
              placeholder="Password"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry={!showPw}
              value={form.password}
              onChangeText={(v) => setForm({ ...form, password: v })}
            />
            <TouchableOpacity onPress={() => setShowPw(!showPw)} style={s.eyeBtn}>
              <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Primary CTA */}
          <TouchableOpacity style={s.btn} onPress={handle} disabled={loading} activeOpacity={0.88}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : (
                <View style={s.btnContent}>
                  <Text style={s.btnText}>{isLogin ? 'Sign In' : 'Create Account'}</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </View>
              )
            }
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={s.switchWrap}>
            <Text style={s.switchText}>
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <Text style={s.switchLink}>{isLogin ? 'Sign up' : 'Sign in'}</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Feature pills */}
        <View style={s.featureRow}>
          <View style={s.featurePill}>
            <Ionicons name="shield-checkmark" size={13} color="#10B981" />
            <Text style={s.featurePillText}>Safe Routes</Text>
          </View>
          <View style={s.featurePill}>
            <Ionicons name="sparkles" size={13} color="#4F7FFA" />
            <Text style={s.featurePillText}>AI Powered</Text>
          </View>
          <View style={s.featurePill}>
            <Ionicons name="location" size={13} color="#F59E0B" />
            <Text style={s.featurePillText}>Live Map</Text>
          </View>
        </View>

        <Text style={s.demo}>Demo: demo@safetrack.app / password</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(COLORS: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    scroll: { flexGrow: 1, padding: SPACING.xl, paddingTop: 60 },

    // Decorative blobs
    blobTopRight: {
      position: 'absolute', top: -40, right: -60,
      width: 200, height: 200, borderRadius: 100,
      backgroundColor: COLORS.accentSoft, opacity: 0.7,
    },
    blobBottomLeft: {
      position: 'absolute', bottom: 80, left: -80,
      width: 220, height: 220, borderRadius: 110,
      backgroundColor: '#F3EEFF', opacity: 0.6,
    },

    // Logo
    logoSection: { alignItems: 'center', marginBottom: SPACING.xxl },
    logoCircle: {
      width: 84, height: 84, borderRadius: RADIUS.full,
      backgroundColor: COLORS.primary,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: SPACING.md, ...SHADOW.dark,
    },
    logoInner: {
      width: 64, height: 64, borderRadius: RADIUS.full,
      alignItems: 'center', justifyContent: 'center',
    },
    appName: {
      fontSize: FONTS.sizes.xxxl, fontWeight: FONTS.weights.black,
      color: COLORS.text, letterSpacing: -1,
    },
    tagline: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 4 },

    // Card
    card: {
      backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
      padding: SPACING.xl, ...SHADOW.md,
      borderWidth: 1, borderColor: COLORS.border,
    },
    tabRow: {
      flexDirection: 'row', backgroundColor: COLORS.surfaceElevated,
      borderRadius: RADIUS.md, padding: 4, marginBottom: SPACING.xl,
    },
    tabBtn: {
      flex: 1, paddingVertical: SPACING.sm,
      alignItems: 'center', borderRadius: RADIUS.sm,
    },
    tabBtnActive: {
      backgroundColor: COLORS.surface, ...SHADOW.xs,
    },
    tabBtnText: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, fontWeight: FONTS.weights.medium },
    tabBtnTextActive: { color: COLORS.text, fontWeight: FONTS.weights.bold },

    heading: {
      fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.bold,
      color: COLORS.text, marginBottom: SPACING.lg,
    },

    inputWrap: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: COLORS.surfaceElevated,
      borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
      marginBottom: SPACING.md,
    },
    inputIconWrap: {
      width: 44, alignItems: 'center', justifyContent: 'center',
    },
    input: {
      flex: 1, color: COLORS.text, fontSize: FONTS.sizes.md,
      paddingVertical: 14, paddingRight: SPACING.md,
    },
    eyeBtn: { paddingHorizontal: SPACING.md, paddingVertical: 14 },

    btn: {
      backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
      paddingVertical: 16, alignItems: 'center',
      marginTop: SPACING.sm, ...SHADOW.dark,
    },
    btnContent: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    btnText: { color: '#fff', fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold },

    switchWrap: { alignItems: 'center', marginTop: SPACING.lg },
    switchText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm },
    switchLink: { color: COLORS.accent, fontWeight: FONTS.weights.semibold },

    // Feature pills
    featureRow: {
      flexDirection: 'row', justifyContent: 'center', gap: SPACING.sm,
      marginTop: SPACING.xl,
    },
    featurePill: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      backgroundColor: COLORS.surface, borderRadius: RADIUS.full,
      paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
      borderWidth: 1, borderColor: COLORS.border,
    },
    featurePillText: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, fontWeight: FONTS.weights.medium },

    demo: { textAlign: 'center', color: COLORS.textMuted, fontSize: FONTS.sizes.xs, marginTop: SPACING.lg },
  });
}
