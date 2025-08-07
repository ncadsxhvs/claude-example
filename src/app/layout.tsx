import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/hooks/useAuth";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  title: "Riley Brown - AI Educator & Content Creator",
  description: "The #1 AI educator with 8.7M likes and 616.8K followers on TikTok. Co-founder of VibeCode, teaching people how to use AI tools to better communicate digitally.",
  keywords: ["AI", "education", "Riley Brown", "VibeCode", "artificial intelligence", "tutorials"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
