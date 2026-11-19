import { useEffect, useRef } from "react";
import { Animated, Easing, Platform } from "react-native";
import { useReduceMotion } from "./useReduceMotion";

// The bear breathes by a small vertical stretch. Reduce Motion in the OS settings stops it.
export function useBearBreathing(durationMs: number, maxScaleY: number): Animated.Value {
  const reduceMotion = useReduceMotion(true);
  const scaleY = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    scaleY.setValue(1);
    if (reduceMotion) {
      return;
    }
    const timing = {
      duration: durationMs / 2,
      easing: Easing.inOut(Easing.sin),
      useNativeDriver: Platform.OS !== "web",
      isInteraction: false,
    };
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleY, { ...timing, toValue: maxScaleY }),
        Animated.timing(scaleY, { ...timing, toValue: 1 }),
      ])
    );
    animation.start();
    return () => {
      animation.stop();
      scaleY.setValue(1);
    };
  }, [reduceMotion, durationMs, maxScaleY, scaleY]);

  return scaleY;
}
