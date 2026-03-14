import { NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';
import { PERSON_HISTORY_QUERY } from '@/lib/queries';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    
    if (!id) {
       return NextResponse.json({ error: 'Person ID is required' }, { status: 400 });
    }

    // Safety limit
    const safeLimit = Math.min(limit, 100);

    const pool = await getDbPool();
    const result = await pool.query(PERSON_HISTORY_QUERY, [id, safeLimit]);
    
    return NextResponse.json(result.rows);
  } catch (error: any) {
    if (error.message.includes('not configured')) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 400 });
    }
    console.error("Database query failed", error);
    return NextResponse.json({ error: 'Failed to fetch person history' }, { status: 500 });
  }
}
