import { getSettings } from '@/actions/settings';
import { getCategories } from '@/actions/categories';
import { getProducts } from '@/actions/products';
import { SettingsScreen } from '@/components/admin/SettingsScreen';

export const metadata = {
  title: 'Settings — Cherrys Bakery POS',
};

export const dynamic = 'force-dynamic';

/**
 * Settings page — server component.
 * Loads data server-side and passes to client SettingsScreen (which has PIN gate).
 * The admin PIN itself is never sent to the client.
 */
export default async function SettingsPage() {
  const [rawSettings, categories, products] = await Promise.all([
    getSettings(),
    getCategories(),
    getProducts(),
  ]);

  // Strip admin PIN from what's sent to client — it's never needed client-side
  const safeSettings = { ...rawSettings, admin_pin: '' };

  return (
    <SettingsScreen
      initialSettings={safeSettings}
      initialCategories={categories}
      initialProducts={products}
    />
  );
}
