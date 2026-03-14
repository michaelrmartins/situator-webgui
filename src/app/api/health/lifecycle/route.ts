import { NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';

export async function GET() {
  const pool = await getDbPool();

  try {
    // 1. Credential Expirations Timeline (churn)
    const expirationsResult = await pool.query(`
      SELECT 
        DATE(a."Date") as "EventDate",
        COUNT(a."Id") as "ExpirationCount"
      FROM "Audit" a
      WHERE a."Message" LIKE '%expirou%' 
        AND a."Date" >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(a."Date")
      ORDER BY "EventDate" ASC
    `);

    return NextResponse.json({
      expirationsTimeline: expirationsResult.rows,
    });
  } catch (error) {
    console.error('Error fetching credential lifecycle stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch credential lifecycle stats' },
      { status: 500 }
    );
  }
}
