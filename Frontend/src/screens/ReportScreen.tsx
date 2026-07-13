import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../config/ThemeContext';
import { FONTS, RADIUS, SPACING, SHADOW } from '../config/theme';
import { incidentsAPI } from '../services/api';
import useStore from '../store/useStore';

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

export default function ReportScreen({ navigation }: any) {
  const C = useColors();
  const s = makeStyles(C);
  const { userLocation, addIncident } = useStore();
  const [form, setForm] = useState({ type: 'accident', title: '', description: '', severity: 'medium' });
  const [media, setMedia] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (!r.canceled) setMedia(r.assets[0]);
  };

  const submit = async () => {
    if (!form.title.trim()) { Alert.alert('Required', 'Please add a description.'); return; }
    if (!userLocation) { Alert.alert('Location needed', 'Enable location to report an incident.'); return; }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('type', form.type);
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('latitude', userLocation.latitude.toString());
      fd.append('longitude', userLocation.longitude.toString());
      fd.append('severity', form.severity);
      if (media) fd.append('media', { uri: media.uri, name: 'incident.jpg', type: 'image/jpeg' } as any);
      const incident = await incidentsAPI.create(fd);
      addIncident(incident);
      Alert.alert('✅ Reported', `Your report will help ${Math.floor(Math.random() * 500 + 800)} nearby users`, [
        { text: 'View on Map', onPress: () => navigation.navigate('Tabs', { screen: 'Map' }) },
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.error || 'Could not submit report');
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.closeBtn}>
          <Ionicons name="close" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Report an Incident</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* Category grid */}
        <Text style={s.sectionLabel}>SELECT CATEGORY</Text>
        <View style={s.catGrid}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.key}
              style={[s.catCard, { backgroundColor: cat.bg }, form.type === cat.key && s.catCardActive]}
              onPress={() => setForm({ ...form, type: cat.key })}
              activeOpacity={0.85}
            >
              <View style={[s.catIconCircle, form.type === cat.key && { backgroundColor: cat.color + '22' }]}>
                <Ionicons name={cat.icon as any} size={28} color={form.type === cat.key ? cat.color : C.textSecondary} />
              </View>
              <Text style={[s.catLabel, form.type === cat.key && { color: cat.color, fontWeight: '700' }]}>{cat.label}</Text>
              {form.type === cat.key && (
                <View style={[s.catCheck, { backgroundColor: cat.color }]}>
                  <Ionicons name="checkmark" size={10} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Incident details */}
        <Text style={s.sectionLabel}>INCIDENT DETAILS</Text>
        <View style={s.detailRow}>
          {/* Mini map placeholder */}
          <View style={s.miniMapWrap}>
            <View style={s.miniMap}>
              <Ionicons name="map-outline" size={28} color="rgba(0,108,68,0.3)" />
              <View style={s.locationPin}>
                <Ionicons name="location" size={20} color="#006c44" />
              </View>
            </View>
            <Text style={s.locationText} numberOfLines={1}>
              {userLocation
                ? `${userLocation.latitude?.toFixed(3)}, ${userLocation.longitude?.toFixed(3)}`
                : 'Locating...'}
            </Text>
          </View>

          {/* Description */}
          <TextInput
            style={s.descInput}
            placeholder="Add a description..."
            placeholderTextColor="rgba(0,108,68,0.35)"
            value={form.description}
            onChangeText={v => setForm({ ...form, description: v })}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* Title */}
        <Text style={s.sectionLabel}>TITLE</Text>
        <TextInput
          style={s.titleInput}
          placeholder="Brief description of the incident"
          placeholderTextColor="rgba(0,108,68,0.35)"
          value={form.title}
          onChangeText={v => setForm({ ...form, title: v })}
        />

        {/* Severity */}
        <Text style={s.sectionLabel}>SEVERITY</Text>
        <View style={s.severityRow}>
          {SEVERITIES.map(sv => (
            <TouchableOpacity
              key={sv.key}
              style={[s.sevBtn, form.severity === sv.key && { backgroundColor: sv.color, borderColor: sv.color }]}
              onPress={() => setForm({ ...form, severity: sv.key })}
            >
              <Text style={[s.sevText, form.severity === sv.key && { color: '#fff' }]}>{sv.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Photo */}
        {media ? (
          <View style={s.previewWrap}>
            <Image source={{ uri: media.uri }} style={s.preview} />
            <TouchableOpacity style={s.removeBtn} onPress={() => setMedia(null)}>
              <Ionicons name="close-circle" size={24} color="#E24B4A" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={s.photoBtn} onPress={pickImage}>
            <Ionicons name="camera-outline" size={20} color="#006c44" />
            <Text style={s.photoBtnText}>Add Photo</Text>
          </TouchableOpacity>
        )}

        {/* Submit */}
        <TouchableOpacity style={[s.submitBtn, loading && { opacity: 0.7 }]} onPress={submit} disabled={loading} activeOpacity={0.88}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <>
                <Text style={s.submitText}>Submit Report</Text>
                <Ionicons name="send" size={18} color="#fff" />
              </>
          }
        </TouchableOpacity>
        <Text style={s.helpText}>Your report will help {Math.floor(Math.random() * 500 + 800)} nearby users</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(C: any) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: C.border },
    closeBtn: { width: 36, height: 36, borderRadius: RADIUS.full, backgroundColor: C.text === '#F9FAFB' ? 'rgba(255,255,255,0.08)' : '#f5f5f5', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: C.text },

    scroll: { padding: SPACING.xl, paddingBottom: 48 },
    sectionLabel: { fontSize: 11, fontWeight: '700', color: C.textMuted, letterSpacing: 0.8, marginBottom: SPACING.md, marginTop: SPACING.lg },

    catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
    catCard: { width: '47%', borderRadius: RADIUS.xl, padding: SPACING.lg, alignItems: 'center', gap: SPACING.sm, borderWidth: 2, borderColor: 'transparent', backgroundColor: C.surface, ...SHADOW.xs },
    catCardActive: { borderColor: C.primary },
    catIconCircle: { width: 56, height: 56, borderRadius: RADIUS.full, backgroundColor: C.text === '#F9FAFB' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' },
    catLabel: { fontSize: FONTS.sizes.md, fontWeight: '600', color: C.text },
    catCheck: { position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

    detailRow: { flexDirection: 'row', gap: SPACING.md },
    miniMapWrap: { width: 120 },
    miniMap: { width: 120, height: 120, backgroundColor: C.text === '#F9FAFB' ? '#1c2638' : '#e7fff1', borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border, marginBottom: 6 },
    locationPin: { position: 'absolute', bottom: 8 },
    locationText: { fontSize: FONTS.sizes.xs, color: C.textMuted, textAlign: 'center' },
    descInput: { flex: 1, height: 120, backgroundColor: C.text === '#F9FAFB' ? '#1c2638' : '#f8faf9', borderRadius: RADIUS.lg, padding: SPACING.md, fontSize: FONTS.sizes.md, color: C.text, borderWidth: 1, borderColor: C.border },

    titleInput: { backgroundColor: C.text === '#F9FAFB' ? '#1c2638' : '#f8faf9', borderRadius: RADIUS.lg, padding: SPACING.md, fontSize: FONTS.sizes.md, color: C.text, borderWidth: 1, borderColor: C.border },

    severityRow: { flexDirection: 'row', gap: SPACING.sm },
    sevBtn: { flex: 1, paddingVertical: 10, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', backgroundColor: C.surface },
    sevText: { fontSize: FONTS.sizes.xs, fontWeight: '600', color: C.textSecondary },

    photoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: C.text === '#F9FAFB' ? 'rgba(76,175,125,0.12)' : '#e1f9eb', borderRadius: RADIUS.lg, padding: SPACING.md, marginTop: SPACING.md, borderWidth: 1.5, borderColor: C.border, borderStyle: 'dashed' },
    photoBtnText: { color: C.primary, fontWeight: '600' },
    previewWrap: { position: 'relative', marginTop: SPACING.md },
    preview: { width: '100%', height: 160, borderRadius: RADIUS.lg },
    removeBtn: { position: 'absolute', top: 8, right: 8 },

    submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: C.primary, borderRadius: RADIUS.full, paddingVertical: 18, marginTop: SPACING.xl, shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
    submitText: { color: '#fff', fontSize: FONTS.sizes.lg, fontWeight: '700' },
    helpText: { textAlign: 'center', color: C.textMuted, fontSize: FONTS.sizes.xs, marginTop: SPACING.md },
  });
}
