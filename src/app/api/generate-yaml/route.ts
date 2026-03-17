import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { validatePrompt, sanitizePrompt } from '@/lib/security';
import { checkRateLimit, incrementGenerationCount, logGeneration } from '@/lib/rate-limit';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are an expert Home Assistant automation engineer. Generate precise, valid Home Assistant YAML configurations from plain-English descriptions.

Always:
- Output ONLY valid Home Assistant YAML — no markdown fences, just raw YAML
- Include an \`alias\` that clearly names the automation
- Include a \`description\` field explaining what it does
- Add inline YAML comments (# ...) to explain non-obvious parts
- Use realistic entity IDs following HA conventions (e.g. light.living_room, binary_sensor.front_door)
- When the user's device list is provided, use those exact device names to infer entity IDs
- Set \`mode: single\` unless the use case clearly benefits from another mode
- After the YAML, output a line containing only "---EXPLANATION---" then write:
  1. What the automation does step by step
  2. Entity IDs the user will need to adjust
  3. Required integrations or helper entities
  4. Potential edge cases or warnings`;

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;

  // ── 1. Auth ────────────────────────────────────────────────────────────
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // ── 2. Parse + validate body ───────────────────────────────────────────
  let body: { prompt?: unknown; devices?: unknown; history?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const rawPrompt = typeof body.prompt === 'string' ? body.prompt : '';
  const validation = validatePrompt(rawPrompt);

  if (!validation.valid) {
    await logGeneration({ userId: user.id, prompt: rawPrompt.slice(0, 200), success: false, errorMessage: validation.error, ipAddress: ip ?? undefined });
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const cleanPrompt = sanitizePrompt(rawPrompt);

  // ── 3. Rate limit ──────────────────────────────────────────────────────
  let limitInfo;
  try {
    limitInfo = await checkRateLimit(user.id);
  } catch (err) {
    console.error('Rate limit check failed:', err);
    // Fail open — don't block users if the rate limit DB is down
    limitInfo = { allowed: true, remaining: 1, resetDate: '', tier: 'free' as const };
  }

  if (!limitInfo.allowed) {
    return NextResponse.json(
      { error: 'Daily generation limit reached', resetDate: limitInfo.resetDate, tier: limitInfo.tier },
      { status: 429 }
    );
  }

  // ── 4. Increment before streaming (prevent bypass by aborting) ─────────
  try {
    await incrementGenerationCount(user.id);
  } catch (err) {
    console.error('Failed to increment generation count:', err);
    // Non-fatal — continue with generation
  }

  // ── 5. Build Anthropic messages ────────────────────────────────────────
  const devices = Array.isArray(body.devices) ? body.devices : [];
  const history = Array.isArray(body.history) ? body.history : [];

  const deviceContext = devices.length
    ? `\n\nUser's devices:\n${devices
        .map((d: any) =>
          typeof d === 'object' && d !== null
            ? `- ${String(d.name ?? '')} (${String(d.brand ?? '')}) — category: ${String(d.category ?? '')}, protocols: ${Array.isArray(d.protocols) ? d.protocols.join(', ') : ''}`
            : ''
        )
        .filter(Boolean)
        .join('\n')}`
    : '';

  const messages: Anthropic.MessageParam[] = [
    ...(history as Anthropic.MessageParam[]),
    { role: 'user', content: cleanPrompt + deviceContext },
  ];

  // ── 6. Stream ──────────────────────────────────────────────────────────
  const stream = client.messages.stream({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    thinking: { type: 'adaptive' },
    system: SYSTEM_PROMPT,
    messages,
  });

  let generationSucceeded = false;

  const readable = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        generationSucceeded = true;
      } catch (err) {
        console.error('Stream error:', err);
        controller.error(err);
      } finally {
        controller.close();
        // Log outcome after stream completes
        await logGeneration({
          userId: user.id,
          prompt: cleanPrompt,
          success: generationSucceeded,
          errorMessage: generationSucceeded ? undefined : 'Stream error',
          ipAddress: ip ?? undefined,
        });
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'X-Content-Type-Options': 'nosniff',
      'X-RateLimit-Remaining': String(Math.max(0, limitInfo.remaining - 1)),
      'X-RateLimit-Reset': limitInfo.resetDate,
    },
  });
}
