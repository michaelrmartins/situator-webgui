import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  
  if (!url) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch image');
    
    const blob = await res.blob();
    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': blob.type,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('Image proxy failed', error);
    return new NextResponse('Error fetching image', { status: 500 });
  }
}
