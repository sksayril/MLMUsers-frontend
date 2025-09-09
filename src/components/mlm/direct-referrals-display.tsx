import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';

interface User {
  name: string;
  mobile: string;
  referralCode: string;
  mlmLevel: number;
  createdAt: string;
}

interface DirectReferralsDisplayProps {
  directReferrals: User[];
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const DirectReferralsDisplay = ({ directReferrals }: DirectReferralsDisplayProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Direct Referrals</CardTitle>
        <CardDescription>
          Your direct referral team members
        </CardDescription>
      </CardHeader>
      <CardContent>
        {directReferrals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {directReferrals.map((referral, index) => (
              <div
                key={index}
                className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">{referral.name}</span>
                  <Badge variant="secondary">Level {referral.mlmLevel}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-1">
                  {referral.mobile}
                </p>
                <p className="text-sm text-muted-foreground mb-2">
                  Code: {referral.referralCode}
                </p>
                <p className="text-xs text-muted-foreground">
                  Joined: {formatDate(referral.createdAt)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No direct referrals yet</p>
            <p className="text-sm">Share your referral code to start building your team</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
