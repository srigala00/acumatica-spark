// Vercel Serverless Function for Acumatica Proxy
// Auto-deployed dengan frontend!

import type { VercelRequest, VercelResponse } from '@vercel/node';

const ACUMATICA_BASE_URL = 'https://erp.plnsc.co.id/PLNSCUpgradeTest';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cookie');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Get path from URL
    const path = req.url?.replace('/api/acumatica-proxy', '') || '';
    const targetUrl = `${ACUMATICA_BASE_URL}${path}`;

    console.log(`[Proxy] ${req.method} ${path} -> ${targetUrl}`);

    // Prepare headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (req.headers.cookie) {
      headers['Cookie'] = req.headers.cookie as string;
    }

    // Make request
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
    });

    const data = await response.text();
    const setCookie = response.headers.get('set-cookie');

    if (setCookie) {
      res.setHeader('Set-Cookie', setCookie);
    }

    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json');
    return res.status(response.status).send(data);
  } catch (error: any) {
    console.error('[Proxy Error]', error);
    return res.status(500).json({
      error: 'Proxy error',
      message: error.message,
    });
  }
}
