"use client";

import { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { MAQUINAS, TURNOS } from '@/lib/constants';
import toast from 'react-hot-toast';
import { Modal } from './Modal';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from './DatePicker';

// Función para formatear un objeto Date a un string YYYY-MM-DD
const formatDateToYYYYMMDD = (date: Date): string => {
  const offset = date.getTimezoneOffset();
  const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
  return adjustedDate.toISOString().split('T')[0];
};

export function ReservationGrid() {
  const { currentUser } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [reservations, setReservations] = useState<{ [key: string]: any }>({});
  const [openReports, setOpenReports] = useState<{ [key: string]: any[] }>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const [notifiedTurns, setNotifiedTurns] = useState<Set<string>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<{ type: 'create' | 'resolve'; data: any } | null>(null);
  const [reportDescription, setReportDescription] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const dateString = formatDateToYYYYMMDD(selectedDate);

      const getReservationsFunction = httpsCallable(functions, 'getReservations');
      const getReportsFunction = httpsCallable(functions, 'getOpenReports');

      try {
        const [reservationsResult, reportsResult] = await Promise.all([
          getReservationsFunction({ date: dateString }),
          getReportsFunction()
        ]);
        setReservations(reservationsResult.data as { [key: string]: any });
        setOpenReports(reportsResult.data as { [key: string]: any[] });
      } catch (error) {
        console.error("Error al obtener datos:", error);
        toast.error("No se pudieron cargar los datos de la grilla.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedDate]);

  useEffect(() => {
    if (!currentUser || Object.keys(reservations).length === 0) return;
    
    const dateString = formatDateToYYYYMMDD(selectedDate);
    const todayString = formatDateToYYYYMMDD(new Date());
    if (dateString !== todayString) return;

    Object.entries(reservations).forEach(([turnoId, reserva]) => {
      if (reserva.dueño === currentUser.uid && reserva.estado === 'confirmado') {
        const [endHourStr] = reserva.hora.split(' - ')[1].split(':');
        const endHour = endHourStr === '00' ? 24 : parseInt(endHourStr);
        if (now.getHours() >= endHour && !notifiedTurns.has(turnoId)) {
          toast.custom(
            (t) => (
              <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-card shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
                <div className="flex-1 w-0 p-4">
                  <p className="font-medium text-card-foreground">⚠️ ¡Tu turno ha finalizado!</p>
                  <p className="mt-1 text-sm text-muted-foreground">Por favor, retira tu ropa de la máquina **{reserva.maquina.replace('-', ' ')}**.</p>
                </div>
                <div className="flex border-l border-border">
                  <button onClick={() => handleCompleteReservation(turnoId, t.id)} className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-primary hover:text-primary/80 focus:outline-none focus:ring-2 focus:ring-ring">
                    Retirar Ropa
                  </button>
                </div>
              </div>
            ),
            { id: turnoId, duration: Infinity }
          );
          setNotifiedTurns(prev => new Set(prev).add(turnoId));
        }
      }
    });
  }, [now, reservations, currentUser, selectedDate, notifiedTurns]);

  const handleReserveClick = async (turno: string, maquinaId: string) => {
    if (!currentUser) {
      toast.error("Debes estar conectado para reservar.");
      return;
    }
    const dateString = formatDateToYYYYMMDD(selectedDate);
    const turnoId = `${dateString}_${turno}_${maquinaId}`;
    setActionLoading(turnoId);
    try {
      const createReservationFunction = httpsCallable(functions, 'createReservation');
      const result = await createReservationFunction({
        date: dateString,
        slot: turno,
        machineId: maquinaId,
      });
      const { success, reserva, id } = result.data as { success: boolean, reserva: any, id: string };
      if (success) {
        setReservations(prev => ({ ...prev, [id]: reserva }));
        toast.success('¡Reserva confirmada!');
      }
    } catch (error: any) {
      console.error("Error al crear la reserva:", error);
      toast.error(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelClick = async (turnoId: string) => {
    if (!currentUser) {
      toast.error("Debes estar conectado para cancelar.");
      return;
    }
    setActionLoading(turnoId);
    const originalReservations = { ...reservations };
    const newReservations = { ...reservations };
    delete newReservations[turnoId];
    setReservations(newReservations);
    try {
      const cancelReservationFunction = httpsCallable(functions, 'cancelReservation');
      await cancelReservationFunction({ turnoId });
      toast.success('Reserva cancelada');
    } catch (error: any) {
      console.error("Error al cancelar la reserva:", error);
      toast.error(error.message);
      setReservations(originalReservations);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCompleteReservation = async (turnoId: string, toastId: string) => {
    setActionLoading(turnoId);
    try {
      const completeReservationFunction = httpsCallable(functions, 'completeReservation');
      await completeReservationFunction({ turnoId });
      setReservations(prev => ({
        ...prev,
        [turnoId]: { ...prev[turnoId], estado: 'finalizado' }
      }));
      toast.dismiss(toastId);
      toast.success("¡Gracias por liberar la máquina!");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setActionLoading(null);
    }
  };
  
  const getMachineStatus = (maquinaId: string) => {
    const dateString = formatDateToYYYYMMDD(selectedDate);
    const todayString = formatDateToYYYYMMDD(new Date());
    if (dateString !== todayString) return 'disponible';
    
    for (const turno of TURNOS) {
      const [startHour] = turno.split(' - ')[0].split(':').map(Number);
      const endHour = startHour + 2;
      if (now.getHours() >= startHour && now.getHours() < endHour) {
        const turnoId = `${dateString}_${turno}_${maquinaId}`;
        return reservations[turnoId] ? 'en-uso' : 'disponible';
      }
    }
    return 'disponible';
  };

  const openReportModal = (maquinaId: string, reports: any[] | undefined) => {
    if (reports && reports.length > 0) {
      setModalContent({ type: 'resolve', data: reports[0] });
    } else {
      setModalContent({ type: 'create', data: { maquinaId } });
    }
    setIsModalOpen(true);
  };

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportDescription.trim()) return;
    const maquinaId = modalContent?.data.maquinaId;
    const toastId = toast.loading('Enviando reporte...');
    try {
      const createReservationFunction = httpsCallable(functions, 'createReport');
      await createReservationFunction({ maquinaId, descripcion: reportDescription });
      toast.success('¡Gracias por tu reporte!', { id: toastId });
    } catch (error: any) {
      toast.error(error.message, { id: toastId });
    } finally {
      setIsModalOpen(false);
      setReportDescription('');
    }
  };

  const handleResolveReport = async () => {
    const reportId = modalContent?.data.id;
    const maquinaId = modalContent?.data.maquinaId;
    const toastId = toast.loading('Actualizando...');
    try {
      const resolveReportFunction = httpsCallable(functions, 'resolveReport');
      await resolveReportFunction({ reportId });
      setOpenReports(prev => ({ ...prev, [maquinaId]: [] }));
      toast.success('¡Reporte resuelto!', { id: toastId });
    } catch (error: any) {
      toast.error('No se pudo resolver el reporte.', { id: toastId });
    } finally {
      setIsModalOpen(false);
    }
  };

  return (
    <>
      <div className="p-4 bg-card rounded-lg shadow-md mt-6 border">
        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground mb-1">Seleccionar Fecha:</label>
          <DatePicker date={selectedDate} setDate={setSelectedDate} />
        </div>

        {loading ? (
          <p className="text-center py-10 text-muted-foreground">Cargando grilla de reservas...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {MAQUINAS.map(maquina => {
              const machineReports = openReports[maquina.id];
              const hasReport = machineReports && machineReports.length > 0;
              const machineStatus = getMachineStatus(maquina.id);
              const dateString = formatDateToYYYYMMDD(selectedDate);
              const todayString = formatDateToYYYYMMDD(new Date());

              return (
                <div key={maquina.id} className="bg-background rounded-lg border">
                  <h3 className="font-bold text-lg text-center p-3 flex justify-center items-center gap-2 text-card-foreground border-b">
                    <span className={`w-3 h-3 rounded-full ${machineStatus === 'en-uso' ? 'bg-red-500' : 'bg-green-500'}`}></span>
                    <span>{maquina.nombre}</span>
                    <button
                      onClick={() => openReportModal(maquina.id, machineReports)}
                      title={hasReport ? `Reporte: ${machineReports[0].descripcion}` : 'Reportar un problema'}
                      className={`text-xl transition-colors ${hasReport ? 'text-red-500 animate-pulse' : 'text-gray-400 hover:text-yellow-500'}`}
                    >
                      ⚠️
                    </button>
                  </h3>
                  <div className="flex flex-col">
                    {TURNOS.map((turno, index) => {
                      const isToday = dateString === todayString;
                      const [startHourStr, endHourStr] = turno.split(' - ');
                      const startHour = parseInt(startHourStr.split(':')[0]);
                      const endHour = endHourStr.split(':')[0] === '00' ? 24 : parseInt(endHourStr.split(':')[0]);
                      const turnoId = `${dateString}_${turno}_${maquina.id}`;
                      const reserva = reservations[turnoId];
                      const estaOcupado = !!reserva;
                      const esMiReserva = currentUser && estaOcupado && reserva.dueño === currentUser.uid;
                      const isLoading = actionLoading === turnoId;
                      const esPasado = isToday && now.getHours() >= endHour;
                      const esPresente = isToday && now.getHours() >= startHour && now.getHours() < endHour;
                      const startOfTurn = new Date(`${dateString}T${startHourStr}`);
                      const gracePeriodEnd = new Date(startOfTurn.getTime() + 15 * 60 * 1000);
                      const canBookLate = now < gracePeriodEnd;
                      
                      let content;
                      let statusText = reserva?.dueñoNombre || "Ocupado";

                      if (reserva && reserva.estado === 'finalizado') {
                        content = <p className="font-semibold h-9 flex items-center justify-center text-sm">Finalizado por Ti</p>;
                      } else if (esPasado) {
                          if (estaOcupado) {
                            content = esMiReserva
                              ? <Button onClick={() => handleCompleteReservation(turnoId, turnoId)} variant="secondary" size="sm" className="w-full h-9 bg-yellow-500 hover:bg-yellow-600 text-secondary-foreground">Retirar Ropa</Button>
                              : <p className="font-semibold h-9 flex items-center justify-center text-sm">Pendiente</p>;
                          } else {
                            content = <p className="font-semibold h-9 flex items-center justify-center text-sm">Finalizado</p>;
                          }
                      } else if (esPresente) {
                        if (estaOcupado) {
                          content = <p className="font-semibold h-9 flex items-center justify-center text-sm">{`En Uso (${reserva.dueñoNombre})`}</p>;
                        } else {
                          if (canBookLate) {
                            content = <Button size="sm" className="w-full h-9" onClick={() => handleReserveClick(turno, maquina.id)} disabled={isLoading}>{isLoading ? '...' : 'Reservar Ahora'}</Button>;
                          } else {
                            content = <p className="font-semibold h-9 flex items-center justify-center text-sm">No disponible</p>;
                          }
                        }
                      } else { // Es futuro
                        if (estaOcupado) {
                          if (esMiReserva) {
                            content = <Button variant="destructive" size="sm" className="w-full h-9" onClick={() => handleCancelClick(turnoId)} disabled={isLoading}>{isLoading ? '...' : 'Cancelar'}</Button>;
                          } else {
                            content = <p className="font-semibold h-9 flex items-center justify-center text-sm">{reserva.dueñoNombre}</p>;
                          }
                        } else {
                          content = <Button size="sm" className="w-full h-9" onClick={() => handleReserveClick(turno, maquina.id)} disabled={isLoading}>{isLoading ? '...' : 'Reservar'}</Button>;
                        }
                      }

                      return (
                        <div key={turnoId} className={`group relative flex items-center h-12 px-3 transition-colors ${index > 0 ? 'border-t' : ''}`}>
                          <span className="font-mono text-xs w-20 text-muted-foreground">{turno}</span>
                          <div className="flex-grow text-sm text-center">
                            {content}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={modalContent?.type === 'create' ? `Reportar Problema` : `Resolver Problema`}>
        {modalContent?.type === 'create' ? (
          <form onSubmit={handleCreateReport} className="space-y-4">
            <Textarea
              value={reportDescription}
              onChange={(e) => setReportDescription(e.target.value)}
              placeholder="Describe el problema con detalle..."
              required
            />
            <div className="flex justify-end">
              <Button type="submit">Enviar Reporte</Button>
            </div>
          </form>
        ) : (
          <div>
            <p className="mb-4 text-sm text-muted-foreground">Reporte actual: "{modalContent?.data.descripcion}"</p>
            <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button onClick={handleResolveReport}>Marcar como Resuelto</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}