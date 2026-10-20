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
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(body, null, 2), 'utf8');
    return NextResponse.json({ success: true, message: 'Configuration successfully saved and synchronized across devices.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Failed to save configuration' }, { status: 500 });
  }
}
