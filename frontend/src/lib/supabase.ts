import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface CADParameter {
  name: string;
  label: string;
  unit: string;
  type: 'number';
  default: number;
  min: number;
  max: number;
  step: number;
}

export interface CADModel {
  id: string;
  session_id: string;
  title: string;
  prompt: string;
  cad_language: string;
  parameters: CADParameter[];
  units: string;
  glb_url: string;
  usdz_url: string;
  stl_url: string;
  meta: {
    bbox?: number[];
    volume_mm3?: number;
    manifold?: boolean;
    minWall_mm?: number;
    warnings?: string[];
  };
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  created_at: string;
  updated_at: string;
  expires_at: string;
}
