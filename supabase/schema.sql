-- FitAnalytics Database Schema and RLS Security Policies
-- Last Updated: 2026-05-20
-- 
-- Description:
-- This script initializes the database tables (workouts, nutrition, profiles)
-- and configures Row Level Security (RLS) policies for multi-tenant isolation using Supabase Auth.
-- It also includes idempotent migration steps to safely upgrade old tables.

-- ==========================================
-- 1. MIGRACIÓN / UPGRADE PASO A PASO (IDEMPOTENTE)
-- ==========================================

-- Si la tabla workouts ya existía con clave primaria simple (id) de versiones previas,
-- la convertimos a clave compuesta (id, user_id) para evitar colisiones entre usuarios
-- y agregamos la columna de telemetría GPS gpx_data.
DO $$
BEGIN
    -- 1. Agregar columna user_id si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workouts' AND column_name = 'user_id') THEN
        ALTER TABLE workouts ADD COLUMN user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
    END IF;

    -- 2. Eliminar registros huérfanos sin usuario antes de aplicar restricciones NOT NULL
    DELETE FROM workouts WHERE user_id IS NULL;

    -- 3. Hacer user_id NOT NULL
    ALTER TABLE workouts ALTER COLUMN user_id SET NOT NULL;

    -- 4. Agregar columna gpx_data si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workouts' AND column_name = 'gpx_data') THEN
        ALTER TABLE workouts ADD COLUMN gpx_data JSONB;
    END IF;

    -- 4.1 Agregar columna advanced_metrics si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workouts' AND column_name = 'advanced_metrics') THEN
        ALTER TABLE workouts ADD COLUMN advanced_metrics JSONB;
    END IF;

    -- 5. Convertir la clave primaria de (id) a (id, user_id) compuesta
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'workouts' AND constraint_type = 'PRIMARY KEY' AND constraint_name = 'workouts_pkey'
    ) THEN
        -- Verificar si la PK actual es solo la columna 'id' (antigua)
        IF (
            SELECT COUNT(*) 
            FROM information_schema.key_column_usage 
            WHERE table_name = 'workouts' AND constraint_name = 'workouts_pkey'
        ) = 1 THEN
            ALTER TABLE workouts DROP CONSTRAINT workouts_pkey;
            ALTER TABLE workouts ADD CONSTRAINT workouts_pkey PRIMARY KEY (id, user_id);
        END IF;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Aviso en migración de entrenamientos: %', SQLERRM;
END $$;


-- ==========================================
-- 2. CREACIÓN DE TABLAS (SI NO EXISTEN)
-- ==========================================

-- A. Tabla de Entrenamientos (Cardio & Fuerza)
CREATE TABLE IF NOT EXISTS workouts (
  id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid() NOT NULL,
  type TEXT NOT NULL,
  date TEXT NOT NULL,
  distance NUMERIC,
  duration TEXT,
  terrain TEXT,
  "heartRate" INTEGER,
  rpe INTEGER,
  notes TEXT,
  "muscleGroup" TEXT,
  "sessionName" TEXT,
  exercises JSONB,
  gpx_data JSONB,
  advanced_metrics JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (id, user_id)
);

-- B. Tabla de Nutrición (Comidas y Macros)
CREATE TABLE IF NOT EXISTS nutrition (
  id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid() NOT NULL,
  date TEXT NOT NULL,
  calories INTEGER NOT NULL,
  protein INTEGER NOT NULL,
  carbs INTEGER NOT NULL,
  fat INTEGER NOT NULL,
  meals JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (id, user_id)
);

-- C. Tabla de Perfil Deportivo de Atleta
CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  age INTEGER NOT NULL DEFAULT 25,
  weight NUMERIC NOT NULL DEFAULT 75,
  height NUMERIC NOT NULL DEFAULT 175,
  "restingHR" INTEGER NOT NULL DEFAULT 60,
  gender TEXT NOT NULL DEFAULT 'male',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (user_id)
);


-- ==========================================
-- 3. HABILITAR SEGURIDAD A NIVEL DE FILA (RLS)
-- ==========================================
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;


-- ==========================================
-- 4. POLÍTICAS DE AISLAMIENTO MULTI-INQUILINO
-- ==========================================

-- Limpiar políticas antiguas si existen para evitar conflictos en re-ejecución
DROP POLICY IF EXISTS "Permitir lectura y escritura publica" ON workouts;
DROP POLICY IF EXISTS "Usuarios pueden ver sus propios entrenamientos" ON workouts;
DROP POLICY IF EXISTS "Usuarios pueden insertar sus propios entrenamientos" ON workouts;
DROP POLICY IF EXISTS "Usuarios pueden actualizar sus propios entrenamientos" ON workouts;
DROP POLICY IF EXISTS "Usuarios pueden borrar sus propios entrenamientos" ON workouts;

DROP POLICY IF EXISTS "Usuarios pueden ver su propia nutricion" ON nutrition;
DROP POLICY IF EXISTS "Usuarios pueden insertar su propia nutricion" ON nutrition;
DROP POLICY IF EXISTS "Usuarios pueden actualizar su propia nutricion" ON nutrition;
DROP POLICY IF EXISTS "Usuarios pueden borrar su propia nutricion" ON nutrition;

DROP POLICY IF EXISTS "Usuarios pueden ver su propio perfil" ON profiles;
DROP POLICY IF EXISTS "Usuarios pueden insertar su propio perfil" ON profiles;
DROP POLICY IF EXISTS "Usuarios pueden actualizar su propio perfil" ON profiles;


-- --- POLÍTICAS PARA WORKOUTS ---
CREATE POLICY "Usuarios pueden ver sus propios entrenamientos" 
  ON workouts FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden insertar sus propios entrenamientos" 
  ON workouts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden actualizar sus propios entrenamientos" 
  ON workouts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden borrar sus propios entrenamientos" 
  ON workouts FOR DELETE USING (auth.uid() = user_id);


-- --- POLÍTICAS PARA NUTRITION ---
CREATE POLICY "Usuarios pueden ver su propia nutricion" 
  ON nutrition FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden insertar su propia nutricion" 
  ON nutrition FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden actualizar su propia nutricion" 
  ON nutrition FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden borrar su propia nutricion" 
  ON nutrition FOR DELETE USING (auth.uid() = user_id);


-- --- POLÍTICAS PARA PROFILES ---
CREATE POLICY "Usuarios pueden ver su propio perfil" 
  ON profiles FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden insertar su propio perfil" 
  ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden actualizar su propio perfil" 
  ON profiles FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- ==========================================
-- 5. NUEVAS TABLAS DE RENDIMIENTO Y CONTROL (SHOE TRACKER, PLANNER, READINESS)
-- ==========================================

-- D. Tabla de Zapatillas (Shoe Tracker)
CREATE TABLE IF NOT EXISTS shoes (
  id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid() NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  initial_km NUMERIC DEFAULT 0 NOT NULL,
  max_km INTEGER NOT NULL DEFAULT 800,
  buy_date TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (id, user_id)
);

-- E. Tabla de Planes de Entrenamiento (Training Planner)
CREATE TABLE IF NOT EXISTS training_plans (
  date TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid() NOT NULL,
  distance NUMERIC DEFAULT 0 NOT NULL,
  session_type TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (date, user_id)
);

-- F. Tabla de Registro de Disposición (Readiness logs)
CREATE TABLE IF NOT EXISTS readiness_logs (
  date TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid() NOT NULL,
  sleep INTEGER NOT NULL,
  soreness INTEGER NOT NULL,
  resting_hr INTEGER NOT NULL,
  hrv INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (date, user_id)
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE shoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE readiness_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de aislamiento multi-inquilino
DROP POLICY IF EXISTS "Usuarios pueden gestionar sus propias zapatillas" ON shoes;
CREATE POLICY "Usuarios pueden gestionar sus propias zapatillas" ON shoes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuarios pueden gestionar sus propios planes" ON training_plans;
CREATE POLICY "Usuarios pueden gestionar sus propios planes" ON training_plans
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuarios pueden gestionar su propio readiness" ON readiness_logs;
CREATE POLICY "Usuarios pueden gestionar su propio readiness" ON readiness_logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
