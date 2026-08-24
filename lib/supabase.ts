"use client";

import { createClient } from "@supabase/supabase-js";

// Siempre la anon key. La service role key ignora RLS y es exclusiva del bot:
// no entra al front bajo ningún concepto.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigurado = Boolean(url && anonKey);

// Si faltan las env vars usamos placeholders: createClient tira si recibe
// strings vacíos, y no queremos que el form de leads se caiga por eso.
// Quien manda para la UI es `supabaseConfigurado`.
export const supabase = createClient(
  url || "https://sin-configurar.supabase.co",
  anonKey || "sin-configurar",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
