import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Copy, Share2, Gift, Users } from 'lucide-react';

interface ReferralLinkProps {
  referralCode: string;
}

const ReferralLink = ({ referralCode }: ReferralLinkProps) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const referralLink = `https://utpfund.live/ref/${referralCode}`;

  const handleCopyToClipboard = () => {
    if (referralCode === 'N/A') {
      toast({
        title: 'No referral code available',
        description: 'Please try again later',
        variant: 'destructive',
      });
      return;
    }

    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    
    toast({
      title: 'Referral link copied',
      description: 'You can now share it with your friends',
    });
    
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (referralCode === 'N/A') {
      toast({
        title: 'No referral code available',
        description: 'Please try again later',
        variant: 'destructive',
      });
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join UTP FUND',
          text: 'Check out this awesome financial app!',
          url: referralLink,
        });
        
        toast({
          title: 'Thanks for sharing!',
          description: 'Your referral link has been shared',
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      handleCopyToClipboard();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-indigo-500/10 border-blue-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <span className="bg-gradient-to-r from-blue-500 to-purple-500 p-1.5 rounded-full flex items-center justify-center text-white">
              <Gift className="h-5 w-5" />
            </span>
            Invite Friends & Earn Rewards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Share your referral code and earn rewards for each friend who joins
              </p>
              <div className="flex items-center gap-2 bg-white/50 dark:bg-black/50 p-2 rounded-lg border border-blue-500/20">
                <span className="font-mono text-lg font-bold tracking-wider bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                  {referralCode}
                </span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleCopyToClipboard}
                  className="ml-auto hover:bg-blue-500/10"
                  disabled={referralCode === 'N/A'}
                >
                  <Copy className={`h-4 w-4 ${copied ? 'text-green-500' : ''}`} />
                </Button>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="flex items-center gap-4 p-4 bg-white/50 dark:bg-black/50 rounded-lg border border-blue-500/20">
                <div className="p-2 bg-blue-500/10 rounded-full">
                  <Users className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium">Refer Friends</p>
                  <p className="text-sm text-muted-foreground">Get $25 for each friend who joins</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-white/50 dark:bg-black/50 rounded-lg border border-purple-500/20">
                <div className="p-2 bg-purple-500/10 rounded-full">
                  <Gift className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="font-medium">Earn Rewards</p>
                  <p className="text-sm text-muted-foreground">Your friends get $10 bonus too</p>
                </div>
              </div>
            </div>
          
            <Button 
              onClick={handleShare}
              variant="default" 
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
              disabled={referralCode === 'N/A'}
            >
              <Share2 className="mr-2 h-4 w-4" />
              Share your referral code
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ReferralLink;