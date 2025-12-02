import { ColorParams, RGB } from '../types';

// Easing function: easeOutCubic
// t: current time, b: start value, c: change in value, d: duration
const easeOutCubic = (t: number): number => {
  return 1 - Math.pow(1 - t, 3);
};

// Helper to interpolate a single number
const lerp = (start: number, end: number, progress: number): number => {
  return start + (end - start) * progress;
};

// Helper to interpolate RGB objects
const lerpRGB = (start: RGB, end: RGB, progress: number): RGB => {
  return {
    r: lerp(start.r, end.r, progress),
    g: lerp(start.g, end.g, progress),
    b: lerp(start.b, end.b, progress),
  };
};

export const animateParams = (
  startParams: ColorParams,
  endParams: ColorParams,
  duration: number,
  onUpdate: (params: ColorParams) => void
): (() => void) => {
  let startTime: number | null = null;
  let animationFrameId: number;
  let cancelled = false;

  const animate = (timestamp: number) => {
    if (cancelled) return;
    if (!startTime) startTime = timestamp;

    const elapsed = timestamp - startTime;
    const rawProgress = Math.min(elapsed / duration, 1);
    const easedProgress = easeOutCubic(rawProgress);

    // ColorParams structure matching types.ts
    const currentParams: ColorParams = {
      lift: lerpRGB(startParams.lift, endParams.lift, easedProgress),
      gamma: lerpRGB(startParams.gamma, endParams.gamma, easedProgress),
      gain: lerpRGB(startParams.gain, endParams.gain, easedProgress),
      saturation: lerp(startParams.saturation, endParams.saturation, easedProgress),
      contrast: lerp(startParams.contrast, endParams.contrast, easedProgress),
      contrastPivot: lerp(startParams.contrastPivot, endParams.contrastPivot, easedProgress),
      temperature: lerp(startParams.temperature, endParams.temperature, easedProgress),
      tint: lerp(startParams.tint, endParams.tint, easedProgress),
      skinProtect: lerp(startParams.skinProtect, endParams.skinProtect, easedProgress),
      // Preserve balance if it exists in startParams, otherwise use endParams or null
      balance: startParams.balance && endParams.balance 
        ? lerpRGB(startParams.balance, endParams.balance, easedProgress) 
        : (endParams.balance || startParams.balance)
    };

    onUpdate(currentParams);

    if (rawProgress < 1) {
      animationFrameId = requestAnimationFrame(animate);
    }
  };

  animationFrameId = requestAnimationFrame(animate);

  // Return cancellation function
  return () => {
    cancelled = true;
    cancelAnimationFrame(animationFrameId);
  };
};
