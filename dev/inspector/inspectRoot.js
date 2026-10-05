/** Shared host ref for hit-testing (set from app root, read by UiInspector). */

let inspectRootRef = null;

export function setInspectRootRef(ref) {
  inspectRootRef = ref;
}

export function getInspectRootRef() {
  return inspectRootRef;
}
