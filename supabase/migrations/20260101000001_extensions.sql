-- Nido · 0001 · Extensiones
-- pgcrypto aporta gen_random_uuid(); Supabase ya la trae disponible.

create extension if not exists pgcrypto;
