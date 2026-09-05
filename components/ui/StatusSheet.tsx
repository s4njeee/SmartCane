import { Ionicons } from "@expo/vector-icons";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { Alert, BackHandler, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { radius, spacing } from "../../constants/theme";
import { platformDesign } from "../../constants/platformDesign";
import { useTheme } from "../../context/ThemeContext";
import { sheetBodyPadding, sheetBottomInset } from "../../utils/layoutInsets";
import { CaneItem } from "../../firebase/appData";
import AppButton from "./AppButton";
import AppInput from "./AppInput";
import GlassCard from "./GlassCard";
import GlowPressable from "./GlowPressable";
import SectionLabel from "./SectionLabel";

type Props = {
  visible: boolean;
  onClose: () => void;
  canes: CaneItem[];
  selectedCane: CaneItem | null;
  onSelectCane: (cane: CaneItem) => void;
  onRemoveCane: (id: string) => void;
  onAddCane: (
    cane: Omit<CaneItem, "id" | "routes">,
  ) => Promise<boolean> | boolean | void;
};

const STATUS_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Connected: "link-outline",
  Battery: "battery-charging-outline",
  "Ultrasonic Sensor": "radio-outline",
  "PIR Motion Sensor": "walk-outline",
  GPS: "navigate-outline",
  Location: "location-outline",
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
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["48%", "90%"], []);
  const scrollBottom = sheetBodyPadding();
  const bottomInset = sheetBottomInset(insets);

  const [showAddForm, setShowAddForm] = React.useState(false);
  const [addingCane, setAddingCane] = React.useState(false);
  const [newUsername, setNewUsername] = React.useState("");
  const [newCaneID, setNewCaneID] = React.useState("");
  const [newNumber, setNewNumber] = React.useState("");
  const [fieldErrors, setFieldErrors] = React.useState<{
    username?: string;
    caneID?: string;
    number?: string;
  }>({});

  useEffect(() => {
    if (visible) {
      sheetRef.current?.snapToIndex(0);
    } else {
      sheetRef.current?.close();
      setShowAddForm(false);
      setFieldErrors({});
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  const clearFieldError = (key: "username" | "caneID" | "number") => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validateAddForm = () => {
    const errors: { username?: string; caneID?: string; number?: string } = {};
    if (!newUsername.trim()) errors.username = "Username is required";
    if (!newCaneID.trim()) errors.caneID = "Cane ID is required";
    if (!newNumber.trim()) errors.number = "Phone number is required";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) onClose();
    },
    [onClose],
  );

  const confirmDelete = (cane: CaneItem) => {
    Alert.alert(
      "Remove Cane",
      `Are you sure you want to remove ${cane.username}? This will delete the cane from your account.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onRemoveCane(cane.id),
        },
      ],
    );
  };

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    [],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      topInset={insets.top}
      bottomInset={bottomInset}
      enablePanDownToClose
      enableContentPanningGesture={platformDesign.sheet.contentPanning}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      onChange={handleSheetChange}
      backdropComponent={renderBackdrop}
      backgroundStyle={[
        styles.sheetBg,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          shadowColor: colors.shadow,
          borderTopLeftRadius: platformDesign.sheet.topRadius,
          borderTopRightRadius: platformDesign.sheet.topRadius,
        },
      ]}
      handleIndicatorStyle={{
        backgroundColor: colors.textMuted,
        width: platformDesign.sheet.handleWidth,
        height: 4,
      }}
      style={styles.sheet}
    >

      <View style={styles.header}>
        <View style={styles.headerText}>
          <View style={styles.titleRow}>
            <View
              style={[
                styles.titleIcon,
                { backgroundColor: colors.primary + "18" },
              ]}
            >
              <Ionicons name="pulse" size={18} color={colors.primary} />
            </View>
            <Text
              style={[
                styles.title,
                {
                  color: colors.text,
                  fontWeight: platformDesign.typography.screenTitleWeight,
                },
              ]}
            >
              Cane Status
            </Text>
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
            style={[
              styles.iconBtn,
              {
                backgroundColor: colors.success + '18',
                borderRadius: 12,
              },
            ]}
          >
            <Ionicons
              name={showAddForm ? "remove" : "add"}
              size={22}
              color={colors.success}
            />
          </GlowPressable>
          <GlowPressable
            onPress={onClose}
            glowColor={colors.textMuted}
            style={[
              styles.iconBtn,
              {
                backgroundColor: colors.cardAlt,
                borderRadius: 12,
              },
            ]}
          >
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </GlowPressable>
        </View>
      </View>

      <BottomSheetScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {showAddForm && (
          <GlassCard style={styles.formCard} elevated={false}>
            <AppInput
              label="Username"
              value={newUsername}
              error={fieldErrors.username}
              onChangeText={(text) => {
                setNewUsername(text);
                clearFieldError("username");
              }}
            />
            <AppInput
              label="Cane ID"
              value={newCaneID}
              error={fieldErrors.caneID}
              onChangeText={(text) => {
                setNewCaneID(text.toUpperCase());
                clearFieldError("caneID");
              }}
              autoCapitalize="characters"
            />
            <AppInput
              label="Phone number"
              value={newNumber}
              error={fieldErrors.number}
              onChangeText={(text) => {
                setNewNumber(text);
                clearFieldError("number");
              }}
              keyboardType="numeric"
            />
            <AppButton
              title="Add Cane"
              loading={addingCane}
              onPress={async () => {
                if (addingCane) return;
                if (!validateAddForm()) return;

                setAddingCane(true);
                try {
                  const added = await onAddCane({
                    username: newUsername.trim(),
                    connected: true,
                    battery: 100,
                    obstacle: false,
                    motion: false,
                    gps: true,
                    caneID: newCaneID.trim().toUpperCase(),
                    number: newNumber.trim(),
                  });
                  // Wrong Cane ID or other backend error: do NOT clear form / auto-add
                  if (added === false) {
                    setFieldErrors((prev) => ({
                      ...prev,
                      caneID:
                        prev.caneID ||
                        "Wrong Cane ID. Use a registered ID (e.g. SC001).",
                    }));
                    return;
                  }
                  setNewUsername("");
                  setNewCaneID("");
                  setNewNumber("");
                  setFieldErrors({});
                  setShowAddForm(false);
                } finally {
                  setAddingCane(false);
                }
              }}
            />
          </GlassCard>
        )}

        <SectionLabel
          style={styles.firstSection}
          trailing={
            <View
              style={[
                styles.countPill,
                { backgroundColor: colors.primary + "15" },
              ]}
            >
              <Text style={[styles.countText, { color: colors.primary }]}>
                {canes.length}
              </Text>
            </View>
          }
        >
          Connected Canes
        </SectionLabel>

        {canes.length === 0 && (
          <GlassCard elevated={false} style={styles.emptyCard}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.primary + "15" }]}>
              <Ionicons name="accessibility" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No canes yet</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Tap + to add a registered SmartCane device.
            </Text>
          </GlassCard>
        )}

        {canes.map((cane) => {
          const selected = selectedCane?.id === cane.id;
          const batteryColor =
            cane.battery > 50
              ? colors.success
              : cane.battery > 20
                ? colors.warning
                : colors.danger;

          return (
            <GlowPressable
              key={cane.id}
              onPress={() => onSelectCane(cane)}
              glowColor={selected ? colors.primary : colors.accent}
              active={selected}
              style={[
                styles.caneCard,
                {
                  backgroundColor: selected
                    ? colors.primary + "14"
                    : colors.cardAlt,
                  borderRadius: radius.md,
                },
              ]}
            >
              <View style={styles.caneRow}>
                <View style={styles.caneLeft}>
                  <View
                    style={[
                      styles.avatarCircle,
                      {
                        backgroundColor: colors.primary + "22",
                        borderColor: colors.primary + "40",
                      },
                    ]}
                  >
                    <Text
                      style={[styles.avatarLetter, { color: colors.primary }]}
                    >
                      {cane.username.charAt(0)}
                    </Text>
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor: cane.connected
                            ? colors.success
                            : colors.danger,
                          borderColor: colors.surface,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.caneInfo}>
                    <View style={styles.caneNameRow}>
                      <Text style={[styles.caneName, { color: colors.text }]}>
                        {cane.username}
                      </Text>
                      {selected && (
                        <View
                          style={[
                            styles.selectedBadge,
                            { backgroundColor: colors.primary + "20" },
                          ]}
                        >
                          <Ionicons
                            name="checkmark-circle"
                            size={14}
                            color={colors.primary}
                          />
                        </View>
                      )}
                    </View>
                    <Text
                      style={[styles.caneMeta, { color: colors.textSecondary }]}
                    >
                      {cane.caneID} · {cane.number}
                      {!cane.connected ? " · Offline" : ""}
                    </Text>
                    <View style={styles.batteryRow}>
                      {cane.connected ? (
                        <>
                          <View
                            style={[
                              styles.batteryTrack,
                              { backgroundColor: colors.border },
                            ]}
                          >
                            <View
                              style={[
                                styles.batteryFill,
                                {
                                  width: `${cane.battery}%`,
                                  backgroundColor: batteryColor,
                                },
                              ]}
                            />
                          </View>
                          <Text
                            style={[styles.batteryText, { color: batteryColor }]}
                          >
                            {cane.battery}%
                          </Text>
                        </>
                      ) : (
                        <Text
                          style={[
                            styles.batteryText,
                            { color: colors.textMuted, minWidth: undefined },
                          ]}
                        >
                          Offline
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
                <GlowPressable
                  onPress={() => confirmDelete(cane)}
                  glowColor={colors.danger}
                  style={[
                    styles.deleteBtn,
                    { backgroundColor: colors.dangerSoft, borderRadius: 12 },
                  ]}
                >
                  <Ionicons
                    name="trash-outline"
                    size={18}
                    color={colors.danger}
                  />
                </GlowPressable>
              </View>
            </GlowPressable>
          );
        })}

        {selectedCane && (
          <>
            <SectionLabel>{`${selectedCane.username} Details`}</SectionLabel>

            {!selectedCane.connected && (
              <View
                style={[
                  styles.offlineBanner,
                  {
                    backgroundColor: colors.dangerSoft || colors.danger + "18",
                    borderColor: colors.danger + "45",
                  },
                ]}
              >
                <View style={[styles.offlineIcon, { backgroundColor: colors.danger + "20" }]}>
                  <Ionicons name="cloud-offline-outline" size={18} color={colors.danger} />
                </View>
                <View style={styles.offlineCopy}>
                  <Text style={[styles.offlineTitle, { color: colors.danger }]}>
                    Device offline
                  </Text>
                  <Text style={[styles.offlineBannerText, { color: colors.danger }]}>
                    All sensors are offline until the cane reconnects.
                  </Text>
                </View>
              </View>
            )}

            <GlassCard elevated={false} style={styles.statusGroup}>
              <StatusRow
                label="Connected"
                value={selectedCane.connected ? "Online" : "Offline"}
                ok={selectedCane.connected}
                colors={colors}
              />
              <View style={[styles.statusDivider, { backgroundColor: colors.border }]} />
              <StatusRow
                label="Battery"
                value={
                  selectedCane.connected ? `${selectedCane.battery}%` : "Offline"
                }
                ok={selectedCane.connected ? undefined : false}
                colors={colors}
              />
              <View style={[styles.statusDivider, { backgroundColor: colors.border }]} />
              <StatusRow
                label="Ultrasonic Sensor"
                value={
                  !selectedCane.connected
                    ? "Offline"
                    : selectedCane.obstacle
                      ? "Detected"
                      : "Active"
                }
                ok={
                  selectedCane.connected ? !selectedCane.obstacle : false
                }
                colors={colors}
              />
              <View style={[styles.statusDivider, { backgroundColor: colors.border }]} />
              <StatusRow
                label="PIR Motion Sensor"
                value={
                  !selectedCane.connected
                    ? "Offline"
                    : selectedCane.motion
                      ? "Detected"
                      : "Active"
                }
                ok={selectedCane.connected ? !selectedCane.motion : false}
                colors={colors}
              />
              <View style={[styles.statusDivider, { backgroundColor: colors.border }]} />
              <StatusRow
                label="GPS"
                value={
                  !selectedCane.connected
                    ? "Offline"
                    : selectedCane.gps
                      ? "Active"
                      : "Offline"
                }
                ok={selectedCane.connected && selectedCane.gps}
                colors={colors}
              />
              <View style={[styles.statusDivider, { backgroundColor: colors.border }]} />
              <StatusRow
                label="Location"
                value={
                  !selectedCane.connected
                    ? "Offline"
                    : selectedCane.routes[0]?.address || "Locating..."
                }
                ok={selectedCane.connected ? undefined : false}
                wide
                colors={colors}
              />
            </GlassCard>

            <SectionLabel>Route History</SectionLabel>

            {selectedCane.routes.length === 0 ? (
              <GlassCard elevated={false} style={styles.emptyCard}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  No route history yet.
                </Text>
              </GlassCard>
            ) : (
              selectedCane.routes.map(
                (route: { address?: string; time: string }, index: number) => (
                  <View
                    key={index}
                    style={[
                      styles.historyCard,
                      {
                        backgroundColor: colors.cardAlt,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View style={styles.timeline}>
                      <View
                        style={[
                          styles.timelineDot,
                          {
                            backgroundColor: colors.primary,
                            borderColor: colors.surface,
                          },
                        ]}
                      />
                      {index < selectedCane.routes.length - 1 && (
                        <View
                          style={[
                            styles.timelineLine,
                            { backgroundColor: colors.border },
                          ]}
                        />
                      )}
                    </View>
                    <View
                      style={[
                        styles.historyIcon,
                        { backgroundColor: colors.primary + "15" },
                      ]}
                    >
                      <Ionicons
                        name="location"
                        size={15}
                        color={colors.primary}
                      />
                    </View>
                    <View style={styles.historyBody}>
                      <Text style={[styles.historyAddr, { color: colors.text }]}>
                        {route.address || "Unknown"}
                      </Text>
                      <Text
                        style={[styles.historyMeta, { color: colors.textMuted }]}
                      >
                        {route.time}
                      </Text>
                    </View>
                  </View>
                ),
              )
            )}
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
  colors: ReturnType<typeof useTheme>["theme"]["colors"];
}) {
  const icon = STATUS_ICONS[label] || "information-circle-outline";
  const valueColor =
    ok !== undefined ? (ok ? colors.success : colors.danger) : colors.text;

  return (
    <View style={styles.statusRow}>
      <View style={styles.statusLeft}>
        <View
          style={[
            styles.statusIconWrap,
            { backgroundColor: valueColor + "18" },
          ]}
        >
          <Ionicons name={icon} size={16} color={valueColor} />
        </View>
        <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
          {label}
        </Text>
      </View>
      <View
        style={[
          styles.valuePill,
          { backgroundColor: valueColor + "15" },
          wide && styles.valuePillWide,
        ]}
      >
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
  sheet: { zIndex: 120, elevation: 24 },
  sheetBg: {
    borderTopWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 24,
    paddingBottom: 12,
    paddingTop: 4,
  },
  headerText: { flex: 1, marginRight: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  titleIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 18, letterSpacing: -0.2 },
  subtitle: { fontSize: 12, marginTop: 4, lineHeight: 16 },
  headerActions: { flexDirection: "row", gap: 10 },
  iconBtn: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
  },
  scrollContent: { paddingHorizontal: 24 },
  formCard: { marginBottom: 16, padding: 16 },
  firstSection: { marginTop: spacing.sm },
  countPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  countText: { fontSize: 12, fontWeight: "800" },
  emptyCard: {
    alignItems: "center",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 16, fontWeight: "800", marginBottom: 6 },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  offlineBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  offlineIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  offlineCopy: { flex: 1 },
  offlineTitle: { fontSize: 14, fontWeight: "800", marginBottom: 2 },
  offlineBannerText: { fontSize: 13, fontWeight: "600", lineHeight: 18 },
  statusGroup: {
    paddingVertical: 4,
    paddingHorizontal: 4,
    marginBottom: spacing.sm,
  },
  statusDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 12 },
  caneCard: { marginBottom: 12, padding: 14 },
  caneRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  caneLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 1.5,
  },
  avatarLetter: { fontSize: 18, fontWeight: "800" },
  statusDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  caneInfo: { flex: 1 },
  caneNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  caneName: { fontSize: 16, fontWeight: "800" },
  selectedBadge: { padding: 2, borderRadius: 8 },
  caneMeta: { fontSize: 12, marginTop: 2 },
  batteryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 8,
  },
  batteryTrack: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  batteryFill: { height: "100%", borderRadius: 3 },
  batteryText: { fontSize: 11, fontWeight: "800", minWidth: 32 },
  deleteBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  statusLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  statusIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statusLabel: { fontSize: 14, fontWeight: "600", flexShrink: 1 },
  valuePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    maxWidth: "45%",
  },
  valuePillWide: { maxWidth: "55%" },
  statusValue: { fontSize: 13, fontWeight: "800", textAlign: "right" },
  historyCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
  timeline: { alignItems: "center", width: 12, marginTop: 4 },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    zIndex: 1,
  },
  timelineLine: { width: 2, flex: 1, minHeight: 24, marginTop: -2 },
  historyIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  historyBody: { flex: 1 },
  historyAddr: { fontSize: 14, fontWeight: "700", lineHeight: 20 },
  historyMeta: { fontSize: 12, marginTop: 4, fontWeight: "600" },
});

export type { CaneItem };
