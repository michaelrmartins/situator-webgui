import { NextResponse } from 'next/server';
import { getConfig, setConfig } from '@/lib/config';
import { testDbConnection, clearDbPool } from '@/lib/db';

export async function GET() {
  try {
    const config = await getConfig();
    // Do not return the password for security reasons on GET
    const { password, ...safeConfig } = config;
    return NextResponse.json(safeConfig);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read config' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { host, port, database, user, password, webhookEnabled, webhookUrl, testOnly, type } = body;

    const currentConfig = await getConfig();

    if (type === 'webhook') {
      const newConfig = {
        ...currentConfig,
        webhookEnabled,
        webhookUrl,
      };
      await setConfig(newConfig);
      return NextResponse.json({ success: true, message: 'Webhook settings saved successfully' });
    }

    const newConfig = {
      ...currentConfig,
      host,
      port: port ? Number(port) : undefined,
      database,
      user,
      password: password || currentConfig.password,
      webhookEnabled: webhookEnabled !== undefined ? webhookEnabled : currentConfig.webhookEnabled,
      webhookUrl: webhookUrl !== undefined ? webhookUrl : currentConfig.webhookUrl,
    };

    // If testOnly is true, we just test the connection without saving
    if (testOnly) {
      try {
        const success = await testDbConnection(newConfig);
        if (success) {
          return NextResponse.json({ success: true, message: 'Connection successful!' });
        }
      } catch (err: any) {
         return NextResponse.json({ success: false, error: err.message }, { status: 400 });
      }
    }

    // Since we are changing the config, we must disconnect any existing pool
    await clearDbPool();

    // Verify the new connection before saving
    try {
      await testDbConnection(newConfig);
    } catch (err: any) {
      return NextResponse.json({ success: false, error: 'Connection failed: ' + err.message }, { status: 400 });
    }

    await setConfig(newConfig);
    
    return NextResponse.json({ success: true, message: 'Settings saved successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
