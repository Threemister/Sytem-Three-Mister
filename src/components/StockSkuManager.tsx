/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  InventoryItem,
  InventoryCategory,
  InventoryVariantStock,
  ProductAvailabilityStatus,
  SavedCalculation
} from '../types';
import {
  Tag,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Check,
  AlertCircle,
  Layers,
  CheckCircle2,
  Ban,
  ArrowRight,
  Shirt,
  Sparkles,
  Copy,
  RefreshCw,
  MapPin,
  Filter,
  Package,
  ToggleLeft,
  ToggleRight,
  Palette,
  Hash,
  Image as ImageIcon,
  ShieldAlert
} from 'lucide-react';

interface StockSkuManagerProps {
  inventory: InventoryItem[];
  onAddInventory: (item: InventoryItem) => void;
  onEditInventory: (item: InventoryItem) => void;
  onDeleteInventory: (id: string) => void;
  onNavigateToInventory: () => void;
}

const PRODUCT_GROUPS = [
  'Kaos / T-Shirt',
  'Hoodie / Outerwear',
  'Kemeja / Workshirt',
  'Celana / Pants',
  'Aksesoris / Topi / Tas',
  'Perlengkapan Packing (Habis Pakai)',
  'Perlengkapan Toko (Habis Pakai)',
  'Peralatan Studio & Display',
  'Peralatan Gudang & Admin'
];

const SLEEVE_OPTIONS = [
  { label: 'Lengan Pendek', code: 'LP', shortDesc: 'Short Sleeve (LP)' },
  { label: 'Lengan Panjang', code: 'LPJ', shortDesc: 'Long Sleeve (LPJ)' }
];

const STYLE_PRESETS = [
  'Oversize',
  'Regular Fit',
  'Boxy Fit',
  'Heavyweight',
  'Vintage Wash',
  'Streetwear',
  'Workshirt'
];

const GRAPHIC_PRESETS = [
  'Samurai',
  'Typography',
  'Sablon Plastisol',
  'Logo Bordir',
  'Dragon',
  'Cyberpunk',
  'Polos'
];

const COLOR_PRESETS = [
  'Hitam',
  'Putih',
  'Maroon',
  'Abu Misty'
];

const COLOR_MAP: Record<string, string> = {
  hitam: 'BLK',
  black: 'BLK',
  putih: 'WHT',
  white: 'WHT',
  navy: 'NVY',
  biru: 'BLU',
  blue: 'BLU',
  abu: 'GRY',
  'abu misty': 'MST',
  grey: 'GRY',
  gray: 'GRY',
  misty: 'MST',
  merah: 'RED',
  maroon: 'MRN',
  marun: 'MRN',
  hijau: 'GRN',
  green: 'GRN',
  olive: 'OLV',
  'army / olive': 'ARM',
  army: 'ARM',
  cream: 'CRM',
  'cream / beige': 'CRM',
  krem: 'CRM',
  beige: 'BGE',
  coklat: 'BRW',
  brown: 'BRW',
  kuning: 'YLW',
  mustard: 'MSD'
};

const STYLE_CODE_MAP: Record<string, string> = {
  oversize: 'OVS',
  oversized: 'OVS',
  'regular fit': 'REG',
  regular: 'REG',
  reguler: 'REG',
  'boxy fit': 'BXY',
  'boxy oversize': 'BXY',
  boxy: 'BXY',
  heavyweight: 'HVW',
  'vintage wash': 'VTG',
  vintage: 'VTG',
  streetwear: 'STR',
  workshirt: 'WRK',
  hoodie: 'HOD',
  crewneck: 'CRW'
};

const STOP_WORDS = new Set([
  'dan',
  'yang',
  'untuk',
  'dengan',
  'di',
  'ke',
  'dari',
  'atau',
  'pcs',
  'pack',
  'roll',
  'set',
  'unit',
  'size',
  'ukuran'
]);

/**
 * Helper to abbreviate any text token (Style Desain, Gambar Desain, Warna) into a clean 3-letter SKU code.
 */
function abbreviateToken(raw: string, fallback: string, customMap?: Record<string, string>): string {
  const clean = raw.trim().toLowerCase();
  if (!clean) return fallback;
  if (customMap && customMap[clean]) return customMap[clean];

  // Check if any key in customMap is contained
  if (customMap) {
    for (const [k, v] of Object.entries(customMap)) {
      if (clean.includes(k)) return v;
    }
  }

  const words = clean
    .replace(/[^a-z0-9\s]/gi, ' ')
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return fallback;

  if (words.length === 1) {
    const w = words[0].toUpperCase();
    if (w.length <= 3) return w;
    const consonants = w[0] + w.slice(1).replace(/[AEIOU]/g, '');
    return (consonants.length >= 3 ? consonants : w).slice(0, 3);
  }

  if (words.length === 2) {
    return `${words[0][0]}${words[1].slice(0, 2)}`.toUpperCase();
  }

  return words
    .slice(0, 3)
    .map(w => w[0])
    .join('')
    .toUpperCase();
}

export function getSleeveCode(sleeve: string): string {
  const lower = sleeve.trim().toLowerCase();
  if (lower.includes('panjang') || lower === 'lpj' || lower === 'ls') return 'LPJ';
  if (lower.includes('pendek') || lower === 'lp' || lower === 'ss') return 'LP';
  return abbreviateToken(sleeve, 'LP');
}

export function getStyleCode(style: string): string {
  return abbreviateToken(style, 'STD', STYLE_CODE_MAP);
}

export function getGraphicCode(graphic: string): string {
  const lower = graphic.trim().toLowerCase();
  if (lower.includes('samurai')) return 'SMR';
  if (lower.includes('typography') || lower.includes('tipografi')) return 'TYP';
  if (lower.includes('plastisol')) return 'SPL';
  if (lower.includes('bordir')) return 'BRD';
  if (lower.includes('dragon') || lower.includes('naga')) return 'DRG';
  if (lower.includes('cyberpunk')) return 'CYB';
  if (lower.includes('polos')) return 'PLS';
  return abbreviateToken(graphic, 'DSN');
}

export function getColorCode(color: string): string {
  return abbreviateToken(color, 'BLK', COLOR_MAP);
}

export function getDesignNumberCode(num: string): string {
  const cleaned = num.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (!cleaned) return '01';
  if (/^\d+$/.test(cleaned)) {
    return cleaned.padStart(2, '0').slice(-3);
  }
  return cleaned.slice(0, 4);
}

/**
 * Generates an automatic SKU code from the 5 structured product design attributes:
 * 1. Produk (Lengan Pendek = LP / Lengan Panjang = LPJ)
 * 2. Style Desain (e.g. Oversize = OVS)
 * 3. Gambar Desain (e.g. Samurai = SMR)
 * 4. Warna (e.g. Hitam = BLK)
 * 5. Nomor Desain (e.g. 01)
 * Result: TM-LP-OVS-SMR-BLK-01
 */
export function generateStructuredSku(params: {
  productSleeve: string;
  designStyle: string;
  designGraphic: string;
  productColor: string;
  designNumber: string;
  category?: InventoryCategory;
}): string {
  const prefix = params.category === 'internal_use' ? 'OP' : 'TM';
  const sleeveCode = getSleeveCode(params.productSleeve);
  const styleCode = getStyleCode(params.designStyle);
  const graphicCode = getGraphicCode(params.designGraphic);
  const colorCode = getColorCode(params.productColor);
  const numberCode = getDesignNumberCode(params.designNumber);

  return `${prefix}-${sleeveCode}-${styleCode}-${graphicCode}-${colorCode}-${numberCode}`.toUpperCase();
}

/**
 * Composes a clean, readable Product Name from the 5 SKU attributes.
 */
export function composeProductNameFromSpecs(params: {
  subCategory: string;
  productSleeve: string;
  designStyle: string;
  designGraphic: string;
  productColor: string;
  designNumber: string;
}): string {
  const baseType = params.subCategory.split('/')[0].trim() || 'Kaos';
  const sleeve = params.productSleeve.trim();
  const style = params.designStyle.trim();
  const graphic = params.designGraphic.trim();
  const color = params.productColor.trim();
  const num = params.designNumber.trim();

  const parts: string[] = [baseType];
  if (sleeve) parts.push(sleeve);
  if (style) parts.push(style);
  if (graphic) parts.push(`- ${graphic}`);
  if (color) parts.push(`(${color})`);
  if (num) parts.push(`#${num.replace(/^#/, '')}`);

  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Fallback generator from product name only (imported by InventoryManager.tsx as well).
 */
export function generateAutoSkuFromName(
  productName: string,
  category: InventoryCategory,
  subCategory: string
): string {
  const prefix = category === 'for_sale' ? 'TM' : 'OP';
  const cleaned = productName
    .replace(/[()[\]{}/\\.,+&-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) {
    const subCode =
      subCategory
        .replace(/[^a-zA-Z]/g, '')
        .slice(0, 3)
        .toUpperCase() || 'PRD';
    return `${prefix}-${subCode}-001`;
  }

  const rawWords = cleaned.split(' ').filter(Boolean);
  const mainLetters: string[] = [];
  const specTokens: string[] = [];
  let colorCode = '';

  rawWords.forEach(w => {
    const lower = w.toLowerCase();
    if (STOP_WORDS.has(lower)) return;

    if (COLOR_MAP[lower] && !colorCode) {
      colorCode = COLOR_MAP[lower];
      return;
    }

    if (/\d/.test(lower)) {
      const specClean = lower
        .replace(/gsm/g, '')
        .replace(/mm/g, '')
        .replace(/[^a-z0-9]/g, '')
        .toUpperCase()
        .slice(0, 4);
      if (specClean && specTokens.length < 1) {
        specTokens.push(specClean);
      }
      return;
    }

    const alpha = w.replace(/[^a-zA-Z]/g, '').toUpperCase();
    if (alpha) {
      mainLetters.push(alpha);
    }
  });

  let nameCode = '';
  if (mainLetters.length === 1) {
    nameCode = mainLetters[0].slice(0, 4);
  } else if (mainLetters.length === 2) {
    nameCode = `${mainLetters[0].slice(0, 2)}${mainLetters[1].slice(0, 2)}`;
  } else if (mainLetters.length >= 3) {
    nameCode = mainLetters
      .slice(0, 4)
      .map(w => w[0])
      .join('');
  } else {
    nameCode = 'PRD';
  }

  let thirdSegment = colorCode;
  if (!thirdSegment && mainLetters.length >= 2) {
    const lastWord = mainLetters[mainLetters.length - 1];
    const consonants = lastWord.replace(/[AEIOU]/g, '');
    thirdSegment = (consonants.length >= 2 ? consonants : lastWord).slice(0, 3);
  }

  const parts = [prefix, nameCode];
  if (specTokens.length > 0) parts.push(specTokens[0]);
  if (thirdSegment && thirdSegment !== nameCode) parts.push(thirdSegment);

  return parts.join('-').toUpperCase();
}

function generateVariantSkuCode(baseSku: string, variantName: string): string {
  const cleanBase = baseSku.trim().toUpperCase() || 'TM-PRD';
  const cleanVar = variantName.trim();
  if (!cleanVar) return cleanBase;

  const normalized = cleanVar
    .replace(/^size\s+/i, '')
    .replace(/^ukuran\s+/i, '')
    .trim();

  const words = normalized.split(/\s+/).filter(Boolean);
  let suffix = '';
  if (words.length === 1) {
    suffix = words[0].replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 5);
  } else {
    suffix = words
      .map(w => w.replace(/[^a-zA-Z0-9]/g, '')[0] || '')
      .join('')
      .toUpperCase()
      .slice(0, 4);
  }

  return suffix ? `${cleanBase}-${suffix}` : cleanBase;
}

export default function StockSkuManager({
  inventory,
  onAddInventory,
  onEditInventory,
  onDeleteInventory,
  onNavigateToInventory
}: StockSkuManagerProps) {
  const [search, setSearch] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState<
    'ALL' | 'AVAILABLE' | 'UNAVAILABLE' | 'NOT_FOR_SALE'
  >('ALL');
  const [variantFilter, setVariantFilter] = useState<string>('ALL');
  const [copiedSkuId, setCopiedSkuId] = useState<string | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Quick inline edit state for main product quantity
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlineTotalQty, setInlineTotalQty] = useState<number>(0);
  const [inlineUsedQty, setInlineUsedQty] = useState<number>(0);

  // Saved HPP articles for quick product name import
  const [savedHppArticles, setSavedHppArticles] = useState<SavedCalculation[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('threemister_hpp_calcs');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setSavedHppArticles(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Modal Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [formError, setFormError] = useState('');

  const [category, setCategory] = useState<InventoryCategory>('for_sale');
  const [subCategory, setSubCategory] = useState(PRODUCT_GROUPS[0]);

  // 5 Required SKU Specification Fields in Step 1:
  // 1. Produk = Lengan Pendek dan Panjang
  // 2. Style Desain
  // 3. Gambar Desain
  // 4. Warna
  // 5. Nomor Desain
  const [productSleeve, setProductSleeve] = useState<string>('Lengan Pendek');
  const [designStyle, setDesignStyle] = useState<string>('Oversize');
  const [designGraphic, setDesignGraphic] = useState<string>('Samurai');
  const [productColor, setProductColor] = useState<string>('Hitam');
  const [designNumber, setDesignNumber] = useState<string>('01');

  const [name, setName] = useState('');
  const [autoComposeName, setAutoComposeName] = useState(true);
  const [sku, setSku] = useState('');
  const [autoSkuEnabled, setAutoSkuEnabled] = useState(true);

  const [unit, setUnit] = useState('pcs');
  const [productAvailabilityStatus, setProductAvailabilityStatus] =
    useState<ProductAvailabilityStatus>('available');
  const [totalQty, setTotalQty] = useState<number>(60);
  const [usedOrSoldQty, setUsedOrSoldQty] = useState<number>(0);
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  // Variant / Size breakdown inside Form
  const [useVariantBreakdown, setUseVariantBreakdown] = useState<boolean>(true);
  const [variants, setVariants] = useState<InventoryVariantStock[]>([]);
  const [newVariantName, setNewVariantName] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);

  // Determine effective availability status: 'available' | 'unavailable' | 'not_for_sale'
  const getItemAvailabilityStatus = (item: InventoryItem): ProductAvailabilityStatus => {
    if (item.availabilityStatus === 'not_for_sale' || item.category === 'internal_use') {
      return 'not_for_sale';
    }
    if (item.availabilityStatus === 'unavailable') {
      return 'unavailable';
    }
    const rem = Math.max(0, item.totalQty - item.usedOrSoldQty);
    if (item.availabilityStatus === 'available') {
      return rem > 0 ? 'available' : 'unavailable';
    }
    if (item.isAvailable !== undefined) {
      return item.isAvailable && rem > 0 ? 'available' : 'unavailable';
    }
    return rem > 0 ? 'available' : 'unavailable';
  };

  // Check if an item is effectively available for sale
  const isItemAvailable = (item: InventoryItem): boolean => {
    return getItemAvailabilityStatus(item) === 'available';
  };

  // Check if a variant is effectively available
  const isVariantAvailable = (v: InventoryVariantStock): boolean => {
    if (v.isAvailable !== undefined) return v.isAvailable;
    return Math.max(0, v.totalQty - v.usedOrSoldQty) > 0;
  };

  // Collect all unique variant names (e.g. S, M, L, XL, XXL)
  const allUniqueVariantNames = useMemo(() => {
    const set = new Set<string>();
    inventory.forEach(item => {
      item.variants?.forEach(v => {
        if (v.variantName) set.add(v.variantName.toUpperCase());
      });
    });
    return Array.from(set);
  }, [inventory]);

  // Stock & SKU Metrics
  // "Stock tidak terhitung" comes automatically from products with status "Tidak di jual" ('not_for_sale')
  const stockMetrics = useMemo(() => {
    return inventory.reduce(
      (acc, item) => {
        const rem = Math.max(0, item.totalQty - item.usedOrSoldQty);
        const status = getItemAvailabilityStatus(item);

        acc.totalSkuCount += 1;
        acc.totalSubSkuCount += item.variants?.length || 1;

        if (status === 'not_for_sale') {
          acc.notForSaleProductCount += 1;
          acc.uncountedStockQty += rem;
        } else {
          acc.totalInQty += item.totalQty;
          acc.totalOutQty += item.usedOrSoldQty;
          acc.totalRemainingQty += rem;
          if (status === 'available') {
            acc.availableProductCount += 1;
          } else {
            acc.unavailableProductCount += 1;
          }
        }
        return acc;
      },
      {
        totalSkuCount: 0,
        totalSubSkuCount: 0,
        totalInQty: 0,
        totalOutQty: 0,
        totalRemainingQty: 0,
        uncountedStockQty: 0,
        availableProductCount: 0,
        unavailableProductCount: 0,
        notForSaleProductCount: 0
      }
    );
  }, [inventory]);

  // Filtered products
  const filteredItems = useMemo(() => {
    return inventory.filter(item => {
      const status = getItemAvailabilityStatus(item);

      if (availabilityFilter === 'AVAILABLE' && status !== 'available') return false;
      if (availabilityFilter === 'UNAVAILABLE' && status !== 'unavailable') return false;
      if (availabilityFilter === 'NOT_FOR_SALE' && status !== 'not_for_sale') return false;

      if (variantFilter !== 'ALL') {
        const hasMatchVariant = item.variants?.some(
          v =>
            v.variantName.toUpperCase() === variantFilter &&
            isVariantAvailable(v) &&
            Math.max(0, v.totalQty - v.usedOrSoldQty) > 0
        );
        if (!hasMatchVariant) return false;
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = item.name.toLowerCase().includes(q);
        const matchSku = item.sku.toLowerCase().includes(q);
        const matchSub = item.subCategory.toLowerCase().includes(q);
        const matchSpecs = [
          item.productSleeve,
          item.designStyle,
          item.designGraphic,
          item.productColor,
          item.designNumber
        ]
          .filter(Boolean)
          .some(s => String(s).toLowerCase().includes(q));
        const matchVar = item.variants?.some(
          v => v.skuCode.toLowerCase().includes(q) || v.variantName.toLowerCase().includes(q)
        );
        if (!matchName && !matchSku && !matchSub && !matchSpecs && !matchVar) return false;
      }

      return true;
    });
  }, [inventory, availabilityFilter, variantFilter, search]);

  // Update Product Availability Status Directly from Table ('available' | 'unavailable' | 'not_for_sale')
  const handleSetProductStatus = (item: InventoryItem, nextStatus: ProductAvailabilityStatus) => {
    const rem = Math.max(0, item.totalQty - item.usedOrSoldQty);
    onEditInventory({
      ...item,
      availabilityStatus: nextStatus,
      isAvailable: nextStatus === 'available' && rem > 0,
      category: nextStatus === 'not_for_sale' ? 'internal_use' : 'for_sale',
      updatedAt: new Date().toISOString()
    });
  };

  // Cycle Product Status when clicking the main status button
  const handleCycleProductAvailability = (item: InventoryItem) => {
    const currentStatus = getItemAvailabilityStatus(item);
    const nextStatus: ProductAvailabilityStatus =
      currentStatus === 'available'
        ? 'unavailable'
        : currentStatus === 'unavailable'
        ? 'not_for_sale'
        : 'available';
    handleSetProductStatus(item, nextStatus);
  };

  // Toggle Variant Availability Directly from Table ("Tersedia" <-> "Habis / Tidak Tersedia")
  const handleToggleVariantAvailability = (item: InventoryItem, variantId: string) => {
    if (!item.variants) return;
    const updatedVariants = item.variants.map(v => {
      if (v.id !== variantId) return v;
      const cur = isVariantAvailable(v);
      const next = !cur;
      if (next && Math.max(0, v.totalQty - v.usedOrSoldQty) === 0) {
        return {
          ...v,
          isAvailable: true,
          totalQty: v.totalQty + 10,
          remainingQty: 10
        };
      }
      return {
        ...v,
        isAvailable: next
      };
    });

    const newTotalQty = updatedVariants.reduce((s, v) => s + v.totalQty, 0);
    const newUsedQty = updatedVariants.reduce((s, v) => s + v.usedOrSoldQty, 0);
    const newRem = Math.max(0, newTotalQty - newUsedQty);
    const anyVarAvail = updatedVariants.some(
      v => isVariantAvailable(v) && Math.max(0, v.totalQty - v.usedOrSoldQty) > 0
    );
    const isNotForSale = getItemAvailabilityStatus(item) === 'not_for_sale';

    onEditInventory({
      ...item,
      totalQty: newTotalQty,
      usedOrSoldQty: newUsedQty,
      remainingQty: newRem,
      totalRemainingValue: newRem * item.unitCost,
      isAvailable: isNotForSale ? false : anyVarAvail,
      availabilityStatus: isNotForSale
        ? 'not_for_sale'
        : anyVarAvail
        ? 'available'
        : 'unavailable',
      variants: updatedVariants,
      updatedAt: new Date().toISOString()
    });
  };

  // Adjust Variant Quantity Directly (-1 or +1)
  const handleQuickAdjustVariantQty = (
    item: InventoryItem,
    variantId: string,
    mode: 'minus_avail' | 'plus_avail'
  ) => {
    if (!item.variants) return;
    const updatedVariants = item.variants.map(v => {
      if (v.id !== variantId) return v;
      if (mode === 'minus_avail') {
        const nextUsed = Math.min(v.totalQty, v.usedOrSoldQty + 1);
        const rem = Math.max(0, v.totalQty - nextUsed);
        return {
          ...v,
          usedOrSoldQty: nextUsed,
          remainingQty: rem,
          isAvailable: rem > 0 ? v.isAvailable ?? true : false
        };
      } else {
        const nextTotal = v.totalQty + 1;
        const rem = Math.max(0, nextTotal - v.usedOrSoldQty);
        return {
          ...v,
          totalQty: nextTotal,
          remainingQty: rem,
          isAvailable: true
        };
      }
    });

    const newTotalQty = updatedVariants.reduce((s, v) => s + v.totalQty, 0);
    const newUsedQty = updatedVariants.reduce((s, v) => s + v.usedOrSoldQty, 0);
    const newRem = Math.max(0, newTotalQty - newUsedQty);
    const isNotForSale = getItemAvailabilityStatus(item) === 'not_for_sale';

    onEditInventory({
      ...item,
      totalQty: newTotalQty,
      usedOrSoldQty: newUsedQty,
      remainingQty: newRem,
      totalRemainingValue: newRem * item.unitCost,
      isAvailable: isNotForSale ? false : newRem > 0,
      availabilityStatus: isNotForSale
        ? 'not_for_sale'
        : newRem > 0
        ? 'available'
        : 'unavailable',
      variants: updatedVariants,
      updatedAt: new Date().toISOString()
    });
  };

  // Start Inline Edit for Product Quantities
  const handleStartInlineEdit = (item: InventoryItem) => {
    setInlineEditingId(item.id);
    setInlineTotalQty(item.totalQty);
    setInlineUsedQty(item.usedOrSoldQty);
  };

  const handleSaveInlineEdit = (item: InventoryItem) => {
    const validTotal = Math.max(0, inlineTotalQty);
    const validUsed = Math.max(0, Math.min(validTotal, inlineUsedQty));
    const newRem = Math.max(0, validTotal - validUsed);
    const isNotForSale = getItemAvailabilityStatus(item) === 'not_for_sale';

    onEditInventory({
      ...item,
      totalQty: validTotal,
      usedOrSoldQty: validUsed,
      remainingQty: newRem,
      totalRemainingValue: newRem * item.unitCost,
      isAvailable: isNotForSale ? false : newRem > 0,
      availabilityStatus: isNotForSale
        ? 'not_for_sale'
        : newRem > 0
        ? 'available'
        : 'unavailable',
      updatedAt: new Date().toISOString()
    });
    setInlineEditingId(null);
  };

  // Helper to sync variant SKU codes whenever base SKU changes
  const syncVariantSkusWithBase = (baseSku: string, list: InventoryVariantStock[]): InventoryVariantStock[] => {
    return list.map(v => ({
      ...v,
      skuCode: generateVariantSkuCode(baseSku, v.variantName),
      remainingQty: Math.max(0, v.totalQty - v.usedOrSoldQty)
    }));
  };

  // Central handler whenever any of the 5 SKU fields change
  const handleSpecFieldChange = (
    updated: Partial<{
      subCategory: string;
      category: InventoryCategory;
      productSleeve: string;
      designStyle: string;
      designGraphic: string;
      productColor: string;
      designNumber: string;
    }>
  ) => {
    const nextSub = updated.subCategory !== undefined ? updated.subCategory : subCategory;
    const nextCat = updated.category !== undefined ? updated.category : category;
    const nextSleeve = updated.productSleeve !== undefined ? updated.productSleeve : productSleeve;
    const nextStyle = updated.designStyle !== undefined ? updated.designStyle : designStyle;
    const nextGraphic = updated.designGraphic !== undefined ? updated.designGraphic : designGraphic;
    const nextColor = updated.productColor !== undefined ? updated.productColor : productColor;
    const nextNumber = updated.designNumber !== undefined ? updated.designNumber : designNumber;

    if (updated.subCategory !== undefined) setSubCategory(nextSub);
    if (updated.category !== undefined) setCategory(nextCat);
    if (updated.productSleeve !== undefined) setProductSleeve(nextSleeve);
    if (updated.designStyle !== undefined) setDesignStyle(nextStyle);
    if (updated.designGraphic !== undefined) setDesignGraphic(nextGraphic);
    if (updated.productColor !== undefined) setProductColor(nextColor);
    if (updated.designNumber !== undefined) setDesignNumber(nextNumber);

    if (autoComposeName) {
      const composedName = composeProductNameFromSpecs({
        subCategory: nextSub,
        productSleeve: nextSleeve,
        designStyle: nextStyle,
        designGraphic: nextGraphic,
        productColor: nextColor,
        designNumber: nextNumber
      });
      setName(composedName);
    }

    if (autoSkuEnabled) {
      const generated = generateStructuredSku({
        productSleeve: nextSleeve,
        designStyle: nextStyle,
        designGraphic: nextGraphic,
        productColor: nextColor,
        designNumber: nextNumber,
        category: nextCat
      });
      setSku(generated);
      setVariants(prev => syncVariantSkusWithBase(generated, prev));
    }
  };

  // Product Name manual change
  const handleProductNameChange = (newName: string) => {
    setName(newName);
    setAutoComposeName(false);
  };

  const handleTriggerAutoSku = () => {
    const generated = generateStructuredSku({
      productSleeve,
      designStyle,
      designGraphic,
      productColor,
      designNumber,
      category
    });
    setSku(generated);
    setAutoSkuEnabled(true);
    setVariants(prev => syncVariantSkusWithBase(generated, prev));
  };

  const handleComposeNameFromSpecs = () => {
    const composed = composeProductNameFromSpecs({
      subCategory,
      productSleeve,
      designStyle,
      designGraphic,
      productColor,
      designNumber
    });
    setName(composed);
    setAutoComposeName(true);
  };

  const applyVariantPreset = (presetNames: string[], defaultPerVariantQty = 15) => {
    const currentBaseSku =
      sku.trim() ||
      generateStructuredSku({
        productSleeve,
        designStyle,
        designGraphic,
        productColor,
        designNumber,
        category
      });
    const created: InventoryVariantStock[] = presetNames.map((vName, idx) => ({
      id: `VAR-${Date.now()}-${idx}`,
      variantName: vName,
      skuCode: generateVariantSkuCode(currentBaseSku, vName),
      totalQty: defaultPerVariantQty,
      usedOrSoldQty: 0,
      remainingQty: defaultPerVariantQty,
      isAvailable: true
    }));
    setUseVariantBreakdown(true);
    setVariants(created);
    const sumTotal = created.reduce((s, v) => s + v.totalQty, 0);
    setTotalQty(sumTotal);
    setUsedOrSoldQty(0);
  };

  const handleUpdateVariantRow = (
    id: string,
    field: 'variantName' | 'skuCode' | 'totalQty' | 'usedOrSoldQty' | 'isAvailable',
    value: string | number | boolean
  ) => {
    const updated = variants.map(v => {
      if (v.id !== id) return v;
      if (field === 'variantName') {
        const newVarName = String(value);
        return {
          ...v,
          variantName: newVarName,
          skuCode: generateVariantSkuCode(sku, newVarName)
        };
      }
      if (field === 'skuCode') {
        return { ...v, skuCode: String(value).toUpperCase() };
      }
      if (field === 'totalQty') {
        const tQty = Math.max(0, Number(value) || 0);
        const uQty = Math.min(v.usedOrSoldQty, tQty);
        const rem = Math.max(0, tQty - uQty);
        return {
          ...v,
          totalQty: tQty,
          usedOrSoldQty: uQty,
          remainingQty: rem,
          isAvailable: rem > 0
        };
      }
      if (field === 'usedOrSoldQty') {
        const uQty = Math.max(0, Math.min(v.totalQty, Number(value) || 0));
        const rem = Math.max(0, v.totalQty - uQty);
        return {
          ...v,
          usedOrSoldQty: uQty,
          remainingQty: rem,
          isAvailable: rem > 0
        };
      }
      if (field === 'isAvailable') {
        const nextAvail = Boolean(value);
        return {
          ...v,
          isAvailable: nextAvail
        };
      }
      return v;
    });

    setVariants(updated);
    if (useVariantBreakdown && updated.length > 0) {
      setTotalQty(updated.reduce((s, item) => s + item.totalQty, 0));
      setUsedOrSoldQty(updated.reduce((s, item) => s + item.usedOrSoldQty, 0));
    }
  };

  const handleAddCustomVariant = () => {
    const label = newVariantName.trim() || `Varian ${variants.length + 1}`;
    const currentBaseSku =
      sku.trim() ||
      generateStructuredSku({
        productSleeve,
        designStyle,
        designGraphic,
        productColor,
        designNumber,
        category
      });
    const newVar: InventoryVariantStock = {
      id: `VAR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      variantName: label,
      skuCode: generateVariantSkuCode(currentBaseSku, label),
      totalQty: 15,
      usedOrSoldQty: 0,
      remainingQty: 15,
      isAvailable: true
    };
    const next = [...variants, newVar];
    setVariants(next);
    setNewVariantName('');
    if (useVariantBreakdown) {
      setTotalQty(next.reduce((s, item) => s + item.totalQty, 0));
      setUsedOrSoldQty(next.reduce((s, item) => s + item.usedOrSoldQty, 0));
    }
  };

  const handleRemoveVariantRow = (id: string) => {
    const next = variants.filter(v => v.id !== id);
    setVariants(next);
    if (useVariantBreakdown && next.length > 0) {
      setTotalQty(next.reduce((s, item) => s + item.totalQty, 0));
      setUsedOrSoldQty(next.reduce((s, item) => s + item.usedOrSoldQty, 0));
    }
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormError('');
    setCategory('for_sale');
    const defaultSub = PRODUCT_GROUPS[0];
    setSubCategory(defaultSub);

    const defSleeve = 'Lengan Pendek';
    const defStyle = 'Oversize';
    const defGraphic = 'Samurai';
    const defColor = 'Hitam';
    const nextNum = String(inventory.length + 1).padStart(2, '0');

    setProductSleeve(defSleeve);
    setDesignStyle(defStyle);
    setDesignGraphic(defGraphic);
    setProductColor(defColor);
    setDesignNumber(nextNum);

    const initialName = composeProductNameFromSpecs({
      subCategory: defaultSub,
      productSleeve: defSleeve,
      designStyle: defStyle,
      designGraphic: defGraphic,
      productColor: defColor,
      designNumber: nextNum
    });
    setName(initialName);
    setAutoComposeName(true);

    const initialSku = generateStructuredSku({
      productSleeve: defSleeve,
      designStyle: defStyle,
      designGraphic: defGraphic,
      productColor: defColor,
      designNumber: nextNum,
      category: 'for_sale'
    });
    setSku(initialSku);
    setAutoSkuEnabled(true);

    setUnit('pcs');
    setProductAvailabilityStatus('available');
    setLocation('Rak Gudang Utama • Etalase Shopee & TikTok');
    setNotes('');

    const initialVars: InventoryVariantStock[] = ['S', 'M', 'L', 'XL'].map((sz, idx) => ({
      id: `VAR-NEW-${idx}`,
      variantName: sz,
      skuCode: generateVariantSkuCode(initialSku, sz),
      totalQty: 15,
      usedOrSoldQty: 0,
      remainingQty: 15,
      isAvailable: true
    }));
    setUseVariantBreakdown(true);
    setVariants(initialVars);
    setTotalQty(60);
    setUsedOrSoldQty(0);
    setIsFormOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setFormError('');
    setCategory(item.category);
    setSubCategory(item.subCategory);

    setProductSleeve(item.productSleeve || 'Lengan Pendek');
    setDesignStyle(item.designStyle || 'Regular Fit');
    setDesignGraphic(item.designGraphic || 'Polos');
    setProductColor(item.productColor || 'Hitam');
    setDesignNumber(item.designNumber || '01');

    setName(item.name);
    setAutoComposeName(false);
    setSku(item.sku);
    setAutoSkuEnabled(false);

    setUnit(item.unit);
    setProductAvailabilityStatus(getItemAvailabilityStatus(item));
    setTotalQty(item.totalQty);
    setUsedOrSoldQty(item.usedOrSoldQty);
    setLocation(item.location || '');
    setNotes(item.notes || '');

    if (item.variants && item.variants.length > 0) {
      setUseVariantBreakdown(true);
      setVariants(item.variants.map(v => ({ ...v, isAvailable: isVariantAvailable(v) })));
    } else {
      setUseVariantBreakdown(false);
      setVariants([]);
    }
    setIsFormOpen(true);
  };

  const handleCopySku = (skuText: string, idKey: string) => {
    navigator.clipboard.writeText(skuText);
    setCopiedSkuId(idKey);
    setTimeout(() => setCopiedSkuId(null), 1800);
  };

  const handleCopyStockSummary = () => {
    const lines: string[] = [
      '🏷️ *DAFTAR KODE SKU & STOCK PRODUK — THREE MISTER*',
      `Update: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}`,
      '--------------------------------------------'
    ];

    inventory.forEach((item, idx) => {
      const rem = Math.max(0, item.totalQty - item.usedOrSoldQty);
      const status = getItemAvailabilityStatus(item);
      const statusLabel =
        status === 'available'
          ? '✅ TERSEDIA'
          : status === 'not_for_sale'
          ? '🚫 TIDAK DIJUAL (Stock Tidak Terhitung)'
          : '❌ TIDAK TERSEDIA / HABIS';
      const specSummary = [
        item.productSleeve ? `Produk: ${item.productSleeve}` : '',
        item.designStyle ? `Style: ${item.designStyle}` : '',
        item.designGraphic ? `Gambar: ${item.designGraphic}` : '',
        item.productColor ? `Warna: ${item.productColor}` : '',
        item.designNumber ? `No. Desain: #${item.designNumber}` : ''
      ]
        .filter(Boolean)
        .join(' | ');

      const varDetails = (item.variants || [])
        .map(v => {
          const vRem = Math.max(0, v.totalQty - v.usedOrSoldQty);
          const vAvail = isVariantAvailable(v) && vRem > 0;
          return `${v.variantName}: ${vAvail ? `${vRem} Ready` : 'Habis'} [${v.skuCode}]`;
        })
        .join(' | ');

      lines.push(
        `${idx + 1}. *[${item.sku}] ${item.name}*`,
        specSummary ? `   • Spesifikasi SKU: ${specSummary}` : '',
        `   • Status: ${statusLabel} | Sisa Stok: ${rem} ${item.unit} (Masuk: ${item.totalQty}, Keluar: ${item.usedOrSoldQty})`,
        varDetails ? `   • Ukuran/Varian: ${varDetails}` : ''
      );
    });

    navigator.clipboard.writeText(lines.filter(Boolean).join('\n'));
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2200);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const effectiveCategory: InventoryCategory =
      productAvailabilityStatus === 'not_for_sale' ? 'internal_use' : category;

    const finalSku =
      sku.trim() ||
      generateStructuredSku({
        productSleeve,
        designStyle,
        designGraphic,
        productColor,
        designNumber,
        category: effectiveCategory
      });

    const finalName =
      name.trim() ||
      composeProductNameFromSpecs({
        subCategory,
        productSleeve,
        designStyle,
        designGraphic,
        productColor,
        designNumber
      });

    if (!finalSku || !finalName) {
      setFormError('Harap lengkapi spesifikasi Kode SKU dan Nama Produk.');
      return;
    }

    const finalTotalQty =
      useVariantBreakdown && variants.length > 0
        ? variants.reduce((s, v) => s + v.totalQty, 0)
        : totalQty;
    const finalUsedOrSoldQty =
      useVariantBreakdown && variants.length > 0
        ? variants.reduce((s, v) => s + v.usedOrSoldQty, 0)
        : usedOrSoldQty;

    if (finalUsedOrSoldQty > finalTotalQty) {
      setFormError('Jumlah Keluar / Terjual tidak boleh melebihi Total Stok Masuk.');
      return;
    }

    const remainingQty = Math.max(0, finalTotalQty - finalUsedOrSoldQty);
    const defaultUnitCost = editingItem ? editingItem.unitCost : effectiveCategory === 'for_sale' ? 60000 : 50000;
    const defaultSellingPrice = editingItem ? editingItem.sellingPrice || 0 : effectiveCategory === 'for_sale' ? 165000 : 0;
    const defaultAccountCode = editingItem
      ? editingItem.accountCode
      : effectiveCategory === 'for_sale'
      ? '1-1005'
      : subCategory.toLowerCase().includes('peralatan')
      ? '1-2001'
      : '1-1006';

    const normalizedVariants: InventoryVariantStock[] | undefined =
      useVariantBreakdown && variants.length > 0
        ? variants.map(v => {
            const vRem = Math.max(0, v.totalQty - v.usedOrSoldQty);
            return {
              ...v,
              skuCode: v.skuCode.trim() || generateVariantSkuCode(finalSku, v.variantName),
              remainingQty: vRem,
              isAvailable: v.isAvailable !== undefined ? v.isAvailable : vRem > 0
            };
          })
        : undefined;

    const finalStatus: ProductAvailabilityStatus =
      productAvailabilityStatus === 'not_for_sale'
        ? 'not_for_sale'
        : productAvailabilityStatus === 'available' && remainingQty > 0
        ? 'available'
        : 'unavailable';

    const newItem: InventoryItem = {
      id: editingItem ? editingItem.id : `INV-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      sku: finalSku.toUpperCase(),
      name: finalName,
      productSleeve: productSleeve.trim(),
      designStyle: designStyle.trim(),
      designGraphic: designGraphic.trim(),
      productColor: productColor.trim(),
      designNumber: designNumber.trim(),
      category: effectiveCategory,
      subCategory,
      unit: unit.trim() || 'pcs',
      totalQty: finalTotalQty,
      usedOrSoldQty: finalUsedOrSoldQty,
      remainingQty,
      isAvailable: finalStatus === 'available',
      availabilityStatus: finalStatus,
      unitCost: defaultUnitCost,
      sellingPrice: defaultSellingPrice,
      totalRemainingValue: remainingQty * defaultUnitCost,
      accountCode: defaultAccountCode,
      variants: normalizedVariants,
      location: location.trim(),
      notes: notes.trim(),
      updatedAt: new Date().toISOString()
    };

    if (editingItem) {
      onEditInventory(newItem);
    } else {
      onAddInventory(newItem);
    }
    setIsFormOpen(false);
  };

  const formTotalQty =
    useVariantBreakdown && variants.length > 0
      ? variants.reduce((s, v) => s + v.totalQty, 0)
      : totalQty;
  const formUsedQty =
    useVariantBreakdown && variants.length > 0
      ? variants.reduce((s, v) => s + v.usedOrSoldQty, 0)
      : usedOrSoldQty;
  const formRemainingQty = Math.max(0, formTotalQty - formUsedQty);

  // Live preview of individual SKU segment codes
  const previewPrefix = category === 'internal_use' ? 'OP' : 'TM';
  const previewSleeveCode = getSleeveCode(productSleeve);
  const previewStyleCode = getStyleCode(designStyle);
  const previewGraphicCode = getGraphicCode(designGraphic);
  const previewColorCode = getColorCode(productColor);
  const previewNumberCode = getDesignNumberCode(designNumber);

  return (
    <div id="stock-sku-manager" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#580001]/10 text-[#580001] text-[11px] font-bold uppercase tracking-wider">
              <Tag className="w-3.5 h-3.5" />
              <span>Menu Khusus Stock & Kode SKU Otomatis (Terpisah dari Valuasi Harga Inventory)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Kode SKU Otomatis, Jumlah Produk & Status Ketersediaan Stock
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-3xl leading-relaxed">
              Buat <strong>Kode SKU Otomatis</strong> berdasarkan <strong>Produk (Lengan Pendek / Panjang), Style Desain, Gambar Desain, Warna, dan Nomor Desain</strong> yang tergabung langsung ke <strong>Jumlah Produk (Stock)</strong> serta <strong>Status Tersedia / Tidak Tersedia</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleCopyStockSummary}
              className="inline-flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 text-xs font-bold px-3.5 py-2.5 rounded-xl transition cursor-pointer"
            >
              {copiedSummary ? (
                <>
                  <Check className="w-4 h-4 text-emerald-700" />
                  <span>Daftar SKU & Stok Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-[#580001]" />
                  <span>Salin Daftar SKU & Stok</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 bg-[#580001] hover:bg-[#430001] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Buat Kode SKU & Stock Baru</span>
            </button>
          </div>
        </div>

        {/* Link Banner to Inventory Valuation */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/70">
          <div className="flex items-center gap-2.5 text-xs text-slate-600">
            <Package className="w-4 h-4 text-[#580001] shrink-0" />
            <span>
              Halaman ini fokus pada <strong>Kode SKU, Jumlah Produk, dan Edit Status Tersedia/Habis</strong> agar tidak membingungkan. Ingin melihat <strong>Nilai Total Harga (Rp)</strong> barang belum terjual & barang dipakai?
            </span>
          </div>
          <button
            type="button"
            onClick={onNavigateToInventory}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-[#580001] border border-slate-200 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer shadow-2xs"
          >
            <Package className="w-3.5 h-3.5" />
            <span>Lihat Nilai Total Harga di Menu Inventory</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3 Pure Stock & SKU Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Total Kode SKU & Varian */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-[#580001] bg-[#580001]/10 px-2.5 py-1 rounded-lg">
              <Tag className="w-3.5 h-3.5" />
              Total Kode SKU Terdaftar
            </span>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              Auto-SKU 5 Spesifikasi
            </span>
          </div>
          <div>
            <div className="text-3xl font-black font-mono text-slate-900">
              {stockMetrics.totalSkuCount} <span className="text-sm font-sans font-bold text-slate-500">SKU Produk</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Tergabung dalam <strong>{stockMetrics.totalSubSkuCount} Sub-SKU</strong> ukuran/varian.
            </p>
          </div>
        </div>

        {/* Card 2: Total Jumlah Produk (Stok Masuk, Keluar, Sisa, Stock Tidak Terhitung) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-amber-900 bg-amber-100 px-2.5 py-1 rounded-lg">
              <Layers className="w-3.5 h-3.5" />
              Total Jumlah Stock Produk
            </span>
            <span className="text-[10px] font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              Real-time Qty
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-1">
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/80">
              <span className="text-[10px] text-slate-400 block">Stok Masuk</span>
              <span className="font-mono font-bold text-sm text-slate-800">{stockMetrics.totalInQty}</span>
            </div>
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/80">
              <span className="text-[10px] text-slate-400 block">Keluar/Terjual</span>
              <span className="font-mono font-bold text-sm text-slate-700">{stockMetrics.totalOutQty}</span>
            </div>
            <div className="bg-amber-50 p-2 rounded-xl border border-amber-300">
              <span className="text-[10px] font-bold text-amber-900 block">Sisa Stock</span>
              <span className="font-mono font-black text-sm text-[#580001]">{stockMetrics.totalRemainingQty}</span>
            </div>
            <div
              onClick={() => setAvailabilityFilter('NOT_FOR_SALE')}
              className="bg-slate-100 hover:bg-slate-200/80 p-2 rounded-xl border border-slate-300 cursor-pointer transition"
              title="Otomatis dari produk berstatus Tidak Dijual"
            >
              <span className="text-[9px] font-bold text-slate-700 block leading-tight">
                Stock Tidak Terhitung
              </span>
              <span className="font-mono font-black text-sm text-slate-900">
                {stockMetrics.uncountedStockQty}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Status Ketersediaan Produk */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Status Ketersediaan Produk
            </span>
            <span className="text-[10px] font-semibold text-slate-400">Bisa Di-Edit Langsung</span>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div
              onClick={() => setAvailabilityFilter('AVAILABLE')}
              className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200 cursor-pointer hover:bg-emerald-100/70 transition"
            >
              <span className="text-[10px] font-bold text-emerald-800 block">✅ Produk Tersedia</span>
              <span className="font-mono font-black text-base sm:text-lg text-emerald-950">
                {stockMetrics.availableProductCount} Produk
              </span>
            </div>
            <div
              onClick={() => setAvailabilityFilter('UNAVAILABLE')}
              className="p-2.5 rounded-xl bg-rose-50/80 border border-rose-200 cursor-pointer hover:bg-rose-100/70 transition"
            >
              <span className="text-[10px] font-bold text-rose-800 block">❌ Tidak Tersedia / Habis</span>
              <span className="font-mono font-black text-base sm:text-lg text-rose-950">
                {stockMetrics.unavailableProductCount} Produk
              </span>
            </div>
            <div
              onClick={() => setAvailabilityFilter('NOT_FOR_SALE')}
              className="p-2.5 rounded-xl bg-slate-100 border border-slate-300 cursor-pointer hover:bg-slate-200/80 transition"
              title="Otomatis masuk ke Stock Tidak Terhitung"
            >
              <span className="text-[10px] font-bold text-slate-700 block">🚫 Produk Tidak Dijual</span>
              <span className="font-mono font-black text-base sm:text-lg text-slate-900">
                {stockMetrics.notForSaleProductCount} Produk
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5" />
              Filter Ketersediaan:
            </span>
            <button
              type="button"
              onClick={() => setAvailabilityFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                availabilityFilter === 'ALL'
                  ? 'bg-[#580001] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua ({inventory.length})
            </button>
            <button
              type="button"
              onClick={() => setAvailabilityFilter('AVAILABLE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                availabilityFilter === 'AVAILABLE'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Tersedia / Ready ({stockMetrics.availableProductCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setAvailabilityFilter('UNAVAILABLE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                availabilityFilter === 'UNAVAILABLE'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
              }`}
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Tidak Tersedia / Habis ({stockMetrics.unavailableProductCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setAvailabilityFilter('NOT_FOR_SALE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                availabilityFilter === 'NOT_FOR_SALE'
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Tidak di jual ({stockMetrics.notForSaleProductCount})</span>
            </button>

            {allUniqueVariantNames.length > 0 && (
              <select
                value={variantFilter}
                onChange={e => setVariantFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#580001] focus:outline-none"
              >
                <option value="ALL">Semua Ukuran / Varian</option>
                {allUniqueVariantNames.map(vName => (
                  <option key={vName} value={vName}>
                    Cek Ukuran Tersedia: {vName}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="relative w-full lg:max-w-xs">
            <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari Kode SKU, warna, desain, ukuran..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#580001] focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Main Stock & SKU Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[980px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/60 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">Kode SKU, Nama Produk & Detail Desain</th>
                <th className="py-3.5 px-4 text-center">Status Tersedia (Klik untuk Ubah)</th>
                <th className="py-3.5 px-4 text-center">Jumlah Produk (Stok Masuk / Keluar / Sisa)</th>
                <th className="py-3.5 px-4">Rincian Stock Ukuran / Varian & Sub-SKU (Bisa Di-Edit)</th>
                <th className="py-3.5 px-4 text-right">Edit SKU & Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredItems.length > 0 ? (
                filteredItems.map(item => {
                  const remainingQty = Math.max(0, item.totalQty - item.usedOrSoldQty);
                  const productAvail = isItemAvailable(item) && remainingQty > 0;
                  const isInlineEditing = inlineEditingId === item.id;
                  const hasSpecTags =
                    item.productSleeve ||
                    item.designStyle ||
                    item.designGraphic ||
                    item.productColor ||
                    item.designNumber;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition align-top">
                      {/* 1. Kode SKU, Nama Produk & 5 Detail Desain */}
                      <td className="py-4 px-4 max-w-[300px]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleCopySku(item.sku, item.id)}
                            className="inline-flex items-center gap-1.5 font-mono text-xs font-black bg-[#580001] text-white px-2.5 py-1 rounded-lg hover:bg-[#430001] transition cursor-pointer shadow-2xs"
                            title="Klik untuk salin Kode SKU"
                          >
                            <Tag className="w-3 h-3 text-amber-300" />
                            <span>{item.sku}</span>
                            {copiedSkuId === item.id ? (
                              <Check className="w-3 h-3 text-emerald-300" />
                            ) : (
                              <Copy className="w-3 h-3 opacity-70" />
                            )}
                          </button>

                          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                            {item.subCategory}
                          </span>
                        </div>

                        <div className="font-bold text-slate-900 mt-2 text-xs sm:text-sm leading-snug">
                          {item.name}
                        </div>

                        {/* 5 SKU Attribute Badges */}
                        {hasSpecTags && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {item.productSleeve && (
                              <span className="text-[10px] font-bold bg-amber-50 text-amber-950 border border-amber-200 px-1.5 py-0.5 rounded">
                                👕 {item.productSleeve}
                              </span>
                            )}
                            {item.designStyle && (
                              <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                                Style: {item.designStyle}
                              </span>
                            )}
                            {item.designGraphic && (
                              <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                                Gambar: {item.designGraphic}
                              </span>
                            )}
                            {item.productColor && (
                              <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                                Warna: {item.productColor}
                              </span>
                            )}
                            {item.designNumber && (
                              <span className="text-[10px] font-mono font-bold bg-[#580001]/10 text-[#580001] px-1.5 py-0.5 rounded">
                                No. #{item.designNumber}
                              </span>
                            )}
                          </div>
                        )}

                        {item.location && (
                          <div className="inline-flex items-center gap-1 text-[10px] text-slate-500 mt-1.5">
                            <MapPin className="w-3 h-3 text-[#580001]" />
                            <span>{item.location}</span>
                          </div>
                        )}
                      </td>

                      {/* 2. Status Tersedia / Tidak Tersedia / Produk Tidak Dijual */}
                      <td className="py-4 px-4 text-center">
                        {(() => {
                          const currentStatus = getItemAvailabilityStatus(item);
                          return (
                            <div className="flex flex-col items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleCycleProductAvailability(item)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border shadow-2xs ${
                                  currentStatus === 'available'
                                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                                    : currentStatus === 'not_for_sale'
                                    ? 'bg-slate-800 hover:bg-slate-900 text-white border-slate-700'
                                    : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300'
                                }`}
                                title="Klik untuk mengubah status ketersediaan"
                              >
                                {currentStatus === 'available' ? (
                                  <>
                                    <ToggleRight className="w-4 h-4 text-emerald-600" />
                                    <span>Tersedia</span>
                                  </>
                                ) : currentStatus === 'not_for_sale' ? (
                                  <>
                                    <ShieldAlert className="w-4 h-4 text-amber-300" />
                                    <span>Produk Tidak Dijual</span>
                                  </>
                                ) : (
                                  <>
                                    <ToggleLeft className="w-4 h-4 text-rose-600" />
                                    <span>Tidak Tersedia</span>
                                  </>
                                )}
                              </button>

                              {/* Quick 3-status selector */}
                              <div className="inline-flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
                                <button
                                  type="button"
                                  onClick={() => handleSetProductStatus(item, 'available')}
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer transition ${
                                    currentStatus === 'available'
                                      ? 'bg-emerald-600 text-white'
                                      : 'text-slate-500 hover:text-slate-900'
                                  }`}
                                >
                                  Tersedia
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSetProductStatus(item, 'unavailable')}
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer transition ${
                                    currentStatus === 'unavailable'
                                      ? 'bg-rose-600 text-white'
                                      : 'text-slate-500 hover:text-slate-900'
                                  }`}
                                >
                                  Habis
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSetProductStatus(item, 'not_for_sale')}
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer transition ${
                                    currentStatus === 'not_for_sale'
                                      ? 'bg-slate-800 text-white'
                                      : 'text-slate-500 hover:text-slate-900'
                                  }`}
                                  title="Otomatis masuk ke Stock Tidak Terhitung"
                                >
                                  Tidak Dijual
                                </button>
                              </div>

                              {currentStatus === 'not_for_sale' && (
                                <span className="text-[10px] font-semibold text-slate-500">
                                  Masuk Stock Tidak Terhitung ({remainingQty} {item.unit})
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      {/* 3. Jumlah Produk + Inline Edit */}
                      <td className="py-4 px-4 text-center">
                        {isInlineEditing ? (
                          <div className="bg-amber-50/80 p-2.5 rounded-xl border border-amber-300 space-y-2 max-w-[200px] mx-auto">
                            <div className="grid grid-cols-2 gap-1.5 text-left">
                              <div>
                                <label className="text-[9px] font-bold text-slate-600 block">Stok Masuk</label>
                                <input
                                  type="number"
                                  min={0}
                                  value={inlineTotalQty}
                                  onChange={e => setInlineTotalQty(Math.max(0, parseInt(e.target.value) || 0))}
                                  className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono font-bold text-center"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] font-bold text-slate-600 block">Terjual/Keluar</label>
                                <input
                                  type="number"
                                  min={0}
                                  max={inlineTotalQty}
                                  value={inlineUsedQty}
                                  onChange={e => setInlineUsedQty(Math.max(0, parseInt(e.target.value) || 0))}
                                  className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono font-bold text-center"
                                />
                              </div>
                            </div>
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleSaveInlineEdit(item)}
                                className="px-2.5 py-1 bg-[#580001] text-white rounded-lg text-[10px] font-bold cursor-pointer"
                              >
                                Simpan
                              </button>
                              <button
                                type="button"
                                onClick={() => setInlineEditingId(null)}
                                className="px-2 py-1 bg-white text-slate-600 border border-slate-200 rounded-lg text-[10px] font-bold cursor-pointer"
                              >
                                Batal
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200/90 px-3 py-1.5 rounded-xl">
                              <div className="text-center">
                                <span className="text-[9px] text-slate-400 block">Masuk</span>
                                <span className="font-mono font-bold text-xs text-slate-700">{item.totalQty}</span>
                              </div>
                              <div className="h-5 w-px bg-slate-200" />
                              <div className="text-center">
                                <span className="text-[9px] text-slate-400 block">Keluar</span>
                                <span className="font-mono font-bold text-xs text-slate-600">{item.usedOrSoldQty}</span>
                              </div>
                              <div className="h-5 w-px bg-slate-200" />
                              <div className="text-center">
                                <span className="text-[9px] font-bold text-amber-900 block">Tersedia</span>
                                <span className="font-mono font-black text-xs text-[#580001]">
                                  {remainingQty} {item.unit}
                                </span>
                              </div>
                            </div>
                            <div>
                              <button
                                type="button"
                                onClick={() => handleStartInlineEdit(item)}
                                className="text-[10px] font-bold text-[#580001] hover:underline cursor-pointer"
                              >
                                ✎ Edit Cepat Jumlah
                              </button>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* 4. Rincian Stock Ukuran / Varian & Sub-SKU */}
                      <td className="py-4 px-4 max-w-[390px]">
                        {item.variants && item.variants.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {item.variants.map(v => {
                              const vRem = Math.max(0, v.totalQty - v.usedOrSoldQty);
                              const vAvail = isVariantAvailable(v) && vRem > 0;

                              return (
                                <div
                                  key={v.id}
                                  className={`rounded-xl border px-2.5 py-2 transition flex flex-col justify-between min-w-[115px] ${
                                    vAvail
                                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                                      : 'bg-rose-50/60 border-rose-200 text-rose-800 opacity-85'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-black text-xs">{v.variantName}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleVariantAvailability(item, v.id)}
                                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer border transition ${
                                        vAvail
                                          ? 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700'
                                          : 'bg-rose-600 text-white border-rose-700 hover:bg-rose-700'
                                      }`}
                                      title="Klik untuk ubah status Tersedia / Habis pada ukuran ini"
                                    >
                                      {vAvail ? 'Tersedia' : 'Habis'}
                                    </button>
                                  </div>

                                  <div className="font-mono text-[10px] text-slate-500 mt-1 truncate" title={v.skuCode}>
                                    {v.skuCode}
                                  </div>

                                  <div className="flex items-center justify-between gap-1.5 mt-1.5 pt-1.5 border-t border-black/5">
                                    <span className="font-mono font-black text-xs text-slate-900">
                                      {vRem} {item.unit}
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        disabled={vRem <= 0}
                                        onClick={() => handleQuickAdjustVariantQty(item, v.id, 'minus_avail')}
                                        className="px-1.5 py-0.5 bg-white hover:bg-[#580001] hover:text-white disabled:opacity-30 text-slate-700 rounded text-[10px] font-bold border border-slate-200 cursor-pointer"
                                        title="Kurangi 1 stok"
                                      >
                                        -1
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleQuickAdjustVariantQty(item, v.id, 'plus_avail')}
                                        className="px-1.5 py-0.5 bg-white hover:bg-emerald-600 hover:text-white text-emerald-800 rounded text-[10px] font-bold border border-slate-200 cursor-pointer"
                                        title="Tambah 1 stok"
                                      >
                                        +1
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">Tanpa rincian ukuran</span>
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(item)}
                              className="text-[11px] font-bold text-[#580001] hover:underline cursor-pointer"
                            >
                              + Atur Ukuran & Sub-SKU
                            </button>
                          </div>
                        )}
                      </td>

                      {/* 5. Tombol Edit Lengkap & Hapus */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-[#580001] hover:text-white text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit SKU & Stock</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(item)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                            title="Hapus Produk"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Tag className="w-8 h-8 text-slate-300" />
                      <p className="text-sm font-medium text-slate-600">
                        Tidak ada data SKU / Stock yang sesuai dengan filter pencarian.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= MODAL BUAT / EDIT KODE SKU & STOCK PRODUK ================= */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-[#580001]/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full overflow-hidden my-8 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-[#580001]/5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#580001] text-white">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-[#580001] text-sm sm:text-base">
                    {editingItem
                      ? 'Edit Kode SKU Otomatis & Stock Produk'
                      : 'Buat Kode SKU Otomatis & Stock Produk Baru'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Kode SKU otomatis tersusun dari: Produk (Lengan Pendek/Panjang), Style Desain, Gambar Desain, Warna & Nomor Desain.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[85vh] overflow-y-auto">
              {formError && (
                <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Quick Fill from HPP Calculator */}
              {savedHppArticles.length > 0 && (
                <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-amber-950 flex items-center gap-1.5">
                    <Shirt className="w-3.5 h-3.5 text-[#580001]" />
                    <span>Ambil Nama Produk dari Kalkulator HPP:</span>
                  </span>
                  <select
                    defaultValue=""
                    onChange={e => {
                      const art = savedHppArticles.find(a => a.id === e.target.value);
                      if (art) {
                        setName(art.productName);
                        setAutoComposeName(false);
                        const lower = art.productName.toLowerCase();
                        const detectedSleeve = lower.includes('panjang') ? 'Lengan Panjang' : 'Lengan Pendek';
                        handleSpecFieldChange({ productSleeve: detectedSleeve });
                      }
                    }}
                    className="px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-semibold text-slate-800"
                  >
                    <option value="" disabled>
                      ⚡ Pilih Artikel HPP untuk Isi Cepat...
                    </option>
                    {savedHppArticles.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.productName} (Batch: {a.qty} pcs)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* ================= STEP 1: NAMA PRODUK & KOLOM KODE SKU OTOMATIS (5 ATRIBUT WAJIB) ================= */}
              <div className="bg-[#580001]/5 p-4 sm:p-5 rounded-2xl border border-[#580001]/20 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2 border-b border-[#580001]/10 pb-3">
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-[#580001] flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      1. Nama Produk & Kolom Kode SKU Otomatis
                    </span>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Isi 5 detail produk di bawah ini: <strong>Produk (Lengan Pendek / Panjang), Style Desain, Gambar Desain, Warna, dan Nomor Desain</strong> untuk menghasilkan Kode SKU otomatis.
                    </p>
                  </div>

                  <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#580001] bg-white px-3 py-1.5 rounded-xl border border-[#580001]/20 cursor-pointer shadow-2xs">
                    <input
                      type="checkbox"
                      checked={autoSkuEnabled}
                      onChange={e => {
                        const checked = e.target.checked;
                        setAutoSkuEnabled(checked);
                        if (checked) {
                          handleTriggerAutoSku();
                        }
                      }}
                      className="rounded text-[#580001]"
                    />
                    <span>Otomatis Susun Kode SKU</span>
                  </label>
                </div>

                {/* 5 KOMPONEN PEMBENTUK KODE SKU OTOMATIS */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
                  {/* (1) PRODUK = LENGAN PENDEK DAN PANJANG */}
                  <div className="sm:col-span-5">
                    <label className="block text-slate-800 text-[11px] font-black mb-1.5 uppercase flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Shirt className="w-3.5 h-3.5 text-[#580001]" />
                        1. Produk (Lengan Pendek / Panjang)
                      </span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#580001]/10 text-[#580001]">
                        Kode: {previewSleeveCode}
                      </span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {SLEEVE_OPTIONS.map(opt => {
                        const isSelected = productSleeve.toLowerCase() === opt.label.toLowerCase();
                        return (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={() => handleSpecFieldChange({ productSleeve: opt.label })}
                            className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                              isSelected
                                ? 'bg-[#580001] text-white border-[#580001] shadow-xs'
                                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            <span>{opt.label}</span>
                            <span
                              className={`text-[9px] font-mono ${
                                isSelected ? 'text-amber-300' : 'text-slate-400'
                              }`}
                            >
                              SKU: {opt.code}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* (2) STYLE DESAIN */}
                  <div className="sm:col-span-4">
                    <label className="block text-slate-800 text-[11px] font-black mb-1.5 uppercase flex items-center justify-between">
                      <span>2. Style Desain</span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#580001]/10 text-[#580001]">
                        Kode: {previewStyleCode}
                      </span>
                    </label>
                    <input
                      type="text"
                      value={designStyle}
                      onChange={e => handleSpecFieldChange({ designStyle: e.target.value })}
                      placeholder="Contoh: Oversize, Regular Fit, Boxy..."
                      className="w-full px-3 py-2 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#580001]"
                    />
                  </div>

                  {/* (3) NOMOR DESAIN */}
                  <div className="sm:col-span-3">
                    <label className="block text-slate-800 text-[11px] font-black mb-1.5 uppercase flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Hash className="w-3 h-3 text-[#580001]" />
                        5. Nomor Desain
                      </span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#580001]/10 text-[#580001]">
                        Kode: {previewNumberCode}
                      </span>
                    </label>
                    <input
                      type="text"
                      value={designNumber}
                      onChange={e => handleSpecFieldChange({ designNumber: e.target.value })}
                      placeholder="Contoh: 01, 02, 03..."
                      className="w-full px-3 py-2 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-center focus:outline-none focus:border-[#580001]"
                    />
                  </div>

                  {/* (4) GAMBAR DESAIN */}
                  <div className="sm:col-span-6">
                    <label className="block text-slate-800 text-[11px] font-black mb-1.5 uppercase flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <ImageIcon className="w-3.5 h-3.5 text-[#580001]" />
                        3. Gambar Desain (Tema Artwork / Sablon)
                      </span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#580001]/10 text-[#580001]">
                        Kode: {previewGraphicCode}
                      </span>
                    </label>
                    <input
                      type="text"
                      value={designGraphic}
                      onChange={e => handleSpecFieldChange({ designGraphic: e.target.value })}
                      placeholder="Contoh: Samurai, Typography, Sablon Plastisol, Dragon..."
                      className="w-full px-3 py-2 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#580001]"
                    />
                  </div>

                  {/* (5) WARNA PRODUK */}
                  <div className="sm:col-span-6">
                    <label className="block text-slate-800 text-[11px] font-black mb-1.5 uppercase flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Palette className="w-3.5 h-3.5 text-[#580001]" />
                        4. Warna Produk
                      </span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#580001]/10 text-[#580001]">
                        Kode: {previewColorCode}
                      </span>
                    </label>
                    <input
                      type="text"
                      value={productColor}
                      onChange={e => handleSpecFieldChange({ productColor: e.target.value })}
                      placeholder="Contoh: Hitam, Putih, Navy, Maroon, Army..."
                      className="w-full px-3 py-2 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#580001]"
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {COLOR_PRESETS.map(clr => (
                        <button
                          key={clr}
                          type="button"
                          onClick={() => handleSpecFieldChange({ productColor: clr })}
                          className={`text-[9px] px-1.5 py-0.5 rounded border font-bold cursor-pointer transition ${
                            productColor.toLowerCase() === clr.toLowerCase()
                              ? 'bg-[#580001] text-white border-[#580001]'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                          }`}
                        >
                          {clr}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* BARIS NAMA PRODUK & HASIL KOLOM KODE SKU OTOMATIS */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 pt-1">
                  {/* Nama Produk */}
                  <div className="sm:col-span-6">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-slate-700 text-[11px] font-bold uppercase">
                        Nama Produk Lengkap
                      </label>
                      <button
                        type="button"
                        onClick={handleComposeNameFromSpecs}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-[#580001] hover:underline cursor-pointer"
                      >
                        <RefreshCw className="w-2.5 h-2.5" />
                        <span>Susun dari 5 Spesifikasi</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      value={name}
                      onChange={e => handleProductNameChange(e.target.value)}
                      placeholder="Otomatis tersusun atau ketik nama produk..."
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#580001]"
                    />
                  </div>

                  {/* Kolom Kode SKU Otomatis */}
                  <div className="sm:col-span-6">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-slate-700 text-[11px] font-bold uppercase">
                        Kolom Kode SKU Otomatis
                      </label>
                      <button
                        type="button"
                        onClick={handleTriggerAutoSku}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-[#580001] hover:underline cursor-pointer"
                      >
                        <RefreshCw className="w-2.5 h-2.5" />
                        <span>Generate Ulang SKU</span>
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={sku}
                        onFocus={() => {
                          if (!sku.trim() || autoSkuEnabled) {
                            handleTriggerAutoSku();
                          }
                        }}
                        onChange={e => {
                          const val = e.target.value.toUpperCase();
                          setSku(val);
                          setAutoSkuEnabled(false);
                          setVariants(prev => syncVariantSkusWithBase(val, prev));
                        }}
                        placeholder="TM-LP-OVS-SMR-BLK-01"
                        className="w-full px-3.5 py-2.5 bg-white border-2 border-[#580001]/40 rounded-xl text-xs font-mono font-black text-[#580001] focus:outline-none focus:border-[#580001]"
                      />
                      {autoSkuEnabled && (
                        <span className="absolute right-2.5 top-2.5 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                          AUTO 5-SPEK
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Visual Formula Breakdown of the 5 SKU Components */}
                <div className="bg-amber-50/90 border border-amber-200/90 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2 text-[10px]">
                  <span className="font-bold text-amber-950">Rincian Rumus Kode SKU:</span>
                  <div className="flex flex-wrap items-center gap-1 font-mono">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-white font-bold">
                      {previewPrefix}
                    </span>
                    <span className="text-slate-400">-</span>
                    <span className="px-2 py-0.5 rounded bg-[#580001] text-white font-bold" title="Produk: Lengan Pendek / Panjang">
                      {previewSleeveCode} ({productSleeve || 'Produk'})
                    </span>
                    <span className="text-slate-400">-</span>
                    <span className="px-2 py-0.5 rounded bg-white border border-amber-300 text-slate-800 font-bold" title="Style Desain">
                      {previewStyleCode} ({designStyle || 'Style'})
                    </span>
                    <span className="text-slate-400">-</span>
                    <span className="px-2 py-0.5 rounded bg-white border border-amber-300 text-slate-800 font-bold" title="Gambar Desain">
                      {previewGraphicCode} ({designGraphic || 'Gambar'})
                    </span>
                    <span className="text-slate-400">-</span>
                    <span className="px-2 py-0.5 rounded bg-white border border-amber-300 text-slate-800 font-bold" title="Warna">
                      {previewColorCode} ({productColor || 'Warna'})
                    </span>
                    <span className="text-slate-400">-</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-700 text-white font-bold" title="Nomor Desain">
                      #{previewNumberCode}
                    </span>
                  </div>
                </div>

                {/* Jenis, Kategori, Status Ketersediaan Utama */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-slate-700 text-[11px] font-bold mb-1 uppercase">
                      Kelompok Produk
                    </label>
                    <select
                      value={subCategory}
                      onChange={e => {
                        const val = e.target.value;
                        const isOp =
                          val.toLowerCase().includes('perlengkapan') || val.toLowerCase().includes('peralatan');
                        const nextCat: InventoryCategory = isOp ? 'internal_use' : 'for_sale';
                        setProductAvailabilityStatus(isOp ? 'not_for_sale' : 'available');
                        handleSpecFieldChange({ subCategory: val, category: nextCat });
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white font-semibold"
                    >
                      {PRODUCT_GROUPS.map(grp => (
                        <option key={grp} value={grp}>
                          {grp}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 text-[11px] font-bold mb-1 uppercase">
                      Satuan & Lokasi Rak
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={unit}
                        onChange={e => setUnit(e.target.value)}
                        placeholder="pcs"
                        className="w-20 px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-center font-bold"
                      />
                      <input
                        type="text"
                        value={location}
                        onChange={e => setLocation(e.target.value)}
                        placeholder="Rak A1 / Etalase"
                        className="flex-1 px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 text-[11px] font-bold mb-1 uppercase">
                      Status Ketersediaan Produk
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setProductAvailabilityStatus('available');
                          setCategory('for_sale');
                        }}
                        className={`px-2 py-2 rounded-xl text-[10px] font-bold border flex items-center justify-center gap-1 cursor-pointer transition ${
                          productAvailabilityStatus === 'available'
                            ? 'bg-emerald-600 text-white border-emerald-700'
                            : 'bg-white hover:bg-emerald-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Tersedia</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setProductAvailabilityStatus('unavailable');
                          setCategory('for_sale');
                        }}
                        className={`px-2 py-2 rounded-xl text-[10px] font-bold border flex items-center justify-center gap-1 cursor-pointer transition ${
                          productAvailabilityStatus === 'unavailable'
                            ? 'bg-rose-600 text-white border-rose-700'
                            : 'bg-white hover:bg-rose-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        <Ban className="w-3.5 h-3.5 shrink-0" />
                        <span>Tidak Tersedia</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setProductAvailabilityStatus('not_for_sale');
                          setCategory('internal_use');
                        }}
                        className={`px-2 py-2 rounded-xl text-[10px] font-bold border flex items-center justify-center gap-1 cursor-pointer transition ${
                          productAvailabilityStatus === 'not_for_sale'
                            ? 'bg-slate-800 text-white border-slate-900'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                        title="Otomatis masuk ke Stock Tidak Terhitung"
                      >
                        <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                        <span>Tidak Dijual</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* STEP 2: Jumlah Produk & Rincian Ukuran/Varian yang Tersedia */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/90 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#580001]" />
                      2. Jumlah Produk & Rincian Ukuran / Stock yang Tersedia
                    </span>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Edit jumlah stok masuk, keluar, dan status Tersedia / Habis untuk setiap ukuran.
                    </p>
                  </div>

                  <label className="inline-flex items-center gap-1.5 text-xs font-bold text-[#580001] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useVariantBreakdown}
                      onChange={e => {
                        const checked = e.target.checked;
                        setUseVariantBreakdown(checked);
                        if (checked && variants.length === 0) {
                          applyVariantPreset(['S', 'M', 'L', 'XL'], 15);
                        }
                      }}
                      className="rounded text-[#580001]"
                    />
                    <span>Gunakan Rincian Ukuran / Varian</span>
                  </label>
                </div>

                {useVariantBreakdown && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-bold text-slate-500 mr-1">Preset Ukuran:</span>
                      <button
                        type="button"
                        onClick={() => applyVariantPreset(['S', 'M', 'L', 'XL', 'XXL'], 15)}
                        className="px-2.5 py-1 bg-white hover:bg-[#580001] hover:text-white text-slate-700 border border-slate-200 rounded-lg text-[10px] font-bold transition cursor-pointer"
                      >
                        Ukuran S - XXL
                      </button>
                      <button
                        type="button"
                        onClick={() => applyVariantPreset(['S', 'M', 'L', 'XL'], 15)}
                        className="px-2.5 py-1 bg-white hover:bg-[#580001] hover:text-white text-slate-700 border border-slate-200 rounded-lg text-[10px] font-bold transition cursor-pointer"
                      >
                        Ukuran S - XL
                      </button>
                      <button
                        type="button"
                        onClick={() => applyVariantPreset(['M', 'L', 'XL'], 20)}
                        className="px-2.5 py-1 bg-white hover:bg-[#580001] hover:text-white text-slate-700 border border-slate-200 rounded-lg text-[10px] font-bold transition cursor-pointer"
                      >
                        Ukuran M - XL
                      </button>
                      <button
                        type="button"
                        onClick={() => applyVariantPreset(['All Size'], 50)}
                        className="px-2.5 py-1 bg-white hover:bg-[#580001] hover:text-white text-slate-700 border border-slate-200 rounded-lg text-[10px] font-bold transition cursor-pointer"
                      >
                        All Size
                      </button>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100/80 text-slate-600 text-[10px] font-bold uppercase">
                            <th className="py-2 px-3">Ukuran / Varian</th>
                            <th className="py-2 px-3">Kode Sub-SKU (Otomatis)</th>
                            <th className="py-2 px-3 text-center">Stok Masuk</th>
                            <th className="py-2 px-3 text-center">Terjual / Keluar</th>
                            <th className="py-2 px-3 text-center">Sisa Stock</th>
                            <th className="py-2 px-3 text-center">Status Tersedia</th>
                            <th className="py-2 px-2 text-center">Hapus</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {variants.map(v => {
                            const vRem = Math.max(0, v.totalQty - v.usedOrSoldQty);
                            const vAvail = (v.isAvailable ?? true) && vRem > 0;
                            return (
                              <tr key={v.id}>
                                <td className="py-2 px-3">
                                  <input
                                    type="text"
                                    value={v.variantName}
                                    onChange={e => handleUpdateVariantRow(v.id, 'variantName', e.target.value)}
                                    className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs font-bold"
                                  />
                                </td>
                                <td className="py-2 px-3">
                                  <input
                                    type="text"
                                    value={v.skuCode}
                                    onChange={e => handleUpdateVariantRow(v.id, 'skuCode', e.target.value)}
                                    className="w-full px-2 py-1 border border-slate-200 rounded-lg text-[11px] font-mono font-bold text-[#580001] bg-slate-50"
                                  />
                                </td>
                                <td className="py-2 px-3">
                                  <input
                                    type="number"
                                    min={0}
                                    value={v.totalQty}
                                    onChange={e => handleUpdateVariantRow(v.id, 'totalQty', e.target.value)}
                                    className="w-20 mx-auto block px-2 py-1 border border-slate-200 rounded-lg text-xs font-mono text-center font-bold"
                                  />
                                </td>
                                <td className="py-2 px-3">
                                  <input
                                    type="number"
                                    min={0}
                                    max={v.totalQty}
                                    value={v.usedOrSoldQty}
                                    onChange={e => handleUpdateVariantRow(v.id, 'usedOrSoldQty', e.target.value)}
                                    className="w-20 mx-auto block px-2 py-1 border border-slate-200 rounded-lg text-xs font-mono text-center"
                                  />
                                </td>
                                <td className="py-2 px-3 text-center font-mono font-black text-slate-900">
                                  {vRem} {unit}
                                </td>
                                <td className="py-2 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateVariantRow(v.id, 'isAvailable', !vAvail)}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                                      vAvail
                                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                                    }`}
                                  >
                                    {vAvail ? '✅ Tersedia' : '❌ Tidak Tersedia'}
                                  </button>
                                </td>
                                <td className="py-2 px-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveVariantRow(v.id)}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newVariantName}
                        onChange={e => setNewVariantName(e.target.value)}
                        placeholder="Tambah ukuran/varian baru (contoh: XXL, 3XL)..."
                        className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomVariant}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah Ukuran</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Total Jumlah Produk Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="block text-slate-600 text-[11px] font-bold mb-1">
                      Total Stok Masuk ({unit})
                    </label>
                    <input
                      type="number"
                      min={0}
                      disabled={useVariantBreakdown && variants.length > 0}
                      value={formTotalQty}
                      onChange={e => setTotalQty(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-2 bg-white disabled:bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 text-[11px] font-bold mb-1">
                      Total Keluar / Terjual ({unit})
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={formTotalQty}
                      disabled={useVariantBreakdown && variants.length > 0}
                      value={formUsedQty}
                      onChange={e => setUsedOrSoldQty(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-2 bg-white disabled:bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-amber-900 text-[11px] font-black mb-1">
                      Sisa Stock Tersedia ({unit})
                    </label>
                    <div className="w-full px-3 py-2 bg-amber-100/80 border border-amber-300 rounded-xl text-xs font-mono font-black text-amber-950">
                      {formRemainingQty} {unit}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#580001] hover:bg-[#430001] text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Kode SKU & Jumlah Stock</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-[#580001]/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">Hapus Kode SKU & Produk</h3>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-800">
                  [{deleteTarget.sku}] {deleteTarget.name}
                </p>
                <p className="text-xs text-slate-500">
                  Apakah Anda yakin ingin menghapus data SKU dan stok produk ini?
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteInventory(deleteTarget.id);
                    setDeleteTarget(null);
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Ya, Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
