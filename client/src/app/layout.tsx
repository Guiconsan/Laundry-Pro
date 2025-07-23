import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; // <-- ESTA LÍNEA ES LA CAUSA DEL PROBLEMA
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Lavandería San Juan",
  description: "Sistema de reservas de lavandería",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <Toaster position="bottom-center" />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}