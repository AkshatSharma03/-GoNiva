import "~/styles/globals.css";

import { type Metadata } from "next";

import { TRPCReactProvider } from "~/trpc/react";
import { Toaster } from "~/components/ui/sonner";

export const metadata: Metadata = {
  title: {
    default: "Goniva — Find Your Perfect Hotel Stay",
    template: "%s | Goniva Hotels",
  },
  description:
    "Search and book hotels worldwide with real-time pricing powered by Amadeus API. Compare rates, amenities, and cancellation policies instantly.",
  keywords: ["hotels", "booking", "travel", "Amadeus", "accommodation"],
  authors: [{ name: "Goniva" }],
  openGraph: {
    type: "website",
    title: "Goniva — Find Your Perfect Hotel Stay",
    description: "Real-time hotel pricing · Worldwide coverage · Instant availability",
    siteName: "Goniva Hotels",
  },
  twitter: {
    card: "summary_large_image",
    title: "Goniva — Find Your Perfect Hotel Stay",
    description: "Real-time hotel pricing · Worldwide coverage · Instant availability",
  },
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <TRPCReactProvider>{children}</TRPCReactProvider>
        <Toaster />
      </body>
    </html>
  );
}
