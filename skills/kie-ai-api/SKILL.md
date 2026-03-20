---
name: kie-ai-api
description: "Kie.ai unified API for AI video, image, and music generation (Kling, Veo3, Sora, Runway, Suno, ElevenLabs)"
risk: unknown
source: community
tags: "kie.ai, video-generation, kling, veo3, ai-api, text-to-video, image-to-video"
date_added: "2026-03-18"
---

## When to use

Use this skill when working with the Kie.ai API for AI video generation, image generation, or music generation. This includes Kling 2.6, Kling 3.0, Veo 3.1, and other models available through the Kie.ai unified API.

## Authentication

All requests require a Bearer token in the `Authorization` header.

- **API Key**: Get yours at https://kie.ai/api-key
- **Header**: `Authorization: Bearer YOUR_API_KEY`
- **Rate Limit**: Up to 20 requests per 10 seconds, 100+ concurrent tasks

Set the environment variable:

```bash
export KIE_AI_API_KEY=your_api_key_here
```

## Base Endpoints

| Action | Method | URL |
|--------|--------|-----|
| Create Task | POST | `https://api.kie.ai/api/v1/jobs/createTask` |
| Get Task Status | GET | `https://api.kie.ai/api/v1/jobs/recordInfo?taskId=TASK_ID` |
| Veo 3.1 Generate | POST | `https://api.kie.ai/api/v1/veo/generate` |

## Task States

| State | Description |
|-------|-------------|
| `waiting` | Queued for processing |
| `queuing` | In processing queue |
| `generating` | Currently processing |
| `success` | Completed successfully |
| `fail` | Task failed |

## Data Retention

- Generated media: **14 days** before deletion
- Log records: **2 months** before deletion

---

## Kling 2.6 — Text to Video

**Model**: `kling-2.6/text-to-video`

```json
{
  "model": "kling-2.6/text-to-video",
  "callBackUrl": "https://your-domain.com/api/callback",
  "input": {
    "prompt": "A cat walking through a neon-lit Tokyo alley at night",
    "sound": false,
    "aspect_ratio": "16:9",
    "duration": "5"
  }
}
```

| Parameter | Type | Required | Values |
|-----------|------|----------|--------|
| `input.prompt` | string | Yes | Max 1000 chars |
| `input.sound` | boolean | Yes | Enable native audio |
| `input.aspect_ratio` | string | Yes | `1:1`, `16:9`, `9:16` |
| `input.duration` | string | Yes | `5` or `10` seconds |

---

## Kling 2.6 — Image to Video

**Model**: `kling-2.6/image-to-video`

```json
{
  "model": "kling-2.6/image-to-video",
  "callBackUrl": "https://your-domain.com/api/callback",
  "input": {
    "prompt": "The woman turns and smiles at the camera",
    "image_urls": ["https://example.com/photo.png"],
    "sound": false,
    "duration": "5"
  }
}
```

| Parameter | Type | Required | Values |
|-----------|------|----------|--------|
| `input.prompt` | string | Yes | Max 1000 chars |
| `input.image_urls` | array | Yes | 1 URL, jpeg/png/webp, max 10MB |
| `input.sound` | boolean | Yes | Enable native audio |
| `input.duration` | string | Yes | `5` or `10` seconds |

---

## Kling 3.0 — Video Generation

**Model**: `kling-3.0/video`

Supports single-shot and multi-shot with element references.

### Single-shot

```json
{
  "model": "kling-3.0/video",
  "input": {
    "prompt": "A drone shot over mountain peaks at sunrise",
    "sound": true,
    "duration": "5",
    "aspect_ratio": "16:9",
    "mode": "pro",
    "multi_shots": false
  }
}
```

### Multi-shot (up to 5 shots)

```json
{
  "model": "kling-3.0/video",
  "input": {
    "multi_shots": true,
    "image_urls": ["https://example.com/first-frame.png"],
    "duration": "10",
    "aspect_ratio": "16:9",
    "mode": "pro",
    "multi_prompt": [
      { "prompt": "Wide shot of @hero walking into the city", "duration": 4 },
      { "prompt": "Close-up of @hero looking at the skyline", "duration": 3 },
      { "prompt": "Aerial pullback revealing the full cityscape", "duration": 3 }
    ],
    "kling_elements": [
      {
        "name": "hero",
        "description": "Young woman with red jacket",
        "element_input_urls": [
          "https://example.com/hero1.jpg",
          "https://example.com/hero2.jpg"
        ]
      }
    ]
  }
}
```

| Parameter | Type | Required | Values |
|-----------|------|----------|--------|
| `input.prompt` | string | Single-shot | Video description |
| `input.multi_shots` | boolean | No | Enable multi-shot mode |
| `input.multi_prompt` | array | Multi-shot | Array of `{prompt, duration}` (1-12s per shot, max 5) |
| `input.kling_elements` | array | No | Element refs: `{name, description, element_input_urls}` (2-4 images each) |
| `input.mode` | string | No | `std` or `pro` |
| `input.aspect_ratio` | string | No | `16:9`, `9:16`, `1:1` |
| `input.duration` | string | No | `3` to `15` seconds |
| `input.sound` | boolean | No | Default: false (single), true (multi) |
| `input.image_urls` | array | No | First/last frame references |

### Resolution by Mode

| Mode | 16:9 | 9:16 | 1:1 |
|------|------|------|-----|
| std | 1280x720 | 720x1280 | 720x720 |
| pro | 1920x1080 | 1080x1920 | 1080x1080 |

### Element References

Use `@element_name` in prompts to reference characters/objects defined in `kling_elements`. Each element needs 2-4 reference images (JPG/PNG, max 10MB each).

---

## Veo 3.1 — Video Generation

**Endpoint**: `POST https://api.kie.ai/api/v1/veo/generate` (different from Kling)

**Models**: `veo3` (quality) or `veo3_fast` (cost-efficient)

```json
{
  "prompt": "A golden retriever running through autumn leaves in slow motion",
  "model": "veo3_fast",
  "generationType": "TEXT_2_VIDEO",
  "aspect_ratio": "16:9",
  "callBackUrl": "https://your-domain.com/callback"
}
```

### Image-to-Video (First and Last Frame)

```json
{
  "prompt": "Smooth transition from dawn to dusk over a lake",
  "imageUrls": [
    "https://example.com/dawn.jpg",
    "https://example.com/dusk.jpg"
  ],
  "model": "veo3",
  "generationType": "FIRST_AND_LAST_FRAMES_2_VIDEO",
  "aspect_ratio": "16:9"
}
```

| Parameter | Type | Required | Values |
|-----------|------|----------|--------|
| `prompt` | string | Yes | Video description |
| `model` | string | No | `veo3` or `veo3_fast` |
| `generationType` | string | No | `TEXT_2_VIDEO`, `FIRST_AND_LAST_FRAMES_2_VIDEO`, `REFERENCE_2_VIDEO` |
| `aspect_ratio` | string | No | `16:9`, `9:16`, `Auto` |
| `imageUrls` | array | For I2V | 1-3 image URLs |
| `seeds` | integer | No | 10000-99999 for reproducibility |
| `enableTranslation` | boolean | No | Auto-translate to English (default: true) |
| `watermark` | string | No | Watermark text |
| `callBackUrl` | string | No | Webhook URL |

---

## Querying Task Status

### Kling Models

**GET** `https://api.kie.ai/api/v1/jobs/recordInfo?taskId=TASK_ID`

```bash
curl -X GET "https://api.kie.ai/api/v1/jobs/recordInfo?taskId=task_kling-2.6_1765182425861" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

#### Kling Success Response

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "taskId": "task_kling-2.6_1765182425861",
    "model": "kling-2.6/text-to-video",
    "state": "success",
    "resultJson": "{\"resultUrls\":[\"https://cdn.kie.ai/generated/video.mp4\"]}",
    "failCode": "",
    "failMsg": "",
    "costTime": 45000,
    "completeTime": 1698765432000,
    "createTime": 1698765400000
  }
}
```

Parse `resultJson` to get the video URL from `resultUrls` array.

### Veo 3.1 Models

**IMPORTANT**: Veo uses a **different polling endpoint** than Kling.

**GET** `https://api.kie.ai/api/v1/veo/record-info?taskId=TASK_ID`

```bash
curl -X GET "https://api.kie.ai/api/v1/veo/record-info?taskId=YOUR_TASK_ID" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

#### Veo Success Response

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "taskId": "c2ac913cc2618ee809dd315065c48c5a",
    "paramJson": "{\"aspectRatio\":\"16:9\",\"model\":\"veo3_fast\",\"prompt\":\"...\"}",
    "response": {
      "taskId": "c2ac913cc2618ee809dd315065c48c5a",
      "resolution": "720p",
      "resultUrls": ["https://tempfile.aiquickdraw.com/v/example.mp4"],
      "hasAudioList": [true],
      "seeds": [34186]
    },
    "successFlag": 1,
    "fallbackFlag": false,
    "completeTime": 1773967493000,
    "createTime": 1773967426000,
    "errorCode": null,
    "errorMessage": null
  }
}
```

Check `successFlag === 1` for completion. Video URLs are in `response.resultUrls`.

---

## TypeScript Helper

```typescript
const KIE_API_BASE = "https://api.kie.ai/api/v1";

interface KieTaskResponse {
  code: number;
  msg: string;
  data: { taskId: string } | null;
}

interface KieStatusResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
    model: string;
    state: "waiting" | "queuing" | "generating" | "success" | "fail";
    resultJson: string;
    failCode: string;
    failMsg: string;
    costTime: number;
  } | null;
}

async function createKlingTask(
  apiKey: string,
  model: string,
  input: Record<string, unknown>,
  callBackUrl?: string,
): Promise<string> {
  const res = await fetch(`${KIE_API_BASE}/jobs/createTask`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, input, callBackUrl }),
  });

  const json: KieTaskResponse = await res.json();
  if (json.code !== 200 || !json.data) {
    throw new Error(`Kie.ai error ${json.code}: ${json.msg}`);
  }
  return json.data.taskId;
}

async function pollTaskResult(
  apiKey: string,
  taskId: string,
  intervalMs = 5000,
  maxAttempts = 120,
): Promise<string[]> {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(
      `${KIE_API_BASE}/jobs/recordInfo?taskId=${taskId}`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
    );

    const json: KieStatusResponse = await res.json();
    if (!json.data) throw new Error(`Kie.ai error: ${json.msg}`);

    if (json.data.state === "success") {
      const result = JSON.parse(json.data.resultJson);
      return result.resultUrls as string[];
    }

    if (json.data.state === "fail") {
      throw new Error(`Task failed: ${json.data.failMsg}`);
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error("Task timed out");
}
```

### Usage Example

```typescript
const apiKey = process.env.KIE_AI_API_KEY!;

// Generate a video with Kling 3.0
const taskId = await createKlingTask(apiKey, "kling-3.0/video", {
  prompt: "A timelapse of a flower blooming in a garden",
  sound: true,
  duration: "5",
  aspect_ratio: "16:9",
  mode: "pro",
  multi_shots: false,
});

console.log("Task created:", taskId);

// Poll until complete
const urls = await pollTaskResult(apiKey, taskId);
console.log("Video URL:", urls[0]);
```

---

## Error Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 401 | Unauthorized (invalid API key) |
| 402 | Insufficient credits |
| 404 | Not found |
| 422 | Validation error |
| 429 | Rate limited (max 20 req/10s) |
| 455 | Service unavailable |
| 500 | Server error |
| 501 | Generation failed |
| 505 | Feature disabled |

---

## Available Models (Full List)

### Video
- `kling-2.6/text-to-video` — Kling 2.6 text-to-video
- `kling-2.6/image-to-video` — Kling 2.6 image-to-video
- `kling-3.0/video` — Kling 3.0 (single + multi-shot)
- `veo3` / `veo3_fast` — Google Veo 3.1 (via separate endpoint)
- Sora, Runway, Hailuo, Seedance, Wan — also available

### Audio/Music
- Suno — Music generation
- ElevenLabs TTS — Text-to-speech
- ElevenLabs TTSFX — Sound effects

### Image
- Midjourney, Grok Imagine — Image generation

See https://kie.ai/market for the full model gallery.

---

## Resources

- **Docs**: https://docs.kie.ai
- **API Key**: https://kie.ai/api-key
- **Models Gallery**: https://kie.ai/market
- **Task Logs**: https://kie.ai/logs
- **Pricing**: https://kie.ai/pricing
- **Support**: support@kie.ai
