import { NextResponse } from 'next/server';

import { getWebRuntimeSummary } from '@/src/lib/runtime';

export function GET() {
  return NextResponse.json(getWebRuntimeSummary());
}
