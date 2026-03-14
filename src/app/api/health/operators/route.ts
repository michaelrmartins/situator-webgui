import { NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';

export async function GET() {
  const pool = await getDbPool();

  try {
    // 1. Operator Productivity (EventId IN 1, 2)
    const productivityResult = await pool.query(`
      SELECT 
        userprofile."Name" as "UserName",
        COUNT(a."Id") as "ActivityCount"
      FROM "Audit" a
      LEFT JOIN "UserProfile" userprofile ON a."UserProfileId" = userprofile."Id"
      WHERE a."EventId" IN (1, 2) 
        AND userprofile."Name" NOT LIKE 'Sistema'
        AND a."Date" >= NOW() - INTERVAL '30 days'
      GROUP BY userprofile."Name"
      ORDER BY "ActivityCount" DESC
      LIMIT 10
    `);

    // We might need to get user names. In Audit we have "Message" or UserProfileId.
    // The previous selects showed EventId=1, EntityId=20 for User creation ("Cadastrou o usuário 'michael'"). 
    // Usually, UserProfileId corresponds to the ID in the "UserProfile" or "User" table, but we don't have exactly the table name.
    // However, for this MVP we can just display the ID in the UI if we don't know the exact name, or try to fetch it if we knew the schema. Let's return the counts.

    // 2. Auditoria de Falhas de Permissão
    // Sync failures usually have EventId = 4 and EntityId = 63 and Message LIKE '%Falha ao realizar a sincronização%'
    const syncFailuresResult = await pool.query(`
      SELECT 
        a."Id",
        a."Date",
        a."UserProfileId",
        a."Message"
      FROM "Audit" a
      WHERE a."EventId" = 4 
        AND a."EntityId" = 63 
        AND a."Message" LIKE '%Falha ao realizar a sincroniza%'
        AND a."Date" >= NOW() - INTERVAL '7 days'
      ORDER BY a."Date" DESC
      LIMIT 20
    `);

    return NextResponse.json({
      productivity: productivityResult.rows,
      syncFailures: syncFailuresResult.rows,
    });
  } catch (error) {
    console.error('Error fetching operations health stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch operations health stats' },
      { status: 500 }
    );
  }
}
