"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, KeyRound, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

export default function VaultPage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const trimmedCode = code.trim().toUpperCase();

    try {
      // Check if it's a vault code
      const { data: vaultCode, error: vaultError } = await supabase
        .from("vault_codes")
        .select("*, vendor:vendors(*)")
        .eq("code", trimmedCode)
        .eq("is_active", true)
        .single();

      if (vaultCode && !vaultError) {
        // Valid vault code - redirect to calibration with code
        router.push(`/calibrate?vault=${trimmedCode}`);
        return;
      }

      // Check if it's a share code for an existing calibration
      const { data: calibration, error: calError } = await supabase
        .from("calibrations")
        .select("*, game:games(*)")
        .eq("share_code", trimmedCode)
        .single();

      if (calibration && !calError) {
        // Valid share code - redirect to results
        router.push(`/result/${trimmedCode}`);
        return;
      }

      // Invalid code
      setError("Invalid code. Please check and try again.");
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen">
      <Header />
      <div className="pt-24 pb-12 px-4 flex items-center justify-center min-h-screen">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-1/3 left-1/4 w-96 h-96 bg-neon-cyan/10 rounded-full blur-3xl"
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
            className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-neon-purple/10 rounded-full blur-3xl"
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md relative z-10"
        >
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/20 mb-4 glow-cyan"
            >
              <Lock className="h-10 w-10 text-primary" />
            </motion.div>
            <h1 className="text-3xl font-bold mb-2">
              Enter <span className="gradient-text">Vault Code</span>
            </h1>
            <p className="text-muted-foreground">
              Access exclusive settings with a vendor code or view shared
              calibrations
            </p>
          </div>

          <Card className="glass border-border/50">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Enter code..."
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      className="pl-11 h-14 text-lg font-mono tracking-wider text-center uppercase"
                      maxLength={12}
                      autoComplete="off"
                      autoFocus
                    />
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg"
                    >
                      <AlertCircle className="h-4 w-4" />
                      {error}
                    </motion.div>
                  )}

                  <Button
                    type="submit"
                    variant="glow"
                    className="w-full h-12"
                    disabled={!code.trim() || loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Validating...
                      </>
                    ) : (
                      <>
                        Access Vault
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </form>

              <div className="mt-6 text-center">
                <p className="text-xs text-muted-foreground">
                  {"Don't have a code? "}
                  <a href="/calibrate" className="text-primary hover:underline">
                    Start free calibration
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Info boxes */}
          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="glass p-4 rounded-lg text-center">
              <p className="text-sm font-medium text-primary">Vendor Codes</p>
              <p className="text-xs text-muted-foreground mt-1">
                Get codes from content creators for exclusive settings
              </p>
            </div>
            <div className="glass p-4 rounded-lg text-center">
              <p className="text-sm font-medium text-secondary">Share Codes</p>
              <p className="text-xs text-muted-foreground mt-1">
                View calibrations shared by other players
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
