"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { GameSelection } from "./steps/game-selection";
import { DeviceSelection } from "./steps/device-selection";
import { PlayStyleSelection } from "./steps/play-style-selection";
import { CalibrationResults } from "./steps/calibration-results";
import { Progress } from "@/components/ui/progress";
import type {
  Game,
  Device,
  GripStyle,
  PlayStyle,
  HandSize,
  ExperienceLevel,
} from "@/lib/types";
import { calculateSensitivity } from "@/lib/calculator";

interface CalibrationWizardProps {
  games: Game[];
  devices: Device[];
}

export interface CalibrationState {
  gameId: string;
  game: Game | null;
  deviceId: string;
  device: Device | null;
  deviceName: string;
  ramGb: number;
  screenSize: number;
  gripStyle: GripStyle;
  playStyle: PlayStyle;
  handSize: HandSize;
  experienceLevel: ExperienceLevel;
}

const initialState: CalibrationState = {
  gameId: "",
  game: null,
  deviceId: "",
  device: null,
  deviceName: "",
  ramGb: 6,
  screenSize: 6.5,
  gripStyle: "thumbs",
  playStyle: "balanced",
  handSize: "medium",
  experienceLevel: "intermediate",
};

const STEPS = [
  { id: 1, title: "Select Game" },
  { id: 2, title: "Device Info" },
  { id: 3, title: "Play Style" },
  { id: 4, title: "Results" },
];

export function CalibrationWizard({ games, devices }: CalibrationWizardProps) {
  const [step, setStep] = useState(1);
  const [state, setState] = useState<CalibrationState>(initialState);
  const [results, setResults] = useState<{
    sensitivityValues: Record<string, number>;
    calibrationScore: number;
    tips: string[];
  } | null>(null);
  const router = useRouter();

  const progress = (step / STEPS.length) * 100;

  const updateState = (updates: Partial<CalibrationState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  const handleGameSelect = (gameId: string) => {
    const game = games.find((g) => g.id === gameId) || null;
    updateState({ gameId, game });
    setStep(2);
  };

  const handleDeviceComplete = () => {
    setStep(3);
  };

  const handlePlayStyleComplete = () => {
    // Calculate the sensitivity
    if (state.game) {
      const result = calculateSensitivity(
        {
          gameId: state.gameId,
          deviceId: state.deviceId || undefined,
          deviceName: state.deviceName || state.device?.display_name,
          ramGb: state.ramGb,
          screenSize: state.screenSize,
          gripStyle: state.gripStyle,
          playStyle: state.playStyle,
          handSize: state.handSize,
          experienceLevel: state.experienceLevel,
        },
        state.game.slug,
        state.game.sensitivity_fields,
        state.device?.is_tablet || state.screenSize > 8
      );
      setResults(result);
    }
    setStep(4);
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleReset = () => {
    setState(initialState);
    setResults(null);
    setStep(1);
  };

  return (
    <div className="container mx-auto max-w-4xl">
      {/* Progress Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {STEPS.map((s, index) => (
            <div
              key={s.id}
              className={`flex items-center ${
                index < STEPS.length - 1 ? "flex-1" : ""
              }`}
            >
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all ${
                  step >= s.id
                    ? "bg-primary text-primary-foreground glow-cyan"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {s.id}
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 transition-all ${
                    step > s.id ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          {STEPS.map((s) => (
            <span
              key={s.id}
              className={step >= s.id ? "text-foreground" : ""}
            >
              {s.title}
            </span>
          ))}
        </div>
        <Progress value={progress} className="mt-4 h-2" />
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {step === 1 && (
            <GameSelection games={games} onSelect={handleGameSelect} />
          )}
          {step === 2 && (
            <DeviceSelection
              devices={devices}
              state={state}
              updateState={updateState}
              onBack={handleBack}
              onContinue={handleDeviceComplete}
            />
          )}
          {step === 3 && (
            <PlayStyleSelection
              state={state}
              updateState={updateState}
              onBack={handleBack}
              onContinue={handlePlayStyleComplete}
            />
          )}
          {step === 4 && results && state.game && (
            <CalibrationResults
              game={state.game}
              state={state}
              results={results}
              onReset={handleReset}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
