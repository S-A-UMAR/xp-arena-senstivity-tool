"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Smartphone, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import type { Device } from "@/lib/types";
import type { CalibrationState } from "../calibration-wizard";

interface DeviceSelectionProps {
  devices: Device[];
  state: CalibrationState;
  updateState: (updates: Partial<CalibrationState>) => void;
  onBack: () => void;
  onContinue: () => void;
}

export function DeviceSelection({
  devices,
  state,
  updateState,
  onBack,
  onContinue,
}: DeviceSelectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [useCustomDevice, setUseCustomDevice] = useState(false);

  // Get unique brands
  const brands = [...new Set(devices.map((d) => d.brand))].sort();

  // Filter devices by search query
  const filteredDevices = devices.filter(
    (d) =>
      d.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.brand.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeviceSelect = (deviceId: string) => {
    const device = devices.find((d) => d.id === deviceId);
    if (device) {
      updateState({
        deviceId,
        device,
        deviceName: device.display_name,
        screenSize: device.screen_size,
        ramGb: device.ram_options[0] || 6,
      });
    }
  };

  const isValid = useCustomDevice
    ? state.deviceName && state.ramGb && state.screenSize
    : state.deviceId;

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Your <span className="gradient-text">Device</span>
        </h1>
        <p className="text-muted-foreground">
          Select your device or enter custom specifications
        </p>
      </div>

      {/* Toggle between preset and custom */}
      <div className="flex justify-center gap-4 mb-6">
        <Button
          variant={!useCustomDevice ? "default" : "outline"}
          onClick={() => setUseCustomDevice(false)}
        >
          <Smartphone className="h-4 w-4 mr-2" />
          Select Device
        </Button>
        <Button
          variant={useCustomDevice ? "default" : "outline"}
          onClick={() => setUseCustomDevice(true)}
        >
          Custom Specs
        </Button>
      </div>

      {!useCustomDevice ? (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search devices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Device Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto pr-2">
            {filteredDevices.slice(0, 20).map((device) => (
              <motion.div
                key={device.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <Card
                  className={`cursor-pointer transition-all ${
                    state.deviceId === device.id
                      ? "border-primary glow-cyan"
                      : "glass-hover"
                  }`}
                  onClick={() => handleDeviceSelect(device.id)}
                >
                  <CardContent className="p-3 text-center">
                    <Smartphone className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-xs font-medium truncate">
                      {device.display_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {device.screen_size}" | {device.refresh_rate}Hz
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Selected device RAM selection */}
          {state.device && state.device.ram_options.length > 1 && (
            <div className="mt-4">
              <Label>Select RAM Configuration</Label>
              <Select
                value={String(state.ramGb)}
                onValueChange={(val) => updateState({ ramGb: parseInt(val) })}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {state.device.ram_options.map((ram) => (
                    <SelectItem key={ram} value={String(ram)}>
                      {ram}GB RAM
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      ) : (
        <Card className="glass">
          <CardContent className="p-6 space-y-6">
            {/* Device Name */}
            <div className="space-y-2">
              <Label>Device Name</Label>
              <Input
                placeholder="e.g., Samsung Galaxy S24"
                value={state.deviceName}
                onChange={(e) => updateState({ deviceName: e.target.value })}
              />
            </div>

            {/* Screen Size */}
            <div className="space-y-4">
              <div className="flex justify-between">
                <Label>Screen Size</Label>
                <span className="text-sm text-muted-foreground">
                  {state.screenSize.toFixed(1)} inches
                </span>
              </div>
              <Slider
                value={[state.screenSize]}
                onValueChange={([val]) => updateState({ screenSize: val })}
                min={5}
                max={14}
                step={0.1}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>5" (Small Phone)</span>
                <span>14" (Tablet)</span>
              </div>
            </div>

            {/* RAM */}
            <div className="space-y-4">
              <div className="flex justify-between">
                <Label>RAM</Label>
                <span className="text-sm text-muted-foreground">
                  {state.ramGb}GB
                </span>
              </div>
              <Slider
                value={[state.ramGb]}
                onValueChange={([val]) => updateState({ ramGb: val })}
                min={2}
                max={16}
                step={1}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>2GB</span>
                <span>16GB</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={onContinue} disabled={!isValid}>
          Continue
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
