import { Platform } from 'react-native';

export const isWeb = Platform.OS === 'web';

/** Join class names, skipping falsey parts. */
export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

/** Unique class so one element's color is not shared with its siblings. */
export function colorId(id: string | number) {
  const slug = String(id)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return slug ? `is-${slug}` : '';
}

/**
 * react-native-web 0.21 strips the `className` prop on View/Text/Pressable.
 * A `$$css` style object is how RN-web attaches real DOM classes so
 * styles/index.css can apply and DevTools / the inspector can open that file.
 */
export function webClassStyle(className?: string | false | null) {
  if (!className) return undefined;
  const style: Record<string, string | boolean> = { $$css: true };
  for (const name of className.split(/\s+/)) {
    if (name) style[name] = name;
  }
  return style;
}

type UiResult<S> = { className?: string; style?: S };

/**
 * Web: CSS classes only (colors/layout live in styles/index.css).
 * Native: existing StyleSheet / theme colors.
 * `webOverride` is web-only layout that CSS cannot know (safe-area, measured width).
 */
export function ui<S = any>(
  className: string,
  nativeStyle?: S,
  webOverride?: S,
): UiResult<S> {
  if (Platform.OS === 'web') {
    return webOverride != null
      ? ({ className, style: [webClassStyle(className), webOverride] as S })
      : ({ className, style: webClassStyle(className) as S });
  }
  return { style: nativeStyle };
}

/** Like ui(), but always allow a small web inline bag (safe-area, measured width). */
export function uiWeb<S = any>(
  className: string,
  webInline?: S,
  nativeStyle?: S,
): UiResult<S> {
  if (Platform.OS === 'web') {
    return webInline != null
      ? ({ className, style: [webClassStyle(className), webInline] as S })
      : ({ className, style: webClassStyle(className) as S });
  }
  return { style: nativeStyle };
}
