import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { CaneItem } from '../firebase/appData';
import { useTheme } from '../context/ThemeContext';
import { radius } from '../constants/theme';
import GlassCard from './ui/GlassCard';
import AppButton from './ui/AppButton';
import AppInput from './ui/AppInput';
import GlowPressable from './ui/GlowPressable';

type Props = {
  visible: boolean;
  onClose: () => void;
  canes: CaneItem[];
  selectedCane: CaneItem | null;
  onSelectCane: (cane: CaneItem) => void;
  onRemoveCane: (id: string) => void;
  onAddCane: (cane: Omit<CaneItem, 'id' | 'routes'>) => void;
};

const STATUS_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Connected: 'link-outline',
  Battery: 'battery-charging-outline',
  Obstacle: 'warning-outline',
  GPS: 'navigate-outline',
  Location: 'location-outline',
};

export default function StatusSheet({
  visible,
  onClose,
  canes,
  selectedCane,
  onSelectCane,
  onRemoveCane,
  onAddCane,
}: Props) {
  const { theme } = useTheme();
  const { colors } = theme;
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['48%', '93%'], []);

  const [showAddForm, setShowAddForm] = React.useState(false);
  const [newUsername, setNewUsername] = React.useState('');
  const [newCaneID, setNewCaneID] = React.useState('');
  const [newNumber, setNewNumber] = React.useState('');

  useEffect(() => {
    if (visible) {
      sheetRef.current?.snapToIndex(0);
    } else {
      sheetRef.current?.close();
      setShowAddForm(false);
    }
  }, [visible]);

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) onClose();
    },
    [onClose]
  );

  const confirmDelete = (cane: CaneItem) => {
    Alert.alert(
      'Remove Cane',
      `Are you sure you want to remove ${cane.username}? This will delete the cane from your account.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onRemoveCane(cane.id),
        },
      ]
    );
  };

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} pressBehavior="close" />
    ),
    []
  );

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onChange={handleSheetChange}
      backdropComponent={renderBackdrop}
      backgroundStyle={[
        styles.sheetBg,
        {
          backgroundColor: colors.surface,
          borderColor: colors.primary + '25',
          shadowColor: colors.primary,
        },
      ]}
      handleIndicatorStyle={{ backgroundColor: colors.primary + '80', width: 56, height: 5 }}
      style={styles.sheet}
    >
      <View style={[styles.sheetTopGlow, { backgroundColor: colors.primary + '30' }]} />

      <View style={styles.header}>
        <View style={styles.headerText}>
          <View style={styles.titleRow}>
            <View style={[styles.titleIcon, { backgroundColor: colors.primary + '18' }]}>
              <Ionicons name="pulse" size={18} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Cane Status</Text>
          </View>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Swipe up to expand · scroll anywhere inside
          </Text>
        </View>
        <View style={styles.headerActions}>
          <GlowPressable
            onPress={() => setShowAddForm(!showAddForm)}
            glowColor={colors.success}
            active={showAddForm}
            style={[styles.iconBtn, { backgroundColor: colors.success + '18', borderRadius: 22 }]}
          >
            <Ionicons name={showAddForm ? 'remove' : 'add'} size={22} color={colors.success} />
          </GlowPressable>
          <GlowPressable
            onPress={onClose}
            glowColor={colors.textMuted}
            style={[styles.iconBtn, { backgroundColor: colors.cardAlt, borderRadius: 22 }]}
          >
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </GlowPressable>
        </View>
      </View>

      <BottomSheetScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {showAddForm && (
          <GlassCard style={styles.formCard} elevated={false}>
            <AppInput label="Username" value={newUsername} onChangeText={setNewUsername} />
            <AppInput label="Cane ID" value={newCaneID} onChangeText={setNewCaneID} />
            <AppInput label="Phone number" value={newNumber} onChangeText={setNewNumber} keyboardType="numeric" />
            <AppButton
              title="Add Cane"
              onPress={() => {
                if (!newUsername || !newCaneID || !newNumber) return;
                onAddCane({
                  username: newUsername,
                  connected: true,
                  battery: 100,
                  obstacle: false,
                  gps: true,
                  caneID: newCaneID,
                  number: newNumber,
                });
                setNewUsername('');
                setNewCaneID('');
                setNewNumber('');
                setShowAddForm(false);
              }}
            />
          </GlassCard>
        )}

        <View style={styles.sectionHeader}>
          <View style={[styles.sectionAccent, { backgroundColor: colors.primary }]} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Connected Canes</Text>
          <View style={[styles.countPill, { backgroundColor: colors.primary + '15' }]}>
            <Text style={[styles.countText, { color: colors.primary }]}>{canes.length}</Text>
          </View>
        </View>

        {canes.length === 0 && (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            No canes yet. Tap + to add one.
          </Text>
        )}

        {canes.map((cane) => {
          const selected = selectedCane?.id === cane.id;
          const batteryColor =
            cane.battery > 50 ? colors.success : cane.battery > 20 ? colors.warning : colors.danger;

          return (
            <GlowPressable
              key={cane.id}
              onPress={() => onSelectCane(cane)}
              glowColor={selected ? colors.primary : colors.accent}
              active={selected}
              style={[
                styles.caneCard,
                {
                  backgroundColor: selected ? colors.primary + '14' : colors.cardAlt,
                  borderRadius: radius.lg,
                },
              ]}
            >
              <View style={styles.caneRow}>
                <View style={styles.caneLeft}>
                  <View style={[styles.avatarCircle, { backgroundColor: colors.primary + '22', borderColor: colors.primary + '40' }]}>
                    <Text style={[styles.avatarLetter, { color: colors.primary }]}>
                      {cane.username.charAt(0)}
                    </Text>
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: cane.connected ? colors.success : colors.danger, borderColor: colors.surface },
                      ]}
                    />
                  </View>
                  <View style={styles.caneInfo}>
                    <View style={styles.caneNameRow}>
                      <Text style={[styles.caneName, { color: colors.text }]}>{cane.username}</Text>
                      {selected && (
                        <View style={[styles.selectedBadge, { backgroundColor: colors.primary + '20' }]}>
                          <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                        </View>
                      )}
                    </View>
                    <Text style={[styles.caneMeta, { color: colors.textSecondary }]}>
                      {cane.caneID} · {cane.number}
                    </Text>
                    <View style={styles.batteryRow}>
                      <View style={[styles.batteryTrack, { backgroundColor: colors.border }]}>
                        <View
                          style={[
                            styles.batteryFill,
                            { width: `${cane.battery}%`, backgroundColor: batteryColor },
                          ]}
                        />
                      </View>
                      <Text style={[styles.batteryText, { color: batteryColor }]}>{cane.battery}%</Text>
                    </View>
                  </View>
                </View>
                <GlowPressable
                  onPress={() => confirmDelete(cane)}
                  glowColor={colors.danger}
                  style={[styles.deleteBtn, { backgroundColor: colors.dangerSoft, borderRadius: 14 }]}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </GlowPressable>
              </View>
            </GlowPressable>
          );
        })}

        {selectedCane && (
          <>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionAccent, { backgroundColor: colors.accent }]} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {selectedCane.username} Details
              </Text>
            </View>

            <StatusRow label="Connected" value={selectedCane.connected ? 'Online' : 'Offline'} ok={selectedCane.connected} colors={colors} />
            <StatusRow label="Battery" value={`${selectedCane.battery}%`} colors={colors} />
            <StatusRow label="Obstacle" value={selectedCane.obstacle ? 'Detected' : 'Clear'} ok={!selectedCane.obstacle} colors={colors} />
            <StatusRow label="GPS" value={selectedCane.gps ? 'Active' : 'Offline'} ok={selectedCane.gps} colors={colors} />
            <StatusRow label="Location" value={selectedCane.routes[0]?.address || 'Locating...'} wide colors={colors} />

            <View style={styles.sectionHeader}>
              <View style={[styles.sectionAccent, { backgroundColor: colors.primary }]} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Route History</Text>
            </View>

            {selectedCane.routes.map((route, index) => (
              <View
                key={index}
                style={[styles.historyCard, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
              >
                <View style={styles.timeline}>
                  <View style={[styles.timelineDot, { backgroundColor: colors.primary, borderColor: colors.surface }]} />
                  {index < selectedCane.routes.length - 1 && (
                    <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
                  )}
                </View>
                <View style={[styles.historyIcon, { backgroundColor: colors.primary + '15' }]}>
                  <Ionicons name="location" size={15} color={colors.primary} />
                </View>
                <View style={styles.historyBody}>
                  <Text style={[styles.historyAddr, { color: colors.text }]}>{route.address || 'Unknown'}</Text>
                  <Text style={[styles.historyMeta, { color: colors.textMuted }]}>{route.time}</Text>
                </View>
              </View>
            ))}
          </>
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

function StatusRow({
  label,
  value,
  ok,
  wide,
  colors,
}: {
  label: string;
  value: string;
  ok?: boolean;
  wide?: boolean;
  colors: ReturnType<typeof useTheme>['theme']['colors'];
}) {
  const icon = STATUS_ICONS[label] || 'information-circle-outline';
  const valueColor = ok !== undefined ? (ok ? colors.success : colors.danger) : colors.text;

  return (
    <View style={[styles.statusRow, { backgroundColor: colors.glass, borderColor: colors.border }]}>
      <View style={styles.statusLeft}>
        <View style={[styles.statusIconWrap, { backgroundColor: valueColor + '18' }]}>
          <Ionicons name={icon} size={16} color={valueColor} />
        </View>
        <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>{label}</Text>
      </View>
      <View style={[styles.valuePill, { backgroundColor: valueColor + '15' }, wide && styles.valuePillWide]}>
        <Text
          style={[styles.statusValue, { color: valueColor }]}
          numberOfLines={wide ? 2 : 1}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { zIndex: 20 },
  sheetBg: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 16,
  },
  sheetTopGlow: {
    position: 'absolute',
    top: 0,
    left: 40,
    right: 40,
    height: 1,
    borderRadius: 1,
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingBottom: 12,
    paddingTop: 4,
  },
  headerText: { flex: 1, marginRight: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  titleIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  subtitle: { fontSize: 12, marginTop: 6, lineHeight: 17 },
  headerActions: { flexDirection: 'row', gap: 10 },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 130 },
  formCard: { marginBottom: 16, padding: 16 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
    gap: 10,
  },
  sectionAccent: { width: 4, height: 18, borderRadius: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '800', flex: 1 },
  countPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  countText: { fontSize: 12, fontWeight: '800' },
  emptyText: { fontSize: 14, marginBottom: 12 },
  caneCard: { marginBottom: 12, padding: 14 },
  caneRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  caneLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1.5,
  },
  avatarLetter: { fontSize: 18, fontWeight: '800' },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  caneInfo: { flex: 1 },
  caneNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  caneName: { fontSize: 16, fontWeight: '800' },
  selectedBadge: { padding: 2, borderRadius: 8 },
  caneMeta: { fontSize: 12, marginTop: 2 },
  batteryRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  batteryTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  batteryFill: { height: '100%', borderRadius: 3 },
  batteryText: { fontSize: 11, fontWeight: '800', minWidth: 32 },
  deleteBtn: { padding: 10, marginLeft: 8 },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: 8,
  },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  statusIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusLabel: { fontSize: 14, fontWeight: '600' },
  valuePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    maxWidth: '45%',
  },
  valuePillWide: { maxWidth: '55%' },
  statusValue: { fontSize: 13, fontWeight: '800', textAlign: 'right' },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
  timeline: { alignItems: 'center', width: 12, marginTop: 4 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, zIndex: 1 },
  timelineLine: { width: 2, flex: 1, minHeight: 24, marginTop: -2 },
  historyIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyBody: { flex: 1 },
  historyAddr: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  historyMeta: { fontSize: 12, marginTop: 4 },
});

export type { CaneItem };
