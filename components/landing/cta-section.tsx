"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CTASection() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-neon-cyan/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-neon-purple/20 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary/30 mb-6">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm">Free to use, no signup required</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-bold mb-6">
            Ready to <span className="gradient-text">Level Up</span>?
          </h2>

          <p className="text-lg text-muted-foreground mb-8 text-balance">
            Join thousands of players who have optimized their sensitivity
            settings and improved their gameplay. Start your calibration now.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/calibrate">
              <Button size="xl" variant="glow" className="group">
                Start Free Calibration
                <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/tutorials">
              <Button size="xl" variant="outline">
                Watch Tutorials
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
