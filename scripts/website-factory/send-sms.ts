import type { Business } from './types.ts';

export async function sendSms(business: Business, siteUrl: string): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    // SMS disabled — not all keys configured
    return false;
  }

  if (!business.phone) return false;

  const to = normalizePhone(business.phone);
  if (!to) return false;

  const body = buildMessage(business, siteUrl);

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: to, From: fromNumber, Body: body }).toString(),
  });

  return response.ok;
}

function buildMessage(business: Business, url: string): string {
  return (
    `Hi! I built a free professional website for ${business.name}: ${url}\n\n` +
    `It uses your real photos and info. It's yours to keep — no strings attached.\n` +
    `Reply YES if you'd like me to customize it further or add your own content.`
  );
}

function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (digits.length > 10) return `+${digits}`;
  return null;
}
