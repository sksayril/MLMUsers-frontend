import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Coins, RotateCw, Trophy, Zap, Star, Gift, Crown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface WheelSegment {
  id: number;
  label: string;
  value: number;
  color: string;
  probability: number;
}

interface SpinResult {
  segment: WheelSegment;
  angle: number;
}

const SpinWheelGame = () => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentRotation, setCurrentRotation] = useState(0);
  const [betAmount, setBetAmount] = useState('10');
  const [gameWallet] = useState(1000); // Mock wallet balance
  const [lastResult, setLastResult] = useState<SpinResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [totalWinnings, setTotalWinnings] = useState(0);
  const [spinCount, setSpinCount] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Define wheel segments with different prizes
  const wheelSegments: WheelSegment[] = [
    { id: 1, label: '100₹', value: 100, color: '#FF6B6B', probability: 5 },
    { id: 2, label: '50₹', value: 50, color: '#4ECDC4', probability: 10 },
    { id: 3, label: '20₹', value: 20, color: '#45B7D1', probability: 15 },
    { id: 4, label: '10₹', value: 10, color: '#96CEB4', probability: 20 },
    { id: 5, label: '5₹', value: 5, color: '#FFEAA7', probability: 25 },
    { id: 6, label: 'Try Again', value: 0, color: '#DDA0DD', probability: 15 },
    { id: 7, label: '500₹', value: 500, color: '#FF7675', probability: 2 },
    { id: 8, label: '200₹', value: 200, color: '#74B9FF', probability: 8 }
  ];

  const getRandomResult = useCallback((): SpinResult => {
    // Weighted random selection based on probability
    const totalProbability = wheelSegments.reduce((sum, segment) => sum + segment.probability, 0);
    let random = Math.random() * totalProbability;
    
    for (const segment of wheelSegments) {
      random -= segment.probability;
      if (random <= 0) {
        const segmentAngle = 360 / wheelSegments.length;
        const targetAngle = (segment.id - 1) * segmentAngle + (segmentAngle / 2);
        return {
          segment,
          angle: targetAngle
        };
      }
    }
    
    // Fallback
    return {
      segment: wheelSegments[0],
      angle: 0
    };
  }, [wheelSegments]);

  const handleSpin = async () => {
    if (!betAmount || parseFloat(betAmount) <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid bet amount',
        description: 'Please enter a valid bet amount.'
      });
      return;
    }

    if (parseFloat(betAmount) > gameWallet) {
      toast({
        variant: 'destructive',
        title: 'Insufficient funds',
        description: 'You do not have enough balance in your game wallet.'
      });
      return;
    }

    setIsSpinning(true);
    
    // Get random result
    const result = getRandomResult();
    
    // Calculate final rotation (multiple full spins + target angle)
    const spins = 5 + Math.random() * 3; // 5-8 full rotations
    const finalRotation = currentRotation + (spins * 360) + (360 - result.angle);
    
    setCurrentRotation(finalRotation);
    
    // Show result after animation completes
    setTimeout(() => {
      setLastResult(result);
      setShowResult(true);
      setIsSpinning(false);
      setSpinCount(prev => prev + 1);
      
      if (result.segment.value > 0) {
        setTotalWinnings(prev => prev + result.segment.value);
        toast({
          title: 'Congratulations! 🎉',
          description: `You won ${result.segment.value}₹!`
        });
      } else {
        toast({
          title: 'Try Again!',
          description: 'Better luck next time!'
        });
      }
    }, 3000);
  };

  const resetGame = () => {
    setShowResult(false);
    setLastResult(null);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
       <div className="text-center mb-6">
          <div className="inline-flex items-center gap-3 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white px-6 py-3 rounded-full shadow-lg border-2 border-amber-400/50">
            <div className="text-2xl animate-bounce">🚧</div>
            <span className="text-lg font-bold tracking-wide">Game Under Construction</span>
            <div className="text-2xl animate-bounce" style={{ animationDelay: '0.5s' }}>⚠️</div>
          </div>
        </div>
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent mb-2">
          🎡 Spin & Win
        </h1>
        <p className="text-muted-foreground mb-6">
          Place your bet and spin the wheel to win amazing prizes!
        </p>
        
        <div className="flex justify-center gap-4 mb-6">
          <Button onClick={() => navigate('/game')} variant="outline">
            Back to Games
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Coins className="h-5 w-5" />
              Game Wallet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">₹{gameWallet.toFixed(2)}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Total Winnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">₹{totalWinnings}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Spins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{spinCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Game Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Spinning Wheel */}
        <div className="flex justify-center">
          <div className="relative">
            {/* Wheel Container */}
            <div className="relative w-80 h-80">
              {/* Pointer */}
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2 z-10">
                <div className="w-0 h-0 border-l-4 border-r-4 border-b-8 border-l-transparent border-r-transparent border-b-yellow-400"></div>
              </div>
              
              {/* Spinning Wheel */}
              <motion.div
                className="w-full h-full rounded-full border-8 border-yellow-400 shadow-2xl overflow-hidden relative"
                animate={{ rotate: currentRotation }}
                transition={{ 
                  duration: isSpinning ? 3 : 0, 
                  ease: isSpinning ? [0.25, 0.1, 0.25, 1] : "linear"
                }}
              >
                {wheelSegments.map((segment, index) => {
                  const angle = 360 / wheelSegments.length;
                  const rotation = index * angle;
                  
                  return (
                    <div
                      key={segment.id}
                      className="absolute w-full h-full"
                      style={{
                        transform: `rotate(${rotation}deg)`,
                        clipPath: `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.cos((angle * Math.PI) / 180)}% ${50 - 50 * Math.sin((angle * Math.PI) / 180)}%)`
                      }}
                    >
                      <div 
                        className="w-full h-full flex items-center justify-center"
                        style={{ backgroundColor: segment.color }}
                      >
                        <div 
                          className="text-white font-bold text-sm transform"
                          style={{ 
                            transform: `rotate(${angle/2}deg) translateY(-60px)`,
                            textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
                          }}
                        >
                          {segment.label}
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {/* Center Circle */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-yellow-400 rounded-full border-4 border-white shadow-lg flex items-center justify-center">
                  <Star className="h-8 w-8 text-yellow-800" />
                </div>
              </motion.div>
              
              {/* Glow Effect */}
              {isSpinning && (
                <div className="absolute inset-0 rounded-full border-8 border-yellow-400 animate-pulse shadow-2xl shadow-yellow-400/50"></div>
              )}
            </div>
          </div>
        </div>

        {/* Game Controls */}
        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-slate-800 to-slate-900 text-white border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Place Your Bet
              </CardTitle>
              <CardDescription className="text-slate-300">
                Enter your bet amount and spin the wheel
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Bet Amount (₹)
                </label>
                <Input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  placeholder="Enter bet amount"
                  className="bg-slate-700 border-slate-600 text-white"
                  min="1"
                  max={gameWallet}
                  disabled={isSpinning}
                />
              </div>
              
              {/* Quick Bet Buttons */}
              <div className="grid grid-cols-4 gap-2">
                {[10, 25, 50, 100].map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    size="sm"
                    onClick={() => setBetAmount(amount.toString())}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    disabled={isSpinning}
                  >
                    ₹{amount}
                  </Button>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleSpin}
                disabled={isSpinning || !betAmount || parseFloat(betAmount) <= 0}
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold py-3"
              >
                {isSpinning ? (
                  <>
                    <RotateCw className="mr-2 h-4 w-4 animate-spin" />
                    Spinning...
                  </>
                ) : (
                  <>
                    <RotateCw className="mr-2 h-4 w-4" />
                    SPIN THE WHEEL!
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          {/* Prize Table */}
          <Card className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 border-purple-500/20">
            <CardHeader>
              <CardTitle className="text-purple-200">Prize Table</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {wheelSegments.map((segment) => (
                  <div key={segment.id} className="flex items-center gap-2 p-2 rounded">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: segment.color }}
                    ></div>
                    <span className="text-slate-300">{segment.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Result Dialog */}
      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl">
              {lastResult && lastResult.segment.value > 0 ? (
                <span className="text-yellow-400 flex items-center justify-center gap-2">
                  <Crown className="h-6 w-6" />
                  Congratulations!
                </span>
              ) : (
                <span className="text-blue-400">Try Again!</span>
              )}
            </DialogTitle>
            <DialogDescription className="text-center text-lg text-slate-300">
              {lastResult && lastResult.segment.value > 0 ? (
                `You won ${lastResult.segment.value}₹!`
              ) : (
                'Better luck next time!'
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-center py-4">
            {lastResult && (
              <div 
                className="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-lg animate-pulse"
                style={{ backgroundColor: lastResult.segment.color }}
              >
                {lastResult.segment.label}
              </div>
            )}
          </div>
          
          <DialogFooter className="gap-2">
            <Button onClick={resetGame} variant="outline" className="flex-1">
              Spin Again
            </Button>
            <Button onClick={() => navigate('/game')} className="flex-1">
              Back to Games
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SpinWheelGame; 