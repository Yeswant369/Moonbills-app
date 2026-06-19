'use server';

import { createServerClient } from '@/lib/supabase';
import { Settings } from '@/lib/types';

const DEFAULTS: Omit<Settings, 'id' | 'created_at'> = {
  restaurant_name: 'Cherrys Bakery',
  gst_number: '',
  gst_percentage: 5,
  admin_pin: '1234',
  printer_width: '80mm',
};

export async function getSettings(): Promise<Settings> {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .limit(1)
      .single();

    if (error || !data) {
      return { id: '', ...DEFAULTS, created_at: new Date().toISOString() };
    }
    return data as Settings;
  } catch {
    return { id: '', ...DEFAULTS, created_at: new Date().toISOString() };
  }
}

export async function updateSettings(
  updates: Partial<Omit<Settings, 'id' | 'created_at'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServerClient();
    const current = await getSettings();

    if (current.id) {
      const { error } = await supabase
        .from('settings')
        .update(updates)
        .eq('id', current.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase
        .from('settings')
        .insert({ ...DEFAULTS, ...updates });
      if (error) throw new Error(error.message);
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/** Validate admin PIN against database — never exposes the actual PIN */
export async function verifyPin(pin: string): Promise<boolean> {
  const settings = await getSettings();
  return settings.admin_pin === pin;
}
