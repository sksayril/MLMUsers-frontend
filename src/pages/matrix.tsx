import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '@/contexts/auth-context';
// import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Tree from 'react-d3-tree';
import { User, Crown, Star } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';

interface MatrixUser {
  name: string;
  mobile: string;
  referralCode: string;
  joinedAt: string;
}

interface MatrixLevel {
  level: number;
  rate: number;
  referralsCount: number;
  potentialEarnings: string;
  users: MatrixUser[];
}

interface MatrixStats {
  directReferrals: number;
  totalNetworkSize: number;
  levels: MatrixLevel[];
}

interface MatrixResponse {
  success: boolean;
  user: {
    name: string;
    mobile: string;
    referralCode: string;
    level: number;
  };
  mlmStats: MatrixStats;
  directReferrals: any[];
  recentBonuses: any[];
}

interface TreeNode {
  name: string;
  attributes?: {
    referralCode: string;
    level: number;
    joinedAt?: string;
  };
  children?: TreeNode[];
}

const MatrixSkeleton = () => (
  <div className="p-4 md:p-8 max-w-6xl mx-auto">
    <Skeleton className="h-8 w-64 mb-4" />
    <Skeleton className="h-[600px] w-full" />
  </div>
);

function buildMatrixTree(user: MatrixResponse['user'], levels: MatrixLevel[]): TreeNode {
  // Level 1 users are direct referrals
  const root: TreeNode = {
    name: `${user.name} (You)`,
    attributes: {
      referralCode: user.referralCode,
      level: user.level,
    },
    children: [],
  };

  // Helper to recursively build children for each level
  function addChildren(parentNodes: TreeNode[], levelIdx: number) {
    if (levelIdx >= levels.length) return;
    const level = levels[levelIdx];
    let userIdx = 0;
    parentNodes.forEach((parent) => {
      const children: TreeNode[] = [];
      for (let i = 0; i < level.users.length; i++) {
        // Distribute users evenly under previous level's users
        if (userIdx < level.users.length) {
          const u = level.users[userIdx++];
          children.push({
            name: u.name,
            attributes: {
              referralCode: u.referralCode,
              level: level.level,
              joinedAt: u.joinedAt,
            },
            children: [],
          });
        }
      }
      parent.children = children;
      addChildren(children, levelIdx + 1);
    });
  }

  // Start with level 1 users
  root.children = levels[0]?.users.map((u) => ({
    name: u.name,
    attributes: {
      referralCode: u.referralCode,
      level: 1,
      joinedAt: u.joinedAt,
    },
    children: [],
  })) || [];
  addChildren(root.children, 1);
  return root;
}

const MatrixPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [matrixData, setMatrixData] = useState<MatrixResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMatrix = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/auth');
        return;
      }
      const response = await axios.get<MatrixResponse>(
        'http://localhost:3100/api/mlm/stats',
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        }
      );
      if (response.data.success) {
        setMatrixData(response.data);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          logout();
          navigate('/auth');
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [navigate, logout]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    } else {
      fetchMatrix();
    }
  }, [user, navigate, fetchMatrix]);

  if (isLoading) return <MatrixSkeleton />;
  if (!matrixData) return null;

  const treeData = buildMatrixTree(matrixData.user, matrixData.mlmStats.levels);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">MLM Key Generation Module</h1>
      <div className="w-full h-[600px] bg-white/5 rounded-xl overflow-auto border p-4">
        <Tree
          data={treeData}
          orientation="vertical"
          pathFunc="step"
          separation={{ siblings: 2, nonSiblings: 2.5 }}
          renderCustomNodeElement={({ nodeDatum }) => {
            // Choose icon based on level
            let IconComponent = User;
            let iconColor = '#6366F1';
            let iconBg = theme === 'dark' ? '#1f2937' : '#fff';
            let label = '';
            
            // High contrast text colors for better visibility
            const primaryTextColor = theme === 'dark' ? '#f9fafb' : '#111827';
            const secondaryTextColor = theme === 'dark' ? '#e5e7eb' : '#374151';
            const labelTextColor = theme === 'dark' ? '#fbbf24' : '#7c2d12';
            const joinedTextColor = theme === 'dark' ? '#a7f3d0' : '#065f46';
            
            // Strong text shadows and strokes for visibility
            const textShadow = theme === 'dark' 
              ? '0 0 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.6)' 
              : '0 0 4px rgba(255,255,255,0.9), 0 0 8px rgba(255,255,255,0.6)';
            
            const strokeColor = theme === 'dark' ? '#000000' : '#ffffff';
            
            if (nodeDatum.attributes?.level === 0) {
              IconComponent = Crown;
              iconColor = '#fbbf24';
              iconBg = theme === 'dark' ? '#451a03' : '#fffbe6';
              label = 'Premium';
            } else if (nodeDatum.attributes?.level === 1) {
              IconComponent = Star;
              iconColor = '#a21caf';
              iconBg = theme === 'dark' ? '#581c87' : '#f3e8ff';
              label = 'Direct';
            } else {
              IconComponent = User;
              iconColor = '#6366F1';
              iconBg = theme === 'dark' ? '#1e3a8a' : '#e0e7ff';
              label = 'Member';
            }
            
            return (
              <g>
                {/* Background circle for better contrast */}
                <circle r={32} fill={theme === 'dark' ? '#0f172a' : '#ffffff'} stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} strokeWidth={2} opacity={0.8} />
                <circle r={28} fill={iconBg} stroke={iconColor} strokeWidth={3} />
                <foreignObject x={-18} y={-18} width={36} height={36}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'center',width:'36px',height:'36px'}}>
                    <IconComponent color={iconColor} size={32} style={{background:'none'}} />
                  </div>
                </foreignObject>
                
                {/* Main name text with enhanced visibility */}
                <text 
                  dy="2.4em" 
                  x={0} 
                  textAnchor="middle"
                  stroke={strokeColor}
                  strokeWidth="0.5"
                  style={{ 
                    fill: primaryTextColor, 
                    fontWeight: 800, 
                    fontSize: '16px', 
                    textShadow: textShadow, 
                    letterSpacing: '0.5px',
                    filter: theme === 'dark' ? 'drop-shadow(0 0 2px #000)' : 'drop-shadow(0 0 2px #fff)'
                  }}
                >
                  {nodeDatum.name}
                </text>
                
                {/* Level and referral code text */}
                {nodeDatum.attributes && (
                  <text 
                    dy="3.9em" 
                    x={0} 
                    textAnchor="middle"
                    stroke={strokeColor}
                    strokeWidth="0.3"
                    style={{ 
                      fill: secondaryTextColor, 
                      fontSize: '13px', 
                      fontWeight: 700, 
                      letterSpacing: '0.2px',
                      textShadow: textShadow,
                      filter: theme === 'dark' ? 'drop-shadow(0 0 2px #000)' : 'drop-shadow(0 0 2px #fff)'
                    }}
                  >
                    Level {nodeDatum.attributes.level} | Code: {nodeDatum.attributes.referralCode}
                  </text>
                )}
                
                {/* Label text (Premium/Direct/Member) with accent colors */}
                {label && (
                  <text 
                    dy="5.2em" 
                    x={0} 
                    textAnchor="middle"
                    stroke={theme === 'dark' ? '#000000' : '#ffffff'}
                    strokeWidth="0.5"
                    style={{ 
                      fill: labelTextColor, 
                      fontSize: '12px', 
                      fontWeight: 800, 
                      letterSpacing: '0.3px',
                      textShadow: textShadow,
                      filter: theme === 'dark' ? 'drop-shadow(0 0 3px #000)' : 'drop-shadow(0 0 3px #fff)'
                    }}
                  >
                    {label}
                  </text>
                )}
                
                {/* Joined date text */}
                {nodeDatum.attributes?.joinedAt && typeof nodeDatum.attributes.joinedAt === 'string' && (
                  <text 
                    dy="6.5em" 
                    x={0} 
                    textAnchor="middle"
                    stroke={strokeColor}
                    strokeWidth="0.2"
                    style={{ 
                      fill: joinedTextColor, 
                      fontSize: '11px', 
                      fontWeight: 600, 
                      letterSpacing: '0.1px',
                      textShadow: textShadow,
                      filter: theme === 'dark' ? 'drop-shadow(0 0 2px #000)' : 'drop-shadow(0 0 2px #fff)'
                    }}
                  >
                    Joined: {new Date(nodeDatum.attributes.joinedAt).toLocaleDateString()}
                  </text>
                )}
              </g>
            );
          }}
        />
      </div>
    </div>
  );
};

export default MatrixPage;