import { NextRequest } from 'next/server';
import { nanoid } from 'nanoid';
import { renderHtml } from '@/lib/htmlTemplate';
import { htmlToImagePdf } from '@/lib/pdf';
import { assertTemplateName, assertToken, redactToken } from '@/lib/security';
import { normalizePayload } from '@/lib/payload';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const allowDataEndpoint = (process.env.ALLOW_HAOUTEST_DATA ?? 'true').toLowerCase() !== 'false';

export async function POST(request: NextRequest) {
  if (!allowDataEndpoint) {
    return Response.json({ message: 'haoutest 数据直传已禁用' }, { status: 403 });
  }

  const requestId = nanoid(8);
  try {
    const body = (await request.json()) as {
      templateName?: string;
      data?: Record<string, unknown>;
      token?: string;
    };

    const templateName = body.templateName?.trim() ?? '';
    assertTemplateName(templateName);

    const tokenRaw = body.token?.trim() || 'haoutest-data';
    if (tokenRaw !== 'haoutest-data') {
      assertToken(tokenRaw);
    }

    if (!body.data || typeof body.data !== 'object' || Array.isArray(body.data)) {
      throw new Error('data 字段必须是对象');
    }

    const payload = normalizePayload(body.data as Record<string, unknown>);
    const ip = extractIp(request);
    const ua = request.headers.get('user-agent') ?? 'unknown';
    const requestTime = new Date().toISOString();
    const redactedToken = redactToken(tokenRaw);

    const html = await renderHtml({
      templateName,
      payload: {
        ...payload,
        __request: {
          id: requestId,
          ip,
          ua,
          time: requestTime,
          mode: 'haoutest-data'
        },
        __token: redactedToken
      },
      meta: {
        token: redactedToken,
        requestId,
        requestTime
      }
    });

    const pdf = await htmlToImagePdf(html, {
      token: tokenRaw,
      requestId,
      userAgent: ua,
      ip,
      timestamp: requestTime
    });

    return new Response(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${templateName}-${requestId}.pdf"`,
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    console.error(`[${requestId}] haoutest render error`, error);
    const message = error instanceof Error ? error.message : '未知错误';
    return Response.json({ requestId, message }, { status: /模板/.test(message) ? 400 : 422 });
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
