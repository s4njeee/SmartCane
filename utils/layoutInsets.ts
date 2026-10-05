import type { EdgeInsets } from "react-native-safe-area-context";

/** Tab bar content height without safe-area (paddingTop 6 + item 48). */
export const TAB_BAR_CONTENT_HEIGHT = 54;

/** Total tab bar height including the home-indicator / nav padding. */
export function tabBarHeight(insets: EdgeInsets) {
  return TAB_BAR_CONTENT_HEIGHT + Math.max(insets.bottom, 10);
}

/** Space above the bottom tab bar so FABs / legends clear it. */
export function tabBarClearance(insets: EdgeInsets, extra = 12) {
  return tabBarHeight(insets) + extra;
}

/** Bottom inset so sheets sit flush on the tab bar — no extra gap. */
export function sheetBottomInset(insets: EdgeInsets) {
  return tabBarHeight(insets);
}

/** Top offset for floating map banners under the status bar / cutout. */
export function mapBannerTop(insets: EdgeInsets, gap = 12) {
  return Math.max(insets.top, 24) + gap;
}

/** Bottom padding for Profile/Alerts screens above the tab bar. */
export function sheetScrollBottom(insets: EdgeInsets) {
  return tabBarHeight(insets) + 24;
}

/** Body padding inside sheet scroll (sheet uses bottomInset separately). */
export function sheetBodyPadding() {
  return 8;
}
