---
name: framer-motion
description: Framer Motion animation patterns for modern React/Next.js interfaces. Covers spring physics, layout animations, AnimatePresence, orchestrated transitions, gesture feedback, and accessible reduced-motion support. Use when implementing interactive UI motion, drawer animations, modal transitions, and candidate markers.
---

# Framer Motion Best Practices

## 1. Spring Physics Over Duration Easing
- Use physical spring transitions (`type: "spring", stiffness: 300, damping: 30`) for natural, responsive feel.
- Avoid linear or generic ease curves on interactive elements like modals, slide-overs, and popups.

## 2. Shared Layout Transitions
- Use `layoutId` for smooth morphing transitions between cards and expanded evidence panels.
- Wrap dynamic item removals in `<AnimatePresence mode="wait">` to prevent sudden pop-outs.

## 3. Micro-Interactions
- `whileHover={{ scale: 1.02 }}` and `whileTap={{ scale: 0.98 }}` for tactile button feel.
- Staggered children animations using `transition: { staggerChildren: 0.05 }` for candidate lists and spectral data points.

## 4. Reduced Motion
- Always wrap intensive animations with `useReducedMotion()` to respect user accessibility preferences.
