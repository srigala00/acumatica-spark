// Acumatica API Integration Service

// Use proxy to avoid CORS issues based on environment
// const getProxyUrl = () => {
//   // Development mode - use Vite proxy
//   if (import.meta.env.DEV) {
//     // console.log('[Acumatica] Using Vite dev proxy');
//     // return '/acumatica-api/entity';
    
//     const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/acumatica-proxy/entity`;
//     console.log('[Acumatica] Using Supabase Edge Function:', url);
//     return url;
//   }

//   // Production - use Supabase Edge Function (Lovable deployment)
//   if (import.meta.env.VITE_SUPABASE_URL) {
//     const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/acumatica-proxy/entity`;
//     console.log('[Acumatica] Using Supabase Edge Function:', url);
//     return url;
//   }

//   // Fallback - this will fail with CORS
//   console.error('[Acumatica] No proxy configured! Set VITE_SUPABASE_URL or deploy Edge Function');
//   return 'https://erp.plnsc.co.id/PLNSCUpgradeTest/entity';
// };

// const ACUMATICA_BASE_URL = getProxyUrl();
const ACUMATICA_BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/acumatica-proxy/entity`;

const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

interface AcumaticaLoginResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
}

interface AcumaticaProduct {
  InventoryID: { value: string };
  Qty: { value: number };
  UnitPrice: { value: number };
  TransactionDescription: { value: string };
  Warehouse: { value: string };
}

interface AcumaticaOpportunity {
  ClassID: { value: string };
  BusinessAccount: { value: string };
  Subject: { value: string };
  EstimatedCloseDate: { value: string };
  PreDoDate: { value: string };
  PreDoNbr: { value: string };
  OpportunitySource: { value: string };
  PurchasingMethod: { value: string };
  Owner: { value: string };
  Products: AcumaticaProduct[];
}

class AcumaticaService {
  private cookie: string | null = null;

  /**
   * Get headers with Supabase auth for Edge Function
   */
//   private getHeaders(additionalHeaders?: Record<string, string>): Record<string, string> {
//     // const headers: Record<string, string> = {
//     //   'Content-Type': 'application/json',
//     //   ...additionalHeaders,
//     // };

//     // Add Supabase auth if using Edge Function (production)
//     // if (!import.meta.env.DEV && import.meta.env.VITE_SUPABASE_PUBLISHABLE_BearerAPIKey) {
//     //   headers['Authorization'] = `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_BearerAPIKey}`;
//     //   headers['apikey'] = import.meta.env.VITE_SUPABASE_PUBLISHABLE_BearerAPIKey;
//     // }
// const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

//   const headers: Record<string, string> = {
//     'Content-Type': 'application/json',
//     ...(supabaseAnonKey && {
//       'Authorization': `Bearer ${supabaseAnonKey}`,
//       'apikey': supabaseAnonKey,
//     }),
//     ...additionalHeaders,
//   };
//     return headers;
//   }
  private sessionToken: string | null = null;

  /**
   * FIX 4: getHeaders() dikembalikan — tidak di-comment
   * Selalu sertakan Authorization + apikey untuk Supabase Edge Function
   * Di mode dev (Vite proxy), header ini diabaikan otomatis
   */
  private getHeaders(extra?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      // Supabase Edge Function wajib Authorization + apikey
      ...(SUPABASE_ANON_KEY && {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      }),
      // FIX 5: Kirim session token ke Edge Function via custom header
      //        (bukan Cookie langsung — browser block cross-origin set-cookie)
      ...(this.sessionToken && {
        'x-acumatica-session': this.sessionToken,
      }),
      ...extra,
    };
    return headers;
  }
  /**
   * Login to Acumatica
   */
  async login(): Promise<boolean> {
  try {
    const response = await fetch(`${ACUMATICA_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        name: 'admin',
        password: 'Demo1234',
        company: 'PLNSC',
        branch: 'PLNSC',
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Login failed: ${response.status} ${body}`);
    }

    const data = await response.json();
    
    if (!data?.sessionToken) {
      throw new Error('Login response missing sessionToken');
    }
    
    // sessionToken sekarang = base64(cookie) — langsung simpan & kirim balik
    this.sessionToken = data.sessionToken;
    console.log('[Acumatica] Login sukses, sessionToken diterima');
    return true;
    
  } catch (error) {
    console.error('[Acumatica] login error:', error);
    throw error;
  }
}
  /**
   * Create Opportunity in Acumatica
   */
  async createOpportunity(data: AcumaticaOpportunity): Promise<any> {
    if (!this.sessionToken) await this.login();

    const response = await fetch(`${ACUMATICA_BASE_URL}/EcomercePLNSC/25.200.001/Opportunity`,
    {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    }
  );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Create opportunity failed: ${response.status} - ${err}`);
    }
    return response.json();
  }

  /** Logout */
 async logout(): Promise<void> {
  if (!this.sessionToken) return;
  try {
    await fetch(`${ACUMATICA_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    // Tidak perlu parse response sama sekali
  } catch (e) {
    console.warn('[Acumatica] logout warning:', e);
  } finally {
    this.sessionToken = null;
  }
}

  /** Full flow: Login → Create → Logout */
  async submitOrder(
    businessAccount: string,
    subject: string,
    products: Array<{
      inventoryId: string;
      qty: number;
      unitPrice: number;
      description: string;
      warehouse?: string;
    }>,
    options?: {
      estimatedCloseDate?: string;
      preDoDate?: string;
      preDoNbr?: string;
      opportunitySource?: string;
      purchasingMethod?: string;
    }
  ): Promise<any> {
    try {
      await this.login();

      const today = new Date().toISOString().split('T')[0];
      const closeDate = options?.estimatedCloseDate
        ? new Date(options.estimatedCloseDate)
        : new Date();
      closeDate.setDate(closeDate.getDate() + 7);

      const result = await this.createOpportunity({
        ClassID: { value: 'PRODUCT' },
        BusinessAccount: { value: businessAccount },
        Subject: { value: subject },
        EstimatedCloseDate: { value: closeDate.toISOString().split('T')[0] },
        PreDoDate: { value: options?.preDoDate || today },
        PreDoNbr: { value: options?.preDoNbr || subject },
        OpportunitySource: { value: options?.opportunitySource || 'OS004' },
        PurchasingMethod: { value: options?.purchasingMethod || 'PM003' },
        Owner: { value: '8357' },
        Products: products.map((p) => ({
          InventoryID: { value: p.inventoryId },
          Warehouse: { value: p.warehouse || 'PLNSC' },
          Qty: { value: p.qty },
          ManualPrice: { value: true },
          UnitPrice: { value: p.unitPrice },
          TransactionDescription: { value: p.description },
        })),
      });

      return result;
    } finally {
      await this.logout(); // selalu logout meski error
    }
  }
}

// Export singleton instance
export const acumaticaService = new AcumaticaService();
