import { NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';
import { DOORS_TODAY_QUERY, HOURLY_ACCESS_QUERY, DAILY_ACCESS_QUERY, AUTHORIZATION_STATS_QUERY, RFID_STATS_QUERY, NO_RFID_ACCESS_QUERY } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    
    // Time in Situator is in milliseconds
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');
    
    // Default to today if not provided
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfDay = now.getTime(); // up to now
    
    const startTimeStamp = startParam ? parseInt(startParam, 10) : startOfDay;
    const endTimeStamp = endParam ? parseInt(endParam, 10) : endOfDay;

    const pool = await getDbPool();

    let result;
    switch (type) {
        case 'doors':
            result = await pool.query(DOORS_TODAY_QUERY, [startTimeStamp, endTimeStamp]);
            break;
        case 'hourly':
            result = await pool.query(HOURLY_ACCESS_QUERY, [startTimeStamp, endTimeStamp]);
            break;
        case 'daily':
            result = await pool.query(DAILY_ACCESS_QUERY, [startTimeStamp, endTimeStamp]);
            break;
        case 'auth':
            result = await pool.query(AUTHORIZATION_STATS_QUERY, [startTimeStamp, endTimeStamp]);
            break;
        case 'rfid':
            result = await pool.query(RFID_STATS_QUERY, [startTimeStamp, endTimeStamp]);
            break;
        case 'no-rfid':
            result = await pool.query(NO_RFID_ACCESS_QUERY, [startTimeStamp, endTimeStamp]);
            break;
        default:
            return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }
    
    return NextResponse.json(result.rows);
  } catch (error: any) {
    if (error.message.includes('not configured')) {
        return NextResponse.json({ error: 'Database not configured' }, { status: 400 });
    }
    console.error("Database query failed", error);
    return NextResponse.json({ error: 'Failed to fetch reports: ' + error.message }, { status: 500 });
  }
}
