"use client";

import { motion } from "framer-motion";
import { Gamepad2, Settings, Target, Trophy } from "lucide-react";

const steps = [
  {
    icon: Gamepad2,
    title: "Select Your Game",
    description:
      "Choose from Free Fire, PUBG Mobile, COD Mobile, Apex Legends, or BGMI.",
    color: "bg-neon-cyan/20 text-neon-cyan",
  },
  {
    icon: Settings,
    title: "Enter Device Info",
    description:
      "Select your device model, RAM, screen size, and play preferences.",
    color: "bg-neon-purple/20 text-neon-purple",
  },
  {
    icon: Target,
    title: "Get Calibrated Settings",
    description:
      "Our AI calculates your optimal sensitivity values instantly.",
    color: "bg-neon-pink/20 text-neon-pink",
  },
  {
    icon: Trophy,
    title: "Dominate & Share",
    description:
      "Apply settings in-game, climb ranks, and share with friends.",
    color: "bg-neon-green/20 text-neon-green",
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-24">
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
            How It <span className="gradient-text">Works</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Get your perfect sensitivity settings in just 4 simple steps.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative max-w-4xl mx-auto">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-pink -translate-y-1/2" />

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                className="relative"
              >
                {/* Step number */}
                <div className="flex justify-center mb-4">
                  <div className="relative">
                    <div
                      className={`w-16 h-16 rounded-xl ${step.color} flex items-center justify-center`}
                    >
                      <step.icon className="h-8 w-8" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground">
                      {index + 1}
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="text-center">
                  <h3 className="font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
