"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Crosshair, Zap, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-cyan/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-purple/10 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary/30 mb-8"
          >
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">
              AI-Powered Sensitivity Optimization
            </span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-7xl font-bold mb-6 leading-tight"
          >
            <span className="text-foreground">Unlock Your</span>
            <br />
            <span className="gradient-text text-glow-cyan">Pro Potential</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto text-balance"
          >
            Get personalized sensitivity settings calibrated for your device,
            play style, and skill level. Dominate in Free Fire, PUBG Mobile, COD
            Mobile, and more.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
          >
            <Link href="/calibrate">
              <Button size="xl" variant="glow" className="group">
                Start Calibration
                <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/vault">
              <Button size="xl" variant="outline">
                Enter Vault Code
              </Button>
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="grid grid-cols-3 gap-4 sm:gap-8 max-w-lg mx-auto"
          >
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-primary">
                50K+
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">
                Players Calibrated
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-secondary">
                5
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">
                Games Supported
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-accent">
                98%
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">
                Satisfaction Rate
              </div>
            </div>
          </motion.div>
        </div>

        {/* Floating Icons */}
        <motion.div
          className="absolute top-1/3 left-10 hidden lg:block"
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <div className="glass p-4 rounded-xl glow-cyan">
            <Crosshair className="h-8 w-8 text-primary" />
          </div>
        </motion.div>

        <motion.div
          className="absolute bottom-1/3 right-10 hidden lg:block"
          animate={{ y: [0, 20, 0] }}
          transition={{ duration: 3, repeat: Infinity, delay: 1.5 }}
        >
          <div className="glass p-4 rounded-xl glow-purple">
            <Shield className="h-8 w-8 text-secondary" />
          </div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex justify-center pt-2">
          <div className="w-1.5 h-3 bg-primary rounded-full" />
        </div>
      </motion.div>
    </section>
  );
}
