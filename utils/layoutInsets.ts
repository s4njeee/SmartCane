import type { EdgeInsets } from "react-native-safe-area-context";

/** Tab bar content height without safe-area (padding + icons + labels). */
export const TAB_BAR_CONTENT_HEIGHT = 60;

/** Space above the bottom tab bar so FABs / legends clear it. */
export function tabBarClearance(insets: EdgeInsets, extra = 12) {
  return TAB_BAR_CONTENT_HEIGHT + Math.max(insets.bottom, 12) + extra;
}

/** Bottom inset for bottom sheets so chrome clears the tab bar on Android. */
export function sheetBottomInset(insets: EdgeInsets) {
  return TAB_BAR_CONTENT_HEIGHT + Math.max(insets.bottom, 12);
}

/** Top offset for floating map banners under the status bar / cutout. */
export function mapBannerTop(insets: EdgeInsets, gap = 12) {
  return Math.max(insets.top, 24) + gap;
}

/** Bottom padding for Profile/Alerts screens above the tab bar. */
export function sheetScrollBottom(insets: EdgeInsets) {
  return TAB_BAR_CONTENT_HEIGHT + Math.max(insets.bottom, 12) + 24;
}

/** Body padding inside sheet scroll (sheet uses bottomInset separately). */
export function sheetBodyPadding() {
  return 28;
}
