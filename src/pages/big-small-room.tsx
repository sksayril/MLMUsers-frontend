import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
// import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Clock, Users, Award, Timer, User, ArrowLeft, AlertCircle, CheckCircle2, Star, Trophy, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import Confetti from 'react-confetti';

// Types for room data
interface GameRoom {
  id: string;
  roomId: string;
  entryFee: number;
  winningMultiplier: number;
  maxPlayers: number;
  currentPlayers: number;
  bigPlayers: number;
  smallPlayers: number;
  status: string;
  createdAt: string;
  winnerType?: 'big' | 'small' | null;
  winnerNumber?: number | null;
}

interface Player {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  numberType: 'big' | 'small';
  entryAmount: number;
  hasWon: boolean;
  joinedAt: string;
  selectedNumber?: number;
}

interface GameRoomResponse {
  success: boolean;
  gameRoom: GameRoom;
  players: Player[];
}

// Add a simple slot machine/luck machine animation component
const SlotMachine = () => {
  const icons = ['🍀', '🎲', '🎰', '💎', '⭐', '🎉', '🍒', '7️⃣'];
  const [slots, setSlots] = useState([0, 1, 2]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSlots([
        Math.floor(Math.random() * icons.length),
        Math.floor(Math.random() * icons.length),
        Math.floor(Math.random() * icons.length),
      ]);
    }, 150);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex justify-center gap-4 mb-6">
      {slots.map((idx, i) => (
        <motion.div
          key={i}
          className="w-16 h-16 flex items-center justify-center rounded-xl bg-gradient-to-br from-purple-700 to-blue-700 text-4xl shadow-lg border-4 border-yellow-400 animate-spin-slow"
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          {icons[idx]}
        </motion.div>
      ))}
    </div>
  );
};

const BigSmallRoom = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [roomData, setRoomData] = useState<GameRoom | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [winner, setWinner] = useState<string | null>(null);
  const [waitingTimer, setWaitingTimer] = useState<number>(30);
  const [showWinnerAnimation, setShowWinnerAnimation] = useState<boolean>(false);
  const [resultCountdown, setResultCountdown] = useState<number | null>(null);
  const [showJoinAnimation, setShowJoinAnimation] = useState<boolean>(false);
  const [previousPlayerCount, setPreviousPlayerCount] = useState<number>(0);
  const [showResultPopup, setShowResultPopup] = useState<boolean>(false);
  const [resultTimer, setResultTimer] = useState<number>(5);
  const [balls, setBalls] = useState<{id: number, color: string, x: number, y: number, size: number}[]>([]);
  const [winningBall, setWinningBall] = useState<{number: number, type: 'big' | 'small'} | null>(null);
  
  const { toast } = useToast();
  const navigate = useNavigate();

  // Reference to track polling
  const pollingRef = useRef<boolean>(true);
  const isFetchingRef = useRef<boolean>(false);
  const lastFetchTimeRef = useRef<number>(0);
  const waitingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const resultTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch room details
  const fetchRoomDetails = useCallback(async () => {
    if (!roomId || isFetchingRef.current) {
      return;
    }

    const currentTime = Date.now();
    if (currentTime - lastFetchTimeRef.current < 3000 && lastFetchTimeRef.current !== 0) {
      return;
    }

    try {
      isFetchingRef.current = true;
      lastFetchTimeRef.current = currentTime;

      const token = localStorage.getItem('token');
      if (!token) {
        toast({
          variant: 'destructive',
          title: 'Authentication error',
          description: 'You are not logged in. Please log in to view game rooms.'
        });
        navigate('/login');
        return;
      }

      const response = await axios.get<GameRoomResponse>(
        `https://api.utpfund.live/api/number-game/room/${roomId}`, 
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        const newRoomData = response.data.gameRoom;
        
        // Check for new players joining
        if (previousPlayerCount > 0 && newRoomData.currentPlayers > previousPlayerCount) {
          setShowJoinAnimation(true);
          setTimeout(() => setShowJoinAnimation(false), 2000);
        }
        setPreviousPlayerCount(newRoomData.currentPlayers);
        
        setRoomData(newRoomData);
        setPlayers(response.data.players);
        
        // Clear existing timers
        if (waitingTimerRef.current) {
          clearInterval(waitingTimerRef.current);
          waitingTimerRef.current = null;
        }
        
        if (resultTimerRef.current) {
          clearInterval(resultTimerRef.current);
          resultTimerRef.current = null;
        }

        // Handle room status
        if (newRoomData.status === 'waiting') {
          if (newRoomData.currentPlayers < newRoomData.maxPlayers) {
            // Room not full - show waiting timer
            setWaitingTimer(30);
            waitingTimerRef.current = setInterval(() => {
              setWaitingTimer(prev => {
                if (prev <= 1) {
                  return 30; // Reset timer
                }
                return prev - 1;
              });
            }, 1000);
          } else {
            // Room full - start game countdown
            setCountdown(10);
            resultTimerRef.current = setInterval(() => {
              setCountdown(prev => {
                if (prev === null || prev <= 1) {
                  if (resultTimerRef.current) clearInterval(resultTimerRef.current);
                  // Trigger winner determination
                  determineWinner();
                  return null;
                }
                return prev - 1;
              });
            }, 1000);
          }
        }

        if (newRoomData.status === 'completed') {
          // ENHANCED WINNER DETECTION
          let detectedWinner = null;
          
          // Priority 1: Check room's winner type
          if (newRoomData.winnerType) {
            detectedWinner = newRoomData.winnerType;
          } 
          // Priority 2: Find winner from players list
          else {
            const winnerPlayer = response.data.players.find(player => player.hasWon);
            if (winnerPlayer) {
              detectedWinner = winnerPlayer.numberType;
            }
          }

          // Update winner state if detected
          if (detectedWinner) {
            setWinner(detectedWinner);
            setShowWinnerAnimation(true);
            
            // Ensure result countdown is set
            if (resultCountdown === null && !resultTimerRef.current) {
              setResultCountdown(10);
              resultTimerRef.current = setInterval(() => {
                setResultCountdown(prev => {
                  if (prev === null || prev <= 1) {
                    if (resultTimerRef.current) clearInterval(resultTimerRef.current);
                    return null;
                  }
                  return prev - 1;
                });
              }, 1000);
            }
          }

          // Stop polling after a short delay to ensure winner is set
          setTimeout(() => {
            pollingRef.current = false;
          }, 2000);
        }
      }
    } catch (error) {
      const errorResponse = error as { response?: { data?: { message?: string } } };
      toast({
        variant: 'destructive',
        title: 'Error retrieving room data',
        description: errorResponse.response?.data?.message || 'Could not retrieve game room information.'
      });
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [roomId, toast, navigate, resultCountdown, previousPlayerCount]);

  // Generate random balls for animation
  const generateBalls = useCallback(() => {
    const newBalls = [];
    const numBalls = 15;
    const colors = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6'];
    
    for (let i = 0; i < numBalls; i++) {
      newBalls.push({
        id: i,
        color: colors[Math.floor(Math.random() * colors.length)],
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 20 + 20
      });
    }
    
    setBalls(newBalls);
  }, []);

  // Determine winner (simulate API call)
  const determineWinner = useCallback(() => {
    generateBalls();
    const winnerType = Math.random() > 0.5 ? 'big' : 'small';
    const winNumber = Math.floor(Math.random() * 10) + 1; // Random number between 1-10
    
    setWinningBall({ number: winNumber, type: winnerType });
    setWinner(winnerType);
    
    // Start 5-second countdown timer before showing results
    setResultTimer(5);
    const timerInterval = setInterval(() => {
      setResultTimer(prev => {
        if (prev <= 1) {
          clearInterval(timerInterval);
          setShowResultPopup(true);
          setShowWinnerAnimation(true);
          setResultCountdown(10);
          
          // Start result display timer
          resultTimerRef.current = setInterval(() => {
            setResultCountdown(prev => {
              if (prev === null || prev <= 1) {
                if (resultTimerRef.current) clearInterval(resultTimerRef.current);
                return null;
              }
              return prev - 1;
            });
          }, 1000);
          
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timerInterval);
  }, [generateBalls]);

  // Set up polling
  useEffect(() => {
    fetchRoomDetails();
    generateBalls();

    const intervalId = setInterval(() => {
      if (pollingRef.current) {
        fetchRoomDetails();
      }
    }, 5000);

    return () => {
      clearInterval(intervalId);
      if (waitingTimerRef.current) clearInterval(waitingTimerRef.current);
      if (resultTimerRef.current) clearInterval(resultTimerRef.current);
    };
  }, [fetchRoomDetails, generateBalls]);

  // Handle winner detection when room data changes
  useEffect(() => {
    if (roomData && roomData.status === 'completed') {
      // If room is completed but winner is not set, try to set it
      if (!winner && roomData.winnerType) {
        setWinner(roomData.winnerType);
        setShowWinnerAnimation(true);
      }
    }
  }, [roomData, winner]);

  // Format functions
  const formatJoinTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Removed unused formatCountdown function

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-blue-400/20"
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
          </div>
          <motion.p 
            className="text-xl text-white font-medium"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            Loading Game Room...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  if (!roomData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center px-4">
        <motion.div 
          className="text-center max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-white mb-2">Room Not Found</h3>
          <p className="text-slate-300 mb-6">
            The game room you're looking for doesn't exist or has been closed.
          </p>
          <Button 
            onClick={() => navigate('/games/big-small')}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Game Rooms
          </Button>
        </motion.div>
      </div>
    );
  }

  const isRoomFull = roomData.currentPlayers >= roomData.maxPlayers;
  const progressPercentage = (roomData.currentPlayers / roomData.maxPlayers) * 100;

  // Replace the style section with a proper CSS-in-JS approach
  const scrollbarStyles = `
    .custom-scrollbar::-webkit-scrollbar {
      width: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: rgba(51, 65, 85, 0.3);
      border-radius: 3px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(168, 85, 247, 0.5);
      border-radius: 3px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: rgba(168, 85, 247, 0.7);
    }
  `;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="fixed top-4 right-4 z-50">
        <div className="flex items-center gap-2 bg-yellow-500/90 text-black px-4 py-2 rounded-lg shadow-lg border border-yellow-700 font-semibold text-sm">
          <AlertCircle className="h-5 w-5 text-black" />
          If you remove this room or exit game your amount is deducted, cannot refund it.
        </div>
      </div>

      {roomData.status === 'waiting' && (
        <div className="fixed inset-0 z-40 bg-black/90 flex flex-col items-center justify-center">
          <SlotMachine />
          <motion.div
            className="text-3xl font-extrabold bg-gradient-to-r from-yellow-400 via-pink-400 to-blue-400 bg-clip-text text-transparent mb-4 drop-shadow-lg"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: [1, 1.1, 1], opacity: 1 }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            Waiting for players...
          </motion.div>
          <motion.div
            className="text-lg text-white font-semibold animate-pulse mb-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            The luck machine is spinning!<br />
            You cannot exit or interact until the game starts.
          </motion.div>
          <motion.div
            className="flex gap-2 mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <span className="text-yellow-300 text-2xl">✨</span>
            <span className="text-pink-300 text-2xl">🎉</span>
            <span className="text-blue-300 text-2xl">💫</span>
            <span className="text-green-300 text-2xl">🍀</span>
          </motion.div>
        </div>
      )}

      {/* Results Dialog */}
      <ResultsDialog 
        isOpen={showResultPopup} 
        onClose={() => setShowResultPopup(false)}
        winningBall={winningBall}
        countdown={resultCountdown}
        players={players}
      />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        
        {/* Header */}
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.h1 
            className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent mb-4"
            animate={{ 
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            🎯 Big Small Arena
          </motion.h1>
          
          <div className="flex justify-center items-center gap-4 mb-6 flex-wrap">
            <motion.div
              className="flex items-center gap-2 bg-slate-800/50 backdrop-blur-sm px-4 py-2 rounded-full border border-purple-500/30"
              whileHover={{ scale: 1.05 }}
            >
              <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">
                Room: {roomId}
              </Badge>
            </motion.div>
            
            <motion.div
              className="flex items-center gap-2 bg-slate-800/50 backdrop-blur-sm px-4 py-2 rounded-full border border-blue-500/30"
              whileHover={{ scale: 1.05 }}
            >
              <span className="text-slate-300">Entry: </span>
              <span className="text-yellow-400 font-bold">₹{roomData.entryFee}</span>
            </motion.div>
            
            <motion.div
              className="flex items-center gap-2 bg-slate-800/50 backdrop-blur-sm px-4 py-2 rounded-full border border-orange-500/30"
              whileHover={{ scale: 1.05 }}
            >
              <Zap className="h-4 w-4 text-orange-400" />
              <span className="text-slate-300">Win: </span>
              <span className="text-orange-400 font-bold">x{roomData.winningMultiplier}</span>
            </motion.div>
          </div>
        </motion.div>

        {/* Main Game Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            <Card className="relative bg-gradient-to-br from-blue-900/80 via-purple-900/70 to-blue-800/80 border-4 border-purple-500/40 shadow-2xl rounded-3xl overflow-hidden backdrop-blur-lg">
            
            {/* Room Status Header */}
            <CardHeader className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border-b border-purple-500/20">
              <motion.div 
                className="text-center"
                animate={showJoinAnimation ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 0.5 }}
              >
                <CardTitle className="flex items-center justify-center gap-3 text-2xl text-white mb-2">
                  <Users className="h-6 w-6 text-purple-400" />
                  <span>Players: {roomData.currentPlayers}/{roomData.maxPlayers}</span>
                  {isRoomFull && (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      className="flex items-center gap-1"
                    >
                      <CheckCircle2 className="h-5 w-5 text-green-400" />
                      <span className="text-sm text-green-400">FULL</span>
                    </motion.div>
                  )}
                </CardTitle>
                
                {/* Progress Bar */}
                <div className="w-full max-w-md mx-auto mb-4">
                  <div className="flex justify-between text-sm text-slate-400 mb-1">
                    <span>Room Progress</span>
                    <span>{Math.round(progressPercentage)}%</span>
                  </div>
                  <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercentage}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                </div>

                {/* Status Display */}
                <CardDescription className="text-center">
                  <AnimatePresence mode="wait">
                    {countdown !== null ? (
                      <motion.div
                        key="countdown"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="text-yellow-400 font-bold text-xl"
                      >
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          >
                            <Timer className="h-6 w-6" />
                          </motion.div>
                          <span>Game Starting...</span>
                        </div>
                        <motion.div
                          className="text-3xl font-mono bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent"
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        >
                          {countdown}
                        </motion.div>
                      </motion.div>
                    ) : roomData.status === 'waiting' ? (
                      <motion.div
                        key="waiting"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-blue-400"
                      >
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <motion.div
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          >
                            <Clock className="h-5 w-5" />
                          </motion.div>
                          <span>Waiting for players...</span>
                        </div>
                        <div className="text-sm text-slate-400">
                          Next check in: {waitingTimer}s
                        </div>
                      </motion.div>
                    ) : roomData.status === 'completed' ? (
                      <motion.div
                        key="completed"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-green-400 font-bold text-lg"
                      >
                        <Trophy className="h-6 w-6 mx-auto mb-1" />
                        Game Completed!
                      </motion.div>
                    ) : (
                      <motion.div
                        key="progress"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-purple-400"
                      >
                        Game in Progress...
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardDescription>
              </motion.div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              
              {/* Casino-like Animation */}
              <motion.div 
                className="relative h-80 bg-gradient-to-br from-slate-900/80 to-slate-800/80 rounded-xl border border-purple-500/30 overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent" />
                
                {/* Random Animated Balls */}
                {balls.map(ball => (
                  <motion.div
                    key={ball.id}
                    className="absolute rounded-full"
                    style={{ 
                      backgroundColor: ball.color,
                      width: ball.size,
                      height: ball.size,
                    }}
                    initial={{ x: `${ball.x}%`, y: `${ball.y}%` }}
                    animate={{ 
                      x: [`${ball.x}%`, `${(ball.x + 30) % 100}%`, `${(ball.x - 20 + 100) % 100}%`],
                      y: [`${ball.y}%`, `${(ball.y - 20 + 100) % 100}%`, `${(ball.y + 40) % 100}%`],
                      scale: [1, 1.1, 0.9, 1]
                    }}
                    transition={{ 
                      duration: 8, 
                      repeat: Infinity, 
                      repeatType: "reverse",
                      ease: "easeInOut"
                    }}
                  />
                ))}
                
                {/* Result Loading Timer */}
                {!showResultPopup && resultTimer > 0 && roomData.status !== 'completed' && (
                  <motion.div 
                    className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black/40 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <motion.div
                      className="w-24 h-24 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center mb-4"
                      animate={{ 
                        scale: [1, 1.1, 1],
                        boxShadow: [
                          '0 0 20px rgba(147, 51, 234, 0.5)',
                          '0 0 40px rgba(147, 51, 234, 0.7)',
                          '0 0 20px rgba(147, 51, 234, 0.5)'
                        ]
                      }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <span className="text-4xl font-bold text-white">{resultTimer}</span>
                    </motion.div>
                    <h3 className="text-2xl font-bold text-white">Results Coming Soon</h3>
                    <p className="text-slate-300">The winning number is being generated...</p>
                  </motion.div>
                )}
                
                  {/* Winner Announcement (when game is completed) */}
                  {roomData.status === 'completed' && (winner || roomData.winnerType) && !showResultPopup && (
                    /* REAL CASINO WINNER ANNOUNCEMENT */
                    <motion.div
                      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      {/* Casino Stage Background */}
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-indigo-900/40 to-pink-900/40"></div>
                      
                      {/* Animated Stage Lights */}
                      <div className="absolute inset-0 overflow-hidden">
                        {[...Array(6)].map((_, i) => (
                          <motion.div
                            key={i}
                            className="absolute w-32 h-32 rounded-full blur-3xl opacity-30"
                            style={{
                              left: `${(i * 20) % 100}%`,
                              top: `${(i * 15) % 100}%`,
                              background: `hsl(${i * 60}, 70%, 60%)`,
                            }}
                            animate={{
                              scale: [1, 1.5, 1],
                              opacity: [0.3, 0.6, 0.3],
                            }}
                            transition={{
                              duration: 3,
                              repeat: Infinity,
                              delay: i * 0.5,
                            }}
                          />
                        ))}
                      </div>

                      {/* Main Casino Winner Display */}
                      <motion.div
                        className="relative w-full max-w-4xl mx-4 bg-gradient-to-br from-black/90 via-gray-900/90 to-black/90 rounded-3xl border-4 border-gradient-to-r from-yellow-500/80 via-amber-500/80 to-yellow-500/80 shadow-2xl shadow-yellow-500/30 overflow-hidden"
                        initial={{ scale: 0.5, y: 100, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                      >
                        {/* Casino Stage Curtains */}
                        <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-red-600/80 to-transparent"></div>
                        <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-red-800/60 to-transparent" style={{ animationDelay: '0.1s' }}></div>
                        
                        {/* Floating Casino Chips */}
                        <div className="absolute inset-0 pointer-events-none">
                          {[...Array(12)].map((_, i) => (
                            <motion.div
                              key={i}
                              className={`absolute w-${Math.floor(Math.random() * 4) + 3} h-${Math.floor(Math.random() * 4) + 3} rounded-full ${
                                ['bg-yellow-400', 'bg-red-400', 'bg-green-400', 'bg-blue-400', 'bg-purple-400'][i % 5]
                              } opacity-60`}
                              style={{
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                              }}
                              animate={{
                                y: [0, -30, 0],
                                rotate: [0, 360],
                                scale: [1, 1.2, 1],
                              }}
                              transition={{
                                duration: 3 + Math.random() * 2,
                                repeat: Infinity,
                                delay: i * 0.3,
                              }}
                            />
                          ))}
                        </div>

                        {/* Shimmer Effect */}
                        <motion.div
                          className="absolute inset-0 pointer-events-none"
                          animate={{ x: [-200, 600] }}
                          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/40 to-transparent transform -skew-x-12" />
                        </motion.div>

                        {/* Content Container */}
                        <div className="relative z-10 p-8 sm:p-12 md:p-16 text-center">
                          {/* Casino Logo/Title */}
                          <motion.div
                            className="mb-8"
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.4 }}
                          >
                            <div className="inline-flex items-center gap-3 bg-gradient-to-r from-yellow-500 to-amber-500 px-6 py-3 rounded-full border-2 border-yellow-300 shadow-lg">
                              <span className="text-2xl">🎰</span>
                              <span className="text-white font-black text-lg tracking-wider">CASINO ROYALE</span>
                              <span className="text-2xl">🎰</span>
                            </div>
                          </motion.div>

                          {/* Massive Trophy Display */}
                          <motion.div
                            className="relative inline-block mb-8"
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ duration: 1, delay: 0.6, type: "spring", bounce: 0.4 }}
                          >
                            {/* Trophy Glow Rings */}
                            <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full blur-2xl opacity-60 animate-pulse"></div>
                            <div className="absolute inset-0 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-full blur-xl opacity-40 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                            
                            {/* Main Trophy */}
                            <div className="relative bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-600 p-6 rounded-full border-4 border-yellow-300 shadow-2xl">
                              <Trophy className="h-24 w-24 text-yellow-800 drop-shadow-lg" />
                            </div>
                            
                            {/* Trophy Sparkles */}
                            {[...Array(8)].map((_, i) => (
                              <motion.div
                                key={i}
                                className="absolute w-3 h-3 bg-yellow-300 rounded-full"
                                style={{
                                  left: `${Math.cos(i * 45 * Math.PI / 180) * 60 + 50}%`,
                                  top: `${Math.sin(i * 45 * Math.PI / 180) * 60 + 50}%`,
                                }}
                                animate={{
                                  scale: [0, 1, 0],
                                  opacity: [0, 1, 0],
                                }}
                                transition={{
                                  duration: 1.5,
                                  repeat: Infinity,
                                  delay: i * 0.2,
                                }}
                              />
                            ))}
                          </motion.div>

                          {/* Winner Announcement */}
                          <motion.div
                            className="mb-8"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.8, delay: 0.8 }}
                          >
                            {/* Winner Type Badge */}
                            <motion.div
                              className={`inline-flex items-center gap-3 px-8 py-4 rounded-full border-3 shadow-2xl mb-6 ${
                                (winner || roomData.winnerType) === 'big' 
                                  ? 'bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-800 border-blue-400' 
                                  : 'bg-gradient-to-r from-green-600 via-emerald-600 to-green-800 border-green-400'
                              }`}
                              animate={{
                                boxShadow: [
                                  "0 0 20px rgba(59, 130, 246, 0.5)",
                                  "0 0 40px rgba(59, 130, 246, 0.8)",
                                  "0 0 20px rgba(59, 130, 246, 0.5)"
                                ]
                              }}
                              transition={{ duration: 2, repeat: Infinity }}
                            >
                                                             <span className="text-3xl">
                                 {(winner || roomData.winnerType) === 'big' ? '🔴' : '🟢'}
                               </span>
                               <span className="text-white font-black text-2xl tracking-wider">
                                 {(winner || roomData.winnerType) === 'big' ? 'BIG PREDICTION' : 'SMALL PREDICTION'}
                               </span>
                               <span className="text-3xl">
                                 {(winner || roomData.winnerType) === 'big' ? '🔴' : '🟢'}
                               </span>
                            </motion.div>

                            {/* Main Winner Text */}
                            <motion.h2
                              className={`text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black mb-4 tracking-wider ${
                                (winner || roomData.winnerType) === 'big' 
                                  ? 'bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-600' 
                                  : 'bg-gradient-to-r from-green-400 via-emerald-400 to-green-600'
                              } bg-clip-text text-transparent`}
                              animate={{
                                scale: [1, 1.05, 1],
                                textShadow: [
                                  "0 0 20px rgba(59, 130, 246, 0.5)",
                                  "0 0 40px rgba(59, 130, 246, 0.8)",
                                  "0 0 20px rgba(59, 130, 246, 0.5)"
                                ]
                              }}
                              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            >
                              {(winner || roomData.winnerType) === 'big' ? 'BIG WINS!' : 'SMALL WINS!'}
                            </motion.h2>

                            {/* Celebration Emojis */}
                            <motion.div
                              className="flex items-center justify-center gap-4 mb-6"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.8, delay: 1 }}
                            >
                              <motion.span
                                className="text-6xl sm:text-7xl md:text-8xl"
                                animate={{
                                  y: [0, -20, 0],
                                  rotate: [0, 10, -10, 0],
                                }}
                                transition={{ duration: 1, repeat: Infinity }}
                              >
                                🎉
                              </motion.span>
                              <motion.span
                                className="text-6xl sm:text-7xl md:text-8xl"
                                animate={{
                                  y: [0, -20, 0],
                                  rotate: [0, -10, 10, 0],
                                }}
                                transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                              >
                                🏆
                              </motion.span>
                              <motion.span
                                className="text-6xl sm:text-7xl md:text-8xl"
                                animate={{
                                  y: [0, -20, 0],
                                  rotate: [0, 10, -10, 0],
                                }}
                                transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                              >
                                💎
                              </motion.span>
                            </motion.div>

                            {/* Subtitle */}
                            <motion.p
                              className="text-yellow-300 text-2xl sm:text-3xl font-bold mb-4"
                              animate={{ opacity: [0.7, 1, 0.7] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            >
                              ⚡ CONGRATULATIONS WINNERS! ⚡
                            </motion.p>

                            <motion.p
                              className="text-slate-300 text-xl sm:text-2xl font-semibold"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.8, delay: 1.2 }}
                            >
                              All {(winner || roomData.winnerType) === 'big' ? 'Big' : 'Small'} prediction players are victorious! 🎊
                            </motion.p>
                          </motion.div>

                          {/* Casino Sound Effects Indicator */}
                          <motion.div
                            className="flex items-center justify-center gap-2 text-yellow-400 text-sm"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.8, delay: 1.4 }}
                          >
                            <span className="animate-pulse">🔊</span>
                            <span className="font-semibold">CASINO WIN SOUNDS PLAYING</span>
                            <span className="animate-pulse">🔊</span>
                          </motion.div>
                        </div>

                        {/* Celebration Particles */}
                        <div className="absolute inset-0 pointer-events-none">
                          {[...Array(20)].map((_, i) => (
                            <motion.div
                              key={i}
                              className={`absolute w-${Math.floor(Math.random() * 3) + 2} h-${Math.floor(Math.random() * 3) + 2} rounded-full ${
                                ['bg-yellow-400', 'bg-red-400', 'bg-green-400', 'bg-blue-400', 'bg-purple-400', 'bg-white'][i % 6]
                              }`}
                              style={{
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                              }}
                              animate={{
                                y: [-20, -150],
                                x: [0, Math.random() * 100 - 50],
                                opacity: [1, 0],
                                scale: [1, 0.3],
                                rotate: [0, 360],
                              }}
                              transition={{
                                duration: 3 + Math.random() * 2,
                                repeat: Infinity,
                                delay: i * 0.1,
                              }}
                            />
                          ))}
                        </div>

                        {/* Close Button */}
                        <motion.button
                          className="absolute top-4 right-4 w-12 h-12 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg transition-colors"
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.5, delay: 1.5 }}
                          onClick={() => setShowResultPopup(true)}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          ✕
                        </motion.button>
                      </motion.div>
                    </motion.div>
                  )}
                
                {/* Game Legend */}
                <div className="absolute bottom-0 left-0 right-0 bg-black/30 backdrop-blur-sm p-4 flex justify-around items-center">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-green-400" />
                    <span className="text-green-300 font-bold">SMALL (1-5)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-400" />
                    <span className="text-blue-300 font-bold">BIG (6-10)</span>
                  </div>
                </div>
              </motion.div>

              {/* Winner Announcement */}
              {/* <AnimatePresence>
                {winner && showWinnerAnimation && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5, y: 50 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.5, y: -50 }}
                    className="relative bg-gradient-to-r from-purple-900/50 via-pink-900/50 to-indigo-900/50 p-8 rounded-2xl border border-yellow-500/50 overflow-hidden"
                  >
                    <div className="absolute inset-0">
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-transparent to-yellow-400/20"
                        animate={{ x: [-100, 300] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      />
                    </div>
                    
                    <div className="relative z-10 text-center">
                      <motion.div
                        animate={{ rotate: [0, 360] }}
                        transition={{ duration: 2, ease: "easeInOut" }}
                        className="inline-block mb-4"
                      >
                        <Trophy className="h-16 w-16 text-yellow-400" />
                      </motion.div>
                      
                      <motion.h3 
                        className="text-3xl font-bold mb-3"
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
                      >
                        {winner === 'big' ? (
                          <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                            🎉 BIG WINS! 🎉
                          </span>
                        ) : (
                          <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                            🎉 SMALL WINS! 🎉
                          </span>
                        )}
                      </motion.h3>
                      
                      <p className="text-slate-300 text-lg mb-4">
                        Congratulations to all {winner === 'big' ? 'Big' : 'Small'} prediction players!
                      </p>
                      
                      {resultCountdown !== null && (
                        <motion.div
                          className="bg-slate-800/50 px-4 py-2 rounded-full inline-block"
                          animate={{ backgroundColor: ['rgba(30, 41, 59, 0.5)', 'rgba(59, 130, 246, 0.2)', 'rgba(30, 41, 59, 0.5)'] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        >
                          <span className="text-yellow-400 font-mono font-bold">
                            Results closing in: {resultCountdown}s
                          </span>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence> */}

              {/* Players List */}
              <motion.div 
                className="space-y-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-400" />
                  Players in Room
                </h3>
                
                {players.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                    <AnimatePresence>
                      {players.map((player, index) => (
                        <motion.div
                          key={player.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                          className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-800/50 to-slate-700/30 rounded-xl border border-slate-600/30 backdrop-blur-sm hover:border-purple-500/30 transition-all duration-300"
                          whileHover={{ scale: 1.02, backgroundColor: 'rgba(100, 116, 139, 0.1)' }}
                        >
                          <div className="flex items-center gap-4">
                            <Avatar className="border-2 border-purple-500/30">
                              <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600 text-white font-bold">
                                {player.user.name.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-semibold text-white flex items-center gap-2">
                                {player.user.name}
                                {player.hasWon && (
                                  <motion.div
                                    initial={{ scale: 0, rotate: -180 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                                  >
                                    <Award className="h-4 w-4 text-yellow-400" />
                                  </motion.div>
                                )}
                              </div>
                              <div className="text-sm text-slate-400 flex items-center gap-2">
                                <Clock className="h-3 w-3" />
                                Joined at {formatJoinTime(player.joinedAt)}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <Badge 
                              className={cn(
                                "font-semibold transition-all duration-300",
                                player.numberType === 'big' 
                                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-0 hover:from-blue-500 hover:to-cyan-500' 
                                  : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white border-0 hover:from-green-500 hover:to-emerald-500'
                              )}
                            >
                              {player.numberType === 'big' ? (
                                <>
                                  <TrendingUp className="h-3 w-3 mr-1" /> 
                                  BIG
                                </>
                              ) : (
                                <>
                                  <TrendingDown className="h-3 w-3 mr-1" />
                                  SMALL
                                </>
                              )}
                            </Badge>
                            
                            <div className="bg-gradient-to-r from-yellow-600 to-orange-600 text-white px-3 py-1 rounded-lg font-bold text-sm">
                              ₹{player.entryAmount}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                ) : (
                  <motion.div 
                    className="text-center py-12 bg-slate-800/30 rounded-xl border border-slate-600/30"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <User className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                    <p className="text-slate-400 text-lg">No players have joined yet</p>
                    <p className="text-slate-500 text-sm mt-2">Be the first to join this room!</p>
                  </motion.div>
                )}
              </motion.div>
            </CardContent>

            <CardFooter className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 border-t border-slate-600/30 p-6">
              <motion.div className="w-full flex gap-4">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1"
                >
                  <Button 
                    variant="outline" 
                    className="w-full bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-600 hover:text-white hover:border-slate-500 transition-all duration-300"
                    onClick={() => navigate('/games/big-small')}
                    disabled={roomData.status === 'waiting'}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Rooms
                  </Button>
                </motion.div>
                
                {!isRoomFull && roomData.status === 'waiting' && (
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1"
                  >
                    <Button 
                      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0 font-semibold"
                    >
                      <Star className="h-4 w-4 mr-2" />
                      Join Game
                    </Button>
                  </motion.div>
                )}
                
                {isRoomFull && countdown !== null && (
                  <motion.div 
                    className="flex-1 bg-gradient-to-r from-yellow-600 to-orange-600 text-white px-4 py-2 rounded-lg font-bold text-center"
                    animate={{ 
                      boxShadow: [
                        '0 0 20px rgba(251, 191, 36, 0.3)',
                        '0 0 40px rgba(251, 191, 36, 0.6)',
                        '0 0 20px rgba(251, 191, 36, 0.3)'
                      ]
                    }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    Game Starting in {countdown}s
                  </motion.div>
                )}
              </motion.div>
            </CardFooter>
          </Card>
          </motion.div>
        </motion.div>

        {/* Room Status Indicators */}
        <motion.div 
          className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <motion.div 
            className="bg-slate-800/50 backdrop-blur-sm p-4 rounded-xl border border-slate-600/30 text-center"
            whileHover={{ scale: 1.02, borderColor: 'rgb(168, 85, 247, 0.4)' }}
          >
            <Clock className="h-8 w-8 text-purple-400 mx-auto mb-2" />
            <div className="text-white font-semibold mb-1">Room Status</div>
            <div className={cn(
              "text-sm font-medium capitalize",
              roomData.status === 'waiting' ? 'text-blue-400' : 
              roomData.status === 'completed' ? 'text-green-400' : 'text-yellow-400'
            )}>
              {roomData.status}
            </div>
          </motion.div>
          
          <motion.div 
            className="bg-slate-800/50 backdrop-blur-sm p-4 rounded-xl border border-slate-600/30 text-center"
            whileHover={{ scale: 1.02, borderColor: 'rgb(34, 197, 94, 0.4)' }}
          >
            <Users className="h-8 w-8 text-green-400 mx-auto mb-2" />
            <div className="text-white font-semibold mb-1">Total Players</div>
            <div className="text-green-400 text-sm font-medium">
              {roomData.currentPlayers} / {roomData.maxPlayers}
            </div>
          </motion.div>
          
          <motion.div 
            className="bg-slate-800/50 backdrop-blur-sm p-4 rounded-xl border border-slate-600/30 text-center"
            whileHover={{ scale: 1.02, borderColor: 'rgb(251, 191, 36, 0.4)' }}
          >
            <Trophy className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
            <div className="text-white font-semibold mb-1">Prize Pool</div>
            <div className="text-yellow-400 text-sm font-medium">
              ₹{roomData.entryFee * roomData.currentPlayers}
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Custom Styles */}
      <style dangerouslySetInnerHTML={{ __html: scrollbarStyles }} />
    </div>
  );
};

// Results Dialog
interface ResultsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  winningBall: { number: number; type: 'big' | 'small' } | null;
  countdown: number | null;
  players: Player[];
}

const ResultsDialog = ({ isOpen, onClose, winningBall, countdown, players }: ResultsDialogProps) => {
  const [showCountdown, setShowCountdown] = useState(true);
  const [countdownNumber, setCountdownNumber] = useState(5);
  const [showResult, setShowResult] = useState(false);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const userId = localStorage.getItem('userId');
  const isWinner = players?.some((p: Player) => p.hasWon && p.user.id === userId);

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setShowCountdown(true);
      setCountdownNumber(5);
      setShowResult(false);

      const countdownInterval = setInterval(() => {
        setCountdownNumber(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            setShowCountdown(false);
            setShowResult(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(countdownInterval);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {isWinner && showResult && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={500}
          gravity={0.2}
        />
      )}
      <DialogContent className="fixed top-0 left-0 right-0 bg-gradient-to-br from-slate-900 to-slate-800 border-purple-500/30 text-white max-w-md mx-auto mt-4">
        <DialogHeader>
          {showCountdown ? (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="text-center py-8"
            >
              {showCountdown && (
                <motion.div
                  className="w-32 h-32 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center mx-auto mb-4 shadow-2xl border-4 border-yellow-400 animate-pulse"
                  animate={{ scale: [1, 1.2, 1], boxShadow: [
                    '0 0 20px #a78bfa',
                    '0 0 40px #a78bfa',
                    '0 0 20px #a78bfa',
                  ] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <span className="text-6xl font-bold text-white animate-pulse">{countdownNumber}</span>
                </motion.div>
              )}
              <motion.h2 
                className="text-2xl font-bold text-white"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                Results Coming Soon...
              </motion.h2>
            </motion.div>
          ) : (
            <AnimatePresence>
              {showResult && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                >
                  <DialogTitle className="text-3xl font-bold text-center mb-4">
                    {isWinner ? (
                      <motion.div
                        initial={{ scale: 0.5 }}
                        animate={{ scale: 1 }}
                        className="space-y-4"
                      >
                        <motion.div
                          animate={{ 
                            y: [0, -20, 0],
                            rotate: [0, 10, -10, 0]
                          }}
                          transition={{ duration: 0.5, repeat: Infinity }}
                        >
                          🎉 CONGRATULATIONS! 🎉
                        </motion.div>
                        <motion.div
                          className="text-2xl bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent"
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 0.5, repeat: Infinity }}
                        >
                          YOU WON!
                        </motion.div>
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ scale: 0.5 }}
                        animate={{ scale: 1 }}
                        className="space-y-4"
                      >
                        <motion.div
                          animate={{ 
                            y: [0, -10, 0],
                            rotate: [0, 5, -5, 0]
                          }}
                          transition={{ duration: 0.5, repeat: Infinity }}
                        >
                          😢 BETTER LUCK NEXT TIME! 😢
                        </motion.div>
                        <motion.div
                          className="text-2xl bg-gradient-to-r from-red-400 to-pink-400 bg-clip-text text-transparent"
                          animate={{ scale: [1, 1.05, 1] }}
                          transition={{ duration: 0.5, repeat: Infinity }}
                        >
                          YOU LOST
                        </motion.div>
                      </motion.div>
                    )}
                  </DialogTitle>

                  <DialogDescription className="text-center">
                    <motion.div
                      className="w-40 h-40 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center mx-auto my-6"
                      animate={{ 
                        scale: [1, 1.1, 1],
                        boxShadow: [
                          '0 0 20px rgba(147, 51, 234, 0.5)',
                          '0 0 40px rgba(147, 51, 234, 0.7)',
                          '0 0 20px rgba(147, 51, 234, 0.5)'
                        ]
                      }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <span className="text-6xl font-bold text-white">{winningBall?.number}</span>
                    </motion.div>

                    <motion.div
                      className="text-xl text-slate-300 mt-4 mb-6"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <p>Winning Number: <span className="font-bold text-yellow-400">{winningBall?.number}</span></p>
                      <p className="mt-2">
                        {winningBall?.type === 'big' ? (
                          <span className="text-blue-400">BIG (6-10) WINS!</span>
                        ) : (
                          <span className="text-green-400">SMALL (1-5) WINS!</span>
                        )}
                      </p>
                    </motion.div>

                    <motion.div 
                      className="flex justify-center gap-6 mb-6"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <div className="flex flex-col items-center">
                        <Badge className="bg-gradient-to-r from-green-600 to-emerald-600 text-white border-0 mb-1">
                          <TrendingDown className="h-3 w-3 mr-1" /> SMALL
                        </Badge>
                        <span className="text-sm text-slate-400">Numbers 1-5</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <Badge className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-0 mb-1">
                          <TrendingUp className="h-3 w-3 mr-1" /> BIG
                        </Badge>
                        <span className="text-sm text-slate-400">Numbers 6-10</span>
                      </div>
                    </motion.div>
                  </DialogDescription>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </DialogHeader>

        {showResult && countdown !== null && (
          <motion.div
            className="mt-4 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="bg-slate-800/50 px-4 py-2 rounded-full inline-block"
              animate={{ backgroundColor: ['rgba(30, 41, 59, 0.5)', 'rgba(59, 130, 246, 0.2)', 'rgba(30, 41, 59, 0.5)'] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <span className="text-yellow-400 font-mono font-bold">
                Results closing in: {countdown}s
              </span>
            </motion.div>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BigSmallRoom;