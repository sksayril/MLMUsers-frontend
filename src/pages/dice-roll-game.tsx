import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, Coins, Zap, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DiceResult {
  dice1: number;
  dice2: number;
  total: number;
}

interface BetOption {
  id: string;
  name: string;
  multiplier: number;
  condition: (total: number, dice1: number, dice2: number) => boolean;
  color: string;
}

const DiceRollGame = () => {
  const [isRolling, setIsRolling] = useState(false);
  const [diceResult, setDiceResult] = useState<DiceResult>({ dice1: 1, dice2: 1, total: 2 });
  const [betAmount, setBetAmount] = useState('10');
  const [selectedBet, setSelectedBet] = useState<string | null>(null);
  const [gameWallet] = useState(1000); // Mock wallet balance
  const [showResult, setShowResult] = useState(false);
  const [lastWin, setLastWin] = useState<number>(0);
  const [totalWinnings, setTotalWinnings] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Simplified betting options
  const betOptions: BetOption[] = [
    { id: 'low', name: 'Low (2-6)', multiplier: 2, condition: (total) => total >= 2 && total <= 6, color: 'bg-green-500' },
    { id: 'high', name: 'High (8-12)', multiplier: 2, condition: (total) => total >= 8 && total <= 12, color: 'bg-red-500' },
    { id: 'seven', name: 'Lucky 7', multiplier: 5, condition: (total) => total === 7, color: 'bg-yellow-500' },
    { id: 'double', name: 'Double', multiplier: 6, condition: (_, dice1, dice2) => dice1 === dice2, color: 'bg-purple-500' },
  ];

  const getDiceIcon = (value: number) => {
    const iconProps = { className: "h-12 w-12 text-white drop-shadow-lg" };
    switch (value) {
      case 1: return <Dice1 {...iconProps} />;
      case 2: return <Dice2 {...iconProps} />;
      case 3: return <Dice3 {...iconProps} />;
      case 4: return <Dice4 {...iconProps} />;
      case 5: return <Dice5 {...iconProps} />;
      case 6: return <Dice6 {...iconProps} />;
      default: return <Dice1 {...iconProps} />;
    }
  };

  const rollDice = (): DiceResult => {
    const dice1 = Math.floor(Math.random() * 6) + 1;
    const dice2 = Math.floor(Math.random() * 6) + 1;
    return { dice1, dice2, total: dice1 + dice2 };
  };

  const handleRoll = () => {
    if (!selectedBet) {
      toast({
        variant: 'destructive',
        title: 'No bet selected',
        description: 'Please select a betting option before rolling.'
      });
      return;
    }

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

    setIsRolling(true);
    setShowResult(false); // Close any previous result dialog
    
    // Animate dice rolling for 2 seconds
    const rollInterval = setInterval(() => {
      setDiceResult(rollDice());
    }, 100);

    setTimeout(() => {
      clearInterval(rollInterval);
      const finalResult = rollDice();
      setDiceResult(finalResult);
      setIsRolling(false);
      
      // Check if bet won
      const selectedBetOption = betOptions.find(option => option.id === selectedBet);
      if (selectedBetOption && selectedBetOption.condition(finalResult.total, finalResult.dice1, finalResult.dice2)) {
        const winAmount = parseFloat(betAmount) * selectedBetOption.multiplier;
        setLastWin(winAmount);
        setTotalWinnings(prev => prev + winAmount);
        toast({
          title: 'Congratulations! 🎉',
          description: `You won ${winAmount}₹! (${selectedBetOption.multiplier}x multiplier)`
        });
      } else {
        setLastWin(0);
        toast({
          title: 'Better luck next time!',
          description: `Total: ${finalResult.total}. Your bet didn't win this round.`
        });
      }
      
      setShowResult(true);
    }, 2000);
  };

  const resetGame = () => {
    setShowResult(false);
    setSelectedBet(null);
    setLastWin(0);
  };

  return (
          <div className="container mx-auto py-8 px-4 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-3 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white px-6 py-3 rounded-full shadow-lg border-2 border-amber-400/50">
            <div className="text-2xl animate-bounce">🚧</div>
            <span className="text-lg font-bold tracking-wide">Game Under Construction</span>
            <div className="text-2xl animate-bounce" style={{ animationDelay: '0.5s' }}>⚠️</div>
          </div>
        </div>
        <div className="text-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-2">
          🎲 Dice Roll Challenge
        </h1>
        <p className="text-muted-foreground mb-6">
          Roll the dice and bet on the outcome! Choose your strategy wisely!
        </p>
        
        <div className="flex justify-center gap-4 mb-6">
          <Button onClick={() => navigate('/game')} variant="outline">
            Back to Games
          </Button>
        </div>
      </div>

      {/* Wallet Info */}
      <div className="flex justify-center mb-8">
        <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white w-full max-w-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 justify-center">
              <Coins className="h-5 w-5" />
              Game Wallet
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-3xl font-bold">₹{gameWallet.toFixed(2)}</p>
            {totalWinnings > 0 && (
              <p className="text-sm text-green-200 mt-2">Total Won: ₹{totalWinnings}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Game Area */}
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Dice Display */}
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 text-white border-slate-700">
          <CardHeader>
            <CardTitle className="text-center text-xl">🎲 Roll the Dice</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center items-center gap-8 py-8">
              <motion.div
                className="bg-gradient-to-br from-red-500 to-red-700 rounded-xl p-4 shadow-2xl"
                animate={isRolling ? { 
                  rotateX: [0, 360, 720], 
                  rotateY: [0, 360, 720],
                  scale: [1, 1.1, 1]
                } : {}}
                transition={{ duration: 0.5, repeat: isRolling ? Infinity : 0 }}
              >
                {getDiceIcon(diceResult.dice1)}
              </motion.div>
              
              <div className="text-4xl font-bold text-yellow-400">+</div>
              
              <motion.div
                className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl p-4 shadow-2xl"
                animate={isRolling ? { 
                  rotateX: [0, -360, -720], 
                  rotateY: [0, -360, -720],
                  scale: [1, 1.1, 1]
                } : {}}
                transition={{ duration: 0.5, repeat: isRolling ? Infinity : 0 }}
              >
                {getDiceIcon(diceResult.dice2)}
              </motion.div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-400 mb-2">
                Total: {diceResult.total}
              </div>
              <div className="text-sm text-slate-400">
                {diceResult.dice1} + {diceResult.dice2}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Betting Area */}
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 text-white border-slate-700">
          <CardHeader>
            <CardTitle className="text-center">Choose Your Bet</CardTitle>
            <CardDescription className="text-slate-300 text-center">
              Select a betting option and place your bet
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Bet Options */}
            <div className="grid grid-cols-2 gap-3">
              {betOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setSelectedBet(option.id)}
                  disabled={isRolling}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedBet === option.id
                      ? 'border-yellow-400 bg-yellow-400/20 scale-105'
                      : 'border-slate-600 hover:border-slate-500 hover:bg-slate-700'
                  }`}
                >
                  <div className={`w-full h-3 rounded-full ${option.color} mb-2`}></div>
                  <div className="font-bold text-white text-sm">{option.name}</div>
                  <div className="text-xs text-slate-300">{option.multiplier}x payout</div>
                </button>
              ))}
            </div>
            
            {/* Bet Amount */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2 text-center">
                Bet Amount (₹)
              </label>
              <Input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                placeholder="Enter bet amount"
                className="bg-slate-700 border-slate-600 text-white text-center"
                min="1"
                max={gameWallet}
                disabled={isRolling}
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
                  disabled={isRolling}
                >
                  ₹{amount}
                </Button>
              ))}
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleRoll}
              disabled={isRolling || !selectedBet || !betAmount || parseFloat(betAmount) <= 0}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold py-3"
            >
              {isRolling ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Rolling Dice...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  ROLL DICE!
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        {/* Simple Rules */}
        <Card className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="text-center text-sm text-blue-100 space-y-1">
              <div><strong>Low (2-6):</strong> 2x • <strong>High (8-12):</strong> 2x</div>
              <div><strong>Lucky 7:</strong> 5x • <strong>Double:</strong> 6x</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Result Dialog */}
      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl">
              {lastWin > 0 ? (
                <span className="text-yellow-400">
                  🎉 You Won!
                </span>
              ) : (
                <span className="text-blue-400">🎲 Try Again!</span>
              )}
            </DialogTitle>
            <DialogDescription className="text-center text-lg text-slate-300">
              Dice rolled: {diceResult.dice1} + {diceResult.dice2} = {diceResult.total}
              {lastWin > 0 && (
                <div className="text-yellow-400 font-bold mt-2">
                  You won ₹{lastWin}!
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-center py-4">
            <div className="flex gap-4">
              <div className="bg-gradient-to-br from-red-500 to-red-700 rounded-xl p-3">
                {getDiceIcon(diceResult.dice1)}
              </div>
              <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl p-3">
                {getDiceIcon(diceResult.dice2)}
              </div>
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button onClick={resetGame} variant="outline" className="flex-1">
              Roll Again
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

export default DiceRollGame; 