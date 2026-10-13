"use client";

import { useLayoutEffect, useState, type RefObject } from "react";

/** Only the two bare RGB triplets need JS: Astr's existing tokens are OKLCH,
 * not channel lists. Let the browser convert its resolved colours to sRGB,
 * rather than hardcoding a second palette which drifts when the theme changes.
 * Values are written on this instance, never on :root or another component. */
export function useCreateMenuTokens(root: RefObject<HTMLDivElement | null>) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const syncColours = () => {
      if (!ctx) return;
      const styles = getComputedStyle(el);
      for (const token of ["--ink", "--fill-on"] as const) {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = styles.getPropertyValue(token).trim();
        ctx.fillRect(0, 0, 1, 1);
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        el.style.setProperty(`${token}-rgb`, `${r}, ${g}, ${b}`);
      }
    };
    syncColours();

    // Observe only ancestors, not our own style writes; dark themes can be
    // scoped to a page/container as well as toggled on the document element.
    const observer = new MutationObserver(syncColours);
    for (let parent = el.parentElement; parent; parent = parent.parentElement) {
      observer.observe(parent, { attributes: true, attributeFilter: ["class", "style"] });
    }
    const scheme = window.matchMedia("(prefers-color-scheme: dark)");
    scheme.addEventListener("change", syncColours);
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion = () => setReducedMotion(motion.matches);
    syncMotion();
    motion.addEventListener("change", syncMotion);
    return () => {
      observer.disconnect();
      scheme.removeEventListener("change", syncColours);
      motion.removeEventListener("change", syncMotion);
    };
  }, [root]);

  return reducedMotion;
}
