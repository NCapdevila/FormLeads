import type { Metadata } from "next";
import { Urbanist } from "next/font/google";
import "./globals.css";
import RecaptchaProvider from "@/components/RecaptchaProvider"; // ✅

const urbanist = Urbanist({
  subsets: ["latin"],
  variable: "--font-urbanist",
});

export const metadata: Metadata = {
  title: "Form Leads - CEBrokers",
  description: "Formulario de carga de leads",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${urbanist.variable} antialiased`}>
        <RecaptchaProvider>
          {children}
        </RecaptchaProvider>
      </body>
    </html>
  );
}