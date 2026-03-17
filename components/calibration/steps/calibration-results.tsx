"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Copy,
  Check,
  Share2,
  RotateCcw,
  Download,
  Lightbulb,
  Gauge,
  Bookmark,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import type { Game } from "@/lib/types";
import type { CalibrationState } from "../calibration-wizard";
import {
  getGripStyleLabel,
  getPlayStyleLabel,
  getExperienceLabel,
} from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { generateShareCode } from "@/lib/utils";

interface CalibrationResultsProps {
  game: Game;
  state: CalibrationState;
  results: {
    sensitivityValues: Record<string, number>;
    calibrationScore: number;
    tips: string[];
  };
  onReset: () => void;
}

export function CalibrationResults({
  game,
  state,
  results,
  onReset,
}: CalibrationResultsProps) {
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const { toast } = useToast();

  const copyToClipboard = () => {
    const text = game.sensitivity_fields
      .map((field) => `${field.label}: ${results.sensitivityValues[field.key]}`)
      .join("\n");

    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Settings copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const saveCalibration = async () => {
    setSaving(true);
    const supabase = createClient();
    const code = generateShareCode();

    try {
      const { error } = await supabase.from("calibrations").insert({
        game_id: game.id,
        device_id: state.deviceId || null,
        device_name: state.deviceName || state.device?.display_name,
        ram_gb: state.ramGb,
        screen_size: state.screenSize,
        grip_style: state.gripStyle,
        play_style: state.playStyle,
        hand_size: state.handSize,
        experience_level: state.experienceLevel,
        sensitivity_values: results.sensitivityValues,
        calibration_score: results.calibrationScore,
        share_code: code,
        is_public: true,
      });

      if (error) throw error;

      setShareCode(code);
      setSaved(true);
      toast({
        title: "Saved!",
        description: `Share code: ${code}`,
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to save calibration",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-neon-green";
    if (score >= 70) return "text-neon-cyan";
    if (score >= 50) return "text-yellow-500";
    return "text-orange-500";
  };

  return (
    <div>
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/20 mb-4"
        >
          <Gauge className="h-10 w-10 text-primary" />
        </motion.div>
        <h1 className="text-3xl font-bold mb-2">
          Your <span className="gradient-text">Calibrated Settings</span>
        </h1>
        <p className="text-muted-foreground">
          Optimized for {game.name} on {state.device?.display_name || state.deviceName}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sensitivity Values */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>Sensitivity Settings</span>
                <span className="ml-auto flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copyToClipboard}
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {game.sensitivity_fields.map((field, index) => (
                  <motion.div
                    key={field.key}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="space-y-2"
                  >
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{field.label}</span>
                      <span className="font-mono font-bold text-primary">
                        {results.sensitivityValues[field.key]}
                      </span>
                    </div>
                    <Progress
                      value={
                        ((results.sensitivityValues[field.key] - field.min) /
                          (field.max - field.min)) *
                        100
                      }
                      className="h-2"
                    />
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                Pro Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {results.tips.map((tip, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className="flex items-start gap-3 text-sm"
                  >
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary">
                      {index + 1}
                    </span>
                    <span className="text-muted-foreground">{tip}</span>
                  </motion.li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Calibration Score */}
          <Card className="glass">
            <CardContent className="pt-6 text-center">
              <div className="text-sm text-muted-foreground mb-2">
                Calibration Score
              </div>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
                className={`text-5xl font-bold ${getScoreColor(
                  results.calibrationScore
                )}`}
              >
                {results.calibrationScore}
              </motion.div>
              <div className="text-xs text-muted-foreground mt-1">out of 100</div>
              <Progress
                value={results.calibrationScore}
                className="mt-4 h-2"
              />
            </CardContent>
          </Card>

          {/* Config Summary */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-sm">Your Configuration</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Game</span>
                <span>{game.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Device</span>
                <span className="truncate ml-2">
                  {state.device?.display_name || state.deviceName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Screen</span>
                <span>{state.screenSize}"</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">RAM</span>
                <span>{state.ramGb}GB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Grip</span>
                <span>{getGripStyleLabel(state.gripStyle)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Style</span>
                <span>{getPlayStyleLabel(state.playStyle)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Level</span>
                <span>{getExperienceLabel(state.experienceLevel)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="space-y-3">
            {!saved ? (
              <Button
                className="w-full"
                onClick={saveCalibration}
                disabled={saving}
              >
                <Bookmark className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save & Get Share Code"}
              </Button>
            ) : (
              <div className="p-4 bg-primary/10 rounded-lg text-center">
                <p className="text-xs text-muted-foreground mb-1">Share Code</p>
                <p className="text-xl font-mono font-bold text-primary">
                  {shareCode}
                </p>
              </div>
            )}

            <Button variant="outline" className="w-full" onClick={onReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              New Calibration
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
