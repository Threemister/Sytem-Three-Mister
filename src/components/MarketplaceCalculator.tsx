/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingBag, 
  Store, 
  Calculator, 
  Percent, 
  DollarSign, 
  ArrowRight, 
  TrendingUp, 
  Check, 
  Copy, 
  RotateCcw, 
  HelpCircle, 
  Info, 
  ExternalLink, 
  ShieldCheck, 
  Layers, 
  Sparkles, 
  Award, 
  Flame, 
  Tag, 
  ChevronDown, 
  ChevronUp, 
  BookmarkCheck, 
  Trash2, 
  Printer, 
  AlertCircle,
  Clock,
  ArrowUpRight
} from 'lucide-react';

interface SavedHppOption {
  id: string;
  productName: string;
  hppPerUnit: number;
  totalCost?: number;
  qty?: number;
}

interface MarketplacePricingHistory {
  id: string;
  productName: string;
  hpp: number;
  mode: 'target' | 'simulate';
  targetProfit: number;
  sellingPrice: number;
  date: string;
}

export default function MarketplaceCalculator() {
  // 1. Core Inputs
  const [productName, setProductName] = useState('Kaos Heavyweight 24s Three Mister');
  const [hpp, setHpp] = useState<number>(45000);
  const [calcMode, setCalcMode] = useState<'target' | 'simulate'>('target');
  
  // In Target Mode:
  const [profitType, setProfitType] = useState<'nominal' | 'margin'>('nominal');
  const [targetProfitNominal, setTargetProfitNominal] = useState<number>(35000);
  const [targetProfitMargin, setTargetProfitMargin] = useState<number>(35); // 35% margin on selling price

  // In Simulate Mode:
  const [manualSellingPrice, setManualSellingPrice] = useState<number>(149000); // Harga Jual Etalase
  const [simulateDiscountPercent, setSimulateDiscountPercent] = useState<number>(20); // Persentase Diskon Toko (%)

  // Retail Psychological / Strike-through Price Settings (In Target Mode)
  const [applyDiscountCoret, setApplyDiscountCoret] = useState(true);
  const [discountCoretPercent, setDiscountCoretPercent] = useState<number>(20); // 20% discount badge
  const [autoRoundPsychological, setAutoRoundPsychological] = useState(true); // Round to nearest 900 / 9900

  // 2. Shopee Rules State (2026 Latest Updates)
  const [shopeeSellerType, setShopeeSellerType] = useState<'star' | 'non_star' | 'mall'>('star');
  const [shopeeGratisOngkirXtra, setShopeeGratisOngkirXtra] = useState(true); // 4.0%
  const [shopeeCashbackXtra, setShopeeCashbackXtra] = useState(false); // 1.4%
  const [shopeeOrderFee, setShopeeOrderFee] = useState(1250); // Rp 1.250 flat 2026
  const [shopeePreOrder, setShopeePreOrder] = useState(false); // 3%
  const [shopeeAdsPercent, setShopeeAdsPercent] = useState(0); // Optional promo/ads

  // 3. TikTok Shop (Shop Tokopedia) Rules State (2025/2026 Updates)
  const [tiktokCommissionPercent, setTiktokCommissionPercent] = useState(4.3); // Kategori Apparel 4.3%
  const [tiktokPaymentFeePercent, setTiktokPaymentFeePercent] = useState(2.0); // 2% payment fee
  const [tiktokOrderFee, setTiktokOrderFee] = useState(1250); // Rp 1.250 flat per order
  const [tiktokGratisOngkir, setTiktokGratisOngkir] = useState(true); // 3.0%
  const [tiktokAffiliatePercent, setTiktokAffiliatePercent] = useState(0); // e.g. 0%, 5%, 7%, 10%
  const [tiktokAdsPercent, setTiktokAdsPercent] = useState(0);

  // 4. Lazada Rules State (2024-2026 Updates)
  const [lazadaCommissionPercent, setLazadaCommissionPercent] = useState(6.0); // Kategori A Fashion 6% (naik dari 4%)
  const [lazadaPaymentFeePercent, setLazadaPaymentFeePercent] = useState(2.0); // 2.0%
  const [lazadaOrderFee, setLazadaOrderFee] = useState(1250); // Rp 1.250 flat 2026
  const [lazadaFreeShippingMax, setLazadaFreeShippingMax] = useState(true); // 4.0% max Rp 10.000
  const [lazadaAdsPercent, setLazadaAdsPercent] = useState(0);

  // Saved HPP Benchmarks from HPPCalculator
  const [savedHppList, setSavedHppList] = useState<SavedHppOption[]>([]);
  const [selectedSavedHppId, setSelectedSavedHppId] = useState<string>('');

  // Local Storage Saved Pricing
  const [savedSimulations, setSavedSimulations] = useState<MarketplacePricingHistory[]>([]);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [showExplanationModal, setShowExplanationModal] = useState(false);

  // Load HPP Calculations & saved history from localStorage
  useEffect(() => {
    try {
      const hppData = localStorage.getItem('threemister_hpp_calcs');
      if (hppData) {
        const parsed = JSON.parse(hppData);
        if (Array.isArray(parsed)) {
          const list: SavedHppOption[] = parsed.map((item: any) => ({
            id: item.id,
            productName: item.productName || 'Produk Tanpa Nama',
            hppPerUnit: Number(item.hppPerPiece || item.hppPerUnit) || 0,
            totalCost: Number(item.totalCost) || 0,
            qty: Number(item.qty) || 1
          })).filter(item => item.hppPerUnit > 0);
          setSavedHppList(list);
        }
      }

      const historyData = localStorage.getItem('threemister_marketplace_history');
      if (historyData) {
        setSavedSimulations(JSON.parse(historyData));
      }
    } catch {
      // Ignore parsing errors
    }
  }, []);

  // When user selects a saved HPP product from dropdown
  const handleSelectSavedHpp = (id: string) => {
    setSelectedSavedHppId(id);
    const found = savedHppList.find(item => item.id === id);
    if (found) {
      setProductName(found.productName);
      setHpp(Math.round(found.hppPerUnit));
    }
  };

  // Shopee Admin Fee % based on seller type
  const shopeeAdminPercent = useMemo(() => {
    if (shopeeSellerType === 'non_star') return 8.0;
    if (shopeeSellerType === 'mall') return 11.0;
    return 10.0; // Star / Star+ (Ketentuan 2026 Kategori A Fashion)
  }, [shopeeSellerType]);

  // Helper: Round up price to psychological pricing (e.g. 118432 -> 119000 or 119900)
  const formatPsychologicalPrice = (rawPrice: number) => {
    if (!autoRoundPsychological) return Math.ceil(rawPrice);
    // Round to nearest 1.000 or 900
    const roundedThousand = Math.ceil(rawPrice / 1000) * 1000;
    // Suggest attractive ending e.g. Rp 99.000 or 119.000
    if (roundedThousand % 10000 === 0 && roundedThousand >= 20000) {
      return roundedThousand - 1000; // e.g. 120.000 -> 119.000
    }
    return roundedThousand;
  };

  // ==========================================
  // CALCULATION LOGIC FOR EACH MARKETPLACE
  // ==========================================

  // Desired Profit Target in Rp
  const calculatedTargetProfitRp = useMemo(() => {
    if (profitType === 'nominal') return Math.max(0, targetProfitNominal);
    // If target margin %: Profit = (Margin / (1 - Margin)) * HPP approximately, or Margin * Selling Price
    // But since selling price isn't fixed yet, Margin on Selling Price m implies Profit = HPP * m / (1 - m)
    const m = Math.min(0.9, Math.max(0.01, targetProfitMargin / 100));
    return Math.round((hpp * m) / (1 - m));
  }, [profitType, targetProfitNominal, targetProfitMargin, hpp]);

  // Helper for Simulate Mode: calculate discount and net transaction price
  const effectiveSimulatePrice = useMemo(() => {
    const discPct = Math.min(95, Math.max(0, simulateDiscountPercent));
    const discountNominal = Math.round(manualSellingPrice * (discPct / 100));
    const finalPrice = Math.max(1000, manualSellingPrice - discountNominal);
    return {
      etalasePrice: manualSellingPrice,
      discountPercent: discPct,
      discountNominal,
      finalPrice
    };
  }, [manualSellingPrice, simulateDiscountPercent]);

  // 1. SHOPEE CALCULATION
  const shopeeResult = useMemo(() => {
    const totalPercentRate = 
      (shopeeAdminPercent / 100) + 
      (shopeeGratisOngkirXtra ? 0.04 : 0) + 
      (shopeeCashbackXtra ? 0.014 : 0) + 
      (shopeePreOrder ? 0.03 : 0) + 
      (shopeeAdsPercent / 100);

    const flatFee = shopeeOrderFee;

    let sellPrice = 0;
    let strikePrice = 0;
    let currentDiscountPercent = 0;
    let currentDiscountNominal = 0;

    if (calcMode === 'target') {
      // Formula: SellPrice * (1 - totalPercentRate) - flatFee = HPP + TargetProfit
      // Considering caps on Gratis Ongkir (max Rp 10.000) and Cashback (max Rp 10.000)
      const targetNetPayout = hpp + calculatedTargetProfitRp;
      
      // Preliminary estimate without cap
      let estPrice = (targetNetPayout + flatFee) / Math.max(0.1, 1 - totalPercentRate);
      
      // Fine-tune with caps
      for (let i = 0; i < 3; i++) {
        let pctFee = estPrice * (shopeeAdminPercent / 100 + (shopeePreOrder ? 0.03 : 0) + (shopeeAdsPercent / 100));
        let ongkirFee = shopeeGratisOngkirXtra ? Math.min(10000, estPrice * 0.04) : 0;
        let cashbackFee = shopeeCashbackXtra ? Math.min(10000, estPrice * 0.014) : 0;
        let totalFee = pctFee + ongkirFee + cashbackFee + flatFee;
        let diff = (estPrice - totalFee) - targetNetPayout;
        estPrice = estPrice - diff;
      }

      sellPrice = formatPsychologicalPrice(estPrice);
      currentDiscountPercent = applyDiscountCoret ? Math.min(85, Math.max(0, discountCoretPercent)) : 0;
      strikePrice = currentDiscountPercent > 0
        ? Math.ceil((sellPrice / (1 - currentDiscountPercent / 100)) / 1000) * 1000
        : sellPrice;
      currentDiscountNominal = Math.max(0, strikePrice - sellPrice);
    } else {
      sellPrice = effectiveSimulatePrice.finalPrice;
      strikePrice = effectiveSimulatePrice.etalasePrice;
      currentDiscountPercent = effectiveSimulatePrice.discountPercent;
      currentDiscountNominal = effectiveSimulatePrice.discountNominal;
    }

    // Deductions are computed from the real transaction sellPrice paid by the buyer
    const adminFee = Math.round(sellPrice * (shopeeAdminPercent / 100));
    const gratisOngkirFee = shopeeGratisOngkirXtra ? Math.min(10000, Math.round(sellPrice * 0.04)) : 0;
    const cashbackFee = shopeeCashbackXtra ? Math.min(10000, Math.round(sellPrice * 0.014)) : 0;
    const preOrderFeeVal = shopeePreOrder ? Math.round(sellPrice * 0.03) : 0;
    const adsFee = Math.round(sellPrice * (shopeeAdsPercent / 100));
    const orderProcessFee = shopeeOrderFee;

    const totalDeductions = adminFee + gratisOngkirFee + cashbackFee + preOrderFeeVal + adsFee + orderProcessFee;
    const netPayout = sellPrice - totalDeductions;
    const netProfit = netPayout - hpp;
    const netMarginPercent = sellPrice > 0 ? (netProfit / sellPrice) * 100 : 0;
    const totalDeductionPercent = sellPrice > 0 ? (totalDeductions / sellPrice) * 100 : 0;
    const markupOnHpp = hpp > 0 ? (netProfit / hpp) * 100 : 0;

    return {
      sellPrice,
      strikePrice,
      discountPercent: currentDiscountPercent,
      discountNominal: currentDiscountNominal,
      adminFee,
      gratisOngkirFee,
      cashbackFee,
      preOrderFeeVal,
      adsFee,
      orderProcessFee,
      totalDeductions,
      netPayout,
      netProfit,
      netMarginPercent,
      totalDeductionPercent,
      markupOnHpp
    };
  }, [
    calcMode, hpp, calculatedTargetProfitRp, effectiveSimulatePrice,
    shopeeAdminPercent, shopeeGratisOngkirXtra, shopeeCashbackXtra, 
    shopeePreOrder, shopeeAdsPercent, shopeeOrderFee, autoRoundPsychological,
    applyDiscountCoret, discountCoretPercent
  ]);

  // 2. TIKTOK SHOP CALCULATION
  const tiktokResult = useMemo(() => {
    const totalPercentRate = 
      (tiktokCommissionPercent / 100) + 
      (tiktokPaymentFeePercent / 100) + 
      (tiktokGratisOngkir ? 0.03 : 0) + 
      (tiktokAffiliatePercent / 100) + 
      (tiktokAdsPercent / 100);

    const flatFee = tiktokOrderFee;

    let sellPrice = 0;
    let strikePrice = 0;
    let currentDiscountPercent = 0;
    let currentDiscountNominal = 0;

    if (calcMode === 'target') {
      const targetNetPayout = hpp + calculatedTargetProfitRp;
      let estPrice = (targetNetPayout + flatFee) / Math.max(0.1, 1 - totalPercentRate);

      // Fine-tune with caps (TikTok Gratis Ongkir cap Rp 10.000)
      for (let i = 0; i < 3; i++) {
        let pctFee = estPrice * ((tiktokCommissionPercent + tiktokPaymentFeePercent + tiktokAffiliatePercent + tiktokAdsPercent) / 100);
        let ongkirFee = tiktokGratisOngkir ? Math.min(10000, estPrice * 0.03) : 0;
        let totalFee = pctFee + ongkirFee + flatFee;
        let diff = (estPrice - totalFee) - targetNetPayout;
        estPrice = estPrice - diff;
      }

      sellPrice = formatPsychologicalPrice(estPrice);
      currentDiscountPercent = applyDiscountCoret ? Math.min(85, Math.max(0, discountCoretPercent)) : 0;
      strikePrice = currentDiscountPercent > 0
        ? Math.ceil((sellPrice / (1 - currentDiscountPercent / 100)) / 1000) * 1000
        : sellPrice;
      currentDiscountNominal = Math.max(0, strikePrice - sellPrice);
    } else {
      sellPrice = effectiveSimulatePrice.finalPrice;
      strikePrice = effectiveSimulatePrice.etalasePrice;
      currentDiscountPercent = effectiveSimulatePrice.discountPercent;
      currentDiscountNominal = effectiveSimulatePrice.discountNominal;
    }

    const commissionFee = Math.round(sellPrice * (tiktokCommissionPercent / 100));
    const paymentFee = Math.round(sellPrice * (tiktokPaymentFeePercent / 100));
    const gratisOngkirFee = tiktokGratisOngkir ? Math.min(10000, Math.round(sellPrice * 0.03)) : 0;
    const affiliateFee = Math.round(sellPrice * (tiktokAffiliatePercent / 100));
    const adsFee = Math.round(sellPrice * (tiktokAdsPercent / 100));
    const orderProcessFee = tiktokOrderFee;

    const totalDeductions = commissionFee + paymentFee + gratisOngkirFee + affiliateFee + adsFee + orderProcessFee;
    const netPayout = sellPrice - totalDeductions;
    const netProfit = netPayout - hpp;
    const netMarginPercent = sellPrice > 0 ? (netProfit / sellPrice) * 100 : 0;
    const totalDeductionPercent = sellPrice > 0 ? (totalDeductions / sellPrice) * 100 : 0;
    const markupOnHpp = hpp > 0 ? (netProfit / hpp) * 100 : 0;

    return {
      sellPrice,
      strikePrice,
      discountPercent: currentDiscountPercent,
      discountNominal: currentDiscountNominal,
      commissionFee,
      paymentFee,
      gratisOngkirFee,
      affiliateFee,
      adsFee,
      orderProcessFee,
      totalDeductions,
      netPayout,
      netProfit,
      netMarginPercent,
      totalDeductionPercent,
      markupOnHpp
    };
  }, [
    calcMode, hpp, calculatedTargetProfitRp, effectiveSimulatePrice,
    tiktokCommissionPercent, tiktokPaymentFeePercent, tiktokGratisOngkir, 
    tiktokAffiliatePercent, tiktokAdsPercent, tiktokOrderFee, autoRoundPsychological,
    applyDiscountCoret, discountCoretPercent
  ]);

  // 3. LAZADA CALCULATION
  const lazadaResult = useMemo(() => {
    const totalPercentRate = 
      (lazadaCommissionPercent / 100) + 
      (lazadaPaymentFeePercent / 100) + 
      (lazadaFreeShippingMax ? 0.04 : 0) + 
      (lazadaAdsPercent / 100);

    const flatFee = lazadaOrderFee;

    let sellPrice = 0;
    let strikePrice = 0;
    let currentDiscountPercent = 0;
    let currentDiscountNominal = 0;

    if (calcMode === 'target') {
      const targetNetPayout = hpp + calculatedTargetProfitRp;
      let estPrice = (targetNetPayout + flatFee) / Math.max(0.1, 1 - totalPercentRate);

      // Fine-tune with caps (Lazada Free Shipping Max max Rp 10.000)
      for (let i = 0; i < 3; i++) {
        let pctFee = estPrice * ((lazadaCommissionPercent + lazadaPaymentFeePercent + lazadaAdsPercent) / 100);
        let ongkirFee = lazadaFreeShippingMax ? Math.min(10000, estPrice * 0.04) : 0;
        let totalFee = pctFee + ongkirFee + flatFee;
        let diff = (estPrice - totalFee) - targetNetPayout;
        estPrice = estPrice - diff;
      }

      sellPrice = formatPsychologicalPrice(estPrice);
      currentDiscountPercent = applyDiscountCoret ? Math.min(85, Math.max(0, discountCoretPercent)) : 0;
      strikePrice = currentDiscountPercent > 0
        ? Math.ceil((sellPrice / (1 - currentDiscountPercent / 100)) / 1000) * 1000
        : sellPrice;
      currentDiscountNominal = Math.max(0, strikePrice - sellPrice);
    } else {
      sellPrice = effectiveSimulatePrice.finalPrice;
      strikePrice = effectiveSimulatePrice.etalasePrice;
      currentDiscountPercent = effectiveSimulatePrice.discountPercent;
      currentDiscountNominal = effectiveSimulatePrice.discountNominal;
    }

    const commissionFee = Math.round(sellPrice * (lazadaCommissionPercent / 100));
    const paymentFee = Math.round(sellPrice * (lazadaPaymentFeePercent / 100));
    const gratisOngkirFee = lazadaFreeShippingMax ? Math.min(10000, Math.round(sellPrice * 0.04)) : 0;
    const adsFee = Math.round(sellPrice * (lazadaAdsPercent / 100));
    const orderProcessFee = lazadaOrderFee;

    const totalDeductions = commissionFee + paymentFee + gratisOngkirFee + adsFee + orderProcessFee;
    const netPayout = sellPrice - totalDeductions;
    const netProfit = netPayout - hpp;
    const netMarginPercent = sellPrice > 0 ? (netProfit / sellPrice) * 100 : 0;
    const totalDeductionPercent = sellPrice > 0 ? (totalDeductions / sellPrice) * 100 : 0;
    const markupOnHpp = hpp > 0 ? (netProfit / hpp) * 100 : 0;

    return {
      sellPrice,
      strikePrice,
      discountPercent: currentDiscountPercent,
      discountNominal: currentDiscountNominal,
      commissionFee,
      paymentFee,
      gratisOngkirFee,
      adsFee,
      orderProcessFee,
      totalDeductions,
      netPayout,
      netProfit,
      netMarginPercent,
      totalDeductionPercent,
      markupOnHpp
    };
  }, [
    calcMode, hpp, calculatedTargetProfitRp, effectiveSimulatePrice,
    lazadaCommissionPercent, lazadaPaymentFeePercent, lazadaFreeShippingMax, 
    lazadaAdsPercent, lazadaOrderFee, autoRoundPsychological,
    applyDiscountCoret, discountCoretPercent
  ]);

  // Determine which platform gives the highest profit or margin
  const comparisonRanking = useMemo(() => {
    const list = [
      { name: 'Shopee', profit: shopeeResult.netProfit, margin: shopeeResult.netMarginPercent, deductions: shopeeResult.totalDeductions, color: '#EE4D2D' },
      { name: 'TikTok Shop', profit: tiktokResult.netProfit, margin: tiktokResult.netMarginPercent, deductions: tiktokResult.totalDeductions, color: '#000000' },
      { name: 'Lazada', profit: lazadaResult.netProfit, margin: lazadaResult.netMarginPercent, deductions: lazadaResult.totalDeductions, color: '#0F146D' },
    ];
    return list.sort((a, b) => b.profit - a.profit);
  }, [shopeeResult, tiktokResult, lazadaResult]);

  // Save Simulation to History
  const handleSaveSimulation = () => {
    const newEntry: MarketplacePricingHistory = {
      id: 'MP-' + Date.now(),
      productName: productName.trim() || 'Produk THREE MISTER',
      hpp,
      mode: calcMode,
      targetProfit: calculatedTargetProfitRp,
      sellingPrice: calcMode === 'target' ? shopeeResult.sellPrice : manualSellingPrice,
      date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    };

    const updated = [newEntry, ...savedSimulations.slice(0, 9)];
    setSavedSimulations(updated);
    localStorage.setItem('threemister_marketplace_history', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('marketplace_updated'));
  };

  const handleDeleteSimulation = (id: string) => {
    const updated = savedSimulations.filter(s => s.id !== id);
    setSavedSimulations(updated);
    localStorage.setItem('threemister_marketplace_history', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('marketplace_updated'));
  };

  // Copy Summary to Clipboard
  const handleCopySummary = () => {
    const text = `
*RANGKUMAN PENETAPAN HARGA JUAL MARKETPLACE*
*THREE MISTER - MANAGEMENT SYSTEM*
━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 *Produk*: ${productName}
💰 *HPP / Modal*: Rp ${hpp.toLocaleString('id-ID')}
🎯 *Mode Perhitungan*: ${calcMode === 'target' ? `Target Laba Rp ${calculatedTargetProfitRp.toLocaleString('id-ID')}` : 'Cek Harga & Uji Laba'}

1️⃣ *SHOPEE* (${shopeeSellerType.toUpperCase()})
• Harga Jual Etalase: Rp ${shopeeResult.strikePrice.toLocaleString('id-ID')}
• Diskon Toko / Promo: ${shopeeResult.discountPercent > 0 ? `${shopeeResult.discountPercent}% (-Rp ${shopeeResult.discountNominal.toLocaleString('id-ID')})` : '0% (Harga Normal)'}
• Harga Transaksi (Dibayar Pembeli): Rp ${shopeeResult.sellPrice.toLocaleString('id-ID')}
• Total Potongan Marketplace: Rp ${shopeeResult.totalDeductions.toLocaleString('id-ID')} (${shopeeResult.totalDeductionPercent.toFixed(1)}%)
• Dana Masuk Rekening (Net Payout): Rp ${shopeeResult.netPayout.toLocaleString('id-ID')}
• Laba Bersih: Rp ${shopeeResult.netProfit.toLocaleString('id-ID')} (Margin ${shopeeResult.netMarginPercent.toFixed(1)}%)

2️⃣ *TIKTOK SHOP* (Apparel 4.3% + 2%)
• Harga Jual Etalase: Rp ${tiktokResult.strikePrice.toLocaleString('id-ID')}
• Diskon Toko / Promo: ${tiktokResult.discountPercent > 0 ? `${tiktokResult.discountPercent}% (-Rp ${tiktokResult.discountNominal.toLocaleString('id-ID')})` : '0% (Harga Normal)'}
• Harga Transaksi (Dibayar Pembeli): Rp ${tiktokResult.sellPrice.toLocaleString('id-ID')}
• Total Potongan Marketplace: Rp ${tiktokResult.totalDeductions.toLocaleString('id-ID')} (${tiktokResult.totalDeductionPercent.toFixed(1)}%)
• Dana Masuk Rekening (Net Payout): Rp ${tiktokResult.netPayout.toLocaleString('id-ID')}
• Laba Bersih: Rp ${tiktokResult.netProfit.toLocaleString('id-ID')} (Margin ${tiktokResult.netMarginPercent.toFixed(1)}%)

3️⃣ *LAZADA* (Fashion Kategori A 6% + 2%)
• Harga Jual Etalase: Rp ${lazadaResult.strikePrice.toLocaleString('id-ID')}
• Diskon Toko / Promo: ${lazadaResult.discountPercent > 0 ? `${lazadaResult.discountPercent}% (-Rp ${lazadaResult.discountNominal.toLocaleString('id-ID')})` : '0% (Harga Normal)'}
• Harga Transaksi (Dibayar Pembeli): Rp ${lazadaResult.sellPrice.toLocaleString('id-ID')}
• Total Potongan Marketplace: Rp ${lazadaResult.totalDeductions.toLocaleString('id-ID')} (${lazadaResult.totalDeductionPercent.toFixed(1)}%)
• Dana Masuk Rekening (Net Payout): Rp ${lazadaResult.netPayout.toLocaleString('id-ID')}
• Laba Bersih: Rp ${lazadaResult.netProfit.toLocaleString('id-ID')} (Margin ${lazadaResult.netMarginPercent.toFixed(1)}%)

🏆 *Platform Paling Menguntungkan*: ${comparisonRanking[0].name} (Laba Rp ${comparisonRanking[0].profit.toLocaleString('id-ID')})
━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();

    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-7 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-linear-to-bl from-[#580001]/10 via-[#580001]/5 to-transparent rounded-bl-full pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#580001]/10 text-[#580001] font-bold text-xs">
                <Store className="w-3.5 h-3.5" />
                Ketentuan Marketplace 2026
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold text-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Shopee • TikTok Shop • Lazada
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Kalkulator Harga Jual Marketplace
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed">
              Tentukan harga jual ideal di <strong>Shopee, TikTok Shop, dan Lazada</strong> secara akurat. 
              Sistem menghitung biaya komisi kategori fashion, biaya transaksi per pesanan (Rp 1.250), gratis ongkir xtra, dan memastikan margin laba bersih Anda tidak tergerus.
            </p>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2 self-start md:self-auto shrink-0 flex-wrap">
            <button
              onClick={() => setShowExplanationModal(true)}
              className="px-3 py-2 text-xs font-semibold text-slate-700 hover:text-[#580001] bg-slate-100 hover:bg-slate-200/80 rounded-xl transition cursor-pointer flex items-center gap-1.5"
            >
              <Info className="w-4 h-4 text-slate-500" />
              <span>Ketentuan Resmi 2026</span>
            </button>

            <button
              onClick={handleCopySummary}
              className="px-3.5 py-2 text-xs font-bold text-white bg-[#580001] hover:bg-[#730002] rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              {copiedNotification ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{copiedNotification ? 'Tersalin ke Clipboard!' : 'Salin Ringkasan'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Controls (Inputs & Platform Settings) and Right Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Input Configuration (5 Cols on large screen) */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* 1. Modal HPP & Produk Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#580001]" />
                1. Modal & Produk
              </h2>
              {savedHppList.length > 0 && (
                <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-medium">
                  {savedHppList.length} HPP Tersimpan
                </span>
              )}
            </div>

            {/* Pick from Saved HPP dropdown if available */}
            {savedHppList.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 block">
                  Muat dari Kalkulator HPP THREE MISTER:
                </label>
                <select
                  value={selectedSavedHppId}
                  onChange={(e) => handleSelectSavedHpp(e.target.value)}
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-[#580001] focus:ring-1 focus:ring-[#580001] transition"
                >
                  <option value="">-- Pilih HPP Produk Tersimpan --</option>
                  {savedHppList.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.productName} (HPP: Rp {Math.round(item.hppPerUnit).toLocaleString('id-ID')})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Product Name */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block">
                Nama Produk / Kaos:
              </label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Contoh: Kaos Heavyweight 24s Three Mister"
                className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-[#580001] focus:ring-1 focus:ring-[#580001] transition"
              />
            </div>

            {/* HPP (Modal per Pcs) */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-700">
                  HPP (Modal Pokok Produksi per Pcs):
                </label>
                <span className="text-[11px] font-bold text-[#580001]">
                  Rp {hpp.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  Rp
                </span>
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={hpp || ''}
                  onChange={(e) => setHpp(Math.max(0, Number(e.target.value) || 0))}
                  placeholder="45000"
                  className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-900 focus:outline-none focus:border-[#580001] focus:ring-1 focus:ring-[#580001] transition"
                />
              </div>
              <p className="text-[10px] text-slate-500">
                Modal mencakup kain, sablon, CMT jahit, label, hangtag, dan kemasan per potong.
              </p>
            </div>
          </div>

          {/* 2. Mode Perhitungan Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-[#580001]" />
                2. Metode Perhitungan
              </h2>
            </div>

            {/* Mode Switch Tabs */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setCalcMode('target')}
                className={`py-2 px-2 text-center rounded-lg text-xs font-bold transition cursor-pointer ${
                  calcMode === 'target'
                    ? 'bg-white text-[#580001] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Target Laba ➔ Cari Harga
              </button>
              <button
                type="button"
                onClick={() => setCalcMode('simulate')}
                className={`py-2 px-2 text-center rounded-lg text-xs font-bold transition cursor-pointer ${
                  calcMode === 'simulate'
                    ? 'bg-white text-[#580001] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cek Harga ➔ Cari Laba
              </button>
            </div>

            {/* Conditional input based on mode */}
            {calcMode === 'target' ? (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    Bentuk Target Keuntungan:
                  </label>
                  <div className="flex gap-2 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setProfitType('nominal')}
                      className={`px-2 py-0.5 rounded cursor-pointer ${profitType === 'nominal' ? 'bg-[#580001] text-white' : 'bg-slate-100 text-slate-600'}`}
                    >
                      Nominal (Rp)
                    </button>
                    <button
                      type="button"
                      onClick={() => setProfitType('margin')}
                      className={`px-2 py-0.5 rounded cursor-pointer ${profitType === 'margin' ? 'bg-[#580001] text-white' : 'bg-slate-100 text-slate-600'}`}
                    >
                      Margin (%)
                    </button>
                  </div>
                </div>

                {profitType === 'nominal' ? (
                  <div className="space-y-1">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        value={targetProfitNominal || ''}
                        onChange={(e) => setTargetProfitNominal(Math.max(0, Number(e.target.value) || 0))}
                        className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-900 focus:outline-none focus:border-[#580001] focus:ring-1 focus:ring-[#580001] transition"
                      />
                    </div>
                    <div className="flex gap-1.5 pt-1 flex-wrap">
                      {[25000, 35000, 50000, 75000].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setTargetProfitNominal(val)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-[10px] font-bold rounded-lg text-slate-700 transition cursor-pointer"
                        >
                          +Rp {(val / 1000)}rb
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="relative">
                      <input
                        type="number"
                        min={1}
                        max={85}
                        value={targetProfitMargin || ''}
                        onChange={(e) => setTargetProfitMargin(Math.min(85, Math.max(1, Number(e.target.value) || 0)))}
                        className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 py-2 text-slate-900 focus:outline-none focus:border-[#580001] focus:ring-1 focus:ring-[#580001] transition"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Target laba bersih setara ~<strong>Rp {calculatedTargetProfitRp.toLocaleString('id-ID')}</strong> per potong.
                    </p>
                  </div>
                )}

                {/* Pengaturan Diskon Promo Etalase & Harga Coret */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={applyDiscountCoret}
                        onChange={(e) => setApplyDiscountCoret(e.target.checked)}
                        className="w-4 h-4 text-[#580001] rounded border-slate-300 focus:ring-[#580001]"
                      />
                      <span className="text-xs font-semibold text-slate-800">
                        Diskon Promo Etalase (Harga Coret)
                      </span>
                    </label>

                    {applyDiscountCoret && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-500">Diskon:</span>
                        <div className="relative">
                          <input
                            type="number"
                            min={0}
                            max={80}
                            value={discountCoretPercent}
                            onChange={(e) => setDiscountCoretPercent(Math.min(80, Math.max(0, Number(e.target.value) || 0)))}
                            className="w-14 text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-center text-slate-900"
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-600">%</span>
                      </div>
                    )}
                  </div>

                  {applyDiscountCoret && (
                    <div className="flex gap-1.5 flex-wrap pl-6">
                      {[0, 10, 15, 20, 25, 30, 40].map(pct => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setDiscountCoretPercent(pct)}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded transition cursor-pointer ${
                            discountCoretPercent === pct
                              ? 'bg-[#580001] text-white'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          {pct === 0 ? '0% (Normal)' : `${pct}%`}
                        </button>
                      ))}
                    </div>
                  )}

                  <label className="flex items-center gap-2 cursor-pointer pl-6">
                    <input
                      type="checkbox"
                      checked={autoRoundPsychological}
                      onChange={(e) => setAutoRoundPsychological(e.target.checked)}
                      className="w-3.5 h-3.5 text-[#580001] rounded border-slate-300 focus:ring-[#580001]"
                    />
                    <span className="text-[11px] font-medium text-slate-600">
                      Bulatkan ke harga ritel psikologis (.900 / .000)
                    </span>
                  </label>
                </div>

                {/* Rekomendasi Harga Jual Etalase Toko */}
                <div className="mt-3 p-3.5 bg-rose-50/60 rounded-xl border border-rose-200/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5 text-[#580001]" />
                      Rekomendasi Harga Jual Etalase:
                    </span>
                    <span className="text-[10px] font-semibold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full">
                      {applyDiscountCoret && discountCoretPercent > 0 ? `Diskon ${discountCoretPercent}%` : 'Harga Normal'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    {/* Shopee */}
                    <div className="bg-white p-2 rounded-lg border border-orange-200 shadow-2xs">
                      <span className="text-[10px] font-bold text-orange-700 block">Shopee</span>
                      <span className="text-xs font-black text-slate-900 font-mono block">
                        Rp {shopeeResult.strikePrice.toLocaleString('id-ID')}
                      </span>
                      <span className="text-[9px] text-slate-500 block mt-0.5">
                        {shopeeResult.discountPercent > 0 ? `Net: Rp ${shopeeResult.sellPrice.toLocaleString('id-ID')}` : 'Tanpa Diskon'}
                      </span>
                    </div>

                    {/* TikTok */}
                    <div className="bg-white p-2 rounded-lg border border-slate-300 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-800 block">TikTok Shop</span>
                      <span className="text-xs font-black text-slate-900 font-mono block">
                        Rp {tiktokResult.strikePrice.toLocaleString('id-ID')}
                      </span>
                      <span className="text-[9px] text-slate-500 block mt-0.5">
                        {tiktokResult.discountPercent > 0 ? `Net: Rp ${tiktokResult.sellPrice.toLocaleString('id-ID')}` : 'Tanpa Diskon'}
                      </span>
                    </div>

                    {/* Lazada */}
                    <div className="bg-white p-2 rounded-lg border border-indigo-200 shadow-2xs">
                      <span className="text-[10px] font-bold text-indigo-800 block">Lazada</span>
                      <span className="text-xs font-black text-slate-900 font-mono block">
                        Rp {lazadaResult.strikePrice.toLocaleString('id-ID')}
                      </span>
                      <span className="text-[9px] text-slate-500 block mt-0.5">
                        {lazadaResult.discountPercent > 0 ? `Net: Rp ${lazadaResult.sellPrice.toLocaleString('id-ID')}` : 'Tanpa Diskon'}
                      </span>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-600 leading-relaxed">
                    💡 Pasang <strong>Harga Jual Etalase</strong> di atas di Seller Center masing-masing platform. Saat pembeli mendapatkan diskon {shopeeResult.discountPercent}%, uang masuk & laba bersih tetap sesuai target Anda.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5 pt-1">
                {/* 1. Input Harga Jual Etalase */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-800 block">
                      Harga Jual Etalase (Katalog Toko):
                    </label>
                    <span className="text-[10px] text-slate-500">Sebelum diskon promo</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                    <input
                      type="number"
                      min={1000}
                      step={1000}
                      value={manualSellingPrice || ''}
                      onChange={(e) => setManualSellingPrice(Math.max(1000, Number(e.target.value) || 0))}
                      className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-900 focus:outline-none focus:border-[#580001] focus:ring-1 focus:ring-[#580001] transition"
                    />
                  </div>

                  <div className="flex gap-1.5 flex-wrap">
                    {[89000, 99000, 119000, 129000, 149000, 179000, 199000].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setManualSellingPrice(val)}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer ${
                          manualSellingPrice === val ? 'bg-[#580001] text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        Rp {(val / 1000)}rb
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Input Persentase Diskon */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5 text-[#580001]" />
                      Persentase Diskon Toko / Etalase:
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={90}
                        value={simulateDiscountPercent}
                        onChange={(e) => setSimulateDiscountPercent(Math.min(90, Math.max(0, Number(e.target.value) || 0)))}
                        className="w-14 text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-center text-slate-900 focus:outline-none focus:border-[#580001]"
                      />
                      <span className="text-xs font-bold text-slate-600">%</span>
                    </div>
                  </div>

                  <div className="flex gap-1.5 flex-wrap">
                    {[0, 10, 15, 20, 25, 30, 40, 50].map(pct => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setSimulateDiscountPercent(pct)}
                        className={`px-2 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer ${
                          simulateDiscountPercent === pct ? 'bg-[#580001] text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {pct === 0 ? '0% Normal' : `${pct}%`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Ringkasan Transaksi Riil Konsumen */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">Harga Jual Etalase:</span>
                    <span className="font-bold text-slate-900 font-mono">
                      Rp {manualSellingPrice.toLocaleString('id-ID')}
                    </span>
                  </div>

                  {simulateDiscountPercent > 0 ? (
                    <div className="flex items-center justify-between text-xs text-rose-700 font-medium">
                      <span>Diskon Promo Toko ({simulateDiscountPercent}%):</span>
                      <span className="font-bold font-mono">
                        -Rp {effectiveSimulatePrice.discountNominal.toLocaleString('id-ID')}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Diskon Promo Toko:</span>
                      <span className="font-medium italic">0% (Tanpa Diskon / Harga Normal)</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      Harga Riil Transaksi (Dibayar Pembeli):
                    </span>
                    <span className="text-sm font-black text-[#580001] font-mono">
                      Rp {effectiveSimulatePrice.finalPrice.toLocaleString('id-ID')}
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-500 leading-relaxed pt-0.5">
                    💡 Seluruh biaya administrasi marketplace dan ongkir dihitung dari harga riil <strong>Rp {effectiveSimulatePrice.finalPrice.toLocaleString('id-ID')}</strong> yang dibayar oleh pembeli.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 3. Parameter Tarif Detail Per Platform (Accordion Settings) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <Layers className="w-4 h-4 text-[#580001]" />
              3. Opsi Program & Fitur Tambahan
            </h2>

            <div className="space-y-3 text-xs">
              {/* Shopee Program Controls */}
              <div className="p-3 rounded-xl bg-orange-50/70 border border-orange-200/80 space-y-2">
                <div className="flex items-center justify-between font-bold text-orange-950">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#EE4D2D]" />
                    Shopee (Kategori A Fashion)
                  </span>
                  <span className="text-[10px] bg-orange-100 text-orange-800 px-2 py-0.5 rounded-md font-mono">
                    Admin {shopeeAdminPercent}%
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1 pt-1">
                  {[
                    { id: 'non_star', label: 'Non-Star (8%)' },
                    { id: 'star', label: 'Star/Star+ (10%)' },
                    { id: 'mall', label: 'Mall (11%)' },
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setShopeeSellerType(item.id as any)}
                      className={`py-1 text-[10px] font-bold rounded-md border text-center transition ${
                        shopeeSellerType === item.id 
                          ? 'bg-[#EE4D2D] text-white border-[#EE4D2D]' 
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shopeeGratisOngkirXtra}
                      onChange={(e) => setShopeeGratisOngkirXtra(e.target.checked)}
                      className="w-3.5 h-3.5 text-[#EE4D2D] rounded"
                    />
                    <span className="text-slate-700 text-[11px]">Gratis Ongkir XTRA (4.0%, maks Rp 10.000)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shopeeCashbackXtra}
                      onChange={(e) => setShopeeCashbackXtra(e.target.checked)}
                      className="w-3.5 h-3.5 text-[#EE4D2D] rounded"
                    />
                    <span className="text-slate-700 text-[11px]">Cashback XTRA (1.4%, maks Rp 10.000)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shopeePreOrder}
                      onChange={(e) => setShopeePreOrder(e.target.checked)}
                      className="w-3.5 h-3.5 text-[#EE4D2D] rounded"
                    />
                    <span className="text-slate-700 text-[11px]">Biaya Pre-Order 2026 (3.0%)</span>
                  </label>
                </div>
              </div>

              {/* TikTok Shop Controls */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between font-bold text-slate-900">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-black" />
                    TikTok Shop (Shop Tokopedia)
                  </span>
                  <span className="text-[10px] bg-slate-200 text-slate-800 px-2 py-0.5 rounded-md font-mono">
                    Apparel 4.3% + 2%
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tiktokGratisOngkir}
                      onChange={(e) => setTiktokGratisOngkir(e.target.checked)}
                      className="w-3.5 h-3.5 text-black rounded"
                    />
                    <span className="text-slate-700 text-[11px]">Program Gratis Ongkir Ekstra (3.0%)</span>
                  </label>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-600 text-[11px]">Komisi Kreator / Afiliasi:</span>
                    <div className="flex gap-1">
                      {[0, 5, 7, 10].map(rate => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => setTiktokAffiliatePercent(rate)}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                            tiktokAffiliatePercent === rate ? 'bg-black text-white' : 'bg-white border border-slate-200 text-slate-700'
                          }`}
                        >
                          {rate}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Lazada Controls */}
              <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200/80 space-y-2">
                <div className="flex items-center justify-between font-bold text-indigo-950">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0F146D]" />
                    Lazada (Kategori A Fashion)
                  </span>
                  <span className="text-[10px] bg-indigo-100 text-indigo-900 px-2 py-0.5 rounded-md font-mono">
                    Komisi 6% + 2%
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lazadaFreeShippingMax}
                      onChange={(e) => setLazadaFreeShippingMax(e.target.checked)}
                      className="w-3.5 h-3.5 text-[#0F146D] rounded"
                    />
                    <span className="text-slate-700 text-[11px]">Free Shipping Max / Gratis Ongkir (4.0%)</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleSaveSimulation}
                className="w-full py-2.5 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shadow-xs active:scale-98"
              >
                <BookmarkCheck className="w-4 h-4 text-emerald-400" />
                Simpan Hasil Simulasi Ini
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Results & Side-by-Side Comparison (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Recommendation Banner & Quick Metric Highlights */}
          <div className="bg-linear-to-r from-[#580001] to-[#730002] text-white rounded-2xl p-5 sm:p-6 shadow-md relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest bg-white/15 text-amber-200 px-2.5 py-0.5 rounded-full mb-1.5">
                  <Award className="w-3 h-3 text-amber-300" />
                  Rekomendasi Terbaik
                </span>
                <h3 className="text-lg sm:text-xl font-black">
                  {comparisonRanking[0].name} Memberikan Margin Tertinggi
                </h3>
                <p className="text-xs text-rose-100 mt-0.5">
                  Dengan laba bersih <strong>Rp {comparisonRanking[0].profit.toLocaleString('id-ID')}</strong> (Margin <strong>{comparisonRanking[0].margin.toFixed(1)}%</strong>) per potong baju.
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-xs border border-white/20 p-3 rounded-xl text-right shrink-0">
                <span className="text-[10px] uppercase tracking-wider text-rose-200 block font-semibold">
                  Modal Pokok (HPP)
                </span>
                <span className="text-xl font-black font-mono">
                  Rp {hpp.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>

          {/* 3-Column Marketplace Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* 1. SHOPEE CARD */}
            <div className="bg-white rounded-2xl border-2 border-orange-200 shadow-sm p-4.5 flex flex-col justify-between relative">
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-orange-100 pb-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#EE4D2D]" />
                    <h4 className="font-black text-sm text-slate-900">Shopee</h4>
                  </div>
                  <span className="text-[10px] font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                    {shopeeSellerType.toUpperCase()}
                  </span>
                </div>

                {/* Selling Price Display */}
                <div className="bg-orange-50/70 p-3 rounded-xl border border-orange-200/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">Harga Jual Etalase:</span>
                    <span className="font-black text-slate-900 font-mono text-sm">
                      Rp {shopeeResult.strikePrice.toLocaleString('id-ID')}
                    </span>
                  </div>

                  {shopeeResult.discountPercent > 0 ? (
                    <div className="flex items-center justify-between text-[11px] text-orange-950 bg-orange-100/90 px-2 py-0.5 rounded-md font-semibold">
                      <span>Diskon Promo Toko:</span>
                      <span>
                        -{shopeeResult.discountPercent}% (-Rp {shopeeResult.discountNominal.toLocaleString('id-ID')})
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-[11px] text-slate-500 italic">
                      <span>Diskon Promo Toko:</span>
                      <span>0% (Harga Normal)</span>
                    </div>
                  )}

                  <div className="pt-1.5 border-t border-orange-200/80 text-center">
                    <span className="text-[10px] uppercase font-bold text-orange-800 tracking-wider block">
                      Harga Transaksi (Dibayar Pembeli)
                    </span>
                    <div className="text-xl font-black text-orange-950 font-mono mt-0.5">
                      Rp {shopeeResult.sellPrice.toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>

                {/* Deductions Breakdown */}
                <div className="space-y-1.5 text-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Rincian Potongan:
                  </span>

                  <div className="flex justify-between text-slate-600">
                    <span>Biaya Admin ({shopeeAdminPercent}%):</span>
                    <span className="font-semibold text-rose-700">Rp {shopeeResult.adminFee.toLocaleString('id-ID')}</span>
                  </div>

                  {shopeeGratisOngkirXtra && (
                    <div className="flex justify-between text-slate-600">
                      <span>Gratis Ongkir Xtra (4%):</span>
                      <span className="font-semibold text-rose-700">Rp {shopeeResult.gratisOngkirFee.toLocaleString('id-ID')}</span>
                    </div>
                  )}

                  {shopeeCashbackXtra && (
                    <div className="flex justify-between text-slate-600">
                      <span>Cashback Xtra (1.4%):</span>
                      <span className="font-semibold text-rose-700">Rp {shopeeResult.cashbackFee.toLocaleString('id-ID')}</span>
                    </div>
                  )}

                  {shopeePreOrder && (
                    <div className="flex justify-between text-slate-600">
                      <span>Biaya Pre-Order (3%):</span>
                      <span className="font-semibold text-rose-700">Rp {shopeeResult.preOrderFeeVal.toLocaleString('id-ID')}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-600">
                    <span>Biaya Proses Pesanan:</span>
                    <span className="font-semibold text-rose-700">Rp {shopeeResult.orderProcessFee.toLocaleString('id-ID')}</span>
                  </div>

                  <div className="border-t border-slate-100 pt-1.5 flex justify-between font-bold text-slate-800">
                    <span>Total Potongan:</span>
                    <span className="text-rose-700">
                      Rp {shopeeResult.totalDeductions.toLocaleString('id-ID')} ({shopeeResult.totalDeductionPercent.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Net Payout & Profit */}
              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                <div className="bg-slate-50 p-2 rounded-lg text-center">
                  <span className="text-[10px] text-slate-500 font-semibold block">Pencairan Bersih (Net Payout):</span>
                  <span className="font-bold text-xs font-mono text-slate-900">
                    Rp {shopeeResult.netPayout.toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Laba Bersih:</span>
                  <span className={`font-black font-mono ${shopeeResult.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    Rp {shopeeResult.netProfit.toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Net Margin:</span>
                  <span className="font-bold text-slate-800">{shopeeResult.netMarginPercent.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* 2. TIKTOK SHOP CARD */}
            <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-sm p-4.5 flex flex-col justify-between relative">
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-black" />
                    <h4 className="font-black text-sm text-slate-900">TikTok Shop</h4>
                  </div>
                  <span className="text-[10px] font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    APPAREL
                  </span>
                </div>

                {/* Selling Price Display */}
                <div className="bg-slate-100/80 p-3 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">Harga Jual Etalase:</span>
                    <span className="font-black text-slate-900 font-mono text-sm">
                      Rp {tiktokResult.strikePrice.toLocaleString('id-ID')}
                    </span>
                  </div>

                  {tiktokResult.discountPercent > 0 ? (
                    <div className="flex items-center justify-between text-[11px] text-slate-900 bg-slate-200/90 px-2 py-0.5 rounded-md font-semibold">
                      <span>Diskon Promo Toko:</span>
                      <span>
                        -{tiktokResult.discountPercent}% (-Rp {tiktokResult.discountNominal.toLocaleString('id-ID')})
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-[11px] text-slate-500 italic">
                      <span>Diskon Promo Toko:</span>
                      <span>0% (Harga Normal)</span>
                    </div>
                  )}

                  <div className="pt-1.5 border-t border-slate-200 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-700 tracking-wider block">
                      Harga Transaksi (Dibayar Pembeli)
                    </span>
                    <div className="text-xl font-black text-slate-950 font-mono mt-0.5">
                      Rp {tiktokResult.sellPrice.toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>

                {/* Deductions Breakdown */}
                <div className="space-y-1.5 text-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Rincian Potongan:
                  </span>

                  <div className="flex justify-between text-slate-600">
                    <span>Komisi Apparel (4.3%):</span>
                    <span className="font-semibold text-rose-700">Rp {tiktokResult.commissionFee.toLocaleString('id-ID')}</span>
                  </div>

                  <div className="flex justify-between text-slate-600">
                    <span>Biaya Pembayaran (2.0%):</span>
                    <span className="font-semibold text-rose-700">Rp {tiktokResult.paymentFee.toLocaleString('id-ID')}</span>
                  </div>

                  {tiktokGratisOngkir && (
                    <div className="flex justify-between text-slate-600">
                      <span>Gratis Ongkir Ekstra (3%):</span>
                      <span className="font-semibold text-rose-700">Rp {tiktokResult.gratisOngkirFee.toLocaleString('id-ID')}</span>
                    </div>
                  )}

                  {tiktokAffiliatePercent > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Komisi Afiliasi ({tiktokAffiliatePercent}%):</span>
                      <span className="font-semibold text-rose-700">Rp {tiktokResult.affiliateFee.toLocaleString('id-ID')}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-600">
                    <span>Biaya Tetap Pesanan:</span>
                    <span className="font-semibold text-rose-700">Rp {tiktokResult.orderProcessFee.toLocaleString('id-ID')}</span>
                  </div>

                  <div className="border-t border-slate-100 pt-1.5 flex justify-between font-bold text-slate-800">
                    <span>Total Potongan:</span>
                    <span className="text-rose-700">
                      Rp {tiktokResult.totalDeductions.toLocaleString('id-ID')} ({tiktokResult.totalDeductionPercent.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Net Payout & Profit */}
              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                <div className="bg-slate-50 p-2 rounded-lg text-center">
                  <span className="text-[10px] text-slate-500 font-semibold block">Pencairan Bersih (Net Payout):</span>
                  <span className="font-bold text-xs font-mono text-slate-900">
                    Rp {tiktokResult.netPayout.toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Laba Bersih:</span>
                  <span className={`font-black font-mono ${tiktokResult.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    Rp {tiktokResult.netProfit.toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Net Margin:</span>
                  <span className="font-bold text-slate-800">{tiktokResult.netMarginPercent.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* 3. LAZADA CARD */}
            <div className="bg-white rounded-2xl border-2 border-indigo-200 shadow-sm p-4.5 flex flex-col justify-between relative">
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-indigo-100 pb-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#0F146D]" />
                    <h4 className="font-black text-sm text-slate-900">Lazada</h4>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    FASHION KATEGORI A
                  </span>
                </div>

                {/* Selling Price Display */}
                <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-200/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">Harga Jual Etalase:</span>
                    <span className="font-black text-slate-900 font-mono text-sm">
                      Rp {lazadaResult.strikePrice.toLocaleString('id-ID')}
                    </span>
                  </div>

                  {lazadaResult.discountPercent > 0 ? (
                    <div className="flex items-center justify-between text-[11px] text-indigo-950 bg-indigo-100/90 px-2 py-0.5 rounded-md font-semibold">
                      <span>Diskon Promo Toko:</span>
                      <span>
                        -{lazadaResult.discountPercent}% (-Rp {lazadaResult.discountNominal.toLocaleString('id-ID')})
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-[11px] text-slate-500 italic">
                      <span>Diskon Promo Toko:</span>
                      <span>0% (Harga Normal)</span>
                    </div>
                  )}

                  <div className="pt-1.5 border-t border-indigo-200/80 text-center">
                    <span className="text-[10px] uppercase font-bold text-indigo-900 tracking-wider block">
                      Harga Transaksi (Dibayar Pembeli)
                    </span>
                    <div className="text-xl font-black text-indigo-950 font-mono mt-0.5">
                      Rp {lazadaResult.sellPrice.toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>

                {/* Deductions Breakdown */}
                <div className="space-y-1.5 text-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Rincian Potongan:
                  </span>

                  <div className="flex justify-between text-slate-600">
                    <span>Komisi Kategori A (6.0%):</span>
                    <span className="font-semibold text-rose-700">Rp {lazadaResult.commissionFee.toLocaleString('id-ID')}</span>
                  </div>

                  <div className="flex justify-between text-slate-600">
                    <span>Biaya Pembayaran (2.0%):</span>
                    <span className="font-semibold text-rose-700">Rp {lazadaResult.paymentFee.toLocaleString('id-ID')}</span>
                  </div>

                  {lazadaFreeShippingMax && (
                    <div className="flex justify-between text-slate-600">
                      <span>Free Shipping Max (4.0%):</span>
                      <span className="font-semibold text-rose-700">Rp {lazadaResult.gratisOngkirFee.toLocaleString('id-ID')}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-600">
                    <span>Biaya Proses Pesanan:</span>
                    <span className="font-semibold text-rose-700">Rp {lazadaResult.orderProcessFee.toLocaleString('id-ID')}</span>
                  </div>

                  <div className="border-t border-slate-100 pt-1.5 flex justify-between font-bold text-slate-800">
                    <span>Total Potongan:</span>
                    <span className="text-rose-700">
                      Rp {lazadaResult.totalDeductions.toLocaleString('id-ID')} ({lazadaResult.totalDeductionPercent.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Net Payout & Profit */}
              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                <div className="bg-slate-50 p-2 rounded-lg text-center">
                  <span className="text-[10px] text-slate-500 font-semibold block">Pencairan Bersih (Net Payout):</span>
                  <span className="font-bold text-xs font-mono text-slate-900">
                    Rp {lazadaResult.netPayout.toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Laba Bersih:</span>
                  <span className={`font-black font-mono ${lazadaResult.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    Rp {lazadaResult.netProfit.toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Net Margin:</span>
                  <span className="font-bold text-slate-800">{lazadaResult.netMarginPercent.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Strategic Omnichannel Advice Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Strategi Harga Omnichannel THREE MISTER
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="font-bold text-slate-800 block text-[11px]">
                  💡 Opsi 1: Satu Harga Rata (Uniform Price)
                </span>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Pasang harga seragam di semua marketplace sebesar <strong>Rp {Math.max(shopeeResult.sellPrice, tiktokResult.sellPrice, lazadaResult.sellPrice).toLocaleString('id-ID')}</strong> agar tidak membingungkan pembeli dan menjaga citra brand THREE MISTER.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="font-bold text-slate-800 block text-[11px]">
                  🎯 Opsi 2: Harga Per Kanal (Channel Pricing)
                </span>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Sesuaikan harga per platform (TikTok lebih kompetitif, Shopee & Lazada disesuaikan dengan kupon gratis ongkir xtra) agar net profit bersih di rekening tetap presisi Rp {calculatedTargetProfitRp.toLocaleString('id-ID')}.
                </p>
              </div>
            </div>
          </div>

          {/* History / Saved Simulations */}
          {savedSimulations.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <BookmarkCheck className="w-4 h-4 text-[#580001]" />
                  Riwayat Simulasi Harga Tersimpan
                </h4>
                <span className="text-[10px] text-slate-400 font-mono">
                  {savedSimulations.length} Tersimpan
                </span>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {savedSimulations.map((sim) => (
                  <div
                    key={sim.id}
                    className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs transition"
                  >
                    <div>
                      <span className="font-bold text-slate-900 block">{sim.productName}</span>
                      <span className="text-[10px] text-slate-500">
                        HPP: Rp {sim.hpp.toLocaleString('id-ID')} • Target Laba: Rp {sim.targetProfit.toLocaleString('id-ID')} • {sim.date}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setProductName(sim.productName);
                          setHpp(sim.hpp);
                          setTargetProfitNominal(sim.targetProfit);
                          setCalcMode(sim.mode);
                        }}
                        className="px-2.5 py-1 bg-white hover:bg-[#580001] hover:text-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 transition cursor-pointer"
                      >
                        Terapkan
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSimulation(sim.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal / Penjelasan Rinci Aturan Resmi 2026 */}
      {showExplanationModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-[#580001]/10 text-[#580001] rounded-xl font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Ketentuan Biaya Marketplace 2026</h3>
                  <p className="text-xs text-slate-500">Khusus Kategori Fashion & Pakaian (Three Mister Apparel)</p>
                </div>
              </div>
              <button
                onClick={() => setShowExplanationModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
              <div className="p-3.5 rounded-xl bg-orange-50 border border-orange-200 space-y-1.5">
                <h4 className="font-bold text-orange-950 text-sm flex items-center gap-1.5">
                  🟠 Shopee (Ketentuan Terbaru 1 Januari 2026)
                </h4>
                <ul className="list-disc pl-4 space-y-1 text-orange-900 text-[11px]">
                  <li><strong>Kategori A (Pakaian/Fashion)</strong>: Biaya admin Star/Star+ sebesar <strong>10,0%</strong> dari harga netto produk setelah diskon. Non-Star sebesar 8,0%, dan Shopee Mall sebesar 11,0%.</li>
                  <li><strong>Biaya Proses Pesanan</strong>: Dikenakan <strong>Rp 1.250</strong> per transaksi pesanan yang berhasil diselesaikan.</li>
                  <li><strong>Biaya Pre-Order</strong>: Dikenakan tambahan 3% jika produk menggunakan sistem PO.</li>
                  <li><strong>Program Gratis Ongkir XTRA</strong>: Tambahan komisi 4,0% (maksimal Rp 10.000 per kuantitas).</li>
                  <li><strong>Cashback XTRA</strong>: Tambahan 1,4% (maksimal Rp 10.000).</li>
                </ul>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  ⚫ TikTok Shop / Shop Tokopedia (Penyesuaian 2025/2026)
                </h4>
                <ul className="list-disc pl-4 space-y-1 text-slate-700 text-[11px]">
                  <li><strong>Kategori Apparel (Pakaian)</strong>: Biaya komisi kategori sebesar <strong>4,3%</strong>.</li>
                  <li><strong>Biaya Layanan Transaksi / Pembayaran</strong>: <strong>2,0%</strong> per pesanan.</li>
                  <li><strong>Biaya Tetap per Pesanan</strong>: <strong>Rp 1.250</strong> per pesanan valid yang diselesaikan.</li>
                  <li><strong>Program Gratis Ongkir Ekstra</strong>: Sekitar 3,0% (maksimal Rp 10.000).</li>
                  <li><strong>Komisi Afiliasi (Opsional)</strong>: Dikenakan jika transaksi berasal dari video atau live streaming creator (biasanya 5% - 10%).</li>
                </ul>
              </div>

              <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 space-y-1.5">
                <h4 className="font-bold text-indigo-950 text-sm flex items-center gap-1.5">
                  🔵 Lazada (Pembaruan Kategori Fashion)
                </h4>
                <ul className="list-disc pl-4 space-y-1 text-indigo-900 text-[11px]">
                  <li><strong>Kategori A (Pakaian & Sepatu Fashion)</strong>: Biaya komisi marketplace sebesar <strong>6,0%</strong> (termasuk PPN).</li>
                  <li><strong>Biaya Layanan Pembayaran (Payment Processing)</strong>: <strong>2,0%</strong>.</li>
                  <li><strong>Biaya Proses Pesanan</strong>: <strong>Rp 1.250</strong> per transaksi.</li>
                  <li><strong>Free Shipping Max</strong>: Program gratis ongkir dengan biaya layanan 4,0% (maksimal Rp 10.000).</li>
                </ul>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowExplanationModal(false)}
                className="px-4 py-2 bg-[#580001] text-white font-bold text-xs rounded-xl hover:bg-[#730002] transition"
              >
                Saya Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
