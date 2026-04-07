// Acumatica API Integration Service

// Use proxy to avoid CORS issues
// - DEV: Use Vite proxy (/acumatica-api)
// - PROD: Use Vercel Serverless Function
const ACUMATICA_BASE_URL = import.meta.env.DEV
  ? '/acumatica-api/entity'
  : '/api/acumatica-proxy/entity';

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
   * Login to Acumatica
   */
  async login(): Promise<boolean> {
    try {
      const response = await fetch(`${ACUMATICA_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'admin',
          password: 'Demo1234',
          company: 'PLNSC',
          branch: 'PLNSC',
        }),
      });

      if (!response.ok) {
        throw new Error(`Login failed: ${response.statusText}`);
      }

      // Extract cookie from response headers
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) {
        this.cookie = setCookie;
      }

      return true;
    } catch (error) {
      console.error('Acumatica login error:', error);
      throw error;
    }
  }

  /**
   * Create Opportunity in Acumatica
   */
  async createOpportunity(data: AcumaticaOpportunity): Promise<any> {
    if (!this.cookie) {
      await this.login();
    }

    try {
      const response = await fetch(
        `${ACUMATICA_BASE_URL}/EcomercePLNSC/25.200.001/Opportunity`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': this.cookie || '',
          },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Create opportunity failed: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Acumatica create opportunity error:', error);
      throw error;
    }
  }

  /**
   * Logout from Acumatica
   */
  async logout(): Promise<void> {
    if (!this.cookie) return;

    try {
      await fetch(`${ACUMATICA_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Cookie': this.cookie,
        },
      });

      this.cookie = null;
    } catch (error) {
      console.error('Acumatica logout error:', error);
      // Don't throw error on logout failure
    }
  }

  /**
   * Complete flow: Login -> Create Opportunity -> Logout
   */
  async submitOrder(
    businessAccount: string,
    subject: string,
    products: Array<{
      inventoryId: string;
      qty: number;
      manualPrice: boolean;
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
      // 1. Login
      await this.login();

      // 2. Prepare opportunity data
      const today = new Date().toISOString().split('T')[0];
      const estimatedCloseDate = options?.estimatedCloseDate 
        ? new Date(options.estimatedCloseDate)
        : new Date();
      estimatedCloseDate.setDate(estimatedCloseDate.getDate() + 7);
      
      const opportunityData: AcumaticaOpportunity = {
        ClassID: { value: 'PRODUCT' },
        BusinessAccount: { value: businessAccount },
        Subject: { value: subject },
        EstimatedCloseDate: { value: estimatedCloseDate.toISOString().split('T')[0] },
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
      };

      // 3. Create opportunity
      const result = await this.createOpportunity(opportunityData);

      // 4. Logout
      await this.logout();

      return result;
    } catch (error) {
      // Always try to logout even if there's an error
      await this.logout();
      throw error;
    }
  }
}

// Export singleton instance
export const acumaticaService = new AcumaticaService();
