import { NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const pool = await getDbPool();
  
  try {
    // 1. Top Quedas de Conexão (EventId = 11)
    const instabilitiesResult = await pool.query(`
      SELECT 
        s."Name" as "ServerName",
        s."Id" as "ServerId",
        COUNT(o."Id") as "DisconnectionCount",
        AVG(o."Duration") as "AvgDowntimeSeconds"
      FROM "Occurrence" o
      INNER JOIN "Server" s ON o."ServerId" = s."Id"
      WHERE o."EventId" = 11 AND o."CreateDate" >= NOW() - INTERVAL '30 days'
      GROUP BY s."Id", s."Name"
      ORDER BY "DisconnectionCount" DESC
      LIMIT 10
    `);

    // 2. Apagões Médios por Servidor e Global (Downtime Médio de Dispositivos na última semana)
    const downtimeGlobalResult = await pool.query(`
      SELECT 
        AVG(o."Duration") as "GlobalAvgDowntimeSeconds"
      FROM "Occurrence" o
      WHERE o."EventId" = 11 AND o."CreateDate" >= NOW() - INTERVAL '30 days'
    `);

    // 3. Gargalos de Sincronização (Demoras maiores ou ordenadas por duração)
    const syncBottlenecksResult = await pool.query(`
      SELECT 
        s."Id",
        server."Name" as "ServerName",
        s."Started",
        s."Ended",
        s."Duration",
        s."Status"
      FROM "Synchronization" s
      LEFT JOIN "Server" server ON s."ServerId" = server."Id"
      WHERE s."Started" >= NOW() - INTERVAL '30 days'
      ORDER BY s."Duration" DESC
      LIMIT 10
    `);

    return NextResponse.json({
      instabilities: instabilitiesResult.rows,
      globalAvgDowntime: downtimeGlobalResult.rows[0]?.GlobalAvgDowntimeSeconds || 0,
      syncBottlenecks: syncBottlenecksResult.rows,
    });
  } catch (error) {
    console.error('Error fetching hardware health stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hardware health stats' },
      { status: 500 }
    );
  }
}
