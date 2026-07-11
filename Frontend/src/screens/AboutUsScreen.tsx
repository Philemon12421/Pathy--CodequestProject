import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { FONTS, RADIUS, SPACING, SHADOW, getColors } from '../config/theme';

const C = getColors('light');

const TEAM = [
  { name: 'Micheal & Robert', role: 'Frontend Developer', initials: 'MR', color: '#006c44' },
  { name: 'Philemon', role: 'UI / UX & Lead Developer',         initials: 'PK', color: '#4caf7d' },
  { name: 'Jones & Kelvin ', role: 'Spring Boot API', initials: 'JK', color: '#378ADD' },
];

const VALUES = [
  { icon: 'map-outline',        title: 'Explore',    desc: 'Record every route, big or small',          color: '#006c44', bg: '#e1f9eb' },
  { icon: 'people-outline',     title: 'Community',  desc: 'Share incidents, help each other stay safe', color: '#378ADD', bg: '#e8f2fd' },
  { icon: 'trophy-outline',     title: 'Compete',    desc: 'Climb the leaderboard together',             color: '#FFD700', bg: '#fffbeb' },
  { icon: 'shield-outline',     title: 'Safety',     desc: 'Real-time alerts to keep you protected',     color: '#E24B4A', bg: '#fdecea' },
];

const TECH = [
  { label: 'React Native',  icon: 'phone-portrait-outline' },
  { label: 'Spring Boot',   icon: 'server-outline' },
  { label: 'PostgreSQL',    icon: 'grid-outline' },
  { label: 'Expo SDK 51',   icon: 'rocket-outline' },
  { label: 'JWT Auth',      icon: 'lock-closed-outline' },
  { label: 'WebSockets',    icon: 'wifi-outline' },
];

export default function AboutUsScreen({ navigation }: any) {
  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>About Pathy</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero brand */}
        <BlurView intensity={50} tint="light" style={s.hero}>
          <View style={s.logoWrap}>
            <View style={s.logoOuter}>
              <View style={s.logoInner}>
                <Ionicons name="navigate" size={32} color="#fff" />
              </View>
            </View>
          </View>
          <Text style={s.appName}>Pathy</Text>
          <Text style={s.tagline}>Your journey, shared.</Text>
          <Text style={s.desc}>
            Pathy is a university project that combines GPS route recording, real-time incident reporting,
            AI assistance, and social leaderboards into one clean, modern commuter app.
          </Text>
          <View style={s.badgeRow}>
            <View style={s.badge}><Ionicons name="school-outline" size={13} color="#006c44" /><Text style={s.badgeText}>University Project</Text></View>
            <View style={s.badge}><Ionicons name="heart-outline" size={13} color="#E24B4A" /><Text style={s.badgeText}>Made in Ghana</Text></View>
          </View>
        </BlurView>

        {/* Mission */}
        <View style={s.missionCard}>
          <View style={s.missionLeft} />
          <View style={s.missionContent}>
            <View style={s.missionIconRow}>
              <Ionicons name="flag-outline" size={18} color="#006c44" />
              <Text style={s.missionTitle}>Our Mission</Text>
            </View>
            <Text style={s.missionText}>
              To empower everyday commuters with the tools they need to navigate smarter, stay safer,
              and connect with their community — all in one beautifully simple app.
            </Text>
          </View>
        </View>

        {/* Values grid */}
        <Text style={s.sectionLabel}>OUR VALUES</Text>
        <View style={s.grid}>
          {VALUES.map(v => (
            <View key={v.title} style={[s.valueCard, { borderTopColor: v.color }]}>
              <View style={[s.valueIcon, { backgroundColor: v.bg }]}>
                <Ionicons name={v.icon as any} size={22} color={v.color} />
              </View>
              <Text style={s.valueTitle}>{v.title}</Text>
              <Text style={s.valueDesc}>{v.desc}</Text>
            </View>
          ))}
        </View>

        {/* Tech stack */}
        <Text style={s.sectionLabel}>BUILT WITH</Text>
        <View style={s.techGrid}>
          {TECH.map(t => (
            <View key={t.label} style={s.techChip}>
              <Ionicons name={t.icon as any} size={14} color="#006c44" />
              <Text style={s.techText}>{t.label}</Text>
            </View>
          ))}
        </View>

        {/* Team */}
        <Text style={s.sectionLabel}>THE TEAM</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.teamRow}>
          {TEAM.map(m => (
            <BlurView key={m.name} intensity={40} tint="light" style={s.teamCard}>
              <View style={[s.teamAvatar, { backgroundColor: m.color }]}>
                <Text style={s.teamInitials}>{m.initials}</Text>
              </View>
              <Text style={s.teamName}>{m.name}</Text>
              <View style={s.teamRolePill}>
                <Text style={s.teamRole}>{m.role}</Text>
              </View>
            </BlurView>
          ))}
        </ScrollView>

        {/* Version footer */}
        <View style={s.footer}>
          <View style={s.footerDivider} />
          <Text style={s.footerVersion}>Pathy v1.0.0</Text>
          <Text style={s.footerSub}>Built with ❤️ for university · CodeQuest Project</Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://github.com/Philemon12421/Pathy--CodequestProject/')}>
            <View style={s.githubRow}>
              <Ionicons name="logo-github" size={16} color={C.textMuted} />
              <Text style={s.githubText}>View on GitHub</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: 'rgba(0,108,68,0.08)' },
  backBtn: { width: 36, height: 36, borderRadius: RADIUS.full, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: C.text },

  scroll: { padding: SPACING.xl, paddingBottom: 60, gap: SPACING.xl },

  hero: { borderRadius: RADIUS.xl, overflow: 'hidden', padding: SPACING.xl, alignItems: 'center', gap: SPACING.sm, borderWidth: 1, borderColor: 'rgba(0,108,68,0.1)', backgroundColor: 'rgba(231,255,241,0.6)' },
  logoWrap: { marginBottom: SPACING.xs },
  logoOuter: { width: 80, height: 80, borderRadius: 24, backgroundColor: '#e1f9eb', alignItems: 'center', justifyContent: 'center', ...SHADOW.sm },
  logoInner: { width: 58, height: 58, borderRadius: 16, backgroundColor: '#006c44', alignItems: 'center', justifyContent: 'center' },
  appName: { fontSize: 32, fontWeight: '800', color: '#006c44', letterSpacing: -0.5 },
  tagline: { fontSize: FONTS.sizes.md, fontStyle: 'italic', color: '#4caf7d', fontWeight: '600' },
  desc: { fontSize: FONTS.sizes.sm, color: C.textSecondary, textAlign: 'center', lineHeight: 22 },
  badgeRow: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.xs },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fff', borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: 6, ...SHADOW.xs },
  badgeText: { fontSize: FONTS.sizes.xs, fontWeight: '600', color: C.text },

  missionCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: RADIUS.xl, overflow: 'hidden', ...SHADOW.xs, borderWidth: 1, borderColor: 'rgba(0,108,68,0.1)' },
  missionLeft: { width: 5, backgroundColor: '#006c44' },
  missionContent: { flex: 1, padding: SPACING.lg, gap: SPACING.sm },
  missionIconRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  missionTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: C.text },
  missionText: { fontSize: FONTS.sizes.sm, color: C.textSecondary, lineHeight: 20 },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: C.textMuted, letterSpacing: 0.8 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
  valueCard: { width: '47%', backgroundColor: '#fff', borderRadius: RADIUS.xl, padding: SPACING.lg, gap: SPACING.sm, borderTopWidth: 3, borderWidth: 1, borderColor: 'rgba(0,108,68,0.08)', ...SHADOW.xs },
  valueIcon: { width: 44, height: 44, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center' },
  valueTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: C.text },
  valueDesc: { fontSize: FONTS.sizes.xs, color: C.textSecondary, lineHeight: 16 },

  techGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  techChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#e1f9eb', borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: 8 },
  techText: { fontSize: FONTS.sizes.xs, color: '#006c44', fontWeight: '600' },

  teamRow: { gap: SPACING.md, paddingRight: SPACING.md },
  teamCard: { width: 130, borderRadius: RADIUS.xl, overflow: 'hidden', padding: SPACING.lg, alignItems: 'center', gap: SPACING.sm, borderWidth: 1, borderColor: 'rgba(0,108,68,0.1)', backgroundColor: 'rgba(255,255,255,0.8)' },
  teamAvatar: { width: 56, height: 56, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center' },
  teamInitials: { fontSize: FONTS.sizes.lg, fontWeight: '800', color: '#fff' },
  teamName: { fontSize: FONTS.sizes.xs, fontWeight: '700', color: C.text, textAlign: 'center' },
  teamRolePill: { backgroundColor: '#e1f9eb', borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 3 },
  teamRole: { fontSize: 10, color: '#006c44', fontWeight: '600' },

  footer: { alignItems: 'center', gap: SPACING.sm },
  footerDivider: { width: '40%', height: 1, backgroundColor: 'rgba(0,108,68,0.1)' },
  footerVersion: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: C.text },
  footerSub: { fontSize: FONTS.sizes.xs, color: C.textMuted },
  githubRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.xs },
  githubText: { fontSize: FONTS.sizes.xs, color: C.textMuted, textDecorationLine: 'underline' },
});
