import { execSync } from 'child_process';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { GeneratedSite } from './types.ts';

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;

export async function deployToVercel(site: GeneratedSite): Promise<string> {
  if (!VERCEL_TOKEN) throw new Error('VERCEL_TOKEN not set');

  const dir = join(tmpdir(), `website-factory-${site.slug}-${Date.now()}`);
  mkdirSync(dir, { recursive: true });

  try {
    writeFileSync(join(dir, 'index.html'), site.html);

    writeFileSync(
      join(dir, 'vercel.json'),
      JSON.stringify({
        version: 2,
        name: site.slug,
        builds: [{ src: 'index.html', use: '@vercel/static' }],
        routes: [{ src: '/(.*)', dest: '/index.html' }],
      })
    );

    const output = execSync(
      `vercel deploy --prod --yes --token "${VERCEL_TOKEN}" --name "${site.slug}"`,
      { cwd: dir, timeout: 120_000, encoding: 'utf-8' }
    );

    const url = extractUrl(output);
    if (!url) throw new Error(`Could not parse URL from vercel output:\n${output}`);

    return url;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function extractUrl(output: string): string | null {
  // Vercel outputs the URL on its own line, usually starting with https://
  const lines = output.split('\n').map((l) => l.trim());
  for (const line of lines.reverse()) {
    if (line.startsWith('https://') && line.includes('vercel.app')) {
      return line;
    }
  }
  // Fallback: any https line
  const match = output.match(/https:\/\/[^\s]+\.vercel\.app[^\s]*/g);
  return match ? match[match.length - 1] : null;
}
