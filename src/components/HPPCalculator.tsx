/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Account, Transaction } from '../types';
import { 
  Calculator, 
  Plus, 
  Trash2, 
  Save, 
  FileText, 
  Coins, 
  Percent, 
  Sparkles, 
  HelpCircle, 
  ChevronRight, 
  ArrowUpRight, 
  ShoppingBag, 
  Hammer, 
  Scissors, 
  Tag, 
  Package, 
  Info,
  Check,
  AlertCircle,
  Shirt,
  X,
  Search,
  Layers,
  TrendingUp,
  Star,
  Bookmark,
  Eye,
  RotateCcw,
  SlidersHorizontal,
  ArrowRight,
  CheckCircle2,
  Scale
} from 'lucide-react';

interface HPPCalculatorProps {
  accounts: Account[];
  transactions: Transaction[];
  onAddTransaction: (trx: Transaction) => void;
}

export interface SavedCalculation {
  id: string;
  productName: string;
  qty: number;
  
  // Raw material type & breakdown
  rawMaterialType?: 'baju_jadi' | 'kain' | 'both';
  blankApparelName?: string;
  blankApparelQty?: number;
  blankApparelPrice?: number;
  blankApparelTotal?: number;

  // Fabric / Kain Roll Inputs
  fabricUnit?: string;
  fabricQty?: number;
  fabricPrice?: number;
  fabricRibQty?: number;
  fabricRibPrice?: number;

  // Cost breakdown
  fabricCost: number;       // total raw material (baju jadi / fabric) cost
  printCostPerPiece?: number;
  printCost: number;        // total screenprint/embroidery cost
  cmtCostPerPiece?: number;
  cmtCost: number;          // total cut-make-trim/labor cost
  wovenLabelPrice?: number;
  hangtagPrice?: number;
  washingLabelPrice?: number;
  accessoriesCost: number;  // total woven label, hangtags cost
  bagPrice?: number;
  stickerPrice?: number;
  boxPrice?: number;
  packagingCost: number;    // total bag, thank you card, box cost
  otherCost: number;        // other miscellaneous costs
  otherCostTotal?: number;

  totalCost: number;
  hppPerPiece: number;

  // Selling price estimation
  targetMargin: number;     // in %
  wholesaleMargin?: number;
  retailPrice: number;
  wholesalePrice: number;   // wholesale price estimation
  
  // Benchmark metadata
  isBenchmark?: boolean;
  notes?: string;
  createdAt: string;
}

const DEFAULT_BENCHMARKS: SavedCalculation[] = [
  {
    id: 'BENCHMARK-KAOS-24S',
    productName: 'Kaos Polos Cotton Combed 24s (Sablon Plastisol)',
    qty: 100,
    rawMaterialType: 'baju_jadi',
    blankApparelName: 'Kaos Polos Cotton Combed 24s Standar Distro',
    blankApparelQty: 100,
    blankApparelPrice: 38000,
    blankApparelTotal: 3800000,
    fabricCost: 3800000,
    printCostPerPiece: 14000,
    printCost: 1400000,
    cmtCostPerPiece: 0,
    cmtCost: 0,
    wovenLabelPrice: 1200,
    hangtagPrice: 800,
    washingLabelPrice: 400,
    accessoriesCost: 240000,
    bagPrice: 2200,
    stickerPrice: 300,
    boxPrice: 0,
    packagingCost: 250000,
    otherCost: 0,
    otherCostTotal: 0,
    totalCost: 5690000,
    hppPerPiece: 56900,
    targetMargin: 60,
    wholesaleMargin: 30,
    retailPrice: 142250,
    wholesalePrice: 81286,
    isBenchmark: true,
    notes: 'Patokan standar artikel Kaos Distro Combed 24s dengan sablon Plastisol 3 warna.',
    createdAt: '12 September 2026, 10:00'
  },
  {
    id: 'BENCHMARK-HOODIE-FLEECE',
    productName: 'Hoodie Pullover Heavy Fleece 330gsm (Bordir Dada)',
    qty: 50,
    rawMaterialType: 'baju_jadi',
    blankApparelName: 'Hoodie Blank Heavy Cotton Fleece 330gsm',
    blankApparelQty: 50,
    blankApparelPrice: 115000,
    blankApparelTotal: 5750000,
    fabricCost: 5750000,
    printCostPerPiece: 20000,
    printCost: 1000000,
    cmtCostPerPiece: 0,
    cmtCost: 0,
    wovenLabelPrice: 1500,
    hangtagPrice: 1000,
    washingLabelPrice: 500,
    accessoriesCost: 150000,
    bagPrice: 4000,
    stickerPrice: 500,
    boxPrice: 0,
    packagingCost: 225000,
    otherCost: 125000,
    otherCostTotal: 125000,
    totalCost: 7250000,
    hppPerPiece: 145000,
    targetMargin: 60,
    wholesaleMargin: 30,
    retailPrice: 362500,
    wholesalePrice: 207143,
    isBenchmark: true,
    notes: 'Patokan standar outerwear Hoodie Fleece 330gsm tebal dengan bordir komputer.',
    createdAt: '10 September 2026, 14:30'
  },
  {
    id: 'BENCHMARK-KEMEJA-OXFORD',
    productName: 'Kemeja Casual Oxford Long-Sleeve (Kain Roll CMT)',
    qty: 60,
    rawMaterialType: 'kain',
    fabricUnit: 'Meter',
    fabricQty: 90,
    fabricPrice: 45000,
    fabricRibQty: 0,
    fabricRibPrice: 0,
    fabricCost: 4050000,
    printCostPerPiece: 0,
    printCost: 0,
    cmtCostPerPiece: 38000,
    cmtCost: 2280000,
    wovenLabelPrice: 1200,
    hangtagPrice: 800,
    washingLabelPrice: 500,
    accessoriesCost: 150000,
    bagPrice: 2500,
    stickerPrice: 300,
    boxPrice: 0,
    packagingCost: 168000,
    otherCost: 132000,
    otherCostTotal: 132000,
    totalCost: 6780000,
    hppPerPiece: 113000,
    targetMargin: 55,
    wholesaleMargin: 30,
    retailPrice: 251111,
    wholesalePrice: 161429,
    isBenchmark: true,
    notes: 'Patokan kemeja katun oxford panjang dengan penjahit rekanan CMT.',
    createdAt: '08 September 2026, 09:15'
  }
];

export default function HPPCalculator({ accounts, transactions, onAddTransaction }: HPPCalculatorProps) {
  const [savedCalcs, setSavedCalcs] = useState<SavedCalculation[]>([]);
  const [activeTab, setActiveTab] = useState<'calculator' | 'saved'>('calculator');
  const [searchSaved, setSearchSaved] = useState('');
  const [isSuccessToast, setIsSuccessToast] = useState<string | null>(null);

  // Calculator inputs
  const [productName, setProductName] = useState('');
  const [qty, setQty] = useState(100);

  // Raw Material Selection: 'baju_jadi' | 'kain' | 'both'
  const [rawMaterialType, setRawMaterialType] = useState<'baju_jadi' | 'kain' | 'both'>('baju_jadi');

  // Baju Jadi (Blank Apparel / Kaos Polos) inputs
  const [blankApparelName, setBlankApparelName] = useState('Kaos Polos Cotton Combed 24s');
  const [blankApparelQty, setBlankApparelQty] = useState(100);
  const [blankApparelPrice, setBlankApparelPrice] = useState(38000); // e.g. Rp 38.000/pcs
  const [isSyncWithBatchQty, setIsSyncWithBatchQty] = useState(true);

  // Fabric / Kain Mentah Costs
  const [fabricUnit, setFabricUnit] = useState('Kg'); // Kg, Meter, Roll
  const [fabricQty, setFabricQty] = useState(30); // e.g. 30 kg
  const [fabricPrice, setFabricPrice] = useState(125000); // e.g. Rp 125.000/kg
  const [fabricRibPrice, setFabricRibPrice] = useState(150000); // rib cost
  const [fabricRibQty, setFabricRibQty] = useState(2); // rib quantity

  // Sablon/Bordir
  const [printCostPerPiece, setPrintCostPerPiece] = useState(15000); // Rp 15.000/pcs
  
  // CMT / Sewing (default 0 or small for blank tees, adjustable)
  const [cmtCostPerPiece, setCmtCostPerPiece] = useState(0); // Rp 0 jika baju jadi langsung sablon

  // Accessories
  const [wovenLabelPrice, setWovenLabelPrice] = useState(1200); // per pcs
  const [hangtagPrice, setHangtagPrice] = useState(800); // per pcs
  const [washingLabelPrice, setWashingLabelPrice] = useState(500); // per pcs

  // Packaging
  const [bagPrice, setBagPrice] = useState(2500); // zipper bag/polymailer per pcs
  const [stickerPrice, setStickerPrice] = useState(400); // sticker/thank you card per pcs
  const [boxPrice, setBoxPrice] = useState(0); // box price per pcs

  // Miscellaneous
  const [otherCostTotal, setOtherCostTotal] = useState(0);

  // Margin Pricing
  const [targetMargin, setTargetMargin] = useState(60); // 60% gross profit margin target
  const [wholesaleMargin, setWholesaleMargin] = useState(30); // 30% for wholesale

  // Active Benchmark & Modal states
  const [activeBenchmarkId, setActiveBenchmarkId] = useState<string | null>(null);
  const [selectedDetailCalc, setSelectedDetailCalc] = useState<SavedCalculation | null>(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveModalProductName, setSaveModalProductName] = useState('');
  const [saveModalNotes, setSaveModalNotes] = useState('');
  const [saveModalIsBenchmark, setSaveModalIsBenchmark] = useState(true);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'benchmark' | 'baju_jadi' | 'kain'>('all');

  // Journal Posting State
  const [debitAccount, setDebitAccount] = useState('1-1005'); // Persediaan Barang
  const [creditAccount, setCreditAccount] = useState('1-1002'); // Bank BCA
  const [isPostingModalOpen, setIsPostingModalOpen] = useState(false);
  const [postingTotal, setPostingTotal] = useState(0);
  const [postingDesc, setPostingDesc] = useState('');

  // Load saved calculations with fallback to default benchmarks
  useEffect(() => {
    const saved = localStorage.getItem('threemister_hpp_calcs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSavedCalcs(parsed);
          const savedBench = localStorage.getItem('threemister_hpp_active_benchmark');
          if (savedBench && parsed.some((p: SavedCalculation) => p.id === savedBench)) {
            setActiveBenchmarkId(savedBench);
          } else {
            const firstBench = parsed.find((p: SavedCalculation) => p.isBenchmark) || parsed[0];
            if (firstBench) {
              setActiveBenchmarkId(firstBench.id);
            }
          }
          return;
        }
      } catch (e) {
        console.warn('Notice loading HPP benchmarks:', e);
      }
    }
    // Set default industry benchmarks
    setSavedCalcs(DEFAULT_BENCHMARKS);
    setActiveBenchmarkId(DEFAULT_BENCHMARKS[0].id);
    localStorage.setItem('threemister_hpp_calcs', JSON.stringify(DEFAULT_BENCHMARKS));
    localStorage.setItem('threemister_hpp_active_benchmark', DEFAULT_BENCHMARKS[0].id);
  }, []);

  // Toast auto-clear
  useEffect(() => {
    if (isSuccessToast) {
      const timer = setTimeout(() => {
        setIsSuccessToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isSuccessToast]);

  // Auto-sync blank apparel qty with production batch qty
  useEffect(() => {
    if (isSyncWithBatchQty) {
      setBlankApparelQty(qty);
    }
  }, [qty, isSyncWithBatchQty]);

  // Derived cost variables
  const blankApparelTotal = blankApparelQty * blankApparelPrice;
  const fabricOnlyTotal = (fabricQty * fabricPrice) + (fabricRibQty * fabricRibPrice);

  // Total Raw Material Cost based on selected mode
  const rawMaterialTotal = 
    rawMaterialType === 'baju_jadi'
      ? blankApparelTotal
      : rawMaterialType === 'kain'
        ? fabricOnlyTotal
        : blankApparelTotal + fabricOnlyTotal;

  const fabricTotal = rawMaterialTotal; // Keep compatibility with downstream summary & export
  const printTotal = printCostPerPiece * qty;
  const cmtTotal = cmtCostPerPiece * qty;
  const accessoriesTotal = (wovenLabelPrice + hangtagPrice + washingLabelPrice) * qty;
  const packagingTotal = (bagPrice + stickerPrice + boxPrice) * qty;
  const otherTotal = otherCostTotal;

  const totalCostOfProduction = fabricTotal + printTotal + cmtTotal + accessoriesTotal + packagingTotal + otherTotal;
  const hppPerPiece = qty > 0 ? Math.round(totalCostOfProduction / qty) : 0;

  // Recommended Retail Price based on margin target
  // Formula: Selling Price = HPP / (1 - (Margin / 100))
  const calculatedRetailPrice = targetMargin < 100 && hppPerPiece > 0
    ? Math.round(hppPerPiece / (1 - (targetMargin / 100))) 
    : hppPerPiece * 2;

  // Recommended Wholesale Price
  const calculatedWholesalePrice = wholesaleMargin < 100 && hppPerPiece > 0
    ? Math.round(hppPerPiece / (1 - (wholesaleMargin / 100)))
    : Math.round(hppPerPiece * 1.5);

  const profitPerPieceRetail = calculatedRetailPrice - hppPerPiece;
  const totalProfitRetail = profitPerPieceRetail * qty;

  const wholesaleProfitPerPiece = calculatedWholesalePrice - hppPerPiece;
  const totalWholesaleProfit = wholesaleProfitPerPiece * qty;

  // Psychological rounded prices for fashion retail
  const psychologicalRetailRound = Math.ceil(calculatedRetailPrice / 1000) * 1000;
  const psychologicalRetail900 = psychologicalRetailRound > 1000 ? psychologicalRetailRound - 1000 + 900 : psychologicalRetailRound;

  // Active Benchmark object
  const activeBenchmark = savedCalcs.find(c => c.id === activeBenchmarkId) || savedCalcs[0] || null;

  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(num);
  };

  const openSaveModal = () => {
    setSaveModalProductName(productName.trim() || `Produk Batch ${qty} pcs`);
    setSaveModalNotes('');
    setSaveModalIsBenchmark(true);
    setIsSaveModalOpen(true);
  };

  const handleConfirmSaveCalculation = (shouldOpenHistory?: boolean) => {
    const finalName = saveModalProductName.trim() || productName.trim() || `Artikel Batch ${qty} pcs`;
    const newCalc: SavedCalculation = {
      id: `CALC-${Date.now()}`,
      productName: finalName,
      qty,
      rawMaterialType,
      blankApparelName: blankApparelName.trim(),
      blankApparelQty,
      blankApparelPrice,
      blankApparelTotal,
      fabricUnit,
      fabricQty,
      fabricPrice,
      fabricRibQty,
      fabricRibPrice,
      fabricCost: fabricTotal,
      printCostPerPiece,
      printCost: printTotal,
      cmtCostPerPiece,
      cmtCost: cmtTotal,
      wovenLabelPrice,
      hangtagPrice,
      washingLabelPrice,
      accessoriesCost: accessoriesTotal,
      bagPrice,
      stickerPrice,
      boxPrice,
      packagingCost: packagingTotal,
      otherCost: otherTotal,
      otherCostTotal,
      totalCost: totalCostOfProduction,
      hppPerPiece,
      targetMargin,
      wholesaleMargin,
      retailPrice: calculatedRetailPrice,
      wholesalePrice: calculatedWholesalePrice,
      isBenchmark: saveModalIsBenchmark,
      notes: saveModalNotes.trim(),
      createdAt: new Date().toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    };

    const updated = [newCalc, ...savedCalcs];
    setSavedCalcs(updated);
    localStorage.setItem('threemister_hpp_calcs', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('hpp_updated'));
    if (saveModalIsBenchmark) {
      setActiveBenchmarkId(newCalc.id);
      localStorage.setItem('threemister_hpp_active_benchmark', newCalc.id);
    }
    setIsSaveModalOpen(false);
    setProductName(finalName);

    if (shouldOpenHistory) {
      setActiveTab('saved');
      setIsSuccessToast(`Kalkulasi HPP "${finalName}" berhasil disimpan! Membuka riwayat & patokan.`);
    } else {
      setIsSuccessToast(`Kalkulasi HPP "${finalName}" berhasil disimpan ke riwayat dan siap jadi patokan!`);
    }
  };

  const handleToggleBenchmark = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = savedCalcs.map(c => {
      if (c.id === id) {
        return { ...c, isBenchmark: !c.isBenchmark };
      }
      return c;
    });
    setSavedCalcs(updated);
    localStorage.setItem('threemister_hpp_calcs', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('hpp_updated'));
    const target = updated.find(c => c.id === id);
    setIsSuccessToast(target?.isBenchmark 
      ? `"${target.productName}" ditandai sebagai Patokan Standar!`
      : `Tanda patokan standar dilepas dari "${target?.productName}".`
    );
  };

  const handleSetActiveBenchmark = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveBenchmarkId(id);
    localStorage.setItem('threemister_hpp_active_benchmark', id);
    const target = savedCalcs.find(c => c.id === id);
    setIsSuccessToast(`"${target?.productName || 'Produk'}" dipilih sebagai Patokan Acuan Aktif!`);
  };

  const handleDeleteSaved = (id: string, name: string) => {
    const updated = savedCalcs.filter(c => c.id !== id);
    setSavedCalcs(updated);
    localStorage.setItem('threemister_hpp_calcs', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('hpp_updated'));
    if (activeBenchmarkId === id) {
      const nextBench = updated.find(c => c.isBenchmark) || updated[0] || null;
      setActiveBenchmarkId(nextBench ? nextBench.id : null);
    }
    setIsSuccessToast(`Riwayat kalkulasi "${name}" berhasil dihapus.`);
  };

  const loadSavedToForm = (calc: SavedCalculation) => {
    setProductName(calc.productName);
    setQty(calc.qty);
    
    // Restore raw material type & parameters
    const rType = calc.rawMaterialType || (calc.blankApparelPrice ? 'baju_jadi' : 'kain');
    setRawMaterialType(rType);
    if (calc.blankApparelName) setBlankApparelName(calc.blankApparelName);
    if (calc.blankApparelPrice !== undefined) setBlankApparelPrice(calc.blankApparelPrice);
    if (calc.blankApparelQty !== undefined) {
      setBlankApparelQty(calc.blankApparelQty);
      setIsSyncWithBatchQty(calc.blankApparelQty === calc.qty);
    } else {
      setBlankApparelQty(calc.qty);
    }

    // Restore exact parameters if available, or fallback
    if (calc.fabricUnit) setFabricUnit(calc.fabricUnit);
    if (calc.fabricQty !== undefined) setFabricQty(calc.fabricQty);
    else setFabricQty(Math.round(calc.fabricCost / 125000) || 1);

    if (calc.fabricPrice !== undefined) setFabricPrice(calc.fabricPrice);
    else setFabricPrice(125000);

    if (calc.fabricRibQty !== undefined) setFabricRibQty(calc.fabricRibQty);
    else setFabricRibQty(0);

    if (calc.fabricRibPrice !== undefined) setFabricRibPrice(calc.fabricRibPrice);
    else setFabricRibPrice(0);

    if (calc.printCostPerPiece !== undefined) setPrintCostPerPiece(calc.printCostPerPiece);
    else setPrintCostPerPiece(calc.qty > 0 ? Math.round(calc.printCost / calc.qty) : 0);

    if (calc.cmtCostPerPiece !== undefined) setCmtCostPerPiece(calc.cmtCostPerPiece);
    else setCmtCostPerPiece(calc.qty > 0 ? Math.round(calc.cmtCost / calc.qty) : 0);

    if (calc.wovenLabelPrice !== undefined) setWovenLabelPrice(calc.wovenLabelPrice);
    else {
      const accItem = calc.qty > 0 ? Math.round(calc.accessoriesCost / calc.qty) : 0;
      setWovenLabelPrice(Math.round(accItem * 0.5));
    }

    if (calc.hangtagPrice !== undefined) setHangtagPrice(calc.hangtagPrice);
    else {
      const accItem = calc.qty > 0 ? Math.round(calc.accessoriesCost / calc.qty) : 0;
      setHangtagPrice(Math.round(accItem * 0.3));
    }

    if (calc.washingLabelPrice !== undefined) setWashingLabelPrice(calc.washingLabelPrice);
    else {
      const accItem = calc.qty > 0 ? Math.round(calc.accessoriesCost / calc.qty) : 0;
      setWashingLabelPrice(Math.round(accItem * 0.2));
    }

    if (calc.bagPrice !== undefined) setBagPrice(calc.bagPrice);
    else {
      const pkgItem = calc.qty > 0 ? Math.round(calc.packagingCost / calc.qty) : 0;
      setBagPrice(Math.round(pkgItem * 0.8));
    }

    if (calc.stickerPrice !== undefined) setStickerPrice(calc.stickerPrice);
    else {
      const pkgItem = calc.qty > 0 ? Math.round(calc.packagingCost / calc.qty) : 0;
      setStickerPrice(Math.round(pkgItem * 0.2));
    }

    if (calc.boxPrice !== undefined) setBoxPrice(calc.boxPrice);
    else setBoxPrice(0);

    if (calc.otherCostTotal !== undefined) setOtherCostTotal(calc.otherCostTotal);
    else setOtherCostTotal(calc.otherCost);

    if (calc.targetMargin !== undefined) setTargetMargin(calc.targetMargin);
    if (calc.wholesaleMargin !== undefined) setWholesaleMargin(calc.wholesaleMargin);

    setActiveTab('calculator');
    setSelectedDetailCalc(null);
    setIsSuccessToast(`Resep kalkulasi "${calc.productName}" berhasil dimuat ke kalkulator!`);
  };

  const openPostingModal = () => {
    const name = productName.trim() || "Produk Pakaian Baru";
    const matLabel = rawMaterialType === 'baju_jadi' ? 'Baju Jadi' : rawMaterialType === 'kain' ? 'Kain Mentah' : 'Kombinasi';
    setPostingTotal(totalCostOfProduction);
    setPostingDesc(`Produksi Batch ${name} [${matLabel}]: ${qty} pcs @ HPP ${formatIDR(hppPerPiece)}`);
    setIsPostingModalOpen(true);
  };

  const handlePostToJournal = () => {
    if (postingTotal <= 0) return;

    const trxId = `TX-HPP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newTrx: Transaction = {
      id: trxId,
      date: new Date().toISOString().split('T')[0],
      refNum: `PROD-HPP-${Math.floor(100 + Math.random() * 900)}`,
      description: postingDesc,
      debitAccount, // usually 1-1005 (Persediaan Barang)
      creditAccount, // usually 1-1001 (Kas) or 1-1002 (Bank)
      amount: postingTotal,
      createdAt: new Date().toISOString()
    };

    onAddTransaction(newTrx);
    setIsPostingModalOpen(false);
    setIsSuccessToast(`Jurnal Produksi berhasil dicatat! Rp ${newTrx.amount.toLocaleString('id-ID')} dipindahkan ke Akun Persediaan.`);
  };

  const loadTemplate = (type: string) => {
    setProductName(type);
    if (type.includes('Kaos Polos Jadi') || type.includes('Blank Tee') || type.includes('Baju Jadi')) {
      setRawMaterialType('baju_jadi');
      setBlankApparelName('Kaos Polos Cotton Combed 24s');
      setBlankApparelPrice(38000);
      setBlankApparelQty(100);
      setQty(100);
      setPrintCostPerPiece(14000); // Sablon Plastisol / DTF
      setCmtCostPerPiece(0); // Baju sudah dijahit dari pabrik
      setWovenLabelPrice(1200);
      setHangtagPrice(800);
      setWashingLabelPrice(400);
      setBagPrice(2200);
      setStickerPrice(300);
      setBoxPrice(0);
      setOtherCostTotal(0);
      setTargetMargin(65);
    } else if (type.includes('Hoodie Blank') || type.includes('Hoodie Polos Jadi')) {
      setRawMaterialType('baju_jadi');
      setBlankApparelName('Hoodie Blank Heavy Fleece 330gsm');
      setBlankApparelPrice(115000);
      setBlankApparelQty(50);
      setQty(50);
      setPrintCostPerPiece(20000); // Sablon/Bordir
      setCmtCostPerPiece(0); // Sudah siap pakai
      setWovenLabelPrice(1500);
      setHangtagPrice(1000);
      setWashingLabelPrice(500);
      setBagPrice(3500);
      setStickerPrice(500);
      setBoxPrice(12000);
      setOtherCostTotal(0);
      setTargetMargin(60);
    } else if (type.includes('Kaos Oversize Combed') || type.includes('Cut & Sew')) {
      setRawMaterialType('kain');
      setQty(100);
      setFabricQty(30); // 30 kg
      setFabricPrice(120000);
      setFabricRibQty(2);
      setFabricRibPrice(135000);
      setPrintCostPerPiece(12000); // plastisol
      setCmtCostPerPiece(15000); // jahit kaos
      setWovenLabelPrice(1000);
      setHangtagPrice(800);
      setWashingLabelPrice(400);
      setBagPrice(2000);
      setStickerPrice(300);
      setBoxPrice(0);
      setOtherCostTotal(0);
      setTargetMargin(65);
    } else if (type.includes('Hoodie Heavy Fleece')) {
      setRawMaterialType('kain');
      setQty(50);
      setFabricQty(40); // Fleece tebal
      setFabricPrice(140000);
      setFabricRibQty(4); // bur jaket
      setFabricRibPrice(150000);
      setPrintCostPerPiece(20000); // sablon/bordir besar
      setCmtCostPerPiece(35000); // CMT hoodie rumit
      setWovenLabelPrice(1500);
      setHangtagPrice(1000);
      setWashingLabelPrice(500);
      setBagPrice(3500); // plastic zip lock tebal
      setStickerPrice(500);
      setBoxPrice(12000); // premium cardboard box
      setOtherCostTotal(50000); // zipper/tali tali
      setTargetMargin(60);
    } else if (type.includes('Kemeja Linen')) {
      setRawMaterialType('kain');
      setQty(60);
      setFabricQty(90); // meter kain katun/linen
      setFabricPrice(45000); // per meter
      setFabricRibQty(0);
      setFabricRibPrice(0);
      setPrintCostPerPiece(0); // tanpa sablon
      setCmtCostPerPiece(40000); // CMT kemeja saku kancing kerah
      setWovenLabelPrice(1200);
      setHangtagPrice(800);
      setWashingLabelPrice(500);
      setBagPrice(2500);
      setStickerPrice(300);
      setBoxPrice(0);
      setOtherCostTotal(150000); // kancing cadangan + kerah keras
      setTargetMargin(55);
    }
    setIsSuccessToast(`Template "${type}" berhasil dimuat.`);
  };

  return (
    <div id="hpp-calculator" className="space-y-6">
      {/* Toast Notification with Dismiss and Direct View in History Button */}
      {isSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#580001] border border-[#430001] text-white px-4.5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-200 max-w-lg">
          <div className="bg-white/20 p-1.5 rounded-lg text-amber-300 shrink-0">
            <Check className="w-4 h-4" />
          </div>
          <div className="text-xs flex-1">
            <p className="font-bold text-white">Sistem Berhasil Disimpan</p>
            <p className="text-white/85 mt-0.5 leading-relaxed">{isSuccessToast}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveTab('saved');
                setIsSuccessToast(null);
              }}
              className="px-2.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 text-[11px] font-bold rounded-lg transition shadow-xs cursor-pointer flex items-center gap-1"
              title="Buka tab riwayat untuk melihat hasil dan patokan"
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Lihat Riwayat</span>
            </button>
            <button
              type="button"
              onClick={() => setIsSuccessToast(null)}
              className="text-white/60 hover:text-white p-1 rounded-md transition cursor-pointer"
              title="Tutup Notifikasi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#580001]/10 text-[#580001] flex items-center justify-center">
              <Calculator className="w-4.5 h-4.5" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight">
              Kalkulator HPP & Patokan Produksi
            </h2>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-2xl">
            Hitung HPP per pcs secara akurat untuk clothing brand, simpan ke riwayat, dan jadikan artikel standar sebagai patokan acuan produksi berikutnya.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl shrink-0 self-stretch sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('calculator')}
            className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold rounded-lg transition duration-150 cursor-pointer ${
              activeTab === 'calculator' 
                ? 'bg-white text-[#580001] shadow-xs font-bold' 
                : 'text-slate-600 hover:text-[#580001]'
            }`}
          >
            Kalkulator Produksi
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('saved')}
            className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold rounded-lg transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'saved' 
                ? 'bg-white text-[#580001] shadow-xs font-bold' 
                : 'text-slate-600 hover:text-[#580001]'
            }`}
          >
            Riwayat & Patokan HPP
            {savedCalcs.length > 0 && (
              <span className="bg-[#580001] text-white text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                {savedCalcs.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'calculator' ? (
        <div className="space-y-6">
          {/* Active Benchmark Comparison Ribbon */}
          {activeBenchmark ? (
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-4.5 rounded-2xl shadow-sm border border-slate-700/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-400 border border-amber-400/30 flex items-center justify-center shrink-0">
                  <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1">
                      <Bookmark className="w-3 h-3" />
                      Patokan Acuan Aktif
                    </span>
                    <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-slate-300 font-mono">
                      Target HPP: {formatIDR(activeBenchmark.hppPerPiece)} / pcs
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <h4 className="text-sm font-bold text-white truncate max-w-xs sm:max-w-md">
                      {activeBenchmark.productName}
                    </h4>
                    {/* Quick Switch Dropdown if multiple saved exist */}
                    {savedCalcs.length > 1 && (
                      <select
                        value={activeBenchmarkId || activeBenchmark.id}
                        onChange={(e) => handleSetActiveBenchmark(e.target.value)}
                        className="text-[10px] bg-white/15 hover:bg-white/25 text-amber-200 border border-white/20 rounded-md px-1.5 py-0.5 focus:outline-none cursor-pointer"
                        title="Ganti patokan acuan langsung"
                      >
                        {savedCalcs.map(c => (
                          <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                            {c.isBenchmark ? '⭐ ' : ''}{c.productName} ({formatIDR(c.hppPerPiece)})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 self-stretch md:self-auto justify-between md:justify-end border-t md:border-t-0 pt-2.5 md:pt-0 border-slate-700/60">
                {hppPerPiece > 0 && (
                  <div className="text-left md:text-right">
                    <span className="text-[10px] text-slate-400 block font-medium">Perbandingan vs Patokan:</span>
                    <div className="flex items-center md:justify-end gap-1.5 mt-0.5">
                      <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-md ${
                        hppPerPiece <= activeBenchmark.hppPerPiece 
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}>
                        {hppPerPiece <= activeBenchmark.hppPerPiece ? '▼ Lebih Hemat ' : '▲ Lebih Tinggi '}
                        {formatIDR(Math.abs(hppPerPiece - activeBenchmark.hppPerPiece))} / pcs
                        ({hppPerPiece <= activeBenchmark.hppPerPiece ? '-' : '+'}
                        {Math.abs(Math.round(((hppPerPiece - activeBenchmark.hppPerPiece) / (activeBenchmark.hppPerPiece || 1)) * 100))}%)
                      </span>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDetailCalc(activeBenchmark)}
                    className="text-[11px] bg-white/10 hover:bg-white/20 text-white font-semibold px-2.5 py-1.5 rounded-xl transition flex items-center gap-1 cursor-pointer"
                    title="Lihat rincian resep patokan ini"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Rincian Resep</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('saved')}
                    className="text-[11px] bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Kelola Patokan
                  </button>
                </div>
              </div>
            </div>
          ) : savedCalcs.length > 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900">
              <div className="flex items-center gap-2.5">
                <Bookmark className="w-5 h-5 text-amber-600 shrink-0" />
                <div className="text-xs">
                  <span className="font-bold block">Pilih Patokan Acuan dari Riwayat</span>
                  <span className="text-amber-800">Anda memiliki {savedCalcs.length} riwayat kalkulasi. Pilih satu untuk dijadikan tolok ukur HPP artikel ini.</span>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <select
                  onChange={(e) => {
                    if (e.target.value) handleSetActiveBenchmark(e.target.value);
                  }}
                  defaultValue=""
                  className="bg-white border border-amber-300 text-xs rounded-xl px-3 py-1.5 text-slate-800 focus:outline-none"
                >
                  <option value="" disabled>-- Pilih Patokan Acuan --</option>
                  {savedCalcs.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.isBenchmark ? '⭐ ' : ''}{c.productName} (HPP {formatIDR(c.hppPerPiece)})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setActiveTab('saved')}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer"
                >
                  Buka Riwayat
                </button>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* INPUT FORM (Left Side) - occupies 7 cols */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6 space-y-6">
            {/* Header & Quick Template Selector */}
            <div className="space-y-2.5 border-b pb-4 border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#580001]"></span>
                  1. Rincian Biaya Batch Produksi
                </h3>
                <span className="text-[11px] text-slate-400 font-medium">Pilih preset cepat untuk mengisi otomatis:</span>
              </div>

              {/* Categorized Template Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Baju Jadi:</span>
                <button 
                  type="button"
                  onClick={() => loadTemplate('Kaos Polos Jadi (Blank Tee)')}
                  className="text-[11px] bg-red-50 hover:bg-red-100/80 border border-[#580001]/25 text-[#580001] font-semibold px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                  title="Kaos polos blank siap sablon tanpa ongkos jahit potong"
                >
                  <Shirt className="w-3.5 h-3.5" />
                  Kaos Polos Jadi (~38k)
                </button>
                <button 
                  type="button"
                  onClick={() => loadTemplate('Hoodie Blank Jadi')}
                  className="text-[11px] bg-red-50 hover:bg-red-100/80 border border-[#580001]/25 text-[#580001] font-semibold px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                  title="Hoodie blank siap sablon/bordir"
                >
                  <Shirt className="w-3.5 h-3.5" />
                  Hoodie Blank (~115k)
                </button>

                <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block"></div>

                <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Kain Mentah:</span>
                <button 
                  type="button"
                  onClick={() => loadTemplate('Kaos Oversize Combed (Kain)')}
                  className="text-[11px] bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                  title="Kain combed roll + CMT jahit potong"
                >
                  <Scissors className="w-3.5 h-3.5 text-slate-500" />
                  Kain Combed 30s
                </button>
                <button 
                  type="button"
                  onClick={() => loadTemplate('Kemeja Linen')}
                  className="text-[11px] bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                  title="Kain linen meteran + jahit kemeja"
                >
                  <Scissors className="w-3.5 h-3.5 text-slate-500" />
                  Kemeja Linen
                </button>
              </div>
            </div>

            {/* Basic Info: Nama Produk & Jumlah Batch */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-end">
              <div className="sm:col-span-7">
                <label className="block text-slate-700 text-xs font-bold mb-1.5 uppercase tracking-wider">
                  Nama Artikel Produk
                </label>
                <input
                  type="text"
                  placeholder="Contoh: T-Shirt Oversize Black Metal V1"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#580001]/15 focus:border-[#580001] transition"
                />
              </div>
              <div className="sm:col-span-5">
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider">
                    Volume Batch (PCS)
                  </label>
                  <div className="flex gap-1">
                    {[50, 100, 200].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => {
                          setQty(val);
                          if (isSyncWithBatchQty) setBlankApparelQty(val);
                        }}
                        className={`text-[10px] px-1.5 py-0.5 rounded border transition cursor-pointer ${
                          qty === val ? 'bg-[#580001] text-white border-[#580001] font-bold' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    value={qty}
                    onChange={(e) => {
                      const newQty = Math.max(1, parseInt(e.target.value) || 0);
                      setQty(newQty);
                      if (isSyncWithBatchQty) setBlankApparelQty(newQty);
                    }}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#580001]/15 focus:border-[#580001] transition"
                  />
                  <span className="absolute right-3 top-2 text-xs font-semibold text-slate-400">PCS</span>
                </div>
              </div>
            </div>

            {/* Cost Breakdown Accordion-style layout */}
            <div className="space-y-4">
              {/* Category: Bahan Baku (Baju Jadi vs Kain Mentah) */}
              <div className="border border-slate-200 rounded-xl p-4.5 bg-slate-50/60 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
                    {rawMaterialType === 'baju_jadi' ? (
                      <Shirt className="w-4 h-4 text-[#580001]" />
                    ) : (
                      <Scissors className="w-4 h-4 text-[#580001]" />
                    )}
                    <span>A. Biaya Bahan Baku Utama</span>
                  </div>

                  {/* Mode Selector: Baju Jadi vs Kain vs Keduanya */}
                  <div className="flex items-center gap-2">
                    <div className="inline-flex bg-slate-200/80 p-0.5 rounded-lg text-[11px] font-medium">
                      <button
                        type="button"
                        onClick={() => {
                          setRawMaterialType('baju_jadi');
                          if (cmtCostPerPiece === 15000) setCmtCostPerPiece(0);
                        }}
                        className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 cursor-pointer ${
                          rawMaterialType === 'baju_jadi'
                            ? 'bg-[#580001] text-white font-bold shadow-xs'
                            : 'text-slate-600 hover:text-[#580001]'
                        }`}
                      >
                        <Shirt className="w-3.5 h-3.5" />
                        <span>Baju Jadi (Kaos Polos)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRawMaterialType('kain');
                          if (cmtCostPerPiece === 0) setCmtCostPerPiece(15000);
                        }}
                        className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 cursor-pointer ${
                          rawMaterialType === 'kain'
                            ? 'bg-[#580001] text-white font-bold shadow-xs'
                            : 'text-slate-600 hover:text-[#580001]'
                        }`}
                      >
                        <Scissors className="w-3.5 h-3.5" />
                        <span>Kain Mentah (Kg/Mtr)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRawMaterialType('both')}
                        className={`px-2.5 py-1.5 rounded-md transition flex items-center gap-1 cursor-pointer ${
                          rawMaterialType === 'both'
                            ? 'bg-[#580001] text-white font-bold shadow-xs'
                            : 'text-slate-600 hover:text-[#580001]'
                        }`}
                      >
                        <span>Keduanya</span>
                      </button>
                    </div>

                    <span className="font-mono text-xs font-bold text-white bg-[#580001] px-2.5 py-1 rounded-lg shrink-0">
                      {formatIDR(rawMaterialTotal)}
                    </span>
                  </div>
                </div>

                {/* Sub-form: Baju Jadi (Blank Apparel) */}
                {(rawMaterialType === 'baju_jadi' || rawMaterialType === 'both') && (
                  <div className="space-y-3 bg-white p-3.5 rounded-xl border border-slate-200">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                        <Shirt className="w-3.5 h-3.5 text-[#580001]" />
                        <span>Baju Jadi / Blank Apparel (Kaos Polos / Hoodie Siap Pakai)</span>
                      </div>
                      
                      {/* Presets for Baju Jadi */}
                      <div className="flex flex-wrap gap-1">
                        <span className="text-[10px] text-slate-400 self-center mr-1">Rekomendasi:</span>
                        <button
                          type="button"
                          onClick={() => {
                            setBlankApparelName('Kaos Polos Cotton Combed 30s');
                            setBlankApparelPrice(32000);
                          }}
                          className="text-[10px] bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded transition cursor-pointer"
                        >
                          Combed 30s (~Rp 32k)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setBlankApparelName('Kaos Polos Cotton Combed 24s');
                            setBlankApparelPrice(38000);
                          }}
                          className="text-[10px] bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded transition cursor-pointer"
                        >
                          Combed 24s (~Rp 38k)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setBlankApparelName('Kaos Heavyweight Blank 16s / 235gsm');
                            setBlankApparelPrice(48000);
                          }}
                          className="text-[10px] bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded transition cursor-pointer"
                        >
                          Heavyweight 16s (~Rp 48k)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setBlankApparelName('Hoodie Blank Heavy Fleece 330gsm');
                            setBlankApparelPrice(115000);
                          }}
                          className="text-[10px] bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded transition cursor-pointer"
                        >
                          Hoodie Blank (~Rp 115k)
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1 text-xs">
                      <div className="sm:col-span-5">
                        <label className="block text-slate-600 font-medium mb-1">
                          Nama / Spesifikasi Baju Jadi
                        </label>
                        <input
                          type="text"
                          placeholder="Contoh: Kaos Polos Combed 24s / NSA Heavy"
                          value={blankApparelName}
                          onChange={(e) => setBlankApparelName(e.target.value)}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#580001]"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-slate-600 font-medium">Jumlah Baju (Pcs)</label>
                        </div>
                        <input
                          type="number"
                          min="1"
                          value={blankApparelQty}
                          onChange={(e) => {
                            const v = Math.max(0, parseInt(e.target.value) || 0);
                            setBlankApparelQty(v);
                            setIsSyncWithBatchQty(v === qty);
                          }}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#580001]"
                        />
                        <label className="flex items-center gap-1 text-[10px] text-slate-500 mt-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isSyncWithBatchQty}
                            onChange={(e) => {
                              setIsSyncWithBatchQty(e.target.checked);
                              if (e.target.checked) setBlankApparelQty(qty);
                            }}
                            className="rounded text-[#580001] focus:ring-[#580001]"
                          />
                          <span>Samakan Qty Batch ({qty} pcs)</span>
                        </label>
                      </div>

                      <div className="sm:col-span-4">
                        <label className="block text-slate-600 font-medium mb-1">Harga Beli Baju per Pcs</label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1.5 text-slate-400 font-mono text-xs">Rp</span>
                          <input
                            type="number"
                            min="0"
                            value={blankApparelPrice}
                            onChange={(e) => setBlankApparelPrice(parseFloat(e.target.value) || 0)}
                            className="w-full pl-8 pr-2.5 py-1.5 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#580001]"
                          />
                        </div>
                        <span className="block text-[10px] text-slate-400 mt-1">
                          Subtotal: <strong className="text-[#580001] font-mono">{formatIDR(blankApparelTotal)}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Helpful Note for Blank Apparel */}
                    <div className="text-[11px] leading-relaxed bg-[#580001]/5 text-slate-700 p-2.5 rounded-lg border border-[#580001]/15 flex items-start gap-2">
                      <Info className="w-4 h-4 text-[#580001] shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-[#580001] font-semibold">Keuntungan Model Baju Jadi:</strong> Karena Anda membeli baju utuh yang sudah berwujud siap pakai dari vendor, Anda <strong>tidak perlu membayar ongkos jahit CMT penuh</strong>. Ongkos CMT di bawah bisa diisi <span className="font-mono text-[#580001] font-bold">Rp 0</span> atau hanya ongkos pasang label/woven.
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub-form: Kain Mentah (Fabric Roll / Kg / Meter + Rib) */}
                {(rawMaterialType === 'kain' || rawMaterialType === 'both') && (
                  <div className="space-y-3 bg-white p-3.5 rounded-xl border border-slate-200">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                        <Scissors className="w-3.5 h-3.5 text-[#580001]" />
                        <span>Kain Mentah (Bahan Gulungan / Kg / Meter + Rib Manset)</span>
                      </div>

                      {/* Presets for Kain */}
                      <div className="flex flex-wrap gap-1">
                        <span className="text-[10px] text-slate-400 self-center mr-1">Bahan:</span>
                        <button
                          type="button"
                          onClick={() => {
                            setFabricUnit('Kg');
                            setFabricPrice(120000);
                            setFabricRibPrice(135000);
                          }}
                          className="text-[10px] bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded transition cursor-pointer"
                        >
                          Combed 30s (~120k/kg)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFabricUnit('Kg');
                            setFabricPrice(128000);
                            setFabricRibPrice(140000);
                          }}
                          className="text-[10px] bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded transition cursor-pointer"
                        >
                          Combed 24s (~128k/kg)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFabricUnit('Kg');
                            setFabricPrice(145000);
                            setFabricRibPrice(150000);
                          }}
                          className="text-[10px] bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded transition cursor-pointer"
                        >
                          Fleece (~145k/kg)
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1 text-xs">
                      <div className="sm:col-span-4">
                        <label className="block text-slate-600 font-medium mb-1">Kebutuhan Kain Utama</label>
                        <div className="flex rounded-xl overflow-hidden border border-slate-200">
                          <input
                            type="number"
                            value={fabricQty}
                            onChange={(e) => setFabricQty(parseFloat(e.target.value) || 0)}
                            className="w-full px-2.5 py-1.5 text-xs font-mono focus:outline-none"
                          />
                          <select 
                            value={fabricUnit}
                            onChange={(e) => setFabricUnit(e.target.value)}
                            className="bg-slate-100 px-2 border-l border-slate-200 text-[11px] font-medium text-slate-700"
                          >
                            <option value="Kg">Kg</option>
                            <option value="Meter">Mtr</option>
                            <option value="Roll">Roll</option>
                          </select>
                        </div>
                      </div>

                      <div className="sm:col-span-4">
                        <label className="block text-slate-600 font-medium mb-1">Harga per {fabricUnit}</label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1.5 text-slate-400 font-mono text-xs">Rp</span>
                          <input
                            type="number"
                            value={fabricPrice}
                            onChange={(e) => setFabricPrice(parseFloat(e.target.value) || 0)}
                            className="w-full pl-7 pr-2 py-1.5 border border-slate-200 rounded-xl text-xs font-mono text-slate-800"
                          />
                        </div>
                      </div>

                      {/* Rib / Manset Additional */}
                      <div className="sm:col-span-2">
                        <label className="block text-slate-600 font-medium mb-1">Rib (Kg)</label>
                        <input
                          type="number"
                          value={fabricRibQty}
                          onChange={(e) => setFabricRibQty(parseFloat(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs font-mono text-slate-800"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-slate-600 font-medium mb-1">Harga Rib</label>
                        <input
                          type="number"
                          value={fabricRibPrice}
                          onChange={(e) => setFabricRibPrice(parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-xl text-xs font-mono text-slate-800"
                        />
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-500 pt-1 flex justify-between">
                      <span>Perhitungan: ({fabricQty} {fabricUnit} × {formatIDR(fabricPrice)}) + ({fabricRibQty} Kg Rib × {formatIDR(fabricRibPrice)})</span>
                      <span className="font-semibold text-slate-700 font-mono">Subtotal: {formatIDR(fabricOnlyTotal)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Category: Sablon & Aplikasi */}
              <div className="border border-slate-150 rounded-xl p-4.5 bg-slate-50/50 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
                    <Hammer className="w-4 h-4 text-slate-600" />
                    <span>B. Biaya Sablon / Bordir (Aplikasi)</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                    {formatIDR(printTotal)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
                  <div>
                    <label className="block text-slate-500 font-medium mb-1">Tarif Sablon/Aplikasi (per PCS)</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1.5 text-slate-400">Rp</span>
                      <input
                        type="number"
                        value={printCostPerPiece}
                        onChange={(e) => setPrintCostPerPiece(parseFloat(e.target.value) || 0)}
                        className="w-full pl-7 pr-2.5 py-1.5 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-800"
                      />
                    </div>
                  </div>
                  <div className="text-slate-500 text-[10px] leading-relaxed flex items-center bg-white p-2.5 rounded-lg border border-slate-150">
                    <Info className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
                    Plastisol/DTF standar kaos berkisar Rp 10k - 20k. Untuk Bordir artikel hoodie/jaket berkisar Rp 15k - 25k per pcs.
                  </div>
                </div>
              </div>

              {/* Category: CMT Jahit & Labor */}
              <div className="border border-slate-150 rounded-xl p-4.5 bg-slate-50/50 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
                    <ShoppingBag className="w-4 h-4 text-slate-600" />
                    <span>C. Biaya CMT (Cut, Make, Trim) / Ongkos Jahit</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                    {formatIDR(cmtTotal)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
                  <div>
                    <label className="block text-slate-500 font-medium mb-1">Ongkos Jahit + Potong (per PCS)</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1.5 text-slate-400">Rp</span>
                      <input
                        type="number"
                        value={cmtCostPerPiece}
                        onChange={(e) => setCmtCostPerPiece(parseFloat(e.target.value) || 0)}
                        className="w-full pl-7 pr-2.5 py-1.5 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-800"
                      />
                    </div>
                  </div>
                  <div className="text-slate-500 text-[10px] leading-relaxed flex items-center bg-white p-2.5 rounded-lg border border-slate-150">
                    <Info className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
                    {rawMaterialType === 'baju_jadi'
                      ? 'Untuk Baju Jadi / Kaos Polos, Anda bisa mengisi Rp 0 jika tidak ada jahit, atau Rp 2k - 3k jika ada pasang woven/ganti label.'
                      : 'Ongkos CMT kaos oblong berkisar Rp 12k - 18k. Kemeja Rp 25k - 40k. Jaket/Hoodie berkisar Rp 30k - 50k per pcs.'}
                  </div>
                </div>

                {/* CMT Quick presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-400 mr-1">Preset cepat CMT:</span>
                  <button
                    type="button"
                    onClick={() => setCmtCostPerPiece(0)}
                    className={`text-[10px] px-2 py-0.5 rounded border transition cursor-pointer ${
                      cmtCostPerPiece === 0
                        ? 'bg-[#580001] text-white border-[#580001] font-semibold'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    Rp 0 (Baju Jadi - Tanpa Jahit)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCmtCostPerPiece(2000)}
                    className={`text-[10px] px-2 py-0.5 rounded border transition cursor-pointer ${
                      cmtCostPerPiece === 2000
                        ? 'bg-[#580001] text-white border-[#580001] font-semibold'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    Rp 2.000 (Pasang Label Woven / Re-tag)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCmtCostPerPiece(15000)}
                    className={`text-[10px] px-2 py-0.5 rounded border transition cursor-pointer ${
                      cmtCostPerPiece === 15000
                        ? 'bg-[#580001] text-white border-[#580001] font-semibold'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    Rp 15.000 (Jahit Standar Kaos)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCmtCostPerPiece(35000)}
                    className={`text-[10px] px-2 py-0.5 rounded border transition cursor-pointer ${
                      cmtCostPerPiece === 35000
                        ? 'bg-[#580001] text-white border-[#580001] font-semibold'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    Rp 35.000 (Jahit Hoodie/Jaket)
                  </button>
                </div>
              </div>

              {/* Category: Accessories & Branding */}
              <div className="border border-slate-150 rounded-xl p-4.5 bg-slate-50/50 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
                    <Tag className="w-4 h-4 text-slate-600" />
                    <span>D. Aksesoris Branding & Label</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                    {formatIDR(accessoriesTotal)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                  <div>
                    <label className="block text-slate-500 font-medium mb-1">Label Woven / Satin</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-[10px] text-slate-400">Rp</span>
                      <input
                        type="number"
                        value={wovenLabelPrice}
                        onChange={(e) => setWovenLabelPrice(parseFloat(e.target.value) || 0)}
                        className="w-full pl-7 pr-2 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-500 font-medium mb-1">Hangtag Utama</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-[10px] text-slate-400">Rp</span>
                      <input
                        type="number"
                        value={hangtagPrice}
                        onChange={(e) => setHangtagPrice(parseFloat(e.target.value) || 0)}
                        className="w-full pl-7 pr-2 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-500 font-medium mb-1">Washing Care Label</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-[10px] text-slate-400">Rp</span>
                      <input
                        type="number"
                        value={washingLabelPrice}
                        onChange={(e) => setWashingLabelPrice(parseFloat(e.target.value) || 0)}
                        className="w-full pl-7 pr-2 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-700"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Category: Packaging */}
              <div className="border border-slate-150 rounded-xl p-4.5 bg-slate-50/50 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
                    <Package className="w-4 h-4 text-slate-600" />
                    <span>E. Kemasan (Packaging & Extras)</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                    {formatIDR(packagingTotal)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                  <div>
                    <label className="block text-slate-500 font-medium mb-1">Plastik Ziplock / Bag</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-[10px] text-slate-400">Rp</span>
                      <input
                        type="number"
                        value={bagPrice}
                        onChange={(e) => setBagPrice(parseFloat(e.target.value) || 0)}
                        className="w-full pl-7 pr-2 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-500 font-medium mb-1">Thank You Card/Sticker</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-[10px] text-slate-400">Rp</span>
                      <input
                        type="number"
                        value={stickerPrice}
                        onChange={(e) => setStickerPrice(parseFloat(e.target.value) || 0)}
                        className="w-full pl-7 pr-2 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-500 font-medium mb-1">Dus Box (Jika Ada)</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-[10px] text-slate-400">Rp</span>
                      <input
                        type="number"
                        value={boxPrice}
                        onChange={(e) => setBoxPrice(parseFloat(e.target.value) || 0)}
                        className="w-full pl-7 pr-2 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-700"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Category: Miscellaneous / Lain-lain */}
              <div className="border border-slate-150 rounded-xl p-4.5 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
                    <Coins className="w-4 h-4 text-slate-600" />
                    <span>F. Pengeluaran Tambahan Lainnya</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                    {formatIDR(otherTotal)}
                  </span>
                </div>

                <div className="text-xs pt-1">
                  <label className="block text-slate-500 font-medium mb-1">Total Biaya Tambahan (Contoh: Pola Master, Ekspedisi Roll)</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1.5 text-slate-400">Rp</span>
                    <input
                      type="number"
                      value={otherCostTotal}
                      onChange={(e) => setOtherCostTotal(parseFloat(e.target.value) || 0)}
                      className="w-full pl-7 pr-2.5 py-1.5 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* DYNAMIC CALCULATIONS & ACTION CARD (Right Side) - occupies 5 cols */}
          <div className="lg:col-span-5 space-y-6">
            {/* HPP Result Box */}
            <div className="bg-[#580001] text-white rounded-2xl p-6 border border-[#580001] shadow-xl space-y-5">
              <div>
                <span className="text-[10px] font-bold text-amber-200 uppercase tracking-wider bg-white/15 px-2.5 py-1 rounded">
                  Hasil Perhitungan HPP
                </span>
                <p className="text-white/80 text-xs mt-3">HPP Satuan (per PCS):</p>
                <h1 className="text-3.5xl font-mono font-bold text-white mt-1">
                  {formatIDR(hppPerPiece)}
                </h1>
                <p className="text-white/70 text-[10px] mt-1.5">
                  Dari total produksi batch <strong className="text-white font-semibold">{qty} pcs</strong> dengan total anggaran pengeluaran <strong className="text-white font-semibold">{formatIDR(totalCostOfProduction)}</strong>.
                </p>
              </div>

              {/* Mini visual ledger line */}
              <div className="border-t border-white/20 pt-4.5 space-y-2.5 text-xs">
                <div className="flex justify-between text-white/80">
                  <span>
                    A. {rawMaterialType === 'baju_jadi' 
                      ? 'Baju Jadi (Kaos Polos/Blank)' 
                      : rawMaterialType === 'kain' 
                        ? 'Kain Mentah & Rib' 
                        : 'Bahan Baku (Baju Jadi + Kain)'}
                  </span>
                  <span className="font-mono text-white">{formatIDR(fabricTotal)}</span>
                </div>
                <div className="flex justify-between text-white/80">
                  <span>B. Total Aplikasi Sablon/Bordir</span>
                  <span className="font-mono text-white">{formatIDR(printTotal)}</span>
                </div>
                <div className="flex justify-between text-white/80">
                  <span>C. Total CMT / Jasa Jahit</span>
                  <span className="font-mono text-white">{formatIDR(cmtTotal)}</span>
                </div>
                <div className="flex justify-between text-white/80">
                  <span>D. Total Aksesoris Branding</span>
                  <span className="font-mono text-white">{formatIDR(accessoriesTotal)}</span>
                </div>
                <div className="flex justify-between text-white/80">
                  <span>E. Total Kemasan (Packaging)</span>
                  <span className="font-mono text-white">{formatIDR(packagingTotal)}</span>
                </div>
                {otherCostTotal > 0 && (
                  <div className="flex justify-between text-white/80">
                    <span>F. Pengeluaran Lainnya</span>
                    <span className="font-mono text-white">{formatIDR(otherTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold border-t border-white/20 pt-3 text-white">
                  <span>TOTAL BIAYA PRODUKSI BATCH</span>
                  <span className="font-mono">{formatIDR(totalCostOfProduction)}</span>
                </div>
              </div>

              {/* Save History & Post to Ledger Button Group */}
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                <button
                  type="button"
                  onClick={openSaveModal}
                  className="w-full bg-[#430001] hover:bg-[#360001] text-white text-xs font-semibold py-2.5 px-4 rounded-xl border border-white/20 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  Simpan Riwayat
                </button>
                <button
                  type="button"
                  onClick={openPostingModal}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-black/20"
                >
                  <Coins className="w-4 h-4" />
                  Catat Jurnal
                </button>
              </div>
            </div>

            {/* Pricing Simulation Panel with Input Margin Target & Suggested Selling Price */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
              <div className="flex items-center justify-between border-b pb-3 border-slate-100">
                <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Percent className="w-4 h-4 text-emerald-600" />
                  2. Input Margin Target & Harga Jual Disarankan
                </h3>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-100">
                  Otomatis
                </span>
              </div>

              <div className="space-y-5">
                {/* Input Margin Target Retail */}
                <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <label htmlFor="input-margin-target-retail" className="text-xs font-bold text-slate-800 block">
                        Input Margin Target Retail (%)
                      </label>
                      <p className="text-[10px] text-slate-400">
                        Persentase laba kotor dari harga jual retail
                      </p>
                    </div>

                    {/* Numeric Input */}
                    <div className="flex items-center gap-1.5 self-start sm:self-auto">
                      <div className="relative w-28">
                        <input
                          id="input-margin-target-retail"
                          type="number"
                          min="1"
                          max="95"
                          step="1"
                          value={targetMargin}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setTargetMargin(isNaN(val) ? 0 : Math.min(Math.max(val, 0), 95));
                          }}
                          className="w-full pl-3 pr-7 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 text-right focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                          placeholder="60"
                        />
                        <span className="absolute right-2.5 top-1.5 text-xs font-bold text-slate-400 pointer-events-none">
                          %
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[10px] text-slate-400 font-medium mr-1">Preset:</span>
                    {[40, 50, 60, 65, 70, 75].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setTargetMargin(preset)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition cursor-pointer ${
                          targetMargin === preset
                            ? 'bg-[#580001] text-white shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-[#580001]'
                        }`}
                      >
                        {preset}%
                      </button>
                    ))}
                  </div>

                  {/* Range Slider */}
                  <input
                    type="range"
                    min="10"
                    max="90"
                    value={targetMargin}
                    onChange={(e) => setTargetMargin(parseInt(e.target.value) || 0)}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                    title={`Geser untuk menyesuaikan margin: ${targetMargin}%`}
                  />

                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    💡 Rekomendasi Brand Fashion: <strong>60% - 75%</strong> untuk menutup biaya pemasaran (iklan digital, endorsement), kemasan eksklusif, dan overhead operasional.
                  </p>
                </div>

                {/* Prominent Suggested Selling Price Result */}
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200 rounded-xl p-4.5 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5 text-emerald-600" />
                      Harga Jual yang Disarankan (Retail)
                    </span>
                    <span className="text-[10px] font-semibold bg-emerald-200/60 text-emerald-900 px-2 py-0.5 rounded">
                      Margin {targetMargin}%
                    </span>
                  </div>

                  <div>
                    <h4 className="text-2xl sm:text-3xl font-mono font-black text-emerald-950 tracking-tight">
                      {formatIDR(calculatedRetailPrice)}
                      <span className="text-xs font-normal text-emerald-700 ml-1.5">/ pcs</span>
                    </h4>
                    <p className="text-[11px] text-emerald-800/80 mt-1">
                      Dihitung otomatis dari HPP <strong>{formatIDR(hppPerPiece)}</strong> dengan target margin <strong>{targetMargin}%</strong>.
                    </p>
                  </div>

                  {/* Detailed breakdown metrics */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-200/60 text-[11px]">
                    <div className="bg-white/80 rounded-lg p-2.5 border border-emerald-100">
                      <span className="text-slate-500 text-[10px] block">Laba Kotor / Pcs:</span>
                      <span className="font-mono font-bold text-emerald-900">{formatIDR(profitPerPieceRetail)}</span>
                    </div>
                    <div className="bg-white/80 rounded-lg p-2.5 border border-emerald-100">
                      <span className="text-slate-500 text-[10px] block">Markup dari HPP:</span>
                      <span className="font-mono font-bold text-emerald-900">
                        +{hppPerPiece > 0 ? Math.round(((calculatedRetailPrice - hppPerPiece) / hppPerPiece) * 100) : 0}%
                      </span>
                    </div>
                  </div>

                  {/* Psychological Pricing Options */}
                  <div className="bg-white/90 rounded-lg p-2.5 border border-emerald-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-600">Opsi Harga Retail Psikologis:</span>
                    <div className="flex items-center gap-2 font-mono font-semibold text-slate-800">
                      <span className="bg-emerald-50 text-emerald-900 px-1.5 py-0.5 rounded border border-emerald-200/60" title="Pembulatan ke ribuan terdekat">
                        {formatIDR(psychologicalRetailRound)}
                      </span>
                      <span className="text-slate-300">atau</span>
                      <span className="bg-emerald-50 text-emerald-900 px-1.5 py-0.5 rounded border border-emerald-200/60" title="Akhiran .900 (misal: 149.000)">
                        {formatIDR(psychologicalRetail900)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Input Margin Target Grosir / Reseller */}
                <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <label htmlFor="input-margin-target-wholesale" className="text-xs font-bold text-slate-800 block">
                        Input Margin Target Grosir / Reseller (%)
                      </label>
                      <p className="text-[10px] text-slate-400">
                        Untuk pesanan partai besar (lusinan / grosir agen)
                      </p>
                    </div>

                    {/* Numeric Input */}
                    <div className="flex items-center gap-1.5 self-start sm:self-auto">
                      <div className="relative w-28">
                        <input
                          id="input-margin-target-wholesale"
                          type="number"
                          min="1"
                          max="70"
                          step="1"
                          value={wholesaleMargin}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setWholesaleMargin(isNaN(val) ? 0 : Math.min(Math.max(val, 0), 70));
                          }}
                          className="w-full pl-3 pr-7 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 text-right focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                          placeholder="30"
                        />
                        <span className="absolute right-2.5 top-1.5 text-xs font-bold text-slate-400 pointer-events-none">
                          %
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Preset Buttons for Wholesale */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[10px] text-slate-400 font-medium mr-1">Preset:</span>
                    {[20, 25, 30, 35, 40].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setWholesaleMargin(preset)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition cursor-pointer ${
                          wholesaleMargin === preset
                            ? 'bg-indigo-900 text-white shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        {preset}%
                      </button>
                    ))}
                  </div>

                  {/* Range Slider */}
                  <input
                    type="range"
                    min="5"
                    max="60"
                    value={wholesaleMargin}
                    onChange={(e) => setWholesaleMargin(parseInt(e.target.value) || 0)}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    title={`Geser untuk menyesuaikan margin grosir: ${wholesaleMargin}%`}
                  />

                  {/* Suggested Wholesale Price Box */}
                  <div className="flex items-center justify-between bg-indigo-50/60 border border-indigo-100 rounded-lg p-3 pt-2.5">
                    <div>
                      <span className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider block">Harga Jual Grosir Disarankan:</span>
                      <span className="text-base font-mono font-bold text-indigo-950">
                        {formatIDR(calculatedWholesalePrice)}
                      </span>
                    </div>
                    <div className="text-right text-[10px] text-indigo-700">
                      <span>Laba: {formatIDR(wholesaleProfitPerPiece)}/pcs</span>
                      <div className="font-semibold text-indigo-900">
                        Markup +{hppPerPiece > 0 ? Math.round(((calculatedWholesalePrice - hppPerPiece) / hppPerPiece) * 100) : 0}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Simulated Profit projection Card */}
                <div className="bg-[#580001] text-white rounded-xl p-4.5 space-y-2.5 text-xs border border-[#580001] shadow-md">
                  <div className="flex items-center justify-between border-b border-white/20 pb-2">
                    <div className="flex items-center gap-1.5 text-white font-bold text-[11px] uppercase tracking-wider">
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>Proyeksi Laba Batch ({qty} pcs)</span>
                    </div>
                    <span className="text-[10px] bg-white/15 text-white px-2 py-0.5 rounded font-mono">
                      Retail @ {formatIDR(calculatedRetailPrice)}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-white/80">
                    <div className="flex justify-between">
                      <span className="text-white/70">Total Modal Produksi:</span>
                      <strong className="text-white font-mono">{formatIDR(totalCostOfProduction)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Total Proyeksi Omset Penjualan:</span>
                      <strong className="text-amber-200 font-mono">{formatIDR(calculatedRetailPrice * qty)}</strong>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-white/20 text-sm font-bold">
                      <span className="text-white">Potensi Laba Bersih Batch:</span>
                      <strong className="text-amber-300 font-mono">{formatIDR(totalProfitRetail)}</strong>
                    </div>
                  </div>
                </div>

                {/* Formula Transparency Card */}
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-[10px] text-slate-500 space-y-1">
                  <div className="flex items-center gap-1 font-semibold text-slate-700">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                    <span>Rumus Penentuan Harga Jual Berdasarkan Margin Target:</span>
                  </div>
                  <p className="font-mono text-slate-600 pl-4.5">
                    Harga Jual Disarankan = HPP Satuan / (1 - (Margin Target / 100))
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      ) : (
        /* SAVED CALCULATIONS & BENCHMARKS TABLE */
        <div className="space-y-6">
          {/* Top Benchmark & History KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Active Benchmark Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-4.5 border border-slate-700 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1">
                  <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
                  Patokan Utama Aktif
                </span>
                <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-slate-300 font-mono">
                  Aktif
                </span>
              </div>
              <h4 className="text-sm font-bold text-white mt-1 truncate">
                {activeBenchmark ? activeBenchmark.productName : 'Belum Dipilih'}
              </h4>
              <div className="mt-3 flex items-baseline justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block">HPP Patokan:</span>
                  <span className="text-base font-black font-mono text-amber-300">
                    {activeBenchmark ? formatIDR(activeBenchmark.hppPerPiece) : 'Rp 0'}
                  </span>
                </div>
                {activeBenchmark && (
                  <button
                    type="button"
                    onClick={() => setSelectedDetailCalc(activeBenchmark)}
                    className="text-[11px] text-slate-300 hover:text-white underline underline-offset-2 cursor-pointer"
                  >
                    Lihat Resep
                  </button>
                )}
              </div>
            </div>

            {/* Average HPP Across History */}
            <div className="bg-white rounded-2xl p-4.5 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Rata-rata HPP Produk
                </span>
                <Calculator className="w-4 h-4 text-[#580001]" />
              </div>
              <div className="mt-2">
                <div className="text-xl font-black font-mono text-slate-900">
                  {formatIDR(savedCalcs.length > 0 ? Math.round(savedCalcs.reduce((a, b) => a + b.hppPerPiece, 0) / savedCalcs.length) : 0)}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Dari total {savedCalcs.length} artikel tersimpan
                </p>
              </div>
            </div>

            {/* Average Target Margin */}
            <div className="bg-white rounded-2xl p-4.5 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Margin Target Rata-rata
                </span>
                <Percent className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-2">
                <div className="text-xl font-black font-mono text-emerald-700">
                  {savedCalcs.length > 0 ? Math.round(savedCalcs.reduce((a, b) => a + (b.targetMargin || 60), 0) / savedCalcs.length) : 0}%
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Standar gross profit margin ritel
                </p>
              </div>
            </div>

            {/* Total Standard Benchmarks */}
            <div className="bg-white rounded-2xl p-4.5 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Patokan Standar
                </span>
                <Bookmark className="w-4 h-4 text-amber-500" />
              </div>
              <div className="mt-2">
                <div className="text-xl font-black font-mono text-slate-900">
                  {savedCalcs.filter(c => c.isBenchmark).length} <span className="text-xs font-normal text-slate-400">Artikel</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Dapat dijadikan tolok ukur produksi baru
                </p>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Table Control Header */}
            <div className="px-6 py-4.5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <span>Daftar Riwayat & Patokan Acuan HPP</span>
                  <span className="bg-[#580001]/10 text-[#580001] text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                    {savedCalcs.length} Data
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Klik ikon bintang ⭐ untuk menandai sebagai patokan standar, atau gunakan tombol aksi untuk melihat rincian resep.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
                {/* Filter Chips */}
                <div className="flex bg-slate-200/70 p-1 rounded-xl text-xs shrink-0 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setHistoryFilter('all')}
                    className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                      historyFilter === 'all' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Semua ({savedCalcs.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryFilter('benchmark')}
                    className={`px-3 py-1 rounded-lg font-medium transition flex items-center gap-1 cursor-pointer ${
                      historyFilter === 'benchmark' ? 'bg-white text-amber-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ⭐ Patokan ({savedCalcs.filter(c => c.isBenchmark).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryFilter('baju_jadi')}
                    className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                      historyFilter === 'baju_jadi' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Baju Jadi
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryFilter('kain')}
                    className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                      historyFilter === 'kain' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Kain Mentah
                  </button>
                </div>

                {/* Search Box */}
                <div className="relative w-full sm:w-60">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Cari artikel, bahan, catatan..."
                    value={searchSaved}
                    onChange={(e) => setSearchSaved(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#580001]/15 focus:border-[#580001]"
                  />
                </div>
              </div>
            </div>

            {/* Mobile Card View (Phone screens) & Responsive Table (Tablet/Desktop) */}
            {savedCalcs.filter(c => {
              const matchesSearch = !searchSaved || 
                c.productName.toLowerCase().includes(searchSaved.toLowerCase()) || 
                (c.rawMaterialType || '').toLowerCase().includes(searchSaved.toLowerCase()) ||
                (c.blankApparelName || '').toLowerCase().includes(searchSaved.toLowerCase()) ||
                (c.notes || '').toLowerCase().includes(searchSaved.toLowerCase());

              if (!matchesSearch) return false;
              if (historyFilter === 'benchmark') return c.isBenchmark;
              if (historyFilter === 'baju_jadi') return c.rawMaterialType === 'baju_jadi';
              if (historyFilter === 'kain') return c.rawMaterialType === 'kain';
              return true;
            }).length > 0 ? (
              <>
                {/* Mobile Cards (Only visible on small mobile screens <768px) */}
                <div className="block md:hidden divide-y divide-slate-100">
                  {savedCalcs.filter(c => {
                    const matchesSearch = !searchSaved || 
                      c.productName.toLowerCase().includes(searchSaved.toLowerCase()) || 
                      (c.rawMaterialType || '').toLowerCase().includes(searchSaved.toLowerCase()) ||
                      (c.blankApparelName || '').toLowerCase().includes(searchSaved.toLowerCase()) ||
                      (c.notes || '').toLowerCase().includes(searchSaved.toLowerCase());

                    if (!matchesSearch) return false;
                    if (historyFilter === 'benchmark') return c.isBenchmark;
                    if (historyFilter === 'baju_jadi') return c.rawMaterialType === 'baju_jadi';
                    if (historyFilter === 'kain') return c.rawMaterialType === 'kain';
                    return true;
                  }).map((calc) => {
                    const isActive = calc.id === activeBenchmarkId;
                    return (
                      <div key={`m-${calc.id}`} className={`p-4 space-y-3 transition ${isActive ? 'bg-amber-50/40' : 'hover:bg-slate-50/50'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 text-sm">{calc.productName}</span>
                              {isActive && (
                                <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.2 rounded font-bold">
                                  Patokan Aktif
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 flex-wrap">
                              <span className="font-mono">{calc.createdAt}</span>
                              <span>•</span>
                              <span>{calc.rawMaterialType === 'baju_jadi' ? 'Baju Jadi' : 'Kain Mentah'}</span>
                              {calc.notes && (
                                <>
                                  <span>•</span>
                                  <span className="italic truncate max-w-[140px]">"{calc.notes}"</span>
                                </>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handleToggleBenchmark(calc.id, e)}
                            className="p-1 text-slate-300 hover:text-amber-500 rounded transition shrink-0 cursor-pointer"
                            title={calc.isBenchmark ? 'Patokan standar (klik untuk lepas)' : 'Tandai sebagai patokan'}
                          >
                            <Star className={`w-5 h-5 ${calc.isBenchmark ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                          </button>
                        </div>

                        {/* HPP Highlight Banner */}
                        <div className="bg-[#580001]/5 border border-[#580001]/15 rounded-xl p-3 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">Hasil HPP Satuan</span>
                            <span className="text-base font-mono font-black text-[#580001]">
                              {formatIDR(calc.hppPerPiece)}
                              <span className="text-xs font-normal text-slate-500"> / pcs</span>
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">Batch Produksi</span>
                            <span className="text-xs font-mono font-bold text-slate-800">
                              {calc.qty} pcs ({formatIDR(calc.totalCost)})
                            </span>
                          </div>
                        </div>

                        {/* Secondary Stats */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <span className="text-[10px] text-slate-400 block">Harga Retail ({calc.targetMargin}%)</span>
                            <span className="font-mono font-bold text-emerald-700">{formatIDR(calc.retailPrice)}</span>
                          </div>
                          <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <span className="text-[10px] text-slate-400 block">Harga Grosir ({calc.wholesaleMargin || 35}%)</span>
                            <span className="font-mono font-bold text-indigo-700">{formatIDR(calc.wholesalePrice)}</span>
                          </div>
                        </div>

                        {/* Mobile Actions */}
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                          <div className="flex items-center gap-1.5">
                            {!isActive ? (
                              <button
                                type="button"
                                onClick={(e) => handleSetActiveBenchmark(calc.id, e)}
                                className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                              >
                                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                                <span>Jadikan Patokan</span>
                              </button>
                            ) : (
                              <span className="text-xs text-amber-700 font-bold flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" /> Acuan Aktif
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setSelectedDetailCalc(calc)}
                              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition text-xs font-medium cursor-pointer"
                              title="Rincian Resep"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => loadSavedToForm(calc)}
                              className="p-1.5 text-[#580001] hover:bg-red-50 rounded-lg transition text-xs font-medium cursor-pointer"
                              title="Muat ke Kalkulator"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSaved(calc.id, calc.productName)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Hapus"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table (Visible on Tablet & Desktop >=768px) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/30 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                        <th className="py-3.5 px-4 text-center w-12">Patokan</th>
                        <th className="py-3.5 px-4">Nama Artikel & Spesifikasi</th>
                        <th className="py-3.5 px-4 text-right">Batch</th>
                        <th className="py-3.5 px-4 text-right">Total Anggaran</th>
                        <th className="py-3.5 px-4 text-right">HPP / PCS</th>
                        <th className="py-3.5 px-4 text-right">Margin</th>
                        <th className="py-3.5 px-4 text-right">Harga Retail</th>
                        <th className="py-3.5 px-4 text-right">Harga Grosir</th>
                        <th className="py-3.5 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {savedCalcs.filter(c => {
                        const matchesSearch = !searchSaved || 
                          c.productName.toLowerCase().includes(searchSaved.toLowerCase()) || 
                          (c.rawMaterialType || '').toLowerCase().includes(searchSaved.toLowerCase()) ||
                          (c.blankApparelName || '').toLowerCase().includes(searchSaved.toLowerCase()) ||
                          (c.notes || '').toLowerCase().includes(searchSaved.toLowerCase());

                        if (!matchesSearch) return false;
                        if (historyFilter === 'benchmark') return c.isBenchmark;
                        if (historyFilter === 'baju_jadi') return c.rawMaterialType === 'baju_jadi';
                        if (historyFilter === 'kain') return c.rawMaterialType === 'kain';
                        return true;
                      }).map((calc) => {
                        const isActive = calc.id === activeBenchmarkId;
                        return (
                          <tr key={calc.id} className={`hover:bg-slate-50/60 transition ${isActive ? 'bg-amber-50/30' : ''}`}>
                            {/* Benchmark Star Toggle */}
                            <td className="py-3.5 px-4 text-center">
                              <button
                                type="button"
                                onClick={(e) => handleToggleBenchmark(calc.id, e)}
                                className="p-1 text-slate-300 hover:text-amber-500 rounded transition cursor-pointer"
                                title={calc.isBenchmark ? 'Patokan standar (klik untuk menghapus)' : 'Jadikan patokan standar'}
                              >
                                <Star className={`w-4.5 h-4.5 ${calc.isBenchmark ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                              </button>
                            </td>

                            {/* Product Name & Details */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-slate-900">{calc.productName}</span>
                                {isActive && (
                                  <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                                    <Check className="w-2.5 h-2.5" />
                                    Patokan Aktif
                                  </span>
                                )}
                                {calc.rawMaterialType === 'baju_jadi' ? (
                                  <span className="text-[10px] bg-red-50 text-[#580001] border border-[#580001]/20 px-2 py-0.5 rounded-md font-semibold flex items-center gap-1 shrink-0">
                                    <Shirt className="w-2.5 h-2.5" />
                                    Baju Jadi
                                  </span>
                                ) : calc.rawMaterialType === 'kain' ? (
                                  <span className="text-[10px] bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md font-medium flex items-center gap-1 shrink-0">
                                    <Scissors className="w-2.5 h-2.5" />
                                    Kain Mentah
                                  </span>
                                ) : (
                                  <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md font-medium shrink-0">
                                    Kombinasi
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                                <span className="font-mono">{calc.createdAt}</span>
                                {calc.blankApparelName && calc.rawMaterialType === 'baju_jadi' && (
                                  <>
                                    <span>•</span>
                                    <span className="truncate max-w-xs">{calc.blankApparelName}</span>
                                  </>
                                )}
                                {calc.notes && (
                                  <>
                                    <span>•</span>
                                    <span className="italic text-slate-500 truncate max-w-xs">"{calc.notes}"</span>
                                  </>
                                )}
                              </div>
                            </td>

                            <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-700 whitespace-nowrap">
                              {calc.qty} pcs
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono text-slate-700 whitespace-nowrap">
                              {formatIDR(calc.totalCost)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-black text-slate-950 whitespace-nowrap">
                              <span className="bg-[#580001]/10 text-[#580001] font-bold px-2.5 py-1 rounded-lg border border-[#580001]/20">
                                {formatIDR(calc.hppPerPiece)}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono text-slate-600 whitespace-nowrap">
                              {calc.targetMargin}%
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono text-emerald-700 font-bold whitespace-nowrap">
                              {formatIDR(calc.retailPrice)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono text-indigo-700 font-semibold whitespace-nowrap">
                              {formatIDR(calc.wholesalePrice)}
                            </td>

                            {/* Action Buttons */}
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                {!isActive && (
                                  <button
                                    type="button"
                                    onClick={(e) => handleSetActiveBenchmark(calc.id, e)}
                                    className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-semibold transition cursor-pointer"
                                    title="Jadikan patokan pembanding aktif di kalkulator"
                                  >
                                    Pilih Patokan
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setSelectedDetailCalc(calc)}
                                  className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                  title="Lihat rincian lengkap resep HPP"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => loadSavedToForm(calc)}
                                  className="p-1.5 text-[#580001] hover:bg-red-50 rounded-lg transition text-xs font-semibold cursor-pointer"
                                  title="Gunakan data ini di kalkulator"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSaved(calc.id, calc.productName)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                  title="Hapus riwayat"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="py-16 text-center text-slate-400">
                <div className="flex flex-col items-center justify-center">
                  <FileText className="w-10 h-10 text-slate-200 mb-2" />
                  <p className="text-sm font-semibold text-slate-600">Tidak ada data kalkulasi yang cocok.</p>
                  <p className="text-xs text-slate-400 mt-1">Coba ubah kata kunci pencarian atau filter kategori di atas.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: Save Calculation Confirmation & Benchmark Designation */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 bg-[#580001]/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-[#580001]/5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#580001] text-white flex items-center justify-center">
                  <Save className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-[#580001] text-sm">
                  Simpan Kalkulasi ke Riwayat
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Nama Artikel / Produk</label>
                <input
                  type="text"
                  value={saveModalProductName}
                  onChange={(e) => setSaveModalProductName(e.target.value)}
                  placeholder="Contoh: Kaos Oversize 24s Sablon Plastisol"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#580001]/20 focus:border-[#580001]"
                />
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Batch Produksi:</span>
                  <span className="font-mono font-bold text-slate-900">{qty} pcs</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Total Anggaran:</span>
                  <span className="font-mono text-slate-900">{formatIDR(totalCostOfProduction)}</span>
                </div>
                <div className="flex justify-between text-slate-800 font-bold border-t border-slate-200/80 pt-1.5">
                  <span>HPP per Pcs:</span>
                  <span className="font-mono text-[#580001] text-sm">{formatIDR(hppPerPiece)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Harga Retail Disarankan:</span>
                  <span className="font-mono">{formatIDR(calculatedRetailPrice)}</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Catatan Produksi / Spesifikasi (Opsional)</label>
                <textarea
                  value={saveModalNotes}
                  onChange={(e) => setSaveModalNotes(e.target.value)}
                  placeholder="Vendor kain, jenis tinta sablon, ketebalan kain, penjahit CMT, dll..."
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#580001]/20 focus:border-[#580001]"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-amber-200 bg-amber-50/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveModalIsBenchmark}
                    onChange={(e) => setSaveModalIsBenchmark(e.target.checked)}
                    className="w-4 h-4 text-amber-500 rounded focus:ring-amber-400"
                  />
                  <div>
                    <span className="text-xs font-bold text-amber-950 flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      Jadikan sebagai Patokan Standar Acuan
                    </span>
                    <p className="text-[10px] text-amber-800 mt-0.5">
                      Akan langsung menjadi acuan perbandingan saat menghitung artikel pakaian lainnya.
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer order-3 sm:order-1"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmSaveCalculation(false)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 order-2 sm:order-2"
                  title="Simpan kalkulasi dan tetap berada di kalkulator"
                >
                  <Save className="w-3.5 h-3.5" />
                  Simpan Saja
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmSaveCalculation(true)}
                  className="px-4 py-2 bg-[#580001] hover:bg-[#430001] text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5 order-1 sm:order-3"
                  title="Simpan kalkulasi dan langsung buka tab riwayat untuk melihat hasil & patokan"
                >
                  <Bookmark className="w-3.5 h-3.5 text-amber-300" />
                  Simpan & Buka Riwayat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Full Benchmark Recipe Breakdown Detail */}
      {selectedDetailCalc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in zoom-in-95 duration-150 my-8">
            <div className="p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1">
                    <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
                    Rincian Resep Patokan HPP
                  </span>
                  {selectedDetailCalc.id === activeBenchmarkId && (
                    <span className="text-[10px] bg-amber-400 text-slate-950 font-bold px-2 py-0.5 rounded-full">
                      Patokan Aktif
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-white mt-1">
                  {selectedDetailCalc.productName}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Batch {selectedDetailCalc.qty} pcs • Dibuat {selectedDetailCalc.createdAt}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetailCalc(null)}
                className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Key Highlights */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Biaya Batch</span>
                  <span className="text-sm font-black font-mono text-slate-900 mt-1 block">
                    {formatIDR(selectedDetailCalc.totalCost)}
                  </span>
                </div>
                <div className="bg-[#580001]/5 border border-[#580001]/20 rounded-xl p-3 text-center">
                  <span className="text-[10px] uppercase font-bold text-[#580001] block">HPP Satuan</span>
                  <span className="text-base font-black font-mono text-[#580001] mt-1 block">
                    {formatIDR(selectedDetailCalc.hppPerPiece)}
                  </span>
                </div>
                <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-3 text-center">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 block">Harga Retail ({selectedDetailCalc.targetMargin}%)</span>
                  <span className="text-sm font-black font-mono text-emerald-800 mt-1 block">
                    {formatIDR(selectedDetailCalc.retailPrice)}
                  </span>
                </div>
              </div>

              {/* Cost Structure Breakdown */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Struktur Komponen Biaya Produksi:
                </h4>
                <div className="border border-slate-100 rounded-xl overflow-hidden text-xs">
                  <div className="flex justify-between p-2.5 bg-slate-50 border-b border-slate-100">
                    <span className="font-semibold text-slate-700">Komponen Biaya</span>
                    <span className="font-semibold text-slate-700">Subtotal & Porsi</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    <div className="flex justify-between p-2.5">
                      <span className="text-slate-600">1. Bahan Baku (Baju Jadi / Kain Roll)</span>
                      <span className="font-mono font-semibold text-slate-900">
                        {formatIDR(selectedDetailCalc.fabricCost)} ({selectedDetailCalc.totalCost > 0 ? Math.round((selectedDetailCalc.fabricCost / selectedDetailCalc.totalCost) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="flex justify-between p-2.5">
                      <span className="text-slate-600">2. Aplikasi Sablon / Bordir</span>
                      <span className="font-mono font-semibold text-slate-900">
                        {formatIDR(selectedDetailCalc.printCost)} ({selectedDetailCalc.totalCost > 0 ? Math.round((selectedDetailCalc.printCost / selectedDetailCalc.totalCost) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="flex justify-between p-2.5">
                      <span className="text-slate-600">3. CMT / Ongkos Jahit Potong</span>
                      <span className="font-mono font-semibold text-slate-900">
                        {formatIDR(selectedDetailCalc.cmtCost)} ({selectedDetailCalc.totalCost > 0 ? Math.round((selectedDetailCalc.cmtCost / selectedDetailCalc.totalCost) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="flex justify-between p-2.5">
                      <span className="text-slate-600">4. Aksesoris Branding (Woven, Hangtag, Label)</span>
                      <span className="font-mono font-semibold text-slate-900">
                        {formatIDR(selectedDetailCalc.accessoriesCost)} ({selectedDetailCalc.totalCost > 0 ? Math.round((selectedDetailCalc.accessoriesCost / selectedDetailCalc.totalCost) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="flex justify-between p-2.5">
                      <span className="text-slate-600">5. Packaging & Kemasan Box/Bag</span>
                      <span className="font-mono font-semibold text-slate-900">
                        {formatIDR(selectedDetailCalc.packagingCost)} ({selectedDetailCalc.totalCost > 0 ? Math.round((selectedDetailCalc.packagingCost / selectedDetailCalc.totalCost) * 100) : 0}%)
                      </span>
                    </div>
                    {selectedDetailCalc.otherCost > 0 && (
                      <div className="flex justify-between p-2.5">
                        <span className="text-slate-600">6. Biaya Lain-lain / Tambahan</span>
                        <span className="font-mono font-semibold text-slate-900">
                          {formatIDR(selectedDetailCalc.otherCost)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes if available */}
              {selectedDetailCalc.notes && (
                <div className="bg-amber-50/70 border border-amber-200/70 rounded-xl p-3 text-xs text-amber-950">
                  <span className="font-bold block mb-0.5">Catatan Spesifikasi:</span>
                  <p>{selectedDetailCalc.notes}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {selectedDetailCalc.id !== activeBenchmarkId && (
                    <button
                      type="button"
                      onClick={() => {
                        handleSetActiveBenchmark(selectedDetailCalc.id);
                        setSelectedDetailCalc(null);
                      }}
                      className="w-full sm:w-auto px-3.5 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs rounded-xl transition cursor-pointer"
                    >
                      Jadikan Patokan Acuan Aktif
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedDetailCalc(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
                  >
                    Tutup
                  </button>
                  <button
                    type="button"
                    onClick={() => loadSavedToForm(selectedDetailCalc)}
                    className="px-4 py-2 bg-[#580001] hover:bg-[#430001] text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Terapkan ke Kalkulator
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Journal Posting Modal (Double Entry compliant) */}
      {isPostingModalOpen && (
        <div className="fixed inset-0 bg-[#580001]/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-[#580001]/5">
              <h3 className="font-bold text-[#580001] text-sm">
                Catat Jurnal Produksi Baru (Double-Entry)
              </h3>
              <button
                onClick={() => setIsPostingModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 text-amber-800 p-3 rounded-xl text-xs">
                <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5 text-amber-600" />
                <div className="space-y-1">
                  <p className="font-bold">Informasi Akuntansi Double-Entry:</p>
                  <p className="leading-relaxed">
                    Sistem akan memindahkan dana dari rekening pembayaran (Kas/Bank) Anda ke dalam aset berwujud yaitu <strong>Persediaan Barang</strong>.
                  </p>
                </div>
              </div>

              {/* Form entries inside modal */}
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Deskripsi Jurnal</label>
                  <input
                    type="text"
                    value={postingDesc}
                    onChange={(e) => setPostingDesc(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-250 rounded-xl text-xs text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Akun Debit (+) (Persediaan)</label>
                    <select
                      value={debitAccount}
                      onChange={(e) => setDebitAccount(e.target.value)}
                      className="w-full px-2 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-700"
                    >
                      {accounts.map(acc => (
                        <option key={acc.code} value={acc.code}>
                          [{acc.code}] {acc.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Akun Kredit (-) (Sumber Dana)</label>
                    <select
                      value={creditAccount}
                      onChange={(e) => setCreditAccount(e.target.value)}
                      className="w-full px-2 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700"
                    >
                      {accounts.map(acc => (
                        <option key={acc.code} value={acc.code}>
                          [{acc.code}] {acc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Nominal yang Akan Dijurnal</label>
                  <input
                    type="text"
                    disabled
                    value={formatIDR(postingTotal)}
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 font-mono font-bold text-slate-800 rounded-xl"
                  />
                </div>
              </div>

              {/* Visual preview of ledger */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 space-y-1.5 text-[11px]">
                <p className="font-bold text-slate-700 uppercase tracking-wider text-[9px]">Pratinjau Jurnal Umum:</p>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-800 font-medium">({debitAccount}) - {accounts.find(a=>a.code === debitAccount)?.name}</span>
                  <span className="font-mono text-emerald-600 font-bold">Debit: {formatIDR(postingTotal)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-600 pl-4">({creditAccount}) - {accounts.find(a=>a.code === creditAccount)?.name}</span>
                  <span className="font-mono text-slate-700 font-bold">Kredit: {formatIDR(postingTotal)}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPostingModalOpen(false)}
                  className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold rounded-xl border border-slate-200 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handlePostToJournal}
                  className="px-4 py-2 bg-[#580001] hover:bg-[#430001] text-white text-xs font-semibold rounded-xl transition shadow-sm cursor-pointer"
                >
                  Posting ke Jurnal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
