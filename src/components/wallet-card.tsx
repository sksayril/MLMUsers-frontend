// import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface WalletCardProps {
  title: string;
  amount?: string;
  level?: string;
  description: string;
  icon: React.ReactNode;
  trend?: string;
  trendDirection?: 'up' | 'down';
  progress?: number;
  actionText?: string;
  color?: 'default' | 'gold' | 'purple';
  onActionClick?: () => void;
}

const WalletCard = ({
  title,
  amount,
  level,
  description,
  icon,
  trend,
  trendDirection,
  progress,
  actionText,
  color = 'default',
  onActionClick
}: WalletCardProps) => {
  // const cardStyles = {
  //   default: 'bg-gradient-to-br from-card to-card/80 hover:shadow-md hover:shadow-primary/10',
  //   gold: 'bg-gradient-to-br from-amber-500/10 to-amber-600/5 hover:shadow-md hover:shadow-amber-500/20 border-amber-500/20',
  //   purple: 'bg-gradient-to-br from-purple-500/10 to-purple-600/5 hover:shadow-md hover:shadow-purple-500/20 border-purple-500/20'
  // };

  return (
    <Card className={cn(
      "relative overflow-hidden",
      color === 'gold' && "bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border-amber-500/20",
      color === 'purple' && "bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border-purple-500/20"
    )}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <span className={cn(
              "p-1.5 rounded-full flex items-center justify-center",
              color === 'gold' ? 'bg-amber-500/10 text-amber-500' : 
              color === 'purple' ? 'bg-purple-500/10 text-purple-500' : 
              'bg-primary/10 text-primary'
            )}>
              {icon}
            </span>
            {title}
          </CardTitle>
          {trend && (
            <span className={cn(
              "text-xs font-medium px-2 py-1 rounded-full",
              trendDirection === 'up' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
            )}>
              {trend}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="pt-2">
          {amount && (
            <div className="text-3xl font-bold tracking-tighter">
              {amount}
            </div>
          )}
          {level && (
            <div className="text-3xl font-bold tracking-tighter mb-2">
              {level}
            </div>
          )}
          <p className="text-sm text-muted-foreground mt-1">
            {description}
          </p>
          {progress !== undefined && (
            <div className="mt-4">
              <Progress value={progress} className={cn(
                color === 'gold' ? 'bg-amber-500/20 [&>div]:bg-amber-500' :
                color === 'purple' ? 'bg-purple-500/20 [&>div]:bg-purple-500' :
                'bg-primary/20 [&>div]:bg-primary'
              )} />
            </div>
          )}
        </div>
      </CardContent>
      {actionText && (
        <Button 
          variant="outline" 
          size="sm" 
          className={cn(
            "mt-4",
            color === 'gold' && "border-amber-500/20 hover:border-amber-500/40 hover:text-amber-600",
            color === 'purple' && "border-purple-500/20 hover:border-purple-500/40 hover:text-purple-600"
          )}
          onClick={onActionClick}
        >
          {actionText}
        </Button>
      )}
    </Card>
  );
};

export default WalletCard;