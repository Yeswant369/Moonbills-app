'use server';

import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/lib/supabase';
import { Category } from '@/lib/types';

export async function getCategories(): Promise<Category[]> {
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });
    return (data as Category[]) ?? [];
  } catch {
    return [];
  }
}

export async function createCategory(
  name: string
): Promise<{ success: boolean; data?: Category; error?: string }> {
  try {
    const supabase = createServerClient();
    const categories = await getCategories();
    const maxOrder = categories.reduce((max, c) => Math.max(max, c.sort_order), 0);

    const { data, error } = await supabase
      .from('categories')
      .insert({ name: name.trim(), sort_order: maxOrder + 1 })
      .select()
      .single();

    if (error) throw new Error(error.message);

    revalidatePath('/');
    revalidatePath('/settings');

    return { success: true, data: data as Category };
  } catch (err: unknown) {
    return { success: false, error: String(err) };
  }
}

export async function updateCategory(
  id: string,
  updates: Partial<Pick<Category, 'name' | 'sort_order'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServerClient();
    const { error } = await supabase
      .from('categories')
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

export async function deleteCategory(
  id: string,
  options: { deleteProducts?: boolean } = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServerClient();
    if (options.deleteProducts) {
      const { error: productError } = await supabase
        .from('products')
        .delete()
        .eq('category_id', id);
      if (productError) throw new Error(productError.message);
    }

    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw new Error(error.message);

    revalidatePath('/');
    revalidatePath('/settings');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: String(err) };
  }
}

/** Swap sort_order with adjacent category to reorder */
export async function reorderCategory(
  id: string,
  direction: 'up' | 'down'
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServerClient();
    const categories = await getCategories();
    const index = categories.findIndex((c) => c.id === id);
    if (index === -1) return { success: false, error: 'Not found' };

    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= categories.length) return { success: true };

    const current = categories[index];
    const swap = categories[swapIndex];

    await Promise.all([
      supabase
        .from('categories')
        .update({ sort_order: swap.sort_order })
        .eq('id', current.id),
      supabase
        .from('categories')
        .update({ sort_order: current.sort_order })
        .eq('id', swap.id),
    ]);

    revalidatePath('/');
    revalidatePath('/settings');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: String(err) };
  }
}
