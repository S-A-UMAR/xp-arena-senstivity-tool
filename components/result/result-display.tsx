"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Copy,
  Check,
  Share2,
  Eye,
  Bookmark,
  Gamepad2,
  Smartphone,
  Gauge,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import type { Calibration, Game } from "@/lib/types";
import {
  getGripStyleLabel,
  getPlayStyleLabel,
  getExperienceLabel,
} from "@/lib/utils";

interface ResultDisplayProps {
  calibration: Calibration & { game: Game };
  shareCode: string;
}

export function ResultDisplay({ calibration, shareCode }: ResultDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const { toast } = useToast();
  const { game } = calibration;

  const copySettings = () => {
    const text = game.sensitivity_fields
      .map(
        (field) =>
          `${field.label}: ${calibration.sensitivity_values[field.key]}`
      )
      .join("\n");

    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Settings copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    toast({
      title: "Link Copied!",
      description: "Share link copied to clipboard",
    });
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-neon-green";
    if (score >= 70) return "text-neon-cyan";
    if (score >= 50) return "text-yellow-500";
    return "text-orange-500";
  };

  return (
    <div className="container mx-auto max-w-4xl">
      {/* Header */}
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary/30 mb-4"
        >
          <span className="text-sm text-muted-foreground">Share Code:</span>
          <span className="font-mono font-bold text-primary">{shareCode}</span>
        </motion.div>

        <h1 className="text-3xl font-bold mb-2">
          <span className="gradient-text">{game.name}</span> Settings
        </h1>
        <p className="text-muted-foreground">
          Calibrated for {calibration.device_name}
        </p>

        {/* Stats */}
        <div className="flex items-center justify-center gap-6 mt-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            {calibration.views_count} views
          </span>
          <span className="flex items-center gap-1">
            <Bookmark className="h-4 w-4" />
            {calibration.saves_count} saves
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sensitivity Values */}
          <Card className="glass overflow-hidden">
            <CardHeader className="border-b border-border/30">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Gamepad2 className="h-5 w-5 text-primary" />
                  Sensitivity Settings
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={copySettings}>
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button size="sm" variant="outline" onClick={copyLink}>
                    {copiedLink ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Share2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {game.sensitivity_fields.map((field, index) => (
                  <motion.div
                    key={field.key}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="space-y-2"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        {field.label}
                      </span>
                      <span className="text-2xl font-mono font-bold text-primary">
                        {calibration.sensitivity_values[field.key]}
                      </span>
                    </div>
                    <Progress
                      value={
                        ((calibration.sensitivity_values[field.key] - field.min) /
                          (field.max - field.min)) *
                        100
                      }
                      className="h-2"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{field.min}</span>
                      <span>{field.max}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Calibration Score */}
          <Card className="glass">
            <CardContent className="pt-6 text-center">
              <Gauge className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <div className="text-sm text-muted-foreground mb-1">
                Calibration Score
              </div>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
                className={`text-5xl font-bold ${getScoreColor(
                  calibration.calibration_score || 0
                )}`}
              >
                {calibration.calibration_score || 0}
              </motion.div>
              <div className="text-xs text-muted-foreground mt-1">
                out of 100
              </div>
              <Progress
                value={calibration.calibration_score || 0}
                className="mt-4 h-2"
              />
            </CardContent>
          </Card>

          {/* Device Info */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Device Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Device</span>
                <span className="truncate ml-2">{calibration.device_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Screen</span>
                <span>{calibration.screen_size}"</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">RAM</span>
                <span>{calibration.ram_gb}GB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Grip</span>
                <span>{getGripStyleLabel(calibration.grip_style)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Style</span>
                <span>{getPlayStyleLabel(calibration.play_style)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Level</span>
                <span>{getExperienceLabel(calibration.experience_level)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="space-y-3">
            <Button variant="glow" className="w-full" asChild>
              <a href="/calibrate">Create Your Own</a>
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <a href={`/compare?codes=${shareCode}`}>Compare Settings</a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
