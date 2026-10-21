import { NextResponse, NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

const CONFIG_FILE = path.join(process.cwd(), '.xrwa-config.json');

export async function GET() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8');
      return NextResponse.json(JSON.parse(data));
    }
  } catch (e) {}
  return NextResponse.json({ success: true, message: 'Default configuration' });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const incomingUpdatedAt = body.updatedAt || Date.now();

    // Concurrency control: check existing file timestamp
    if (fs.existsSync(CONFIG_FILE)) {
      try {
        const existingData = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        const existingUpdatedAt = existingData.updatedAt || 0;
        if (existingUpdatedAt && incomingUpdatedAt < existingUpdatedAt) {
          return NextResponse.json({
            success: false,
            error: 'Conflict: A newer configuration was saved on another device. Please refresh to load the latest settings.'
          }, { status: 409 });
        }
      } catch (e) {}
    }

    const payload = {
      ...body,
      updatedAt: incomingUpdatedAt
    };

    const dir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(CONFIG_FILE, JSON.stringify(payload, null, 2), 'utf8');
    return NextResponse.json({ success: true, message: 'Configuration successfully saved and synchronized across devices.', updatedAt: incomingUpdatedAt });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Failed to save configuration' }, { status: 500 });
  }
}
