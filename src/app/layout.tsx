import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { AgeGate } from "@/components/age-gate";
import { Chrome } from "@/components/chrome";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "eronikki",
    template: "%s · eronikki",
  },
  description:
    "Read doujinshi and manga from the nhentai API. Search, browse tags, and open a full-page reader.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const jar = await cookies();
  const ageOk = jar.get("eronikki_age")?.value === "1";

  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background">
        <AgeGate initialOk={ageOk}>
          <Chrome>
            <SiteHeader />
          </Chrome>
          {children}
          <Chrome>
            <footer className="mt-auto border-t border-border/80 px-4 py-6 text-center text-xs text-muted-foreground">
              Galleries and images come from the public{" "}
              <a
                href="https://nhentai.net/api/v2/docs"
                className="underline underline-offset-2 hover:text-foreground"
              >
                nhentai API v2
              </a>
              . eronikki is unofficial. Adult works only.
            </footer>
          </Chrome>
        </AgeGate>
      </body>
    </html>
  );
}
