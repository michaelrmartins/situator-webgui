import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const document = req.nextUrl.searchParams.get('document');

  if (!document) {
    return new NextResponse(null, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(`http://192.168.55.9:4000/api/v1/alunos/${encodeURIComponent(document)}`, {
      signal: controller.signal,
      cache: 'no-store',
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.log('Lyceum API unavailable');
      return new NextResponse(null, { status: 204 });
    }

    const body = await res.json();
    const data = body?.data;

    if (!data) {
      return new NextResponse(null, { status: 204 });
    }

    return NextResponse.json({
      nome_curso: data.nome_curso ?? null,
      nome_serie: data.nome_serie ?? null,
    });
  } catch {
    console.log('Lyceum API unavailable');
    return new NextResponse(null, { status: 204 });
  }
}
