import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const ACUMATICA_URL = 'https://acumatica.sunartha.co.id/PLNSCCheck/entity'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-acumatica-session',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  try {
    const url = new URL(req.url)
    const targetPath = url.pathname.replace(/^.*\/acumatica-proxy\/entity/, '')
    const isLogin = targetPath === '/auth/login'
    const isLogout = targetPath === '/auth/logout'

    // ✅ Client kirim cookie (base64) via header, kita decode langsung
    const sessionHeader = req.headers.get('x-acumatica-session')
    const savedCookie = sessionHeader
      ? atob(sessionHeader)  // decode base64 → cookie string asli
      : undefined

    const finalUrl = `${ACUMATICA_URL}${targetPath}`
    console.log('[Proxy] →', req.method, finalUrl)

    const acuResponse = await fetch(finalUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...(savedCookie && { 'Cookie': savedCookie }),
      },
      body: req.method !== 'GET' ? await req.text() : undefined,
    })

    // ✅ Login: parse cookie, return sebagai base64 ke client
    if (isLogin) {
      if (!acuResponse.ok) {
        const body = await acuResponse.text()
        return new Response(JSON.stringify({ error: `Login failed: ${acuResponse.status}`, detail: body }), {
          status: acuResponse.status,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        })
      }

      const raw = acuResponse.headers.get('set-cookie') || ''
      console.log('[Login] set-cookie raw:', raw)

      // Acumatica sering kirim multiple Set-Cookie sebagai header terpisah
      // Deno fetch menggabungkan dengan ", " — kita ambil 2 bagian penting
      const parts = raw.split(/,(?=\s*\.)|\s*,\s*(?=[A-Z])/)  // split antar cookie
      const sessionId = parts.find(c => c.includes('ASP.NET_SessionId='))
        ?.split(';')[0].trim()
      const aspxAuth = parts.find(c => c.includes('.ASPXAUTH='))
        ?.split(';')[0].trim()

      if (!sessionId || !aspxAuth) {
        console.error('[Login] Cookie tidak ditemukan! raw:', raw)
        return new Response(JSON.stringify({ error: 'Cookie not found in login response' }), {
          status: 500,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        })
      }

      const cookieString = `${sessionId}; ${aspxAuth}`
      // ✅ Encode ke base64 agar aman dikirim sebagai header
      const sessionToken = btoa(cookieString)
      console.log('[Login] cookieString:', cookieString)

      return new Response(JSON.stringify({ sessionToken }), {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    // Logout: tidak perlu hapus store, cukup acknowledge
    if (isLogout) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    // ✅ Forward response lain dari Acumatica
    const text = await acuResponse.text()
    console.log('[Proxy] Acumatica status:', acuResponse.status, '| body:', text.slice(0, 200))

    return new Response(text || JSON.stringify({ ok: true }), {
      status: acuResponse.status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('[Proxy] Error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
})