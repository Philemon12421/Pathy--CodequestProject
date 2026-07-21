import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, ActivityIndicator, Animated,
  RefreshControl, Linking, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Circle } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useColors } from '../config/ThemeContext';
import { FONTS, RADIUS, SPACING, SHADOW } from '../config/theme';
import { adsAPI, walletAPI } from '../services/api';
import useStore from '../store/useStore';

const RADIUS_OPTIONS = ['0.5', '1', '2', '5', '10'];
const BASE_PRICE_GHS = 50;

// Price doubles with each larger radius: 50, 100, 200, 400, 800
function computePrice(radiusKm: string): number {
  const idx = RADIUS_OPTIONS.indexOf(radiusKm);
  return BASE_PRICE_GHS * Math.pow(2, idx >= 0 ? idx : 0);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function daysLeft(expiresAt: any) {
  if (!expiresAt) return null;
  const diff = (new Date(expiresAt) as any) - (new Date() as any);
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function formatDate(dateStr: any) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' });
}

function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api';
  const baseUrl = apiUrl.replace('/api', '');
  return `${baseUrl}${url}`;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ ad }: any) {
  const COLORS = useColors();
  const badge = makeBadgeStyles(COLORS);
  const days = daysLeft(ad.expires_at);
  if (ad.payment_status !== 'paid') {
    return <View style={[badge.pill, { backgroundColor: COLORS.warning + '33' }]}><Text style={[badge.text, { color: COLORS.warning }]}>Pending Payment</Text></View>;
  }
  if (days === 0) {
    return <View style={[badge.pill, { backgroundColor: COLORS.danger + '33' }]}><Text style={[badge.text, { color: COLORS.danger }]}>Expired</Text></View>;
  }
  return <View style={[badge.pill, { backgroundColor: COLORS.accent + '33' }]}><Text style={[badge.text, { color: COLORS.accent }]}>Live · {days}d left</Text></View>;
}

function makeBadgeStyles(COLORS: any) {
  return StyleSheet.create({
    pill: { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' },
    text: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.bold },
  });
}

// ─── My Ads Card ─────────────────────────────────────────────────────────────
function MyAdCard({ ad, onDelete }: any) {
  const COLORS = useColors();
  const myCard = makeMyCardStyles(COLORS);
  const [deleting, setDeleting] = useState(false);
  const imageUrl = resolveImageUrl(ad.image_url);

  const confirmDelete = () => {
    Alert.alert('Remove Ad', `Delete "${ad.business_name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          setDeleting(true);
          try { await adsAPI.delete(ad.id); onDelete(ad.id); }
          catch { Alert.alert('Error', 'Could not delete ad'); }
          finally { setDeleting(false); }
        }
      }
    ]);
  };

  return (
    <View style={myCard.wrap}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={myCard.imageBanner} resizeMode="cover" />
      ) : null}
      <View style={myCard.row}>
        <View style={myCard.iconWrap}>
          <Ionicons name="storefront" size={20} color={COLORS.accent} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={myCard.name}>{ad.business_name}</Text>
          <StatusBadge ad={ad} />
          {ad.expires_at && (
            <Text style={myCard.expiry}>Expires {formatDate(ad.expires_at)}</Text>
          )}
        </View>
        <TouchableOpacity onPress={confirmDelete} style={myCard.del} disabled={deleting}>
          {deleting
            ? <ActivityIndicator size="small" color={COLORS.danger} />
            : <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
          }
        </TouchableOpacity>
      </View>
      {ad.description ? <Text style={myCard.desc} numberOfLines={2}>{ad.description}</Text> : null}
      <View style={myCard.meta}>
        <Ionicons name="radio-button-on" size={12} color={COLORS.textMuted} />
        <Text style={myCard.metaText}>{ad.radius_km} km radius</Text>
        {ad.website_url ? (
          <>
            <Text style={myCard.dot}>·</Text>
            <TouchableOpacity onPress={() => Linking.openURL(ad.website_url)}>
              <Text style={[myCard.metaText, { color: COLORS.primary }]}>Visit site</Text>
            </TouchableOpacity>
          </>
        ) : null}
      </View>
    </View>
  );
}

function makeMyCardStyles(COLORS: any) {
  return StyleSheet.create({
    wrap: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, gap: SPACING.sm },
    imageBanner: { width: '100%', height: 120, borderRadius: RADIUS.md, marginBottom: SPACING.xs },
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md },
    iconWrap: { width: 40, height: 40, borderRadius: RADIUS.md, backgroundColor: COLORS.accent + '22', alignItems: 'center', justifyContent: 'center' },
    name: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: COLORS.text },
    expiry: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2 },
    del: { padding: 4 },
    desc: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, lineHeight: 18 },
    meta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    metaText: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
    dot: { color: COLORS.textMuted },
  });
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AdPortalScreen() {
  const COLORS = useColors();
  const s = makeStyles(COLORS);
  const { userLocation, myAds, setMyAds, addAd, user, setAuth, token } = useStore();

  // Form / flow state
  const [creating, setCreating] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ business_name: '', description: '', website_url: '', radius_km: '2' });
  const [imageAsset, setImageAsset] = useState<any>(null);
  const [pin, setPin] = useState(userLocation || { latitude: 6.6885, longitude: -1.6244 });
  const [adId, setAdId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [done, setDone] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(typeof user?.balance === 'number' ? user.balance : 0);

  // Slide animation for step transitions
  const slideAnim = useRef(new Animated.Value(0)).current;

  const animateStep = (newStep: any) => {
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: -20, duration: 120, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start();
    setStep(newStep);
  };

  const pickBusinessImage = () => {
    Alert.alert('Business Photo / Logo', 'Choose photo source', [
      {
        text: 'Take Photo',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Camera permission is required.');
            return;
          }
          const res = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
          if (!res.canceled && res.assets && res.assets.length > 0) {
            setImageAsset(res.assets[0]);
          }
        }
      },
      {
        text: 'Choose from Library',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Photo library permission is required.');
            return;
          }
          const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
          if (!res.canceled && res.assets && res.assets.length > 0) {
            setImageAsset(res.assets[0]);
          }
        }
      },
      { text: 'Cancel', style: 'cancel' }
    ]);
  };

  const loadMyAds = useCallback(async () => {
    try {
      const ads = await adsAPI.getMine();
      setMyAds(ads);
    } catch { }
  }, [setMyAds]);

  const refreshWalletBalance = useCallback(async () => {
    try {
      const latest = await walletAPI.getMe();
      setWalletBalance(typeof latest.balance === 'number' ? latest.balance : 0);
      setAuth(token, latest);
    } catch { }
  }, [token, setAuth]);

  useEffect(() => {
    loadMyAds();
    refreshWalletBalance();
  }, [loadMyAds, refreshWalletBalance]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadMyAds(), refreshWalletBalance()]);
    setRefreshing(false);
  };

  const resetForm = () => {
    setCreating(false);
    setDone(false);
    setStep(0);
    setAdId(null);
    setImageAsset(null);
    setForm({ business_name: '', description: '', website_url: '', radius_km: '2' });
    setPin(userLocation || { latitude: 6.6885, longitude: -1.6244 });
  };

  // Step 0 → 1: validate details
  const goToLocation = () => {
    if (!form.business_name.trim()) { Alert.alert('Required', 'Please enter your business name.'); return; }
    animateStep(1);
  };

  // Step 1 → 2: create draft ad and go to wallet review
  const goToPaymentDetails = async () => {
    setSubmitting(true);
    try {
      let imageUrl = null;
      if (imageAsset) {
        try {
          const fd = new FormData();
          const uri = imageAsset.uri;
          const fileName = uri.split('/').pop() || 'business.jpg';
          const match = /\.(\w+)$/.exec(fileName);
          const type = match ? `image/${match[1]}` : 'image/jpeg';
          fd.append('image', { uri, name: fileName, type } as any);
          const uploadRes = await adsAPI.uploadImage(fd);
          imageUrl = uploadRes.image_url;
        } catch (uploadErr) {
          console.warn('Image upload failed, continuing ad creation without image:', uploadErr);
        }
      }

      const ad = await adsAPI.create({
        business_name: form.business_name,
        description: form.description,
        latitude: pin.latitude,
        longitude: pin.longitude,
        radius_km: parseFloat(form.radius_km) || 2,
        website_url: form.website_url,
        image_url: imageUrl,
      });
      setAdId(ad.id);
      // Refresh balance before showing wallet review
      await refreshWalletBalance();
      animateStep(2);
    } catch (e: any) {
      Alert.alert('Error', e.error || 'Could not save ad details. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Step 2 → 3: skip straight to confirm since we use wallet
  const goToSummary = () => animateStep(3);

  // Step 3: activate ad by deducting from wallet balance
  const payAndActivate = async () => {
    if (!adId) return;
    const price = computePrice(form.radius_km);
    if (walletBalance < price) {
      Alert.alert(
        'Insufficient Balance',
        `You need GH₵ ${price.toFixed(2)} but your wallet only has GH₵ ${walletBalance.toFixed(2)}.\n\nPlease deposit funds from your Profile page.`
      );
      return;
    }
    setSubmitting(true);
    try {
      const activatedAd = await adsAPI.activate(adId);
      // Refresh balance after successful payment
      await refreshWalletBalance();
      addAd(activatedAd);
      setDone(true);
      loadMyAds();
    } catch (e: any) {
      const errMsg = e?.error || 'Payment failed. Please try again.';
      Alert.alert('Payment Failed', errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAd = (id: any) => setMyAds(myAds.filter((a: any) => a.id !== id));

  // ── Success screen ──
  if (done) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.successWrap}>
          <View style={s.successGlow}>
            <Ionicons name="checkmark-circle" size={64} color={COLORS.accent} />
          </View>
          <Text style={s.successTitle}>Ad is Live! 🎉</Text>
          <Text style={s.successText}>
            Your business is now pinned on the Routh Flow (Pathy) map.{'\n'}
            Users within <Text style={{ color: COLORS.accent, fontWeight: '700' }}>{form.radius_km} km</Text> will see a popup when nearby.
          </Text>
          <View style={s.successInfo}>
            <Ionicons name="time-outline" size={16} color={COLORS.primary} />
            <Text style={s.successInfoText}>Active for 30 days</Text>
          </View>
          <TouchableOpacity style={s.successBtn} onPress={resetForm}>
            <Ionicons name="arrow-back" size={18} color="#fff" />
            <Text style={s.successBtnText}>Back to My Ads</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Create flow ──
  if (creating) {
    return (
      <SafeAreaView style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={resetForm} style={s.backBtn}>
            <Ionicons name="close" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Place an Ad</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Step indicator */}
        <View style={s.stepRow}>
          {['Details', 'Location', 'Payment Details', `Pay GHS ${computePrice(form.radius_km)}`].map((label, i) => (
            <React.Fragment key={label}>
              <View style={s.stepItem}>
                <View style={[s.stepCircle, i <= step && { backgroundColor: COLORS.primary }]}>
                  {i < step
                    ? <Ionicons name="checkmark" size={14} color="#fff" />
                    : <Text style={[s.stepNum, i === step && { color: '#fff' }]}>{i + 1}</Text>
                  }
                </View>
                <Text style={[s.stepLabel, i === step && { color: COLORS.primary }]}>{label}</Text>
              </View>
              {i < 3 && <View style={[s.stepLine, i < step && { backgroundColor: COLORS.primary }]} />}
            </React.Fragment>
          ))}
        </View>

        <Animated.View style={{ flex: 1, transform: [{ translateX: slideAnim }] }}>
          <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

            {/* ── Step 0: Details ── */}
            {step === 0 && (
              <View style={s.stepContent}>
                <Text style={s.stepTitle}>Business Details</Text>
                <Text style={s.stepDesc}>Tell nearby Routh Flow users about your business</Text>

                <Text style={s.label}>Business Name *</Text>
                <TextInput
                  style={s.input} placeholderTextColor={COLORS.textMuted}
                  placeholder="e.g. Kwame's Auto Shop"
                  value={form.business_name}
                  onChangeText={(v) => setForm({ ...form, business_name: v })}
                />

                <Text style={s.label}>Description</Text>
                <TextInput
                  style={[s.input, s.textarea]} placeholderTextColor={COLORS.textMuted}
                  placeholder="What do you offer? Opening hours, deals..." multiline numberOfLines={3}
                  value={form.description}
                  onChangeText={(v) => setForm({ ...form, description: v })}
                />

                <Text style={s.label}>Website / WhatsApp (optional)</Text>
                <TextInput
                  style={s.input} placeholderTextColor={COLORS.textMuted}
                  placeholder="https://... or wa.me/233..."
                  value={form.website_url}
                  onChangeText={(v) => setForm({ ...form, website_url: v })}
                  autoCapitalize="none"
                  keyboardType="url"
                />

                <Text style={s.label}>Business Photo / Logo (optional)</Text>
                <Text style={s.sublabel}>Add an image for your business card & map popup</Text>
                {imageAsset ? (
                  <View style={s.imagePreviewContainer}>
                    <Image source={{ uri: imageAsset.uri }} style={s.imagePreview} resizeMode="cover" />
                    <View style={s.imagePreviewActions}>
                      <TouchableOpacity style={s.imageChangeBtn} onPress={pickBusinessImage}>
                        <Ionicons name="create-outline" size={16} color={COLORS.primary} />
                        <Text style={s.imageChangeText}>Change Photo</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.imageRemoveBtn} onPress={() => setImageAsset(null)}>
                        <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                        <Text style={s.imageRemoveText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity style={s.imagePickerBox} onPress={pickBusinessImage} activeOpacity={0.8}>
                    <Ionicons name="camera-outline" size={28} color={COLORS.accent} />
                    <Text style={s.imagePickerText}>Upload Business Photo or Logo</Text>
                    <Text style={s.imagePickerSubtext}>Tap to take a photo or select from gallery</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={s.nextBtn} onPress={goToLocation}>
                  <Text style={s.nextBtnText}>Next: Set Location</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            )}

            {/* ── Step 1: Location ── */}
            {step === 1 && (
              <View style={s.stepContent}>
                <Text style={s.stepTitle}>Pin Your Location</Text>
                <Text style={s.stepDesc}>Drag the pin to your exact business location</Text>

                <View style={s.mapWrap}>
                  <MapView
                    style={s.miniMap}
                    initialRegion={{ ...pin, latitudeDelta: 0.04, longitudeDelta: 0.04 }}
                    onRegionChangeComplete={(r) => setPin({ latitude: r.latitude, longitude: r.longitude })}
                  >
                    <Marker coordinate={pin} draggable onDragEnd={(e) => setPin(e.nativeEvent.coordinate)}>
                      <View style={s.pinMarker}>
                        <Ionicons name="storefront" size={16} color="#fff" />
                      </View>
                    </Marker>
                    <Circle
                      center={pin}
                      radius={(parseFloat(form.radius_km) || 2) * 1000}
                      strokeColor={COLORS.accent + '88'}
                      fillColor={COLORS.accent + '22'}
                    />
                  </MapView>
                  <View style={s.mapHint}>
                    <Ionicons name="move" size={12} color={COLORS.textSecondary} />
                    <Text style={s.mapHintText}>Drag pin or map to reposition</Text>
                  </View>
                </View>

                <Text style={s.label}>Popup Visibility Radius</Text>
                <Text style={s.sublabel}>Users within this distance will get a popup</Text>
                <View style={s.radiusRow}>
                  {RADIUS_OPTIONS.map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[s.radiusBtn, form.radius_km === r && s.radiusBtnActive]}
                      onPress={() => setForm({ ...form, radius_km: r })}
                    >
                      <Text style={[s.radiusBtnText, form.radius_km === r && { color: COLORS.primary, fontWeight: '700' }]}>{r} km</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={s.rowBtns}>
                  <TouchableOpacity style={s.backBtnOutline} onPress={() => animateStep(0)}>
                    <Text style={s.backBtnText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.nextBtn, { flex: 1 }]} onPress={goToPaymentDetails} disabled={submitting}>
                    {submitting
                      ? <ActivityIndicator color="#fff" />
                      : <><Text style={s.nextBtnText}>Next: Payment Details</Text><Ionicons name="arrow-forward" size={18} color="#fff" /></>
                    }
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ── Step 2: Payment Details ── */}
            {step === 2 && (
              <View style={s.stepContent}>
                <Text style={s.stepTitle}>Wallet Payment</Text>
                <Text style={s.stepDesc}>Your ad will be paid directly from your Pathy wallet</Text>

                {/* Wallet balance card */}
                <View style={s.walletReviewCard}>
                  <View style={s.walletReviewRow}>
                    <View style={s.walletReviewIcon}>
                      <Ionicons name="wallet" size={20} color="#006c44" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.walletReviewLabel}>Current Balance</Text>
                      <Text style={s.walletReviewBal}>GH₵ {walletBalance.toFixed(2)}</Text>
                    </View>
                  </View>

                  <View style={s.walletReviewDivider} />

                  <View style={s.walletLineRow}>
                    <Text style={s.walletLineKey}>Ad Cost</Text>
                    <Text style={s.walletLineVal}>- GH₵ {computePrice(form.radius_km).toFixed(2)}</Text>
                  </View>
                  <View style={[s.walletLineRow, { marginTop: 4 }]}>
                    <Text style={[s.walletLineKey, { fontWeight: '700' }]}>Remaining After</Text>
                    <Text style={[
                      s.walletLineVal,
                      { fontWeight: '800', color: walletBalance >= computePrice(form.radius_km) ? '#006c44' : '#E24B4A' }
                    ]}>
                      GH₵ {Math.max(0, walletBalance - computePrice(form.radius_km)).toFixed(2)}
                    </Text>
                  </View>
                </View>

                {/* Insufficient balance warning */}
                {walletBalance < computePrice(form.radius_km) && (
                  <View style={s.insufficientBanner}>
                    <Ionicons name="warning" size={16} color="#E24B4A" />
                    <Text style={s.insufficientText}>
                      Insufficient balance. You need GH₵ {computePrice(form.radius_km).toFixed(2)} but only have GH₵ {walletBalance.toFixed(2)}. Please deposit funds from your Profile page.
                    </Text>
                  </View>
                )}

                <View style={s.rowBtns}>
                  <TouchableOpacity style={s.backBtnOutline} onPress={() => animateStep(1)}>
                    <Text style={s.backBtnText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.nextBtn, { flex: 1 }]} onPress={goToSummary}>
                    <Text style={s.nextBtnText}>Review & Confirm</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            )}


            {step === 3 && (
              <View style={s.stepContent}>
                <Text style={s.stepTitle}>Confirm & Pay</Text>
                <Text style={s.stepDesc}>One-time flat fee to go live for 30 days</Text>

                {/* Price card */}
                <View style={s.priceCard}>
                  <View style={s.priceCardTop}>
                    <View style={s.priceGlow}>
                      <Ionicons name="megaphone" size={28} color={COLORS.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.priceLabel}>Map Ad — 30 Days</Text>
                      <Text style={s.priceSubLabel}>Appear on Routh Flow for all nearby users</Text>
                    </View>
                    <Text style={s.priceAmount}>GHS {computePrice(form.radius_km)}</Text>
                  </View>
                  <View style={s.priceDivider} />
                  <View style={s.summaryRow}><Text style={s.summaryKey}>Business</Text><Text style={s.summaryVal}>{form.business_name}</Text></View>
                  <View style={s.summaryRow}><Text style={s.summaryKey}>Location</Text><Text style={s.summaryVal}>{pin.latitude.toFixed(4)}, {pin.longitude.toFixed(4)}</Text></View>
                  <View style={s.summaryRow}><Text style={s.summaryKey}>Radius</Text><Text style={s.summaryVal}>{form.radius_km} km</Text></View>
                  <View style={s.summaryRow}><Text style={s.summaryKey}>Duration</Text><Text style={s.summaryVal}>30 days</Text></View>
                  <View style={s.summaryRow}>
                    <Text style={s.summaryKey}>Pay from Wallet</Text>
                    <Text style={s.summaryVal}>GH₵ {walletBalance.toFixed(2)} balance</Text>
                  </View>
                  <View style={[s.summaryRow, s.summaryTotal]}>
                    <Text style={s.summaryTotalKey}>Total</Text>
                    <Text style={s.summaryTotalVal}>GHS {computePrice(form.radius_km).toFixed(2)}</Text>
                  </View>
                </View>

                {/* Insufficient balance warning in step 3 too */}
                {walletBalance < computePrice(form.radius_km) ? (
                  <View style={s.insufficientBanner}>
                    <Ionicons name="warning" size={16} color="#E24B4A" />
                    <Text style={s.insufficientText}>
                      Insufficient balance — deposit funds from your Profile page first.
                    </Text>
                  </View>
                ) : (
                  <View style={s.secureRow}>
                    <Ionicons name="wallet" size={13} color={COLORS.accent} />
                    <Text style={s.secureText}>Paid from your Pathy wallet · Ad goes live instantly</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[s.payBtn, walletBalance < computePrice(form.radius_km) && { opacity: 0.5 }]}
                  onPress={payAndActivate}
                  disabled={submitting || walletBalance < computePrice(form.radius_km)}
                >
                  {submitting
                    ? <ActivityIndicator color="#fff" />
                    : <><Ionicons name="wallet" size={20} color="#fff" /><Text style={s.payBtnText}>Pay GHS {computePrice(form.radius_km)} & Go Live</Text></>
                  }
                </TouchableOpacity>

                <TouchableOpacity style={s.backBtnOutline} onPress={() => animateStep(2)}>
                  <Text style={s.backBtnText}>Back</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </SafeAreaView>
    );
  }

  // ── Dashboard (My Ads) ──
  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Advertise</Text>
          <Text style={s.headerSub}>Reach nearby Routh Flow users</Text>
        </View>
        <TouchableOpacity style={s.createBtn} onPress={() => setCreating(true)}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={s.createBtnText}>New Ad</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.dashScroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* Promo banner */}
        <View style={s.promoBanner}>
          <View style={s.promoBannerLeft}>
            <Text style={s.promoTitle}>📣 Reach 100s of drivers</Text>
            <Text style={s.promoText}>Pin your business on the live map. Nearby users get an instant popup notification.</Text>
            <View style={s.promoFeatures}>
              {['📍 Location pin on map', '🔔 Proximity popup', '⏱️ 30-day active'].map((f) => (
                <View key={f} style={s.promoFeatureRow}>
                  <Text style={s.promoFeatureText}>{f}</Text>
                </View>
              ))}
            </View>
          </View>
          <View style={s.promoPriceBadge}>
            <Text style={s.promoPriceSub}>from</Text>
            <Text style={s.promoPriceAmount}>GHS</Text>
            <Text style={s.promoPriceNum}>50</Text>
          </View>
        </View>

        <TouchableOpacity style={s.placeAdBtn} onPress={() => setCreating(true)}>
          <Ionicons name="megaphone" size={20} color="#fff" />
          <Text style={s.placeAdBtnText}>Place Your Ad Now</Text>
        </TouchableOpacity>

        {/* My ads section */}
        {myAds.length > 0 && (
          <View style={s.myAdsSection}>
            <Text style={s.sectionTitle}>My Ads</Text>
            <View style={s.myAdsList}>
              {myAds.map((ad: any) => (
                <MyAdCard key={ad.id} ad={ad} onDelete={handleDeleteAd} />
              ))}
            </View>
          </View>
        )}

        {myAds.length === 0 && (
          <View style={s.emptyState}>
            <Ionicons name="storefront-outline" size={48} color={COLORS.textMuted} />
            <Text style={s.emptyTitle}>No ads yet</Text>
            <Text style={s.emptyText}>Create your first ad to appear on the Routh Flow map</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(COLORS: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },

    // Header
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    backBtn: { width: 36, height: 36, borderRadius: RADIUS.full, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold, color: COLORS.text },
    headerSub: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 1 },
    createBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
    createBtnText: { color: '#fff', fontWeight: FONTS.weights.bold, fontSize: FONTS.sizes.sm },

    // Dashboard
    dashScroll: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: 100 },
    promoBanner: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.accent + '44', flexDirection: 'row', gap: SPACING.md, overflow: 'hidden' },
    promoBannerLeft: { flex: 1, gap: SPACING.sm },
    promoTitle: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: COLORS.text },
    promoText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, lineHeight: 18 },
    promoFeatures: { gap: 4, marginTop: SPACING.sm },
    promoFeatureRow: {},
    promoFeatureText: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
    promoPriceBadge: { alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.accent + '22', borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, minWidth: 70 },
    promoPriceSub: { fontSize: FONTS.sizes.xs, color: COLORS.accent, opacity: 0.8 },
    promoPriceAmount: { fontSize: FONTS.sizes.xs, color: COLORS.accent, fontWeight: FONTS.weights.bold },
    promoPriceNum: { fontSize: 32, fontWeight: FONTS.weights.extrabold, color: COLORS.accent, lineHeight: 38 },
    placeAdBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: COLORS.accent, borderRadius: RADIUS.lg, padding: SPACING.md + 2, ...SHADOW.sm },
    placeAdBtnText: { color: '#fff', fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold },
    myAdsSection: { gap: SPACING.md },
    sectionTitle: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: COLORS.text },
    myAdsList: { gap: SPACING.sm },
    emptyState: { alignItems: 'center', paddingVertical: SPACING.xxl, gap: SPACING.md },
    emptyTitle: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold, color: COLORS.textSecondary },
    emptyText: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, textAlign: 'center', lineHeight: 18 },

    // Step indicator
    stepRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.lg },
    stepItem: { alignItems: 'center', gap: 4 },
    stepCircle: { width: 28, height: 28, borderRadius: RADIUS.full, backgroundColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
    stepNum: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.bold, color: COLORS.textMuted },
    stepLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, fontWeight: FONTS.weights.medium },
    stepLine: { flex: 1, height: 2, backgroundColor: COLORS.border, marginBottom: 16 },

    // Form
    scroll: { padding: SPACING.xl, paddingBottom: 110 },
    stepContent: { gap: SPACING.sm },
    stepTitle: { fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.bold, color: COLORS.text },
    stepDesc: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginBottom: SPACING.md },
    label: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.bold, color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: SPACING.md },
    sublabel: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: -6 },
    input: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, color: COLORS.text, fontSize: FONTS.sizes.md, padding: SPACING.md },
    textarea: { minHeight: 90, textAlignVertical: 'top' },
    imagePreviewContainer: { marginTop: SPACING.xs, borderRadius: RADIUS.md, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
    imagePreview: { width: '100%', height: 150 },
    imagePreviewActions: { flexDirection: 'row', justifyContent: 'space-between', padding: SPACING.sm, backgroundColor: COLORS.surface },
    imageChangeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    imageChangeText: { fontSize: FONTS.sizes.xs, color: COLORS.primary, fontWeight: FONTS.weights.semibold },
    imageRemoveBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    imageRemoveText: { fontSize: FONTS.sizes.xs, color: COLORS.danger, fontWeight: FONTS.weights.semibold },
    imagePickerBox: { marginTop: SPACING.xs, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.accent + '66', borderStyle: 'dashed', backgroundColor: COLORS.accent + '11', padding: SPACING.lg, alignItems: 'center', justifyContent: 'center', gap: 4 },
    imagePickerText: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.bold, color: COLORS.accent },
    imagePickerSubtext: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
    nextBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, padding: SPACING.md, marginTop: SPACING.lg, ...SHADOW.sm },
    nextBtnText: { color: '#fff', fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold },
    backBtnOutline: { alignItems: 'center', padding: SPACING.md, marginTop: SPACING.sm, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border },
    backBtnText: { color: COLORS.textSecondary, fontWeight: FONTS.weights.medium },
    rowBtns: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.lg },

    // Map
    mapWrap: { borderRadius: RADIUS.lg, overflow: 'hidden', height: 230, borderWidth: 1, borderColor: COLORS.border },
    miniMap: { flex: 1 },
    mapHint: { position: 'absolute', bottom: 8, left: 0, right: 0, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 4 },
    mapHintText: { backgroundColor: COLORS.mapOverlay, color: COLORS.textSecondary, fontSize: FONTS.sizes.xs, paddingHorizontal: SPACING.md, paddingVertical: 4, borderRadius: RADIUS.full },
    pinMarker: { width: 36, height: 36, borderRadius: RADIUS.full, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
    radiusRow: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap', marginTop: SPACING.sm },
    radiusBtn: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
    radiusBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '22' },
    radiusBtnText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm },

    // Payment method selector
    methodRow: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.md },
    methodBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, padding: SPACING.md, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface },
    methodBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '15' },
    methodLabel: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontWeight: FONTS.weights.medium },
    payFields: { gap: 2, marginTop: SPACING.sm },
    networkRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
    networkBtn: { flex: 1, alignItems: 'center', paddingVertical: SPACING.sm, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
    networkBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '15' },
    networkBtnText: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
    momoHintRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
    momoHintText: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, flex: 1 },
    cardRow: { flexDirection: 'row', gap: SPACING.md },

    // Payment
    priceCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.accent + '55', gap: SPACING.sm },
    priceCardTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.sm },
    priceGlow: { width: 50, height: 50, borderRadius: RADIUS.md, backgroundColor: COLORS.accent + '22', alignItems: 'center', justifyContent: 'center' },
    priceLabel: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: COLORS.text },
    priceSubLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2 },
    priceAmount: { fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.extrabold, color: COLORS.accent },
    priceDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.sm },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
    summaryKey: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm },
    summaryVal: { color: COLORS.text, fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.medium, maxWidth: '60%', textAlign: 'right' },
    summaryTotal: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.sm, marginTop: SPACING.sm },
    summaryTotalKey: { color: COLORS.text, fontWeight: FONTS.weights.bold, fontSize: FONTS.sizes.md },
    summaryTotalVal: { color: COLORS.accent, fontWeight: FONTS.weights.extrabold, fontSize: FONTS.sizes.lg },
    secureRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, justifyContent: 'center', marginTop: SPACING.sm },
    secureText: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs },
    payBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: COLORS.accent, borderRadius: RADIUS.lg, padding: SPACING.md + 2, marginTop: SPACING.lg, ...SHADOW.md },
    payBtnText: { color: '#fff', fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold },

    // Success
    successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xxl, gap: SPACING.lg },
    successGlow: { width: 100, height: 100, borderRadius: RADIUS.full, backgroundColor: COLORS.accent + '22', alignItems: 'center', justifyContent: 'center' },
    successTitle: { fontSize: FONTS.sizes.xxxl, fontWeight: FONTS.weights.extrabold, color: COLORS.text },
    successText: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 24 },
    successInfo: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.primary + '22', borderRadius: RADIUS.full, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm },
    successInfoText: { color: COLORS.primary, fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.semibold },
    successBtn: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.xxl, paddingVertical: SPACING.md, marginTop: SPACING.sm },
    successBtnText: { color: '#fff', fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold },

    // Wallet review styles
    walletReviewCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, gap: SPACING.sm },
    walletReviewRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
    walletReviewIcon: { width: 40, height: 40, borderRadius: RADIUS.md, backgroundColor: COLORS.primary + '18', alignItems: 'center', justifyContent: 'center' },
    walletReviewLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
    walletReviewBal: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold, color: COLORS.text },
    walletReviewDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 4 },
    walletLineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    walletLineKey: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
    walletLineVal: { fontSize: FONTS.sizes.sm, color: COLORS.text, fontWeight: FONTS.weights.semibold },
    insufficientBanner: { flexDirection: 'row', gap: SPACING.sm, backgroundColor: '#E24B4A18', borderRadius: RADIUS.md, padding: SPACING.md, marginTop: SPACING.md, alignItems: 'center' },
    insufficientText: { color: '#E24B4A', fontSize: FONTS.sizes.xs, flex: 1, lineHeight: 16, fontWeight: FONTS.weights.bold },
  });

}
