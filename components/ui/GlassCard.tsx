/**
 * Platform entry for GlassCard.
 * Metro resolves GlassCard.ios.tsx / GlassCard.android.tsx at runtime;
 * this fallback keeps web / type resolution pointing at the iOS glass look.
 */
export { default } from './GlassCard.ios';
