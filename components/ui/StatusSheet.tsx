import { Ionicons } from "@expo/vector-icons";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import React, { useCallback, useEffect, useRef } from "react";
import { Alert, BackHandler, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { radius, spacing } from "../../constants/theme";
import { platformDesign } from "../../constants/platformDesign";
import { useTheme } from "../../context/ThemeContext";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";
import { sheetBodyPadding, sheetBottomInset } from "../../utils/layoutInsets";
import { colorId, cx, isWeb, ui, uiWeb, webClassStyle } from "../../utils/ui";

function batteryLevelClass(battery: number) {
  if (battery > 50) return "is-ok";
  if (battery > 20) return "is-low";
  return "is-crit";
}
import { CaneItem } from "../../firebase/appData";
import { displayPlace } from "../../utils/geoPlace";
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
  caneAddress?: string;
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
  "Voice command": "mic-outline",
  "Obstacles Ahead": "alert-circle-outline",
};

export default function StatusSheet({
  visible,
  onClose,
  canes,
  selectedCane,
  caneAddress,
  onSelectCane,
  onRemoveCane,
  onAddCane,
}: Props) {
  const { theme } = useTheme();
  const { colors } = theme;
  const isOnline = useOnlineStatus();
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheet>(null);
  const scrollBottom = sheetBodyPadding();
  const bottomInset = sheetBottomInset(insets);
  const maxSheetHeight = Math.max(240, windowHeight - insets.top - bottomInset);

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
        opacity={0}
        pressBehavior="close"
        style={[props.style, { bottom: bottomInset }]}
      />
    ),
    [bottomInset],
  );

  return (
      <BottomSheet
      ref={sheetRef}
      index={-1}
      enableDynamicSizing
      maxDynamicContentSize={maxSheetHeight}
      topInset={insets.top}
      bottomInset={bottomInset}
      enablePanDownToClose
      enableContentPanningGesture
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      onChange={handleSheetChange}
      backdropComponent={renderBackdrop}
      containerStyle={{
        pointerEvents: visible ? "box-none" : "none",
        bottom: bottomInset,
      }}
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
      {...ui("status-sheet", styles.sheet)}
    >

      <View {...ui("status-header", styles.header)}>
        <View {...ui("status-header-text", styles.headerText)}>
          <View {...ui("status-title-row", styles.titleRow)}>
            <View
              {...ui("status-title-icon", [
                styles.titleIcon,
                { backgroundColor: colors.primary + "18" },
              ])}
            >
              <Ionicons
                name="pulse"
                size={18}
                color={isWeb ? undefined : colors.primary}
                style={isWeb ? webClassStyle("status-title-glyph") : undefined}
              />
            </View>
            <Text
              {...ui("status-title", [
                styles.title,
                {
                  color: colors.text,
                  fontWeight: platformDesign.typography.screenTitleWeight,
                },
              ])}
            >
              Cane Status
            </Text>
          </View>
        </View>
        <View {...ui("status-header-actions", styles.headerActions)}>
          <GlowPressable
            onPress={() => setShowAddForm(!showAddForm)}
            glowColor={colors.success}
            active={showAddForm}
            className="status-icon-btn is-add"
            style={[
              styles.iconBtn,
              {
                backgroundColor: colors.success + "18",
                borderRadius: 12,
              },
            ]}
          >
            <Ionicons
              name={showAddForm ? "remove" : "add"}
              size={22}
              color={isWeb ? undefined : colors.success}
              style={isWeb ? webClassStyle("status-add-glyph") : undefined}
            />
          </GlowPressable>
          <GlowPressable
            onPress={onClose}
            glowColor={colors.textMuted}
            className="status-icon-btn is-close"
            style={[
              styles.iconBtn,
              {
                backgroundColor: colors.cardAlt,
                borderRadius: 12,
              },
            ]}
          >
            <Ionicons
              name="close"
              size={20}
              color={isWeb ? undefined : colors.textSecondary}
              style={isWeb ? webClassStyle("status-close-glyph") : undefined}
            />
          </GlowPressable>
        </View>
      </View>

      <BottomSheetScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {showAddForm && (
          <GlassCard className="status-form-card" style={styles.formCard} elevated={false}>
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
                  if (added === false) {
                    setFieldErrors((prev) => ({
                      ...prev,
                      caneID:
                        prev.caneID ||
                        "Wrong Cane ID. Enter the exact ID printed on your cane device.",
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
          className="section-label-row is-first"
          style={styles.firstSection}
          trailing={
            <View
              {...ui("status-count-pill", [
                styles.countPill,
                { backgroundColor: colors.primary + "15" },
              ])}
            >
              <Text {...ui("status-count-text", [styles.countText, { color: colors.primary }])}>
                {canes.length}
              </Text>
            </View>
          }
        >
          Connected Canes
        </SectionLabel>

        {canes.length === 0 && (
          <GlassCard elevated={false} className="status-empty-card" style={styles.emptyCard}>
            <View {...ui("status-empty-icon", [styles.emptyIcon, { backgroundColor: colors.primary + "15" }])}>
              <Ionicons
                name="accessibility"
                size={24}
                color={isWeb ? undefined : colors.primary}
                style={isWeb ? webClassStyle("status-empty-glyph") : undefined}
              />
            </View>
            <Text {...ui("status-empty-title", [styles.emptyTitle, { color: colors.text }])}>No canes yet</Text>
            <Text {...ui("status-empty-text", [styles.emptyText, { color: colors.textMuted }])}>
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
              className={cx("cane-card", colorId(cane.id), selected && "is-selected")}
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
              <View {...ui(cx("cane-row", colorId(cane.id)), styles.caneRow)}>
                <View {...ui(cx("cane-left", colorId(cane.id)), styles.caneLeft)}>
                  <View
                    {...ui(cx("cane-avatar", colorId(cane.id)), [
                      styles.avatarCircle,
                      {
                        backgroundColor: colors.primary + "22",
                        borderColor: colors.primary + "40",
                      },
                    ])}
                  >
                    <Text
                      {...ui(cx("cane-avatar-letter", colorId(cane.id)), [styles.avatarLetter, { color: colors.primary }])}
                    >
                      {cane.username.charAt(0)}
                    </Text>
                    <View
                      {...ui(
                        cx("cane-status-dot", cane.connected ? "is-on" : "is-off"),
                        [
                          styles.statusDot,
                          {
                            backgroundColor: cane.connected
                              ? colors.success
                              : colors.danger,
                            borderColor: colors.surface,
                          },
                        ],
                      )}
                    />
                  </View>
                  <View {...ui("cane-info", styles.caneInfo)}>
                    <View {...ui("cane-name-row", styles.caneNameRow)}>
                      <Text {...ui(cx("cane-name", colorId(cane.id)), [styles.caneName, { color: colors.text }])}>
                        {cane.username}
                      </Text>
                      {selected && (
                        <View
                          {...ui("cane-selected-badge", [
                            styles.selectedBadge,
                            { backgroundColor: colors.primary + "20" },
                          ])}
                        >
                          <Ionicons
                            name="checkmark-circle"
                            size={14}
                            color={isWeb ? undefined : colors.primary}
                            style={isWeb ? webClassStyle(cx("cane-check-glyph", colorId(cane.id))) : undefined}
                          />
                        </View>
                      )}
                    </View>
                    <Text
                      {...ui("cane-meta", [styles.caneMeta, { color: colors.textSecondary }])}
                    >
                      {cane.caneID} · {cane.number}
                    </Text>
                    <Text
                      {...ui("cane-meta", [styles.caneMeta, { color: colors.textSecondary }])}
                    >
                      {cane.connected ? "Cane online" : "Cane offline"}
                      {" · "}
                      {cane.eyeglassConnected ? "Eyeglass online" : "Eyeglass offline"}
                    </Text>
                    <View {...ui("cane-battery-row", styles.batteryRow)}>
                      {cane.connected ? (
                        <>
                          <View
                            {...ui("cane-battery-track", [
                              styles.batteryTrack,
                              { backgroundColor: colors.border },
                            ])}
                          >
                            <View
                              {...uiWeb(
                                cx("cane-battery-fill", batteryLevelClass(cane.battery)),
                                { width: `${cane.battery}%` },
                                [
                                  styles.batteryFill,
                                  {
                                    width: `${cane.battery}%`,
                                    backgroundColor: batteryColor,
                                  },
                                ],
                              )}
                            />
                          </View>
                          <Text
                            {...ui(
                              cx("cane-battery-text", batteryLevelClass(cane.battery)),
                              [styles.batteryText, { color: batteryColor }],
                            )}
                          >
                            {cane.battery}%
                          </Text>
                        </>
                      ) : (
                        <Text
                          {...ui("cane-battery-text is-off", [
                            styles.batteryText,
                            { color: colors.textMuted, minWidth: undefined },
                          ])}
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
                  className="cane-delete"
                  style={[
                    styles.deleteBtn,
                    { backgroundColor: colors.dangerSoft, borderRadius: 12 },
                  ]}
                >
                  <Ionicons
                    name="trash-outline"
                    size={18}
                    color={isWeb ? undefined : colors.danger}
                    style={isWeb ? webClassStyle(cx("cane-delete-glyph", colorId(cane.id))) : undefined}
                  />
                </GlowPressable>
              </View>
            </GlowPressable>
          );
        })}

        {selectedCane && (
          <>
            <SectionLabel>{`Cane · ${selectedCane.caneID || selectedCane.username}`}</SectionLabel>

            {(!selectedCane.connected || !isOnline) && (
              <View
                {...ui("status-offline-banner", [
                  styles.offlineBanner,
                  {
                    backgroundColor: colors.dangerSoft || colors.danger + "18",
                    borderColor: colors.danger + "45",
                  },
                ])}
              >
                <View {...ui("status-offline-icon", [styles.offlineIcon, { backgroundColor: colors.danger + "20" }])}>
                  <Ionicons
                    name="cloud-offline-outline"
                    size={18}
                    color={isWeb ? undefined : colors.danger}
                    style={isWeb ? webClassStyle("status-offline-glyph") : undefined}
                  />
                </View>
                <View {...ui("status-offline-copy", styles.offlineCopy)}>
                  <Text {...ui("status-offline-title", [styles.offlineTitle, { color: colors.danger }])}>
                    {!isOnline ? "No internet" : "Cane offline"}
                  </Text>
                  <Text {...ui("status-offline-text", [styles.offlineBannerText, { color: colors.danger }])}>
                    {!isOnline
                      ? "Map keeps last cane GPS. Phone GPS still tracks you."
                      : selectedCane.eyeglassConnected
                        ? "Cane Wi-Fi is down. Eyeglass can still show online on its own."
                        : "Cane sensors pause until this cane reconnects to Wi-Fi."}
                  </Text>
                </View>
              </View>
            )}

            <GlassCard elevated={false} className="status-group" style={styles.statusGroup}>
              <StatusRow
                id="cane-connected"
                label="Connected"
                value={selectedCane.connected ? "Online" : "Offline"}
                ok={selectedCane.connected}
                colors={colors}
              />
              <View {...ui("status-divider", [styles.statusDivider, { backgroundColor: colors.border }])} />
              <StatusRow
                id="cane-battery"
                label="Battery"
                value={
                  selectedCane.connected
                    ? `${selectedCane.battery}%`
                    : "Offline"
                }
                ok={selectedCane.connected ? undefined : false}
                colors={colors}
              />
              <View {...ui("status-divider", [styles.statusDivider, { backgroundColor: colors.border }])} />
              <StatusRow
                id="cane-ultrasonic"
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
              <View {...ui("status-divider", [styles.statusDivider, { backgroundColor: colors.border }])} />
              <StatusRow
                id="cane-pir"
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
              <View {...ui("status-divider", [styles.statusDivider, { backgroundColor: colors.border }])} />
              <StatusRow
                id="cane-gps"
                label="GPS"
                value={
                  selectedCane.connected && selectedCane.gps
                    ? "Active"
                    : selectedCane.routes[0]
                      ? "Last known"
                      : "Offline"
                }
                ok={
                  selectedCane.connected
                    ? selectedCane.gps
                    : Boolean(selectedCane.routes[0])
                }
                colors={colors}
              />
              <View {...ui("status-divider", [styles.statusDivider, { backgroundColor: colors.border }])} />
              <StatusRow
                id="cane-location"
                label="Location"
                value={displayPlace(
                  selectedCane.routes[0]?.address || caneAddress,
                  selectedCane.connected ? "Locating..." : "Last known",
                )}
                ok={selectedCane.connected ? undefined : Boolean(selectedCane.routes[0])}
                wide
                colors={colors}
              />
            </GlassCard>

            <SectionLabel>{`Eyeglass · ${selectedCane.caneID || selectedCane.username || "—"}`}</SectionLabel>
            <GlassCard elevated={false} className="status-group" style={styles.statusGroup}>
              <StatusRow
                id="glass-connected"
                label="Connected"
                value={selectedCane.eyeglassConnected ? "Online" : "Offline"}
                ok={Boolean(selectedCane.eyeglassConnected)}
                colors={colors}
              />
              <View {...ui("status-divider", [styles.statusDivider, { backgroundColor: colors.border }])} />
              <StatusRow
                id="glass-voice"
                label="Voice command"
                value={
                  selectedCane.eyeglassConnected
                    ? selectedCane.eyeglassVoice || "On"
                    : "Offline"
                }
                ok={
                  selectedCane.eyeglassConnected
                    ? selectedCane.eyeglassVoice !== "Off"
                    : false
                }
                colors={colors}
              />
              <View {...ui("status-divider", [styles.statusDivider, { backgroundColor: colors.border }])} />
              <StatusRow
                id="glass-obstacles"
                label="Obstacles Ahead"
                value={
                  !selectedCane.eyeglassConnected
                    ? "Offline"
                    : selectedCane.eyeglassObstacle
                      ? "Ahead"
                      : "Clear"
                }
                ok={
                  selectedCane.eyeglassConnected
                    ? !selectedCane.eyeglassObstacle
                    : false
                }
                colors={colors}
              />
              <View {...ui("status-divider", [styles.statusDivider, { backgroundColor: colors.border }])} />
              <StatusRow
                id="glass-battery"
                label="Battery"
                value={
                  !selectedCane.eyeglassConnected
                    ? "Offline"
                    : `${Math.max(0, Math.round(selectedCane.eyeglassBattery ?? 0))}%`
                }
                ok={
                  selectedCane.eyeglassConnected
                    ? (selectedCane.eyeglassBattery ?? 0) > 15
                    : false
                }
                colors={colors}
              />
            </GlassCard>

            <SectionLabel>Route History</SectionLabel>

            {selectedCane.routes.length === 0 ? (
              <GlassCard elevated={false} className="status-empty-card" style={styles.emptyCard}>
                <Text {...ui("status-empty-text", [styles.emptyText, { color: colors.textMuted }])}>
                  No route history yet.
                </Text>
              </GlassCard>
            ) : (
              selectedCane.routes.slice(0, 8).map(
                (route: { address?: string; time: string }, index: number, list) => (
                  <View
                    key={index}
                    {...ui("status-history-card", [
                      styles.historyCard,
                      {
                        backgroundColor: colors.cardAlt,
                        borderColor: colors.border,
                      },
                    ])}
                  >
                    <View {...ui("status-timeline", styles.timeline)}>
                      <View
                        {...ui("status-timeline-dot", [
                          styles.timelineDot,
                          {
                            backgroundColor: colors.primary,
                            borderColor: colors.surface,
                          },
                        ])}
                      />
                      {index < list.length - 1 && (
                        <View
                          {...ui("status-timeline-line", [
                            styles.timelineLine,
                            { backgroundColor: colors.border },
                          ])}
                        />
                      )}
                    </View>
                    <View
                      {...ui("status-history-icon", [
                        styles.historyIcon,
                        { backgroundColor: colors.primary + "15" },
                      ])}
                    >
                      <Ionicons
                        name="location"
                        size={15}
                        color={isWeb ? undefined : colors.primary}
                        style={isWeb ? webClassStyle(cx("status-history-glyph", colorId(`route-${index}`))) : undefined}
                      />
                    </View>
                    <View {...ui("status-history-body", styles.historyBody)}>
                      <Text {...ui("status-history-addr", [styles.historyAddr, { color: colors.text }])}>
                        {displayPlace(
                          route.address,
                          selectedCane.connected ? "Locating..." : "Last known",
                        )}
                      </Text>
                      <Text
                        {...ui("status-history-meta", [styles.historyMeta, { color: colors.textMuted }])}
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
  id,
  label,
  value,
  ok,
  wide,
  colors,
}: {
  id: string;
  label: string;
  value: string;
  ok?: boolean;
  wide?: boolean;
  colors: ReturnType<typeof useTheme>["theme"]["colors"];
}) {
  const icon = STATUS_ICONS[label] || "information-circle-outline";
  const valueColor =
    ok !== undefined ? (ok ? colors.success : colors.danger) : colors.text;
  const tone = ok === undefined ? "is-neutral" : ok ? "is-ok" : "is-bad";
  const mark = colorId(id);

  return (
    <View {...ui(cx("status-row", mark), styles.statusRow)}>
      <View {...ui(cx("status-row-left", mark), styles.statusLeft)}>
        <View
          {...ui(cx("status-row-icon", mark, tone), [
            styles.statusIconWrap,
            { backgroundColor: valueColor + "18" },
          ])}
        >
          <Ionicons
            name={icon}
            size={16}
            color={isWeb ? undefined : valueColor}
            style={isWeb ? webClassStyle(cx("status-row-glyph", mark, tone)) : undefined}
          />
        </View>
        <Text {...ui(cx("status-row-label", mark), [styles.statusLabel, { color: colors.textSecondary }])}>
          {label}
        </Text>
      </View>
      <View
        {...ui(cx("status-value-pill", mark, tone, wide && "is-wide"), [
          styles.valuePill,
          { backgroundColor: valueColor + "15" },
          wide && styles.valuePillWide,
        ])}
      >
        <Text
          {...ui(cx("status-value", mark, tone), [styles.statusValue, { color: valueColor }])}
          numberOfLines={wide ? 2 : 1}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { zIndex: 80, elevation: 0 },
  sheetBg: {
    borderTopWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
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
