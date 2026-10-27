import React, { useState, useEffect } from 'react';
import {
  CloudUpload,
  Wifi,
  WifiOff,
  LogIn,
  LogOut,
  Coffee,
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
  Store,
  QrCode,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import {
  formatVND,
  buildVietQrPayload,
  DEFAULT_STORE_BANK_SETTINGS,
  VIETNAM_BANK_PRESETS,
  type Product,
  type ProductCategory,
  type StoreBankSettings,
} from '../utils/posLogic';
import { VietQrMatrixSvg } from './ProductIllustration';
import type { CloudBackupDoc } from '../firebase';

interface StoreAndBankQrSettingsViewProps {
  storeSettings: StoreBankSettings;
  onSaveStoreSettings: (nextSettings: StoreBankSettings) => void;
  onForceSyncNow?: () => void;
  lastSyncedTime?: string;
}

export const StoreAndBankQrSettingsView: React.FC<StoreAndBankQrSettingsViewProps> = ({
  storeSettings,
  onSaveStoreSettings,
  onForceSyncNow,
  lastSyncedTime,
}) => {
  const [form, setForm] = useState<StoreBankSettings>(storeSettings);
  const [testAmount, setTestAmount] = useState<number>(65000);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);
  const [qrPreviewFailed, setQrPreviewFailed] = useState<boolean>(false);

  useEffect(() => {
    setForm(storeSettings);
    setQrPreviewFailed(false);
  }, [storeSettings]);

  const previewQr = buildVietQrPayload('KF-1088', testAmount, 'vietqr', form);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned: StoreBankSettings = {
      storeName: form.storeName.trim() || DEFAULT_STORE_BANK_SETTINGS.storeName,
      storeAddress: form.storeAddress.trim() || DEFAULT_STORE_BANK_SETTINGS.storeAddress,
      storePhone: form.storePhone.trim() || DEFAULT_STORE_BANK_SETTINGS.storePhone,
      storeTaxCode: form.storeTaxCode.trim(),
      bankId: form.bankId.trim().toUpperCase() || 'VCB',
      accountNo: form.accountNo.trim() || '1903888999001',
      accountName:
        form.accountName.trim().toUpperCase() ||
        form.storeName.trim().toUpperCase() ||
        'CHU QUAN CAFE',
      transferPrefix: form.transferPrefix.trim().toUpperCase() || 'KAFFEOS',
      qrTemplate: form.qrTemplate || 'compact2',
      qrApiUrlTemplate:
        form.qrApiUrlTemplate.trim() || DEFAULT_STORE_BANK_SETTINGS.qrApiUrlTemplate,
    };
    onSaveStoreSettings(cleaned);
    setQrPreviewFailed(false);
    setSavedBanner(
      'Đã lưu thông tin quán & cấu hình API QR ngân hàng. Đã đồng bộ tức thì sang tất cả thiết bị!'
    );
  };

  const handleResetApiTemplate = () => {
    setForm((prev) => ({
      ...prev,
      qrTemplate: 'compact2',
      qrApiUrlTemplate: DEFAULT_STORE_BANK_SETTINGS.qrApiUrlTemplate,
    }));
    setQrPreviewFailed(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Top Status & Save Bar */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
            <Store className="w-5 h-5 text-amber-700 shrink-0" />
            <span>Cài Đặt Thông Tin Quán & API Ngân Hàng Tạo Mã QR</span>
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Chỉnh sửa tên quán, địa chỉ in trên phiếu và đường dẫn API ngân hàng tạo mã QR thanh toán tự động theo số tiền đơn hàng
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
          {onForceSyncNow && (
            <button
              type="button"
              onClick={onForceSyncNow}
              className="min-h-[40px] px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <RefreshCw className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                Đồng bộ {lastSyncedTime ? `(${lastSyncedTime})` : ''}
              </span>
            </button>
          )}
          <button
            type="submit"
            className="min-h-[40px] px-3.5 py-2 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap shadow-xs"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Lưu cài đặt</span>
          </button>
        </div>
      </div>

      {savedBanner && (
        <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center justify-between gap-2">
          <span>{savedBanner}</span>
          <button
            type="button"
            onClick={() => setSavedBanner(null)}
            className="text-emerald-700 hover:text-emerald-950 font-bold"
          >
            Đóng
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 5 Cols: Store Identity & Thermal Receipt Header Preview */}
        <div className="lg:col-span-5 bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="border-b border-stone-100 pb-3">
            <h3 className="text-sm font-bold text-stone-900">
              1. Thông Tin Quán (Hiển thị trên Web & Hóa Đơn In)
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Tự động cập nhật thanh tiêu đề ứng dụng và phiếu in nhiệt 80mm
            </p>
          </div>

          <div className="space-y-3.5 text-xs">
            <div>
              <label
                htmlFor="store-name-input"
                className="block font-semibold text-stone-700 mb-1"
              >
                Tên quán cà phê *
              </label>
              <input
                id="store-name-input"
                type="text"
                required
                placeholder="VD: Tiệm Cà Phê Mơ Màng..."
                value={form.storeName}
                onChange={(e) => setForm((p) => ({ ...p, storeName: e.target.value }))}
                className="w-full min-h-[40px] px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl font-semibold text-stone-900 focus:bg-white focus:border-amber-700 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="store-address-input"
                className="block font-semibold text-stone-700 mb-1"
              >
                Địa chỉ quán *
              </label>
              <input
                id="store-address-input"
                type="text"
                required
                placeholder="VD: 86 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh..."
                value={form.storeAddress}
                onChange={(e) => setForm((p) => ({ ...p, storeAddress: e.target.value }))}
                className="w-full min-h-[40px] px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:bg-white focus:border-amber-700 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="store-phone-input"
                  className="block font-semibold text-stone-700 mb-1"
                >
                  Số điện thoại / Hotline
                </label>
                <input
                  id="store-phone-input"
                  type="text"
                  placeholder="VD: 0909 123 456"
                  value={form.storePhone}
                  onChange={(e) => setForm((p) => ({ ...p, storePhone: e.target.value }))}
                  className="w-full min-h-[40px] px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono text-stone-900 focus:bg-white focus:border-amber-700 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="store-tax-input"
                  className="block font-semibold text-stone-700 mb-1"
                >
                  Mã số thuế / Ghi chú phiếu
                </label>
                <input
                  id="store-tax-input"
                  type="text"
                  placeholder="VD: 0316889901"
                  value={form.storeTaxCode}
                  onChange={(e) => setForm((p) => ({ ...p, storeTaxCode: e.target.value }))}
                  className="w-full min-h-[40px] px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono text-stone-900 focus:bg-white focus:border-amber-700 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Live Thermal Receipt Header Preview */}
          <div className="pt-2">
            <div className="text-[11px] font-semibold text-stone-500 mb-1.5">
              Xem trước phần đầu Phiếu In Nhiệt 80mm:
            </div>
            <div className="bg-[#FDFCFA] border border-dashed border-stone-300 rounded-xl p-4 font-mono text-center space-y-1">
              <div className="text-sm font-bold text-stone-900 uppercase tracking-tight">
                {form.storeName || 'TÊN QUÁN CÀ PHÊ'}
              </div>
              <div className="text-xs text-stone-600">
                {form.storeAddress || 'Địa chỉ quán cà phê'}
              </div>
              <div className="text-[11px] text-stone-500">
                Hotline: {form.storePhone || '---'}
                {form.storeTaxCode ? ` · MST: ${form.storeTaxCode}` : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Right 7 Cols: Bank Account & Custom QR API Configuration */}
        <div className="lg:col-span-7 bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-amber-700" />
                <span>2. Cấu Hình Tài Khoản & API Ngân Hàng Tạo Mã QR Tự Động</span>
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Tự động điền đúng số tiền & nội dung đơn hàng vào mã QR khi bấm thanh toán
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetApiTemplate}
              className="min-h-[34px] px-2.5 py-1 text-[11px] font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors whitespace-nowrap"
            >
              Khôi phục API VietQR chuẩn
            </button>
          </div>

          {/* Quick Bank Selector Chips */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-stone-700">
              Chọn nhanh Ngân hàng thụ hưởng (Napas247 / VietQR):
            </label>
            <div className="flex flex-wrap gap-1.5">
              {VIETNAM_BANK_PRESETS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    setForm((p) => ({ ...p, bankId: b.id }));
                    setQrPreviewFailed(false);
                  }}
                  className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap ${
                    form.bankId.toUpperCase() === b.id
                      ? 'bg-stone-900 text-white border-stone-900'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-1">
            <div className="md:col-span-7 space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="bank-id-input"
                    className="block font-semibold text-stone-700 mb-1"
                  >
                    Mã Ngân hàng / BIN *
                  </label>
                  <input
                    id="bank-id-input"
                    type="text"
                    required
                    placeholder="VD: VCB, MB, TCB, 970436..."
                    value={form.bankId}
                    onChange={(e) => {
                      setForm((p) => ({ ...p, bankId: e.target.value }));
                      setQrPreviewFailed(false);
                    }}
                    className="w-full min-h-[38px] px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl font-mono font-bold text-stone-900 uppercase"
                  />
                </div>

                <div>
                  <label
                    htmlFor="bank-account-no-input"
                    className="block font-semibold text-stone-700 mb-1"
                  >
                    Số tài khoản nhận tiền *
                  </label>
                  <input
                    id="bank-account-no-input"
                    type="text"
                    required
                    placeholder="Nhập số tài khoản..."
                    value={form.accountNo}
                    onChange={(e) => {
                      setForm((p) => ({ ...p, accountNo: e.target.value }));
                      setQrPreviewFailed(false);
                    }}
                    className="w-full min-h-[38px] px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl font-mono font-bold text-amber-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="bank-account-name-input"
                    className="block font-semibold text-stone-700 mb-1"
                  >
                    Tên chủ tài khoản (Không dấu)
                  </label>
                  <input
                    id="bank-account-name-input"
                    type="text"
                    placeholder="VD: NGUYEN VAN A"
                    value={form.accountName}
                    onChange={(e) => {
                      setForm((p) => ({ ...p, accountName: e.target.value }));
                      setQrPreviewFailed(false);
                    }}
                    className="w-full min-h-[38px] px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl font-semibold text-stone-900 uppercase"
                  />
                </div>

                <div>
                  <label
                    htmlFor="bank-prefix-input"
                    className="block font-semibold text-stone-700 mb-1"
                  >
                    Tiền tố nội dung CK
                  </label>
                  <input
                    id="bank-prefix-input"
                    type="text"
                    placeholder="VD: KAFFEOS"
                    value={form.transferPrefix}
                    onChange={(e) => {
                      setForm((p) => ({ ...p, transferPrefix: e.target.value }));
                      setQrPreviewFailed(false);
                    }}
                    className="w-full min-h-[38px] px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl font-mono text-stone-900 uppercase"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="qr-template-select"
                  className="block font-semibold text-stone-700 mb-1"
                >
                  Kiểu khung mã QR (`{`{TEMPLATE}`}`)
                </label>
                <select
                  id="qr-template-select"
                  value={form.qrTemplate}
                  onChange={(e) => {
                    setForm((p) => ({
                      ...p,
                      qrTemplate: e.target.value as StoreBankSettings['qrTemplate'],
                    }));
                    setQrPreviewFailed(false);
                  }}
                  className="w-full min-h-[38px] px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900"
                >
                  <option value="compact2">compact2 — Đầy đủ Logo Ngân hàng + Số tiền + STK</option>
                  <option value="compact">compact — Khung QR thu gọn</option>
                  <option value="qr_only">qr_only — Chỉ hiển thị mã vuông QR</option>
                  <option value="print">print — Bản in sắc nét tại quầy</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="qr-api-url-input"
                  className="block font-semibold text-stone-700 mb-1"
                >
                  Đường dẫn API tạo mã QR Ngân hàng (Tự sửa URL API):
                </label>
                <textarea
                  id="qr-api-url-input"
                  rows={3}
                  value={form.qrApiUrlTemplate}
                  onChange={(e) => {
                    setForm((p) => ({ ...p, qrApiUrlTemplate: e.target.value }));
                    setQrPreviewFailed(false);
                  }}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono text-[11px] text-stone-800 focus:bg-white focus:border-amber-700 focus:outline-none"
                />
                <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">
                  Biến tự động thay thế khi tạo đơn:{' '}
                  <code className="px-1 py-0.5 bg-stone-100 rounded text-stone-800">{`{BANK_ID}`}</code>,{' '}
                  <code className="px-1 py-0.5 bg-stone-100 rounded text-stone-800">{`{ACCOUNT_NO}`}</code>,{' '}
                  <code className="px-1 py-0.5 bg-stone-100 rounded text-stone-800">{`{AMOUNT}`}</code>,{' '}
                  <code className="px-1 py-0.5 bg-stone-100 rounded text-stone-800">{`{MEMO}`}</code>,{' '}
                  <code className="px-1 py-0.5 bg-stone-100 rounded text-stone-800">{`{ACCOUNT_NAME}`}</code>,{' '}
                  <code className="px-1 py-0.5 bg-stone-100 rounded text-stone-800">{`{TEMPLATE}`}</code>
                </p>
              </div>
            </div>

            {/* Live QR Preview Column */}
            <div className="md:col-span-5 bg-[#F8F7F4] border border-stone-200 rounded-2xl p-4 flex flex-col items-center justify-between text-center">
              <div className="w-full space-y-2">
                <div className="text-xs font-bold text-stone-900">
                  Xem Trước Mã QR Từ API Ngân Hàng
                </div>
                <div className="flex items-center justify-center gap-2 text-xs">
                  <span className="text-stone-500">Số tiền thử:</span>
                  <input
                    type="number"
                    min={1000}
                    step={5000}
                    value={testAmount}
                    onChange={(e) => setTestAmount(Number(e.target.value) || 0)}
                    className="w-28 min-h-[32px] px-2 py-1 bg-white border border-stone-200 rounded-lg font-mono text-xs font-bold text-amber-800 text-right"
                  />
                </div>
              </div>

              <div className="my-3">
                {!qrPreviewFailed && previewQr.qrImageUrl ? (
                  <div className="bg-white p-2.5 rounded-xl border border-stone-200 shadow-xs">
                    <img
                      src={previewQr.qrImageUrl}
                      alt="Xem trước mã QR ngân hàng"
                      onError={() => setQrPreviewFailed(true)}
                      className="w-44 h-44 object-contain mx-auto"
                    />
                  </div>
                ) : (
                  <VietQrMatrixSvg seed={previewQr.qrPayloadString} className="w-40 h-40 mx-auto" />
                )}
              </div>

              <div className="w-full space-y-0.5 text-[11px]">
                <div className="font-bold text-stone-900 truncate">{previewQr.merchantName}</div>
                <div className="font-mono text-stone-600">
                  {previewQr.bankBin} · {previewQr.accountNo}
                </div>
                <div className="font-mono text-amber-800 font-semibold">
                  {formatVND(testAmount)} · {previewQr.transferMemo}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};

interface AiCrmGovernanceViewProps {
  products: Product[];
  onSaveProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onResetDefaultMenu: () => void;
  isOfflineMode: boolean;
  onToggleOfflineMode: () => void;
  backups: CloudBackupDoc[];
  onCreateCloudBackup: (label: string) => Promise<void>;
  currentUserEmail: string | null;
  onSignInGoogle: () => void;
  onSignOutGoogle: () => void;
}

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  coffee: 'Cà phê',
  tea: 'Trà & Matcha',
  freeze: 'Đá xay',
  bakery: 'Bánh ngọt',
  beans: 'Hạt rang',
};

export const AiCrmGovernanceView: React.FC<AiCrmGovernanceViewProps> = ({
  products,
  onSaveProduct,
  onDeleteProduct,
  onResetDefaultMenu,
  isOfflineMode,
  onToggleOfflineMode,
  backups,
  onCreateCloudBackup,
  currentUserEmail,
  onSignInGoogle,
  onSignOutGoogle,
}) => {
  const [backupLabel, setBackupLabel] = useState('Sao lưu định kỳ ca sáng');
  const [creatingBackup, setCreatingBackup] = useState(false);

  // Menu Editor Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dishName, setDishName] = useState('');
  const [dishPrice, setDishPrice] = useState<number>(45000);
  const [dishCategory, setDishCategory] = useState<ProductCategory>('coffee');
  const [dishSku, setDishSku] = useState('');
  const [dishBarcode, setDishBarcode] = useState('');
  const [menuMessage, setMenuMessage] = useState<string | null>(null);

  const startNewDish = () => {
    const nextNum = products.length + 1;
    setEditingId('NEW');
    setDishName('');
    setDishPrice(45000);
    setDishCategory('coffee');
    setDishSku(`CF-${String(nextNum).padStart(2, '0')}`);
    setDishBarcode(`89385010${String(nextNum).padStart(2, '0')}`);
  };

  const startEditDish = (p: Product) => {
    setEditingId(p.id);
    setDishName(p.name);
    setDishPrice(p.price);
    setDishCategory(p.category);
    setDishSku(p.sku);
    setDishBarcode(p.barcode);
  };

  const handleSaveDishSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dishName.trim()) return;
    const isNew = editingId === 'NEW' || !editingId;
    const targetId = isNew ? `prd_custom_${Date.now()}` : editingId;
    const existing = products.find((p) => p.id === targetId);

    const saved: Product = {
      id: targetId,
      name: dishName.trim(),
      price: Math.max(0, Number(dishPrice) || 0),
      cost: existing?.cost || Math.round((Number(dishPrice) || 0) * 0.3),
      available: existing?.available ?? true,
      category: dishCategory,
      sku: dishSku.trim() || 'CF-NEW',
      barcode: dishBarcode.trim() || String(Date.now()).slice(-10),
      subtitle: existing?.subtitle || 'Món pha chế tại quán',
      recipe: existing?.recipe || [{ ingredientId: 'inv_1', amountPerCup: 0.02 }],
    };

    onSaveProduct(saved);
    setMenuMessage(`Đã lưu "${saved.name}" (${formatVND(saved.price)}) vào thực đơn.`);
    setEditingId(null);
    setDishName('');
  };

  const handleBackupNow = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingBackup(true);
    try {
      await onCreateCloudBackup(backupLabel || 'Sao lưu thủ công bảo mật');
    } finally {
      setCreatingBackup(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Direct Menu Editor (7 cols) */}
      <div className="lg:col-span-7 bg-white border border-stone-200 rounded-2xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3.5">
          <div>
            <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <Coffee className="w-4 h-4 text-amber-700" />
              <span>Quản Lý & Chỉnh Sửa Thực Đơn Trực Tiếp ({products.length} món)</span>
            </h2>
            <p className="text-xs text-stone-500">
              Thêm món mới, đổi tên, chỉnh giá bán hoặc xóa món ngay trên trình duyệt
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onResetDefaultMenu}
              title="Khôi phục thực đơn gốc"
              className="min-h-[38px] px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Menu gốc</span>
            </button>
            <button
              type="button"
              onClick={startNewDish}
              className="min-h-[38px] px-3.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm món mới</span>
            </button>
          </div>
        </div>

        {menuMessage && (
          <div className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800">
            {menuMessage}
          </div>
        )}

        {/* Inline Add / Edit Dish Form */}
        {editingId && (
          <form
            onSubmit={handleSaveDishSubmit}
            className="p-4 rounded-2xl bg-[#F8F7F4] border border-amber-700/40 space-y-3 text-xs"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-stone-900">
                {editingId === 'NEW' ? 'Thêm món mới vào Menu' : 'Đang chỉnh sửa món'}
              </span>
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="text-stone-500 hover:text-stone-900"
              >
                Đóng
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <div className="sm:col-span-5">
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                  Tên món *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nhập tên món..."
                  value={dishName}
                  onChange={(e) => setDishName(e.target.value)}
                  className="w-full min-h-[38px] px-3 py-1.5 bg-white border border-stone-200 rounded-xl text-stone-900"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                  Giá bán (VNĐ) *
                </label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  required
                  value={dishPrice}
                  onChange={(e) => setDishPrice(Number(e.target.value) || 0)}
                  className="w-full min-h-[38px] px-3 py-1.5 bg-white border border-stone-200 rounded-xl font-mono text-stone-900"
                />
              </div>
              <div className="sm:col-span-4">
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                  Danh mục
                </label>
                <select
                  value={dishCategory}
                  onChange={(e) => setDishCategory(e.target.value as ProductCategory)}
                  className="w-full min-h-[38px] px-3 py-1.5 bg-white border border-stone-200 rounded-xl text-stone-900"
                >
                  {(Object.keys(CATEGORY_LABELS) as ProductCategory[]).map((cat) => (
                    <option key={cat} value={cat}>
                      {CATEGORY_LABELS[cat]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Mã SKU"
                  value={dishSku}
                  onChange={(e) => setDishSku(e.target.value)}
                  className="w-24 min-h-[36px] px-2.5 py-1 bg-white border border-stone-200 rounded-lg font-mono text-xs"
                />
                <input
                  type="text"
                  placeholder="Mã vạch"
                  value={dishBarcode}
                  onChange={(e) => setDishBarcode(e.target.value)}
                  className="w-32 min-h-[36px] px-2.5 py-1 bg-white border border-stone-200 rounded-lg font-mono text-xs"
                />
              </div>
              <button
                type="submit"
                className="min-h-[38px] px-4 py-1.5 bg-stone-900 text-white font-semibold rounded-xl hover:bg-stone-800 whitespace-nowrap"
              >
                Lưu vào Menu
              </button>
            </div>
          </form>
        )}

        {/* Menu Items Table */}
        <div className="overflow-x-auto border border-stone-200 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-[11px] font-semibold text-stone-600 whitespace-nowrap">
              <tr>
                <th className="py-2.5 px-3">Tên món</th>
                <th className="py-2.5 px-3 hidden sm:table-cell">Danh mục</th>
                <th className="py-2.5 px-3 text-right">Giá bán</th>
                <th className="py-2.5 px-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-stone-50/80">
                  <td className="py-2.5 px-3">
                    <div className="font-bold text-stone-900">{p.name}</div>
                    <div className="text-[11px] font-mono text-stone-400">
                      {p.sku} · <span className="sm:hidden">{CATEGORY_LABELS[p.category]}</span>
                      <span className="hidden sm:inline">{p.barcode}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-stone-600 hidden sm:table-cell whitespace-nowrap">
                    {CATEGORY_LABELS[p.category]}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-800 tabular-nums whitespace-nowrap">
                    {formatVND(p.price)}
                  </td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => startEditDish(p)}
                        className="min-h-[32px] px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg font-semibold inline-flex items-center gap-1 whitespace-nowrap"
                      >
                        <Pencil className="w-3 h-3 shrink-0" />
                        <span>Sửa</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteProduct(p.id)}
                        aria-label={`Xóa ${p.name}`}
                        className="min-h-[32px] px-2 py-1 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg inline-flex items-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cloud Backup, Multi-Device Sync & Offline Mode (5 cols) */}
      <div className="lg:col-span-5 bg-white border border-stone-200 rounded-2xl p-6 flex flex-col justify-between space-y-5">
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <CloudUpload className="w-4 h-4 text-amber-700" />
              <span>Sao Lưu Đám Mây Bảo Mật & Hoạt Động Ngoại Tuyến</span>
            </h2>
            <p className="text-xs text-stone-500">
              Đồng bộ Firestore thời gian thực & mã hóa bản sao lưu SHA-256 cho chủ quán
            </p>
          </div>

          {/* Firebase Auth Cloud Sync Account Box */}
          <div className="p-3.5 rounded-xl bg-[#F8F7F4] border border-stone-200 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-stone-900">
                {currentUserEmail
                  ? `Chủ quán: ${currentUserEmail}`
                  : 'Chế độ Chủ Quán (Local + Cloud Ready)'}
              </div>
              <div className="text-[11px] text-stone-500">
                {currentUserEmail
                  ? 'Đang đồng bộ thời gian thực với Firebase Firestore'
                  : 'Đăng nhập Google để đồng bộ trực tiếp lên Cloud cá nhân'}
              </div>
            </div>
            {currentUserEmail ? (
              <button
                type="button"
                onClick={onSignOutGoogle}
                className="min-h-[38px] px-3 py-1.5 bg-white border border-stone-300 text-stone-800 text-xs font-semibold rounded-lg flex items-center gap-1.5 whitespace-nowrap"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Đăng xuất</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onSignInGoogle}
                className="min-h-[38px] px-3 py-1.5 bg-stone-900 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 whitespace-nowrap"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Kết nối Google Cloud</span>
              </button>
            )}
          </div>

          {/* Offline Mode Simulator Toggle */}
          <div className="p-3.5 rounded-xl border border-stone-200 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-stone-900">
                Chế độ Hoạt động Ngoại tuyến (Offline-First)
              </div>
              <div className="text-[11px] text-stone-500">
                Khi mất mạng, đơn hàng và menu vẫn lưu cục bộ và tự đẩy lên Cloud khi có mạng lại
              </div>
            </div>
            <button
              type="button"
              onClick={onToggleOfflineMode}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                isOfflineMode
                  ? 'bg-amber-700 text-white'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              }`}
            >
              {isOfflineMode ? (
                <>
                  <WifiOff className="w-3.5 h-3.5" />
                  <span>Đang Offline</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5" />
                  <span>Trực tuyến</span>
                </>
              )}
            </button>
          </div>

          {/* Create Cloud Backup Form */}
          <form onSubmit={handleBackupNow} className="space-y-2">
            <label
              htmlFor="backup-label-input"
              className="block text-xs font-semibold text-stone-700"
            >
              Tạo bản sao lưu đám mây tức thì (Cloud Snapshot)
            </label>
            <div className="flex items-center gap-2">
              <input
                id="backup-label-input"
                type="text"
                value={backupLabel}
                onChange={(e) => setBackupLabel(e.target.value)}
                className="flex-1 min-h-[40px] px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs"
              />
              <button
                type="submit"
                disabled={creatingBackup}
                className="min-h-[40px] px-3.5 py-1.5 bg-stone-900 text-white text-xs font-semibold rounded-lg hover:bg-stone-800 whitespace-nowrap"
              >
                {creatingBackup ? 'Đang mã hóa...' : 'Sao lưu ngay'}
              </button>
            </div>
          </form>

          {/* Backup History List */}
          <div className="space-y-1.5 max-h-60 overflow-y-auto divide-y divide-stone-100">
            {backups.map((b) => (
              <div key={b.id} className="py-2 text-xs flex items-center justify-between gap-2">
                <div>
                  <div className="font-semibold text-stone-900">{b.label}</div>
                  <div className="text-[11px] font-mono text-stone-500">
                    {b.ordersCount} đơn · {b.inventoryCount} mã kho · {b.checksum}
                  </div>
                </div>
                <span className="font-mono text-[11px] text-emerald-700 shrink-0">
                  {new Date(b.createdAt).toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
