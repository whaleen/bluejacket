/**
 * Haptic and Sound Feedback System
 *
 * Provides haptic feedback (vibration) and audio feedback for user interactions.
 * Optimized for PWA on iOS but works cross-platform.
 */

// ============================================================================
// HAPTIC FEEDBACK
// ============================================================================

export type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'pulse';

const HAPTIC_PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,          // Quick tap
  medium: 20,         // Standard feedback
  heavy: 30,          // Strong feedback
  success: [20, 50, 20], // Double pulse
  warning: [30, 100, 30, 100, 30], // Triple pulse
  error: [50, 100, 50], // Strong double pulse
  pulse: 15,          // Repeating pulse (use with interval)
};

/**
 * Trigger haptic feedback
 * Falls back gracefully if Vibration API is not available
 */
export function haptic(pattern: HapticPattern = 'medium'): void {
  if (!('vibrate' in navigator)) {
    console.debug('Vibration API not available');
    return;
  }

  try {
    const vibrationPattern = HAPTIC_PATTERNS[pattern];
    navigator.vibrate(vibrationPattern);
  } catch (error) {
    console.error('Haptic feedback error:', error);
  }
}

/**
 * Start a pulsing haptic pattern (repeating)
 * Returns a cleanup function to stop the pulse
 */
export function startHapticPulse(interval: number = 200): () => void {
  if (!('vibrate' in navigator)) {
    return () => {}; // No-op cleanup
  }

  const pulseInterval = setInterval(() => {
    haptic('pulse');
  }, interval);

  return () => {
    clearInterval(pulseInterval);
    navigator.vibrate(0); // Stop any ongoing vibration
  };
}

/**
 * Stop all haptic feedback
 */
export function stopHaptic(): void {
  if ('vibrate' in navigator) {
    navigator.vibrate(0);
  }
}

// ============================================================================
// SOUND FEEDBACK
// ============================================================================

export type SoundType = 'scan' | 'success' | 'error' | 'warning' | 'click';

// Sound configurations
const SOUND_CONFIG: Record<SoundType, { frequency: number; duration: number; type: OscillatorType }> = {
  scan: { frequency: 800, duration: 50, type: 'sine' },      // Quick beep when scan detected
  success: { frequency: 600, duration: 100, type: 'sine' },  // Pleasant chime
  error: { frequency: 200, duration: 150, type: 'square' },  // Lower buzz
  warning: { frequency: 400, duration: 100, type: 'triangle' }, // Mid-range alert
  click: { frequency: 1000, duration: 30, type: 'sine' },    // Short click
};

/**
 * Play a synthesized sound using Web Audio API
 * More reliable than HTML5 audio for PWAs, especially on iOS
 */
export function playSound(type: SoundType = 'click'): void {
  try {
    // Check if AudioContext is available
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) {
      console.debug('Web Audio API not available');
      return;
    }

    const context = new AudioContext();
    const config = SOUND_CONFIG[type];

    // Create oscillator for the sound
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.frequency.value = config.frequency;
    oscillator.type = config.type;

    // Envelope for smooth sound (avoid clicks)
    gainNode.gain.setValueAtTime(0, context.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, context.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + config.duration / 1000);

    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + config.duration / 1000);

    // Clean up
    oscillator.onended = () => {
      context.close();
    };
  } catch (error) {
    console.error('Sound playback error:', error);
  }
}

/**
 * Play a success chime (two-tone)
 */
export function playSuccessChime(): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    const context = new AudioContext();

    // First note
    const osc1 = context.createOscillator();
    const gain1 = context.createGain();
    osc1.connect(gain1);
    gain1.connect(context.destination);
    osc1.frequency.value = 523.25; // C5
    osc1.type = 'sine';
    gain1.gain.setValueAtTime(0, context.currentTime);
    gain1.gain.linearRampToValueAtTime(0.3, context.currentTime + 0.01);
    gain1.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.15);
    osc1.start(context.currentTime);
    osc1.stop(context.currentTime + 0.15);

    // Second note (higher)
    const osc2 = context.createOscillator();
    const gain2 = context.createGain();
    osc2.connect(gain2);
    gain2.connect(context.destination);
    osc2.frequency.value = 659.25; // E5
    osc2.type = 'sine';
    gain2.gain.setValueAtTime(0, context.currentTime + 0.1);
    gain2.gain.linearRampToValueAtTime(0.3, context.currentTime + 0.11);
    gain2.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.25);
    osc2.start(context.currentTime + 0.1);
    osc2.stop(context.currentTime + 0.25);

    // Clean up
    setTimeout(() => context.close(), 300);
  } catch (error) {
    console.error('Success chime error:', error);
  }
}

// ============================================================================
// COMBINED FEEDBACK HELPERS
// ============================================================================

/**
 * Feedback when scan is detected (barcode injected into field)
 */
export function feedbackScanDetected(): void {
  haptic('light');
  playSound('scan');
}

/**
 * Feedback while waiting for API response (pulsing)
 * Returns cleanup function
 */
export function feedbackProcessing(): () => void {
  const stopPulse = startHapticPulse(300);
  return stopPulse;
}

/**
 * Feedback for successful scan
 */
export function feedbackSuccess(): void {
  haptic('success');
  playSuccessChime();
}

/**
 * Feedback for error/failure
 */
export function feedbackError(): void {
  haptic('error');
  playSound('error');
}

/**
 * Feedback for warnings (item already scanned, etc.)
 */
export function feedbackWarning(): void {
  haptic('warning');
  playSound('warning');
}

/**
 * Button click feedback
 */
export function feedbackClick(): void {
  haptic('light');
  playSound('click');
}
