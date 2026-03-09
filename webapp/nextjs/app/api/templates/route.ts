import { NextRequest, NextResponse } from 'next/server';
import type {
  ErrorResponse,
  PressReleaseTemplate,
  PressReleaseTemplateSummary,
} from '@/lib/types';

const BACKEND_API_URL = process.env.PYTHON_API_URL ?? 'http://127.0.0.1:8080';

type TemplateCreatePayload = {
  name: string;
  title: string;
  content: string;
};

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_API_URL}/templates`, {
      cache: 'no-store',
    });
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        data satisfies ErrorResponse,
        { status: response.status }
      );
    }

    return NextResponse.json(data satisfies PressReleaseTemplateSummary[]);
  } catch (error) {
    console.error('Template list proxy error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Internal server error' } satisfies ErrorResponse,
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  let payload: TemplateCreatePayload;

  try {
    payload = (await request.json()) as TemplateCreatePayload;
  } catch {
    return NextResponse.json(
      { code: 'INVALID_JSON', message: 'Invalid JSON' } satisfies ErrorResponse,
      { status: 400 }
    );
  }

  try {
    const response = await fetch(`${BACKEND_API_URL}/templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        data satisfies ErrorResponse,
        { status: response.status }
      );
    }

    return NextResponse.json(data satisfies PressReleaseTemplate);
  } catch (error) {
    console.error('Template create proxy error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Internal server error' } satisfies ErrorResponse,
      { status: 500 }
    );
  }
}
