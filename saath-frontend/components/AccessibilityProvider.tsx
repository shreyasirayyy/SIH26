"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function AccessibilityProvider() {
  const accessibility = useAppStore((state) => state.accessibility);

  useEffect(() => {
    const root = document.documentElement;
    const zoomValue = clamp(accessibility.pageZoom, 80, 150) / 100;

    root.dataset.saathTextSize = accessibility.textSize;
    root.dataset.saathDarkMode = String(accessibility.darkMode);
    root.dataset.saathHighContrastLight = String(accessibility.highContrastLight);
    root.dataset.saathInvertColors = String(accessibility.invertColors);
    root.dataset.saathGrayscale = String(accessibility.grayscale);
    root.dataset.saathSoftTones = String(accessibility.softTones);
    root.dataset.saathVividTones = String(accessibility.vividTones);
    root.dataset.saathReadableFont = String(accessibility.readableFont);
    root.dataset.saathAtkinsonFont = String(accessibility.atkinsonFont);
    root.dataset.saathBigCursor = String(accessibility.bigCursor);
    root.dataset.saathNoAnimations = String(accessibility.noAnimations || accessibility.stopMotion || accessibility.epilepsySafe);
    root.dataset.saathStopMotion = String(accessibility.stopMotion);
    root.dataset.saathEpilepsySafe = String(accessibility.epilepsySafe);
    root.dataset.saathMuteSounds = String(accessibility.muteSounds);

    root.style.setProperty("--saath-page-zoom", String(zoomValue));
    root.style.setProperty("--saath-line-height", String(accessibility.lineHeight));
    root.style.setProperty("--saath-letter-spacing", `${accessibility.letterSpacing}em`);
    root.style.setProperty("--saath-word-spacing", `${accessibility.wordSpacing}em`);
    root.style.setProperty("--saath-text-align", accessibility.textAlign);

    const baseFont = accessibility.atkinsonFont ? '"Atkinson Hyperlegible", "Segoe UI", sans-serif' : accessibility.readableFont ? '"Segoe UI", "Noto Sans", sans-serif' : '"DM Sans", "Segoe UI", sans-serif';
    root.style.setProperty("--saath-font-stack", baseFont);

    const saturation = accessibility.softTones ? 0.8 : accessibility.vividTones ? 1.7 : 1;

    root.style.setProperty("--saath-saturation", String(saturation));
    root.style.setProperty("--saath-contrast", accessibility.highContrastLight ? "1.12" : "1");

    if (accessibility.bigCursor) {
      root.style.setProperty("cursor", "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"28\" height=\"28\" viewBox=\"0 0 28 28\"><circle cx=\"14\" cy=\"14\" r=\"10\" fill=\"none\" stroke=\"%230f766e\" stroke-width=\"2\"/><circle cx=\"14\" cy=\"14\" r=\"4\" fill=\"%230f766e\" /></svg>') 14 14, auto");
    } else {
      root.style.removeProperty("cursor");
    }

    if (accessibility.muteSounds) {
      const mediaNodes = document.querySelectorAll("audio, video");
      mediaNodes.forEach((node) => {
        const media = node as HTMLMediaElement;
        media.muted = true;
        media.volume = 0;
      });
    }
  }, [accessibility]);

  return null;
}
