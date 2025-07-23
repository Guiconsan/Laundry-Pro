"use client";

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import toast from 'react-hot-toast';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DEPARTAMENTOS_VALIDOS = ['A', 'B', 'B1', 'B2', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

const capitalize = (s: string) => {
  if (typeof s !== 'string' || s.length === 0) return '';
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
};

export function ProfileSetup() {
  const { refetchProfile } = useAuth();
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [piso, setPiso] = useState('');
  const [letraDepto, setLetraDepto] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!letraDepto) {
      toast.error('Por favor, selecciona un departamento.');
      return;
    }
    setIsLoading(true);

    const nombreFormateado = capitalize(nombre.trim());
    const apellidoFormateado = capitalize(apellido.trim());
    const nombreCompleto = `${nombreFormateado} ${apellidoFormateado}`;
    const deptoCompleto = `${piso}${letraDepto}`;

    const setUserProfileFunction = httpsCallable(functions, 'setUserProfile');
    try {
      await setUserProfileFunction({ nombreCompleto: nombreCompleto, depto: deptoCompleto });
      toast.success("¡Perfil guardado!");
      refetchProfile();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto mt-10 p-6 bg-card rounded-lg shadow-md border">
      <h2 className="text-2xl font-bold text-center mb-4 text-card-foreground">Completa tu Perfil</h2>
      <p className="text-center text-muted-foreground mb-6">Necesitamos tus datos para poder usar el sistema de reservas.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="nombre" className="block text-sm font-medium mb-1">Nombre</label>
            <Input type="text" id="nombre" value={nombre} onChange={e => setNombre(e.target.value)} required placeholder="Ej: Guido" />
          </div>
          <div>
            <label htmlFor="apellido" className="block text-sm font-medium mb-1">Apellido</label>
            <Input type="text" id="apellido" value={apellido} onChange={e => setApellido(e.target.value)} required placeholder="Ej: Compa" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="piso" className="block text-sm font-medium mb-1">Piso</label>
            <Input type="number" id="piso" value={piso} onChange={e => setPiso(e.target.value)} required min="1" max="14" placeholder="Ej: 4" />
          </div>
          <div>
            <label htmlFor="depto" className="block text-sm font-medium mb-1">Departamento</label>
            <Select onValueChange={setLetraDepto} required>
              <SelectTrigger>
                <SelectValue placeholder="Letra" />
              </SelectTrigger>
              <SelectContent>
                {DEPARTAMENTOS_VALIDOS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? 'Guardando...' : 'Guardar y Continuar'}
        </Button>
      </form>
    </div>
  );
}