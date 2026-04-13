const ACUMATICA_URL = 'https://acumatica.sunartha.co.id/PLNSCCheck/entity'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-acumatica-session, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const targetPath = url.pathname.replace(/^.*\/acumatica-proxy\/entity/, '')
    const isLogin = targetPath === '/auth/login'
    const isLogout = targetPath === '/auth/logout'

    // Client sends cookie (base64) via header, decode it
    const sessionHeader = req.headers.get('x-acumatica-session')
    const savedCookie = sessionHeader ? atob(sessionHeader) : undefined

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

    // Login: parse cookie, return as base64 to client
    if (isLogin) {
      if (!acuResponse.ok) {
        const body = await acuResponse.text()
        return new Response(JSON.stringify({ error: `Login failed: ${acuResponse.status}`, detail: body }), {
          status: acuResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const raw = acuResponse.headers.get('set-cookie') || ''
      console.log('[Login] set-cookie raw:', raw)

      const parts = raw.split(/,(?=\s*\.)|\s*,\s*(?=[A-Z])/)
      const sessionId = parts.find(c => c.includes('ASP.NET_SessionId='))
        ?.split(';')[0].trim()
      const aspxAuth = parts.find(c => c.includes('.ASPXAUTH='))
        ?.split(';')[0].trim()

      if (!sessionId || !aspxAuth) {
        console.error('[Login] Cookie tidak ditemukan! raw:', raw)
        return new Response(JSON.stringify({ error: 'Cookie not found in login response' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const cookieString = `${sessionId}; ${aspxAuth}`
      const sessionToken = btoa(cookieString)
      console.log('[Login] cookieString:', cookieString)

      return new Response(JSON.stringify({ sessionToken }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Logout
    if (isLogout) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Forward other responses from Acumatica
    const text = await acuResponse.text()
    console.log('[Proxy] Acumatica status:', acuResponse.status, '| body:', text.slice(0, 200))

    return new Response(text || JSON.stringify({ ok: true }), {
      status: acuResponse.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('[Proxy] Error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
