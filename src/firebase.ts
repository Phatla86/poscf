import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import type {
  PosOrder,
  InventoryItem,
  Product,
  CartItem,
  OrderChannel,
  StoreBankSettings,
} from './utils/posLogic';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

testConnection();

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
}

export async function signOutUser() {
  return fbSignOut(auth);
}

function sanitizeId(rawId: string): string {
  return rawId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64) || 'doc_default';
}

function stripUndefined<T>(val: T): T {
  return JSON.parse(JSON.stringify(val)) as T;
}

export interface PosLiveSyncDoc {
  id: string;
  revision: number;
  updatedByClientId: string;
  actionLabel: string;
  selectedTable: string;
  selectedChannel: OrderChannel;
  customerNameInput: string;
  storeName: string;
  storeAddress: string;
  storePhone: string;
  storeTaxCode: string;
  bankId: string;
  accountNo: string;
  accountName: string;
  transferPrefix: string;
  qrTemplate: 'compact2' | 'compact' | 'qr_only' | 'print';
  qrApiUrlTemplate: string;
  products: Product[];
  inventory: InventoryItem[];
  orders: PosOrder[];
  cart: CartItem[];
  updatedAt: string;
}

export async function pushPosLiveSyncToFirestore(input: {
  revision: number;
  updatedByClientId: string;
  actionLabel?: string;
  selectedTable: string;
  selectedChannel: OrderChannel;
  customerNameInput: string;
  storeSettings: StoreBankSettings;
  products: Product[];
  inventory: InventoryItem[];
  orders: PosOrder[];
  cart: CartItem[];
}): Promise<void> {
  const path = 'pos_sync/kaffeos_live_store';
  const s = input.storeSettings;
  const payload: PosLiveSyncDoc = {
    id: 'kaffeos_live_store',
    revision: Math.max(1, Math.min(9000000000000000, Math.round(input.revision))),
    updatedByClientId: (input.updatedByClientId || 'client_default').slice(0, 80),
    actionLabel: (input.actionLabel || 'Đồng bộ dữ liệu').slice(0, 240),
    selectedTable: (input.selectedTable || 'Bàn 01').slice(0, 60),
    selectedChannel: input.selectedChannel || 'dine_in',
    customerNameInput: (input.customerNameInput || '').slice(0, 120),
    storeName: (s.storeName || 'KAFFEOS SPECIALTY ROASTERY').slice(0, 120),
    storeAddress: (s.storeAddress || '86 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh').slice(0, 200),
    storePhone: (s.storePhone || '').slice(0, 60),
    storeTaxCode: (s.storeTaxCode || '').slice(0, 60),
    bankId: (s.bankId || 'VCB').slice(0, 40),
    accountNo: (s.accountNo || '1903888999001').slice(0, 60),
    accountName: (s.accountName || 'KAFFEOS SPECIALTY ROASTERY').slice(0, 120),
    transferPrefix: (s.transferPrefix || 'KAFFEOS').slice(0, 40),
    qrTemplate: s.qrTemplate || 'compact2',
    qrApiUrlTemplate: (
      s.qrApiUrlTemplate ||
      'https://img.vietqr.io/image/{BANK_ID}-{ACCOUNT_NO}-{TEMPLATE}.png?amount={AMOUNT}&addInfo={MEMO}&accountName={ACCOUNT_NAME}'
    ).slice(0, 500),
    products: stripUndefined(input.products.slice(0, 80)),
    inventory: stripUndefined(input.inventory.slice(0, 80)),
    orders: stripUndefined(input.orders.slice(0, 60)),
    cart: stripUndefined(input.cart.slice(0, 40)),
    updatedAt: new Date().toISOString().slice(0, 40),
  };

  try {
    await setDoc(doc(db, 'pos_sync', 'kaffeos_live_store'), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchPosLiveSyncFromFirestore(): Promise<PosLiveSyncDoc | null> {
  const ref = doc(db, 'pos_sync', 'kaffeos_live_store');
  try {
    const snap = await getDocFromServer(ref);
    if (snap.exists()) {
      return snap.data() as PosLiveSyncDoc;
    }
    return null;
  } catch {
    return null;
  }
}

export function subscribeToPosLiveSyncFromFirestore(
  onData: (docData: PosLiveSyncDoc) => void
): Unsubscribe {
  const ref = doc(db, 'pos_sync', 'kaffeos_live_store');
  return onSnapshot(
    ref,
    { includeMetadataChanges: false },
    (snap) => {
      if (snap.exists()) {
        onData(snap.data() as PosLiveSyncDoc);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'pos_sync/kaffeos_live_store');
    }
  );
}

export async function syncProductToFirestore(product: Product, uid: string): Promise<void> {
  const cleanId = sanitizeId(product.id);
  const path = `products/${cleanId}`;
  const cleanBarcode =
    (product.barcode || '893850597001')
      .toUpperCase()
      .replace(/[^0-9A-Z-]/g, '')
      .slice(0, 32) || '893850597001';
  const payload = {
    id: cleanId,
    ownerId: uid.slice(0, 128),
    name: product.name.slice(0, 120),
    category: product.category,
    price: Math.max(0, Math.min(100000000, Math.round(product.price))),
    cost: Math.max(0, Math.min(100000000, Math.round(product.cost))),
    barcode: cleanBarcode.length >= 4 ? cleanBarcode : `8938${cleanBarcode}`,
    sku: (product.sku || 'CF-01').slice(0, 32),
    available: Boolean(product.available),
    createdAt: '2026-10-26T00:00:00.000Z',
    updatedAt: new Date().toISOString().slice(0, 40),
  };

  try {
    await setDoc(doc(db, 'products', cleanId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteProductFromFirestore(productId: string): Promise<void> {
  const cleanId = sanitizeId(productId);
  const path = `products/${cleanId}`;
  try {
    await deleteDoc(doc(db, 'products', cleanId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function syncOrderToFirestore(order: PosOrder, uid: string): Promise<void> {
  const cleanId = sanitizeId(order.id);
  const path = `orders/${cleanId}`;
  const payload = {
    id: cleanId,
    ownerId: uid.slice(0, 128),
    orderCode: order.orderCode.slice(0, 32),
    channel: order.channel,
    tableName: (order.tableName || 'Tại quầy').slice(0, 40),
    subtotal: Math.max(0, Math.min(500000000, Math.round(order.subtotal))),
    discount: Math.max(0, Math.min(500000000, Math.round(order.discount))),
    tax: Math.max(0, Math.min(100000000, Math.round(order.tax))),
    total: Math.max(0, Math.min(500000000, Math.round(order.total))),
    paymentMethod: order.paymentMethod,
    status: order.status,
    cashierName: (order.cashierName || 'Thu ngân').slice(0, 80),
    customerName: (order.customerName || 'Khách lẻ').slice(0, 80),
    itemSummary: (order.itemSummary || 'Đơn hàng POS').slice(0, 500),
    itemCount: Math.max(1, Math.min(500, Math.round(order.itemCount))),
    createdAt: order.createdAt.slice(0, 40),
    updatedAt: new Date().toISOString().slice(0, 40),
  };

  try {
    await setDoc(doc(db, 'orders', cleanId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncInventoryItemToFirestore(
  item: InventoryItem,
  uid: string
): Promise<void> {
  const cleanId = sanitizeId(item.id);
  const path = `inventory/${cleanId}`;
  const payload = {
    id: cleanId,
    ownerId: uid.slice(0, 128),
    name: item.name.slice(0, 120),
    sku: item.sku.slice(0, 32),
    unit: item.unit.slice(0, 24),
    quantity: Math.max(0, Math.min(1000000, Number(item.quantity))),
    minThreshold: Math.max(0, Math.min(1000000, Number(item.minThreshold))),
    costPerUnit: Math.max(0, Math.min(100000000, Math.round(item.costPerUnit))),
    supplier: item.supplier.slice(0, 120),
    updatedAt: new Date().toISOString().slice(0, 40),
  };

  try {
    await setDoc(doc(db, 'inventory', cleanId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export interface CloudBackupDoc {
  id: string;
  ownerId: string;
  label: string;
  ordersCount: number;
  inventoryCount: number;
  totalRevenue: number;
  checksum: string;
  createdAt: string;
}

export async function createCloudBackupInFirestore(
  backup: Omit<CloudBackupDoc, 'ownerId'>,
  uid: string
): Promise<void> {
  const cleanId = sanitizeId(backup.id);
  const path = `backups/${cleanId}`;
  const payload: CloudBackupDoc = {
    id: cleanId,
    ownerId: uid.slice(0, 128),
    label: backup.label.slice(0, 120),
    ordersCount: Math.max(0, Math.min(1000000, Math.round(backup.ordersCount))),
    inventoryCount: Math.max(0, Math.min(1000000, Math.round(backup.inventoryCount))),
    totalRevenue: Math.max(0, Math.min(100000000000, Math.round(backup.totalRevenue))),
    checksum: backup.checksum.slice(0, 64),
    createdAt: backup.createdAt.slice(0, 40),
  };

  try {
    await setDoc(doc(db, 'backups', cleanId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeToCloudBackups(
  uid: string,
  onData: (backups: CloudBackupDoc[]) => void
): Unsubscribe {
  const q = query(collection(db, 'backups'), where('ownerId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const docs: CloudBackupDoc[] = [];
      snapshot.forEach((docSnap) => {
        docs.push(docSnap.data() as CloudBackupDoc);
      });
      docs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      onData(docs);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'backups');
    }
  );
}

