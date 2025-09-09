import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, UserPlus, TrendingUp, Calendar } from 'lucide-react';

interface MLMStatsCardsProps {
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
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const MLMStatsCards = ({ user, statistics }: MLMStatsCardsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(user.mlmEarnings.total)}
          </div>
          <p className="text-xs text-muted-foreground">
            Daily: {formatCurrency(user.mlmEarnings.daily)} | 
            Level-based: {formatCurrency(user.mlmEarnings.levelBased)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Direct Referrals</CardTitle>
          <UserPlus className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {statistics.directReferrals}
          </div>
          <p className="text-xs text-muted-foreground">
            Total downline: {statistics.totalDownline}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">MLM Level</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            Level {user.mlmLevel}
          </div>
          <p className="text-xs text-muted-foreground">
            Referral Code: {user.referralCode}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {statistics.recentProfitShares.length}
          </div>
          <p className="text-xs text-muted-foreground">
            Profit shares this period
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
