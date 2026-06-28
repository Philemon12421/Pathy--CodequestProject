import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, LayoutAnimation,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { FONTS, RADIUS, SPACING, SHADOW, getColors } from '../config/theme';

const C = getColors('light');

const SECTIONS = [
  {
    title: '1. Information We Collect',
    icon: 'folder-outline',
    body: `We collect information you provide when creating an account (name, email) and information generated when you use Pathy:

• Location data: GPS coordinates while recording routes or when incident detection is active
• Route data: the paths you record, distances, and timestamps  
• Incident reports: descriptions, photos, and GPS coordinates you submit
• Device information: device type and operating system for compatibility purposes`,
  },
  {
    title: '2. How We Use Your Data',
    icon: 'analytics-outline',
    body: `Your data is used solely to provide and improve the Pathy experience:

• Displaying your routes and incidents on the map
• Calculating leaderboard rankings based on km recorded
• Showing relevant nearby incidents to other users
• Sending push notifications about incidents on your saved routes
• Improving app performance and fixing bugs`,
  },
  {
    title: '3. Location Data',
    icon: 'location-outline',
    body: `Location is the core of Pathy. Here's exactly how we handle it:

• Foreground location: used while you record a route or view the map — only when the app is open
• Background location (optional): used only if you enable background route recording
• We never track your location when the app is closed without your explicit permission
• Raw GPS coordinates are stored only for your own routes and incident reports`,
  },
  {
    title: '4. Sharing With Third Parties',
    icon: 'share-social-outline',
    body: `We do not sell, rent, or trade your personal data to third parties.

We may share aggregated, anonymised data (e.g. "high incident area on Ring Road") with city authorities for public safety purposes. This data cannot be used to identify individual users.

Third-party services we use:
• Firebase Cloud Messaging: push notifications only
• Map tile providers: display maps (no personal data sent)`,
  },
  {
    title: '5. Data Retention',
    icon: 'time-outline',
    body: `• Account data: retained while your account is active. Deleted within 30 days of account deletion request.
• Routes: stored until you delete them from the Routes screen
• Incidents: automatically removed after 7 days (low), 14 days (medium), or 30 days (high/critical)
• Chat history: stored for 90 days then automatically deleted`,
  },
  {
    title: '6. Your Rights',
    icon: 'shield-checkmark-outline',
    body: `You have the right to:

• Access: request a copy of all data we hold about you
• Correction: update or correct your personal information at any time from the Profile screen
• Deletion: delete your account and all associated data via the Profile screen or by contacting us
• Portability: export your route history as a JSON or GPX file
• Opt-out: disable incident sharing or location tracking at any time in Settings`,
  },
  {
    title: '7. Security',
    icon: 'lock-closed-outline',
    body: `We take security seriously:

• All data is encrypted in transit using HTTPS / TLS 1.3
• Passwords are hashed using bcrypt — we never store them in plain text
• JWT tokens expire after 24 hours and require re-authentication
• Our servers are hosted on secure, regularly-audited infrastructure`,
  },
  {
    title: '8. Contact About Privacy',
    icon: 'mail-outline',
    body: `For any privacy-related questions or requests, contact us at:

Email: privacy@pathy.app
Response time: within 5 business days

For account deletion requests, you can also go directly to Profile → Log Out → Delete Account (coming in a future update).`,
  },
];

function AccordionItem({ section }: { section: typeof SECTIONS[0] }) {
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

const a = StyleSheet.create({
  item: { backgroundColor: '#fff', borderRadius: RADIUS.xl, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,108,68,0.08)', ...SHADOW.xs },
  itemOpen: { borderColor: 'rgba(0,108,68,0.25)', borderLeftWidth: 4, borderLeftColor: '#006c44' },
  row: { flexDirection: 'row', alignItems: 'center', padding: SPACING.lg, gap: SPACING.md },
  iconWrap: { width: 32, height: 32, borderRadius: RADIUS.md, backgroundColor: '#e1f9eb', alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: FONTS.sizes.md, fontWeight: '600', color: C.text },
  body: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.lg, paddingTop: 0 },
  bodyText: { fontSize: FONTS.sizes.sm, color: C.textSecondary, lineHeight: 22 },
});

export default function PrivacyPolicyScreen({ navigation }: any) {
  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <BlurView intensity={50} tint="light" style={s.hero}>
          <View style={s.heroIcon}>
            <Ionicons name="shield-checkmark" size={28} color="#006c44" />
          </View>
          <Text style={s.heroTitle}>Your privacy matters.</Text>
          <Text style={s.heroSub}>We collect only what we need to make Pathy work. We never sell your data.</Text>
          <Text style={s.updated}>Last updated: June 2025</Text>
        </BlurView>

        <Text style={s.sectionLabel}>TAP A SECTION TO EXPAND</Text>
        {SECTIONS.map(sec => <AccordionItem key={sec.title} section={sec} />)}

        <View style={s.footer}>
          <Ionicons name="shield-outline" size={14} color={C.textMuted} />
          <Text style={s.footerText}>This policy was last reviewed June 2025 and applies to all Pathy users.</Text>
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

  scroll: { padding: SPACING.xl, paddingBottom: 60, gap: SPACING.md },

  hero: { borderRadius: RADIUS.xl, overflow: 'hidden', padding: SPACING.xl, alignItems: 'center', gap: SPACING.sm, borderWidth: 1, borderColor: 'rgba(0,108,68,0.1)', backgroundColor: 'rgba(231,255,241,0.6)', marginBottom: SPACING.sm },
  heroIcon: { width: 64, height: 64, borderRadius: RADIUS.full, backgroundColor: '#e1f9eb', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: FONTS.sizes.xl, fontWeight: '800', color: C.text },
  heroSub: { fontSize: FONTS.sizes.sm, color: C.textSecondary, textAlign: 'center', lineHeight: 20 },
  updated: { fontSize: FONTS.sizes.xs, color: C.textMuted, fontWeight: '500' },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: C.textMuted, letterSpacing: 0.8 },

  footer: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, marginTop: SPACING.md },
  footerText: { fontSize: FONTS.sizes.xs, color: C.textMuted, flex: 1, lineHeight: 16 },
});
