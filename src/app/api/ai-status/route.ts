import { NextResponse } from 'next/server';
import { getGeminiClient, isAIEnabled, getActiveModel, AVAILABLE_MODELS } from '@/lib/gemini';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;
  const hasKey = Boolean(apiKey && apiKey !== 'your-api-key-here' && apiKey.trim().length > 10);
  const keyPreview = hasKey ? `${apiKey!.substring(0, 4)}...${apiKey!.slice(-4)}` : '';
  const currentModel = getActiveModel();

  return NextResponse.json({
    enabled: isAIEnabled(),
    model: currentModel,
    availableModels: AVAILABLE_MODELS,
    hasKey,
    keyPreview,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { apiKey, model } = body;

    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 10) {
      return NextResponse.json(
        { error: 'Invalid API key format. Please provide a valid Gemini API key.' },
        { status: 400 }
      );
    }

    const trimmedKey = apiKey.trim();
    const targetModel = model && typeof model === 'string' ? model.trim() : getActiveModel();

    // Verify the key by making a test call with the chosen model
    const { GoogleGenAI } = await import('@google/genai');
    const testClient = new GoogleGenAI({ apiKey: trimmedKey });

    try {
      const testRes = await testClient.models.generateContent({
        model: targetModel,
        contents: 'Ping: verify API connection. Respond with "PONG".',
      });

      if (!testRes.text) {
        return NextResponse.json(
          { error: `Gemini API connection test with model ${targetModel} did not return valid text.` },
          { status: 502 }
        );
      }
    } catch (testErr: any) {
      console.error(`Gemini API test call failed with model ${targetModel}:`, testErr);
      return NextResponse.json(
        { error: `Gemini API verification failed for ${targetModel}: ${testErr.message || 'Authentication error'}` },
        { status: 401 }
      );
    }

    // Key & Model are verified! Update process.env and persist to .env.local
    process.env.GEMINI_API_KEY = trimmedKey;
    process.env.GEMINI_MODEL = targetModel;

    try {
      const envPath = path.join(process.cwd(), '.env.local');
      let envContent = '';
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
      }

      if (envContent.includes('GEMINI_API_KEY=')) {
        envContent = envContent.replace(/GEMINI_API_KEY=.*/, `GEMINI_API_KEY=${trimmedKey}`);
      } else {
        envContent += `\nGEMINI_API_KEY=${trimmedKey}\n`;
      }

      if (envContent.includes('GEMINI_MODEL=')) {
        envContent = envContent.replace(/GEMINI_MODEL=.*/, `GEMINI_MODEL=${targetModel}`);
      } else {
        envContent += `GEMINI_MODEL=${targetModel}\n`;
      }

      fs.writeFileSync(envPath, envContent, 'utf8');
    } catch (fsErr) {
      console.warn('Could not persist key/model to .env.local file directly:', fsErr);
    }

    return NextResponse.json({
      success: true,
      message: `Gemini API key verified and activated successfully with model ${targetModel}!`,
      model: targetModel,
    });
  } catch (error: any) {
    console.error('Error configuring AI status:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
