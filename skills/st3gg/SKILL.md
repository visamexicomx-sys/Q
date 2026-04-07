---
name: ST3GG
description: All-in-one steganography suite from elder-plinius for hiding and extracting information within digital media. 1,100+ stars. Use when hiding messages in images/audio/files, extracting steganographic content, performing digital forensics, or researching data concealment techniques.
---

# ST3GG

Comprehensive steganography toolkit for hiding and detecting hidden information within digital media files.

## Source
Repository: `elder-plinius/ST3GG`
Stars: 1,151+ | License: AGPL-3.0

## Features

- **Image Steganography** — Hide data in PNG, JPEG, BMP files using LSB and DCT techniques
- **Audio Steganography** — Conceal messages in WAV, MP3 files
- **Text Steganography** — Invisible ink, whitespace encoding, Unicode tricks
- **Video Steganography** — Frame-based data hiding
- **Detection Tools** — Identify steganographic content in media files

## Setup

```bash
git clone https://github.com/elder-plinius/ST3GG.git
cd ST3GG

# Install dependencies
pip install -r requirements.txt  # or npm install

# View available tools
python st3gg.py --help
```

## Usage Examples

### Hide Data in Image
```bash
# Embed secret message in image
python st3gg.py hide --input original.png --message "secret data" --output stego.png

# With password protection
python st3gg.py hide --input photo.jpg --message "hidden text" --password "key123" --output output.jpg
```

### Extract Hidden Data
```bash
# Extract from stego image
python st3gg.py extract --input stego.png

# With password
python st3gg.py extract --input output.jpg --password "key123"
```

### Detect Steganography
```bash
# Analyze file for hidden data
python st3gg.py detect --input suspicious.png

# Batch analysis
python st3gg.py detect --directory ./images/ --report
```

## Use Cases

1. **Digital Forensics** — Detect hidden data in evidence files
2. **Covert Communication** — Hide messages within innocuous media
3. **CTF Challenges** — Solve steganography puzzle challenges
4. **Security Research** — Study data hiding/detection techniques
5. **Privacy** — Embed copyright watermarks in media

## Steganography Methods

| Method | Carrier | Capacity | Detection Resistance |
|--------|---------|----------|---------------------|
| LSB | Images | High | Low |
| DCT | JPEG | Medium | Medium |
| Spread Spectrum | Audio | Low | High |
| Whitespace | Text | Low | High |
