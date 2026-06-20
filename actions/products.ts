'use server';

import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/lib/supabase';
import { Product } from '@/lib/types';

export async function getProducts(categoryId?: string): Promise<Product[]> {
  try {
    const supabase = createServerClient();
    let query = supabase.from('products').select('*').order('name');
    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }
    const { data } = await query;
    return (data as Product[]) ?? [];
  } catch {
    return [];
  }
}

export async function createProduct(
  input: Omit<Product, 'id' | 'created_at'>
): Promise<{ success: boolean; data?: Product; error?: string }> {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('products')
      .insert(input)
      .select()
      .single();
    if (error) throw new Error(error.message);

    revalidatePath('/');
    revalidatePath('/settings');

    return { success: true, data: data as Product };
  } catch (err: unknown) {
    return { success: false, error: String(err) };
  }
}

export async function updateProduct(
  id: string,
  updates: Partial<Omit<Product, 'id' | 'created_at'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServerClient();
    const { error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id);
    if (error) throw new Error(error.message);

    revalidatePath('/');
    revalidatePath('/settings');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: String(err) };
  }
}

export async function deleteProduct(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServerClient();
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw new Error(error.message);

    revalidatePath('/');
    revalidatePath('/settings');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: String(err) };
  }
}

export async function deleteUncategorizedProducts(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServerClient();
    const { error } = await supabase.from('products').delete().is('category_id', null);
    if (error) throw new Error(error.message);

    revalidatePath('/');
    revalidatePath('/settings');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: String(err) };
  }
}

export async function toggleProductActive(
  id: string,
  active: boolean
): Promise<{ success: boolean; error?: string }> {
  return updateProduct(id, { active });
}
