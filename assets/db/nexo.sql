-- Base de datos de Nexo (SQLite / libSQL, compatible con Turso)
PRAGMA foreign_keys = ON;

CREATE TABLE materia (
  id_materia TEXT PRIMARY KEY,
  nombre     TEXT NOT NULL,
  creditos   INTEGER NOT NULL CHECK (creditos BETWEEN 1 AND 20)
);

CREATE TABLE evaluacion (
  id_evaluacion TEXT PRIMARY KEY,
  id_materia    TEXT NOT NULL REFERENCES materia(id_materia) ON DELETE CASCADE,
  nombre        TEXT NOT NULL,
  peso          REAL NOT NULL CHECK (peso BETWEEN 0 AND 100),
  calificacion  REAL CHECK (calificacion IS NULL OR calificacion BETWEEN 0 AND 100)
);

CREATE TABLE clase (
  id_clase   TEXT PRIMARY KEY,
  id_materia TEXT REFERENCES materia(id_materia) ON DELETE SET NULL,
  codigo     TEXT,
  docente    TEXT,
  aula       TEXT,
  dia        INTEGER NOT NULL CHECK (dia BETWEEN 0 AND 6),
  inicio     TEXT NOT NULL,
  fin        TEXT NOT NULL,
  color      TEXT
);

CREATE TABLE carpeta (
  id_carpeta INTEGER PRIMARY KEY AUTOINCREMENT,
  id_materia TEXT REFERENCES materia(id_materia) ON DELETE SET NULL,
  ruta       TEXT NOT NULL
);

CREATE TABLE archivo (
  id_archivo INTEGER PRIMARY KEY AUTOINCREMENT,
  id_carpeta INTEGER NOT NULL REFERENCES carpeta(id_carpeta) ON DELETE CASCADE,
  nombre     TEXT NOT NULL,
  modificado TEXT
);

CREATE TABLE evento (
  id_evento TEXT PRIMARY KEY,
  titulo    TEXT NOT NULL,
  categoria TEXT,
  fecha     TEXT NOT NULL,
  hora      TEXT,
  color     TEXT,
  nota      TEXT,
  avisar    INTEGER DEFAULT 0,
  repetir   TEXT DEFAULT 'no' CHECK (repetir IN ('no', 'semanal', 'mensual'))
);

CREATE TABLE cumpleanos (
  id_amigo TEXT PRIMARY KEY,
  nombre   TEXT NOT NULL,
  dia      INTEGER NOT NULL CHECK (dia BETWEEN 1 AND 31),
  mes      INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  anio     INTEGER,
  color    TEXT,
  avisar   INTEGER DEFAULT 0
);

CREATE TABLE nota (
  id_nota TEXT PRIMARY KEY,
  texto   TEXT NOT NULL CHECK (length(texto) <= 200),
  hecha   INTEGER DEFAULT 0
);

CREATE TABLE canal (
  id_canal    TEXT PRIMARY KEY,
  nombre      TEXT NOT NULL,
  avatar      TEXT,
  tipo        TEXT CHECK (tipo IN ('canal', 'lista')),
  agregado_en TEXT
);

CREATE TABLE perfil (
  id_perfil INTEGER PRIMARY KEY,
  nombre    TEXT,
  foto      BLOB
);

-- Datos de ejemplo
INSERT INTO materia VALUES
  ('ARQ', 'Arquitectura de Computadoras', 5),
  ('BD',  'Taller de Bases de Datos', 4),
  ('INV', 'Fundamentos de Investigación', 4),
  ('CAL', 'Cálculo Diferencial', 5);

INSERT INTO evaluacion VALUES
  ('e1', 'ARQ', 'Examen unidad 1', 30, 88),
  ('e2', 'ARQ', 'Proyecto integrador', 40, 92),
  ('e3', 'ARQ', 'Tareas', 30, NULL),
  ('e4', 'BD',  'Práctica 1', 20, 100),
  ('e5', 'BD',  'Práctica 2', 20, 90),
  ('e6', 'BD',  'Proyecto integrador', 60, NULL),
  ('e7', 'INV', 'Anteproyecto', 50, 85),
  ('e8', 'INV', 'Exposición', 50, 78),
  ('e9', 'CAL', 'Examen parcial', 60, 65),
  ('e10','CAL', 'Tareas', 40, 90);

INSERT INTO clase VALUES
  ('c1', 'CAL', 'ACF-0901', 'Dra. Ríos', 'A-12', 0, '08:00', '09:40', '#4f6bed'),
  ('c2', 'ARQ', 'SCD-1003', 'Mtro. Vega', 'Lab 3', 0, '10:00', '11:40', '#10b981'),
  ('c3', 'BD',  'SCA-1025', 'Mtro. Salas', 'Lab 1', 1, '08:00', '10:30', '#f59e0b'),
  ('c4', 'INV', 'ACC-0906', 'Dra. Montes', 'B-4', 2, '11:00', '12:40', '#ef4444'),
  ('c5', 'CAL', 'ACF-0901', 'Dra. Ríos', 'A-12', 2, '08:00', '09:40', '#4f6bed');

INSERT INTO carpeta (id_materia, ruta) VALUES
  ('ARQ', 'C:/Nexo/Tareas/Arquitectura'),
  ('BD',  'C:/Nexo/Tareas/Bases de Datos'),
  ('INV', 'C:/Nexo/Tareas/Investigación');

INSERT INTO archivo (id_carpeta, nombre, modificado) VALUES
  (1, 'Avance1_PI_Arquitectura_Nexo.pdf', '2026-10-26'),
  (1, 'Avance2_PI_Arquitectura_Nexo.pdf', '2026-11-05'),
  (2, 'Avance2_PI_BasesDatos_Nexo.pdf',   '2026-10-26'),
  (3, 'Avance1_Fundamentos_Investigacion_Nexo.pdf', '2026-10-25');

INSERT INTO evento VALUES
  ('ev1', 'Entrega 2do avance Arquitectura', 'tarea',  '2026-11-17', '23:00', '#ef4444', NULL, 1, 'no'),
  ('ev2', 'Examen de Cálculo',               'examen', '2026-11-12', '08:00', '#4f6bed', 'Unidad 3', 1, 'no'),
  ('ev3', 'Práctica 3 Bases de Datos',       'tarea',  '2026-11-10', '23:59', '#f59e0b', 'Turso o SQLite', 1, 'no'),
  ('ev4', 'Junta de equipo',                 'otro',   '2026-11-06', '16:00', '#10b981', NULL, 0, 'semanal');

INSERT INTO cumpleanos VALUES
  ('a1', 'Ana',  14, 11, 2005, '#ec4899', 1),
  ('a2', 'Luis',  2, 12, NULL, '#4f6bed', 1);

INSERT INTO nota VALUES
  ('n1', 'Comprar tinta para la impresora', 0),
  ('n2', 'Subir práctica a Moodle', 1);

INSERT INTO canal VALUES
  ('UC001', 'QuantumFracture', NULL, 'canal', '2026-10-01'),
  ('PL001', 'Música para estudiar', NULL, 'lista', '2026-10-15');

INSERT INTO perfil (id_perfil, nombre) VALUES (1, 'Fidel Sebastián');
