import type { Metadata, Viewport } from "next";
import { Inter, Bricolage_Grotesque } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerk-appearance";
import "./globals.css";

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// Display font for feature headings.
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TradeNotti",
  description: "Trading journal — Today",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Dark is the app's only theme — set server-side so there's no flash and no
  // client script needed.
  const tree = (
    <html
      lang="en"
      data-theme="dark"
      className={`${inter.variable} ${bricolage.variable}`}
    >
      <body>{children}</body>
    </html>
  );

  // Only mount ClerkProvider when configured, so builds without Clerk keys
  // still compile and run.
  return clerkEnabled ? (
    <ClerkProvider
      signInUrl="/login"
      signUpUrl="/signup"
      afterSignOutUrl="/login"
      appearance={clerkAppearance}
    >
      {tree}
    </ClerkProvider>
  ) : (
    tree
  );
}
