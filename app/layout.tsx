import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toast";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Handoff — Client & Project Management for Freelancers",
    template: "%s | Handoff",
  },
  description:
    "Handoff is an open-source client and project management platform for freelancers. Manage clients, projects, deliverables, requests, invoices, and client portals in one place.",
  applicationName: "Handoff",
  keywords: [
    "freelancer",
    "freelancing",
    "project management",
    "client management",
    "client portal",
    "deliverables",
    "invoicing",
    "proposals",
    "freelance business",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
        inter.variable,
      )}
    >
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
