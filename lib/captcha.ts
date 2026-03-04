interface TurnstileVerificationResponse {
  success: boolean;
  'error-codes'?: string[];
  action?: string;
}

interface VerifyCaptchaInput {
  token: string;
  headers: Headers;
  expectedAction?: string;
}

interface VerifyCaptchaResult {
  success: boolean;
  status: number;
  message: string;
}

export function getClientIpFromHeaders(headers: Headers): string | null {
  const xForwardedFor = headers.get('x-forwarded-for');
  if (xForwardedFor) {
    const first = xForwardedFor.split(',')[0]?.trim();
    if (first) return first;
  }

  const xRealIp = headers.get('x-real-ip');
  if (xRealIp?.trim()) return xRealIp.trim();

  return null;
}

export async function verifyInvisibleCaptcha({
  token,
  headers,
  expectedAction,
}: VerifyCaptchaInput): Promise<VerifyCaptchaResult> {
  const secret = (process.env.TURNSTILE_SECRET_KEY || '').trim();
  const siteKey = (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '').trim();
  const siteKeyValid = /^0x[0-9A-Za-z_-]{20,}$/.test(siteKey);

  if (!secret || !siteKey || !siteKeyValid) {
    return {
      success: true,
      status: 200,
      message: 'Captcha not configured.',
    };
  }

  const normalizedToken = (token || '').trim();

  if (!normalizedToken || normalizedToken.length < 20) {
    return {
      success: false,
      status: 400,
      message: 'Security check failed. Please retry.',
    };
  }

  const body = new URLSearchParams({
    secret,
    response: normalizedToken,
  });

  const ip = getClientIpFromHeaders(headers);
  if (ip) {
    body.set('remoteip', ip);
  }

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
      cache: 'no-store',
    });

    if (!response.ok) {
      return {
        success: false,
        status: 502,
        message: 'Security check failed. Please retry.',
      };
    }

    const data = (await response.json()) as TurnstileVerificationResponse;
    if (!data.success) {
      return {
        success: false,
        status: 400,
        message: 'Security check failed. Please retry.',
      };
    }

    if (expectedAction && data.action && data.action !== expectedAction) {
      return {
        success: false,
        status: 400,
        message: 'Security check failed. Please retry.',
      };
    }

    return {
      success: true,
      status: 200,
      message: 'ok',
    };
  } catch (error) {
    console.error('[Captcha] Verification error:', error);
    return {
      success: false,
      status: 502,
      message: 'Security check failed. Please retry.',
    };
  }
}
