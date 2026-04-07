---
name: binaural-beats-generator
description: Chrome extension from elder-plinius that generates binaural beats for focus, relaxation, and cognitive enhancement. 26+ stars. Use when adding binaural beat generation to browser applications, building focus/wellness tools, or studying audio frequency effects on cognition.
---

# Binaural Beats Generator

A Chrome extension that generates customizable binaural beats directly in the browser for focus enhancement, relaxation, and cognitive states.

## Source
Repository: `elder-plinius/binaural-beats-generator`
Stars: 26+ | License: AGPL-3.0

## What Are Binaural Beats?

Binaural beats occur when two slightly different frequencies are played in each ear — the brain perceives a third "beat" at the difference frequency, potentially inducing specific mental states.

| Beat Type | Frequency | Mental State |
|-----------|-----------|-------------|
| Delta | 0.5–4 Hz | Deep sleep, healing |
| Theta | 4–8 Hz | Meditation, creativity |
| Alpha | 8–13 Hz | Relaxation, calm focus |
| Beta | 13–30 Hz | Active thinking, concentration |
| Gamma | 30–100 Hz | Peak performance, perception |

## Chrome Extension Setup

```bash
git clone https://github.com/elder-plinius/binaural-beats-generator.git
cd binaural-beats-generator

# Load in Chrome:
# 1. Open chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the extension directory
```

## Usage

Once installed in Chrome:
1. Click the extension icon in the toolbar
2. Select desired beat frequency/type
3. Adjust volume and carrier frequency
4. Press play and use headphones

## Programmatic API

The underlying audio generation can be used in web applications:

```javascript
// Generate binaural beats with Web Audio API
class BinauralBeatGenerator {
  constructor(audioContext) {
    this.ctx = audioContext;
  }
  
  generate(beatFrequency, carrierFrequency = 200, volume = 0.5) {
    const left = this.ctx.createOscillator();
    const right = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    
    left.frequency.value = carrierFrequency;
    right.frequency.value = carrierFrequency + beatFrequency;
    gainNode.gain.value = volume;
    
    // Connect to stereo merger
    const merger = this.ctx.createChannelMerger(2);
    left.connect(merger, 0, 0);
    right.connect(merger, 0, 1);
    merger.connect(gainNode);
    gainNode.connect(this.ctx.destination);
    
    left.start();
    right.start();
    
    return { left, right, gainNode };
  }
}
```

## Use Cases

1. **Focus Sessions** — Beta waves (14Hz) during coding/work
2. **Meditation** — Theta waves (6Hz) for meditation practice
3. **Sleep Aid** — Delta waves (2Hz) for sleep induction
4. **Wellness Apps** — Integrate into browser-based wellness tools
5. **Research** — Study audio frequency effects on cognition
