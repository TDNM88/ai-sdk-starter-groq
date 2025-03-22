import { NextResponse } from 'next/server';
import { cleanupTempFiles } from '@/lib/utils';

export async function POST() {
  try {
    cleanupTempFiles();
    return NextResponse.json({ success: true, message: "Temporary files cleaned up" });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
} 