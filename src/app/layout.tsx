import "~/styles/globals.css";

import { type Metadata } from "next";

import { TRPCReactProvider } from "~/trpc/react";
import { Toaster } from "~/components/ui/sonner";

export const metadata: Metadata = {
  title: {
    default: "GoNiva — Find Your Somewhere",
    template: "%s | GoNiva",
  },
  description:
    "Your personal travel space. Plan with Niva, discover stays, compare favorites, and make every day of your trip your own.",
  keywords: ["hotels", "booking", "travel", "Amadeus", "accommodation"],
  authors: [{ name: "Goniva" }],
  openGraph: {
    type: "website",
    title: "GoNiva — Find Your Somewhere",
    description:
      "Thoughtful stays. Your kind of days. Plan your next adventure with GoNiva.",
    siteName: "Goniva Hotels",
  },
  twitter: {
    card: "summary_large_image",
    title: "GoNiva — Find Your Somewhere",
    description:
      "Thoughtful stays. Your kind of days. Plan your next adventure with GoNiva.",
  },
  icons: [{ rel: "icon", url: "/icon.svg" }],
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
