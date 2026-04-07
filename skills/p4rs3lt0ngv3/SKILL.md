---
name: P4RS3LT0NGV3
description: Universal text transformation, translation, mutation, encoding/decoding, and promptcrafting toolkit from elder-plinius. 596+ stars. Use when transforming text between formats, encoding/decoding data, crafting AI prompts, translating languages, or applying text mutations for security research.
---

# P4RS3LT0NGV3

Universal text transformation engine supporting encoding, decoding, translation, mutation, and AI prompt crafting.

## Source
Repository: `elder-plinius/P4RS3LT0NGV3`
Stars: 596+ | License: AGPL-3.0

## Quick Start

```bash
git clone https://github.com/elder-plinius/P4RS3LT0NGV3.git
cd P4RS3LT0NGV3
pip install -r requirements.txt
python p4rs3lt0ngv3.py --help
```

## Text Transformation Operations

### Encoding/Decoding
```bash
# Base64 encode
python p4rs3lt0ngv3.py encode --method base64 --input "text to encode"

# ROT13
python p4rs3lt0ngv3.py encode --method rot13 --input "secret message"

# URL encoding
python p4rs3lt0ngv3.py encode --method url --input "https://example.com/path?key=value"

# Hex encoding
python p4rs3lt0ngv3.py encode --method hex --input "binary data"

# Morse code
python p4rs3lt0ngv3.py encode --method morse --input "SOS"
```

### Text Mutation
```bash
# Leetspeak conversion
python p4rs3lt0ngv3.py mutate --style leet --input "hello world"
# → "h3ll0 w0rld"

# Unicode homoglyphs (look-alike characters)
python p4rs3lt0ngv3.py mutate --style homoglyph --input "admin"

# Character substitution
python p4rs3lt0ngv3.py mutate --style substitute --input "text" --pattern custom.json
```

### Language Translation
```bash
# Translate text
python p4rs3lt0ngv3.py translate --from en --to es --input "Hello world"

# Translate file
python p4rs3lt0ngv3.py translate --file document.txt --to fr --output translated.txt
```

### Promptcrafting
```bash
# Transform text into effective AI prompts
python p4rs3lt0ngv3.py craft --style jailbreak --input "base instruction"
python p4rs3lt0ngv3.py craft --style roleplay --persona "expert hacker"
python p4rs3lt0ngv3.py craft --style academic --topic "security research"
```

## Use Cases

1. **Security Research** — Encode/obfuscate payloads for security testing
2. **CTF Challenges** — Solve encoding/decoding puzzles
3. **Prompt Engineering** — Craft effective AI prompts
4. **Data Transformation** — Convert between text formats
5. **Evasion Research** — Study how text transformation affects AI filtering

## Supported Formats

| Category | Formats |
|----------|---------|
| Encoding | Base64, Hex, URL, HTML entities, Morse, Binary, ROT13 |
| Compression | Gzip, Zlib, LZ4 |
| Ciphers | Caesar, Vigenère, XOR |
| Languages | 50+ via translation API |
| Text styles | Leet, Wingdings, Unicode art, homoglyphs |
