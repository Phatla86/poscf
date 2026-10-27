import React, { useState } from 'react';
import {
  Barcode,
  Search,
  Plus,
  Minus,
  Trash2,
  QrCode,
  ShoppingBag,
  SlidersHorizontal,
  ArrowLeft,
  LayoutGrid,
  Coffee,
  ReceiptText,
  Pencil,
  PlusCircle,
  CheckCircle2,
  Printer,
} from 'lucide-react';
import {
  formatVND,
  calculateModifierUnitPrice,
  calculateOrderTotals,
  findProductByBarcode,
  TOPPING_PRICES,
  SIZE_SURCHARGE,
  type Product,
  type ProductCategory,
  type CartItem,
  type CartItemModifier,
  type OrderChannel,
  type PaymentMethod,
  type PosOrder,
} from '../utils/posLogic';
import { ProductIllustration } from './ProductIllustration';

export type PosStepTab = 'tables' | 'menu' | 'cart';

interface PosTerminalViewProps {
  products: Product[];
  orders?: PosOrder[];
  cart: CartItem[];
  onAddToCart: (product: Product, modifier: CartItemModifier, quantity: number) => void;
  onUpdateCartQuantity: (cartItemId: string, delta: number) => void;
  onRemoveCartItem: (cartItemId: string) => void;
  onClearCart: () => void;
  selectedChannel: OrderChannel;
  onSelectChannel: (channel: OrderChannel) => void;
  selectedTable: string;
  onSelectTable: (table: string) => void;
  manualDiscountPercent: number;
  onChangeManualDiscount: (pct: number) => void;
  onOpenPaymentModal: (preferredMethod: PaymentMethod) => void;
  onSaveProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  posStep?: PosStepTab;
  onChangePosStep?: (step: PosStepTab) => void;
  lastCompletedOrder?: PosOrder | null;
  onOpenReceipt?: (order: PosOrder) => void;
}

export const CATEGORIES: { id: 'all' | ProductCategory; label: string }[] = [
  { id: 'all', label: 'Tất cả món' },
  { id: 'coffee', label: 'Cà phê' },
  { id: 'tea', label: 'Trà & Matcha' },
  { id: 'freeze', label: 'Đá xay' },
  { id: 'bakery', label: 'Bánh ngọt' },
  { id: 'beans', label: 'Hạt rang' },
];

const PRODUCT_CATEGORY_OPTIONS: { id: ProductCategory; label: string }[] = [
  { id: 'coffee', label: 'Cà phê' },
  { id: 'tea', label: 'Trà & Matcha' },
  { id: 'freeze', label: 'Đá xay' },
  { id: 'bakery', label: 'Bánh ngọt' },
  { id: 'beans', label: 'Hạt rang' },
];

const CHANNELS: { id: OrderChannel; label: string; desc: string }[] = [
  { id: 'dine_in', label: 'Tại bàn', desc: 'Phục vụ tại quán' },
  { id: 'takeaway', label: 'Mang đi', desc: 'Đóng gói mang về' },
  { id: 'grabfood', label: 'GrabFood', desc: 'Tài xế nhận đơn' },
  { id: 'shopeefood', label: 'ShopeeFood', desc: 'Tài xế nhận đơn' },
  { id: 'web', label: 'Web Order', desc: 'Đặt trước qua Web' },
];

export const TABLES = [
  'Bàn 01',
  'Bàn 02',
  'Bàn 03',
  'Bàn 04',
  'Bàn 05',
  'Bàn 06',
  'Bàn 07',
  'Bàn 08',
  'Bàn 09',
  'Bàn 10',
];

interface EditingMenuForm {
  id: string;
  isNew: boolean;
  name: string;
  price: number;
  category: ProductCategory;
  sku: string;
  barcode: string;
  subtitle: string;
}

export const PosTerminalView: React.FC<PosTerminalViewProps> = ({
  products,
  orders = [],
  cart,
  onAddToCart,
  onUpdateCartQuantity,
  onRemoveCartItem,
  onClearCart,
  selectedChannel,
  onSelectChannel,
  selectedTable,
  onSelectTable,
  manualDiscountPercent,
  onChangeManualDiscount,
  onOpenPaymentModal,
  onSaveProduct,
  onDeleteProduct,
  posStep: controlledPosStep,
  onChangePosStep,
  lastCompletedOrder,
  onOpenReceipt,
}) => {
  const [internalPosStep, setInternalPosStep] = useState<PosStepTab>('tables');
  const posStep = controlledPosStep ?? internalPosStep;
  const setPosStep = (next: PosStepTab) => {
    setInternalPosStep(next);
    onChangePosStep?.(next);
  };
  const [activeCategory, setActiveCategory] = useState<'all' | ProductCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeFeedback, setBarcodeFeedback] = useState<string | null>(null);
  const [showBarcodeBox, setShowBarcodeBox] = useState(false);

  // Customization modal state
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);
  const [modifierState, setModifierState] = useState<CartItemModifier>({
    size: 'M',
    sugarLevel: '70%',
    iceLevel: 'Bình thường',
    toppings: [],
  });

  // Direct Web Menu Editor Modal State
  const [editingMenuForm, setEditingMenuForm] = useState<EditingMenuForm | null>(null);

  const filteredProducts = products.filter((p) => {
    const matchesCat = activeCategory === 'all' || p.category === activeCategory;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.barcode.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  const pricing = calculateOrderTotals(
    cart,
    null,
    manualDiscountPercent,
    0.08
  );

  const handleSelectTableAndAdvance = (table: string) => {
    onSelectChannel('dine_in');
    onSelectTable(table);
    setPosStep('menu');
  };

  const handleSelectChannelAndAdvance = (ch: OrderChannel, label: string) => {
    onSelectChannel(ch);
    if (ch !== 'dine_in') {
      onSelectTable(label);
      setPosStep('menu');
    } else if (!TABLES.includes(selectedTable)) {
      onSelectTable('Bàn 01');
    }
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerBarcodeScan(barcodeInput);
  };

  const triggerBarcodeScan = (code: string) => {
    const found = findProductByBarcode(products, code);
    if (found) {
      onAddToCart(
        found,
        { size: 'M', sugarLevel: '70%', iceLevel: 'Bình thường', toppings: [] },
        1
      );
      setBarcodeInput('');
      setBarcodeFeedback(`Đã quét [${found.barcode}] → +1 ${found.name}`);
    } else {
      setBarcodeFeedback(`Không tìm thấy mã "${code}"`);
    }
  };

  const openCustomizeModal = (product: Product) => {
    setCustomizingProduct(product);
    setModifierState({
      size: product.category === 'bakery' || product.category === 'beans' ? 'S' : 'M',
      sugarLevel: '70%',
      iceLevel: 'Bình thường',
      toppings: [],
    });
  };

  const openAddProductModal = () => {
    const nextIdx = products.length + 1;
    setEditingMenuForm({
      id: `prd_custom_${Date.now()}`,
      isNew: true,
      name: '',
      price: 45000,
      category: activeCategory === 'all' ? 'coffee' : activeCategory,
      sku: `CF-${String(nextIdx).padStart(2, '0')}`,
      barcode: `89385010${String(nextIdx).padStart(2, '0')}`,
      subtitle: 'Món mới thêm trực tiếp trên quầy',
    });
  };

  const openEditProductModal = (product: Product) => {
    setEditingMenuForm({
      id: product.id,
      isNew: false,
      name: product.name,
      price: product.price,
      category: product.category,
      sku: product.sku,
      barcode: product.barcode,
      subtitle: product.subtitle,
    });
  };

  const handleSaveMenuForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMenuForm || !editingMenuForm.name.trim()) return;
    const existing = products.find((p) => p.id === editingMenuForm.id);
    const saved: Product = {
      id: editingMenuForm.id,
      sku: editingMenuForm.sku.trim() || 'CF-NEW',
      barcode: editingMenuForm.barcode.trim() || String(Date.now()).slice(-10),
      name: editingMenuForm.name.trim(),
      category: editingMenuForm.category,
      price: Math.max(0, Number(editingMenuForm.price) || 0),
      cost: existing?.cost || Math.round((Number(editingMenuForm.price) || 0) * 0.3),
      available: existing?.available ?? true,
      subtitle: editingMenuForm.subtitle.trim() || 'Món pha chế tại quán',
      recipe: existing?.recipe || [{ ingredientId: 'inv_1', amountPerCup: 0.02 }],
    };
    onSaveProduct(saved);
    setEditingMenuForm(null);
  };

  const handleQuickAdd = (product: Product) => {
    onAddToCart(
      product,
      {
        size: product.category === 'bakery' || product.category === 'beans' ? 'S' : 'M',
        sugarLevel: '70%',
        iceLevel: 'Bình thường',
        toppings: [],
      },
      1
    );
  };

  const toggleTopping = (topping: string) => {
    setModifierState((prev) => ({
      ...prev,
      toppings: prev.toppings.includes(topping)
        ? prev.toppings.filter((t) => t !== topping)
        : [...prev.toppings, topping],
    }));
  };

  const getProductQtyInCart = (productId: string) =>
    cart.filter((item) => item.product.id === productId).reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="pb-24 lg:pb-0">
      {/* Mobile & Tablet 3-Step Segmented Bar (< 1024px) — Overflow-safe on 360px phones */}
      <div className="lg:hidden bg-white border border-stone-200 rounded-2xl p-1.5 mb-4 grid grid-cols-3 gap-1.5">
        <button
          type="button"
          onClick={() => setPosStep('tables')}
          className={`min-w-0 overflow-hidden min-h-[42px] px-2 sm:px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
            posStep === 'tables'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5 shrink-0 hidden sm:inline" />
          <span className="truncate">1. {selectedTable}</span>
        </button>

        <button
          type="button"
          onClick={() => setPosStep('menu')}
          className={`min-w-0 overflow-hidden min-h-[42px] px-2 sm:px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
            posStep === 'menu'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Coffee className="w-3.5 h-3.5 shrink-0 hidden sm:inline" />
          <span className="truncate">
            2. Thực đơn <span className="hidden sm:inline">({products.length})</span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => setPosStep('cart')}
          className={`min-w-0 overflow-hidden min-h-[42px] px-2 sm:px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
            posStep === 'cart'
              ? 'bg-amber-700 text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <ReceiptText className="w-3.5 h-3.5 shrink-0 hidden sm:inline" />
          <span className="truncate">3. Phiếu ({pricing.itemCount})</span>
        </button>
      </div>

      {/* Main 12-Column POS Split Layout (Top-aligned on Desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Columns: Step 1 (10 Tables) OR Step 2 (Menu Grid) */}
        <div className={`lg:col-span-8 space-y-4 ${posStep === 'cart' ? 'hidden lg:block' : 'block'}`}>
          {/* Desktop 2-Step Header Bar inside Left Column so Left & Right columns align at top */}
          <div className="hidden lg:flex items-center justify-between bg-white border border-stone-200 rounded-2xl p-2">
            <div className="grid grid-cols-2 gap-1.5 w-96">
              <button
                type="button"
                onClick={() => setPosStep('tables')}
                className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${
                  posStep === 'tables'
                    ? 'bg-stone-900 text-white'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
                <span>1. Sơ đồ 10 bàn</span>
              </button>

              <button
                type="button"
                onClick={() => setPosStep('menu')}
                className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${
                  posStep === 'menu'
                    ? 'bg-stone-900 text-white'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                <Coffee className="w-3.5 h-3.5 shrink-0" />
                <span>2. Chọn món ({products.length})</span>
              </button>
            </div>

            <div className="flex items-center gap-3 pr-2 text-xs text-stone-500">
              <span>
                Đang phục vụ: <strong className="text-stone-900 font-bold">{selectedTable}</strong>
              </span>
              <button
                type="button"
                onClick={openAddProductModal}
                className="min-h-[36px] px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Thêm món mới</span>
              </button>
            </div>
          </div>

          {posStep === 'tables' ? (
            /* STEP 1: PROPORTIONAL 10-TABLE FLOOR PLAN & CHANNELS */
            <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-6 space-y-5">
              {lastCompletedOrder && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <div className="text-xs text-emerald-950 min-w-0">
                      <span className="font-bold">
                        Đã thanh toán xong đơn {lastCompletedOrder.orderCode} ({lastCompletedOrder.tableName} ·{' '}
                        {formatVND(lastCompletedOrder.total)})
                      </span>
                      <span className="text-emerald-800 block sm:inline sm:ml-1.5">
                        — Đã tự động quay về trang chọn bàn & đồng bộ thiết bị.
                      </span>
                    </div>
                  </div>
                  {onOpenReceipt && (
                    <button
                      type="button"
                      onClick={() => onOpenReceipt(lastCompletedOrder)}
                      className="min-h-[34px] px-3 py-1 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Xem / In phiếu {lastCompletedOrder.orderCode}</span>
                    </button>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-4">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-stone-900">
                    Sơ Đồ 10 Bàn Phục Vụ Tại Quán
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Chạm vào bàn bất kỳ để chuyển thẳng sang màn hình chọn món
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPosStep('menu')}
                  className="min-h-[40px] px-4 py-2 bg-stone-900 text-white text-xs font-semibold rounded-xl hover:bg-stone-800 transition-colors whitespace-nowrap"
                >
                  Mở thực đơn ({selectedTable}) →
                </button>
              </div>

              {/* 10 Tables Proportional Grid (2 cols on mobile, 5 cols on tablet/desktop) */}
              <div
                role="group"
                aria-label="Sơ đồ 10 bàn"
                className="grid grid-cols-2 sm:grid-cols-5 gap-3"
              >
                {TABLES.map((table, idx) => {
                  const isSelected = selectedChannel === 'dine_in' && selectedTable === table;
                  const tableNum = String(idx + 1).padStart(2, '0');
                  const activeTableOrders = orders.filter(
                    (o) =>
                      o.tableName === table &&
                      (o.status === 'preparing' || o.status === 'ready')
                  );
                  const hasActiveOrder = activeTableOrders.length > 0;
                  const statusLabel =
                    isSelected && pricing.itemCount > 0
                      ? `Đang chọn (${pricing.itemCount} món)`
                      : hasActiveOrder
                        ? `Đang phục vụ (${activeTableOrders.length} đơn)`
                        : isSelected
                          ? 'Đang chọn (0 món)'
                          : 'Bàn trống';

                  return (
                    <button
                      key={table}
                      type="button"
                      onClick={() => handleSelectTableAndAdvance(table)}
                      className={`min-w-0 overflow-hidden min-h-[108px] sm:min-h-[120px] p-3.5 sm:p-4 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                        isSelected
                          ? 'bg-amber-700 text-white border-amber-700 shadow-sm'
                          : hasActiveOrder
                            ? 'bg-amber-50/90 text-stone-900 border-amber-300 hover:border-amber-500'
                            : 'bg-[#F8F7F4] text-stone-900 border-stone-200 hover:border-stone-400 hover:bg-stone-100/80'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full gap-1">
                        <span
                          className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md shrink-0 ${
                            isSelected
                              ? 'bg-amber-800/80 text-amber-100'
                              : hasActiveOrder
                                ? 'bg-amber-200/80 text-amber-950'
                                : 'bg-stone-200/80 text-stone-700'
                          }`}
                        >
                          #{tableNum}
                        </span>
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            isSelected
                              ? 'bg-white'
                              : hasActiveOrder
                                ? 'bg-amber-600'
                                : 'bg-emerald-500'
                          }`}
                        />
                      </div>

                      <div className="my-1">
                        <div className="text-base sm:text-lg font-bold tracking-tight truncate">
                          {table}
                        </div>
                      </div>

                      <div
                        className={`text-[11px] font-medium truncate ${
                          isSelected
                            ? 'text-amber-100'
                            : hasActiveOrder
                              ? 'text-amber-900 font-semibold'
                              : 'text-stone-500'
                        }`}
                      >
                        {statusLabel}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Takeaway & Delivery Channels */}
              <div className="pt-4 border-t border-stone-100 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-stone-500">
                    Kênh Mang Đi & Giao Hàng Trực Tuyến
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {CHANNELS.filter((c) => c.id !== 'dine_in').map((ch) => {
                    const active = selectedChannel === ch.id;
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => handleSelectChannelAndAdvance(ch.id, ch.label)}
                        className={`min-w-0 overflow-hidden min-h-[70px] p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-colors ${
                          active
                            ? 'bg-stone-900 text-white border-stone-900'
                            : 'bg-[#F8F7F4] text-stone-800 border-stone-200 hover:border-stone-400'
                        }`}
                      >
                        <div className="text-sm font-bold truncate">{ch.label}</div>
                        <div
                          className={`text-[11px] truncate ${
                            active ? 'text-stone-300' : 'text-stone-500'
                          }`}
                        >
                          {ch.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* STEP 2: WELL-PROPORTIONED MENU VIEW WITH DIRECT MENU EDITING */
            <div className="space-y-4">
              {/* Compact Active Table Header + Search + Add Dish + Barcode Toggle */}
              <div className="bg-white border border-stone-200 rounded-2xl p-3.5 sm:p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPosStep('tables')}
                      className="min-h-[38px] px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Đổi bàn</span>
                    </button>
                    <div className="text-xs sm:text-sm text-stone-600 truncate">
                      Bàn: <strong className="text-stone-900 font-bold">{selectedTable}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <div className="relative flex-1 sm:w-52">
                      <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                      <input
                        type="search"
                        aria-label="Tìm tên món hoặc SKU"
                        placeholder="Tìm tên món (Phin, Matcha)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full min-h-[38px] pl-9 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:border-stone-900 focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={openAddProductModal}
                      className="min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-700 hover:bg-amber-800 text-white transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Thêm món</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowBarcodeBox((prev) => !prev)}
                      className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                        showBarcodeBox
                          ? 'bg-stone-900 text-white border-stone-900'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      <Barcode className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Mã vạch</span>
                    </button>
                  </div>
                </div>

                {/* Collapsible Barcode Scanner Row */}
                {showBarcodeBox && (
                  <div className="pt-2.5 border-t border-stone-100 space-y-2">
                    <form onSubmit={handleBarcodeSubmit} className="flex items-center gap-2">
                      <input
                        type="text"
                        aria-label="Quét mã vạch sản phẩm"
                        placeholder="Nhập mã vạch / SKU (VD: 8938501001)..."
                        value={barcodeInput}
                        onChange={(e) => setBarcodeInput(e.target.value)}
                        className="flex-1 min-h-[38px] px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono text-stone-900 focus:bg-white focus:border-amber-700 focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="min-h-[38px] px-4 py-1.5 bg-stone-900 text-white text-xs font-semibold rounded-xl hover:bg-stone-800 whitespace-nowrap shrink-0"
                      >
                        Quét mã
                      </button>
                    </form>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-500">
                      <div className="flex items-center gap-1.5 overflow-x-auto">
                        <span className="shrink-0">Quét nhanh:</span>
                        {[
                          { code: '8938501001', label: 'Phin Sữa Đá' },
                          { code: '8938501003', label: 'Cold Brew' },
                          { code: '8938501005', label: 'Matcha Uji' },
                          { code: '8938501008', label: 'Croissant' },
                        ].map((b) => (
                          <button
                            key={b.code}
                            type="button"
                            onClick={() => triggerBarcodeScan(b.code)}
                            className="min-h-[26px] px-2.5 py-0.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium rounded-md transition-colors whitespace-nowrap shrink-0"
                          >
                            + {b.label}
                          </button>
                        ))}
                      </div>
                      {barcodeFeedback && (
                        <span className="font-medium text-amber-800 font-mono">
                          {barcodeFeedback}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Category Filter Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pt-0.5">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveCategory(cat.id)}
                      className={`min-h-[38px] px-3.5 py-1.5 text-xs font-semibold rounded-xl border transition-colors whitespace-nowrap shrink-0 ${
                        activeCategory === cat.id
                          ? 'bg-stone-900 text-white border-stone-900'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Balanced Product Menu Grid (2 cols on mobile, 3 cols on tablet/desktop) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 sm:gap-4">
                {filteredProducts.map((product) => {
                  const qtyInCart = getProductQtyInCart(product.id);
                  return (
                    <div
                      key={product.id}
                      className={`min-w-0 bg-white border rounded-2xl overflow-hidden flex flex-col justify-between transition-all ${
                        qtyInCart > 0
                          ? 'border-amber-700 ring-1 ring-amber-700/20'
                          : 'border-stone-200 hover:border-stone-400'
                      }`}
                    >
                      <div className="relative">
                        {/* Direct Edit Dish Button on Top-Left of Card */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditProductModal(product);
                          }}
                          aria-label={`Sửa món ${product.name}`}
                          title="Sửa tên món / giá bán trực tiếp"
                          className="absolute top-2.5 left-2.5 z-10 h-7 px-2 bg-white/90 hover:bg-white text-stone-700 hover:text-stone-900 border border-stone-200/80 rounded-lg text-[11px] font-semibold flex items-center gap-1 shadow-xs transition-colors"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Sửa</span>
                        </button>

                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => handleQuickAdd(product)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleQuickAdd(product);
                            }
                          }}
                          className="cursor-pointer text-left group"
                        >
                          <ProductIllustration
                            productId={product.id}
                            category={product.category}
                            className="w-full h-24 sm:h-28 border-b border-stone-100"
                          />
                          {qtyInCart > 0 && (
                            <span className="absolute top-2.5 right-2.5 min-w-[26px] h-6 px-2 bg-stone-900 text-white font-mono text-xs font-bold rounded-lg flex items-center justify-center tabular-nums shadow-xs">
                              ×{qtyInCart}
                            </span>
                          )}

                          <div className="p-3 sm:p-3.5 pb-2 space-y-1">
                            <h3 className="text-xs sm:text-sm font-bold text-stone-900 leading-snug min-h-[2.25rem] sm:min-h-[2.5rem] line-clamp-2 group-hover:text-amber-800 transition-colors">
                              {product.name}
                            </h3>
                            <div className="text-sm sm:text-base font-bold font-mono tabular-nums text-amber-800">
                              {formatVND(product.price)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Overflow-proof Action Footer */}
                      <div className="px-3 sm:px-3.5 pb-3 sm:pb-3.5 pt-1 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleQuickAdd(product)}
                          aria-label={`Thêm ${product.name} vào đơn`}
                          className="flex-1 min-w-0 h-9 px-2.5 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-xl transition-colors flex items-center justify-center gap-1 whitespace-nowrap"
                        >
                          <Plus className="w-3.5 h-3.5 shrink-0" />
                          <span>Thêm</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openCustomizeModal(product)}
                          aria-label={`Tùy chỉnh ${product.name}`}
                          title="Tùy chỉnh Size, Đường, Đá, Topping"
                          className="h-9 px-2.5 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors flex items-center justify-center gap-1 whitespace-nowrap shrink-0"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
                          <span>Size</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right 4 Columns: Live Order Cart (Top-aligned with Left Column on Desktop) */}
        <div
          className={`lg:col-span-4 bg-white border border-stone-200 rounded-2xl p-5 sticky top-20 space-y-4 ${
            posStep === 'cart' ? 'block' : 'hidden lg:block'
          }`}
        >
          <div className="flex items-center justify-between border-b border-stone-200 pb-3.5">
            <div>
              <h2 className="text-base font-bold text-stone-900">
                Phiếu Tạm Tính ({pricing.itemCount} món)
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                {selectedTable} · Kênh {CHANNELS.find((c) => c.id === selectedChannel)?.label}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPosStep('tables')}
                className="min-h-[34px] px-2.5 py-1 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors whitespace-nowrap"
              >
                Đổi bàn
              </button>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={onClearCart}
                  className="min-h-[34px] px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 rounded-lg transition-colors whitespace-nowrap"
                >
                  Xóa giỏ
                </button>
              )}
            </div>
          </div>

          {/* Cart Items List */}
          <div className="max-h-72 overflow-y-auto divide-y divide-stone-100 pr-1">
            {cart.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <ShoppingBag className="w-8 h-8 text-stone-300 mx-auto" />
                <p className="text-xs font-medium text-stone-600">
                  Chưa có món trong phiếu thanh toán
                </p>
                <p className="text-[11px] text-stone-400">
                  Chọn bàn và chạm vào món để thêm nhanh
                </p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.cartItemId} className="py-3 flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-stone-900 truncate">
                      {item.product.name} ({item.modifier.size})
                    </div>
                    <div className="text-[11px] text-stone-500">
                      Đường {item.modifier.sugarLevel} · {item.modifier.iceLevel}
                      {item.modifier.toppings.length > 0
                        ? ` · +${item.modifier.toppings.join(', ')}`
                        : ''}
                    </div>
                    <div className="text-xs font-mono font-semibold text-amber-800 mt-1 tabular-nums">
                      {formatVND(item.unitPrice * item.quantity)}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onUpdateCartQuantity(item.cartItemId, -1)}
                      aria-label={`Giảm số lượng ${item.product.name}`}
                      className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-6 text-center text-xs font-mono font-bold tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdateCartQuantity(item.cartItemId, 1)}
                      aria-label={`Tăng số lượng ${item.product.name}`}
                      className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveCartItem(item.cartItemId)}
                      aria-label={`Xóa ${item.product.name} khỏi giỏ`}
                      className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pricing Breakdown & Owner Discount */}
          <div className="border-t border-stone-200 pt-3 space-y-2 text-xs">
            <div className="flex justify-between text-stone-600">
              <span>Tạm tính ({pricing.itemCount} món)</span>
              <span className="font-mono tabular-nums">{formatVND(pricing.subtotal)}</span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <label htmlFor="manual-discount-input" className="text-stone-600">
                Chiết khấu trực tiếp (%):
              </label>
              <input
                id="manual-discount-input"
                type="number"
                min={0}
                max={50}
                value={manualDiscountPercent}
                onChange={(e) => onChangeManualDiscount(Number(e.target.value) || 0)}
                className="w-20 min-h-[34px] px-2 py-1 text-right font-mono text-xs bg-stone-50 border border-stone-200 rounded-md"
              />
            </div>

            <div className="flex justify-between text-stone-600">
              <span>Thuế GTGT (VAT 8%)</span>
              <span className="font-mono tabular-nums">{formatVND(pricing.tax)}</span>
            </div>

            <div className="flex justify-between items-baseline text-base font-bold text-stone-900 pt-2 border-t border-stone-200">
              <span>Tổng thanh toán</span>
              <span className="text-xl font-mono tabular-nums text-amber-800">
                {formatVND(pricing.total)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              disabled={cart.length === 0}
              onClick={() => onOpenPaymentModal('vietqr')}
              className="min-h-[48px] px-3 py-2.5 bg-amber-700 text-white text-xs font-semibold rounded-xl hover:bg-amber-800 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <QrCode className="w-4 h-4 shrink-0" />
              <span>Quét QR / Ví ĐT</span>
            </button>
            <button
              type="button"
              disabled={cart.length === 0}
              onClick={() => onOpenPaymentModal('cash')}
              className="min-h-[48px] px-3 py-2.5 bg-stone-900 text-white text-xs font-semibold rounded-xl hover:bg-stone-800 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <span>Thanh toán ngay</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile & Tablet Floating Bottom Checkout Bar */}
      {posStep !== 'cart' && (
        <div className="lg:hidden fixed bottom-20 md:bottom-4 left-4 right-4 z-30 bg-stone-900 text-white rounded-2xl px-4 py-3 shadow-lg flex items-center justify-between gap-3">
          <div className="min-w-0 flex items-center gap-3">
            <div>
              <div className="text-xs font-bold text-stone-200 whitespace-nowrap">
                {selectedTable} · {pricing.itemCount} món
              </div>
              <div className="text-sm font-mono font-bold text-amber-400 tabular-nums whitespace-nowrap">
                {formatVND(pricing.total)}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPosStep('cart')}
            className="min-h-[40px] px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0"
          >
            Xem phiếu & Thanh toán →
          </button>
        </div>
      )}

      {/* Direct Menu Item Add / Edit Modal */}
      {editingMenuForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="menu-editor-modal-title"
        >
          <form
            onSubmit={handleSaveMenuForm}
            className="bg-white border border-stone-200 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl"
          >
            <div className="flex items-start justify-between border-b border-stone-200 pb-3">
              <div>
                <h3 id="menu-editor-modal-title" className="text-base font-bold text-stone-900">
                  {editingMenuForm.isNew ? 'Thêm Món Mới Vào Menu' : 'Sửa Trực Tiếp Thông Tin Món'}
                </h3>
                <p className="text-xs text-stone-500">
                  Cập nhật tức thì trên quầy bán hàng và lưu tự động trên trình duyệt
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingMenuForm(null)}
                className="min-h-[36px] px-2.5 text-xs text-stone-500 hover:text-stone-900"
              >
                Đóng
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label htmlFor="menu-item-name" className="block font-semibold text-stone-700 mb-1">
                  Tên món *
                </label>
                <input
                  id="menu-item-name"
                  type="text"
                  required
                  placeholder="VD: Bạc Xỉu Kem Muối Biển"
                  value={editingMenuForm.name}
                  onChange={(e) =>
                    setEditingMenuForm((prev) => (prev ? { ...prev, name: e.target.value } : null))
                  }
                  className="w-full min-h-[40px] px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:bg-white focus:border-stone-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="menu-item-price"
                    className="block font-semibold text-stone-700 mb-1"
                  >
                    Giá bán (VNĐ) *
                  </label>
                  <input
                    id="menu-item-price"
                    type="number"
                    min={0}
                    step={1000}
                    required
                    value={editingMenuForm.price}
                    onChange={(e) =>
                      setEditingMenuForm((prev) =>
                        prev ? { ...prev, price: Number(e.target.value) || 0 } : null
                      )
                    }
                    className="w-full min-h-[40px] px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono text-stone-900 focus:bg-white focus:border-stone-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="menu-item-category"
                    className="block font-semibold text-stone-700 mb-1"
                  >
                    Danh mục
                  </label>
                  <select
                    id="menu-item-category"
                    value={editingMenuForm.category}
                    onChange={(e) =>
                      setEditingMenuForm((prev) =>
                        prev ? { ...prev, category: e.target.value as ProductCategory } : null
                      )
                    }
                    className="w-full min-h-[40px] px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-900"
                  >
                    {PRODUCT_CATEGORY_OPTIONS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="menu-item-sku" className="block font-semibold text-stone-700 mb-1">
                    Mã SKU
                  </label>
                  <input
                    id="menu-item-sku"
                    type="text"
                    value={editingMenuForm.sku}
                    onChange={(e) =>
                      setEditingMenuForm((prev) => (prev ? { ...prev, sku: e.target.value } : null))
                    }
                    className="w-full min-h-[40px] px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono text-stone-900"
                  />
                </div>

                <div>
                  <label
                    htmlFor="menu-item-barcode"
                    className="block font-semibold text-stone-700 mb-1"
                  >
                    Mã vạch (Barcode)
                  </label>
                  <input
                    id="menu-item-barcode"
                    type="text"
                    value={editingMenuForm.barcode}
                    onChange={(e) =>
                      setEditingMenuForm((prev) =>
                        prev ? { ...prev, barcode: e.target.value } : null
                      )
                    }
                    className="w-full min-h-[40px] px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono text-stone-900"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="menu-item-subtitle"
                  className="block font-semibold text-stone-700 mb-1"
                >
                  Ghi chú / Công thức tóm tắt
                </label>
                <input
                  id="menu-item-subtitle"
                  type="text"
                  value={editingMenuForm.subtitle}
                  onChange={(e) =>
                    setEditingMenuForm((prev) =>
                      prev ? { ...prev, subtitle: e.target.value } : null
                    )
                  }
                  className="w-full min-h-[40px] px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-900"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-stone-200 flex items-center justify-between gap-2">
              {!editingMenuForm.isNew ? (
                <button
                  type="button"
                  onClick={() => {
                    onDeleteProduct(editingMenuForm.id);
                    setEditingMenuForm(null);
                  }}
                  className="min-h-[42px] px-3.5 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa món</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingMenuForm(null)}
                  className="min-h-[42px] px-4 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="min-h-[42px] px-5 py-2 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-xl transition-colors whitespace-nowrap"
                >
                  Lưu vào Menu
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Product Modifier Customization Modal */}
      {customizingProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modifier-modal-title"
        >
          <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <div className="flex items-start justify-between border-b border-stone-200 pb-3">
              <div>
                <h3 id="modifier-modal-title" className="text-base font-bold text-stone-900">
                  {customizingProduct.name}
                </h3>
                <p className="text-xs text-stone-500">
                  Giá gốc: {formatVND(customizingProduct.price)} · SKU: {customizingProduct.sku}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCustomizingProduct(null)}
                className="min-h-[38px] px-2.5 text-xs text-stone-500 hover:text-stone-900"
              >
                Đóng
              </button>
            </div>

            {/* Size Selection */}
            <div>
              <p className="text-xs font-semibold text-stone-700 mb-2">Kích cỡ ly (Size)</p>
              <div className="grid grid-cols-3 gap-2">
                {(['S', 'M', 'L'] as const).map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setModifierState((p) => ({ ...p, size: sz }))}
                    className={`min-h-[42px] px-3 py-2 text-xs font-semibold rounded-xl border transition-colors ${
                      modifierState.size === sz
                        ? 'bg-stone-900 text-white border-stone-900'
                        : 'bg-stone-50 text-stone-800 border-stone-200'
                    }`}
                  >
                    Size {sz} (+{formatVND(SIZE_SURCHARGE[sz])})
                  </button>
                ))}
              </div>
            </div>

            {/* Sugar Selection */}
            <div>
              <p className="text-xs font-semibold text-stone-700 mb-2">Mức đường</p>
              <div className="grid grid-cols-4 gap-2">
                {(['0%', '50%', '70%', '100%'] as const).map((sg) => (
                  <button
                    key={sg}
                    type="button"
                    onClick={() => setModifierState((p) => ({ ...p, sugarLevel: sg }))}
                    className={`min-h-[40px] px-2 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                      modifierState.sugarLevel === sg
                        ? 'bg-stone-900 text-white border-stone-900'
                        : 'bg-stone-50 text-stone-800 border-stone-200'
                    }`}
                  >
                    {sg}
                  </button>
                ))}
              </div>
            </div>

            {/* Ice Selection */}
            <div>
              <p className="text-xs font-semibold text-stone-700 mb-2">Lượng đá</p>
              <div className="grid grid-cols-3 gap-2">
                {(['Không đá', 'Ít đá', 'Bình thường'] as const).map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setModifierState((p) => ({ ...p, iceLevel: ic }))}
                    className={`min-h-[40px] px-2 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                      modifierState.iceLevel === ic
                        ? 'bg-stone-900 text-white border-stone-900'
                        : 'bg-stone-50 text-stone-800 border-stone-200'
                    }`}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            {/* Toppings */}
            <div>
              <p className="text-xs font-semibold text-stone-700 mb-2">Topping thêm</p>
              <div className="space-y-1.5">
                {Object.entries(TOPPING_PRICES).map(([topName, topPrice]) => {
                  const checked = modifierState.toppings.includes(topName);
                  return (
                    <button
                      key={topName}
                      type="button"
                      onClick={() => toggleTopping(topName)}
                      className={`w-full min-h-[40px] px-3 py-2 text-xs rounded-lg border flex items-center justify-between transition-colors ${
                        checked
                          ? 'bg-amber-50 border-amber-700 text-stone-900 font-semibold'
                          : 'bg-white border-stone-200 text-stone-700'
                      }`}
                    >
                      <span>{topName}</span>
                      <span className="font-mono">+{formatVND(topPrice)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-stone-200 flex items-center justify-between">
              <div className="text-xs">
                <span className="text-stone-500">Đơn giá ly: </span>
                <strong className="font-mono text-sm text-amber-800">
                  {formatVND(calculateModifierUnitPrice(customizingProduct.price, modifierState))}
                </strong>
              </div>
              <button
                type="button"
                onClick={() => {
                  onAddToCart(customizingProduct, modifierState, 1);
                  setCustomizingProduct(null);
                }}
                className="min-h-[44px] px-5 py-2 bg-stone-900 text-white text-xs font-semibold rounded-xl hover:bg-stone-800"
              >
                Thêm vào phiếu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
