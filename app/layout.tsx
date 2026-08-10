import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}