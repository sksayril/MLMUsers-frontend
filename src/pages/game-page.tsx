import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GamepadIcon, Trophy, Users, TrendingUp } from 'lucide-react';

const GamePage = () => {
  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-3xl font-bold tracking-tight flex items-center gap-2"
        >
          <GamepadIcon className="h-8 w-8" /> Games & Challenges
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-muted-foreground"
        >
          Compete in games and challenges to earn rewards
        </motion.p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 hover:shadow-md hover:shadow-blue-500/20 border-blue-500/20 h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="bg-blue-500/10 text-blue-500 p-1.5 rounded-full flex items-center justify-center">
                  <Trophy className="h-5 w-5" />
                </span>
                Daily Challenge
              </CardTitle>
              <CardDescription>Complete today's challenge to earn rewards</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-card p-4 rounded-lg">
                  <h3 className="font-semibold mb-1">Trade Volume Challenge</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Complete at least 5 trades with a minimum volume of $500
                  </p>
                  <div className="flex justify-between items-center text-sm">
                    <span>Reward: 250 XP + $25</span>
                    <span className="text-amber-500">2/5 completed</span>
                  </div>
                </div>
                <Button className="w-full">Start Challenge</Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 hover:shadow-md hover:shadow-purple-500/20 border-purple-500/20 h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="bg-purple-500/10 text-purple-500 p-1.5 rounded-full flex items-center justify-center">
                  <Users className="h-5 w-5" />
                </span>
                Tournaments
              </CardTitle>
              <CardDescription>Compete against other users to win big prizes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-card p-4 rounded-lg">
                  <h3 className="font-semibold mb-1">Trading Competition</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Highest ROI over 7 days wins the grand prize
                  </p>
                  <div className="flex justify-between items-center text-sm mb-2">
                    <span>Prize Pool: $10,000</span>
                    <span className="text-green-500">Live now</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    1,234 participants • Ends in 3 days
                  </div>
                </div>
                <Button variant="outline" className="w-full">
                  Join Tournament
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45 }}
        >
          <Card className="bg-gradient-to-r from-green-400/40 via-teal-400/20 to-teal-500/40 border-green-400/40 hover:shadow-lg hover:shadow-green-400/20 h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="bg-green-400/20 text-green-600 p-2 rounded-full flex items-center justify-center">
                  <GamepadIcon className="h-6 w-6" />
                </span>
                Quick Quiz
              </CardTitle>
              <CardDescription>Test your finance knowledge in a quick round</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-card/80 p-4 rounded-lg">
                  <h3 className="font-semibold mb-1">5-Question Quiz</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Answer 5 questions correctly to earn a small reward
                  </p>
                  <div className="flex justify-between items-center text-sm">
                    <span>Reward: 50 XP</span>
                    <span className="text-green-600">0/5 correct</span>
                  </div>
                </div>
                <Button className="w-full bg-green-500 hover:bg-green-600 text-white">Start Quiz</Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.475 }}
        >
          <Card className="bg-gradient-to-r from-yellow-300/40 via-orange-300/20 to-orange-400/40 border-yellow-400/40 hover:shadow-lg hover:shadow-orange-400/20 h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="bg-orange-300/20 text-orange-500 p-2 rounded-full flex items-center justify-center">
                  <GamepadIcon className="h-6 w-6" />
                </span>
                Practice Mode
              </CardTitle>
              <CardDescription>Play without pressure and improve your skills</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-card/80 p-4 rounded-lg">
                  <h3 className="font-semibold mb-1">Unlimited Practice</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    No rewards, just practice and learn at your own pace
                  </p>
                  <div className="flex justify-between items-center text-sm">
                    <span>Reward: None</span>
                    <span className="text-orange-500">Unlimited</span>
                  </div>
                </div>
                <Button className="w-full bg-orange-400 hover:bg-orange-500 text-white">Start Game</Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="md:col-span-2"
        >
          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 hover:shadow-md hover:shadow-amber-500/20 border-amber-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="bg-amber-500/10 text-amber-500 p-1.5 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-5 w-5" />
                </span>
                Leaderboard
              </CardTitle>
              <CardDescription>Top performers this month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[1, 2, 3].map((position) => (
                    <div key={position} className="bg-card p-4 rounded-lg flex items-center gap-4">
                      <div className={`text-2xl font-bold ${position === 1 ? 'text-amber-500' : position === 2 ? 'text-gray-400' : 'text-amber-800'}`}>
                        #{position}
                      </div>
                      <div>
                        <div className="font-medium">User{position}23</div>
                        <div className="text-sm text-muted-foreground">
                          {position === 1 ? '34,567' : position === 2 ? '31,892' : '29,145'} points
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-center">
                  <Button variant="link">View full leaderboard</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default GamePage;