"use client";

import { motion } from "framer-motion";
import { Gamepad2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Game } from "@/lib/types";

interface GameSelectionProps {
  games: Game[];
  onSelect: (gameId: string) => void;
}

const gameColors: Record<string, string> = {
  "free-fire": "from-orange-500 to-red-500",
  "pubg-mobile": "from-yellow-500 to-orange-500",
  "cod-mobile": "from-green-500 to-emerald-500",
  "apex-mobile": "from-red-500 to-pink-500",
  bgmi: "from-blue-500 to-cyan-500",
};

export function GameSelection({ games, onSelect }: GameSelectionProps) {
  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Select Your <span className="gradient-text">Game</span>
        </h1>
        <p className="text-muted-foreground">
          Choose the game you want to calibrate sensitivity for
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {games.map((game, index) => (
          <motion.div
            key={game.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card
              className="glass-hover cursor-pointer group overflow-hidden"
              onClick={() => onSelect(game.id)}
            >
              <CardContent className="p-6 relative">
                {/* Gradient overlay on hover */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${
                    gameColors[game.slug] || "from-cyan-500 to-purple-500"
                  } opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
                />

                <div className="relative z-10">
                  <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-xl bg-muted/50 group-hover:scale-110 transition-transform">
                    <Gamepad2 className="h-8 w-8 text-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-center mb-1">
                    {game.name}
                  </h3>
                  <p className="text-xs text-muted-foreground text-center">
                    {game.description}
                  </p>
                  <div className="mt-4 text-center">
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-xs">
                      {game.sensitivity_fields.length} sensitivity options
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {games.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No games available</p>
        </div>
      )}
    </div>
  );
}
