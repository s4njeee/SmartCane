/**
 * Dev-only UI Inspector entry.
 * Registers the DevSettings menu item when UiInspector mounts.
 */

export { default as UiInspector } from './UiInspector';
export { findElementAtPoint, parseSourceLocation } from './findElementAtPoint';
export { describeElement } from './describeElement';
export { setInspectRootRef, getInspectRootRef } from './inspectRoot';
