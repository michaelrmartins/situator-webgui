import { NextResponse } from 'next/server';
import dns from 'dns';

// Fix for Node.js fetch failing to resolve .local domains by preferring IPv4
dns.setDefaultResultOrder('ipv4first');

// Allow self-signed certificates for webhook proxy
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export async function POST(request: Request) {
  try {
    const { url, payload } = await request.json();

    if (!url || !payload) {
      return NextResponse.json({ success: false, error: 'Missing url or payload' }, { status: 400 });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return NextResponse.json({ success: false, error: 'Webhook target returned error: ' + response.statusText }, { status: response.status });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Webhook fetch error:', error);
    const errorMessage = error.cause?.message || error.message;
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
