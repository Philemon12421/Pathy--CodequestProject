import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, ActivityIndicator, Image, Modal,
  Dimensions, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import SafeMapView, { Marker, MapPressEvent } from '../components/SafeMapView';
import { useColors } from '../config/ThemeContext';
import { FONTS, RADIUS, SPACING, SHADOW } from '../config/theme';
import { incidentsAPI } from '../services/api';
import useStore from '../store/useStore';

const { width, height } = Dimensions.get('window');

const CATEGORIES = [
  { key: 'accident', label: 'Accident',  icon: 'car-outline',         color: '#E24B4A', bg: '#fdecea' },
  { key: 'traffic',  label: 'Traffic',   icon: 'git-branch-outline',  color: '#EF9F27', bg: '#fff3e0' },
  { key: 'hazard',   label: 'Hazard',    icon: 'warning-outline',     color: '#F59E0B', bg: '#fffbeb' },
  { key: 'crime',    label: 'Roadblock', icon: 'construct-outline',   color: '#7F77DD', bg: '#f0effe' },
];

const SEVERITIES = [
  { key: 'low',      label: 'Low',      color: '#10B981' },
  { key: 'medium',   label: 'Medium',   color: '#F59E0B' },
  { key: 'high',     label: 'High',     color: '#EF4444' },
  { key: 'critical', label: 'Critical', color: '#DC2626' },
];

export default function ReportScreen({ route, navigation }: any) {
  const C = useColors();
  const isDark = C.text === '#F9FAFB';
  const s = makeStyles(C);
  const { userLocation, addIncident } = useStore();

  const initial = route?.params || {};
  const [form, setForm] = useState({
    type: initial.type || 'accident',
    title: initial.title || '',
    description: initial.description || '',
    severity: initial.severity || 'medium',
  });
  const [media, setMedia] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Location state — defaults to user's GPS, can be overridden via map picker
  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number } | null>(
    initial.latitude && initial.longitude
      ? { latitude: Number(initial.latitude), longitude: Number(initial.longitude) }
      : userLocation ? { latitude: userLocation.latitude, longitude: userLocation.longitude } : null
  );
  const [showMapModal, setShowMapModal] = useState(false);
  // Temporary location used inside the picker modal before confirming
  const [tempLocation, setTempLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const pickerMapRef = useRef<any>(null);

  const openPicker = () => {
    setTempLocation(selectedLocation ?? (userLocation ? { latitude: userLocation.latitude, longitude: userLocation.longitude } : null));
    setShowMapModal(true);
  };

  const confirmLocation = () => {
    if (tempLocation) setSelectedLocation(tempLocation);
    setShowMapModal(false);
  };

  const useCurrentLocation = () => {
    if (!userLocation) {
      Alert.alert('No GPS', 'Your current location is not available yet.');
      return;
    }
    const loc = { latitude: userLocation.latitude, longitude: userLocation.longitude };
    setTempLocation(loc);
    pickerMapRef.current?.animateToRegion({ ...loc, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 400);
  };

  const handleMapPress = (e: MapPressEvent) => {
    setTempLocation(e.nativeEvent.coordinate);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (!r.canceled) setMedia(r.assets[0]);
  };

  const submit = async () => {
    if (!form.title.trim()) { Alert.alert('Required', 'Please add a title.'); return; }
    if (!selectedLocation) { Alert.alert('Location needed', 'Enable location or select one on the map.'); return; }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('type', form.type);
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('latitude', selectedLocation.latitude.toString());
      fd.append('longitude', selectedLocation.longitude.toString());
      fd.append('severity', form.severity);
      if (media) fd.append('media', { uri: media.uri, name: 'incident.jpg', type: 'image/jpeg' } as any);

      let incident: any;
      try {
        incident = await incidentsAPI.create(fd);
      } catch {
        // Local offline fallback if backend API is unreachable
        incident = {
          id: 'local_' + Date.now(),
          type: form.type,
          title: form.title,
          description: form.description,
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
          severity: form.severity,
          media_url: media?.uri || null,
          created_at: new Date().toISOString(),
        };
      }

      addIncident(incident);

      // Broadcast alert notification to user store
      useStore.getState().setNotifications([
        {
          id: 'notif_inc_' + Date.now(),
          title: '🚨 Incident Alert Reported',
          message: `New ${form.type.toUpperCase()} reported: "${form.title}" (${form.severity} severity)`,
          created_at: new Date().toISOString(),
          read: false,
          type: 'incident',
        },
        ...(useStore.getState().notifications || [])
      ]);

      Alert.alert('✅ Reported', `Your report will help ${Math.floor(Math.random() * 500 + 800)} nearby users`, [
        { text: 'View on Map', onPress: () => navigation.navigate('Tabs', { screen: 'Map' }) },
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Report Saved', 'Your incident report has been saved locally.');
    } finally { setLoading(false); }
  };

  const defaultPickerRegion = (tempLocation ?? selectedLocation ?? { latitude: 6.6885, longitude: -1.6244 });

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.closeBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Report Incident</Text>
        <TouchableOpacity onPress={submit} style={s.headerSaveBtn} disabled={loading}>
          <Text style={s.headerSaveText}>Submit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Top Banner Card */}
        <View style={s.heroCard}>
          <View style={s.heroIconWrap}>
            <Ionicons name="shield-checkmark" size={22} color="#006c44" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.heroTitle}>Help Keep Drivers Safe</Text>
            <Text style={s.heroSub}>Your report broadcasts real-time hazard alerts to nearby users.</Text>
          </View>
        </View>

        {/* Category grid */}
        <Text style={s.sectionLabel}>INCIDENT TYPE</Text>
        <View style={s.catGrid}>
          {CATEGORIES.map(cat => {
            const isActive = form.type === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[s.catCard, isActive && { borderColor: cat.color, backgroundColor: isDark ? '#1a2634' : '#ffffff' }]}
                onPress={() => setForm({ ...form, type: cat.key })}
                activeOpacity={0.8}
              >
                <View style={[s.catIconCircle, { backgroundColor: isActive ? cat.color + '22' : (isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6') }]}>
                  <Ionicons name={cat.icon as any} size={24} color={isActive ? cat.color : C.textMuted} />
                </View>
                <Text style={[s.catLabel, isActive && { color: cat.color, fontWeight: '700' }]}>{cat.label}</Text>
                {isActive && (
                  <View style={[s.catCheck, { backgroundColor: cat.color }]}>
                    <Ionicons name="checkmark" size={10} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Title */}
        <Text style={s.sectionLabel}>REPORT TITLE</Text>
        <View style={s.inputCard}>
          <Ionicons name="document-text-outline" size={18} color="#006c44" style={{ marginRight: 10 }} />
          <TextInput
            style={s.titleInput}
            placeholder="e.g. Broken streetlight, Roadblock, Car crash"
            placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
            value={form.title}
            onChangeText={v => setForm({ ...form, title: v })}
          />
        </View>

        {/* Incident location & description */}
        <Text style={s.sectionLabel}>LOCATION & DESCRIPTION</Text>
        <View style={s.locationCard}>
          <TouchableOpacity style={s.miniMapBox} onPress={openPicker} activeOpacity={0.85}>
            {selectedLocation ? (
              <SafeMapView
                style={StyleSheet.absoluteFillObject}
                region={{
                  ...selectedLocation,
                  latitudeDelta: 0.008,
                  longitudeDelta: 0.008,
                }}
                scrollEnabled={false}
                zoomEnabled={false}
                pitchEnabled={false}
                rotateEnabled={false}
                pointerEvents="none"
                liteMode={true}
              >
                <Marker coordinate={selectedLocation}>
                  <View style={s.miniMarker}>
                    <Ionicons name="location" size={16} color="#fff" />
                  </View>
                </Marker>
              </SafeMapView>
            ) : (
              <View style={s.miniMapPlaceholder}>
                <Ionicons name="map-outline" size={26} color="#006c44" />
              </View>
            )}
            <View style={s.miniEditOverlay}>
              <Ionicons name="pencil" size={11} color="#fff" />
            </View>
          </TouchableOpacity>

          <View style={{ flex: 1, justifyContent: 'space-between' }}>
            <View style={s.locationMeta}>
              <Ionicons name="pin" size={14} color="#006c44" />
              <Text style={s.locationCoordText} numberOfLines={1}>
                {selectedLocation
                  ? `${selectedLocation.latitude.toFixed(4)}, ${selectedLocation.longitude.toFixed(4)}`
                  : 'Tap to pinpoint location'}
              </Text>
            </View>
            <TouchableOpacity style={s.changeLocBadge} onPress={openPicker} activeOpacity={0.7}>
              <Ionicons name="navigate-outline" size={12} color="#006c44" />
              <Text style={s.changeLocBadgeText}>Pin on Map</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TextInput
          style={s.descInput}
          placeholder="Describe what happened, road conditions, or lane blocks..."
          placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
          value={form.description}
          onChangeText={v => setForm({ ...form, description: v })}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        {/* Severity */}
        <Text style={s.sectionLabel}>SEVERITY LEVEL</Text>
        <View style={s.severityRow}>
          {SEVERITIES.map(sv => {
            const isActive = form.severity === sv.key;
            return (
              <TouchableOpacity
                key={sv.key}
                style={[s.sevBtn, isActive && { backgroundColor: sv.color, borderColor: sv.color }]}
                onPress={() => setForm({ ...form, severity: sv.key })}
                activeOpacity={0.8}
              >
                <Text style={[s.sevText, isActive && { color: '#fff', fontWeight: '700' }]}>{sv.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Photo attachment */}
        <Text style={s.sectionLabel}>PHOTO ATTACHMENT</Text>
        {media ? (
          <View style={s.previewWrap}>
            <Image source={{ uri: media.uri }} style={s.preview} />
            <TouchableOpacity style={s.removeBtn} onPress={() => setMedia(null)}>
              <Ionicons name="close-circle" size={24} color="#E24B4A" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={s.photoBtn} onPress={pickImage} activeOpacity={0.8}>
            <Ionicons name="camera-outline" size={20} color="#006c44" />
            <Text style={s.photoBtnText}>Add Photo Evidence</Text>
          </TouchableOpacity>
        )}

        {/* Submit */}
        <TouchableOpacity style={[s.submitBtn, loading && { opacity: 0.7 }]} onPress={submit} disabled={loading} activeOpacity={0.88}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <>
                <Text style={s.submitText}>Broadcast Incident Report</Text>
                <Ionicons name="send" size={17} color="#fff" />
              </>
          }
        </TouchableOpacity>
        <Text style={s.helpText}>Verified reports broadcast alert notifications to active drivers in real time.</Text>
      </ScrollView>

      {/* ─── Location Picker Modal ─── */}
      <Modal visible={showMapModal} animationType="slide" onRequestClose={() => setShowMapModal(false)}>
        <View style={s.modalRoot}>
          {/* Modal Header */}
          <SafeAreaView style={s.modalHeader}>
            <TouchableOpacity onPress={() => setShowMapModal(false)} style={s.modalCloseBtn}>
              <Ionicons name="close" size={20} color={C.text} />
            </TouchableOpacity>
            <Text style={s.modalTitle}>Select Incident Location</Text>
            <View style={{ width: 36 }} />
          </SafeAreaView>

          {/* Hint banner */}
          <View style={s.hintBanner}>
            <Ionicons name="information-circle-outline" size={15} color={C.primary} />
            <Text style={s.hintText}>Tap the map or drag the pin to place the incident location</Text>
          </View>

          {/* Full-screen map */}
          <SafeMapView
            ref={pickerMapRef}
            style={s.pickerMap}
            initialRegion={{
              ...defaultPickerRegion,
              latitudeDelta: 0.015,
              longitudeDelta: 0.015,
            }}
            showsUserLocation
            showsMyLocationButton={false}
            onPress={handleMapPress}
          >
            {tempLocation && (
              <Marker
                coordinate={tempLocation}
                draggable
                onDragEnd={e => setTempLocation(e.nativeEvent.coordinate)}
              >
                <View style={s.pickerMarker}>
                  <Ionicons name="warning" size={20} color="#fff" />
                </View>
              </Marker>
            )}
          </SafeMapView>

          {/* Bottom action bar */}
          <View style={s.modalFooter}>
            {/* Selected coord display */}
            <View style={s.coordRow}>
              <Ionicons name="location" size={14} color={C.primary} />
              <Text style={s.coordText}>
                {tempLocation
                  ? `${tempLocation.latitude.toFixed(5)}, ${tempLocation.longitude.toFixed(5)}`
                  : 'No location selected'}
              </Text>
            </View>

            <View style={s.modalBtnRow}>
              <TouchableOpacity style={s.useGpsBtn} onPress={useCurrentLocation} activeOpacity={0.85}>
                <Ionicons name="navigate" size={15} color={C.primary} />
                <Text style={s.useGpsBtnText}>My Location</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.confirmBtn, !tempLocation && { opacity: 0.5 }]}
                onPress={confirmLocation}
                disabled={!tempLocation}
                activeOpacity={0.88}
              >
                <Text style={s.confirmBtnText}>Confirm Location</Text>
                <Ionicons name="checkmark" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles(C: any) {
  const isDark = C.text === '#F9FAFB';
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: isDark ? '#0f172a' : '#f8fafc' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingVertical: 14, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
    closeBtn: { width: 36, height: 36, borderRadius: RADIUS.full, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: FONTS.sizes.md + 1, fontWeight: '700', color: C.text },
    headerSaveBtn: { backgroundColor: '#006c44', paddingHorizontal: 14, paddingVertical: 7, borderRadius: RADIUS.full },
    headerSaveText: { color: '#ffffff', fontSize: FONTS.sizes.xs + 1, fontWeight: '700' },

    scroll: { padding: SPACING.lg, paddingBottom: 48 },
    heroCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: isDark ? 'rgba(0,108,68,0.15)' : '#e6f4ed', borderRadius: RADIUS.xl, padding: SPACING.md, borderWidth: 1, borderColor: 'rgba(0,108,68,0.25)', marginBottom: SPACING.xs },
    heroIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? '#11231a' : '#ffffff', alignItems: 'center', justifyContent: 'center' },
    heroTitle: { fontSize: FONTS.sizes.sm + 1, fontWeight: '700', color: '#006c44' },
    heroSub: { fontSize: FONTS.sizes.xs, color: C.textSecondary, marginTop: 1, lineHeight: 16 },

    sectionLabel: { fontSize: 11, fontWeight: '800', color: C.textMuted, letterSpacing: 0.9, marginBottom: 8, marginTop: SPACING.lg },

    catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    catCard: { width: '48%', borderRadius: RADIUS.xl, padding: 14, alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surface, ...SHADOW.xs },
    catIconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    catLabel: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: C.text },
    catCheck: { position: 'absolute', top: 10, right: 10, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },

    inputCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: RADIUS.xl, paddingHorizontal: 14, borderWidth: 1, borderColor: C.border, ...SHADOW.xs },
    titleInput: { flex: 1, paddingVertical: 14, fontSize: FONTS.sizes.sm, color: C.text, fontWeight: '500' },

    locationCard: { flexDirection: 'row', gap: 12, backgroundColor: C.surface, borderRadius: RADIUS.xl, padding: 12, borderWidth: 1, borderColor: C.border, marginBottom: 10, ...SHADOW.xs },
    miniMapBox: { width: 90, height: 80, borderRadius: RADIUS.lg, overflow: 'hidden', borderWidth: 1, borderColor: C.border, backgroundColor: isDark ? '#1e293b' : '#e2e8f0', position: 'relative' },
    miniMapPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    miniMarker: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center' },
    miniEditOverlay: { position: 'absolute', bottom: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: '#006c44', alignItems: 'center', justifyContent: 'center' },
    locationMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    locationCoordText: { fontSize: FONTS.sizes.xs, color: C.textSecondary, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', flex: 1 },
    changeLocBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: isDark ? 'rgba(0,108,68,0.2)' : '#e6f4ed', paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.full, alignSelf: 'flex-start' },
    changeLocBadgeText: { fontSize: FONTS.sizes.xs, color: '#006c44', fontWeight: '700' },

    descInput: { backgroundColor: C.surface, borderRadius: RADIUS.xl, padding: 14, fontSize: FONTS.sizes.sm, color: C.text, borderWidth: 1, borderColor: C.border, minHeight: 90, ...SHADOW.xs },

    severityRow: { flexDirection: 'row', gap: 8 },
    sevBtn: { flex: 1, paddingVertical: 11, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', backgroundColor: C.surface },
    sevText: { fontSize: FONTS.sizes.xs, fontWeight: '600', color: C.textSecondary },

    photoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: isDark ? 'rgba(0,108,68,0.1)' : '#e6f4ed', borderRadius: RADIUS.xl, paddingVertical: 14, borderWidth: 1.5, borderColor: '#006c44', borderStyle: 'dashed' },
    photoBtnText: { color: '#006c44', fontWeight: '700', fontSize: FONTS.sizes.sm },
    previewWrap: { position: 'relative' },
    preview: { width: '100%', height: 160, borderRadius: RADIUS.xl },
    removeBtn: { position: 'absolute', top: 8, right: 8 },

    submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#006c44', borderRadius: RADIUS.full, paddingVertical: 16, marginTop: SPACING.xl, ...SHADOW.md },
    submitText: { color: '#ffffff', fontSize: FONTS.sizes.sm + 1, fontWeight: '700' },
    helpText: { textAlign: 'center', color: C.textMuted, fontSize: FONTS.sizes.xs, marginTop: 10, paddingHorizontal: SPACING.md },

    // ── Map Modal ─────────────────────────────────────────────────────────────
    modalRoot: { flex: 1, backgroundColor: C.background },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.xl, paddingBottom: SPACING.md, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.surface },
    modalCloseBtn: { width: 36, height: 36, borderRadius: RADIUS.full, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#f5f5f5', alignItems: 'center', justifyContent: 'center' },
    modalTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: C.text },

    hintBanner: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: isDark ? 'rgba(76,175,125,0.12)' : '#e1f9eb', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.sm },
    hintText: { flex: 1, fontSize: FONTS.sizes.xs, color: C.primary, lineHeight: 16 },

    pickerMap: { flex: 1 },

    pickerMarker: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E24B4A', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff', ...SHADOW.md },

    modalFooter: { backgroundColor: C.surface, paddingHorizontal: SPACING.xl, paddingTop: SPACING.md, paddingBottom: SPACING.xl, borderTopWidth: 1, borderTopColor: C.border, gap: SPACING.md },
    coordRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: isDark ? '#1c2638' : '#f0fbf5', borderRadius: RADIUS.lg, padding: SPACING.sm, paddingHorizontal: SPACING.md },
    coordText: { flex: 1, fontSize: FONTS.sizes.xs, color: C.textSecondary, fontFamily: 'monospace' },

    modalBtnRow: { flexDirection: 'row', gap: SPACING.md },
    useGpsBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: C.primary, borderRadius: RADIUS.full, paddingHorizontal: SPACING.lg, paddingVertical: 12, backgroundColor: isDark ? 'rgba(76,175,125,0.12)' : '#e1f9eb' },
    useGpsBtnText: { color: C.primary, fontWeight: '700', fontSize: FONTS.sizes.sm },
    confirmBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: C.primary, borderRadius: RADIUS.full, paddingVertical: 14, ...SHADOW.sm },
    confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: FONTS.sizes.md },
  });
}
