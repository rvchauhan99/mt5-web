import type { Metadata } from "next";
import "./globals.css";
import { BRANDING } from "@/lib/constants/branding";

export const metadata: Metadata = {
  title: BRANDING.adminTitle,
  description: BRANDING.adminDescription,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
