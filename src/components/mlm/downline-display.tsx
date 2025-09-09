import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface User {
  name: string;
  mobile: string;
  referralCode: string;
  mlmLevel: number;
  createdAt: string;
  wallet?: {
    normal: number;
    benefit: number;
    withdrawal: number;
  };
}

interface DownlineDisplayProps {
  downlineByLevel: {
    [key: string]: User[];
  };
  selectedLevel: string;
  onLevelChange: (level: string) => void;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const DownlineDisplay = ({ 
  downlineByLevel, 
  selectedLevel, 
  onLevelChange 
}: DownlineDisplayProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Downline Network</CardTitle>
        <CardDescription>
          View your downline members by level
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2 mb-4">
          <label className="text-sm font-medium">Filter by Level:</label>
          <select
            value={selectedLevel}
            onChange={(e) => onLevelChange(e.target.value)}
            className="px-3 py-1 border rounded-md"
          >
            <option value="all">All Levels</option>
            {Array.from({ length: 30 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                Level {i + 1}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-4">
          {Object.entries(downlineByLevel).map(([level, users]) => (
            <div key={level} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Level {level}</h3>
                <Badge variant="outline">{users.length} members</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {users.map((user, index) => (
                  <div
                    key={index}
                    className="p-3 border rounded-md hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{user.name}</span>
                      <Badge variant="secondary">L{user.mlmLevel}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {user.mobile}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Code: {user.referralCode}
                    </p>
                    {user.wallet && (
                      <div className="mt-2 text-xs">
                        <p>Normal: {formatCurrency(user.wallet.normal)}</p>
                        <p>Benefit: {formatCurrency(user.wallet.benefit)}</p>
                        <p>Withdrawal: {formatCurrency(user.wallet.withdrawal)}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
