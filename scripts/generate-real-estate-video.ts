#!/usr/bin/env npx tsx
/**
 * Real Estate Property Showcase Video Generator
 * Uses kie.ai API with Kling 3.0 to generate cinematic property videos
 *
 * Usage:
 *   KIE_AI_API_KEY=your_key npx tsx scripts/generate-real-estate-video.ts
 *   KIE_AI_API_KEY=your_key npx tsx scripts/generate-real-estate-video.ts --prompt "Custom prompt"
 *   KIE_AI_API_KEY=your_key npx tsx scripts/generate-real-estate-video.ts --model veo3_fast
 */

const KIE_API_BASE = 'https://api.kie.ai/api/v1';

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
    state: 'waiting' | 'queuing' | 'generating' | 'success' | 'fail';
    resultJson: string;
    failCode: string;
    failMsg: string;
    costTime: number;
  } | null;
}

// --- Preset real estate prompts ---

const PROPERTY_PROMPTS = [
  'Cinematic drone shot slowly approaching a modern luxury home at golden hour. The camera glides over a manicured front lawn, past palm trees swaying gently in warm light, revealing a stunning two-story contemporary house with large glass windows reflecting the sunset. Warm ambient lighting glows from inside.',
  'Smooth aerial establishing shot of a beautiful suburban neighborhood at sunrise. The camera descends toward an elegant Mediterranean-style villa with terracotta roof, lush garden, sparkling pool in the backyard, and a circular driveway. Golden morning light creates long shadows across the pristine landscaping.',
  'Cinematic slow-motion walkthrough approaching the grand entrance of a luxury estate. Camera moves along a stone-paved pathway lined with ambient landscape lighting, past a water fountain feature, arriving at oversized wooden double doors. Warm twilight sky in background, exterior accent lights illuminate the architectural details.',
  'Sweeping drone reveal of a waterfront property at sunset. Camera starts low over calm lake water, rises to reveal a modern glass-and-wood lakehouse with an expansive deck, outdoor kitchen, and infinity pool overlooking the water. Golden hour light bathes everything in warm tones.',
  'Aerial cinematic shot circling a hilltop estate surrounded by vineyards. The camera orbits the Tuscan-style villa showing its clay tile roof, arched windows, courtyard with olive trees, and panoramic views of rolling hills. Soft evening light with purple and gold sky.',
];

async function createTask(
  apiKey: string,
  model: string,
  payload: Record<string, unknown>,
  endpoint?: string
): Promise<string> {
  const url = endpoint || `${KIE_API_BASE}/jobs/createTask`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(endpoint ? payload : { model, input: payload }),
  });

  const json: KieTaskResponse = await res.json();
  if (json.code !== 200 || !json.data) {
    throw new Error(`kie.ai error ${json.code}: ${json.msg}`);
  }
  return json.data.taskId;
}

async function pollResult(
  apiKey: string,
  taskId: string,
  isVeo: boolean,
  intervalMs = 5000,
  maxAttempts = 120
): Promise<string[]> {
  for (let i = 0; i < maxAttempts; i++) {
    const endpoint = isVeo
      ? `${KIE_API_BASE}/veo/record-info?taskId=${taskId}`
      : `${KIE_API_BASE}/jobs/recordInfo?taskId=${taskId}`;

    const res = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    const json = await res.json();
    if (json.code !== 200 || !json.data) throw new Error(`kie.ai error: ${json.msg}`);

    if (isVeo) {
      // Veo uses successFlag/errorMessage instead of state
      const { successFlag, errorMessage, response } = json.data;
      console.log(`  [${i + 1}/${maxAttempts}] ${successFlag === 1 ? 'Success' : 'Processing...'}`);

      if (successFlag === 1 && response?.resultUrls) {
        return response.resultUrls as string[];
      }
      if (errorMessage) {
        throw new Error(`Task failed: ${errorMessage}`);
      }
    } else {
      // Kling uses state-based polling
      console.log(`  [${i + 1}/${maxAttempts}] State: ${json.data.state}`);

      if (json.data.state === 'success') {
        const result = JSON.parse(json.data.resultJson);
        return result.resultUrls as string[];
      }
      if (json.data.state === 'fail') {
        throw new Error(`Task failed (${json.data.failCode}): ${json.data.failMsg}`);
      }
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error('Task timed out after polling');
}

async function main() {
  const apiKey = process.env.KIE_AI_API_KEY;
  if (!apiKey) {
    console.error('Error: KIE_AI_API_KEY environment variable is required.');
    console.error('Get your key at https://kie.ai/api-key');
    process.exit(1);
  }

  // Parse CLI args
  const args = process.argv.slice(2);
  const getArg = (flag: string) => {
    const idx = args.indexOf(flag);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
  };

  const customPrompt = getArg('--prompt');
  const modelArg = getArg('--model') || 'kling-3.0';
  const duration = getArg('--duration') || '5';
  const aspectRatio = getArg('--aspect') || '16:9';

  // Pick a prompt
  const prompt =
    customPrompt || PROPERTY_PROMPTS[Math.floor(Math.random() * PROPERTY_PROMPTS.length)];

  console.log('\n🏠 Real Estate Video Generator');
  console.log('━'.repeat(50));
  console.log(`Model:    ${modelArg}`);
  console.log(`Duration: ${duration}s`);
  console.log(`Aspect:   ${aspectRatio}`);
  console.log(`Prompt:   ${prompt.slice(0, 80)}...`);
  console.log('━'.repeat(50));

  let taskId: string;
  const isVeo = modelArg.startsWith('veo3');

  if (isVeo) {
    // Veo 3.1 uses a different endpoint
    console.log('\n📹 Creating Veo 3.1 video task...');
    taskId = await createTask(
      apiKey,
      modelArg,
      {
        prompt,
        model: modelArg,
        generationType: 'TEXT_2_VIDEO',
        aspect_ratio: aspectRatio,
      },
      `${KIE_API_BASE}/veo/generate`
    );
  } else {
    // Kling models
    const klingModel = modelArg === 'kling-3.0' ? 'kling-3.0/video' : 'kling-2.6/text-to-video';

    console.log(`\n📹 Creating ${klingModel} task...`);
    taskId = await createTask(apiKey, klingModel, {
      prompt,
      sound: true,
      duration,
      aspect_ratio: aspectRatio,
      ...(klingModel === 'kling-3.0/video' && { mode: 'pro', multi_shots: false }),
    });
  }

  console.log(`✅ Task created: ${taskId}`);
  console.log('\n⏳ Polling for result (this may take 1-3 minutes)...\n');

  const urls = await pollResult(apiKey, taskId, isVeo);

  console.log('\n🎬 Video generated successfully!');
  console.log('━'.repeat(50));
  urls.forEach((url, i) => {
    console.log(`Video ${i + 1}: ${url}`);
  });
  console.log('━'.repeat(50));
  console.log('\nNote: Video URL expires in 14 days. Download it promptly.');
}

main().catch((err) => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
