import { initializeApp, getApps } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

// Tu configuración de Firebase del proyecto en la web
// Ve a tu Proyecto -> Configuración del proyecto -> Tus apps -> SDK de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDPhwayltG_FtxPBgNKoimpaaYjfkbG_eI",
  authDomain: "laundry-san-juan-2024.firebaseapp.com",
  projectId: "laundry-san-juan-2024",
  storageBucket: "laundry-san-juan-2024.firebasestorage.app",
  messagingSenderId: "769015378298",
  appId: "1:769015378298:web:07277aa2c69524f9fee6c3",
  measurementId: "G-WQTZFYNY1B"
};

// Inicializar Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

const db = getFirestore(app);
const functions = getFunctions(app);

// Conectar a los EMULADORES solo en entorno de DESARROLLO
if (process.env.NODE_ENV === "development") {
  console.log("Entorno de desarrollo: Conectando a los Emuladores de Firebase...");
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectFunctionsEmulator(functions, 'localhost', 5001);
    console.log("Conectado a Firestore y Functions emulators.");
  } catch (error) {
    console.error("Error conectando a los emuladores:", error);
  }
}

export { app, db, functions };