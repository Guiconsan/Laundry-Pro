// functions/src/index.ts

import { onCall } from "firebase-functions/v2/https"; // <-- ESTA LÍNEA ES LA CLAVE PARA TODAS LAS FUNCIONES
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";

// Inicializar Firebase Admin SDK una sola vez
initializeApp();
const db = getFirestore();

// --- FUNCIÓN PARA OBTENER ANUNCIOS ---
export const getAnnouncements = onCall(async (request) => {
  // ... (código sin cambios)
  logger.info("Solicitud para obtener anuncios recibida");
  try {
    const announcementsRef = db.collection("anuncios");
    const snapshot = await announcementsRef.orderBy("creado", "desc").limit(20).get();

    if (snapshot.empty) {
      return { data: [] };
    }

    const announcements = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        titulo: data.titulo,
        texto: data.texto,
        creado: data.creado.toDate().toISOString(),
      };
    });
    return { data: announcements };
  } catch (error) {
    logger.error("Error al obtener anuncios:", error);
    throw new Error("No se pudieron obtener los anuncios.");
  }
});

// --- FUNCIÓN PARA OBTENER RESERVAS ---
export const getReservations = onCall(async (request) => {
  // ... (código sin cambios)
  const { date } = request.data;
  if (!date) {
    logger.error("Error: La fecha es obligatoria para obtener reservas.");
    throw new Error("La fecha es obligatoria.");
  }

  logger.info(`Buscando reservas para la fecha: ${date}`);
  try {
    const reservationsRef = db.collection("reservas");
    const snapshot = await reservationsRef.where("fecha", "==", date).get();

    if (snapshot.empty) {
      return {};
    }

    const reservationsMap: { [key: string]: any } = {};
    snapshot.docs.forEach(doc => {
      reservationsMap[doc.id] = doc.data();
    });

    return reservationsMap;
  } catch (error) {
    logger.error(`Error al obtener reservas para la fecha ${date}:`, error);
    throw new Error("No se pudieron obtener las reservas.");
  }
});
// --- FUNCIÓN PARA CREAR O ACTUALIZAR UN PERFIL DE USUARIO ---
export const setUserProfile = onCall(async (request) => {
  if (!request.auth) {
    throw new Error("El usuario no está autenticado.");
  }
  const uid = request.auth.uid;
  const { nombreCompleto, depto } = request.data;

  if (!nombreCompleto || !depto) {
    throw new Error("El nombre y el departamento son obligatorios.");
  }

  const userProfile = { nombreCompleto, depto };
  await db.collection("usuarios").doc(uid).set(userProfile, { merge: true });

  logger.info(`Perfil de usuario ${uid} actualizado:`, userProfile);
  return { success: true, data: userProfile };
});
// --- FUNCIÓN PARA CREAR UNA RESERVA ---
export const createReservation = onCall(async (request) => {
  if (!request.auth) {
    throw new Error("El usuario no está autenticado.");
  }
  const uid = request.auth.uid;
  const { date, slot, machineId } = request.data;

  // Paso extra: Obtenemos el perfil del usuario para guardarlo en la reserva
  const userProfileSnap = await db.collection("usuarios").doc(uid).get();
  if (!userProfileSnap.exists) {
    throw new Error("El perfil de usuario no está completo. Por favor, actualiza tus datos.");
  }
  const userProfile = userProfileSnap.data();

  // ... (validación de turno ocupado sin cambios) ...
  const turnoId = `${date}_${slot}_${machineId}`;
  const reservationRef = db.collection("reservas").doc(turnoId);
  const doc = await reservationRef.get();
  if (doc.exists) {
    throw new Error("Este turno ya ha sido reservado por otra persona.");
  }

  const nuevaReserva = {
    fecha: date,
    hora: slot,
    maquina: machineId,
    dueño: uid,
    dueñoNombre: userProfile?.nombreCompleto || "Anónimo", // <-- Dato desnormalizado
    creado: new Date(),
    estado: 'confirmado',
  };

  await reservationRef.set(nuevaReserva);

  logger.info(`Reserva creada con éxito por ${uid} para el turno ${turnoId}`);
  return { success: true, reserva: nuevaReserva, id: turnoId };
});
// --- FUNCIÓN PARA CANCELAR UNA RESERVA ---
export const cancelReservation = onCall(async (request) => {
  // 1. Verificar autenticación
  if (!request.auth) {
    throw new Error("El usuario no está autenticado.");
  }
  const uid = request.auth.uid;
  const { turnoId } = request.data; // Recibimos el ID completo del turno

  if (!turnoId) {
    throw new Error("Falta el ID del turno para cancelar.");
  }

  const reservationRef = db.collection("reservas").doc(turnoId);
  const doc = await reservationRef.get();

  // 2. Verificar que la reserva exista
  if (!doc.exists) {
    throw new Error("Esta reserva no existe o ya fue cancelada.");
  }

  // 3. ¡Crucial! Verificar que el usuario es el dueño de la reserva
  if (doc.data()?.dueño !== uid) {
    logger.error(`Intento de cancelación no autorizado por ${uid} en el turno ${turnoId}`);
    throw new Error("No tienes permiso para cancelar esta reserva.");
  }

  // 4. Si todo está bien, borrar el documento
  await reservationRef.delete();

  logger.info(`Reserva ${turnoId} cancelada con éxito por ${uid}`);
  return { success: true, message: "Reserva cancelada." };
});
// --- FUNCIÓN PARA OBTENER REPORTES ABIERTOS ---
export const getOpenReports = onCall(async (request) => {
  try {
    const reportsRef = db.collection("reportes");
    const snapshot = await reportsRef.where("resuelto", "==", false).get();

    const reports: { [key: string]: any } = {};
    snapshot.forEach(doc => {
        // Agrupamos los reportes por machineId para fácil acceso en el frontend
        const data = doc.data();
        if (!reports[data.maquinaId]) {
            reports[data.maquinaId] = [];
        }
        reports[data.maquinaId].push({ id: doc.id, ...data });
    });

    return reports;
  } catch (error) {
    logger.error("Error al obtener reportes:", error);
    throw new Error("No se pudieron obtener los reportes.");
  }
});

// --- FUNCIÓN PARA CREAR UN REPORTE ---
export const createReport = onCall(async (request) => {
  if (!request.auth) {
    throw new Error("El usuario no está autenticado.");
  }
  const uid = request.auth.uid;
  const { maquinaId, descripcion } = request.data;

  if (!maquinaId || !descripcion) {
    throw new Error("Faltan parámetros para crear el reporte.");
  }

  const userProfileSnap = await db.collection("usuarios").doc(uid).get();
  if (!userProfileSnap.exists) {
    throw new Error("El perfil de usuario no está completo.");
  }

  const nuevoReporte = {
    maquinaId,
    descripcion,
    resuelto: false,
    creadoPorUid: uid,
    creadoPorNombre: userProfileSnap.data()?.nombreCompleto || "Anónimo",
    fechaCreacion: new Date(),
  };

  const reportRef = await db.collection("reportes").add(nuevoReporte);

  logger.info(`Reporte ${reportRef.id} creado por ${uid} para la máquina ${maquinaId}`);
  return { success: true, reportId: reportRef.id };
});

// --- FUNCIÓN PARA RESOLVER UN REPORTE ---
export const resolveReport = onCall(async (request) => {
  // ARQUITECTURA: Aquí debería haber una validación para asegurar que solo un
  // administrador pueda ejecutar esta acción. Esto se implementaría con Custom Claims.
  if (!request.auth) {
    throw new Error("El usuario no está autenticado.");
  }
  const { reportId } = request.data;
  if (!reportId) {
    throw new Error("Falta el ID del reporte a resolver.");
  }

  await db.collection("reportes").doc(reportId).update({ resuelto: true });

  logger.info(`Reporte ${reportId} marcado como resuelto.`);
  return { success: true };
});
// --- FUNCIÓN PARA MARCAR UNA RESERVA COMO FINALIZADA ---
export const completeReservation = onCall(async (request) => {
  if (!request.auth) {
    throw new Error("El usuario no está autenticado.");
  }
  const uid = request.auth.uid;
  const { turnoId } = request.data;

  if (!turnoId) {
    throw new Error("Falta el ID del turno para completar.");
  }

  const reservationRef = db.collection("reservas").doc(turnoId);
  const doc = await reservationRef.get();

  if (!doc.exists) {
    throw new Error("Esta reserva no existe.");
  }

  if (doc.data()?.dueño !== uid) {
    throw new Error("No tienes permiso para modificar esta reserva.");
  }

  // Actualizamos el estado de la reserva
  await reservationRef.update({ estado: "finalizado" });

  logger.info(`Reserva ${turnoId} marcada como finalizada por ${uid}`);
  return { success: true, message: "Reserva finalizada." };
});