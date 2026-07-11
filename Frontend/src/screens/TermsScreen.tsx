import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, LayoutAnimation,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../config/ThemeContext';
import { FONTS, RADIUS, SPACING, SHADOW } from '../config/theme';

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    icon: 'checkmark-circle-outline',
    body: `By downloading, installing, or using the Pathy application, you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you must not use the app.\n\nPathy is provided as a university project for educational and community use. These terms are subject to change; continued use after changes are posted constitutes acceptance.`,
  },
  {
    title: '2. User Accounts & Responsibilities',
    icon: 'person-circle-outline',
    body: `When you create an account you agree to:\n\n• Provide accurate and truthful information\n• Keep your password secure and not share it\n• Notify us immediately if you suspect unauthorised access\n• Be at least 13 years of age (or have parental consent)\n\nYou are responsible for all activity that occurs under your account.`,
  },
  {
    title: '3. Route & Content Posting Rules',
    icon: 'map-outline',
    body: `When sharing routes or posting content on Pathy:\n\n• Only post routes you personally recorded\n• Do not post routes through private property without permission\n• Route names and descriptions must not contain offensive or misleading content\n• Attaching music to a route must comply with applicable copyright law\n• We reserve the right to remove any content that violates these rules`,
  },
  {
    title: '4. Incident Reporting Guidelines',
    icon: 'warning-outline',
    body: `Incident reports directly affect the safety of other users. You agree to:\n\n• Only report incidents that are real and currently active\n• Provide accurate location, type, and severity information\n• Not submit false, misleading, or malicious reports\n• Remove reports when the incident has been resolved (if you created it)\n\nFalse incident reporting may result in immediate account suspension.`,
  },
  {
    title: '5. Prohibited Conduct',
    icon: 'ban-outline',
    body: `You must not use Pathy to:\n\n• Harass, threaten, or harm other users\n• Spread misinformation or deliberately false safety alerts\n• Attempt to access other users' accounts or private data\n• Reverse-engineer, decompile, or tamper with the application\n• Use automated bots or scrapers on the platform\n• Violate any applicable local, national, or international law`,
  },
  {
    title: '6. Intellectual Property',
    icon: 'ribbon-outline',
    body: `All original content in Pathy — including the logo, UI design, and codebase — is the intellectual property of the Pathy development team.\n\nContent you create (routes, incident reports, profile information) remains yours. By posting it, you grant Pathy a non-exclusive, royalty-free licence to display and distribute it within the app to other users.`,
  },
  {
    title: '7. Limitation of Liability',
    icon: 'shield-outline',
    body: `Pathy is provided "as is" without warranty of any kind.\n\nWe are not liable for:\n• Inaccurate incident reports submitted by other users\n• GPS inaccuracies or map data errors\n• Any accidents, injuries, or losses arising from reliance on the app\n• Service interruptions or data loss\n\nAlways use your own judgement when navigating. Do not use Pathy while driving.`,
  },
  {
    title: '8. Changes to Terms',
    icon: 'refresh-outline',
    body: `We may update these Terms at any time. We will notify you of significant changes via a push notification or an in-app banner.\n\nYour continued use of Pathy after changes are posted constitutes your acceptance of the updated terms. If you disagree with the changes, you may delete your account at any time from the Profile screen.`,
  },
  {
    title: '9. Governing Law',
    icon: 'globe-outline',
    body: `These Terms are governed by the laws of the Republic of Ghana. Any disputes arising from the use of Pathy shall be subject to the exclusive jurisdiction of the courts of Ghana.\n\nIf any provision of these Terms is found to be unenforceable, the remaining provisions continue in full force and effect.`,
  },
];

function AccordionItem({ section }: { section: typeof SECTIONS[0] }) {
  const C = useColors();
  const a = makeAccordionStyles(C);
  const [open, setOpen] = useState(false);
  const rotate = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(o => !o);
    Animated.timing(rotate, { toValue: open ? 0 : 1, duration: 220, useNativeDriver: true }).start();
  };

  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] });

  return (
    <View style={[a.item, open && a.itemOpen]}>
      <TouchableOpacity style={a.row} onPress={toggle} activeOpacity={0.8}>
        <View style={a.iconWrap}>
          <Ionicons name={section.icon as any} size={16} color="#006c44" />
        </View>
        <Text style={a.title}>{section.title}</Text>
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
        </Animated.View>
      </TouchableOpacity>
      {open && (
        <View style={a.body}>
          <Text style={a.bodyText}>{section.body}</Text>
        </View>
      )}
    </View>
  );
}

function makeAccordionStyles(C: any) {
  return StyleSheet.create({
  item: { backgroundColor: C.surface, borderRadius: RADIUS.xl, overflow: 'hidden', borderWidth: 1, borderColor: C.border, ...SHADOW.xs },
  itemOpen: { borderColor: 'rgba(0,108,68,0.25)', borderLeftWidth: 4, borderLeftColor: '#006c44' },
  row: { flexDirection: 'row', alignItems: 'center', padding: SPACING.lg, gap: SPACING.md },
  iconWrap: { width: 32, height: 32, borderRadius: RADIUS.md, backgroundColor: '#e1f9eb', alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: FONTS.sizes.md, fontWeight: '600', color: C.text },
  body: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.lg },
  bodyText: { fontSize: FONTS.sizes.sm, color: C.textSecondary, lineHeight: 22 },
});
}

export default function TermsScreen({ navigation, route }: any) {
  const C = useColors();
  const s = makeStyles(C);
  // showActions = true when navigated from Sign Up flow so user can accept/decline
  const showActions = route?.params?.showActions === true;

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Terms & Conditions</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <BlurView intensity={50} tint="light" style={s.hero}>
          <View style={s.heroIcon}>
            <Ionicons name="document-text" size={28} color="#006c44" />
          </View>
          <Text style={s.heroTitle}>Terms of Use</Text>
          <Text style={s.heroSub}>By using Pathy, you agree to these terms. They're written to be fair and clear.</Text>
          <Text style={s.updated}>Last updated: June 2025</Text>
        </BlurView>

        <Text style={s.sectionLabel}>TAP A SECTION TO EXPAND</Text>
        {SECTIONS.map(sec => <AccordionItem key={sec.title} section={sec} />)}

        {/* Accept / Decline — only shown from Sign Up flow */}
        {showActions && (
          <View style={s.actionsWrap}>
            <TouchableOpacity
              style={s.acceptBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.88}
            >
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={s.acceptText}>I Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.declineBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.85}
            >
              <Text style={s.declineText}>Decline</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={s.footer}>
          <Ionicons name="document-outline" size={14} color={C.textMuted} />
          <Text style={s.footerText}>These terms apply to all users of the Pathy application. Last reviewed June 2025.</Text>
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

  scroll: { padding: SPACING.xl, paddingBottom: 60, gap: SPACING.md },

  hero: { borderRadius: RADIUS.xl, overflow: 'hidden', padding: SPACING.xl, alignItems: 'center', gap: SPACING.sm, borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceGlass, marginBottom: SPACING.sm },
  heroIcon: { width: 64, height: 64, borderRadius: RADIUS.full, backgroundColor: '#e1f9eb', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: FONTS.sizes.xl, fontWeight: '800', color: C.text },
  heroSub: { fontSize: FONTS.sizes.sm, color: C.textSecondary, textAlign: 'center', lineHeight: 20 },
  updated: { fontSize: FONTS.sizes.xs, color: C.textMuted, fontWeight: '500' },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: C.textMuted, letterSpacing: 0.8 },

  actionsWrap: { gap: SPACING.md, marginTop: SPACING.md },
  acceptBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: '#006c44', borderRadius: RADIUS.full, paddingVertical: 18, shadowColor: '#006c44', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  acceptText: { color: '#fff', fontSize: FONTS.sizes.md, fontWeight: '700' },
  declineBtn: { alignItems: 'center', paddingVertical: 14, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: C.border },
  declineText: { color: C.textSecondary, fontSize: FONTS.sizes.md, fontWeight: '600' },

  footer: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, marginTop: SPACING.md },
  footerText: { fontSize: FONTS.sizes.xs, color: C.textMuted, flex: 1, lineHeight: 16 },
});
}
