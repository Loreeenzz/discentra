"use client";

import type React from "react";
import Image from "next/image";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertOctagon, MessageSquareText, Menu, X, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { useMobile } from "@/hooks/use-mobile";

export default function NavBar() {
  const pathname = usePathname();
  const isMobile = useMobile();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/warning.png"
              alt="Warning"
              width={24}
              height={24}
              className="h-6 w-6"
              priority
            />
            <span className="font-bold text-lg hidden sm:inline-block">
              DISCENTRA
            </span>
          </Link>
        </div>

        {isMobile ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>

            {isMenuOpen && (
              <div className="absolute top-16 left-0 right-0 bg-background border-b p-4 flex flex-col gap-2 animate-in slide-in-from-top-5">
                <NavItem
                  href="/"
                  icon={<AlertOctagon className="h-5 w-5 text-red-500" />}
                  label="Emergency SOS"
                  isMobile
                />
                <NavItem
                  href="/ai-assistant"
                  icon={<MessageSquareText className="h-5 w-5 text-blue-500" />}
                  label="AI Disaster Assistant"
                  isMobile
                />
                <div className="flex justify-end pt-2">
                  <ModeToggle />
                </div>
              </div>
            )}
          </>
        ) : (
          <nav className="flex items-center gap-4 sm:gap-6">
            <NavItem
              href="/"
              icon={<AlertOctagon className="h-5 w-5 text-red-500" />}
              label="Emergency SOS"
            />
            <NavItem
              href="/ai-assistant"
              icon={<MessageSquareText className="h-5 w-5 text-blue-500" />}
              label="AI Disaster Assistant"
            />
            <ModeToggle />
          </nav>
        )}
      </div>
    </header>
  );
}

function NavItem({
  href,
  icon,
  label,
  isMobile = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  isMobile?: boolean;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={`
        ${isMobile ? "flex w-full" : "flex items-center"} 
        gap-2 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap
        transition-colors 
        ${
          isActive
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        }
      `}
    >
      {icon}
      {label}
    </Link>
  );
}
