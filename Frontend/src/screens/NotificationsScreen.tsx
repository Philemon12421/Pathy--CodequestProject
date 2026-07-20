import React, { useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Animated, Alert, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useColors } from '../config/ThemeContext';
import { FONTS, RADIUS, SPACING, SHADOW } from '../config/theme';
import useStore from '../store/useStore';

// ─── Type icon/color map per notification type ────────────────────────────────
const TYPE_CONFIG: Record<string, { icon: string; color: string; bg: string; label: string }> = {
  incident_created: { icon: 'warning',         color: '#E24B4A', bg: '#fdecea', label: 'Incident'  },
  route_saved:      { icon: 'map',              color: '#006c44', bg: '#e1f9eb', label: 'Route'     },
  music_uploaded:   { icon: 'musical-notes',    color: '#7F77DD', bg: '#f0effe', label: 'Music'     },
  wallet_deposit:   { icon: 'wallet',           color: '#EF9F27', bg: '#fff8e1', label: 'Wallet'    },
  ad_created:       { icon: 'megaphone',        color: '#378ADD', bg: '#e8f4ff', label: 'Ad'        },
  ad_activated:     { icon: 'checkmark-circle', color: '#4caf7d', bg: '#e1f9eb', label: 'Ad'        },
};

const DEFAULT_TYPE = { icon: 'notifications', color: '#006c44', bg: '#e1f9eb', label: 'Alert' };

function timeAgo(ts: string) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Single Notification Row ──────────────────────────────────────────────────
function NotificationRow({ item, onRead, onDelete, C }: {
  item: any;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
  C: any;
}) {
  const cfg = TYPE_CONFIG[item.type] || DEFAULT_TYPE;
  const s = rowStyles(C);
  const fadeAnim = React.useRef(new Animated.Value(1)).current;

  const handleDelete = () => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => {
      onDelete(item.id);
    });
  };

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <TouchableOpacity
        style={[s.row, !item.read && s.rowUnread]}
        activeOpacity={0.75}
        onPress={() => { if (!item.read) onRead(item.id); }}
      >
        {/* Left icon badge */}
        <View style={[s.iconBadge, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon as any} size={20} color={cfg.color} />
        </View>

        {/* Content */}
        <View style={s.content}>
          <View style={s.topRow}>
            <Text style={[s.title, !item.read && s.titleUnread]} numberOfLines={1}>{item.title}</Text>
            <Text style={s.time}>{timeAgo(item.created_at)}</Text>
          </View>
          <Text style={s.message} numberOfLines={2}>{item.message}</Text>
          {!item.read && <View style={s.unreadDot} />}
        </View>

        {/* Delete button */}
        <TouchableOpacity style={s.deleteBtn} onPress={handleDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={15} color={C.textMuted} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const rowStyles = (C: any) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  rowUnread: {
    backgroundColor: C.accentSoft,
  },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  content: {
    flex: 1,
    gap: 4,
    position: 'relative',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  title: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: C.textSecondary,
    letterSpacing: 0.1,
  },
  titleUnread: {
    color: C.text,
    fontWeight: '700',
  },
  message: {
    fontSize: FONTS.sizes.xs,
    color: C.textMuted,
    lineHeight: 17,
  },
  time: {
    fontSize: 10,
    color: C.textMuted,
    flexShrink: 0,
  },
  unreadDot: {
    position: 'absolute',
    top: 2,
    right: -4,
    width: 7,
    height: 7,
    borderRadius: RADIUS.full,
    backgroundColor: '#006c44',
  },
  deleteBtn: {
    width: 24,
    height: 24,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.borderLight,
    marginTop: 4,
    flexShrink: 0,
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function NotificationsScreen() {
  const C = useColors();
  const s = makeStyles(C);
  const insets = useSafeAreaInsets();
  const theme = useStore((st) => st.theme);

  const {
    notifications,
    unreadNotificationsCount,
    fetchNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    deleteAllNotifications,
  } = useStore();

  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }, []);

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to delete all notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive', onPress: deleteAllNotifications },
      ]
    );
  };

  const handleMarkAllRead = () => {
    markAllNotificationsAsRead();
  };

  const renderItem = useCallback(({ item }: { item: any }) => (
    <NotificationRow
      item={item}
      onRead={markNotificationAsRead}
      onDelete={deleteNotification}
      C={C}
    />
  ), [C, markNotificationAsRead, deleteNotification]);

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* ── Frosted Header ─────────────────────────────── */}
      <BlurView
        intensity={90}
        tint={theme === 'dark' ? 'dark' : 'light'}
        style={s.header}
      >
        <View style={s.headerInner}>
          <View style={s.headerLeft}>
            <Text style={s.headerTitle}>Alerts</Text>
            {unreadNotificationsCount > 0 && (
              <View style={s.badge}>
                <Text style={s.badgeText}>{unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}</Text>
              </View>
            )}
          </View>

          {/* Action buttons */}
          {notifications.length > 0 && (
            <View style={s.headerActions}>
              {unreadNotificationsCount > 0 && (
                <TouchableOpacity style={s.actionBtn} onPress={handleMarkAllRead}>
                  <Ionicons name="checkmark-done" size={17} color={C.primary} />
                  <Text style={[s.actionText, { color: C.primary }]}>Read all</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[s.actionBtn, s.clearBtn]} onPress={handleClearAll}>
                <Ionicons name="trash-outline" size={15} color={C.danger} />
                <Text style={[s.actionText, { color: C.danger }]}>Clear</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </BlurView>

      {/* ── Notifications List ─────────────────────────── */}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.primary}
            colors={[C.primary]}
          />
        }
        contentContainerStyle={[
          s.listContent,
          { paddingBottom: insets.bottom + 90 },
          notifications.length === 0 && s.emptyContainer,
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.empty}>
            {/* Pulsing icon */}
            <View style={s.emptyIconWrap}>
              <View style={s.emptyIconRing} />
              <Ionicons name="notifications-off-outline" size={40} color={C.primary} />
            </View>
            <Text style={s.emptyTitle}>All caught up!</Text>
            <Text style={s.emptySubtitle}>
              Your activity notifications will appear{'\n'}here after you take actions in the app.
            </Text>
            {/* Quick tips */}
            <View style={s.tipGrid}>
              {[
                { icon: 'warning',      label: 'Report Incident', color: '#E24B4A' },
                { icon: 'map',          label: 'Save a Route',    color: '#006c44' },
                { icon: 'musical-notes',label: 'Upload Music',    color: '#7F77DD' },
                { icon: 'megaphone',    label: 'Launch an Ad',    color: '#378ADD' },
              ].map((tip) => (
                <View key={tip.label} style={s.tipCard}>
                  <Ionicons name={tip.icon as any} size={18} color={tip.color} />
                  <Text style={s.tipLabel}>{tip.label}</Text>
                </View>
              ))}
            </View>
          </View>
        }
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const makeStyles = (C: any) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.background,
  },

  // Header
  header: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    zIndex: 10,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: C.surfaceGlass,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.5,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: RADIUS.full,
    backgroundColor: '#006c44',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    backgroundColor: C.accentSoft,
  },
  clearBtn: {
    backgroundColor: C.dangerSoft || '#ffdad6',
  },
  actionText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
  },

  // List
  listContent: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
  },

  // Empty state
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: 60,
    gap: SPACING.lg,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  emptyIconRing: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: RADIUS.full,
    borderWidth: 2,
    borderColor: 'rgba(0,108,68,0.15)',
    backgroundColor: 'rgba(0,108,68,0.06)',
  },
  emptyTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.3,
    marginTop: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: FONTS.sizes.sm,
    color: C.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  tipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    justifyContent: 'center',
    marginTop: SPACING.md,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    ...SHADOW.xs,
  },
  tipLabel: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    color: C.textSecondary,
  },
});
