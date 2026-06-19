import { getCategories } from '@/actions/categories';
import { getProducts } from '@/actions/products';
import { getSettings } from '@/actions/settings';
import { POSScreen } from '@/components/pos/POSScreen';

/**
 * Main POS page — server component.
 * Loads all initial data server-side and passes to the client POS screen.
 */
export default async function POSPage() {
  const [categories, products, settings] = await Promise.all([
    getCategories(),
    getProducts(),
    getSettings(),
  ]);

  return (
    <POSScreen
      categories={categories}
      products={products}
      settings={settings}
    />
  );
}
