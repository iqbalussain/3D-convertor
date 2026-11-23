import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';

const PORT = Number(process.env.PORT) || 3000;
const SAMPLE_IMAGE_PATH = path.resolve(
  process.cwd(),
  'public/assets/aistudio/Gemini_Generated_Image_6spgoz6spgoz6spg__1__44725f7e.jpg'
);

interface StoredVideo {
  buffer: Buffer;
  mimeType: string;
  createdAt: number;
}

const videoStore = new Map<string, StoredVideo>();
const MAX_STORED_VIDEOS = 20;

function storeVideoBuffer(buffer: Buffer, mimeType: string): string {
  if (videoStore.size >= MAX_STORED_VIDEOS) {
    const oldestKey = videoStore.keys().next().value;
    if (oldestKey) {
      videoStore.delete(oldestKey);
    }
  }
  const id = crypto.randomUUID();
  videoStore.set(id, { buffer, mimeType, createdAt: Date.now() });
  return id;
}

function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    const err = new Error(
      'GEMINI_API_KEY is not configured. Add a billing-enabled Gemini API key in Settings > Secrets.'
    ) as Error & { status?: number; code?: string };
    err.status = 401;
    err.code = 'API_KEY_MISSING';
    throw err;
  }
  return new GoogleGenAI({ apiKey });
}

interface HologramRequestBody {
  imageBase64?: string;
  mimeType?: string;
  useSampleAsset?: boolean;
  aspectRatio?: '16:9' | '9:16';
  duration?: string;
  resolution?: '360p' | '720p' | '1080p';
  direction?: 'clockwise' | 'counterclockwise';
  displayMode?: 'fan' | 'pyramid' | 'turntable';
  elevationAngle?: 'eye-level' | 'slightly-elevated' | 'isometric';
  customNotes?: string;
}

interface RefineRequestBody {
  previousInteractionId?: string;
  instruction?: string;
  aspectRatio?: '16:9' | '9:16';
  duration?: string;
  resolution?: '360p' | '720p' | '1080p';
}

function buildHologramPrompt(params: {
  direction: 'clockwise' | 'counterclockwise';
  displayMode: 'fan' | 'pyramid' | 'turntable';
  elevationAngle: 'eye-level' | 'slightly-elevated' | 'isometric';
  aspectRatio: '16:9' | '9:16';
  customNotes?: string;
}): string {
  const directionText =
    params.direction === 'clockwise'
      ? 'smoothly and continuously 360 degrees clockwise around its central vertical Y-axis'
      : 'smoothly and continuously 360 degrees counter-clockwise around its central vertical Y-axis';

  const elevationText =
    params.elevationAngle === 'eye-level'
      ? 'Locked eye-level horizontal camera framing at the vertical midpoint of the subject'
      : params.elevationAngle === 'slightly-elevated'
        ? 'Locked slightly elevated 15-degree studio camera angle looking gently down at the subject'
        : 'Locked 30-degree isometric product inspection camera angle revealing top rim and interior depth';

  const stageText =
    params.displayMode === 'fan'
      ? 'Pure pitch-black #000000 void background with zero room walls, zero horizon line, and high-contrast studio rim lighting optimized for 3D LED hologram fan projection. Keep the entire object centered with safe black margin on all sides so spinning fan blades never clip the silhouette.'
      : params.displayMode === 'pyramid'
        ? 'Pure #000000 black background with crisp floating object isolation, luminous specular highlights, and zero floor plane clutter so the object floats cleanly inside a Pepper’s Ghost hologram pyramid.'
        : 'Pure deep #000000 black studio backdrop with a subtle dark glossy reflection directly beneath the base of the object, soft key lighting, and precision commercial product turntable polish.';

  const notes = params.customNotes?.trim()
    ? ` Additional direction: ${params.customNotes.trim()}`
    : '';

  return [
    `Animate the exact object from the reference photo rotating ${directionText} in a seamless 360-degree loop.`,
    `Maintain 100% geometric consistency, proportions, material textures, transparent glass refractions, and metallic brushed-steel specular reflections from every angle as it turns through front, side, back, and back to the starting angle.`,
    `${elevationText} in ${params.aspectRatio} framing with steady, constant angular velocity and zero camera shake, zoom, or pan.`,
    stageText,
    notes,
  ]
    .filter(Boolean)
    .join(' ');
}

async function extractVideoBuffer(
  interaction: unknown
): Promise<{ buffer: Buffer; mimeType: string }> {
  const typed = interaction as {
    id?: string;
    output_video?: { data?: string; uri?: string; mime_type?: string } | null;
    steps?: Array<{
      type?: string;
      content?: Array<{ type?: string; data?: string; uri?: string; mime_type?: string }>;
    }>;
  };

  let videoPart = typed.output_video ?? null;
  if (!videoPart && Array.isArray(typed.steps)) {
    for (let i = typed.steps.length - 1; i >= 0; i--) {
      const step = typed.steps[i];
      if (step?.type === 'model_output' && Array.isArray(step.content)) {
        const found = step.content.find((c) => c.type === 'video');
        if (found) {
          videoPart = found;
          break;
        }
      }
    }
  }

  if (!videoPart) {
    throw new Error('The model completed without returning a video output.');
  }

  const mimeType = videoPart.mime_type || 'video/mp4';

  if (videoPart.data) {
    return {
      buffer: Buffer.from(videoPart.data, 'base64'),
      mimeType,
    };
  }

  if (videoPart.uri) {
    const apiKey = process.env.GEMINI_API_KEY?.trim() || '';
    const separator = videoPart.uri.includes('?') ? '&' : '?';
    const downloadUrl = videoPart.uri.includes('key=')
      ? videoPart.uri
      : `${videoPart.uri}${separator}key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(downloadUrl);
    if (!res.ok) {
      throw new Error(`Failed to fetch generated video artifact (${res.status}).`);
    }
    const arrayBuffer = await res.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuffer),
      mimeType,
    };
  }

  throw new Error('Generated video output did not include binary data or a downloadable URI.');
}

function formatApiError(err: unknown): { status: number; message: string; code: string; hint?: string } {
  const anyErr = err as {
    status?: number;
    statusCode?: number;
    code?: string;
    message?: string;
  };
  const rawMessage = anyErr?.message || 'Unexpected error during video generation.';
  const status = anyErr?.status || anyErr?.statusCode || 500;
  const upper = rawMessage.toUpperCase();

  if (anyErr?.code === 'API_KEY_MISSING') {
    return {
      status: 401,
      code: 'API_KEY_MISSING',
      message: rawMessage,
      hint: 'Open Settings > Secrets and configure a billing-enabled GEMINI_API_KEY.',
    };
  }
  if (status === 403 || upper.includes('PERMISSION_DENIED') || upper.includes('API_KEY_INVALID')) {
    return {
      status: 403,
      code: 'PERMISSION_DENIED',
      message: rawMessage,
      hint: 'Verify that GEMINI_API_KEY in Settings > Secrets is valid and linked to a billing-enabled project (required for gemini-omni-1.2-flash).',
    };
  }
  if (status === 429 || upper.includes('RESOURCE_EXHAUSTED') || upper.includes('QUOTA')) {
    return {
      status: 429,
      code: 'RESOURCE_EXHAUSTED',
      message: rawMessage,
      hint: 'Quota exhausted or free-tier key used. gemini-omni-1.2-flash requires a paid billing-enabled API key in Settings > Secrets.',
    };
  }
  if (status === 404 || upper.includes('NOT_FOUND')) {
    return {
      status: 404,
      code: 'NOT_FOUND',
      message: rawMessage,
      hint: 'Check model availability for gemini-omni-1.2-flash on your API key.',
    };
  }

  return {
    status: status >= 400 && status < 600 ? status : 500,
    code: anyErr?.code || 'GENERATION_FAILED',
    message: rawMessage,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '30mb' }));

  app.post('/api/generate-hologram', async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as HologramRequestBody;

      const aspectRatio: '16:9' | '9:16' = body.aspectRatio === '9:16' ? '9:16' : '16:9';
      const direction: 'clockwise' | 'counterclockwise' =
        body.direction === 'counterclockwise' ? 'counterclockwise' : 'clockwise';
      const displayMode: 'fan' | 'pyramid' | 'turntable' =
        body.displayMode === 'pyramid' || body.displayMode === 'turntable'
          ? body.displayMode
          : 'fan';
      const elevationAngle: 'eye-level' | 'slightly-elevated' | 'isometric' =
        body.elevationAngle === 'slightly-elevated' || body.elevationAngle === 'isometric'
          ? body.elevationAngle
          : 'eye-level';
      const resolution: '360p' | '720p' | '1080p' =
        body.resolution === '360p' || body.resolution === '1080p' ? body.resolution : '720p';

      const allowedDurations = new Set([
        '3s', '4s', '5s', '6s', '7s', '8s', '9s', '10s', '11s', '12s', '13s', '14s', '15s',
      ]);
      const duration = body.duration && allowedDurations.has(body.duration) ? body.duration : '10s';

      let base64Data = '';
      let mimeType = 'image/jpeg';

      if (body.useSampleAsset || !body.imageBase64) {
        if (!fs.existsSync(SAMPLE_IMAGE_PATH)) {
          res.status(404).json({
            error: 'Default studio sample image was not found on disk.',
            code: 'SAMPLE_NOT_FOUND',
          });
          return;
        }
        base64Data = fs.readFileSync(SAMPLE_IMAGE_PATH).toString('base64');
        mimeType = 'image/jpeg';
      } else {
        const cleaned = body.imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
        if (!cleaned || cleaned.length < 32) {
          res.status(400).json({
            error: 'Invalid image payload provided.',
            code: 'INVALID_IMAGE',
          });
          return;
        }
        base64Data = cleaned;
        const allowedMimes = new Set(['image/jpeg', 'image/png', 'image/webp']);
        mimeType = body.mimeType && allowedMimes.has(body.mimeType) ? body.mimeType : 'image/png';
      }

      const ai = getGenAIClient();
      const prompt = buildHologramPrompt({
        direction,
        displayMode,
        elevationAngle,
        aspectRatio,
        customNotes: body.customNotes,
      });

      const interaction = await ai.interactions.create(
        {
          model: 'gemini-omni-1.2-flash',
          input: [
            {
              type: 'image',
              mime_type: mimeType,
              data: base64Data,
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
          background: false,
          store: true,
          stream: false,
          response_format: {
            type: 'video',
            aspect_ratio: aspectRatio,
            duration,
            resolution,
          },
        },
        { timeout: 300000 }
      );

      const { buffer, mimeType: videoMimeType } = await extractVideoBuffer(interaction);
      const videoId = storeVideoBuffer(buffer, videoMimeType);

      res.json({
        id: videoId,
        interactionId: (interaction as { id?: string }).id ?? null,
        videoUrl: `/api/videos/${videoId}`,
        mimeType: videoMimeType,
        aspectRatio,
        duration,
        resolution,
        direction,
        displayMode,
        elevationAngle,
        promptUsed: prompt,
      });
    } catch (err) {
      const formatted = formatApiError(err);
      res.status(formatted.status).json({
        error: formatted.message,
        code: formatted.code,
        hint: formatted.hint,
      });
    }
  });

  app.post('/api/refine-hologram', async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as RefineRequestBody;
      if (!body.previousInteractionId || !body.instruction?.trim()) {
        res.status(400).json({
          error: 'previousInteractionId and instruction are required.',
          code: 'INVALID_REQUEST',
        });
        return;
      }

      const aspectRatio: '16:9' | '9:16' = body.aspectRatio === '9:16' ? '9:16' : '16:9';
      const resolution: '360p' | '720p' | '1080p' =
        body.resolution === '360p' || body.resolution === '1080p' ? body.resolution : '720p';
      const duration = body.duration || '10s';

      const ai = getGenAIClient();
      const interaction = await ai.interactions.create(
        {
          model: 'gemini-omni-1.2-flash',
          previous_interaction_id: body.previousInteractionId,
          input: body.instruction.trim(),
          background: false,
          store: true,
          stream: false,
          response_format: {
            type: 'video',
            aspect_ratio: aspectRatio,
            duration,
            resolution,
          },
        },
        { timeout: 300000 }
      );

      const { buffer, mimeType: videoMimeType } = await extractVideoBuffer(interaction);
      const videoId = storeVideoBuffer(buffer, videoMimeType);

      res.json({
        id: videoId,
        interactionId: (interaction as { id?: string }).id ?? null,
        videoUrl: `/api/videos/${videoId}`,
        mimeType: videoMimeType,
        aspectRatio,
        duration,
        resolution,
      });
    } catch (err) {
      const formatted = formatApiError(err);
      res.status(formatted.status).json({
        error: formatted.message,
        code: formatted.code,
        hint: formatted.hint,
      });
    }
  });

  app.get('/api/videos/:id', (req: Request, res: Response) => {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const entry = idParam ? videoStore.get(idParam) : undefined;
    if (!entry) {
      res.status(404).json({ error: 'Video not found or expired from session cache.' });
      return;
    }

    const { buffer, mimeType } = entry;
    const totalLength = buffer.length;
    const range = req.headers.range;

    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'private, max-age=3600');

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalLength - 1;

      if (Number.isNaN(start) || start >= totalLength || end >= totalLength) {
        res.status(416).setHeader('Content-Range', `bytes */${totalLength}`).end();
        return;
      }

      const chunkSize = end - start + 1;
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${totalLength}`);
      res.setHeader('Content-Length', chunkSize);
      res.end(buffer.subarray(start, end + 1));
      return;
    }

    res.setHeader('Content-Length', totalLength);
    res.end(buffer);
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HoloSpin Studio running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
