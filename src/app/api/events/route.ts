import { NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';
import { LIVE_EVENTS_QUERY } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const search = searchParams.get('search') || '';
    
    // Safety limit
    const safeLimit = Math.min(limit, 1000);

    const pool = await getDbPool();
    const result = await pool.query(LIVE_EVENTS_QUERY, [search, safeLimit, offset]);
    
    return NextResponse.json(result.rows);
  } catch (error: any) {
    if (error.message.includes('not configured')) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 400 });
    }
    console.error("Database query failed", error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}
