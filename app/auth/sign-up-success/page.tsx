"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function SignUpSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-neon-green/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="glass border-border/50 text-center">
          <CardContent className="pt-8 pb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="flex justify-center mb-6"
            >
              <div className="p-4 rounded-full bg-neon-green/20">
                <Mail className="h-12 w-12 text-neon-green" />
              </div>
            </motion.div>

            <h1 className="text-2xl font-bold mb-2">Check Your Email</h1>
            <p className="text-muted-foreground mb-6">
              {"We've sent a confirmation link to your email address. Click the link to activate your account and start using XP Arena."}
            </p>

            <div className="space-y-3">
              <Link href="/calibrate">
                <Button variant="glow" className="w-full group">
                  Continue to Calibration
                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button variant="ghost" className="w-full">
                  Back to Login
                </Button>
              </Link>
            </div>

            <p className="text-xs text-muted-foreground mt-6">
              {"Didn't receive the email? Check your spam folder or contact support."}
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
