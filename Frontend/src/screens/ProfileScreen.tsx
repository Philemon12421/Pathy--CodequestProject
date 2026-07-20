import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, Switch, TextInput,
  Image, Animated, Modal, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { FONTS, RADIUS, SPACING, SHADOW } from '../config/theme';
import { useColors } from '../config/ThemeContext';
import { routesAPI, walletAPI } from '../services/api';
import useStore from '../store/useStore';

const MEDAL: Record<number, string> = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' };

// ─── Setting row ─────────────────────────────────────────────────────────────
function SettingRow({ icon, label, sub, onPress, color, trailing, last }: any) {
  const C = useColors();
  return (
    <TouchableOpacity
      style={[{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,108,68,0.06)' }, last && { borderBottomWidth: 0 }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[{ width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, { backgroundColor: (color || '#006c44') + '18' }]}>
        <Ionicons name={icon} size={18} color={color || '#006c44'} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: C.text }}>{label}</Text>
        {sub && <Text style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>{sub}</Text>}
      </View>
      {trailing || (
        onPress && <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
      )}
    </TouchableOpacity>
  );
}

// ─── Stat tile ────────────────────────────────────────────────────────────────
function StatTile({ icon, label, value, color }: any) {
  const C = useColors();
  return (
    <View style={[{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.6)', borderTopWidth: 3 }, { borderTopColor: color }]}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={{ fontSize: 20, fontWeight: '800', color, marginTop: 4 }}>{value}</Text>
      <Text style={{ fontSize: 11, color: C.textMuted, fontWeight: '500', marginTop: 2 }}>{label}</Text>
    </View>
  );
}

export default function ProfileScreen({ navigation }: any) {
  const C = useColors();
  const { user, logout, savedRoutes, setSavedRoutes, theme, toggleTheme, myAds, setAuth, token, avatarUri, setAvatarUri } = useStore();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(user?.name || '');
  const avatarAnim = useRef(new Animated.Value(1)).current;

  // Deposit states
  const [isDepositModalVisible, setIsDepositModalVisible] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositLoading, setDepositLoading] = useState(false);
  const [paystackRef, setPaystackRef] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const loadRoutes = useCallback(async () => {
    try { const d = await routesAPI.getAll(); setSavedRoutes(d as any); } catch {}
  }, [setSavedRoutes]);

  const fetchLatestProfile = useCallback(async () => {
    try {
      const latestUser = await walletAPI.getMe();
      setAuth(token, latestUser);
    } catch (e) {
      console.log('Error fetching latest user details', e);
    }
  }, [token, setAuth]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      loadRoutes(),
      fetchLatestProfile(),
    ]).finally(() => setLoading(false));
  }, [loadRoutes, fetchLatestProfile]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadRoutes(),
      fetchLatestProfile(),
    ]);
    setRefreshing(false);
  };

  const handleInitiateDeposit = async () => {
    const amt = parseFloat(depositAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid deposit amount.');
      return;
    }
    setDepositLoading(true);
    try {
      const res = await walletAPI.deposit(amt);
      setPaystackRef(res.reference);
      if (res.authorization_url) {
        await Linking.openURL(res.authorization_url);
      } else {
        throw new Error('No authorization URL returned');
      }
    } catch (e: any) {
      Alert.alert('Deposit Error', e.error || 'Failed to initialize deposit.');
    } finally {
      setDepositLoading(false);
    }
  };

  const handleVerifyDeposit = async () => {
    if (!paystackRef) return;
    setIsVerifying(true);
    try {
      const updatedUser = await walletAPI.verify(paystackRef);
      setAuth(token, updatedUser);
      Alert.alert('Success 🎉', `Your deposit was successful! New balance: GH₵ ${updatedUser.balance.toFixed(2)}`);
      setIsDepositModalVisible(false);
      setDepositAmount('');
      setPaystackRef(null);
    } catch (e: any) {
      Alert.alert('Verification Failed', e.error || 'Could not verify payment yet. Please ensure you have completed the authorization.');
    } finally {
      setIsVerifying(false);
    }
  };

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access to change your profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.85,
    });
    if (!result.canceled) {
      Animated.sequence([
        Animated.timing(avatarAnim, { toValue: 0.85, duration: 120, useNativeDriver: true }),
        Animated.spring(avatarAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
      ]).start();
      setAvatarUri(result.assets[0].uri); // updates global store
      Alert.alert('📸 Photo updated!', 'Your profile picture has been set.');
    }
  };

  const saveName = () => {
    if (!nameValue.trim()) { Alert.alert('Invalid', 'Name cannot be empty.'); return; }
    setAuth(useStore.getState().token, { ...user, name: nameValue.trim() });
    setEditingName(false);
  };

  const confirmLogout = () => Alert.alert('Log Out', 'Are you sure?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Log Out', style: 'destructive', onPress: logout },
  ]);

  const ranked = [...savedRoutes].sort((a: any, b: any) => {
    const aS = (a.is_favorite ? 1000 : 0) + (a.use_count ?? 0);
    const bS = (b.is_favorite ? 1000 : 0) + (b.use_count ?? 0);
    return bS !== aS ? bS - aS : (a.name || '').localeCompare(b.name || '');
  });

  const initials = user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  const s = makeStyles(C);

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerBtn}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={confirmLogout} style={[s.headerBtn, s.logoutBtn]}>
          <Ionicons name="log-out-outline" size={20} color="#E24B4A" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#006c44" />}
      >
        {/* Avatar + name card */}
        <BlurView intensity={60} tint="light" style={s.profileCard}>
          {/* Avatar with edit overlay */}
          <TouchableOpacity onPress={pickAvatar} activeOpacity={0.85}>
            <Animated.View style={[s.avatarWrap, { transform: [{ scale: avatarAnim }] }]}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={s.avatarImg} />
              ) : (
                <View style={s.avatarPlaceholder}>
                  <Text style={s.avatarInitials}>{initials}</Text>
                </View>
              )}
              <View style={s.avatarEditBadge}>
                <Ionicons name="camera" size={12} color="#fff" />
              </View>
            </Animated.View>
          </TouchableOpacity>

          {/* Name */}
          {editingName ? (
            <View style={s.nameEditRow}>
              <TextInput
                style={s.nameInput}
                value={nameValue}
                onChangeText={setNameValue}
                autoFocus
                selectTextOnFocus
                returnKeyType="done"
                onSubmitEditing={saveName}
              />
              <TouchableOpacity onPress={saveName} style={s.nameSaveBtn}>
                <Ionicons name="checkmark" size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditingName(false)} style={s.nameCancelBtn}>
                <Ionicons name="close" size={18} color={C.textMuted} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={s.nameRow} onPress={() => setEditingName(true)} activeOpacity={0.8}>
              <Text style={s.profileName}>{user?.name || 'Your Name'}</Text>
              <Ionicons name="pencil" size={14} color="#4caf7d" />
            </TouchableOpacity>
          )}
          <Text style={s.profileEmail}>{user?.email || ''}</Text>
          <View style={s.rolePill}>
            <Ionicons name="shield-checkmark" size={11} color="#006c44" />
            <Text style={s.roleText}>{user?.role || 'User'}</Text>
          </View>
        </BlurView>

        {/* ── Wallet Balance Card ────────────────────────────────────────── */}
        <View style={s.walletCard}>
          <View style={s.walletLeft}>
            <View style={s.walletIconWrap}>
              <Ionicons name="wallet" size={22} color="#fff" />
            </View>
            <View>
              <Text style={s.walletLabel}>Wallet Balance</Text>
              <Text style={s.walletBalance}>
                GH₵ {typeof user?.balance === 'number' ? user.balance.toFixed(2) : '0.00'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={s.depositBtn}
            onPress={() => { setDepositAmount(''); setPaystackRef(null); setIsDepositModalVisible(true); }}
          >
            <Ionicons name="add-circle-outline" size={16} color="#fff" />
            <Text style={s.depositBtnText}>Deposit</Text>
          </TouchableOpacity>
        </View>

        {/* ── Deposit Modal ──────────────────────────────────────────────── */}
        <Modal
          visible={isDepositModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setIsDepositModalVisible(false)}
        >
          <View style={s.modalOverlay}>
            <View style={s.modalSheet}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>💳 Deposit Funds</Text>
                <TouchableOpacity onPress={() => setIsDepositModalVisible(false)} style={s.modalCloseBtn}>
                  <Ionicons name="close" size={20} color={C.textMuted} />
                </TouchableOpacity>
              </View>
              <Text style={s.modalSub}>Add money to your Pathy wallet to pay for ads</Text>

              {/* Quick amount chips */}
              <View style={s.amountChips}>
                {['50', '100', '200', '500'].map((amt) => (
                  <TouchableOpacity
                    key={amt}
                    style={[s.amountChip, depositAmount === amt && s.amountChipActive]}
                    onPress={() => setDepositAmount(amt)}
                  >
                    <Text style={[s.amountChipText, depositAmount === amt && { color: '#006c44', fontWeight: '700' }]}>
                      GH₵ {amt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Custom amount input */}
              <Text style={s.inputLabel}>Or enter a custom amount (GHS)</Text>
              <TextInput
                style={s.amountInput}
                value={depositAmount}
                onChangeText={setDepositAmount}
                placeholder="e.g. 150"
                placeholderTextColor={C.textMuted}
                keyboardType="numeric"
              />

              {/* Current balance display */}
              <View style={s.currentBalanceRow}>
                <Ionicons name="information-circle-outline" size={14} color={C.textMuted} />
                <Text style={s.currentBalanceText}>
                  Current balance: GH₵ {typeof user?.balance === 'number' ? user.balance.toFixed(2) : '0.00'}
                </Text>
              </View>

              {/* Step 1: initiate deposit → open Paystack */}
              {!paystackRef ? (
                <TouchableOpacity
                  style={[s.payNowBtn, depositLoading && { opacity: 0.7 }]}
                  onPress={handleInitiateDeposit}
                  disabled={depositLoading}
                >
                  {depositLoading
                    ? <ActivityIndicator color="#fff" />
                    : <>
                        <Ionicons name="card" size={18} color="#fff" />
                        <Text style={s.payNowBtnText}>Pay via Paystack</Text>
                      </>
                  }
                </TouchableOpacity>
              ) : (
                /* Step 2: verify after completing payment in browser */
                <View style={s.verifySection}>
                  <View style={s.verifyHintRow}>
                    <Ionicons name="checkmark-circle-outline" size={16} color="#006c44" />
                    <Text style={s.verifyHintText}>
                      Paystack page opened. Complete payment, then tap below.
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[s.verifyBtn, isVerifying && { opacity: 0.7 }]}
                    onPress={handleVerifyDeposit}
                    disabled={isVerifying}
                  >
                    {isVerifying
                      ? <ActivityIndicator color="#fff" />
                      : <>
                          <Ionicons name="shield-checkmark" size={18} color="#fff" />
                          <Text style={s.payNowBtnText}>Verify Payment</Text>
                        </>
                    }
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.reopenLinkBtn}
                    onPress={handleInitiateDeposit}
                  >
                    <Text style={s.reopenLinkText}>Reopen Paystack page</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>

        {/* Stats */}
        <View style={s.statsRow}>
          <StatTile icon="navigate"        label="Routes"     value={savedRoutes.length} color="#006c44" />
          <StatTile icon="star"            label="Favourites" value={savedRoutes.filter((r: any) => r.is_favorite).length} color="#FFD700" />
          <StatTile icon="megaphone-outline" label="Ads"      value={myAds.length}        color="#EF9F27" />
        </View>

        {/* Preferences */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>PREFERENCES</Text>
          <View style={s.card}>
            <SettingRow
              icon={theme === 'dark' ? 'moon' : 'sunny-outline'}
              label="App Theme"
              sub={theme === 'dark' ? 'Dark mode' : 'Light mode'}
              trailing={
                <Switch
                  value={theme === 'dark'}
                  onValueChange={toggleTheme}
                  trackColor={{ false: 'rgba(0,108,68,0.15)', true: '#006c44' }}
                  thumbColor="#fff"
                />
              }
            />
            <SettingRow icon="notifications-outline" label="Notifications" sub="Incidents & leaderboard alerts" onPress={() => navigation.navigate('Notifications')} last />
          </View>
        </View>

        {/* Account */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>ACCOUNT</Text>
          <View style={s.card}>
            <SettingRow icon="person-outline"   label="Edit Profile"     sub="Change name and photo"    onPress={() => setEditingName(true)} />
            <SettingRow icon="lock-closed-outline" label="Change Password" sub="Update your password"  onPress={() => navigation.navigate('ForgotPassword')} />
            <SettingRow icon="mail-outline"     label="Verify Email"     sub="Verify your email address" onPress={() => navigation.navigate('EmailVerification', { email: user?.email })} last />
          </View>
        </View>

        {/* Support */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>SUPPORT & LEGAL</Text>
          <View style={s.card}>
            <SettingRow icon="chatbubble-outline"       label="Contact Us"        onPress={() => navigation.navigate('ContactUs')} />
            <SettingRow icon="information-circle-outline"  label="About Pathy"       sub="Version 1.0.0 · University Project" onPress={() => navigation.navigate('AboutUs')} />
            <SettingRow icon="document-text-outline"       label="Terms & Conditions" onPress={() => navigation.navigate('Terms')} />
            <SettingRow icon="shield-outline"              label="Privacy Policy"    onPress={() => navigation.navigate('Privacy')} />
            <SettingRow icon="star-outline"                label="Rate the App"      onPress={() => Alert.alert('Rate Pathy', 'Thank you for using Pathy! App Store rating coming soon.')} color="#FFD700" last />
          </View>
        </View>

        {/* Danger zone */}
        <View style={s.section}>
          <View style={s.card}>
            <SettingRow icon="log-out-outline" label="Log Out" color="#E24B4A" onPress={confirmLogout} last />
          </View>
        </View>

        {/* Leaderboard */}
        <View style={s.sectionHeader}>
          <Ionicons name="trophy" size={18} color="#FFD700" />
          <Text style={s.sectionTitle}>Route Leaderboard</Text>
        </View>

        {loading ? (
          <ActivityIndicator color="#006c44" style={{ marginTop: 24 }} />
        ) : ranked.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="navigate-circle-outline" size={48} color="rgba(0,108,68,0.2)" />
            <Text style={s.emptyTitle}>No routes yet</Text>
            <Text style={s.emptyText}>Save routes from the Map tab.</Text>
            <TouchableOpacity style={s.mapBtn} onPress={() => navigation.goBack()}>
              <Text style={s.mapBtnText}>Open Map</Text>
            </TouchableOpacity>
          </View>
        ) : (
          ranked.map((route: any, idx: number) => {
            const medal = MEDAL[idx + 1];
            return (
              <View key={route.id} style={[s.leaderRow, medal && { borderColor: medal + '44', borderWidth: 1.5 }]}>
                <View style={[s.leaderBadge, { backgroundColor: (medal || 'rgba(0,108,68,0.1)') + (medal ? '22' : '') }]}>
                  <Ionicons name={idx === 0 ? 'trophy' : idx === 1 ? 'medal' : idx === 2 ? 'ribbon' : 'navigate-circle-outline'} size={18} color={medal || C.textMuted} />
                  <Text style={[s.leaderRank, { color: medal || C.textMuted }]}>#{idx + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.leaderName} numberOfLines={1}>{route.name}</Text>
                  <Text style={s.leaderMeta} numberOfLines={1}>{route.destination_name || 'Destination'}</Text>
                </View>
                <View style={s.leaderPill}>
                  <Ionicons name="star" size={11} color="#FFD700" />
                  <Text style={s.leaderPillText}>{route.is_favorite ? '★' : '—'}</Text>
                </View>
              </View>
            );
          })
        )}

        <Text style={s.versionText}>Pathy v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(C: ReturnType<typeof useColors>) { return StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md },
  headerBtn: { width: 40, height: 40, borderRadius: RADIUS.full, backgroundColor: C.surfaceGlass, alignItems: 'center', justifyContent: 'center' },
  logoutBtn: { backgroundColor: C.dangerSoft },
  headerTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: C.text },

  scroll: { paddingHorizontal: SPACING.xl, paddingBottom: 120, gap: SPACING.lg },

  // Profile card
  profileCard: {
    borderRadius: RADIUS.xl, overflow: 'hidden',
    padding: SPACING.xl, alignItems: 'center', gap: SPACING.sm,
    borderWidth: 1, borderColor: C.border,
    backgroundColor: C.surfaceGlass,
    ...SHADOW.sm,
  },
  avatarWrap: { position: 'relative', marginBottom: SPACING.sm },
  avatarImg: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: C.primary },
  avatarPlaceholder: { width: 90, height: 90, borderRadius: 45, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: C.primaryContainer },
  avatarInitials: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: '#fff' },
  avatarEditBadge: { position: 'absolute', bottom: 2, right: 2, width: 26, height: 26, borderRadius: 13, backgroundColor: C.primaryContainer, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.surface },

  nameRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  profileName: { fontSize: FONTS.sizes.xl, fontWeight: '800', color: C.text },
  nameEditRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  nameInput: { flex: 1, backgroundColor: C.surface, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: C.primary, paddingHorizontal: SPACING.md, paddingVertical: 10, fontSize: FONTS.sizes.md, color: C.text, minWidth: 140 },
  nameSaveBtn: { width: 36, height: 36, borderRadius: RADIUS.full, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  nameCancelBtn: { width: 36, height: 36, borderRadius: RADIUS.full, backgroundColor: C.surfaceGlass, alignItems: 'center', justifyContent: 'center' },
  profileEmail: { fontSize: FONTS.sizes.sm, color: C.textSecondary },
  rolePill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.accentSoft, borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: 4, marginTop: 2 },
  roleText: { fontSize: FONTS.sizes.xs, color: C.primary, fontWeight: '700', textTransform: 'capitalize' },

  // Stats
  statsRow: { flexDirection: 'row', gap: SPACING.md },
  tile: { flex: 1, backgroundColor: C.surface, borderRadius: RADIUS.xl, padding: SPACING.md, alignItems: 'center', borderTopWidth: 3, borderWidth: 1, borderColor: C.border, ...SHADOW.xs },
  tileVal: { fontSize: FONTS.sizes.xxl, fontWeight: '800', marginTop: 4 },
  tileLbl: { fontSize: FONTS.sizes.xs, color: C.textMuted, textAlign: 'center', marginTop: 2 },

  // Settings sections
  section: { gap: SPACING.sm },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: C.textMuted, letterSpacing: 0.8, paddingLeft: 4 },
  card: { backgroundColor: C.surface, borderRadius: RADIUS.xl, overflow: 'hidden', ...SHADOW.xs, borderWidth: 1, borderColor: C.border },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, gap: SPACING.md, borderBottomWidth: 1, borderBottomColor: C.border },
  settingIcon: { width: 36, height: 36, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  settingInfo: { flex: 1 },
  settingLabel: { fontSize: FONTS.sizes.md, fontWeight: '600', color: C.text },
  settingSub: { fontSize: FONTS.sizes.xs, color: C.textMuted, marginTop: 1 },

  // Leaderboard
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  sectionTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: C.text },
  leaderRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: RADIUS.xl, padding: SPACING.md, marginBottom: SPACING.sm, gap: SPACING.md, ...SHADOW.xs, borderWidth: 1, borderColor: C.border },
  leaderBadge: { alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: RADIUS.lg, gap: 2 },
  leaderRank: { fontSize: FONTS.sizes.xs, fontWeight: '700' },
  leaderName: { fontSize: FONTS.sizes.md, fontWeight: '700', color: C.text },
  leaderMeta: { fontSize: FONTS.sizes.xs, color: C.textSecondary, marginTop: 2 },
  leaderPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: C.surface, borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3 },
  leaderPillText: { fontSize: FONTS.sizes.xs, color: '#FFD700', fontWeight: '700' },

  // Empty
  empty: { alignItems: 'center', paddingVertical: SPACING.xl, gap: SPACING.md },
  emptyTitle: { fontSize: FONTS.sizes.xl, fontWeight: '700', color: C.text },
  emptyText: { fontSize: FONTS.sizes.sm, color: C.textSecondary },
  mapBtn: { backgroundColor: C.primary, borderRadius: RADIUS.full, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md },
  mapBtnText: { color: '#fff', fontWeight: '700', fontSize: FONTS.sizes.sm },

  versionText: { textAlign: 'center', fontSize: FONTS.sizes.xs, color: C.textMuted, paddingVertical: SPACING.lg },

  // Wallet card
  walletCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#006c44', borderRadius: RADIUS.xl, padding: SPACING.lg,
    ...SHADOW.sm,
  },
  walletLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  walletIconWrap: {
    width: 44, height: 44, borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  walletLabel: { fontSize: FONTS.sizes.xs, color: 'rgba(255,255,255,0.75)', fontWeight: '500', marginBottom: 2 },
  walletBalance: { fontSize: FONTS.sizes.xl, fontWeight: '800', color: '#fff' },
  depositBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
  },
  depositBtnText: { color: '#fff', fontWeight: '700', fontSize: FONTS.sizes.sm },

  // Deposit modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: C.surface, borderTopLeftRadius: RADIUS.xxl, borderTopRightRadius: RADIUS.xxl,
    padding: SPACING.xl, paddingBottom: 40, gap: SPACING.md,
    borderTopWidth: 1, borderColor: C.border,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontSize: FONTS.sizes.lg, fontWeight: '800', color: C.text },
  modalCloseBtn: { width: 32, height: 32, borderRadius: RADIUS.full, backgroundColor: C.surfaceGlass, alignItems: 'center', justifyContent: 'center' },
  modalSub: { fontSize: FONTS.sizes.sm, color: C.textMuted, marginTop: -4 },
  amountChips: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm, flexWrap: 'wrap' },
  amountChip: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.background,
  },
  amountChipActive: { borderColor: '#006c44', backgroundColor: '#006c4415' },
  amountChipText: { fontSize: FONTS.sizes.sm, color: C.textSecondary },
  inputLabel: { fontSize: FONTS.sizes.xs, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: SPACING.sm },
  amountInput: {
    backgroundColor: C.background, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: C.border,
    paddingHorizontal: SPACING.md, paddingVertical: 12,
    fontSize: FONTS.sizes.lg, color: C.text, fontWeight: '700',
  },
  currentBalanceRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: -4 },
  currentBalanceText: { fontSize: FONTS.sizes.xs, color: C.textMuted },
  payNowBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.sm, backgroundColor: '#006c44',
    borderRadius: RADIUS.lg, padding: SPACING.md, marginTop: SPACING.sm, ...SHADOW.sm,
  },
  payNowBtnText: { color: '#fff', fontSize: FONTS.sizes.md, fontWeight: '700' },
  verifySection: { gap: SPACING.sm },
  verifyHintRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, backgroundColor: '#006c4412', borderRadius: RADIUS.md, padding: SPACING.md },
  verifyHintText: { fontSize: FONTS.sizes.sm, color: '#006c44', flex: 1, lineHeight: 18 },
  verifyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.sm, backgroundColor: '#006c44',
    borderRadius: RADIUS.lg, padding: SPACING.md, ...SHADOW.sm,
  },
  reopenLinkBtn: { alignItems: 'center', paddingVertical: SPACING.sm },
  reopenLinkText: { color: '#006c44', fontSize: FONTS.sizes.sm, fontWeight: '600', textDecorationLine: 'underline' },
}); }
