import type { Lesion } from '@/lib/lesionStore';

export interface CaseData {
  id: string;
  patient_name: string;
  exam_date: string;
  lesions: Lesion[];
  created_at?: string;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    typeof import.meta !== 'undefined' &&
      import.meta.env?.VITE_SUPABASE_URL
  );
}

/**
 * Carrega um caso por ID. Com Supabase configurado (VITE_SUPABASE_URL + package @supabase/supabase-js),
 * consulta a tabela "cases". Sem configuração, retorna null.
 */
export async function loadCaseFromDb(_caseId: string): Promise<CaseData | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }
  // Opcional: quando @supabase/supabase-js estiver instalado, implementar fetch aqui.
  return null;
}
