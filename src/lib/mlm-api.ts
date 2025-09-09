import api from './axios-config';

const BASE_URL = '/api/mlm30';

export interface MLMStructureResponse {
  success: boolean;
  mlmStructure: {
    [key: string]: {
      percentage: number;
      description: string;
    };
  };
  dailyProfitShare: {
    percentage: number;
    description: string;
  };
  levelBasedProfitShare: {
    percentagePerLevel: number;
    description: string;
  };
  totalLevels: number;
  totalPercentage: number;
}

export interface MLMStatsResponse {
  success: boolean;
  user: {
    name: string;
    mobile: string;
    referralCode: string;
    mlmLevel: number;
    mlmEarnings: {
      daily: number;
      levelBased: number;
      total: number;
    };
  };
  statistics: {
    directReferrals: number;
    totalDownline: number;
    earningsByType: Array<{
      _id: string;
      totalAmount: number;
      count: number;
    }>;
    recentProfitShares: Array<{
      userId: string;
      level: number;
      shareType: string;
      amount: number;
      percentage: number;
      description: string;
      shareDate: string;
    }>;
  };
  directReferrals: Array<{
    name: string;
    mobile: string;
    referralCode: string;
    mlmLevel: number;
    createdAt: string;
  }>;
  downlineUsers: Array<{
    name: string;
    mobile: string;
    referralCode: string;
    mlmLevel: number;
    createdAt: string;
  }>;
}

export interface DownlineResponse {
  success: boolean;
  downlineByLevel: {
    [key: string]: Array<{
      name: string;
      mobile: string;
      referralCode: string;
      mlmLevel: number;
      createdAt: string;
      wallet: {
        normal: number;
        benefit: number;
        withdrawal: number;
      };
    }>;
  };
  totalDownline: number;
  level: string;
}

export interface ProfitHistoryResponse {
  success: boolean;
  profitShares: Array<{
    userId: string;
    level: number;
    shareType: string;
    amount: number;
    percentage: number;
    sourceAmount: number;
    walletType: string;
    status: string;
    description: string;
    shareDate: string;
    relatedUserId: {
      name: string;
      mobile: string;
    };
  }>;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface EarningsSummaryResponse {
  success: boolean;
  earningsByType: Array<{
    _id: string;
    totalAmount: number;
    count: number;
    lastShare: string;
  }>;
  monthlyEarnings: Array<{
    _id: {
      year: number;
      month: number;
    };
    totalAmount: number;
    count: number;
  }>;
}

class MLMApiService {
  /**
   * Get MLM Structure
   * Returns the complete 30-level MLM structure and configuration
   */
  async getMLMStructure(): Promise<{ data: MLMStructureResponse }> {
    const response = await api.get(`${BASE_URL}/structure`);
    return response;
  }

  /**
   * Get User MLM Statistics
   * Returns comprehensive MLM statistics for the authenticated user
   */
  async getMLMStats(): Promise<{ data: MLMStatsResponse }> {
    const response = await api.get(`${BASE_URL}/stats`);
    return response;
  }

  /**
   * Get MLM Downline by Level
   * Get downline users, optionally filtered by level
   * @param level - Specific level to filter (1-30), undefined for all levels
   * @param page - Page number for pagination (default: 1)
   * @param limit - Items per page (default: 20)
   */
  async getDownlineByLevel(
    level?: number,
    page: number = 1,
    limit: number = 20
  ): Promise<{ data: DownlineResponse }> {
    const params = new URLSearchParams();
    if (level !== undefined) {
      params.append('level', level.toString());
    }
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const response = await api.get(`${BASE_URL}/downline?${params.toString()}`);
    return response;
  }

  /**
   * Get Profit Share History
   * Get user's profit share transaction history
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 20)
   */
  async getProfitHistory(
    page: number = 1,
    limit: number = 20
  ): Promise<{ data: ProfitHistoryResponse }> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const response = await api.get(`${BASE_URL}/profit-history?${params.toString()}`);
    return response;
  }

  /**
   * Get Earnings Summary
   * Get earnings breakdown by type and monthly summaries
   */
  async getEarningsSummary(): Promise<{ data: EarningsSummaryResponse }> {
    const response = await api.get(`${BASE_URL}/earnings-summary`);
    return response;
  }

  /**
   * Get MLM Downline for specific level with pagination
   * @param level - Level number (1-30)
   * @param page - Page number
   * @param limit - Items per page
   */
  async getDownlineBySpecificLevel(
    level: number,
    page: number = 1,
    limit: number = 20
  ): Promise<{ data: DownlineResponse }> {
    const params = new URLSearchParams();
    params.append('level', level.toString());
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const response = await api.get(`${BASE_URL}/downline/${level}?${params.toString()}`);
    return response;
  }
}

// Create and export a singleton instance
export const mlmApi = new MLMApiService();

// Export the class for testing purposes
export { MLMApiService };
