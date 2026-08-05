import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Image,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
  Alert, Animated, Easing,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../config/ThemeContext';
import { FONTS, RADIUS, SPACING, SHADOW } from '../config/theme';
import { authAPI } from '../services/api';
import useStore from '../store/useStore';


export default function LoginScreen({ navigation }: any) {
  const C = useColors();
  const s = makeStyles(C);
  const setAuth = useStore((s) => s.setAuth);
  const [isLogin, setIsLogin]   = useState(true);
  const [form, setForm]         = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [showPw, setShowPw]     = useState(false);
  const [showCPw, setShowCPw]   = useState(false);
  const [focused, setFocused]   = useState<string | null>(null);
  const [tabLayout, setTabLayout] = useState({ width: 0 });

  // Screen mount animation
  const screenOpacity   = useRef(new Animated.Value(0)).current;
  const screenTranslate = useRef(new Animated.Value(20)).current;

  // Tab switch: form crossfade + directional slide
  const formOpacity   = useRef(new Animated.Value(1)).current;
  const formTranslate = useRef(new Animated.Value(0)).current;

  // Sliding pill indicator under the active tab
  const indicatorX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(screenOpacity,   { toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(screenTranslate, { toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  const switchTab = (toLogin: boolean) => {
    if (toLogin === isLogin) return;

    Animated.spring(indicatorX, { toValue: toLogin ? 0 : 1, friction: 9, tension: 80, useNativeDriver: true }).start();

    const exitX  = toLogin ? 14 : -14;
    const enterX = toLogin ? -14 : 14;

    Animated.parallel([
      Animated.timing(formOpacity,   { toValue: 0, duration: 130, useNativeDriver: true }),
      Animated.timing(formTranslate, { toValue: exitX, duration: 130, useNativeDriver: true }),
    ]).start(() => {
      setIsLogin(toLogin);
      formTranslate.setValue(enterX);
      Animated.parallel([
        Animated.timing(formOpacity,   { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(formTranslate, { toValue: 0, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    });
  };

  const handle = async () => {
    if (!isLogin) {
      if (form.password !== form.confirmPassword) { Alert.alert("Passwords don't match", 'Both fields must match.'); return; }
      if (!agreedToTerms) { Alert.alert('Terms required', 'Please agree to the Terms of Service.'); return; }
    }
    setLoading(true);
    try {
      const fn  = isLogin ? authAPI.login : authAPI.register;
      const res = await fn(form);
      AsyncStorage.setItem('pathy_has_onboarded', 'true').catch(() => {});
      setTimeout(() => {
        setAuth(res.token, res.user);
      }, 0);
    } catch (err: any) {
      Alert.alert('Oops', err?.error || err?.message || 'Something went wrong. Please try again.');
    } finally { setLoading(false); }

  };


  const bdr = (f: string) => focused === f ? '#006c44' : 'rgba(0,108,68,0.15)';

  const tabWidth = (tabLayout.width - 8) / 2;
  const indicatorTranslateX = indicatorX.interpolate({ inputRange: [0, 1], outputRange: [4, 4 + tabWidth] });

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={s.blobTR} />
      <View style={s.blobBL} />

      <Animated.View style={{ flex: 1, opacity: screenOpacity, transform: [{ translateY: screenTranslate }] }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Logo — transparent, no box, no border */}
          <View style={s.brand}>
            <Image source={require('../../assets/pathy-logo.png')} style={s.logo} resizeMode="contain" />
            <Text style={s.appName}>Pathy</Text>
          </View>

          {/* Tab toggle with sliding indicator */}
            <View style={s.tabWrap} onLayout={(e) => setTabLayout({ width: e.nativeEvent.layout.width })}>
             <Animated.View style={[s.tabIndicator, { width: tabWidth, transform: [{ translateX: indicatorTranslateX }] }]} />       
             <TouchableOpacity style={s.tabBtn} onPress={() => switchTab(true)}  activeOpacity={0.8}>
              <Text style={[s.tabText, isLogin  && s.tabTextActive]}>Sign In</Text>
             </TouchableOpacity>
             <TouchableOpacity style={s.tabBtn} onPress={() => switchTab(false)} activeOpacity={0.8}>
              <Text style={[s.tabText, !isLogin && s.tabTextActive]}>Create Account</Text>
            </TouchableOpacity>
          </View>

          {/* Animated form */}
          <Animated.View style={{ opacity: formOpacity, transform: [{ translateX: formTranslate }] }}>

            {!isLogin && (
              <View style={s.field}>
                <Text style={s.label}>Full Name</Text>
                <View style={[s.row, { borderColor: bdr('name') }]}>
                  <Ionicons name="person-outline"      size={17} color={focused === 'name'     ? '#006c44' : C.textMuted} style={s.ico} />
                  <TextInput style={s.inp} placeholder="Your full name" placeholderTextColor="rgba(0,108,68,0.35)"
                    value={form.name} onChangeText={v => setForm({ ...form, name: v })}
                    onFocus={() => setFocused('name')} onBlur={() => setFocused(null)} />
                </View>
              </View>
            )}

            <View style={s.field}>
              <Text style={s.label}>Email</Text>
              <View style={[s.row, { borderColor: bdr('email') }]}>
                <Ionicons name="mail-outline"          size={17} color={focused === 'email'    ? '#006c44' : C.textMuted} style={s.ico} />
                <TextInput style={s.inp} placeholder="hello@example.com" placeholderTextColor="rgba(0,108,68,0.35)"
                  keyboardType="email-address" autoCapitalize="none"
                  value={form.email} onChangeText={v => setForm({ ...form, email: v })}
                  onFocus={() => setFocused('email')} onBlur={() => setFocused(null)} />
              </View>
            </View>

            <View style={s.field}>
              <View style={s.labelRow}>
                <Text style={s.label}>Password</Text>
                {isLogin && (
                  <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                    <Text style={s.forgot}>Forgot password?</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={[s.row, { borderColor: bdr('pw') }]}>
                <Ionicons name="lock-closed-outline"   size={17} color={focused === 'pw'       ? '#006c44' : C.textMuted} style={s.ico} />
                <TextInput style={s.inp} placeholder="••••••••" placeholderTextColor="rgba(0,108,68,0.35)"
                  secureTextEntry={!showPw} value={form.password} onChangeText={v => setForm({ ...form, password: v })}
                  onFocus={() => setFocused('pw')} onBlur={() => setFocused(null)} />
                <TouchableOpacity onPress={() => setShowPw(!showPw)} style={s.eye}>
                  <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={17} color={C.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            {!isLogin && (
              <View style={s.field}>
                <Text style={s.label}>Confirm Password</Text>
                <View style={[s.row, { borderColor: bdr('cpw') }]}>
                  <Ionicons name="lock-closed-outline" size={17} color={focused === 'cpw'      ? '#006c44' : C.textMuted} style={s.ico} />
                  <TextInput style={s.inp} placeholder="••••••••" placeholderTextColor="rgba(0,108,68,0.35)"
                    secureTextEntry={!showCPw} value={form.confirmPassword} onChangeText={v => setForm({ ...form, confirmPassword: v })}
                    onFocus={() => setFocused('cpw')} onBlur={() => setFocused(null)} />
                  <TouchableOpacity onPress={() => setShowCPw(!showCPw)} style={s.eye}>
                    <Ionicons name={showCPw ? 'eye-off-outline' : 'eye-outline'} size={17} color={C.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {!isLogin && (
              <TouchableOpacity style={s.termsRow} onPress={() => setAgreedToTerms(!agreedToTerms)} activeOpacity={0.7}>
                <View style={[s.checkbox, agreedToTerms && s.checkboxOn]}>
                  {agreedToTerms && <Ionicons name="checkmark" size={13} color="#fff" />}
                </View>
                <Text style={s.termsText}>
                  I agree to the{' '}
                  <Text style={s.termsLink} onPress={() => navigation.navigate('Terms', { showActions: true })}>Terms of Service</Text>
                  {' '}and{' '}
                  <Text style={s.termsLink} onPress={() => navigation.navigate('Privacy')}>Privacy Policy</Text>
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={[s.btn, loading && { opacity: 0.7 }]} onPress={handle} disabled={loading} activeOpacity={0.88}>
              {loading ? <ActivityIndicator color="#fff" /> : (
                <View style={s.btnInner}>
                  <Text style={s.btnText}>{isLogin ? 'Sign In' : 'Create Account'}</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => switchTab(!isLogin)} style={s.switchRow}>
              <Text style={s.switchText}>
                {isLogin ? "Don't have an account? " : 'Already have an account? '}
                <Text style={s.switchLink}>{isLogin ? 'Sign Up' : 'Sign In'}</Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

function makeStyles(C: any) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  blobTR: { position: 'absolute', top: -40, right: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: '#e1f9eb', opacity: 0.55 },
  blobBL: { position: 'absolute', bottom: 80,  left: -80,  width: 220, height: 220, borderRadius: 110, backgroundColor: '#e7fff1', opacity: 0.55 },
  scroll: { flexGrow: 1, paddingHorizontal: SPACING.xl, paddingTop: 64, paddingBottom: 48 },

  brand:   { alignItems: 'center', marginBottom: SPACING.xxl },
  logo:    { width: 64, height: 64, marginBottom: SPACING.sm },          // no container, no border
  appName: { fontSize: FONTS.sizes.xxxl, fontWeight: '800', color: '#006c44', letterSpacing: -1 },

  tabWrap: { flexDirection: 'row', backgroundColor: C.border, borderRadius: RADIUS.md, padding: 4, marginBottom: SPACING.xl, position: 'relative' },
  tabIndicator: { position: 'absolute', top: 4, bottom: 4, backgroundColor: C.surface, borderRadius: RADIUS.sm, ...SHADOW.xs },
  tabBtn:  { flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: RADIUS.sm, zIndex: 1 },
  tabText: { fontSize: FONTS.sizes.sm, color: C.textMuted, fontWeight: '500' },
  tabTextActive: { color: '#006c44', fontWeight: '700' },

  field:    { marginBottom: SPACING.md },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label:    { fontSize: FONTS.sizes.sm, fontWeight: '600', color: C.text, marginBottom: SPACING.xs },
  forgot:   { fontSize: FONTS.sizes.xs, color: '#006c44', fontWeight: '600' },
  row:      { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: RADIUS.md, borderWidth: 1.5 },
  ico:      { marginLeft: 13 },
  inp:      { flex: 1, color: C.text, fontSize: FONTS.sizes.md, paddingVertical: 14, paddingHorizontal: SPACING.sm },
  eye:      { paddingHorizontal: 13, paddingVertical: 14 },

  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, marginBottom: SPACING.lg, marginTop: SPACING.xs },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: 'rgba(0,108,68,0.3)', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxOn: { backgroundColor: '#006c44', borderColor: '#006c44' },
  termsText: { flex: 1, fontSize: FONTS.sizes.xs, color: C.textSecondary, lineHeight: 18 },
  termsLink: { color: '#006c44', fontWeight: '600' },

  btn:     { backgroundColor: '#006c44', borderRadius: RADIUS.full, paddingVertical: 16, alignItems: 'center', marginTop: SPACING.sm, shadowColor: '#006c44', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 12, elevation: 6 },
  btnInner:{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  btnText: { color: '#fff', fontSize: FONTS.sizes.md, fontWeight: '700' },

  switchRow: { alignItems: 'center', marginTop: SPACING.lg },
  switchText:{ fontSize: FONTS.sizes.sm, color: C.textSecondary },
  switchLink:{ color: '#006c44', fontWeight: '700' },
});
}
