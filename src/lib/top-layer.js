let supportsDisplayTransition;

/**
 * Probes whether the current browser actually transitions `display: none`
 * rather than merely parsing `transition-behavior: allow-discrete`.
 */
export function canTransitionDisplay() {
  if (typeof window === "undefined" || !document.body) return false;
  if (supportsDisplayTransition !== undefined) return supportsDisplayTransition;
  if (!window.CSS?.supports?.("transition-behavior", "allow-discrete")) {
    supportsDisplayTransition = false;
    return false;
  }
  const probe = document.createElement("div");
  probe.style.cssText =
    "transition: display 1s allow-discrete !important; display: block;";
  document.body.appendChild(probe);
  getComputedStyle(probe).display;
  probe.style.display = "none";
  supportsDisplayTransition = getComputedStyle(probe).display === "block";
  probe.remove();
  return supportsDisplayTransition;
}

export function supportsTopLayerExit() {
  if (typeof window === "undefined") return false;
  return Boolean(window.CSS?.supports?.("overlay", "auto") && canTransitionDisplay());
}

/**
 * Closes a `<dialog>` element while preserving its exit transition across
 * browsers that lack native `overlay` / discrete `display` exit support.
 */
export async function closeTopLayer(element) {
  if (!element || !element.open) return;

  if (!supportsTopLayerExit()) {
    element.setAttribute("data-closing", "");
    const animations = element.getAnimations({ subtree: true });
    if (animations.length > 0) {
      await Promise.race([
        Promise.allSettled(animations.map((a) => a.finished)),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
    }
    if (!element.hasAttribute("data-closing")) return;
    element.removeAttribute("data-closing");
  }

  if (element.open) {
    element.close();
  }
}

/**
 * Fallback light-dismiss check for browsers without native `closedBy` support.
 */
export function isBackdropClick(dialog, event) {
  if (event.target !== dialog) return false;
  const rect = dialog.getBoundingClientRect();
  const insideContent =
    rect.top <= event.clientY &&
    event.clientY <= rect.top + rect.height &&
    rect.left <= event.clientX &&
    event.clientX <= rect.left + rect.width;
  return !insideContent;
}

/**
 * Wires cancel (Esc), close, and light-dismiss click fallback on a `<dialog>`
 * so closing always runs `closeTopLayer()` and syncs component state.
 */
export function bindTopLayerDialog(dialog, onClose) {
  function handleCancel(event) {
    event.preventDefault();
    void closeTopLayer(dialog).then(() => onClose());
  }

  function handleClose() {
    onClose();
  }

  function handleClick(event) {
    if (!("closedBy" in HTMLDialogElement.prototype) && isBackdropClick(dialog, event)) {
      void closeTopLayer(dialog).then(() => onClose());
    }
  }

  dialog.addEventListener("cancel", handleCancel);
  dialog.addEventListener("close", handleClose);
  dialog.addEventListener("click", handleClick);

  return () => {
    dialog.removeEventListener("cancel", handleCancel);
    dialog.removeEventListener("close", handleClose);
    dialog.removeEventListener("click", handleClick);
  };
}
