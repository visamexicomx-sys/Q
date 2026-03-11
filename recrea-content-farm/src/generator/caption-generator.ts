import Anthropic from "@anthropic-ai/sdk";
import type { ContentBrief, GeneratedCaption } from "../types/index.js";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are an expert Instagram copywriter for RECREA Construcción, a luxury construction company with 18 years of experience and 196 completed projects in the Riviera Maya, Mexico. 85% of their clients are foreign investors from the US, Canada, Germany, UK, and France.

Brand voice:
- Professional yet warm and approachable
- Confident — grounded in 18 years of real expertise
- Specific — always use real numbers (18 years, 196 projects, 85% foreign clients)
- Inspiring — sell the dream of owning property in paradise
- Action-oriented — every post ends with a clear CTA

Instagram caption rules:
- LINE 1 must be the hook — bold, scroll-stopping, NO hashtags in the first line
- Write in a natural, human tone — never corporate or robotic
- Use line breaks and bullet points (✅ 📍 🏗️ etc.) for readability
- Keep paragraphs short — max 3 lines each
- End with a CTA that matches the post goal
- SEPARATE the hashtags from the caption with a blank line
- Use exactly 20-25 hashtags
- Always include #RECREA and #RECREAconstruccion in every post

Return ONLY the caption text followed by the hashtags. No preamble, no "Here's your caption:", nothing else.`;

function buildUserPrompt(brief: ContentBrief): string {
  return `Write an Instagram ${brief.postType} caption for RECREA Construcción.

Topic: ${brief.topic}
Tone: ${brief.tone}
Location focus: ${brief.locationFocus || "Riviera Maya"}
Target audience: ${brief.audience || "foreign investors"}
CTA to include: ${brief.cta}
${brief.notes ? `Extra context: ${brief.notes}` : ""}

Remember: hook first, body second, CTA third, blank line, then 20-25 hashtags.`;
}

function parseCaption(raw: string): Omit<GeneratedCaption, "inputTokens" | "outputTokens"> {
  const lines = raw.trim().split("\n");

  // Find where hashtags start
  const hashtagStartIndex = lines.findIndex((line) =>
    line.trim().startsWith("#")
  );

  let captionLines: string[];
  let hashtagLines: string[];

  if (hashtagStartIndex === -1) {
    // No clear hashtag block — treat everything as caption
    captionLines = lines;
    hashtagLines = [];
  } else {
    // Walk back to find the blank line separator
    captionLines = lines.slice(0, hashtagStartIndex).filter((l, i, arr) => {
      // Remove trailing blank lines before hashtags
      if (i === arr.length - 1 && l.trim() === "") return false;
      return true;
    });
    hashtagLines = lines.slice(hashtagStartIndex);
  }

  const captionOnly = captionLines.join("\n").trim();
  const hashtags = hashtagLines.join(" ").trim();
  const captionFull = hashtags ? `${captionOnly}\n\n${hashtags}` : captionOnly;
  const hook = captionLines.find((l) => l.trim().length > 0) ?? "";
  const hashtagCount = (hashtags.match(/#\w+/g) ?? []).length;

  return {
    captionFull,
    captionOnly,
    hashtags,
    hashtagCount,
    charCount: captionFull.length,
    hook: hook.trim(),
  };
}

export async function generateCaption(brief: ContentBrief): Promise<GeneratedCaption> {
  console.log(`\n🤖 Generating caption for: "${brief.topic}"`);
  console.log(`   Type: ${brief.postType} | Tone: ${brief.tone}`);

  const stream = await client.messages.stream({
    model: "claude-opus-4-6",
    max_tokens: 1024,
    thinking: { type: "adaptive" },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(brief) }],
  });

  // Stream output to console as it arrives
  process.stdout.write("   → ");
  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      process.stdout.write(event.delta.text);
    }
  }
  process.stdout.write("\n");

  const message = await stream.finalMessage();
  const rawText = message.content
    .filter((b) => b.type === "text")
    .map((b) => (b as Anthropic.TextBlock).text)
    .join("");

  const parsed = parseCaption(rawText);

  console.log(`   ✅ ${parsed.hashtagCount} hashtags | ${parsed.charCount} chars`);

  return {
    ...parsed,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
  };
}

// ─── Batch generation: runs through all pending briefs ────────────────────────

export async function generateBatch(
  briefs: ContentBrief[]
): Promise<Array<{ brief: ContentBrief; caption: GeneratedCaption }>> {
  const pending = briefs.filter((b) => b.status === "pending");

  if (pending.length === 0) {
    console.log("✅ No pending content briefs found.");
    return [];
  }

  console.log(`\n📋 Found ${pending.length} pending brief(s) to generate.\n`);

  const results: Array<{ brief: ContentBrief; caption: GeneratedCaption }> = [];

  for (const brief of pending) {
    const caption = await generateCaption(brief);
    results.push({ brief, caption });
    // Small delay between Claude calls to be gentle on rate limits
    if (pending.indexOf(brief) < pending.length - 1) {
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  console.log(`\n✅ Generated ${results.length} caption(s) successfully.`);
  return results;
}
