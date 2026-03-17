"use client";

import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Hand,
  Zap,
  Target,
  Shield,
  Crosshair,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { CalibrationState } from "../calibration-wizard";
import type { GripStyle, PlayStyle, HandSize, ExperienceLevel } from "@/lib/types";

interface PlayStyleSelectionProps {
  state: CalibrationState;
  updateState: (updates: Partial<CalibrationState>) => void;
  onBack: () => void;
  onContinue: () => void;
}

const gripStyles: { value: GripStyle; label: string; description: string }[] = [
  { value: "thumbs", label: "Thumbs Only", description: "Both thumbs on screen" },
  { value: "claw", label: "Claw Grip", description: "Index fingers + thumbs" },
  { value: "3finger", label: "3-Finger", description: "Three finger setup" },
  { value: "4finger", label: "4-Finger", description: "Four finger setup" },
  { value: "5finger", label: "5-Finger", description: "Five finger control" },
  { value: "6finger", label: "6-Finger", description: "Full hand control" },
];

const playStyles: {
  value: PlayStyle;
  label: string;
  description: string;
  icon: typeof Zap;
}[] = [
  {
    value: "aggressive",
    label: "Aggressive",
    description: "Rush plays, close combat",
    icon: Zap,
  },
  {
    value: "balanced",
    label: "Balanced",
    description: "Mix of styles",
    icon: Target,
  },
  {
    value: "passive",
    label: "Passive",
    description: "Strategic, defensive",
    icon: Shield,
  },
  {
    value: "sniper",
    label: "Sniper",
    description: "Long-range specialist",
    icon: Crosshair,
  },
];

const handSizes: { value: HandSize; label: string }[] = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
];

const experienceLevels: {
  value: ExperienceLevel;
  label: string;
  description: string;
}[] = [
  { value: "beginner", label: "Beginner", description: "New to the game" },
  {
    value: "intermediate",
    label: "Intermediate",
    description: "Regular player",
  },
  { value: "advanced", label: "Advanced", description: "Skilled player" },
  { value: "pro", label: "Pro", description: "Competitive/Tournament" },
];

export function PlayStyleSelection({
  state,
  updateState,
  onBack,
  onContinue,
}: PlayStyleSelectionProps) {
  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Your <span className="gradient-text">Play Style</span>
        </h1>
        <p className="text-muted-foreground">
          Tell us how you play to optimize your settings
        </p>
      </div>

      <div className="space-y-8">
        {/* Grip Style */}
        <div>
          <Label className="text-base mb-3 block">How do you hold your device?</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {gripStyles.map((grip) => (
              <motion.div
                key={grip.value}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card
                  className={`cursor-pointer transition-all ${
                    state.gripStyle === grip.value
                      ? "border-primary glow-cyan"
                      : "glass-hover"
                  }`}
                  onClick={() => updateState({ gripStyle: grip.value })}
                >
                  <CardContent className="p-4 text-center">
                    <Hand className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">{grip.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {grip.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Play Style */}
        <div>
          <Label className="text-base mb-3 block">What's your play style?</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {playStyles.map((style) => (
              <motion.div
                key={style.value}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card
                  className={`cursor-pointer transition-all ${
                    state.playStyle === style.value
                      ? "border-secondary glow-purple"
                      : "glass-hover"
                  }`}
                  onClick={() => updateState({ playStyle: style.value })}
                >
                  <CardContent className="p-4 text-center">
                    <style.icon className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">{style.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {style.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Hand Size */}
        <div>
          <Label className="text-base mb-3 block">Your hand size</Label>
          <div className="flex gap-3">
            {handSizes.map((size) => (
              <Button
                key={size.value}
                variant={state.handSize === size.value ? "default" : "outline"}
                className="flex-1"
                onClick={() => updateState({ handSize: size.value })}
              >
                {size.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Experience Level */}
        <div>
          <Label className="text-base mb-3 block">Experience level</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {experienceLevels.map((level) => (
              <motion.div
                key={level.value}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card
                  className={`cursor-pointer transition-all ${
                    state.experienceLevel === level.value
                      ? "border-accent glow-pink"
                      : "glass-hover"
                  }`}
                  onClick={() => updateState({ experienceLevel: level.value })}
                >
                  <CardContent className="p-4 text-center">
                    <p className="text-sm font-medium">{level.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {level.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button variant="glow" onClick={onContinue}>
          Calculate Settings
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
