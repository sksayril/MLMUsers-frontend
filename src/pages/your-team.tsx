import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Info,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { mlmApi } from '../lib/mlm-api';
import { MLMStatsCards } from '../components/mlm/mlm-stats-cards';
import { MLMStructureDisplay } from '../components/mlm/mlm-structure-display';
import { DownlineDisplay } from '../components/mlm/downline-display';
import { DirectReferralsDisplay } from '../components/mlm/direct-referrals-display';
import { ProfitHistoryDisplay } from '../components/mlm/profit-history-display';

interface MLMStructure {
  [key: string]: {
    percentage: number;
    description: string;
  };
}

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

interface MLMStats {
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
  directReferrals: User[];
  downlineUsers: User[];
}

interface DownlineData {
  downlineByLevel: {
    [key: string]: User[];
  };
  totalDownline: number;
  level: string;
}

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

const YourTeam = () => {
  const [mlmStructure, setMlmStructure] = useState<MLMStructure | null>(null);
  const [mlmStats, setMlmStats] = useState<MLMStats | null>(null);
  const [downlineData, setDownlineData] = useState<DownlineData | null>(null);
  const [profitHistory, setProfitHistory] = useState<ProfitShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [currentPage] = useState(1);
  const { toast } = useToast();

  const fetchMLMData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all MLM data in parallel
      const [structureRes, statsRes, downlineRes, profitRes] = await Promise.all([
        mlmApi.getMLMStructure(),
        mlmApi.getMLMStats(),
        mlmApi.getDownlineByLevel(selectedLevel === 'all' ? undefined : parseInt(selectedLevel)),
        mlmApi.getProfitHistory(currentPage, 20)
      ]);

      setMlmStructure(structureRes.data.mlmStructure);
      setMlmStats(statsRes.data);
      setDownlineData(downlineRes.data);
      setProfitHistory(profitRes.data.profitShares);
    } catch (err: any) {
      console.error('Error fetching MLM data:', err);
      setError(err.response?.data?.message || 'Failed to fetch MLM data');
      toast({
        title: "Error",
        description: "Failed to load team data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMLMData();
  }, [selectedLevel, currentPage]);


  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <Info className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={fetchMLMData} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Your Team</h1>
          <p className="text-muted-foreground">
            Manage and track your MLM network performance
          </p>
        </div>
        <Button onClick={fetchMLMData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {mlmStats && (
        <MLMStatsCards 
          user={mlmStats.user} 
          statistics={mlmStats.statistics} 
        />
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="structure" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="structure">MLM Structure</TabsTrigger>
          <TabsTrigger value="downline">Downline</TabsTrigger>
          <TabsTrigger value="referrals">Direct Referrals</TabsTrigger>
          <TabsTrigger value="history">Profit History</TabsTrigger>
        </TabsList>

        {/* MLM Structure Tab */}
        <TabsContent value="structure" className="space-y-6">
          {mlmStructure && <MLMStructureDisplay mlmStructure={mlmStructure} />}
        </TabsContent>

        {/* Downline Tab */}
        <TabsContent value="downline" className="space-y-6">
          {downlineData && (
            <DownlineDisplay
              downlineByLevel={downlineData.downlineByLevel}
              selectedLevel={selectedLevel}
              onLevelChange={setSelectedLevel}
            />
          )}
        </TabsContent>

        {/* Direct Referrals Tab */}
        <TabsContent value="referrals" className="space-y-6">
          {mlmStats && (
            <DirectReferralsDisplay directReferrals={mlmStats.directReferrals} />
          )}
        </TabsContent>

        {/* Profit History Tab */}
        <TabsContent value="history" className="space-y-6">
          <ProfitHistoryDisplay profitShares={profitHistory} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default YourTeam;
