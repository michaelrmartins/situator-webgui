import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const document = req.nextUrl.searchParams.get('document');

  if (!document) {
    return new NextResponse(null, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(`http://192.168.55.9:8082/api/trabalhadores/${encodeURIComponent(document)}`, {
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        'Authorization': 'Basic ' + btoa('admin:fth67jil'),
      },
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.log('Nasajon API unavailable');
      return new NextResponse(null, { status: 204 });
    }

    const data = await res.json();

    if (!data || !data.departamento) {
      return new NextResponse(null, { status: 204 });
    }

    return NextResponse.json({
      departamento: data.departamento,
    });
  } catch {
    console.log('Nasajon API unavailable');
    return new NextResponse(null, { status: 204 });
  }
}
