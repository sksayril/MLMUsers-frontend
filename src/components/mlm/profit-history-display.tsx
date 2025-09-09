import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign } from 'lucide-react';

interface ProfitShare {
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
}

interface ProfitHistoryDisplayProps {
  profitShares: ProfitShare[];
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const ProfitHistoryDisplay = ({ profitShares }: ProfitHistoryDisplayProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Profit Share History</CardTitle>
        <CardDescription>
          Track your profit share transactions
        </CardDescription>
      </CardHeader>
      <CardContent>
        {profitShares.length > 0 ? (
          <div className="space-y-4">
            {profitShares.map((share, index) => (
              <div
                key={index}
                className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">Level {share.level}</Badge>
                    <Badge variant="secondary">{share.shareType}</Badge>
                  </div>
                  <span className="font-semibold text-green-600">
                    +{formatCurrency(share.amount)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-1">
                  {share.description}
                </p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>From: {share.relatedUserId.name} ({share.relatedUserId.mobile})</span>
                  <span>{formatDate(share.shareDate)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                  <span>Source: {formatCurrency(share.sourceAmount)}</span>
                  <span>Rate: {share.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No profit share history yet</p>
            <p className="text-sm">Profit shares will appear here as your team grows</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
