"use client";

import { motion } from "framer-motion";
import {
  Cpu,
  Smartphone,
  Sliders,
  BarChart3,
  Users,
  Video,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Cpu,
    title: "AI-Powered Calibration",
    description:
      "Advanced algorithms analyze your device specs and play style to generate optimal sensitivity settings.",
    color: "text-neon-cyan",
    glow: "glow-cyan",
  },
  {
    icon: Smartphone,
    title: "Device-Specific Optimization",
    description:
      "Settings tailored for your exact device model, screen size, refresh rate, and touch sampling rate.",
    color: "text-neon-purple",
    glow: "glow-purple",
  },
  {
    icon: Sliders,
    title: "Multi-Game Support",
    description:
      "Optimized profiles for Free Fire, PUBG Mobile, COD Mobile, Apex Legends Mobile, and BGMI.",
    color: "text-neon-pink",
    glow: "glow-pink",
  },
  {
    icon: BarChart3,
    title: "Comparison Tools",
    description:
      "Compare your settings side-by-side with pros or your previous configs using visual charts.",
    color: "text-neon-green",
    glow: "glow-cyan",
  },
  {
    icon: Users,
    title: "Vendor System",
    description:
      "Content creators can generate branded codes for their communities with custom settings.",
    color: "text-neon-cyan",
    glow: "glow-purple",
  },
  {
    icon: Video,
    title: "Training Tutorials",
    description:
      "Learn pro techniques with curated video tutorials for sensitivity mastery and aim training.",
    color: "text-neon-purple",
    glow: "glow-pink",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

export function FeaturesSection() {
  return (
    <section className="py-24 relative">
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
            Everything You Need to{" "}
            <span className="gradient-text">Dominate</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-balance">
            Professional-grade tools designed for serious mobile gamers who want
            to reach their full potential.
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature, index) => (
            <motion.div key={index} variants={itemVariants}>
              <Card className="h-full glass-hover group cursor-pointer">
                <CardContent className="p-6">
                  <div
                    className={`inline-flex p-3 rounded-xl bg-muted/50 ${feature.glow} mb-4 transition-all group-hover:scale-110`}
                  >
                    <feature.icon className={`h-6 w-6 ${feature.color}`} />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
