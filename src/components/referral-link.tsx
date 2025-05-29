import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Copy, Share2 } from 'lucide-react';

interface ReferralLinkProps {
  referralCode: string;
}

const ReferralLink = ({ referralCode }: ReferralLinkProps) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const referralLink = `https://financepro.com/ref/${referralCode}`;

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    
    toast({
      title: 'Referral link copied',
      description: 'You can now share it with your friends',
    });
    
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join FinancePro',
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
      <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <span className="bg-blue-500/10 text-blue-500 p-1.5 rounded-full flex items-center justify-center">
              <Share2 className="h-5 w-5" />
            </span>
            Invite Friends & Earn
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Share your referral link and get $25 for each friend who joins
          </p>
          
          <div className="flex items-center gap-2">
            <Input 
              value={referralLink}
              readOnly
              className="bg-background/50 border-blue-500/20"
            />
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleCopyToClipboard}
              className="border-blue-500/20 hover:border-blue-500/40 hover:text-blue-600"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="mt-4 text-center">
            <Button 
              onClick={handleShare}
              variant="default" 
              className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
            >
              <Share2 className="mr-2 h-4 w-4" />
              Share your link
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ReferralLink;