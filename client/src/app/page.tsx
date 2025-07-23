"use client";

import { useAuth } from "@/context/AuthContext";
import { ReservationGrid } from "@/components/ReservationGrid";
import { ProfileSetup } from "@/components/ProfileSetup";
import { Announcements } from "@/components/Announcements";
import { ThemeToggleButton } from '@/components/ThemeToggleButton'; // <-- LA LÍNEA QUE FALTABA

export default function HomePage() {
  const { userProfile, loading } = useAuth();

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p>Cargando...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-6 md:p-12 bg-gray-100 dark:bg-gray-950 text-gray-800 dark:text-gray-200">
      <div className="w-full max-w-7xl">
        <div className="flex justify-center items-center relative mb-4">
          <h1 className="text-4xl font-bold text-center">Reservas Laundry | San Juan 2024</h1>
          <div className="absolute right-0">
            <ThemeToggleButton />
          </div>
        </div>
        
        <Announcements />
        {userProfile ? <ReservationGrid /> : <ProfileSetup />}
      </div>
    </main>
  );
}