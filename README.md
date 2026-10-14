# ZenPipes 🌊🚰

A sleek, calming offline pipe flow rotation logic puzzle game built with pure vanilla web technologies (HTML5, CSS3, JavaScript) and Capacitor Android.

Rotate intricate conduit fittings (elbows, straights, tees, and crosses) to direct flowing water and energy from the central spring into all sacred lanterns across harmonious grid layouts.

[![CI](https://github.com/OfferPk/zenpipes/actions/workflows/ci.yml/badge.svg)](https://github.com/OfferPk/zenpipes/actions/workflows/ci.yml)
[![Pages](https://github.com/OfferPk/zenpipes/actions/workflows/pages.yml/badge.svg)](https://offerpk.github.io/zenpipes/)
[![Android](https://github.com/OfferPk/zenpipes/actions/workflows/android.yml/badge.svg)](https://github.com/OfferPk/zenpipes/actions/workflows/android.yml)

---

## ✨ Features

- **100% Offline & Private**: Zero network dependencies, zero telemetry, zero advertisements. All progress, star ratings, and move records are preserved locally in your device's browser storage.
- **50 Solver-Verified Levels Across 5 Packs**:
  - **Pack 1: Spring Awakening**: 10 gentle 3x3 conduits to discover flow dynamics (Par: 3 to 6 moves)
  - **Pack 2: River Crossing**: 10 balanced 4x4 stream crossings and aqueducts (Par: 4 to 8 moves)
  - **Pack 3: Aqueduct Gate**: 10 expansive 5x5 irrigation channels and water wheels (Par: 5 to 10 moves)
  - **Pack 4: Temple Conduits**: 10 intricate multi-lantern networks across 5x5 and 6x6 (Par: 6 to 12 moves)
  - **Pack 5: Infinite Flow**: 10 grand 6x6 master hydro-engineering puzzles (Par: 7 to 15 moves)
- **Zen Free Play Mode**: Endless procedurally generated solvable flow puzzles on 3x3, 4x4, 5x5, or 6x6 boards.
- **Real-Time Flow Simulation & Hint Assistant**: Instant BFS graph solver computes flow paths and highlights the next required rotation.
- **Procedural Web Audio Synthesizer**: Realistic bamboo water fountain sounds, soothing droplets, and tranquil completion harmonies.
- **4 Radiant Color Themes**: Aquamarine Stream, Emerald Bamboo, Solar Amber, and Amethyst River.
- **Full Player Tools**: Unlimited undo, rapid board reset, star ratings based on par efficiency, and keyboard shortcuts (`Z` undo, `R` reset, `H` hint, `M` mute).
- **PWA & Native Android**: Installable as a Progressive Web App on mobile/desktop, or packaged natively for Android via Capacitor.

---

## 🎮 Play Live

- **Web Demo**: [https://offerpk.github.io/zenpipes/](https://offerpk.github.io/zenpipes/)
- **Android APK**: Download the latest build from [GitHub Actions artifacts](https://github.com/OfferPk/zenpipes/actions/workflows/android.yml) (`zenpipes-apk`) or Releases.

---

## 📸 Screenshots

| Flow Conduit Arena | 50 Level Selector | Zen Victory Screen |
|:---:|:---:|:---:|
| *(Bioluminescent Stream)* | *(5 Distinct Packs)* | *(3-Star Optimal Clear)* |

---

## 🛠️ Local Development & Build

### Prerequisites
- Node.js (v20+ recommended)
- npm

### Setup & Testing
```bash
# Clone repository
git clone https://github.com/OfferPk/zenpipes.git
cd zenpipes

# Install dependencies
npm ci

# Run unit tests (Node test runner)
npm test

# Build production web assets into www/
npm run build
```

### Android Native Build
```bash
# Add Android project (already configured)
npx cap add android

# Build and sync
npm run build
npx cap sync android

# Open in Android Studio
npx cap open android
```

---

## 📄 License

MIT License. Free and open source casual gaming by [OfferPk](https://github.com/OfferPk).
