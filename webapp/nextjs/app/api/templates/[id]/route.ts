import { NextResponse } from 'next/server';
import type { ErrorResponse, PressReleaseTemplate } from '@/lib/types';

const BACKEND_API_URL = process.env.PYTHON_API_URL ?? 'http://127.0.0.1:8080';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!/^\d+$/.test(id) || Number.parseInt(id, 10) <= 0) {
    return NextResponse.json(
      { code: 'INVALID_ID', message: 'Invalid ID' } satisfies ErrorResponse,
      { status: 400 }
    );
  }

  try {
    const response = await fetch(`${BACKEND_API_URL}/templates/${id}`, {
      cache: 'no-store',
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
    console.error('Template detail proxy error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Internal server error' } satisfies ErrorResponse,
      { status: 500 }
    );
  }
}
