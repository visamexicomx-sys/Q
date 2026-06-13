import Anthropic from '@anthropic-ai/sdk';
import type { Business, GeneratedSite } from './types.ts';

const client = new Anthropic();

export async function generateSite(business: Business): Promise<GeneratedSite> {
  const prompt = buildPrompt(business);

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8000,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type');

  const html = extractHtml(content.text);

  return { business, html, slug: business.slug };
}

function buildPrompt(b: Business): string {
  const photoTags = b.photos
    .slice(0, 3)
    .map((url, i) => `<img src="${url}" alt="${b.name} photo ${i + 1}" loading="lazy" />`)
    .join('\n');

  const servicesList = b.services.map((s) => `<li>${s}</li>`).join('\n');

  return `You are a professional web developer. Generate a complete, beautiful, single-file HTML website for a local ${b.category} business. The website must be production-ready, mobile-responsive, and compelling.

Business details:
- Name: ${b.name}
- Category: ${b.category}
- Address: ${b.address}
- City: ${b.city}
- Phone: ${b.phone ?? 'Not provided'}
- Rating: ${b.rating ? `${b.rating}/5 (${b.reviewCount} reviews)` : 'New business'}
- Hours: ${b.hours ?? 'Call for hours'}
- Services: ${b.services.join(', ')}

Photo URLs to embed (use these real photos):
${b.photos.slice(0, 3).join('\n')}

Requirements:
1. Single HTML file with embedded CSS (no external CSS files needed, use <style> tag)
2. NO JavaScript frameworks — vanilla only
3. Modern, professional design with a hero section, services, about, and contact sections
4. Mobile-first responsive design
5. Color scheme: professional and trustworthy for a ${b.category} business
6. Embed the real photos in an <img> tags in the hero and gallery sections
7. Include a prominent phone number CTA
8. SEO meta tags (title, description, og:*)
9. Google Maps embed placeholder for the address
10. Footer with address and phone

Write ONLY the complete HTML file — no explanation, no markdown code blocks, just pure HTML starting with <!DOCTYPE html>.`;
}

function extractHtml(text: string): string {
  // Strip markdown code fences if Claude wrapped the output
  const match = text.match(/```(?:html)?\s*([\s\S]+?)```/);
  if (match) return match[1].trim();

  // If it starts with <!DOCTYPE, return as-is
  if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
    return text.trim();
  }

  return text.trim();
}
