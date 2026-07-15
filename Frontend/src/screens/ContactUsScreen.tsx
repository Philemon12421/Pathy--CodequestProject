import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../config/ThemeContext';
import { FONTS, RADIUS, SPACING, SHADOW } from '../config/theme';



export default function ContactUsScreen({ navigation }: any) {
  const C = useColors();
  const s = makeStyles(C);
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const border = (f: string) => focused === f ? '#006c44' : 'rgba(0,108,68,0.15)';

  const submit = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      Alert.alert('Required fields', 'Please fill in your name, email and message.'); return;
    }
    if (!form.email.includes('@')) {
      Alert.alert('Invalid email', 'Please enter a valid email address.'); return;
    }
    setLoading(true);
    // TODO: POST to /api/contact
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);
    setSent(true);
  };

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Contact Us</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <BlurView intensity={50} tint="light" style={s.hero}>
          <View style={s.heroIcon}>
            <Ionicons name="chatbubbles-outline" size={32} color="#006c44" />
          </View>
          <Text style={s.heroTitle}>We'd love to hear from you</Text>
          <Text style={s.heroSub}>Send us a message and we'll get back to you within 24 hours.</Text>
        </BlurView>

  
        {/* Divider */}
        <View style={s.dividerRow}>
          <View style={s.dividerLine} />
          <Text style={s.dividerText}>OR SEND A MESSAGE</Text>
          <View style={s.dividerLine} />
        </View>

        {sent ? (
          /* Success state */
          <BlurView intensity={50} tint="light" style={s.successCard}>
            <View style={s.successIcon}>
              <Ionicons name="checkmark-circle" size={48} color="#006c44" />
            </View>
            <Text style={s.successTitle}>Message Sent!</Text>
            <Text style={s.successText}>Thanks for reaching out. We'll reply to {form.email} within 24 hours.</Text>
            <TouchableOpacity style={s.sendAgainBtn} onPress={() => { setSent(false); setForm({ name: '', email: '', subject: '', message: '' }); }}>
              <Text style={s.sendAgainText}>Send another message</Text>
            </TouchableOpacity>
          </BlurView>
        ) : (
          /* Form */
          <BlurView intensity={60} tint="light" style={s.formCard}>
            <View style={s.field}>
              <Text style={s.label}>Your Name</Text>
              <View style={[s.inputWrap, { borderColor: border('name') }]}>
                <Ionicons name="person-outline" size={16} color={focused === 'name' ? '#006c44' : C.textMuted} style={s.icon} />
                <TextInput style={s.input} placeholder="Full name" placeholderTextColor="rgba(0,108,68,0.35)"
                  value={form.name} onChangeText={v => setForm({ ...form, name: v })}
                  onFocus={() => setFocused('name')} onBlur={() => setFocused(null)} />
              </View>
            </View>

            <View style={s.field}>
              <Text style={s.label}>Email Address</Text>
              <View style={[s.inputWrap, { borderColor: border('email') }]}>
                <Ionicons name="mail-outline" size={16} color={focused === 'email' ? '#006c44' : C.textMuted} style={s.icon} />
                <TextInput style={s.input} placeholder="you@example.com" placeholderTextColor="rgba(0,108,68,0.35)"
                  keyboardType="email-address" autoCapitalize="none"
                  value={form.email} onChangeText={v => setForm({ ...form, email: v })}
                  onFocus={() => setFocused('email')} onBlur={() => setFocused(null)} />
              </View>
            </View>

            <View style={s.field}>
              <Text style={s.label}>Subject</Text>
              <View style={[s.inputWrap, { borderColor: border('subject') }]}>
                <Ionicons name="document-text-outline" size={16} color={focused === 'subject' ? '#006c44' : C.textMuted} style={s.icon} />
                <TextInput style={s.input} placeholder="How can we help?" placeholderTextColor="rgba(0,108,68,0.35)"
                  value={form.subject} onChangeText={v => setForm({ ...form, subject: v })}
                  onFocus={() => setFocused('subject')} onBlur={() => setFocused(null)} />
              </View>
            </View>

            <View style={s.field}>
              <Text style={s.label}>Message</Text>
              <View style={[s.inputWrap, s.textareaWrap, { borderColor: border('message') }]}>
                <TextInput style={[s.input, s.textarea]} placeholder="Tell us more..." placeholderTextColor="rgba(0,108,68,0.35)"
                  multiline numberOfLines={5} textAlignVertical="top"
                  value={form.message} onChangeText={v => setForm({ ...form, message: v })}
                  onFocus={() => setFocused('message')} onBlur={() => setFocused(null)} />
              </View>
            </View>

            <TouchableOpacity style={[s.submitBtn, loading && { opacity: 0.7 }]} onPress={submit} disabled={loading} activeOpacity={0.88}>
              {loading ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Ionicons name="send" size={16} color="#fff" />
                  <Text style={s.submitText}>Send Message</Text>
                </>
              )}
            </TouchableOpacity>
          </BlurView>
        )}

        {/* Footer note */}
        <View style={s.footerNote}>
          <Ionicons name="shield-checkmark-outline" size={14} color={C.textMuted} />
          <Text style={s.footerText}>We typically respond within 24 hours on business days.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(C: any) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn: { width: 36, height: 36, borderRadius: RADIUS.full, backgroundColor: C.surfaceGlass, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: C.text },

  scroll: { padding: SPACING.xl, paddingBottom: 60, gap: SPACING.xl },

  hero: { borderRadius: RADIUS.xl, overflow: 'hidden', padding: SPACING.xl, alignItems: 'center', gap: SPACING.sm, borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceGlass },
  heroIcon: { width: 72, height: 72, borderRadius: RADIUS.full, backgroundColor: '#e1f9eb', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: FONTS.sizes.xl, fontWeight: '800', color: C.text, textAlign: 'center' },
  heroSub: { fontSize: FONTS.sizes.sm, color: C.textSecondary, textAlign: 'center', lineHeight: 20 },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: C.textMuted, letterSpacing: 0.8 },
  methodsRow: { flexDirection: 'row', gap: SPACING.md },
  methodCard: { flex: 1, borderRadius: RADIUS.xl, padding: SPACING.md, alignItems: 'center', gap: SPACING.xs, ...SHADOW.xs },
  methodLabel: { fontSize: FONTS.sizes.xs, fontWeight: '700' },
  methodSub: { fontSize: 9, color: C.textMuted, textAlign: 'center' },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.border },
  dividerText: { fontSize: 10, color: C.textMuted, fontWeight: '600', letterSpacing: 0.8 },

  formCard: { borderRadius: RADIUS.xl, overflow: 'hidden', padding: SPACING.xl, gap: SPACING.md, borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceGlass, ...SHADOW.xs },
  field: { gap: SPACING.xs },
  label: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: C.text },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: RADIUS.md, borderWidth: 1.5 },
  textareaWrap: { alignItems: 'flex-start', paddingTop: SPACING.sm },
  icon: { marginLeft: 12 },
  input: { flex: 1, fontSize: FONTS.sizes.md, color: C.text, paddingVertical: 13, paddingHorizontal: SPACING.sm },
  textarea: { height: 120, paddingTop: 0 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: '#006c44', borderRadius: RADIUS.full, paddingVertical: 16, marginTop: SPACING.xs, shadowColor: '#006c44', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  submitText: { color: '#fff', fontSize: FONTS.sizes.md, fontWeight: '700' },

  successCard: { borderRadius: RADIUS.xl, overflow: 'hidden', padding: SPACING.xxl, alignItems: 'center', gap: SPACING.md, borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceGlass },
  successIcon: { width: 80, height: 80, borderRadius: RADIUS.full, backgroundColor: '#e1f9eb', alignItems: 'center', justifyContent: 'center' },
  successTitle: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: C.text },
  successText: { fontSize: FONTS.sizes.sm, color: C.textSecondary, textAlign: 'center', lineHeight: 20 },
  sendAgainBtn: { marginTop: SPACING.sm },
  sendAgainText: { fontSize: FONTS.sizes.sm, color: '#006c44', fontWeight: '700' },

  footerNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm },
  footerText: { fontSize: FONTS.sizes.xs, color: C.textMuted, flex: 1, lineHeight: 16 },
});
}
