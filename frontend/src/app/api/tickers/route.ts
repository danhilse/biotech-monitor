// src/app/api/tickers/route.ts
import { NextResponse } from 'next/server';
import path from 'path';
import { spawn } from 'child_process';

const PYTHON_SCRIPT_PATH = path.join(process.cwd(), '../backend/scripts/manage_tickers.py');

async function runPythonScript(action: string, params: Record<string, string>) {
  return new Promise((resolve, reject) => {
    const args = [PYTHON_SCRIPT_PATH, action, JSON.stringify(params)];
    const pythonProcess = spawn('python', args);
    
    let result = '';
    let error = '';

    pythonProcess.stdout.on('data', (data) => {
      result += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(error || 'Python script failed'));
      } else {
        try {
          resolve(JSON.parse(result));
        } catch {
          resolve(result);
        }
      }
    });
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (query) {
    try {
      const results = await runPythonScript('search', { query });
      return NextResponse.json({ results });
    } catch (error) {
      return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }
  } else {
    try {
      const results = await runPythonScript('list', {});
      return NextResponse.json({ results });
    } catch (error) {
      return NextResponse.json({ error: 'Failed to get tickers' }, { status: 500 });
    }
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { symbol } = body;
    
    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    const result = await runPythonScript('add', { symbol });
    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add ticker' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { symbol } = body;
    
    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    const result = await runPythonScript('remove', { symbol });
    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to remove ticker' }, { status: 500 });
  }
}