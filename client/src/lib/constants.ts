// client/src/lib/constants.ts
export const MAQUINAS = [
  { id: 'lavarropas-1', nombre: 'Lavarropas 1', tipo: 'lavarropas' },
  { id: 'lavarropas-2', nombre: 'Lavarropas 2', tipo: 'lavarropas' },
  { id: 'secadora-1', nombre: 'Secadora 1', tipo: 'secadora' },
  { id: 'secadora-2', nombre: 'Secadora 2', tipo: 'secadora' },
];

export const TURNOS = Array.from({ length: 12 }, (_, i) => {
  const horaInicio = (i * 2).toString().padStart(2, '0');
  const horaFin = ((i * 2) + 2);
  const horaFinStr = (horaFin === 24 ? '00' : horaFin.toString().padStart(2, '0'));
  return `${horaInicio}:00 - ${horaFinStr}:00`;
});