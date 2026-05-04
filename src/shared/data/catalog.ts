export type CatalogType = 'profiles' | 'accessories';

export type ProfileSubcategoryId = 'aldoks' | 'thermo' | 'fasad';
export type AccessorySubcategoryId = 'door' | 'window' | 'other';

export type VariantTypeCode = 'L' | 'T' | 'Z';

export interface CatalogChildProduct {
  id: string;
  parent_id: string;
  sku: string;
  color: string;
  color_hex: string;
  variant_type: VariantTypeCode | null;
  price: number;
  /** Internal only — never shown in UI */
  stock: number;
}

export interface CatalogParentProduct {
  id: string;
  sku: string;
  name: string;
  description: string;
  catalog_type: CatalogType;
  subcategory_id: ProfileSubcategoryId | AccessorySubcategoryId;
  block: string;
  specs: { label: string; value: string }[];
  /** If set, product details shows variant pills; colors depend on selected variant */
  variant_types: VariantTypeCode[] | null;
  children: CatalogChildProduct[];
  /** Mock listing flags for home «Все» → catalog ?filter= */
  listing?: { promotion?: boolean; newArrival?: boolean };
}

export const PROFILE_SUBCATEGORIES: { id: ProfileSubcategoryId; label: string }[] = [
  { id: 'aldoks', label: 'Aldoks' },
  { id: 'thermo', label: 'Thermo' },
  { id: 'fasad', label: 'Fasad' },
];

export const ACCESSORY_SUBCATEGORIES: { id: AccessorySubcategoryId; label: string }[] = [
  { id: 'door', label: 'Дверные' },
  { id: 'window', label: 'Оконные' },
  { id: 'other', label: 'Прочие' },
];

export const CATALOG_PARENTS: CatalogParentProduct[] = [
  {
    id: 'p-aldoks-standart',
    sku: 'ALD-ST-60',
    name: 'Профиль Aldoks Standart 60',
    description:
      'Многокамерная система Aldoks Standart для остекления жилых и офисных помещений. Высокая тепло- и шумоизоляция.',
    catalog_type: 'profiles',
    subcategory_id: 'aldoks',
    block: 'Профиль Aldoks Standart',
    specs: [
      { label: 'Ширина', value: '60 мм' },
      { label: 'Камеры', value: '5' },
      { label: 'Материал', value: 'ПВХ' },
      { label: 'Серия', value: 'Aldoks' },
    ],
    variant_types: ['L', 'T', 'Z'],
    listing: { promotion: true },
    children: [
      { id: 'c-ald-l-w', parent_id: 'p-aldoks-standart', sku: 'ALD-ST-60-L-W', color: 'Белый', color_hex: '#FFFFFF', variant_type: 'L', price: 11800, stock: 120 },
      { id: 'c-ald-l-a', parent_id: 'p-aldoks-standart', sku: 'ALD-ST-60-L-A', color: 'Антрацит', color_hex: '#3A3A3A', variant_type: 'L', price: 12400, stock: 45 },
      { id: 'c-ald-l-m', parent_id: 'p-aldoks-standart', sku: 'ALD-ST-60-L-M', color: 'Мокко', color_hex: '#9B7E6B', variant_type: 'L', price: 12400, stock: 30 },
      { id: 'c-ald-t-w', parent_id: 'p-aldoks-standart', sku: 'ALD-ST-60-T-W', color: 'Белый', color_hex: '#FFFFFF', variant_type: 'T', price: 12100, stock: 80 },
      { id: 'c-ald-t-a', parent_id: 'p-aldoks-standart', sku: 'ALD-ST-60-T-A', color: 'Антрацит', color_hex: '#3A3A3A', variant_type: 'T', price: 12700, stock: 22 },
      { id: 'c-ald-z-w', parent_id: 'p-aldoks-standart', sku: 'ALD-ST-60-Z-W', color: 'Белый', color_hex: '#FFFFFF', variant_type: 'Z', price: 11950, stock: 55 },
      { id: 'c-ald-z-m', parent_id: 'p-aldoks-standart', sku: 'ALD-ST-60-Z-M', color: 'Мокко', color_hex: '#9B7E6B', variant_type: 'Z', price: 12600, stock: 18 },
    ],
  },
  {
    id: 'p-aldoks-premium',
    sku: 'ALD-PR-70',
    name: 'Профиль Aldoks Premium 70',
    description: 'Усиленная система 70 мм для панорамного остекления и повышенных нагрузок.',
    catalog_type: 'profiles',
    subcategory_id: 'aldoks',
    block: 'Профиль Aldoks Premium',
    specs: [
      { label: 'Ширина', value: '70 мм' },
      { label: 'Камеры', value: '6' },
      { label: 'Материал', value: 'ПВХ армированный' },
    ],
    variant_types: ['L', 'T', 'Z'],
    listing: { newArrival: true },
    children: [
      { id: 'c-aldp-l-w', parent_id: 'p-aldoks-premium', sku: 'ALD-PR-70-L-W', color: 'Белый', color_hex: '#FFFFFF', variant_type: 'L', price: 15200, stock: 40 },
      { id: 'c-aldp-l-a', parent_id: 'p-aldoks-premium', sku: 'ALD-PR-70-L-A', color: 'Антрацит', color_hex: '#3A3A3A', variant_type: 'L', price: 16100, stock: 25 },
      { id: 'c-aldp-t-w', parent_id: 'p-aldoks-premium', sku: 'ALD-PR-70-T-W', color: 'Белый', color_hex: '#FFFFFF', variant_type: 'T', price: 15400, stock: 35 },
      { id: 'c-aldp-t-m', parent_id: 'p-aldoks-premium', sku: 'ALD-PR-70-T-M', color: 'Мокко', color_hex: '#9B7E6B', variant_type: 'T', price: 16300, stock: 12 },
    ],
  },
  {
    id: 'p-thermo-line',
    sku: 'THM-LINE-62',
    name: 'ThermoLine 62 оконный',
    description: 'Энергоэффективный профиль Thermo с увеличенной монтажной глубиной.',
    catalog_type: 'profiles',
    subcategory_id: 'thermo',
    block: 'ThermoLine 62',
    specs: [
      { label: 'Ширина', value: '62 мм' },
      { label: 'Ud', value: '≤ 1,1' },
    ],
    variant_types: ['L', 'Z'],
    listing: { promotion: true },
    children: [
      { id: 'c-thm-l-w', parent_id: 'p-thermo-line', sku: 'THM-62-L-W', color: 'Белый', color_hex: '#FFFFFF', variant_type: 'L', price: 13900, stock: 60 },
      { id: 'c-thm-l-a', parent_id: 'p-thermo-line', sku: 'THM-62-L-A', color: 'Антрацит', color_hex: '#3A3A3A', variant_type: 'L', price: 14800, stock: 28 },
      { id: 'c-thm-z-w', parent_id: 'p-thermo-line', sku: 'THM-62-Z-W', color: 'Белый', color_hex: '#FFFFFF', variant_type: 'Z', price: 14100, stock: 44 },
      { id: 'c-thm-z-m', parent_id: 'p-thermo-line', sku: 'THM-62-Z-M', color: 'Мокко', color_hex: '#9B7E6B', variant_type: 'Z', price: 14950, stock: 15 },
    ],
  },
  {
    id: 'p-fasad-elite',
    sku: 'FSD-EL-80',
    name: 'Фасадный профиль Elite 80',
    description: 'Несущий фасадный профиль для витражей и зимних садов.',
    catalog_type: 'profiles',
    subcategory_id: 'fasad',
    block: 'Фасад Elite',
    specs: [
      { label: 'Ширина', value: '80 мм' },
      { label: 'Класс', value: 'C' },
    ],
    variant_types: ['T'],
    listing: { newArrival: true },
    children: [
      { id: 'c-fsd-t-w', parent_id: 'p-fasad-elite', sku: 'FSD-EL-80-T-W', color: 'Белый', color_hex: '#FFFFFF', variant_type: 'T', price: 22100, stock: 20 },
      { id: 'c-fsd-t-a', parent_id: 'p-fasad-elite', sku: 'FSD-EL-80-T-A', color: 'Антрацит', color_hex: '#3A3A3A', variant_type: 'T', price: 23800, stock: 14 },
    ],
  },
  {
    id: 'a-handle-prem',
    sku: 'ACC-H-PREM',
    name: 'Ручка нажимная Premium',
    description: 'Дверная нажимная ручка с пружинным механизмом, стойкое покрытие.',
    catalog_type: 'accessories',
    subcategory_id: 'door',
    block: 'Ручки',
    specs: [
      { label: 'Тип', value: 'Нажимная' },
      { label: 'Высота планки', value: '220 мм' },
    ],
    variant_types: null,
    listing: { newArrival: true },
    children: [
      { id: 'c-hp-w', parent_id: 'a-handle-prem', sku: 'ACC-H-PREM-W', color: 'Белый', color_hex: '#F5F5F5', variant_type: null, price: 1890, stock: 200 },
      { id: 'c-hp-a', parent_id: 'a-handle-prem', sku: 'ACC-H-PREM-A', color: 'Антрацит', color_hex: '#3A3A3A', variant_type: null, price: 1990, stock: 150 },
      { id: 'c-hp-m', parent_id: 'a-handle-prem', sku: 'ACC-H-PREM-M', color: 'Мокко', color_hex: '#9B7E6B', variant_type: null, price: 1990, stock: 90 },
    ],
  },
  {
    id: 'a-handle-econ',
    sku: 'ACC-H-ECO',
    name: 'Ручка оконная Economy',
    description: 'Компактная оконная ручка для створок до 90 кг.',
    catalog_type: 'accessories',
    subcategory_id: 'window',
    block: 'Ручки',
    specs: [{ label: 'Тип', value: 'Оконная' }],
    variant_types: null,
    listing: { promotion: true },
    children: [
      { id: 'c-he-w', parent_id: 'a-handle-econ', sku: 'ACC-H-ECO-W', color: 'Белый', color_hex: '#FFFFFF', variant_type: null, price: 650, stock: 400 },
      { id: 'c-he-a', parent_id: 'a-handle-econ', sku: 'ACC-H-ECO-A', color: 'Антрацит', color_hex: '#3A3A3A', variant_type: null, price: 720, stock: 310 },
    ],
  },
  {
    id: 'a-lock-multi',
    sku: 'ACC-L-MULTI',
    name: 'Замок многозапорный',
    description: 'Многозапорный привод для ПВХ дверей, повышенная взломостойкость.',
    catalog_type: 'accessories',
    subcategory_id: 'door',
    block: 'Замки',
    specs: [{ label: 'Точки запирания', value: '5' }],
    variant_types: null,
    listing: { newArrival: true },
    children: [
      { id: 'c-lm-w', parent_id: 'a-lock-multi', sku: 'ACC-L-MULTI-W', color: 'Белый', color_hex: '#FFFFFF', variant_type: null, price: 11200, stock: 42 },
      { id: 'c-lm-a', parent_id: 'a-lock-multi', sku: 'ACC-L-MULTI-A', color: 'Антрацит', color_hex: '#3A3A3A', variant_type: null, price: 11800, stock: 30 },
    ],
  },
  {
    id: 'a-seal-kit',
    sku: 'ACC-SEAL-KIT',
    name: 'Комплект уплотнителей',
    description: 'EPDM уплотнители для оконных систем, морозостойкие.',
    catalog_type: 'accessories',
    subcategory_id: 'other',
    block: 'Прочие',
    specs: [{ label: 'Длина комплекта', value: '50 м' }],
    variant_types: null,
    listing: { promotion: true },
    children: [
      { id: 'c-sk-b', parent_id: 'a-seal-kit', sku: 'ACC-SEAL-KIT-B', color: 'Белый', color_hex: '#EEEEEE', variant_type: null, price: 2400, stock: 85 },
      { id: 'c-sk-g', parent_id: 'a-seal-kit', sku: 'ACC-SEAL-KIT-G', color: 'Антрацит', color_hex: '#2F2F2F', variant_type: null, price: 2400, stock: 70 },
    ],
  },
];

export function parentPriceFrom(parent: CatalogParentProduct): number {
  if (!parent.children.length) return 0;
  return Math.min(...parent.children.map((c) => c.price));
}

export function findParentById(id: string): CatalogParentProduct | undefined {
  return CATALOG_PARENTS.find((p) => p.id === id);
}

export function listParentsForCatalog(
  catalogType: CatalogType,
  subcategoryId: string
): CatalogParentProduct[] {
  return CATALOG_PARENTS.filter(
    (p) => p.catalog_type === catalogType && p.subcategory_id === subcategoryId
  );
}

export function groupParentsByBlock(parents: CatalogParentProduct[]): Map<string, CatalogParentProduct[]> {
  const map = new Map<string, CatalogParentProduct[]>();
  for (const p of parents) {
    const list = map.get(p.block) ?? [];
    list.push(p);
    map.set(p.block, list);
  }
  return map;
}

export type CatalogListingFilter = 'promotions' | 'new';

export function listParentsByListingFilter(filter: CatalogListingFilter): CatalogParentProduct[] {
  return CATALOG_PARENTS.filter((p) => {
    if (filter === 'promotions') return p.listing?.promotion === true;
    return p.listing?.newArrival === true;
  });
}
