import { Pool } from 'pg';
import { getConfig } from './config';

let pool: Pool | null = null;

export async function getDbPool() {
  if (pool) {
    return pool;
  }

  const config = await getConfig();

  if (!config.host || !config.database || !config.user || !config.password) {
    throw new Error('Database credentials are incomplete or not configured.');
  }

  pool = new Pool({
    host: config.host,
    port: config.port ? Number(config.port) : 5432,
    database: config.database,
    user: config.user,
    password: config.password,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  return pool;
}

export async function clearDbPool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export async function testDbConnection(testConfig?: any) {
  let testPool: Pool;
  
  if (testConfig) {
    testPool = new Pool({
      host: testConfig.host,
      port: testConfig.port ? Number(testConfig.port) : 5432,
      database: testConfig.database,
      user: testConfig.user,
      password: testConfig.password,
      connectionTimeoutMillis: 3000, // Short timeout for testing
    });
  } else {
    try {
      testPool = await getDbPool();
    } catch (err) {
      throw err;
    }
  }

  try {
    const client = await testPool.connect();
    client.release();
    if (testConfig) {
      await testPool.end();
    }
    return true;
  } catch (error) {
    if (testConfig) {
      await testPool.end();
    }
    throw error;
  }
}
