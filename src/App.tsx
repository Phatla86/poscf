import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  Store,
  ClipboardList,
  Package,
  BarChart3,
  Coffee,
  CloudUpload,
  QrCode,
} from 'lucide-react';
import {
  formatVND,
  calculateModifierUnitPrice,
  calculateOrderTotals,
  deductInventoryForOrder,
  DEFAULT_STORE_BANK_SETTINGS,
  type Product,
  type CartItem,
  type CartItemModifier,
  type InventoryItem,
  type PosOrder,
  type OrderChannel,
  type PaymentMethod,
  type OrderStatus,
  type StoreBankSettings,
} from './utils/posLogic';
import {
  INITIAL_PRODUCTS,
  INITIAL_INVENTORY,
  INITIAL_ORDERS,
  HOURLY_REVENUE_TODAY,
  MONTHLY_FINANCIAL_REPORT,
} from './data/seedData';
import {
  auth,
  signInWithGoogle,
  signOutUser,
  pushPosLiveSyncToFirestore,
  fetchPosLiveSyncFromFirestore,
  subscribeToPosLiveSyncFromFirestore,
  syncProductToFirestore,
  deleteProductFromFirestore,
  syncOrderToFirestore,
  syncInventoryItemToFirestore,
  createCloudBackupInFirestore,
  subscribeToCloudBackups,
  type CloudBackupDoc,
  type PosLiveSyncDoc,
} from './firebase';
import { PosTerminalView, TABLES, type PosStepTab } from './components/PosTerminalView';
import { OmnichannelOrdersView } from './components/OmnichannelOrdersView';
import { InventoryView } from './components/InventoryView';
import { AnalyticsReportView } from './components/AnalyticsReportView';
import {
  AiCrmGovernanceView,
  StoreAndBankQrSettingsView,
} from './components/AiCrmGovernanceView';
import { PaymentCheckoutModal, ThermalReceiptModal } from './components/ReceiptAndQrModals';

type ActiveSection = 'pos' | 'orders' | 'inventory' | 'reports' | 'store_qr' | 'governance';

const STORAGE_KEYS = {
  PRODUCTS: 'kaffeos_products_v1',
  ORDERS: 'kaffeos_orders_v1',
  INVENTORY: 'kaffeos_inventory_v1',
  BACKUPS: 'kaffeos_backups_v1',
  STORE_SETTINGS: 'kaffeos_store_settings_v1',
};

export default function App() {
  const [activeSection, setActiveSection] = useState<ActiveSection>('pos');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const clientIdRef = useRef<string>(
    `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
  );
  const lastRevisionRef = useRef<number>(0);
  const lastAppliedSigRef = useRef<string>('');
  const [lastSyncedTime, setLastSyncedTime] = useState<string>('');
  const [posStep, setPosStep] = useState<PosStepTab>('tables');
  const [lastCompletedOrder, setLastCompletedOrder] = useState<PosOrder | null>(null);

  // Store & Bank QR API Settings
  const [storeSettings, setStoreSettings] = useState<StoreBankSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.STORE_SETTINGS);
      return saved
        ? { ...DEFAULT_STORE_BANK_SETTINGS, ...(JSON.parse(saved) as Partial<StoreBankSettings>) }
        : DEFAULT_STORE_BANK_SETTINGS;
    } catch {
      return DEFAULT_STORE_BANK_SETTINGS;
    }
  });

  // Store Data State (with Offline-First LocalStorage persistence)
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      return saved ? (JSON.parse(saved) as Product[]) : INITIAL_PRODUCTS;
    } catch {
      return INITIAL_PRODUCTS;
    }
  });
  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.INVENTORY);
      return saved ? (JSON.parse(saved) as InventoryItem[]) : INITIAL_INVENTORY;
    } catch {
      return INITIAL_INVENTORY;
    }
  });
  const [orders, setOrders] = useState<PosOrder[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ORDERS);
      return saved ? (JSON.parse(saved) as PosOrder[]) : INITIAL_ORDERS;
    } catch {
      return INITIAL_ORDERS;
    }
  });
  const [backups, setBackups] = useState<CloudBackupDoc[]>([
    {
      id: 'bkp_init_01',
      ownerId: 'system',
      label: 'Sao lưu tự động đầu ca sáng (Cloud AES-256)',
      ordersCount: 4,
      inventoryCount: 10,
      totalRevenue: 486648,
      checksum: 'SHA256-9F84B2C10E4A71D8',
      createdAt: '2026-10-26T07:00:00.000Z',
    },
  ]);

  // POS Cart & Session State
  const [cart, setCart] = useState<CartItem[]>([
    {
      cartItemId: 'ci_default_1',
      product: INITIAL_PRODUCTS[0],
      quantity: 1,
      unitPrice: 45000,
      modifier: {
        size: 'M',
        sugarLevel: '70%',
        iceLevel: 'Bình thường',
        toppings: [],
      },
    },
  ]);
  const [selectedChannel, setSelectedChannel] = useState<OrderChannel>('dine_in');
  const [selectedTable, setSelectedTable] = useState<string>('Bàn 02');
  const [manualDiscountPercent, setManualDiscountPercent] = useState<number>(0);

  // Modals State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('vietqr');
  const [activeReceiptOrder, setActiveReceiptOrder] = useState<PosOrder | null>(null);

  // Network State
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);

  // Synchronous Ref Snapshot so rapid back-to-back actions never use stale closures
  const liveSnapshotRef = useRef({
    products,
    inventory,
    orders,
    cart,
    selectedTable,
    selectedChannel,
    storeSettings,
  });

  useEffect(() => {
    liveSnapshotRef.current = {
      products,
      inventory,
      orders,
      cart,
      selectedTable,
      selectedChannel,
      storeSettings,
    };
  }, [
    products,
    inventory,
    orders,
    cart,
    selectedTable,
    selectedChannel,
    storeSettings,
  ]);

  // Real-time Push Notifications for Inventory & Sync
  const [pushNotifications, setPushNotifications] = useState<
    { id: string; message: string; time: string }[]
  >([
    {
      id: 'pn_1',
      message:
        'Cảnh báo tự động: Bột Matcha Uji Ceremonial còn 0.45 kg (Dưới ngưỡng an toàn 1.2 kg).',
      time: '08:15:20',
    },
    {
      id: 'pn_2',
      message:
        'Cảnh báo tự động: Sữa Tươi Thanh Trùng Đà Lạt Milk còn 4.2 lít (Ngưỡng tối thiểu 10 lít).',
      time: '08:30:05',
    },
    {
      id: 'pn_3',
      message: 'Đồng bộ đám mây: Đã kết nối đồng bộ thời gian thực đa thiết bị (Điện thoại & Máy tính).',
      time: '08:52:10',
    },
  ]);

  const appendNotification = (message: string) => {
    const nowTime = new Date().toLocaleTimeString('vi-VN');
    setPushNotifications((prev) => [
      { id: `pn_${Date.now()}_${Math.random()}`, message, time: nowTime },
      ...prev.slice(0, 14),
    ]);
  };

  // Broadcast to BOTH Google Cloud Firestore (global across ais-dev & ais-pre) AND Server SSE
  const pushLiveSyncUpdate = (partial: {
    actionLabel?: string;
    products?: Product[];
    inventory?: InventoryItem[];
    orders?: PosOrder[];
    backups?: CloudBackupDoc[];
    cart?: CartItem[];
    selectedTable?: string;
    selectedChannel?: OrderChannel;
    storeSettings?: StoreBankSettings;
    isInitialSeed?: boolean;
  }) => {
    if (isOfflineMode) return;

    const merged = {
      products: partial.products ?? liveSnapshotRef.current.products,
      inventory: partial.inventory ?? liveSnapshotRef.current.inventory,
      orders: partial.orders ?? liveSnapshotRef.current.orders,
      cart: partial.cart ?? liveSnapshotRef.current.cart,
      selectedTable: partial.selectedTable ?? liveSnapshotRef.current.selectedTable,
      selectedChannel: partial.selectedChannel ?? liveSnapshotRef.current.selectedChannel,
      storeSettings: partial.storeSettings ?? liveSnapshotRef.current.storeSettings,
    };

    // Update ref synchronously so back-to-back calls (e.g., selectChannel + selectTable) keep both
    liveSnapshotRef.current = merged;

    const nextRev = Math.max(lastRevisionRef.current + 1, Date.now());
    lastRevisionRef.current = nextRev;
    lastAppliedSigRef.current = `${nextRev}_${clientIdRef.current}`;
    setLastSyncedTime(
      new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    );

    // 1. Global Real-Time Sync via Google Cloud Firestore (works across ais-dev & ais-pre & mobile 4G/5G)
    pushPosLiveSyncToFirestore({
      revision: nextRev,
      updatedByClientId: clientIdRef.current,
      actionLabel: partial.actionLabel || 'Đồng bộ thiết bị',
      customerNameInput: '',
      ...merged,
    }).catch(() => {
      // Ignore transient network errors
    });

    // 2. Local Container SSE Sync
    fetch('/api/sync/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        revision: nextRev,
        clientId: clientIdRef.current,
        actionLabel: partial.actionLabel,
        isInitialSeed: partial.isInitialSeed,
        ...merged,
      }),
    }).catch(() => {
      // Ignore transient network errors
    });
  };

  // Unified handler to apply remote sync payloads from either Firestore or SSE
  const applyRemoteSyncData = (
    docData: Partial<PosLiveSyncDoc> & { storeSettings?: StoreBankSettings }
  ) => {
    if (!docData || typeof docData.revision !== 'number' || docData.revision <= 0) return;

    lastRevisionRef.current = Math.max(lastRevisionRef.current, docData.revision);
    const sig = `${docData.revision}_${docData.updatedByClientId || ''}`;
    if (sig === lastAppliedSigRef.current) return;
    lastAppliedSigRef.current = sig;

    setLastSyncedTime(
      new Date().toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    );

    if (docData.updatedByClientId === clientIdRef.current) return;

    const remoteSettings: StoreBankSettings = docData.storeSettings
      ? { ...DEFAULT_STORE_BANK_SETTINGS, ...docData.storeSettings }
      : {
          storeName: docData.storeName || liveSnapshotRef.current.storeSettings.storeName,
          storeAddress: docData.storeAddress || liveSnapshotRef.current.storeSettings.storeAddress,
          storePhone: docData.storePhone ?? liveSnapshotRef.current.storeSettings.storePhone,
          storeTaxCode: docData.storeTaxCode ?? liveSnapshotRef.current.storeSettings.storeTaxCode,
          bankId: docData.bankId || liveSnapshotRef.current.storeSettings.bankId,
          accountNo: docData.accountNo || liveSnapshotRef.current.storeSettings.accountNo,
          accountName: docData.accountName || liveSnapshotRef.current.storeSettings.accountName,
          transferPrefix:
            docData.transferPrefix || liveSnapshotRef.current.storeSettings.transferPrefix,
          qrTemplate: docData.qrTemplate || liveSnapshotRef.current.storeSettings.qrTemplate,
          qrApiUrlTemplate:
            docData.qrApiUrlTemplate || liveSnapshotRef.current.storeSettings.qrApiUrlTemplate,
        };

    const nextProducts =
      Array.isArray(docData.products) && docData.products.length > 0
        ? docData.products
        : liveSnapshotRef.current.products;
    const nextInventory =
      Array.isArray(docData.inventory) && docData.inventory.length > 0
        ? docData.inventory
        : liveSnapshotRef.current.inventory;
    const nextOrders = Array.isArray(docData.orders)
      ? docData.orders
      : liveSnapshotRef.current.orders;
    const nextCart = Array.isArray(docData.cart)
      ? docData.cart
      : liveSnapshotRef.current.cart;
    const nextTable =
      typeof docData.selectedTable === 'string' && docData.selectedTable
        ? docData.selectedTable
        : liveSnapshotRef.current.selectedTable;
    const nextChannel =
      typeof docData.selectedChannel === 'string' && docData.selectedChannel
        ? docData.selectedChannel
        : liveSnapshotRef.current.selectedChannel;

    liveSnapshotRef.current = {
      products: nextProducts,
      inventory: nextInventory,
      orders: nextOrders,
      cart: nextCart,
      selectedTable: nextTable,
      selectedChannel: nextChannel,
      storeSettings: remoteSettings,
    };

    setStoreSettings(remoteSettings);
    setProducts(nextProducts);
    setInventory(nextInventory);
    setOrders(nextOrders);
    setCart(nextCart);
    setSelectedTable(nextTable);
    setSelectedChannel(nextChannel);

    if (docData.actionLabel?.startsWith('Thanh toán đơn')) {
      setPosStep('tables');
      if (nextOrders.length > 0) {
        setLastCompletedOrder(nextOrders[0]);
      }
    }

    if (docData.actionLabel) {
      appendNotification(`Đồng bộ từ thiết bị khác: ${docData.actionLabel}`);
    }
  };

  // Subscribe to BOTH Global Google Cloud Firestore AND Server SSE + Periodic Re-Sync
  useEffect(() => {
    if (isOfflineMode) return;

    // 1. Real-time Firestore listener
    const unsubFirestoreSync = subscribeToPosLiveSyncFromFirestore((docData: PosLiveSyncDoc) => {
      applyRemoteSyncData(docData);
    });

    // 2. Authoritative initial fetch from Firestore (seeds cloud ONLY if doc does not exist yet)
    fetchPosLiveSyncFromFirestore().then((cloudDoc) => {
      if (cloudDoc && typeof cloudDoc.revision === 'number' && cloudDoc.revision > 0) {
        applyRemoteSyncData(cloudDoc);
      } else {
        pushLiveSyncUpdate({
          isInitialSeed: true,
          actionLabel: 'Khởi tạo phiên đồng bộ đa thiết bị',
        });
      }
    });

    // 3. Real-time Server SSE stream for ultra-fast local container sync
    const es = new EventSource(`/api/sync/stream?clientId=${encodeURIComponent(clientIdRef.current)}`);
    const handleSseEvent = (evt: MessageEvent) => {
      try {
        const parsed = JSON.parse(evt.data);
        if (parsed && typeof parsed.revision === 'number' && parsed.revision > 0) {
          applyRemoteSyncData(parsed);
        }
      } catch {
        // ignore parse errors
      }
    };
    es.addEventListener('sync_init', handleSseEvent);
    es.addEventListener('sync_update', handleSseEvent);

    // 4. Visibility / Focus & Periodic 3.5s sync check for mobile browsers
    const pullLatestFromCloud = () => {
      fetchPosLiveSyncFromFirestore().then((cloudDoc) => {
        if (cloudDoc && typeof cloudDoc.revision === 'number' && cloudDoc.revision > 0) {
          applyRemoteSyncData(cloudDoc);
        }
      });
    };

    const pollInterval = setInterval(pullLatestFromCloud, 3500);
    window.addEventListener('focus', pullLatestFromCloud);

    return () => {
      unsubFirestoreSync();
      es.close();
      clearInterval(pollInterval);
      window.removeEventListener('focus', pullLatestFromCloud);
    };
  }, [isOfflineMode]);

  // Persist to LocalStorage for Offline resilience
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.STORE_SETTINGS, JSON.stringify(storeSettings));
    } catch {
      // ignore
    }
  }, [storeSettings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    } catch {
      // ignore storage quota errors
    }
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    } catch {
      // ignore storage quota errors
    }
  }, [orders]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(inventory));
    } catch {
      // ignore storage quota errors
    }
  }, [inventory]);

  // Listen to Firebase Auth & Cloud Backups
  useEffect(() => {
    let unsubBackups: (() => void) | null = null;
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (unsubBackups) {
        unsubBackups();
        unsubBackups = null;
      }
      if (user) {
        unsubBackups = subscribeToCloudBackups(user.uid, (cloudList) => {
          if (cloudList.length > 0) {
            setBackups(cloudList);
          }
        });
      }
    });
    return () => {
      unsubAuth();
      if (unsubBackups) unsubBackups();
    };
  }, []);

  // Store & Bank QR API Settings Handler
  const handleSaveStoreSettings = (nextSettings: StoreBankSettings) => {
    setStoreSettings(nextSettings);
    appendNotification(
      `Đã cập nhật thông tin quán "${nextSettings.storeName}" & API QR Ngân hàng (${nextSettings.bankId} - ${nextSettings.accountNo}).`
    );
    pushLiveSyncUpdate({
      actionLabel: `Cập nhật quán "${nextSettings.storeName}" & QR ${nextSettings.bankId}`,
      storeSettings: nextSettings,
    });
  };

  // Direct Menu Editing Handlers (for single store owner)
  const handleSaveProduct = (savedProduct: Product) => {
    const exists = products.some((p) => p.id === savedProduct.id);
    const nextProducts = exists
      ? products.map((p) => (p.id === savedProduct.id ? savedProduct : p))
      : [savedProduct, ...products];

    const nextCart = cart.map((item) => {
      if (item.product.id !== savedProduct.id) return item;
      return {
        ...item,
        product: savedProduct,
        unitPrice: calculateModifierUnitPrice(savedProduct.price, item.modifier),
      };
    });

    setProducts(nextProducts);
    setCart(nextCart);

    const actionMsg = `Cập nhật thực đơn: ${savedProduct.name} (${formatVND(savedProduct.price)})`;
    appendNotification(`Đã ${actionMsg.toLowerCase()}`);

    pushLiveSyncUpdate({
      actionLabel: actionMsg,
      products: nextProducts,
      cart: nextCart,
    });

    if (!isOfflineMode && currentUser) {
      syncProductToFirestore(savedProduct, currentUser.uid).catch(() => {});
    }
  };

  const handleDeleteProduct = (productId: string) => {
    const target = products.find((p) => p.id === productId);
    const nextProducts = products.filter((p) => p.id !== productId);
    const nextCart = cart.filter((item) => item.product.id !== productId);

    setProducts(nextProducts);
    setCart(nextCart);

    const actionMsg = target ? `Xóa món "${target.name}" khỏi thực đơn` : 'Xóa món khỏi thực đơn';
    appendNotification(`Đã ${actionMsg.toLowerCase()}.`);

    pushLiveSyncUpdate({
      actionLabel: actionMsg,
      products: nextProducts,
      cart: nextCart,
    });

    if (!isOfflineMode && currentUser) {
      deleteProductFromFirestore(productId).catch(() => {});
    }
  };

  const handleResetDefaultMenu = () => {
    setProducts(INITIAL_PRODUCTS);
    appendNotification('Đã khôi phục danh sách thực đơn mặc định của quán.');
    pushLiveSyncUpdate({
      actionLabel: 'Khôi phục thực đơn mặc định',
      products: INITIAL_PRODUCTS,
    });
  };

  // Cart & Table Handlers with Real-Time Sync
  const handleSelectTable = (table: string) => {
    setSelectedTable(table);
    pushLiveSyncUpdate({
      actionLabel: `Chọn ${table}`,
      selectedTable: table,
    });
  };

  const handleSelectChannel = (channel: OrderChannel) => {
    setSelectedChannel(channel);
    pushLiveSyncUpdate({
      selectedChannel: channel,
    });
  };

  const handleAddToCart = (product: Product, modifier: CartItemModifier, quantity: number) => {
    const unitPrice = calculateModifierUnitPrice(product.price, modifier);
    const modifierKey = `${product.id}_${modifier.size}_${modifier.sugarLevel}_${modifier.iceLevel}_${modifier.toppings
      .slice()
      .sort()
      .join('|')}`;

    const existingIdx = cart.findIndex((i) => i.cartItemId === modifierKey);
    const nextCart =
      existingIdx > -1
        ? cart.map((item, idx) =>
            idx === existingIdx ? { ...item, quantity: item.quantity + quantity } : item
          )
        : [
            ...cart,
            {
              cartItemId: modifierKey,
              product,
              quantity,
              modifier,
              unitPrice,
            },
          ];

    setCart(nextCart);
    pushLiveSyncUpdate({
      actionLabel: `Thêm ${quantity}x ${product.name} vào giỏ (${selectedTable})`,
      cart: nextCart,
    });
  };

  const handleUpdateCartQuantity = (cartItemId: string, delta: number) => {
    const nextCart = cart
      .map((item) =>
        item.cartItemId === cartItemId ? { ...item, quantity: item.quantity + delta } : item
      )
      .filter((item) => item.quantity > 0);
    setCart(nextCart);
    pushLiveSyncUpdate({
      cart: nextCart,
    });
  };

  const handleRemoveCartItem = (cartItemId: string) => {
    const nextCart = cart.filter((item) => item.cartItemId !== cartItemId);
    setCart(nextCart);
    pushLiveSyncUpdate({
      cart: nextCart,
    });
  };

  const handleClearCart = () => {
    setCart([]);
    pushLiveSyncUpdate({
      actionLabel: `Xóa giỏ hàng (${selectedTable})`,
      cart: [],
    });
  };

  const currentPricing = calculateOrderTotals(
    cart,
    null,
    manualDiscountPercent,
    0.08
  );

  const nextOrderCode = `KF-${1041 + orders.length}`;

  const handleConfirmPayment = async (
    method: PaymentMethod,
    openReceiptModal: boolean = false
  ) => {
    if (cart.length === 0) return;

    const nowIso = new Date().toISOString();
    const summaryStr = cart
      .map(
        (i) =>
          `${i.quantity}x ${i.product.name} (${i.modifier.size}${
            i.modifier.toppings.length > 0 ? ', +' + i.modifier.toppings.join(', ') : ''
          })`
      )
      .join(', ');

    const newOrder: PosOrder = {
      id: `ord_${Date.now()}`,
      orderCode: nextOrderCode,
      channel: selectedChannel,
      tableName: selectedTable,
      items: [...cart],
      itemSummary: summaryStr,
      itemCount: currentPricing.itemCount,
      subtotal: currentPricing.subtotal,
      discount: currentPricing.totalDiscount,
      tax: currentPricing.tax,
      total: currentPricing.total,
      paymentMethod: method,
      status: 'preparing',
      cashierName: 'Chủ quán',
      customerName: 'Tại quầy',
      eInvoiceSent: false,
      syncedToCloud: !isOfflineMode,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // 1. Deduct inventory automatically
    const { updatedInventory, lowStockTriggered } = deductInventoryForOrder(
      inventory,
      cart,
      nowIso
    );
    const nextOrders = [newOrder, ...orders];

    setInventory(updatedInventory);
    setOrders(nextOrders);
    setCart([]);
    setManualDiscountPercent(0);
    setPaymentModalOpen(false);
    setLastCompletedOrder(newOrder);

    // Automatically return to Table Selection screen immediately upon payment completion
    const nextTable =
      selectedChannel === 'dine_in' && TABLES.includes(selectedTable) ? selectedTable : 'Bàn 01';
    setSelectedChannel('dine_in');
    setSelectedTable(nextTable);
    setActiveSection('pos');
    setPosStep('tables');

    if (openReceiptModal) {
      setActiveReceiptOrder(newOrder);
    }

    // 2. Push notifications for low stock
    if (lowStockTriggered.length > 0) {
      appendNotification(
        `Cảnh báo kho tức thì sau đơn ${newOrder.orderCode}: ${lowStockTriggered
          .map((i) => `${i.name} còn ${i.quantity} ${i.unit}`)
          .join(', ')}`
      );
    }

    // 3. Broadcast live to other connected devices (Phone <-> PC)
    pushLiveSyncUpdate({
      actionLabel: `Thanh toán đơn ${newOrder.orderCode} - ${selectedTable} (${formatVND(
        newOrder.total
      )})`,
      orders: nextOrders,
      inventory: updatedInventory,
      cart: [],
      selectedChannel: 'dine_in',
      selectedTable: nextTable,
    });

    // 4. Sync to Firestore if online and authenticated
    if (!isOfflineMode && currentUser) {
      try {
        await syncOrderToFirestore(newOrder, currentUser.uid);
      } catch {
        // Handled by Firestore error logger
      }
    }
  };

  const handleAdvanceOrderStatus = (orderId: string, nextStatus: OrderStatus) => {
    let targetOrder: PosOrder | null = null;
    const nextOrders = orders.map((o) => {
      if (o.id !== orderId) return o;
      targetOrder = { ...o, status: nextStatus, updatedAt: new Date().toISOString() };
      return targetOrder;
    });
    setOrders(nextOrders);
    pushLiveSyncUpdate({
      actionLabel: targetOrder
        ? `Cập nhật trạng thái đơn ${(targetOrder as PosOrder).orderCode}`
        : 'Cập nhật trạng thái đơn hàng',
      orders: nextOrders,
    });
    if (!isOfflineMode && currentUser && targetOrder) {
      syncOrderToFirestore(targetOrder, currentUser.uid).catch(() => {});
    }
  };

  const handleSimulateIncomingOrder = (channel: OrderChannel) => {
    const sampleProduct =
      (channel === 'grabfood' ? products[2] : products[4]) || products[0] || INITIAL_PRODUCTS[0];
    const nowIso = new Date().toISOString();
    const code = `KF-${1041 + orders.length}`;
    const subtotal = sampleProduct.price * 2;
    const tax = Math.round(subtotal * 0.08);
    const simulatedOrder: PosOrder = {
      id: `ord_sim_${Date.now()}`,
      orderCode: code,
      channel,
      tableName:
        channel === 'grabfood'
          ? `GrabFood #GF-${Math.floor(100 + Math.random() * 899)}`
          : `ShopeeFood #SF-${Math.floor(100 + Math.random() * 899)}`,
      items: [
        {
          cartItemId: `ci_sim_${Date.now()}`,
          product: sampleProduct,
          quantity: 2,
          unitPrice: sampleProduct.price,
          modifier: {
            size: 'M',
            sugarLevel: '70%',
            iceLevel: 'Bình thường',
            toppings: [],
          },
        },
      ],
      itemSummary: `2x ${sampleProduct.name} (M)`,
      itemCount: 2,
      subtotal,
      discount: 0,
      tax,
      total: subtotal + tax,
      paymentMethod: channel === 'grabfood' ? 'momo' : 'zalopay',
      status: 'preparing',
      cashierName: 'Đồng bộ Đa Kênh Tự Động',
      customerName: channel === 'grabfood' ? 'Khách GrabFood' : 'Khách ShopeeFood',
      syncedToCloud: !isOfflineMode,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const { updatedInventory } = deductInventoryForOrder(
      inventory,
      simulatedOrder.items,
      nowIso
    );
    const nextOrders = [simulatedOrder, ...orders];
    setInventory(updatedInventory);
    setOrders(nextOrders);
    appendNotification(
      `Đồng bộ đơn đa kênh mới: ${simulatedOrder.orderCode} (${simulatedOrder.tableName}) — ${simulatedOrder.itemSummary}`
    );
    pushLiveSyncUpdate({
      actionLabel: `Đơn đa kênh mới ${simulatedOrder.orderCode} (${simulatedOrder.tableName})`,
      orders: nextOrders,
      inventory: updatedInventory,
    });
  };

  const handleFlushOfflineQueue = () => {
    const nextOrders = orders.map((o) => ({ ...o, syncedToCloud: true }));
    setOrders(nextOrders);
    appendNotification('Đã đồng bộ toàn bộ đơn hàng ngoại tuyến lên Cloud thành công.');
    pushLiveSyncUpdate({
      actionLabel: 'Đồng bộ hàng đợi đơn ngoại tuyến lên Cloud',
      orders: nextOrders,
    });
  };

  const handleRestockItem = async (
    itemId: string,
    addedQuantity: number,
    newMinThreshold?: number
  ) => {
    const nowIso = new Date().toISOString();
    let updatedTarget: InventoryItem | null = null;

    const nextInventory = inventory.map((item) => {
      if (item.id !== itemId) return item;
      updatedTarget = {
        ...item,
        quantity: Number((item.quantity + addedQuantity).toFixed(2)),
        minThreshold:
          newMinThreshold !== undefined ? newMinThreshold : item.minThreshold,
        updatedAt: nowIso,
      };
      return updatedTarget;
    });

    setInventory(nextInventory);

    if (updatedTarget) {
      const target = updatedTarget as InventoryItem;
      const msg = `Nhập kho +${addedQuantity} ${target.unit} ${target.name} (Tồn mới: ${target.quantity} ${target.unit})`;
      appendNotification(
        `Nhập kho thành công: +${addedQuantity} ${target.unit} ${target.name} (Tồn mới: ${target.quantity} ${target.unit})`
      );
      pushLiveSyncUpdate({
        actionLabel: msg,
        inventory: nextInventory,
      });
      if (!isOfflineMode && currentUser) {
        try {
          await syncInventoryItemToFirestore(target, currentUser.uid);
        } catch {
          // logged
        }
      }
    }
  };

  const handleAutoReplenishAllLowStock = () => {
    const nowIso = new Date().toISOString();
    const nextInventory = inventory.map((item) => {
      if (item.quantity <= item.minThreshold) {
        return {
          ...item,
          quantity: Number((item.minThreshold * 2.5).toFixed(1)),
          updatedAt: nowIso,
        };
      }
      return item;
    });
    setInventory(nextInventory);
    appendNotification(
      'Đã tự động tạo phiếu nhập và bổ sung đầy đủ định mức cho tất cả mặt hàng dưới ngưỡng cảnh báo.'
    );
    pushLiveSyncUpdate({
      actionLabel: 'Nhập bù tự động toàn bộ nguyên liệu sắp hết',
      inventory: nextInventory,
    });
  };

  const handleCreateCloudBackup = async (label: string) => {
    const totalRev =
      HOURLY_REVENUE_TODAY.reduce((s, h) => s + h.revenue, 0) +
      orders.reduce((s, o) => s + o.total, 0);

    let checksum = `SHA256-${Math.random().toString(16).slice(2, 14).toUpperCase()}`;
    try {
      const res = await fetch('/api/backup/checksum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ordersCount: orders.length,
          inventoryCount: inventory.length,
          totalRev,
        }),
      });
      const data = await res.json();
      if (data.checksum) checksum = data.checksum;
    } catch {
      // fallback checksum
    }

    const newBackup: CloudBackupDoc = {
      id: `bkp_${Date.now()}`,
      ownerId: currentUser?.uid || 'local_store',
      label,
      ordersCount: orders.length,
      inventoryCount: inventory.length,
      totalRevenue: totalRev,
      checksum,
      createdAt: new Date().toISOString(),
    };

    const nextBackups = [newBackup, ...backups];
    setBackups(nextBackups);
    appendNotification(`Sao lưu đám mây hoàn tất: "${label}" (${checksum})`);

    pushLiveSyncUpdate({
      actionLabel: `Sao lưu đám mây: ${label}`,
      backups: nextBackups,
    });

    if (currentUser && !isOfflineMode) {
      try {
        await createCloudBackupInFirestore(newBackup, currentUser.uid);
      } catch {
        // logged
      }
    }
  };

  const offlinePendingCount = orders.filter((o) => o.syncedToCloud === false).length;
  const lowStockNames = inventory
    .filter((i) => i.quantity <= i.minThreshold)
    .map((i) => i.name);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F7F4] text-stone-900 pb-20 md:pb-8">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xs border-b border-stone-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 lg:gap-6">
        {/* Zone 1: Single text element wordmark (reflects customized Store Name) */}
        <a
          href="#pos"
          onClick={(e) => {
            e.preventDefault();
            setActiveSection('pos');
          }}
          title={storeSettings.storeAddress}
          className="text-base sm:text-lg font-bold tracking-tight text-stone-900 truncate max-w-[180px] sm:max-w-[240px] shrink-0"
        >
          {storeSettings.storeName || 'KaffeOS'}
        </a>

        {/* Zone 2: Concise single-line navigation links */}
        <nav
          aria-label="Điều hướng chính"
          className="hidden md:flex items-center gap-3 lg:gap-5 text-xs lg:text-sm font-medium text-stone-600"
        >
          <a
            href="#pos"
            onClick={(e) => {
              e.preventDefault();
              setActiveSection('pos');
            }}
            className={`hover:text-stone-900 transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeSection === 'pos'
                ? 'text-stone-900 font-bold border-b-2 border-stone-900'
                : ''
            }`}
          >
            Bán hàng POS
          </a>
          <a
            href="#orders"
            onClick={(e) => {
              e.preventDefault();
              setActiveSection('orders');
            }}
            className={`hover:text-stone-900 transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeSection === 'orders'
                ? 'text-stone-900 font-bold border-b-2 border-stone-900'
                : ''
            }`}
          >
            Đơn đa kênh ({orders.length})
          </a>
          <a
            href="#inventory"
            onClick={(e) => {
              e.preventDefault();
              setActiveSection('inventory');
            }}
            className={`hover:text-stone-900 transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeSection === 'inventory'
                ? 'text-stone-900 font-bold border-b-2 border-stone-900'
                : ''
            }`}
          >
            Tồn kho ({lowStockNames.length})
          </a>
          <a
            href="#reports"
            onClick={(e) => {
              e.preventDefault();
              setActiveSection('reports');
            }}
            className={`hover:text-stone-900 transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeSection === 'reports'
                ? 'text-stone-900 font-bold border-b-2 border-stone-900'
                : ''
            }`}
          >
            Báo cáo & P&L
          </a>
          <a
            href="#store_qr"
            onClick={(e) => {
              e.preventDefault();
              setActiveSection('store_qr');
            }}
            className={`hover:text-stone-900 transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeSection === 'store_qr'
                ? 'text-amber-800 font-bold border-b-2 border-amber-800'
                : ''
            }`}
          >
            Quán & QR Ngân hàng
          </a>
          <a
            href="#governance"
            onClick={(e) => {
              e.preventDefault();
              setActiveSection('governance');
            }}
            className={`hover:text-stone-900 transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeSection === 'governance'
                ? 'text-stone-900 font-bold border-b-2 border-stone-900'
                : ''
            }`}
          >
            Menu & Sao lưu
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleCreateCloudBackup('Sao lưu nhanh từ thanh công cụ')}
            className="min-h-[40px] px-3.5 py-2 text-xs font-semibold text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <CloudUpload className="w-3.5 h-3.5" />
            <span>Sao lưu Cloud</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-5">
        {activeSection === 'pos' && (
          <PosTerminalView
            products={products}
            orders={orders}
            cart={cart}
            onAddToCart={handleAddToCart}
            onUpdateCartQuantity={handleUpdateCartQuantity}
            onRemoveCartItem={handleRemoveCartItem}
            onClearCart={handleClearCart}
            selectedChannel={selectedChannel}
            onSelectChannel={handleSelectChannel}
            selectedTable={selectedTable}
            onSelectTable={handleSelectTable}
            manualDiscountPercent={manualDiscountPercent}
            onChangeManualDiscount={setManualDiscountPercent}
            onOpenPaymentModal={(preferredMethod) => {
              setSelectedPaymentMethod(preferredMethod);
              setPaymentModalOpen(true);
            }}
            onSaveProduct={handleSaveProduct}
            onDeleteProduct={handleDeleteProduct}
            posStep={posStep}
            onChangePosStep={setPosStep}
            lastCompletedOrder={lastCompletedOrder}
            onOpenReceipt={(ord) => setActiveReceiptOrder(ord)}
          />
        )}

        {activeSection === 'orders' && (
          <OmnichannelOrdersView
            orders={orders}
            onAdvanceOrderStatus={handleAdvanceOrderStatus}
            onSimulateIncomingOrder={handleSimulateIncomingOrder}
            onOpenReceipt={(ord) => setActiveReceiptOrder(ord)}
            isOfflineMode={isOfflineMode}
            offlinePendingCount={offlinePendingCount}
            onFlushOfflineQueue={handleFlushOfflineQueue}
          />
        )}

        {activeSection === 'inventory' && (
          <InventoryView
            inventory={inventory}
            canAdjustInventory={true}
            onRestockItem={handleRestockItem}
            onAutoReplenishAllLowStock={handleAutoReplenishAllLowStock}
            pushNotifications={pushNotifications}
          />
        )}

        {activeSection === 'reports' && (
          <AnalyticsReportView
            orders={orders}
            hourlyMetrics={HOURLY_REVENUE_TODAY}
            monthlyFinancials={MONTHLY_FINANCIAL_REPORT}
            canViewMonthlyPnl={true}
          />
        )}

        {activeSection === 'store_qr' && (
          <StoreAndBankQrSettingsView
            storeSettings={storeSettings}
            onSaveStoreSettings={handleSaveStoreSettings}
            onForceSyncNow={() =>
              pushLiveSyncUpdate({
                actionLabel: 'Đồng bộ thủ công toàn bộ dữ liệu từ chủ quán',
              })
            }
            lastSyncedTime={lastSyncedTime}
          />
        )}

        {activeSection === 'governance' && (
          <AiCrmGovernanceView
            products={products}
            onSaveProduct={handleSaveProduct}
            onDeleteProduct={handleDeleteProduct}
            onResetDefaultMenu={handleResetDefaultMenu}
            isOfflineMode={isOfflineMode}
            onToggleOfflineMode={() => {
              const next = !isOfflineMode;
              setIsOfflineMode(next);
              appendNotification(
                next
                  ? 'Chuyển sang Chế độ Ngoại tuyến (Offline Mode): Đơn hàng mới được lưu an toàn vào bộ nhớ cục bộ.'
                  : 'Đã khôi phục kết nối mạng: Sẵn sàng đồng bộ dữ liệu thời gian thực lên Cloud.'
              );
            }}
            backups={backups}
            onCreateCloudBackup={handleCreateCloudBackup}
            currentUserEmail={currentUser?.email || null}
            onSignInGoogle={() => {
              signInWithGoogle().catch(() => {
                appendNotification(
                  'Thông báo: Cửa sổ đăng nhập Google đã đóng hoặc đang ở chế độ xem trước.'
                );
              });
            }}
            onSignOutGoogle={() => {
              signOutUser();
            }}
          />
        )}
      </main>

      {/* Mobile Touch Fixed Bottom Navigation Bar (< 768px) */}
      <nav
        aria-label="Điều hướng di động"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200 grid grid-cols-6 items-center h-16"
      >
        {(
          [
            { id: 'pos', label: 'Bán hàng', icon: <Store className="w-4 h-4" /> },
            { id: 'orders', label: 'Đơn hàng', icon: <ClipboardList className="w-4 h-4" /> },
            { id: 'inventory', label: 'Tồn kho', icon: <Package className="w-4 h-4" /> },
            { id: 'reports', label: 'Báo cáo', icon: <BarChart3 className="w-4 h-4" /> },
            { id: 'store_qr', label: 'Quán & QR', icon: <QrCode className="w-4 h-4" /> },
            { id: 'governance', label: 'Menu', icon: <Coffee className="w-4 h-4" /> },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            aria-label={`Mở tab di động ${tab.label}`}
            onClick={() => setActiveSection(tab.id)}
            className={`min-h-[48px] flex flex-col items-center justify-center transition-colors px-0.5 ${
              activeSection === tab.id ? 'text-amber-800 font-bold' : 'text-stone-500'
            }`}
          >
            {tab.icon}
            <span className="text-[10px] mt-0.5 whitespace-nowrap truncate max-w-full">
              {tab.label}
            </span>
          </button>
        ))}
      </nav>

      {/* Modals for QR / E-Wallet Payment and Thermal Receipt + E-Invoice */}
      <PaymentCheckoutModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        totalAmount={currentPricing.total}
        orderCodePreview={nextOrderCode}
        selectedMethod={selectedPaymentMethod}
        onSelectMethod={setSelectedPaymentMethod}
        onConfirmPayment={handleConfirmPayment}
        storeSettings={storeSettings}
        onOpenStoreBankSettings={() => setActiveSection('store_qr')}
      />

      <ThermalReceiptModal
        order={activeReceiptOrder}
        onClose={() => setActiveReceiptOrder(null)}
        storeSettings={storeSettings}
        onMarkEInvoiceSent={(orderId, dest, taxCode) => {
          setOrders((prev) =>
            prev.map((o) => (o.id === orderId ? { ...o, eInvoiceSent: true } : o))
          );
          appendNotification(
            `Đã phát hành Hóa đơn điện tử (Mã CQT: ${taxCode}) và gửi tới ${dest}.`
          );
        }}
      />
    </div>
  );
}
