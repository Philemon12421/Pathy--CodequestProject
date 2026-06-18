import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, ActivityIndicator, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../config/ThemeContext';
import { FONTS, RADIUS, SPACING, SHADOW } from '../config/theme';
import { incidentsAPI } from '../services/api';
import useStore from '../store/useStore';

const TYPES = [
  { key: 'accident', label: 'Accident', icon: 'car', color: '#EF4444' },
  { key: 'hazard', label: 'Hazard', icon: 'warning', color: '#F59E0B' },
  { key: 'crime', label: 'Crime', icon: 'shield-outline', color: '#8B5CF6' },
  { key: 'weather', label: 'Weather', icon: 'thunderstorm', color: '#3B82F6' },
  { key: 'other', label: 'Other', icon: 'alert-circle', color: '#6B7280' },
];

const SEVERITIES = [
  { key: 'low', label: 'Low', color: '#10B981' },
  { key: 'medium', label: 'Medium', color: '#F59E0B' },
  { key: 'high', label: 'High', color: '#EF4444' },
  { key: 'critical', label: 'Critical', color: '#DC2626' },
];

export default function ReportScreen({ navigation }: any) {
  const COLORS = useColors();
  const s = makeStyles(COLORS);
  const { userLocation, addIncident } = useStore();
  const [form, setForm] = useState({ type: 'accident', title: '', description: '', severity: 'medium' });
  const [media, setMedia] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled) setMedia(result.assets[0] as any);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled) setMedia(result.assets[0]);
  };

  const submit = async () => {
    if (!form.title.trim()) { Alert.alert('Error', 'Please enter a title.'); return; }
    if (!userLocation) { Alert.alert('Error', 'Location not available. Enable location access.'); return; }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('type', form.type);
      formData.append('title', form.title);
      formData.append('description', form.description);
      formData.append('latitude', userLocation.latitude.toString());
      formData.append('longitude', userLocation.longitude.toString());
      formData.append('severity', form.severity);

      if (media) {
        formData.append('media', {
          uri: media.uri,
          name: 'incident.jpg',
          type: 'image/jpeg',
        } as any);
      }

      const incident = await incidentsAPI.create(formData);
      addIncident(incident);
      Alert.alert('✅ Reported', 'Incident reported successfully!', [
        { text: 'View on Map', onPress: () => navigation.navigate('Map') },
        { text: 'OK' }
      ]);
      setForm({ type: 'accident', title: '', description: '', severity: 'medium' });
      setMedia(null);
    } catch (err: any) {
      Alert.alert('Error', err.error || 'Could not submit report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Report Incident</Text>
        <Text style={s.subtitle}>Help others stay safe</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {/* Type selector */}
        <Text style={s.label}>Incident Type</Text>
        <View style={s.typeRow}>
          {TYPES.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[s.typeBtn, form.type === t.key && { backgroundColor: t.color + '22', borderColor: t.color }]}
              onPress={() => setForm({ ...form, type: t.key })}
            >
              <Ionicons name={t.icon as any} size={20} color={form.type === t.key ? t.color : COLORS.textMuted} />
              <Text style={[s.typeBtnLabel, form.type === t.key && { color: t.color }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Title */}
        <Text style={s.label}>Title *</Text>
        <TextInput
          style={s.input}
          placeholder="Brief description..."
          placeholderTextColor={COLORS.textMuted}
          value={form.title}
          onChangeText={(v) => setForm({ ...form, title: v })}
          maxLength={100}
        />

        {/* Description */}
        <Text style={s.label}>Details</Text>
        <TextInput
          style={[s.input, s.textarea]}
          placeholder="What happened? Add more details..."
          placeholderTextColor={COLORS.textMuted}
          value={form.description}
          onChangeText={(v) => setForm({ ...form, description: v })}
          multiline
          numberOfLines={4}
        />

        {/* Severity */}
        <Text style={s.label}>Severity</Text>
        <View style={s.severityRow}>
          {SEVERITIES.map((sv) => (
            <TouchableOpacity
              key={sv.key}
              style={[s.sevBtn, form.severity === sv.key && { backgroundColor: sv.color, borderColor: sv.color }]}
              onPress={() => setForm({ ...form, severity: sv.key })}
            >
              <Text style={[s.sevLabel, form.severity === sv.key && { color: '#fff' }]}>{sv.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Media */}
        <Text style={s.label}>Attach Photo</Text>
        <View style={s.mediaRow}>
          <TouchableOpacity style={s.mediaBtn} onPress={takePhoto}>
            <Ionicons name="camera" size={22} color={COLORS.primary} />
            <Text style={s.mediaBtnText}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.mediaBtn} onPress={pickImage}>
            <Ionicons name="image" size={22} color={COLORS.primary} />
            <Text style={s.mediaBtnText}>Gallery</Text>
          </TouchableOpacity>
        </View>

        {media && (
          <View style={s.mediaPreviewWrap}>
            <Image source={{ uri: media.uri }} style={s.mediaPreview} />
            <TouchableOpacity style={s.mediaRemove} onPress={() => setMedia(null)}>
              <Ionicons name="close-circle" size={24} color={COLORS.danger} />
            </TouchableOpacity>
          </View>
        )}

        {/* Location indicator */}
        <View style={s.locRow}>
          <Ionicons name="location" size={16} color={userLocation ? COLORS.accent : COLORS.danger} />
          <Text style={[s.locText, { color: userLocation ? COLORS.accent : COLORS.danger }]}>
            {userLocation
              ? `Location: ${userLocation.latitude.toFixed(5)}, ${userLocation.longitude.toFixed(5)}`
              : 'Location unavailable'}
          </Text>
        </View>

        {/* Submit */}
        <TouchableOpacity style={s.submitBtn} onPress={submit} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <>
                <Ionicons name="send" size={18} color="#fff" />
                <Text style={s.submitText}>Submit Report</Text>
              </>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(COLORS: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
      paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg, paddingBottom: SPACING.md,
      borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface,
    },
    title: { fontSize: FONTS.sizes.xxl, fontWeight: FONTS.weights.black, color: COLORS.text },
    subtitle: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 4 },
    scroll: { padding: SPACING.xl, paddingTop: SPACING.md, paddingBottom: 100, gap: 0 },
    label: {
      fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.bold, color: COLORS.textSecondary,
      marginBottom: SPACING.sm, marginTop: SPACING.lg,
      textTransform: 'uppercase', letterSpacing: 0.8,
    },
    typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
    typeBtn: {
      flex: 1, minWidth: '18%', alignItems: 'center', padding: SPACING.sm,
      borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border,
      backgroundColor: COLORS.surface, gap: 5, ...SHADOW.xs,
    },
    typeBtnLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, fontWeight: FONTS.weights.medium },
    input: {
      backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
      borderWidth: 1, borderColor: COLORS.border, color: COLORS.text,
      fontSize: FONTS.sizes.md, padding: SPACING.md, ...SHADOW.xs,
    },
    textarea: { minHeight: 110, textAlignVertical: 'top' },
    severityRow: { flexDirection: 'row', gap: SPACING.sm },
    sevBtn: {
      flex: 1, alignItems: 'center', paddingVertical: 12,
      borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border,
      backgroundColor: COLORS.surface, ...SHADOW.xs,
    },
    sevLabel: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.semibold, color: COLORS.textMuted },
    mediaRow: { flexDirection: 'row', gap: SPACING.md },
    mediaBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: SPACING.sm, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
      padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, ...SHADOW.xs,
    },
    mediaBtnText: { color: COLORS.accent, fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.semibold },
    mediaPreviewWrap: { position: 'relative', marginTop: SPACING.md },
    mediaPreview: { width: '100%', height: 190, borderRadius: RADIUS.lg, resizeMode: 'cover' },
    mediaRemove: { position: 'absolute', top: 10, right: 10 },
    locRow: {
      flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
      marginTop: SPACING.lg, backgroundColor: COLORS.surface,
      padding: SPACING.md, borderRadius: RADIUS.lg,
      borderWidth: 1, borderColor: COLORS.border,
    },
    locText: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.semibold },
    submitBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: SPACING.sm, backgroundColor: COLORS.primary, borderRadius: RADIUS.xl,
      padding: 18, marginTop: SPACING.xl, ...SHADOW.dark,
    },
    submitText: { color: '#fff', fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold },
  });
}
