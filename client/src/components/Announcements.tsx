// client/components/Announcements.tsx
"use client";

import { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import toast from 'react-hot-toast';

type Announcement = {
  id: string;
  titulo: string;
  texto: string;
  creado: string;
};

export function Announcements() {
  const [latestAnnouncement, setLatestAnnouncement] = useState<Announcement | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      const getAnnouncementsFunction = httpsCallable(functions, 'getAnnouncements');
      try {
        const result = await getAnnouncementsFunction();
        const data = result.data as { data: Announcement[] };
        // Nos quedamos solo con el anuncio más reciente (vienen ordenados del backend)
        if (data.data && data.data.length > 0) {
          setLatestAnnouncement(data.data[0]);
        }
      } catch (error) {
        console.error("Error al obtener anuncios:", error);
        // No mostramos un toast de error para no ser intrusivos si solo falla este componente
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnnouncements();
  }, []);

  // Si está cargando o no hay anuncios, no renderizamos nada para no ocupar espacio
  if (isLoading || !latestAnnouncement) {
    return null; 
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 mb-6 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-md shadow">
      <h4 className="font-bold">Anuncio Importante: {latestAnnouncement.titulo}</h4>
      <p className="mt-1">{latestAnnouncement.texto}</p>
    </div>
  );
}