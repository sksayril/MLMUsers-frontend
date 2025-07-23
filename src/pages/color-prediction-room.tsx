import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle,  Clock, Loader2, Trophy, Users, Coins, Target, Zap, Crown, TrendingDown, Wallet } from 'lucide-react';
import axios from 'axios';

// Define TypeScript interfaces
interface Player {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  colorSelected: string;
  hasWon: boolean;
  joinedAt: string;
}

interface GameRoom {
  id: string;
  roomId: string;
  entryFee: number;
  benefitFeeMultiplier: number;
  winningAmount: number;
  maxPlayers: number;
  currentPlayers: number;
  availableColors: string[];
  colorCounts: {
    red: number;
    green: number;
    blue: number;
    yellow: number;
  };
  status: string;
  createdAt: string;
}

interface GameRoomResponse {
  success: boolean;
  gameRoom: GameRoom;
  players: Player[];
}

const ColorPredictionRoom: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // States
  const [gameRoom, setGameRoom] = useState<GameRoom | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [winner, setWinner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch game room details
  const fetchRoomDetails = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast({
          variant: 'destructive',
          title: 'Authentication error',
          description: 'You are not logged in. Please log in to access game rooms.'
        });
        navigate('/login');
        return;
      }

      const response = await axios.get<GameRoomResponse>(`https://api.utpfund.live/api/game/room/${roomId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setGameRoom(response.data.gameRoom);
        setPlayers(response.data.players);
        
        // If game is completed, determine winner
        if (response.data.gameRoom.status === 'completed') {
          const winningPlayer = response.data.players.find(player => player.hasWon);
          if (winningPlayer) {
            setWinner(winningPlayer.colorSelected);
          } else {
            // No winner
            setWinner('none');
          }
          
          // Stop polling when game is completed
          return false;
        }
        
        // Continue polling if game is still active
        return true;
      } else {
        toast({
          variant: 'destructive',
          title: 'Error fetching game room',
          description: 'Could not retrieve game room information.'
        });
        return false;
      }
    } catch (error) {
      const errorResponse = error as { response?: { data?: { message?: string } } };
      setError(errorResponse.response?.data?.message || 'Failed to load game room information');
      toast({
        variant: 'destructive',
        title: 'Error fetching game room',
        description: errorResponse.response?.data?.message || 'Could not retrieve game room information.'
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [roomId, toast, navigate]);
  
  // Join room with selected color
  const joinRoom = async (color: string) => {
    try {
      setIsJoining(true);
      setSelectedColor(color);
      
      const token = localStorage.getItem('token');
      if (!token) {
        toast({
          variant: 'destructive',
          title: 'Authentication error',
          description: 'You are not logged in. Please log in to join the game.'
        });
        navigate('/login');
        return;
      }
      
      const response = await axios.post(
        'https://api.utpfund.live/api/game/room/join', 
        {
          roomId: roomId,
          colorSelected: color
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (response.data.success) {
        toast({
          title: 'Joined Game Room',
          description: `You have successfully joined with color ${color}.`
        });
        setHasJoined(true);
        fetchRoomDetails(); // Refresh room details
      } else {
        toast({
          variant: 'destructive',
          title: 'Failed to join room',
          description: response.data.message || 'An error occurred while joining the game room.'
        });
      }
    } catch (error) {
      const errorResponse = error as { response?: { data?: { message?: string } } };
      toast({
        variant: 'destructive',
        title: 'Failed to join room',
        description: errorResponse.response?.data?.message || 'An error occurred while joining the game room.'
      });
    } finally {
      setIsJoining(false);
    }
  };
  
  // Start countdown timer when game is about to end
  useEffect(() => {
    if (gameRoom?.status === 'completed' && countdown === null) {
      setCountdown(10);
    }
    
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      // Redirect back to game selection after countdown finishes
      navigate('/games/color-prediction');
    }
  }, [countdown, gameRoom?.status, navigate]);
  
  // Polling for room status updates
  useEffect(() => {
    const fetchData = async () => {
      const shouldContinuePolling = await fetchRoomDetails();
      return shouldContinuePolling;
    };
    
    // Initial fetch
    fetchData();
    
    // Set up polling with 5-second interval
    const intervalId = setInterval(async () => {
      console.log('Polling game room data...');
      const shouldContinue = await fetchData();
      if (!shouldContinue) {
        clearInterval(intervalId);
      }
    }, 5000); // Changed from 10000 to 5000
    
    return () => {
      console.log('Clearing game room polling interval');
      clearInterval(intervalId);
    };
  }, [fetchRoomDetails]);
  
  // Get color variant for styling
  const getColorVariant = (color: string) => {
    switch (color) {
      case 'red':
        return 'bg-red-500';
      case 'green':
        return 'bg-green-500';
      case 'blue':
        return 'bg-blue-500';
      case 'yellow':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Get enhanced color styling with glow effects
  const getEnhancedColorStyle = (color: string, isSelected: boolean = false) => {
    const baseStyle = "relative overflow-hidden transition-all duration-300 transform hover:scale-105 hover:shadow-2xl";
    const glowEffect = isSelected ? "shadow-2xl animate-pulse" : "hover:shadow-xl";
    
    switch (color) {
      case 'red':
        return `${baseStyle} bg-gradient-to-br from-red-400 to-red-600 hover:from-red-300 hover:to-red-500 ${glowEffect} hover:shadow-red-500/50`;
      case 'green':
        return `${baseStyle} bg-gradient-to-br from-green-400 to-green-600 hover:from-green-300 hover:to-green-500 ${glowEffect} hover:shadow-green-500/50`;
      case 'blue':
        return `${baseStyle} bg-gradient-to-br from-blue-400 to-blue-600 hover:from-blue-300 hover:to-blue-500 ${glowEffect} hover:shadow-blue-500/50`;
      case 'yellow':
        return `${baseStyle} bg-gradient-to-br from-yellow-400 to-yellow-600 hover:from-yellow-300 hover:to-yellow-500 ${glowEffect} hover:shadow-yellow-500/50`;
      default:
        return `${baseStyle} bg-gradient-to-br from-gray-400 to-gray-600 hover:from-gray-300 hover:to-gray-500 ${glowEffect}`;
    }
  };
  
  // Format date to readable format
  // const formatDate = (dateString: string) => {
  //   const date = new Date(dateString);
  //   return date.toLocaleString();
  // };

  // Check if current user won
  const currentUserWon = () => {
    const userId = localStorage.getItem('userId');
    return players.some(p => p.hasWon && p.user.id === userId);
  };
  
  // Game status renderer
  const renderGameStatus = () => {
    if (!gameRoom) return null;
    
    if (gameRoom.status === 'completed') {
      const userWon = currentUserWon();
      
      return (
        <div className="space-y-8">
          <div className="text-center">
            {/* Winner/Loser Display */}
            {winner && winner !== 'none' ? (
              <div className="space-y-6">
                {userWon ? (
                  // Winner Display
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-orange-400/20 rounded-2xl blur-xl"></div>
                    <div className="relative bg-gradient-to-br from-yellow-900/50 to-orange-900/50 rounded-2xl p-8 border-2 border-yellow-400/30">
                      <div className="flex justify-center mb-4">
                        <div className="relative">
                          <Crown className="h-16 w-16 text-yellow-400 animate-bounce" />
                          <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full animate-ping"></div>
                        </div>
                      </div>
                      <h2 className="text-4xl font-bold text-yellow-400 mb-2 animate-pulse">🎉 WINNER! 🎉</h2>
                      <p className="text-xl text-yellow-200 mb-4">Congratulations! You predicted correctly!</p>
                      
                      <div className="flex items-center justify-center gap-3 mb-4">
                        <span className="text-lg text-yellow-200">Winning color:</span>
                        <div className="relative">
                          <div 
                            className={`w-12 h-12 rounded-full ${getColorVariant(winner)} animate-spin`}
                            style={{ animationDuration: '2s' }}
                          ></div>
                          <div className="absolute inset-0 w-12 h-12 rounded-full border-4 border-yellow-400 animate-pulse"></div>
                        </div>
                        <span className="text-lg font-bold text-yellow-400 capitalize">{winner}</span>
                      </div>
                      
                      <div className="bg-yellow-900/30 rounded-lg p-4 mb-4">
                        <div className="flex items-center justify-center gap-2 text-yellow-200">
                          <Coins className="h-6 w-6" />
                          <span className="text-2xl font-bold">₹{gameRoom.winningAmount}</span>
                          <span>Prize Won!</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Loser Display
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 to-pink-600/20 rounded-2xl blur-xl"></div>
                    <div className="relative bg-gradient-to-br from-red-900/50 to-pink-900/50 rounded-2xl p-8 border-2 border-red-400/30">
                      <div className="flex justify-center mb-4">
                        <div className="relative">
                          <TrendingDown className="h-16 w-16 text-red-400 animate-bounce" />
                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-400 rounded-full animate-ping"></div>
                        </div>
                      </div>
                      <h2 className="text-4xl font-bold text-red-400 mb-2">😔 BETTER LUCK NEXT TIME</h2>
                      <p className="text-xl text-red-200 mb-4">Don't give up! Victory awaits in the next round!</p>
                      
                      <div className="flex items-center justify-center gap-3 mb-4">
                        <span className="text-lg text-red-200">Winning color was:</span>
                        <div className="relative">
                          <div 
                            className={`w-12 h-12 rounded-full ${getColorVariant(winner)} animate-spin`}
                            style={{ animationDuration: '2s' }}
                          ></div>
                          <div className="absolute inset-0 w-12 h-12 rounded-full border-4 border-red-400 animate-pulse"></div>
                        </div>
                        <span className="text-lg font-bold text-red-400 capitalize">{winner}</span>
                      </div>
                      
                      <div className="bg-red-900/30 rounded-lg p-4 mb-4">
                        <div className="flex items-center justify-center gap-2 text-red-200">
                          <Target className="h-6 w-6" />
                          <span className="text-lg">Your choice: </span>
                          <span className="font-bold capitalize">{selectedColor}</span>
                        </div>
                      </div>
                      
                      <div className="text-red-300 text-sm">
                        <p>💡 Tip: Study the patterns and trust your instincts!</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // No Winner Display
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-gray-600/20 to-slate-600/20 rounded-2xl blur-xl"></div>
                <div className="relative bg-gradient-to-br from-gray-900/50 to-slate-900/50 rounded-2xl p-8 border-2 border-gray-400/30">
                  <AlertCircle className="h-16 w-16 mx-auto text-amber-400 mb-4 animate-pulse" />
                  <h2 className="text-3xl font-bold text-amber-400 mb-2">🎲 NO WINNER</h2>
                  <p className="text-xl text-amber-200">No one predicted correctly this round!</p>
                </div>
              </div>
            )}
            
            {/* Countdown and Navigation */}
            <div className="mt-8 bg-slate-900/50 rounded-xl p-6">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Clock className="h-5 w-5 text-blue-400" />
                <p className="text-lg text-blue-200">Redirecting to lobby in <span className="font-bold text-blue-400">{countdown}</span> seconds...</p>
              </div>
              <Button 
                onClick={() => navigate('/games/color-prediction')}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 transform hover:scale-105 transition-all duration-200"
              >
                <Zap className="h-4 w-4 mr-2" />
                Return to Game Lobby
              </Button>
            </div>
          </div>
        </div>
      );
    }
    
    if (hasJoined) {
      // Enhanced Waiting Lobby
      return (
        <div className="text-center space-y-8">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl blur-xl"></div>
            <div className="relative bg-gradient-to-br from-blue-900/50 to-purple-900/50 rounded-2xl p-8 border-2 border-blue-400/30">
              
              {/* Header */}
              <div className="mb-6">
                <div className="flex justify-center mb-4">
                  <div className="relative">
                    <Users className="h-12 w-12 text-blue-400 animate-pulse" />
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-400 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-blue-900">{gameRoom.currentPlayers}</span>
                    </div>
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-blue-400 mb-2">🎮 Waiting for Players</h2>
                <p className="text-blue-200">Get ready for an exciting color prediction battle!</p>
              </div>

              {/* Animated Loading Spinner */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-400"></div>
                  <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-2 border-blue-400/30"></div>
                </div>
              </div>

              {/* Player Progress */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-blue-200">Players Joined</span>
                  <span className="text-blue-400 font-bold">{gameRoom.currentPlayers} / {gameRoom.maxPlayers}</span>
                </div>
                <div className="w-full bg-blue-900/50 rounded-full h-3 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-400 to-purple-500 rounded-full transition-all duration-500 ease-out animate-pulse"
                    style={{ width: `${(gameRoom.currentPlayers / gameRoom.maxPlayers) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Players List */}
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-4 text-blue-300 flex items-center justify-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Battle Arena
                </h3>
                <div className="grid gap-3">
                  {players.map((player, index) => (
                    <div 
                      key={player.id} 
                      className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-blue-950/70 to-purple-950/70 border border-blue-500/20 transform hover:scale-105 transition-all duration-200"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center font-bold text-white">
                          {player.user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="text-left">
                          <span className="text-white font-medium">{player.user.name}</span>
                          {player.user.id === localStorage.getItem('userId') && (
                            <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-1 rounded-full">You</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div 
                          className={`w-8 h-8 rounded-full ${getColorVariant(player.colorSelected)} border-2 border-white/30 shadow-lg animate-pulse`}
                          title={player.colorSelected}
                        ></div>
                        <span className="text-sm text-blue-300 capitalize font-medium">{player.colorSelected}</span>
                      </div>
                    </div>
                  ))}
                  
                  {/* Placeholder slots for remaining players */}
                  {Array.from({ length: gameRoom.maxPlayers - players.length }).map((_, idx) => (
                    <div 
                      key={`empty-${idx}`} 
                      className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-slate-950/30 to-gray-950/30 border border-slate-500/20 opacity-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-600/30 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-slate-400" />
                        </div>
                        <span className="text-slate-400">Waiting for player...</span>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-slate-600/30 border-2 border-slate-500/20"></div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Your Selection Display */}
              <div className="bg-gradient-to-r from-blue-950/50 to-purple-950/50 rounded-xl p-4 border border-blue-400/20">
                <div className="flex items-center justify-center gap-3">
                  <Target className="h-5 w-5 text-blue-400" />
                  <span className="text-blue-200">Your Prediction:</span>
                  <div 
                    className={`w-6 h-6 rounded-full ${getColorVariant(selectedColor || '')} border-2 border-white/50 animate-pulse`}
                  ></div>
                  <span className="font-bold text-blue-400 capitalize">{selectedColor}</span>
                </div>
                <p className="text-sm text-blue-300 mt-2">🤞 Good luck! May the odds be in your favor!</p>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    // Enhanced Color selection UI
    return (
      <div className="space-y-8">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-2xl blur-xl"></div>
            <div className="relative bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-2xl p-6 border-2 border-purple-400/30">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <Target className="h-16 w-16 text-purple-400 animate-pulse" />
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-purple-400 rounded-full animate-ping"></div>
                </div>
              </div>
              <h2 className="text-4xl font-bold mb-3 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                🎯 Choose Your Destiny
              </h2>
              <p className="text-lg text-purple-200 mb-4">
                Select your lucky color and enter the battle arena!
              </p>
              
              <div className="bg-purple-900/30 rounded-lg p-4">
                <div className="flex items-center justify-center gap-2 text-purple-200">
                  <Coins className="h-5 w-5" />
                  <span>Entry Fee: <span className="font-bold text-purple-400">₹{gameRoom.entryFee}</span></span>
                  <span className="mx-2">•</span>
                  <Trophy className="h-5 w-5" />
                  <span>Prize Pool: <span className="font-bold text-purple-400">₹{gameRoom.winningAmount}</span></span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Enhanced Color Selection Grid */}
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4 mb-8">
          {gameRoom.availableColors.map((color, index) => (
            <div
              key={color}
              className="relative group"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <Button 
                className={`
                  w-full h-32 rounded-2xl text-white font-bold text-xl
                  ${getEnhancedColorStyle(color, selectedColor === color)}
                  disabled:opacity-50 disabled:cursor-not-allowed
                  group-hover:shadow-2xl
                `}
                disabled={isJoining}
                onClick={() => joinRoom(color)}
              >
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-2 left-2 w-4 h-4 bg-white/30 rounded-full"></div>
                  <div className="absolute bottom-2 right-2 w-6 h-6 bg-white/20 rounded-full"></div>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 border-2 border-white/30 rounded-full"></div>
                </div>
                
                {/* Color Name */}
                <div className="relative z-10 flex flex-col items-center gap-2">
                  <div className="text-2xl font-bold drop-shadow-lg">
                    {color.charAt(0).toUpperCase() + color.slice(1)}
                  </div>
                  
                  {/* Loading Spinner */}
                  {isJoining && selectedColor === color && (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  )}
                  
                  {/* Color Emoji */}
                  <div className="text-sm opacity-80">
                    {color === 'red' && '🔴'}
                    {color === 'green' && '🟢'}
                    {color === 'blue' && '🔵'}
                    {color === 'yellow' && '🟡'}
                  </div>
                </div>

                {/* Hover Glow Effect */}
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/10"></div>
              </Button>
              
              {/* Selection Ring */}
              {selectedColor === color && (
                <div className="absolute -inset-1 rounded-2xl border-4 border-white animate-pulse"></div>
              )}
            </div>
          ))}
        </div>
        
        {/* Game Info Footer */}
        <div className="bg-gradient-to-r from-slate-900/50 to-gray-900/50 rounded-xl p-6 border border-slate-500/20">
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2 text-slate-300">
              <div className={`w-3 h-3 rounded-full ${gameRoom.status === 'waiting' ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`}></div>
              <span>Status: </span>
              <span className="font-semibold capitalize text-white">{gameRoom.status}</span>
            </div>
            
            <div className="flex items-center gap-2 text-slate-300">
              <Users className="h-4 w-4" />
              <span>Players: </span>
              <span className="font-semibold text-white">{gameRoom.currentPlayers} / {gameRoom.maxPlayers}</span>
            </div>
          </div>
          
          <div className="mt-4 text-center">
            <p className="text-xs text-slate-400">
              💡 Choose wisely! Your prediction could make you the next champion!
            </p>
          </div>
        </div>
      </div>
    );
  };
  
  // Main render
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900">
        <div className="text-center py-12">
          <div className="flex flex-col items-center justify-center">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-400"></div>
              <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-2 border-blue-400/30"></div>
            </div>
            <p className="mt-6 text-xl font-medium text-blue-200">Loading game room...</p>
            <div className="mt-4 flex justify-center gap-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900">
        <div className="text-center py-12">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 to-pink-600/20 rounded-2xl blur-xl"></div>
            <div className="relative bg-gradient-to-br from-red-900/50 to-pink-900/50 rounded-2xl p-8 border-2 border-red-400/30 max-w-md mx-auto">
              <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4 animate-bounce" />
              <h3 className="text-2xl font-bold mb-3 text-red-400">⚠️ Error Loading Game Room</h3>
              <p className="text-red-200 mb-6 text-lg">{error}</p>
              <Button 
                onClick={() => navigate('/games/color-prediction')}
                className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-400 hover:to-pink-500 transform hover:scale-105 transition-all duration-200"
              >
                <Zap className="h-4 w-4 mr-2" />
                Return to Game Lobby
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  // Use original logic for completed/waiting states
  if (gameRoom && (gameRoom.status === 'completed' || hasJoined)) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900">
        <div className="w-full max-w-2xl">
          {renderGameStatus()}
        </div>
      </div>
    );
  }
    // Main selection state UI (Real Casino Gaming Interface)
  return (
    <div className="min-h-screen relative flex items-center justify-center p-2 sm:p-4 overflow-hidden">
      {/* Real Casino Background */}
      <div className="absolute inset-0">
        {/* Real Casino Gaming Image Background */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url("https://images.unsplash.com/photo-1596838132731-3301c3fd4317?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80")`,
          }}
        ></div>
        
        {/* Fallback Casino Background */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-50"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='1920' height='1080' viewBox='0 0 1920 1080' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3CradialGradient id='casino-bg' cx='50%25' cy='50%25' r='50%25'%3E%3Cstop offset='0%25' stop-color='%23001122'/%3E%3Cstop offset='50%25' stop-color='%23003344'/%3E%3Cstop offset='100%25' stop-color='%23000000'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect width='1920' height='1080' fill='url(%23casino-bg)'/%3E%3Cg opacity='0.2'%3E%3Ccircle cx='200' cy='200' r='80' fill='%23ff4444' stroke='%23ffaa44' stroke-width='3'/%3E%3Ccircle cx='1720' cy='200' r='60' fill='%2344ff44' stroke='%23aaffaa' stroke-width='3'/%3E%3Ccircle cx='960' cy='540' r='100' fill='%234444ff' stroke='%23aaaaff' stroke-width='3'/%3E%3Ccircle cx='300' cy='800' r='70' fill='%23ffff44' stroke='%23ffffaa' stroke-width='3'/%3E%3Ccircle cx='1600' cy='880' r='50' fill='%23ff44ff' stroke='%23ffaaff' stroke-width='3'/%3E%3Cpolygon points='400,300 450,250 500,300 450,350' fill='%23ffd700' stroke='%23ffed4e' stroke-width='2'/%3E%3Cpolygon points='1200,700 1250,650 1300,700 1250,750' fill='%23ffd700' stroke='%23ffed4e' stroke-width='2'/%3E%3Crect x='100' y='500' width='60' height='100' rx='10' fill='%23228833' stroke='%2344aa66' stroke-width='2'/%3E%3Crect x='1760' y='400' width='60' height='100' rx='10' fill='%23883322' stroke='%23aa6644' stroke-width='2'/%3E%3C/g%3E%3C/svg%3E")`,
          }}
        ></div>
        
        {/* Casino Atmosphere Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-900/20 via-black/60 to-green-900/20"></div>
        <div className="absolute inset-0 bg-gradient-radial from-transparent via-black/30 to-black/70"></div>
        
        {/* Enhanced Casino Lighting Effects */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Spotlight Effects */}
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-radial from-yellow-500/10 via-yellow-500/5 to-transparent rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-0 right-1/4 w-80 h-80 bg-gradient-radial from-red-500/10 via-red-500/5 to-transparent rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
          <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-gradient-radial from-green-500/10 via-green-500/5 to-transparent rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
          <div className="absolute bottom-0 right-1/3 w-88 h-88 bg-gradient-radial from-blue-500/10 via-blue-500/5 to-transparent rounded-full blur-3xl animate-pulse" style={{animationDelay: '1.5s'}}></div>
          
          {/* Casino Table Lights */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-gradient-radial from-amber-500/5 via-amber-500/2 to-transparent rounded-full blur-3xl"></div>
          
          {/* Floating Casino Elements */}
          <div className="absolute top-1/4 left-1/6 w-4 h-4 bg-gradient-to-br from-red-400 to-red-600 rounded-full animate-bounce shadow-lg shadow-red-500/50" style={{animationDelay: '0.5s'}}></div>
          <div className="absolute top-1/3 right-1/5 w-3 h-3 bg-gradient-to-br from-green-400 to-green-600 rounded-full animate-bounce shadow-lg shadow-green-500/50" style={{animationDelay: '1.2s'}}></div>
          <div className="absolute bottom-1/4 left-1/5 w-5 h-5 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full animate-bounce shadow-lg shadow-blue-500/50" style={{animationDelay: '2.1s'}}></div>
          <div className="absolute bottom-1/3 right-1/6 w-3 h-3 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full animate-bounce shadow-lg shadow-yellow-500/50" style={{animationDelay: '0.8s'}}></div>
          
          {/* Casino Neon Accents */}
          <div className="absolute top-20 left-10 w-32 h-1 bg-gradient-to-r from-transparent via-red-500/30 to-transparent animate-pulse"></div>
          <div className="absolute top-32 right-16 w-24 h-1 bg-gradient-to-r from-transparent via-green-500/30 to-transparent animate-pulse" style={{animationDelay: '1s'}}></div>
          <div className="absolute bottom-28 left-20 w-28 h-1 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent animate-pulse" style={{animationDelay: '1.5s'}}></div>
          <div className="absolute bottom-16 right-12 w-36 h-1 bg-gradient-to-r from-transparent via-yellow-500/30 to-transparent animate-pulse" style={{animationDelay: '0.7s'}}></div>
            </div>
        
        {/* Premium Casino Floor Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="w-full h-full" style={{
            backgroundImage: `
              radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 1px, transparent 1px),
              radial-gradient(circle at 75% 75%, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}></div>
              </div>
            </div>

      {/* Premium Casino Gaming Table */}
      <div className="w-full max-w-sm sm:max-w-4xl lg:max-w-6xl mx-auto relative z-10">
        <div className="bg-gradient-to-b from-emerald-900/95 via-green-900/90 to-emerald-950/95 rounded-2xl sm:rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.8)] overflow-hidden border-4 border-yellow-500/30 backdrop-blur-md relative">
          
          {/* Casino Table Felt Texture */}
          <div className="absolute inset-0 opacity-20">
            <div className="w-full h-full bg-gradient-to-br from-green-600/30 via-emerald-700/20 to-green-800/30" style={{
              backgroundImage: `
                radial-gradient(circle at 20% 20%, rgba(255,255,255,0.05) 1px, transparent 1px),
                radial-gradient(circle at 80% 80%, rgba(255,255,255,0.05) 1px, transparent 1px),
                linear-gradient(45deg, rgba(255,255,255,0.02) 25%, transparent 25%),
                linear-gradient(-45deg, rgba(255,255,255,0.02) 25%, transparent 25%)
              `,
              backgroundSize: '30px 30px, 30px 30px, 60px 60px, 60px 60px'
            }}></div>
            </div>
          
          {/* Premium Casino Table Border */}
          <div className="absolute inset-0 rounded-2xl sm:rounded-3xl border-2 border-amber-400/20 shadow-inner"></div>
          <div className="absolute inset-1 rounded-2xl sm:rounded-3xl border border-yellow-300/10"></div>
          
          {/* Casino Table Edge Padding */}
          <div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-b from-yellow-600/20 to-transparent rounded-t-2xl sm:rounded-t-3xl"></div>
          <div className="absolute bottom-0 left-0 w-full h-4 bg-gradient-to-t from-yellow-600/20 to-transparent rounded-b-2xl sm:rounded-b-3xl"></div>
          <div className="absolute left-0 top-0 w-4 h-full bg-gradient-to-r from-yellow-600/20 to-transparent rounded-l-2xl sm:rounded-l-3xl"></div>
          <div className="absolute right-0 top-0 w-4 h-full bg-gradient-to-l from-yellow-600/20 to-transparent rounded-r-2xl sm:rounded-r-3xl"></div>
          
                    {/* Premium Casino Header with Background */}
          <div className="relative p-3 sm:p-4 lg:p-6 text-center overflow-hidden border-b-4 border-yellow-500/50">
            
            {/* Casino Header Background Image */}
            <div 
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage: `url("https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80")`,
              }}
            ></div>
            
            {/* Enhanced Header Overlay Gradients */}
            <div className="absolute inset-0 bg-gradient-to-r from-red-900/90 via-black/95 to-red-900/90"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70"></div>
            <div className="absolute inset-0 bg-gradient-radial from-transparent via-black/30 to-black/60"></div>
            
            {/* Enhanced Casino Header Pattern */}
            <div className="absolute inset-0 opacity-25">
              <div className="absolute animate-pulse bg-yellow-500/40 rounded-full w-20 sm:w-24 lg:w-32 h-20 sm:h-24 lg:h-32 -top-10 sm:-top-12 lg:-top-16 -left-10 sm:-left-12 lg:-left-16 blur-xl shadow-lg shadow-yellow-500/20"></div>
              <div className="absolute animate-pulse bg-red-500/40 rounded-full w-16 sm:w-18 lg:w-24 h-16 sm:h-18 lg:h-24 -bottom-8 sm:-bottom-9 lg:-bottom-12 -right-8 sm:-right-9 lg:-right-12 blur-xl shadow-lg shadow-red-500/20" style={{animationDelay: '1s'}}></div>
              <div className="absolute animate-bounce bg-amber-500/30 rounded-full w-10 sm:w-12 lg:w-16 h-10 sm:h-12 lg:h-16 top-2 sm:top-3 lg:top-4 right-5 sm:right-6 lg:right-8 blur-lg shadow-lg shadow-amber-500/20" style={{animationDelay: '0.5s'}}></div>
              
              {/* Enhanced Casino Diamond Pattern */}
              <div className="absolute top-1/2 left-1/4 transform -translate-y-1/2 w-8 h-8 bg-yellow-400/30 rotate-45 animate-pulse shadow-lg shadow-yellow-500/30"></div>
              <div className="absolute top-1/2 right-1/4 transform -translate-y-1/2 w-6 h-6 bg-red-400/30 rotate-45 animate-pulse shadow-lg shadow-red-500/30" style={{animationDelay: '1.5s'}}></div>
              
              {/* Casino Playing Card Suits */}
              <div className="absolute top-1/4 left-1/6 text-red-400/40 text-3xl animate-pulse font-bold drop-shadow-lg">♠</div>
              <div className="absolute top-1/4 right-1/6 text-red-400/40 text-3xl animate-pulse font-bold drop-shadow-lg" style={{animationDelay: '0.7s'}}>♥</div>
              <div className="absolute bottom-1/4 left-1/6 text-red-400/40 text-3xl animate-pulse font-bold drop-shadow-lg" style={{animationDelay: '1.2s'}}>♦</div>
              <div className="absolute bottom-1/4 right-1/6 text-red-400/40 text-3xl animate-pulse font-bold drop-shadow-lg" style={{animationDelay: '1.8s'}}>♣</div>
          </div>
            
            {/* Enhanced Casino Neon Border Effects */}
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-yellow-400/80 to-transparent animate-pulse shadow-lg shadow-yellow-400/50"></div>
            <div className="absolute bottom-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-red-400/80 to-transparent animate-pulse shadow-lg shadow-red-400/50" style={{animationDelay: '1s'}}></div>
            
            {/* Side Neon Accents */}
            <div className="absolute left-0 top-0 w-2 h-full bg-gradient-to-b from-transparent via-amber-400/70 to-transparent animate-pulse shadow-lg shadow-amber-400/50"></div>
            <div className="absolute right-0 top-0 w-2 h-full bg-gradient-to-b from-transparent via-amber-400/70 to-transparent animate-pulse shadow-lg shadow-amber-400/50" style={{animationDelay: '1.5s'}}></div>
            
            {/* Casino Chip Pattern */}
            <div className="absolute inset-0 opacity-15">
              <div className="absolute top-4 left-8 w-8 h-8 rounded-full bg-gradient-to-br from-red-400 to-red-600 border-3 border-white/70 shadow-lg animate-spin" style={{animationDuration: '8s'}}></div>
              <div className="absolute top-8 right-12 w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-green-600 border-3 border-white/70 shadow-lg animate-spin" style={{animationDuration: '6s', animationDelay: '2s'}}></div>
              <div className="absolute bottom-8 left-16 w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border-3 border-white/70 shadow-lg animate-spin" style={{animationDuration: '7s', animationDelay: '1s'}}></div>
              <div className="absolute bottom-6 right-8 w-7 h-7 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 border-3 border-white/70 shadow-lg animate-spin" style={{animationDuration: '9s', animationDelay: '3s'}}></div>
            </div>
            
            <div className="relative z-10">
              {/* Live Period Number */}
              <div className="flex items-center justify-between mb-2 sm:mb-3 lg:mb-4">
                <div className="flex items-center gap-1 sm:gap-2">
                  <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-white/90 text-xs sm:text-sm font-semibold">LIVE</span>
            </div>
                <div className="flex items-center gap-1 sm:gap-2 text-white/80 text-xs sm:text-sm font-medium">
                  <Users className="h-3 sm:h-4 w-3 sm:w-4" />
                  <span>{gameRoom?.currentPlayers || 0} players</span>
          </div>
        </div>

              <div className="bg-black/60 backdrop-blur-sm rounded-xl sm:rounded-2xl p-2 sm:p-3 lg:p-5 mb-2 sm:mb-3 lg:mb-4 shadow-xl border border-white/20 max-w-xs sm:max-w-md mx-auto">
                 <div className="text-purple-400 text-xs font-bold mb-1 sm:mb-2 tracking-wider">CURRENT PERIOD</div>
                <div className="text-xl sm:text-2xl lg:text-4xl font-black text-white tracking-wider mb-1 sm:mb-2">
                  {gameRoom?.roomId || '20240001'}
                </div>
                <div className="h-0.5 sm:h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-pulse"></div>
        </div>

              {/* Enhanced Countdown Timer */}
              <div className="inline-flex items-center justify-center gap-2 sm:gap-3 bg-black/40 backdrop-blur-sm rounded-full px-3 sm:px-4 lg:px-6 py-2 sm:py-3 border border-white/20">
                <div className="relative">
                  <div className="w-1.5 sm:w-2 lg:w-3 h-1.5 sm:h-2 lg:h-3 bg-red-400 rounded-full animate-pulse"></div>
                  <div className="absolute inset-0 w-1.5 sm:w-2 lg:w-3 h-1.5 sm:h-2 lg:h-3 bg-red-400 rounded-full animate-ping"></div>
                </div>
                <span className="text-white font-black text-base sm:text-lg lg:text-xl tracking-wider">
                  {countdown !== null ? `00:${countdown.toString().padStart(2, '0')}` : '00:30'}
                </span>
                <Clock className="h-3 sm:h-4 lg:h-5 w-3 sm:w-4 lg:w-5 text-white/80" />
              </div>
            </div>
          </div>

          {/* Main Content - Mobile Responsive Layout */}
          <div className="flex flex-col xl:flex-row gap-3 sm:gap-4 lg:gap-6 p-3 sm:p-4 lg:p-6">
            
            {/* Left Column - Game Selection */}
            <div className="flex-1 space-y-3 sm:space-y-4 lg:space-y-6">
              
              {/* Color Selection */}
              <div>
                <div className="text-center mb-3 sm:mb-4">
                  <h3 className="text-lg sm:text-xl lg:text-2xl font-black text-white mb-1 sm:mb-2 tracking-wide">Choose Color</h3>
                  <p className="text-gray-400 text-xs sm:text-sm font-medium">Select your lucky color to win big! 🎯</p>
                </div>
                
                {/* Ultra Premium Casino Gaming Buttons */}
                <div className="grid grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
                  {gameRoom?.availableColors?.includes('green') && (
            <button
                      onClick={() => joinRoom('green')}
              disabled={isJoining || hasJoined}
                      className={`group relative overflow-hidden transition-all duration-700 transform ${
                        selectedColor === 'green' 
                          ? 'scale-110 sm:scale-125 animate-pulse' 
                          : 'hover:scale-110 sm:hover:scale-125 hover:-translate-y-2'
                      } ${isJoining ? 'opacity-50' : ''} filter drop-shadow-[0_15px_25px_rgba(16,185,129,0.4)] hover:drop-shadow-[0_20px_35px_rgba(16,185,129,0.6)]`}
                    >
                      {/* Professional 3D Button Structure */}
                      <div className="relative min-h-[80px] sm:min-h-[100px] lg:min-h-[120px]">
                        {/* Button Shadow Layers */}
                        <div className="absolute inset-0 bg-gradient-to-br from-green-800/80 to-green-900/90 rounded-2xl sm:rounded-3xl transform translate-y-2 scale-95 blur-sm"></div>
                        <div className="absolute inset-0 bg-gradient-to-br from-green-700/70 to-green-800/80 rounded-2xl sm:rounded-3xl transform translate-y-1 scale-97"></div>
                        
                        {/* Main Button Body */}
                        <div className={`relative rounded-2xl sm:rounded-3xl border-4 border-green-200/80 transition-all duration-500 group-hover:shadow-[0_25px_50px_rgba(0,0,0,0.8)] shadow-[0_15px_35px_rgba(16,185,129,0.4)] group-hover:shadow-[0_25px_60px_rgba(16,185,129,0.8)] ${
                          selectedColor === 'green' 
                            ? 'ring-4 ring-green-300 shadow-[0_25px_60px_rgba(16,185,129,0.8)]' 
                            : ''
                        }`}
                        style={{ background: 'linear-gradient(135deg, #34D399 0%, #10B981 40%, #059669 80%, #047857 100%)' }}
                        >
                          
                          {/* Luxury Inner Patterns */}
                          <div className="absolute inset-2 rounded-2xl sm:rounded-3xl border-2 border-green-100/40 shadow-inner"></div>
                          <div className="absolute inset-3 rounded-xl sm:rounded-2xl border border-green-100/30"></div>
                          <div className="absolute inset-4 rounded-lg sm:rounded-xl border border-green-100/20"></div>
                          
                          {/* Button Content */}
                          <div className="relative z-10 h-full flex flex-col items-center justify-center p-3 sm:p-4 lg:p-6">
                            {/* Main Label */}
                            <div className="text-center mb-2">
                              <div className="text-lg sm:text-xl lg:text-3xl font-black text-white tracking-[0.1em] drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] filter contrast-125 brightness-110 mb-1">
                                GREEN
                              </div>
                              <div className="text-xs sm:text-sm lg:text-base font-bold bg-black/40 text-green-100 rounded-full px-2 sm:px-3 py-1 shadow-lg">
                                Win 1:2
                              </div>
                            </div>
                            
                            {/* Color Indicator */}
                            <div className="w-6 sm:w-8 lg:w-10 h-6 sm:h-8 lg:h-10 bg-gradient-to-br from-green-300 to-green-600 rounded-full border-3 border-white/70 shadow-lg animate-pulse"></div>
                          </div>
                          
                          {/* Professional Button Highlights */}
                          <div className="absolute top-2 left-4 w-6 sm:w-8 h-6 sm:h-8 bg-gradient-radial from-white/80 to-white/30 rounded-full blur-md group-hover:scale-125 transition-transform duration-300"></div>
                          <div className="absolute top-3 left-3 w-4 sm:w-5 h-4 sm:h-5 bg-white/90 rounded-full group-hover:animate-ping"></div>
                          <div className="absolute bottom-3 right-3 w-3 sm:w-4 h-3 sm:h-4 bg-white/50 rounded-full"></div>
                          
                          {/* Edge Details */}
                          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-2 h-5 sm:h-6 bg-white/40 rounded-b-full"></div>
                          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-2 h-5 sm:h-6 bg-white/40 rounded-t-full"></div>
                          <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-5 sm:w-6 h-2 bg-white/40 rounded-r-full"></div>
                          <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-5 sm:w-6 h-2 bg-white/40 rounded-l-full"></div>
                          
                          {/* Corner Accents */}
                          <div className="absolute top-2 left-2 w-3 h-3 border-t-3 border-l-3 border-white/40 rounded-tl-lg"></div>
                          <div className="absolute top-2 right-2 w-3 h-3 border-t-3 border-r-3 border-white/40 rounded-tr-lg"></div>
                          <div className="absolute bottom-2 left-2 w-3 h-3 border-b-3 border-l-3 border-white/40 rounded-bl-lg"></div>
                          <div className="absolute bottom-2 right-2 w-3 h-3 border-b-3 border-r-3 border-white/40 rounded-br-lg"></div>
                        </div>
                        
                        {/* Hover Effects */}
                        <div className="absolute inset-0 rounded-2xl sm:rounded-3xl opacity-0 group-hover:opacity-80 transition-all duration-500 bg-gradient-radial from-green-300/20 via-transparent to-transparent animate-ping"></div>
                        <div className="absolute inset-2 rounded-2xl sm:rounded-3xl border-2 border-dashed border-green-300/60 opacity-0 group-hover:opacity-60 transition-opacity duration-300 animate-spin" style={{ animationDuration: '3s' }}></div>
                      </div>
                      
                      {/* Loading State */}
                      {isJoining && selectedColor === 'green' && (
                        <div className="absolute inset-0 bg-black/70 flex items-center justify-center backdrop-blur-md rounded-2xl sm:rounded-3xl">
                          <div className="relative">
                            <Loader2 className="h-8 sm:h-10 lg:h-12 w-8 sm:w-10 lg:w-12 text-white animate-spin" />
                            <div className="absolute inset-0 border-3 border-green-400/60 rounded-full animate-pulse"></div>
                          </div>
                        </div>
                      )}
            </button>
                  )}
                  
                  {gameRoom?.availableColors?.includes('red') && (
                    <button
                      onClick={() => joinRoom('red')}
                      disabled={isJoining || hasJoined}
                      className={`group relative overflow-hidden transition-all duration-700 transform ${
                        selectedColor === 'red' 
                          ? 'scale-110 sm:scale-125 animate-pulse' 
                          : 'hover:scale-110 sm:hover:scale-125 hover:-translate-y-2'
                      } ${isJoining ? 'opacity-50' : ''} filter drop-shadow-[0_15px_25px_rgba(239,68,68,0.4)] hover:drop-shadow-[0_20px_35px_rgba(239,68,68,0.6)]`}
                    >
                      {/* Professional 3D Button Structure */}
                      <div className="relative min-h-[80px] sm:min-h-[100px] lg:min-h-[120px]">
                        {/* Button Shadow Layers */}
                        <div className="absolute inset-0 bg-gradient-to-br from-red-800/80 to-red-900/90 rounded-2xl sm:rounded-3xl transform translate-y-2 scale-95 blur-sm"></div>
                        <div className="absolute inset-0 bg-gradient-to-br from-red-700/70 to-red-800/80 rounded-2xl sm:rounded-3xl transform translate-y-1 scale-97"></div>
                        
                        {/* Main Button Body */}
                        <div className={`relative rounded-2xl sm:rounded-3xl border-4 border-red-200/80 transition-all duration-500 group-hover:shadow-[0_25px_50px_rgba(0,0,0,0.8)] shadow-[0_15px_35px_rgba(239,68,68,0.4)] group-hover:shadow-[0_25px_60px_rgba(239,68,68,0.8)] ${
                          selectedColor === 'red' 
                            ? 'ring-4 ring-red-300 shadow-[0_25px_60px_rgba(239,68,68,0.8)]' 
                            : ''
                        }`}
                        style={{ background: 'linear-gradient(135deg, #F87171 0%, #EF4444 40%, #DC2626 80%, #B91C1C 100%)' }}
                        >
                          
                          {/* Luxury Inner Patterns */}
                          <div className="absolute inset-2 rounded-2xl sm:rounded-3xl border-2 border-red-100/40 shadow-inner"></div>
                          <div className="absolute inset-3 rounded-xl sm:rounded-2xl border border-red-100/30"></div>
                          <div className="absolute inset-4 rounded-lg sm:rounded-xl border border-red-100/20"></div>
                          
                          {/* Button Content */}
                          <div className="relative z-10 h-full flex flex-col items-center justify-center p-3 sm:p-4 lg:p-6">
                            {/* Main Label */}
                            <div className="text-center mb-2">
                              <div className="text-lg sm:text-xl lg:text-3xl font-black text-white tracking-[0.1em] drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] filter contrast-125 brightness-110 mb-1">
                                RED
                              </div>
                              <div className="text-xs sm:text-sm lg:text-base font-bold bg-black/40 text-red-100 rounded-full px-2 sm:px-3 py-1 shadow-lg">
                                Win 1:2
                              </div>
        </div>

                            {/* Color Indicator */}
                            <div className="w-6 sm:w-8 lg:w-10 h-6 sm:h-8 lg:h-10 bg-gradient-to-br from-red-300 to-red-600 rounded-full border-3 border-white/70 shadow-lg animate-pulse"></div>
                          </div>
                          
                          {/* Professional Button Highlights */}
                          <div className="absolute top-2 left-4 w-6 sm:w-8 h-6 sm:h-8 bg-gradient-radial from-white/80 to-white/30 rounded-full blur-md group-hover:scale-125 transition-transform duration-300"></div>
                          <div className="absolute top-3 left-3 w-4 sm:w-5 h-4 sm:h-5 bg-white/90 rounded-full group-hover:animate-ping"></div>
                          <div className="absolute bottom-3 right-3 w-3 sm:w-4 h-3 sm:h-4 bg-white/50 rounded-full"></div>
                          
                          {/* Edge Details */}
                          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-2 h-5 sm:h-6 bg-white/40 rounded-b-full"></div>
                          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-2 h-5 sm:h-6 bg-white/40 rounded-t-full"></div>
                          <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-5 sm:w-6 h-2 bg-white/40 rounded-r-full"></div>
                          <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-5 sm:w-6 h-2 bg-white/40 rounded-l-full"></div>
                          
                          {/* Corner Accents */}
                          <div className="absolute top-2 left-2 w-3 h-3 border-t-3 border-l-3 border-white/40 rounded-tl-lg"></div>
                          <div className="absolute top-2 right-2 w-3 h-3 border-t-3 border-r-3 border-white/40 rounded-tr-lg"></div>
                          <div className="absolute bottom-2 left-2 w-3 h-3 border-b-3 border-l-3 border-white/40 rounded-bl-lg"></div>
                          <div className="absolute bottom-2 right-2 w-3 h-3 border-b-3 border-r-3 border-white/40 rounded-br-lg"></div>
                        </div>
                        
                        {/* Hover Effects */}
                        <div className="absolute inset-0 rounded-2xl sm:rounded-3xl opacity-0 group-hover:opacity-80 transition-all duration-500 bg-gradient-radial from-red-300/20 via-transparent to-transparent animate-ping"></div>
                        <div className="absolute inset-2 rounded-2xl sm:rounded-3xl border-2 border-dashed border-red-300/60 opacity-0 group-hover:opacity-60 transition-opacity duration-300 animate-spin" style={{ animationDuration: '3s' }}></div>
                      </div>
                      
                      {/* Loading State */}
                      {isJoining && selectedColor === 'red' && (
                        <div className="absolute inset-0 bg-black/70 flex items-center justify-center backdrop-blur-md rounded-2xl sm:rounded-3xl">
                          <div className="relative">
                            <Loader2 className="h-8 sm:h-10 lg:h-12 w-8 sm:w-10 lg:w-12 text-white animate-spin" />
                            <div className="absolute inset-0 border-3 border-red-400/60 rounded-full animate-pulse"></div>
                          </div>
                        </div>
                      )}
                    </button>
                  )}
                  
                  {gameRoom?.availableColors?.includes('blue') && (
                    <button
                      onClick={() => joinRoom('blue')}
                      disabled={isJoining || hasJoined}
                      className={`group relative overflow-hidden transition-all duration-700 transform ${
                        selectedColor === 'blue' 
                          ? 'scale-110 sm:scale-125 animate-pulse' 
                          : 'hover:scale-110 sm:hover:scale-125 hover:-translate-y-2'
                      } ${isJoining ? 'opacity-50' : ''} filter drop-shadow-[0_15px_25px_rgba(59,130,246,0.4)] hover:drop-shadow-[0_20px_35px_rgba(59,130,246,0.6)]`}
                    >
                      {/* Professional 3D Button Structure */}
                      <div className="relative min-h-[80px] sm:min-h-[100px] lg:min-h-[120px]">
                        {/* Button Shadow Layers */}
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-800/80 to-blue-900/90 rounded-2xl sm:rounded-3xl transform translate-y-2 scale-95 blur-sm"></div>
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-700/70 to-blue-800/80 rounded-2xl sm:rounded-3xl transform translate-y-1 scale-97"></div>
                        
                        {/* Main Button Body */}
                        <div className={`relative rounded-2xl sm:rounded-3xl border-4 border-blue-200/80 transition-all duration-500 group-hover:shadow-[0_25px_50px_rgba(0,0,0,0.8)] shadow-[0_15px_35px_rgba(59,130,246,0.4)] group-hover:shadow-[0_25px_60px_rgba(59,130,246,0.8)] ${
                          selectedColor === 'blue' 
                            ? 'ring-4 ring-blue-300 shadow-[0_25px_60px_rgba(59,130,246,0.8)]' 
                            : ''
                        }`}
                        style={{ background: 'linear-gradient(135deg, #60A5FA 0%, #3B82F6 40%, #2563EB 80%, #1D4ED8 100%)' }}
                        >
                          
                          {/* Luxury Inner Patterns */}
                          <div className="absolute inset-2 rounded-2xl sm:rounded-3xl border-2 border-blue-100/40 shadow-inner"></div>
                          <div className="absolute inset-3 rounded-xl sm:rounded-2xl border border-blue-100/30"></div>
                          <div className="absolute inset-4 rounded-lg sm:rounded-xl border border-blue-100/20"></div>
                          
                          {/* Button Content */}
                          <div className="relative z-10 h-full flex flex-col items-center justify-center p-3 sm:p-4 lg:p-6">
                            {/* Main Label */}
                            <div className="text-center mb-2">
                              <div className="text-lg sm:text-xl lg:text-3xl font-black text-white tracking-[0.1em] drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] filter contrast-125 brightness-110 mb-1">
                                BLUE
                              </div>
                              <div className="text-xs sm:text-sm lg:text-base font-bold bg-black/40 text-blue-100 rounded-full px-2 sm:px-3 py-1 shadow-lg">
                                Win 1:2
                              </div>
                            </div>
                            
                            {/* Color Indicator */}
                            <div className="w-6 sm:w-8 lg:w-10 h-6 sm:h-8 lg:h-10 bg-gradient-to-br from-blue-300 to-blue-600 rounded-full border-3 border-white/70 shadow-lg animate-pulse"></div>
                          </div>
                          
                          {/* Professional Button Highlights */}
                          <div className="absolute top-2 left-4 w-6 sm:w-8 h-6 sm:h-8 bg-gradient-radial from-white/80 to-white/30 rounded-full blur-md group-hover:scale-125 transition-transform duration-300"></div>
                          <div className="absolute top-3 left-3 w-4 sm:w-5 h-4 sm:h-5 bg-white/90 rounded-full group-hover:animate-ping"></div>
                          <div className="absolute bottom-3 right-3 w-3 sm:w-4 h-3 sm:h-4 bg-white/50 rounded-full"></div>
                          
                          {/* Edge Details */}
                          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-2 h-5 sm:h-6 bg-white/40 rounded-b-full"></div>
                          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-2 h-5 sm:h-6 bg-white/40 rounded-t-full"></div>
                          <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-5 sm:w-6 h-2 bg-white/40 rounded-r-full"></div>
                          <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-5 sm:w-6 h-2 bg-white/40 rounded-l-full"></div>
                          
                          {/* Corner Accents */}
                          <div className="absolute top-2 left-2 w-3 h-3 border-t-3 border-l-3 border-white/40 rounded-tl-lg"></div>
                          <div className="absolute top-2 right-2 w-3 h-3 border-t-3 border-r-3 border-white/40 rounded-tr-lg"></div>
                          <div className="absolute bottom-2 left-2 w-3 h-3 border-b-3 border-l-3 border-white/40 rounded-bl-lg"></div>
                          <div className="absolute bottom-2 right-2 w-3 h-3 border-b-3 border-r-3 border-white/40 rounded-br-lg"></div>
                        </div>
                        
                        {/* Hover Effects */}
                        <div className="absolute inset-0 rounded-2xl sm:rounded-3xl opacity-0 group-hover:opacity-80 transition-all duration-500 bg-gradient-radial from-blue-300/20 via-transparent to-transparent animate-ping"></div>
                        <div className="absolute inset-2 rounded-2xl sm:rounded-3xl border-2 border-dashed border-blue-300/60 opacity-0 group-hover:opacity-60 transition-opacity duration-300 animate-spin" style={{ animationDuration: '3s' }}></div>
                      </div>
                      
                      {/* Loading State */}
                      {isJoining && selectedColor === 'blue' && (
                        <div className="absolute inset-0 bg-black/70 flex items-center justify-center backdrop-blur-md rounded-2xl sm:rounded-3xl">
                          <div className="relative">
                            <Loader2 className="h-8 sm:h-10 lg:h-12 w-8 sm:w-10 lg:w-12 text-white animate-spin" />
                            <div className="absolute inset-0 border-3 border-blue-400/60 rounded-full animate-pulse"></div>
                          </div>
                        </div>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Ultra Premium Casino Number Chips */}
              <div>
                <div className="text-center mb-4 sm:mb-6">
                  <div className="relative mb-4">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/20 to-transparent animate-pulse"></div>
                    <h4 className="relative text-base sm:text-lg lg:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 mb-1 tracking-[0.1em] drop-shadow-lg">
                      ⚡ LUCKY NUMBERS ⚡
                    </h4>
                  </div>
                  <p className="text-amber-300 text-xs sm:text-sm font-medium">Pick your fortune numbers for massive wins! 🎲</p>
                </div>
                
                <div className="grid grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
                  {[0,1,2,3,4,5,6,7,8,9].map((num, index) => {
                    let bgGradient = '';
                    let shadowColor = '';
            let odds = '';
                    let borderColor = '';
                    let dropShadowColor = '';
                    let glowColor = '';
                    
                    if ([1,3,7,9].includes(num)) { 
                      bgGradient = 'linear-gradient(135deg, #34D399 0%, #10B981 40%, #059669 80%, #047857 100%)'; 
                      shadowColor = 'shadow-[0_10px_25px_rgba(16,185,129,0.4)]';
                      borderColor = 'border-green-200/80';
                      dropShadowColor = 'drop-shadow-[0_8px_15px_rgba(16,185,129,0.4)]';
                      glowColor = 'from-green-300/20';
                      odds = '1:2'; 
                    } else if ([2,4,6,8].includes(num)) { 
                      bgGradient = 'linear-gradient(135deg, #F87171 0%, #EF4444 40%, #DC2626 80%, #B91C1C 100%)'; 
                      shadowColor = 'shadow-[0_10px_25px_rgba(239,68,68,0.4)]';
                      borderColor = 'border-red-200/80';
                      dropShadowColor = 'drop-shadow-[0_8px_15px_rgba(239,68,68,0.4)]';
                      glowColor = 'from-red-300/20';
                      odds = '1:2'; 
                    } else if ([0,5].includes(num)) { 
                      bgGradient = 'linear-gradient(135deg, #C084FC 0%, #A855F7 40%, #9333EA 80%, #7C3AED 100%)'; 
                      shadowColor = 'shadow-[0_10px_25px_rgba(168,85,247,0.4)]';
                      borderColor = 'border-purple-200/80';
                      dropShadowColor = 'drop-shadow-[0_8px_15px_rgba(168,85,247,0.4)]';
                      glowColor = 'from-purple-300/20';
                      odds = '1:4.5'; 
                    }
                    
            return (
              <button
                key={num}
                        className={`group relative overflow-hidden transition-all duration-500 transform hover:scale-110 sm:hover:scale-125 hover:-translate-y-1 ${dropShadowColor} hover:drop-shadow-[0_15px_30px_rgba(0,0,0,0.3)] animate-fadeInUp`}
                        style={{animationDelay: `${index * 100}ms`}}
                disabled
              >
                        {/* Professional Gaming Chip Structure */}
                        <div className="relative min-h-[60px] sm:min-h-[70px] lg:min-h-[80px]">
                          {/* Multi-layer Shadow Base */}
                          <div className={`absolute inset-0 rounded-xl sm:rounded-2xl transform translate-y-1.5 scale-95 blur-sm ${
                            [1,3,7,9].includes(num) ? 'bg-gradient-to-br from-green-800/70 to-green-900/80' :
                            [2,4,6,8].includes(num) ? 'bg-gradient-to-br from-red-800/70 to-red-900/80' :
                            'bg-gradient-to-br from-purple-800/70 to-purple-900/80'
                          }`}></div>
                          
                          <div className={`absolute inset-0 rounded-xl sm:rounded-2xl transform translate-y-0.5 scale-97 ${
                            [1,3,7,9].includes(num) ? 'bg-gradient-to-br from-green-700/60 to-green-800/70' :
                            [2,4,6,8].includes(num) ? 'bg-gradient-to-br from-red-700/60 to-red-800/70' :
                            'bg-gradient-to-br from-purple-700/60 to-purple-800/70'
                          }`}></div>
                          
                          {/* Main Casino Chip */}
                          <div 
                            className={`relative rounded-xl sm:rounded-2xl border-3 ${borderColor} transition-all duration-500 group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.6)] ${shadowColor} group-hover:shadow-[0_20px_50px_rgba(0,0,0,0.8)]`}
                            style={{ background: bgGradient }}
                          >
                            
                            {/* Luxury Inner Patterns */}
                            <div className="absolute inset-1.5 rounded-xl sm:rounded-2xl border-2 border-white/40 shadow-inner"></div>
                            <div className="absolute inset-2.5 rounded-lg sm:rounded-xl border border-white/30"></div>
                            <div className="absolute inset-3.5 rounded-lg border border-white/20"></div>
                            
                            {/* Chip Content */}
                            <div className="relative z-10 h-full flex flex-col items-center justify-center p-2 sm:p-3 lg:p-4">
                              
                              {/* Number Display */}
                              <div className="text-center">
                                <div className="text-lg sm:text-xl lg:text-2xl font-black text-white tracking-wider drop-shadow-[0_3px_6px_rgba(0,0,0,0.8)] filter contrast-125 brightness-110 mb-1 animate-bounce" style={{animationDelay: `${index * 150 + 1000}ms`}}>
                {num}
                                </div>
                                <div className="text-xs sm:text-sm font-bold bg-black/50 text-white/90 rounded-full px-2 py-0.5 shadow-lg border border-white/20">
                                  {odds}
                                </div>
                              </div>
                              
                              {/* Special Indicators for High-Value Numbers */}
                              {[0,5].includes(num) && (
                                <div className="absolute -top-1 -right-1 w-4 sm:w-5 h-4 sm:h-5 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full border-2 border-white shadow-lg animate-pulse">
                                  <div className="absolute inset-0.5 bg-yellow-300 rounded-full animate-ping"></div>
                                </div>
                              )}
                            </div>
                            
                            {/* Professional Chip Highlights */}
                            <div className="absolute top-1.5 left-3 w-4 sm:w-5 h-4 sm:h-5 bg-gradient-radial from-white/80 to-white/30 rounded-full blur-md group-hover:scale-125 transition-transform duration-300"></div>
                            <div className="absolute top-2 left-2 w-2.5 sm:w-3 h-2.5 sm:h-3 bg-white/90 rounded-full group-hover:animate-ping"></div>
                            <div className="absolute bottom-2 right-2 w-2 sm:w-2.5 h-2 sm:h-2.5 bg-white/50 rounded-full"></div>
                            
                            {/* Authentic Casino Edge Details */}
                            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1.5 h-3 sm:h-4 bg-white/40 rounded-b-full"></div>
                            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1.5 h-3 sm:h-4 bg-white/40 rounded-t-full"></div>
                            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-3 sm:w-4 h-1.5 bg-white/40 rounded-r-full"></div>
                            <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-3 sm:w-4 h-1.5 bg-white/40 rounded-l-full"></div>
                            
                            {/* Corner Notches */}
                            <div className="absolute top-1 left-1 w-2 h-2 border-t-2 border-l-2 border-white/40 rounded-tl-lg"></div>
                            <div className="absolute top-1 right-1 w-2 h-2 border-t-2 border-r-2 border-white/40 rounded-tr-lg"></div>
                            <div className="absolute bottom-1 left-1 w-2 h-2 border-b-2 border-l-2 border-white/40 rounded-bl-lg"></div>
                            <div className="absolute bottom-1 right-1 w-2 h-2 border-b-2 border-r-2 border-white/40 rounded-br-lg"></div>
                          </div>
                          
                          {/* Premium Hover Effects */}
                          <div className={`absolute inset-0 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-80 transition-all duration-500 bg-gradient-radial ${glowColor} via-transparent to-transparent animate-ping`}></div>
                          
                          {/* Rotating Ring Effect */}
                          <div className={`absolute inset-1 rounded-xl sm:rounded-2xl border-2 border-dashed opacity-0 group-hover:opacity-60 transition-opacity duration-300 animate-spin ${
                            [1,3,7,9].includes(num) ? 'border-green-300/60' :
                            [2,4,6,8].includes(num) ? 'border-red-300/60' :
                            'border-purple-300/60'
                          }`} style={{ animationDuration: '3s' }}></div>
                          
                          {/* Shimmer Effect */}
                          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-shimmer"></div>
                        </div>
                        
                        {/* Disabled State Overlay */}
                        {/* <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] rounded-xl sm:rounded-2xl flex items-center justify-center">
                          <div className="text-white/60 text-xs font-bold bg-black/40 px-2 py-1 rounded-full border border-white/20">
                            COMING SOON
                          </div>
                        </div> */}
              </button>
            );
          })}
        </div>

                {/* Number Categories Legend */}
                <div className="mt-4 sm:mt-6 bg-gradient-to-r from-gray-900/50 to-slate-900/50 rounded-xl p-3 sm:p-4 border border-gray-600/30">
                  <div className="text-center text-xs sm:text-sm text-gray-300 space-y-2">
                    <div className="flex items-center justify-center gap-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-gradient-to-br from-green-400 to-green-600 rounded-full border border-white/30"></div>
                        <span className="text-green-300 font-semibold">1,3,7,9 → Win 2x</span>
          </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-gradient-to-br from-red-400 to-red-600 rounded-full border border-white/30"></div>
                        <span className="text-red-300 font-semibold">2,4,6,8 → Win 2x</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full border border-white/30"></div>
                        <span className="text-purple-300 font-semibold">0,5 → Win 4.5x ⭐</span>
                      </div>
                    </div>
                    <p className="text-xs text-amber-400 mt-2">💫 Higher numbers = Higher rewards!</p>
                  </div>
                </div>
          </div>
        </div>

            {/* Right Column - Game Info & Actions (Mobile Optimized) */}
            <div className="w-full xl:w-80 space-y-3 sm:space-y-4 lg:space-y-6">
              
              {/* Balance & Bet Info */}
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl sm:rounded-2xl lg:rounded-3xl p-3 sm:p-4 lg:p-6 space-y-2 sm:space-y-3 lg:space-y-4 border border-gray-600/50 shadow-inner">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Wallet className="h-3 sm:h-4 lg:h-5 w-3 sm:w-4 lg:w-5 text-gray-400" />
                    <span className="text-gray-300 font-semibold text-xs sm:text-sm lg:text-base">Balance</span>
        </div>
                  <span className="text-lg sm:text-xl lg:text-2xl font-black text-white">₹2,000</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Coins className="h-3 sm:h-4 lg:h-5 w-3 sm:w-4 lg:w-5 text-purple-400" />
                    <span className="text-gray-300 font-semibold text-xs sm:text-sm lg:text-base">Entry Fee</span>
                  </div>
                  <span className="text-base sm:text-lg lg:text-xl font-bold text-purple-400">₹{gameRoom?.entryFee || 100}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Trophy className="h-3 sm:h-4 lg:h-5 w-3 sm:w-4 lg:w-5 text-green-400" />
                    <span className="text-gray-300 font-semibold text-xs sm:text-sm lg:text-base">Potential Win</span>
                  </div>
                  <span className="text-base sm:text-lg lg:text-xl font-bold text-green-400">₹{gameRoom?.winningAmount || 200}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:gap-4">
                <button className="group bg-gradient-to-r from-gray-600 via-gray-700 to-gray-800 text-white rounded-lg sm:rounded-xl lg:rounded-2xl py-3 sm:py-4 font-black text-xs sm:text-sm lg:text-lg transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl relative overflow-hidden border border-gray-600 min-h-[44px]">
                  <span className="relative z-10 flex items-center justify-center gap-1 sm:gap-2">
                    <div className="w-1 sm:w-1.5 lg:w-2 h-1 sm:h-1.5 lg:h-2 bg-white/60 rounded-full animate-pulse"></div>
                    RANDOM
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </button>
                <button className="group bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 text-white rounded-lg sm:rounded-xl lg:rounded-2xl py-3 sm:py-4 font-black text-xs sm:text-sm lg:text-lg transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl relative overflow-hidden border border-purple-500/50 min-h-[44px]">
                  <span className="relative z-10 flex items-center justify-center gap-1 sm:gap-2">
                    <Zap className="h-3 sm:h-4 lg:h-5 w-3 sm:w-4 lg:w-5 animate-pulse" />
                    CONFIRM
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </button>
              </div>

              {/* Recent Results */}
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl sm:rounded-2xl lg:rounded-3xl p-3 sm:p-4 lg:p-5 border border-gray-600/50 shadow-inner">
                <div className="flex justify-between items-center mb-2 sm:mb-3 lg:mb-4">
                  <h4 className="text-sm sm:text-base lg:text-lg font-black text-white tracking-wide">RECENT RESULTS</h4>
                  <span className="text-xs text-gray-400 bg-gray-700 rounded-full px-2 sm:px-3 py-1 font-semibold">Last 10</span>
                </div>
                <div className="flex gap-1.5 sm:gap-2 lg:gap-3 overflow-x-auto pb-2">
                  {[
                    { period: '001', color: 'green', number: 3 },
                    { period: '002', color: 'red', number: 8 },
                    { period: '003', color: 'blue', number: 5 },
                    { period: '004', color: 'green', number: 1 },
                    { period: '005', color: 'red', number: 6 }
                  ].map((result, index) => (
                    <div key={index} className="flex-shrink-0 text-center animate-fadeInUp" style={{animationDelay: `${index * 200}ms`}}>
                      <div className="text-xs text-gray-400 mb-1 sm:mb-2 font-semibold">{result.period}</div>
                      <div 
                        className={`w-7 sm:w-8 lg:w-10 h-7 sm:h-8 lg:h-10 rounded-lg sm:rounded-xl flex items-center justify-center text-white text-xs sm:text-sm font-black shadow-lg transform hover:scale-110 transition-transform duration-200 animate-pulse ${
                          result.color === 'green' ? 'bg-gradient-to-br from-green-500 to-green-600 shadow-green-500/50' :
                          result.color === 'red' ? 'bg-gradient-to-br from-red-500 to-red-600 shadow-red-500/50' : 
                          'bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/50'
                        }`}
                      >
                        {result.number}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Game Rules */}
              <div className="bg-gradient-to-r from-gray-800 to-slate-800 rounded-lg sm:rounded-xl lg:rounded-2xl p-2.5 sm:p-3 lg:p-4 border border-gray-600/50">
                <div className="text-center text-xs sm:text-sm text-gray-300 leading-relaxed space-y-0.5 sm:space-y-1 font-medium">
                  <p className="flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap">
                    <span className="w-2 sm:w-3 h-2 sm:h-3 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="w-2 sm:w-3 h-2 sm:h-3 bg-red-500 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></span>
                    <span className="w-2 sm:w-3 h-2 sm:h-3 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '1s'}}></span>
                    <span className="ml-1 sm:ml-2">Colors: Win 2x your bet</span>
                  </p>
                  <p className="flex items-center justify-center gap-1.5 sm:gap-2">
                    <span className="w-2 sm:w-3 h-2 sm:h-3 bg-purple-500 rounded-full animate-pulse" style={{animationDelay: '1.5s'}}></span>
                    <span className="ml-1 sm:ml-2">Numbers 0,5: Win 4.5x your bet</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1 sm:mt-2">🍀 Good luck and play responsibly!</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColorPredictionRoom;