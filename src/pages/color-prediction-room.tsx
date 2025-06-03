import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle,  Clock, Loader2, Trophy, Users, Coins, Target, Zap, Crown, TrendingDown } from 'lucide-react';
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

      const response = await axios.get<GameRoomResponse>(`http://localhost:3100/api/game/room/${roomId}`, {
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
        'http://localhost:3100/api/game/room/join', 
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
    
    // Set up polling with 20-second interval
    const intervalId = setInterval(async () => {
      console.log('Polling game room data...');
      const shouldContinue = await fetchData();
      if (!shouldContinue) {
        clearInterval(intervalId);
      }
    }, 20000); // Poll every 20 seconds
    
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
  return (
    <div className="container mx-auto py-8 min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {isLoading ? (
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
      ) : error ? (
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
      ) : (
        <Card className="overflow-hidden border-2 border-blue-500/30 bg-gradient-to-br from-[#1E254A] via-[#2A1F47] to-[#161A42] text-white relative shadow-2xl max-w-4xl mx-auto">
          {/* Animated Background Elements */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full -translate-y-20 translate-x-20 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full translate-y-16 -translate-x-16 animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-full animate-spin" style={{ animationDuration: '20s' }}></div>
          
          <CardHeader className="relative z-10">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                🎮 Room {gameRoom?.roomId}
              </CardTitle>
              
              <Badge 
                variant={gameRoom?.status === 'waiting' ? 'outline' : 'secondary'} 
                className={`capitalize text-lg px-4 py-2 ${
                  gameRoom?.status === 'waiting' 
                    ? 'bg-green-500/20 text-green-400 border-green-500/50 animate-pulse' 
                    : gameRoom?.status === 'completed'
                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                    : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
                }`}
              >
                {gameRoom?.status === 'waiting' && '🟢 '}
                {gameRoom?.status === 'completed' && '🏁 '}
                {gameRoom?.status}
              </Badge>
            </div>
            
            {gameRoom && (
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-xl p-4 border border-blue-500/20">
                  <div className="flex items-center gap-3">
                    <Coins className="h-6 w-6 text-blue-400" />
                    <div>
                      <span className="text-blue-200 text-sm block">Entry Fee</span>
                      <span className="text-xl font-bold text-blue-400">₹{gameRoom.entryFee}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 rounded-xl p-4 border border-purple-500/20">
                  <div className="flex items-center gap-3">
                    <Trophy className="h-6 w-6 text-purple-400" />
                    <div>
                      <span className="text-purple-200 text-sm block">Prize Pool</span>
                      <span className="text-xl font-bold text-purple-400">₹{gameRoom.winningAmount}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardHeader>
          
          <CardContent className="relative z-10">
            {renderGameStatus()}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ColorPredictionRoom;