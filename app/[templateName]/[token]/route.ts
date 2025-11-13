import { NextRequest } from 'next/server';
import { nanoid } from 'nanoid';
import { fetchBuilderData, RemoteDataError } from '@/lib/fetchBuilderData';
import { renderHtml } from '@/lib/htmlTemplate';
import { htmlToImagePdf } from '@/lib/pdf';
import { assertTemplateName, assertToken, redactToken } from '@/lib/security';
import { normalizePayload } from '@/lib/payload';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type RouteParams = { templateName: string; token: string };

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  const requestId = nanoid(8);
  try {
    const resolvedParams = await params;
    const templateName = decodeURIComponent(resolvedParams.templateName);
    const token = decodeURIComponent(resolvedParams.token);
    assertTemplateName(templateName);
    assertToken(token);
    const ip = extractIp(request);
    const ua = request.headers.get('user-agent') ?? 'unknown';
    const requestTime = new Date().toISOString();

    const { data } = await fetchBuilderData(token);
    const normalized = normalizePayload(data as Record<string, unknown>);
    const html = await renderHtml({
      templateName,
      payload: {
        ...normalized,
        __request: {
          id: requestId,
          ip,
          ua,
          time: requestTime
        },
        __token: redactToken(token)
      },
      meta: {
        token: redactToken(token),
        requestId,
        requestTime
      }
    });

    const pdf = await htmlToImagePdf(html, {
      token,
      requestId,
      userAgent: ua,
      ip,
      timestamp: requestTime
    });

    return new Response(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${templateName}-${requestId}.pdf"`,
        'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer'
      }
    });
  } catch (error) {
    return createErrorResponse(error, requestId);
  }
}

function extractIp(request: NextRequest) {
  const header = request.headers.get('x-forwarded-for');
  if (header) {
    return header.split(',')[0]?.trim() ?? 'unknown';
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}

function createErrorResponse(error: unknown, requestId: string) {
  console.error(`[${requestId}] render error`, error);
  if (error instanceof RemoteDataError) {
    return Response.json(
      { requestId, message: error.message },
      { status: error.status ?? 502 }
    );
  }
  if (error instanceof Error) {
    const status = /模板/.test(error.message) ? 400 : 500;
    return Response.json(
      {
        requestId,
        message: error.message
      },
      { status }
    );
  }
  return Response.json({ requestId, message: 'Unknown error' }, { status: 500 });
}
