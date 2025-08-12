import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/hooks/useAuth";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  title: "Dong Chen - Senior Product Manager & Data Engineering Manager",
  description: "Senior Product Manager & Data Engineering Manager with 5+ years of experience in healthcare technology and AI-driven product development. Expert in building scalable data platforms and leading cross-functional teams.",
  keywords: ["Product Management", "Data Engineering", "Dong Chen", "Healthcare Technology", "AI Solutions", "Data Platforms"],
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
