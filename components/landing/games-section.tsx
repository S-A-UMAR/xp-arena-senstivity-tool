"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Gamepad2 } from "lucide-react";

const games = [
  {
    name: "Free Fire",
    slug: "free-fire",
    description: "Battle Royale optimized for fast-paced action",
    players: "15K+",
    color: "from-orange-500 to-red-500",
  },
  {
    name: "PUBG Mobile",
    slug: "pubg-mobile",
    description: "Tactical battle royale with precise controls",
    players: "12K+",
    color: "from-yellow-500 to-orange-500",
  },
  {
    name: "COD Mobile",
    slug: "cod-mobile",
    description: "Fast multiplayer with diverse game modes",
    players: "8K+",
    color: "from-green-500 to-emerald-500",
  },
  {
    name: "Apex Legends",
    slug: "apex-mobile",
    description: "Hero shooter with unique abilities",
    players: "5K+",
    color: "from-red-500 to-pink-500",
  },
  {
    name: "BGMI",
    slug: "bgmi",
    description: "India's premier battle royale experience",
    players: "10K+",
    color: "from-blue-500 to-cyan-500",
  },
];

export function GamesSection() {
  return (
    <section className="py-24 bg-muted/20">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Supported <span className="gradient-text">Games</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Optimized sensitivity profiles for the most popular mobile esports
            titles.
          </p>
        </motion.div>

        {/* Games Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {games.map((game, index) => (
            <motion.div
              key={game.slug}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="glass-hover group cursor-pointer h-full overflow-hidden">
                <CardContent className="p-6 relative">
                  {/* Gradient overlay */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${game.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
                  />

                  <div className="relative z-10">
                    <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-xl bg-muted/50 group-hover:scale-110 transition-transform">
                      <Gamepad2 className="h-8 w-8 text-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold text-center mb-1">
                      {game.name}
                    </h3>
                    <p className="text-xs text-muted-foreground text-center mb-3">
                      {game.description}
                    </p>
                    <div className="text-center">
                      <span className="text-sm font-medium text-primary">
                        {game.players}
                      </span>
                      <span className="text-xs text-muted-foreground ml-1">
                        calibrated
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
