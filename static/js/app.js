/* ============================================================
   BioPAE — Panel Administrativo
   Compatible con la sesión de FastAPI
   ============================================================ */

const COLORS = {
  primary: "#1F5D50",
  primaryDark: "#14403A",
  accent: "#E3A008",
  danger: "#B3401F",
  success: "#2F7A4F",
  border: "#E1E4DB",
  muted: "#5B6B67",
};

const CAPACIDAD = {
  vaso_leche: 200,
  almuerzo: 100,
};

const PROGRAMA_LABEL = {
  vaso_leche: "Vaso de leche",
  almuerzo: "Almuerzo",
};

const REGISTRADO_POR = "aux. Carlos Calvito";

const GRADOS = [6, 7, 8, 9, 10, 11];
const SUBGRUPOS = [1, 2, 3, 4, 5, 6];
const GRUPOS = GRADOS.flatMap((g) =>
  SUBGRUPOS.map((s) => `${g}°${s}`)
);

const NOMBRES_PILA = [
  "Mariana", "Samuel", "Isabella", "Juan Pablo", "Valentina",
  "Santiago", "Salomé", "Emmanuel", "Luciana", "Tomás",
  "Antonella", "Jerónimo", "Gabriela", "Simón", "Sara",
  "Mateo", "Emily", "David", "Sofía", "Nicolás", "Camila",
  "Julián", "Manuela", "Andrés", "Esteban", "Renata",
  "Miguel Ángel", "Paulina", "Kevin", "Laura Valentina",
  "Sebastián", "Dulce María", "Alejandro", "Martina",
  "Cristian", "Ximena", "Brayan", "Yulieth", "Óscar",
  "Danna Sofía", "Felipe", "Ashley", "Ronaldo", "Melissa",
  "Johan", "Katherine", "Deiber", "Natalia", "Yeison",
  "Luisa Fernanda",
];

const APELLIDOS = [
  "Gómez", "Restrepo", "Ríos", "Vélez", "Ospina",
  "Ceballos", "Duque", "Zapata", "Hoyos", "Betancur",
  "Correa", "Arango", "Marín", "Uribe", "Londoño",
  "Cardona", "Palacio", "Montoya", "Giraldo", "Álvarez",
  "Ramírez", "Pérez", "Serna", "Muñoz", "Vargas",
  "Franco", "Suárez", "Toro", "Escobar", "Osorio",
  "Roldán", "Puerta", "Quintero
