import Link from "next/link";
import { Gamepad2, Github, Twitter, Youtube } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/30 bg-card/30 backdrop-blur-xl">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <Gamepad2 className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold gradient-text">XP Arena</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Pro-level sensitivity calibration for mobile gamers. Optimize your
              settings and dominate the battlefield.
            </p>
            <div className="flex gap-4">
              <a
                href="#"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="YouTube"
              >
                <Youtube className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="GitHub"
              >
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/calibrate"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Calibrate Settings
                </Link>
              </li>
              <li>
                <Link
                  href="/compare"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Compare Settings
                </Link>
              </li>
              <li>
                <Link
                  href="/tutorials"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Video Tutorials
                </Link>
              </li>
              <li>
                <Link
                  href="/vault"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Enter Vault Code
                </Link>
              </li>
            </ul>
          </div>

          {/* Supported Games */}
          <div>
            <h3 className="font-semibold mb-4">Supported Games</h3>
            <ul className="space-y-2 text-sm">
              <li className="text-muted-foreground">Free Fire</li>
              <li className="text-muted-foreground">PUBG Mobile</li>
              <li className="text-muted-foreground">COD Mobile</li>
              <li className="text-muted-foreground">Apex Legends Mobile</li>
              <li className="text-muted-foreground">BGMI</li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold mb-4">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/privacy"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border/30 mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>2024 XP Arena. All rights reserved. Not affiliated with any game publisher.</p>
        </div>
      </div>
    </footer>
  );
}
