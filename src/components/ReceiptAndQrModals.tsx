import React, { useState, useEffect } from 'react';
import {
  Printer,
  Mail,
  MessageSquare,
  CheckCircle2,
  X,
  QrCode,
  Banknote,
  Smartphone,
  CreditCard,
  Settings2,
} from 'lucide-react';
import {
  formatVND,
  buildVietQrPayload,
  DEFAULT_STORE_BANK_SETTINGS,
  type PosOrder,
  type PaymentMethod,
  type StoreBankSettings,
} from '../utils/posLogic';
import { VietQrMatrixSvg } from './ProductIllustration';

interface PaymentCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  orderCodePreview: string;
  selectedMethod: PaymentMethod;
  onSelectMethod: (method: PaymentMethod) => void;
  onConfirmPayment: (method: PaymentMethod, openReceiptModal?: boolean) => void;
  storeSettings?: StoreBankSettings;
  onOpenStoreBankSettings?: () => void;
}

export const PaymentCheckoutModal: React.FC<PaymentCheckoutModalProps> = ({
  isOpen,
  onClose,
  totalAmount,
  orderCodePreview,
  selectedMethod,
  onSelectMethod,
  onConfirmPayment,
  storeSettings = DEFAULT_STORE_BANK_SETTINGS,
  onOpenStoreBankSettings,
}) => {
  const [cashGiven, setCashGiven] = useState<number>(
    Math.ceil(totalAmount / 10000) * 10000 || 100000
  );
  const [qrImgFailed, setQrImgFailed] = useState<boolean>(false);

  useEffect(() => {
    setCashGiven(Math.ceil(totalAmount / 10000) * 10000 || 100000);
    setQrImgFailed(false);
  }, [totalAmount, isOpen, storeSettings]);

  if (!isOpen) return null;

  const qrData = buildVietQrPayload(
    orderCodePreview,
    totalAmount,
    selectedMethod,
    storeSettings
  );
  const methods: { id: PaymentMethod; label: string; sub: string; icon: React.ReactNode }[] = [
    {
      id: 'vietqr',
      label: `VietQR (${storeSettings.bankId})`,
      sub: `STK: ${storeSettings.accountNo}`,
      icon: <QrCode className="w-4 h-4" />,
    },
    {
      id: 'momo',
      label: 'Ví MoMo',
      sub: 'QR Động Ví Điện Tử',
      icon: <Smartphone className="w-4 h-4" />,
    },
    {
      id: 'vnpay',
      label: 'VNPay-QR',
      sub: 'Cổng thanh toán QR',
      icon: <QrCode className="w-4 h-4" />,
    },
    {
      id: 'zalopay',
      label: 'ZaloPay',
      sub: 'Ví điện tử liên kết',
      icon: <Smartphone className="w-4 h-4" />,
    },
    {
      id: 'cash',
      label: 'Tiền mặt (VND)',
      sub: 'Tính tiền thừa tại quầy',
      icon: <Banknote className="w-4 h-4" />,
    },
    {
      id: 'card',
      label: 'Thẻ POS / Tap',
      sub: 'Visa · Master · Napas',
      icon: <CreditCard className="w-4 h-4" />,
    },
  ];

  const changeDue = Math.max(0, cashGiven - totalAmount);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
    >
      <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-2xl overflow-hidden shadow-xl my-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 gap-3">
          <div className="min-w-0">
            <h2 id="payment-modal-title" className="text-lg font-bold text-stone-900 truncate">
              Thanh toán đơn · {orderCodePreview}
            </h2>
            <p className="text-xs text-stone-500 truncate">
              {storeSettings.storeName} · Cổng QR Ngân hàng & Tiền mặt
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onOpenStoreBankSettings && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenStoreBankSettings();
                }}
                className="min-h-[38px] px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <Settings2 className="w-3.5 h-3.5" />
                <span>Sửa API Ngân hàng</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng hộp thoại thanh toán"
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left column: Payment Method Selector */}
          <div className="md:col-span-5 space-y-2">
            <p className="text-xs font-semibold text-stone-600 mb-2">
              Phương thức thanh toán
            </p>
            {methods.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onSelectMethod(m.id)}
                className={`w-full min-h-[48px] px-3.5 py-2.5 rounded-xl border text-left flex items-center justify-between transition-colors ${
                  selectedMethod === m.id
                    ? 'bg-stone-900 text-white border-stone-900'
                    : 'bg-stone-50/70 text-stone-800 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {m.icon}
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate">{m.label}</div>
                    <div
                      className={`text-[11px] truncate ${
                        selectedMethod === m.id ? 'text-stone-300' : 'text-stone-500'
                      }`}
                    >
                      {m.sub}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Right column: Dynamic Bank API QR or Cash Calculator */}
          <div className="md:col-span-7 bg-[#F8F7F4] border border-stone-200 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-baseline justify-between border-b border-stone-200 pb-3 mb-4">
                <span className="text-xs text-stone-600">Tổng thanh toán (gồm VAT 8%)</span>
                <span className="text-2xl font-bold font-mono tabular-nums text-amber-800">
                  {formatVND(totalAmount)}
                </span>
              </div>

              {selectedMethod === 'cash' ? (
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="cash-tender-input"
                      className="block text-xs font-medium text-stone-700 mb-1.5"
                    >
                      Tiền khách đưa (VND)
                    </label>
                    <input
                      id="cash-tender-input"
                      type="number"
                      value={cashGiven}
                      onChange={(e) => setCashGiven(Number(e.target.value) || 0)}
                      className="w-full min-h-[44px] px-3.5 py-2 bg-white border border-stone-300 rounded-lg font-mono text-base font-semibold text-stone-900"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[totalAmount, 100000, 200000, 500000].slice(0, 3).map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCashGiven(preset)}
                        className="min-h-[40px] px-2 py-1.5 text-xs font-mono font-medium bg-white border border-stone-200 rounded-lg hover:bg-stone-100 transition-colors"
                      >
                        {formatVND(preset)}
                      </button>
                    ))}
                  </div>
                  <div className="pt-3 border-t border-stone-200 flex items-center justify-between">
                    <span className="text-xs font-medium text-stone-600">Tiền thừa trả khách</span>
                    <span className="text-lg font-bold font-mono tabular-nums text-emerald-700">
                      {formatVND(changeDue)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center">
                  {!qrImgFailed && qrData.qrImageUrl ? (
                    <div className="bg-white p-2.5 rounded-xl border border-stone-200 shadow-xs mb-3">
                      <img
                        src={qrData.qrImageUrl}
                        alt={`Mã QR thanh toán ${qrData.bankBin} - ${qrData.accountNo}`}
                        onError={() => setQrImgFailed(true)}
                        className="w-48 h-48 object-contain mx-auto"
                      />
                    </div>
                  ) : (
                    <VietQrMatrixSvg seed={qrData.qrPayloadString} className="w-40 h-40 mb-3" />
                  )}
                  <p className="text-xs font-bold text-stone-900">{qrData.merchantName}</p>
                  <p className="text-xs text-stone-600 font-mono mt-0.5">
                    Ngân hàng: <span className="font-semibold text-stone-900">{qrData.bankBin}</span> · STK: <span className="font-semibold text-stone-900">{qrData.accountNo}</span>
                  </p>
                  <p className="text-[11px] text-stone-500 font-mono mt-1">
                    Nội dung CK: <span className="font-semibold text-amber-800">{qrData.transferMemo}</span>
                  </p>
                </div>
              )}
            </div>

            <div className="mt-5 pt-4 border-t border-stone-200 flex flex-wrap items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-3.5 py-2 text-xs font-medium text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-100 transition-colors whitespace-nowrap"
              >
                Quay lại
              </button>
              <button
                type="button"
                onClick={() => onConfirmPayment(selectedMethod, true)}
                className="min-h-[44px] px-3.5 py-2 text-xs font-semibold text-stone-800 bg-stone-100 border border-stone-300 rounded-lg hover:bg-stone-200 transition-colors flex items-center gap-1.5 whitespace-nowrap"
              >
                <Printer className="w-3.5 h-3.5 shrink-0" />
                <span>Thanh toán & In phiếu</span>
              </button>
              <button
                type="button"
                onClick={() => onConfirmPayment(selectedMethod, false)}
                className="min-h-[44px] px-4 py-2.5 text-xs font-semibold text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors whitespace-nowrap"
              >
                Hoàn tất thanh toán (Về chọn bàn)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ThermalReceiptModalProps {
  order: PosOrder | null;
  onClose: () => void;
  onMarkEInvoiceSent: (orderId: string, destination: string, taxCode: string) => void;
  storeSettings?: StoreBankSettings;
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({
  order,
  onClose,
  onMarkEInvoiceSent,
  storeSettings = DEFAULT_STORE_BANK_SETTINGS,
}) => {
  const [recipientEmail, setRecipientEmail] = useState(order?.customerEmail || '');
  const [recipientPhone, setRecipientPhone] = useState(order?.customerPhone || '');
  const [sending, setSending] = useState(false);
  const [eInvoiceResult, setEInvoiceResult] = useState<{
    invoiceNumber: string;
    taxAuthorityCode: string;
    sentTo: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (order) {
      setRecipientEmail(order.customerEmail || '');
      setRecipientPhone(order.customerPhone || '');
      setEInvoiceResult(null);
      setErrorMsg(null);
    }
  }, [order]);

  if (!order) return null;

  const handleSendEInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = recipientEmail.trim();
    const targetPhone = recipientPhone.trim();

    if (!targetEmail && !targetPhone) {
      setErrorMsg('Vui lòng nhập địa chỉ Email hoặc Số điện thoại SMS của khách hàng.');
      return;
    }

    setSending(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/einvoice/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderCode: order.orderCode,
          recipientEmail: targetEmail,
          recipientPhone: targetPhone,
          total: order.total,
          customerName: order.customerName,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Không thể gửi hóa đơn điện tử');
      }
      setEInvoiceResult({
        invoiceNumber: data.invoiceNumber,
        taxAuthorityCode: data.taxAuthorityCode,
        sentTo: data.sentTo,
      });
      onMarkEInvoiceSent(order.id, data.sentTo, data.taxAuthorityCode);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi kết nối dịch vụ Hóa đơn điện tử');
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-modal-title"
    >
      <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-3xl overflow-hidden shadow-xl my-6">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
          <div>
            <h2 id="receipt-modal-title" className="text-lg font-bold text-stone-900">
              Phiếu Thanh Toán & Hóa Đơn Điện Tử · {order.orderCode}
            </h2>
            <p className="text-xs text-stone-500">
              Hỗ trợ in nhiệt khổ 80mm và phát hành Hóa đơn điện tử tức thì qua Email / SMS
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ hóa đơn"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left: 80mm Thermal Print Preview */}
          <div className="md:col-span-6">
            <div
              id="printable-thermal-receipt"
              className="bg-[#FDFCFA] border border-stone-300 rounded-xl p-5 font-mono text-xs text-stone-900 space-y-3"
            >
              <div className="text-center border-b border-dashed border-stone-300 pb-3">
                <div className="text-sm font-bold tracking-tight uppercase">
                  {storeSettings.storeName}
                </div>
                <div className="text-[11px] text-stone-600">
                  {storeSettings.storeAddress}
                </div>
                <div className="text-[11px] text-stone-500">
                  Hotline: {storeSettings.storePhone || '1900 6886'}
                  {storeSettings.storeTaxCode ? ` · MST: ${storeSettings.storeTaxCode}` : ''}
                </div>
              </div>

              <div className="space-y-1 text-[11px] border-b border-dashed border-stone-300 pb-2.5">
                <div className="flex justify-between">
                  <span>Mã đơn: {order.orderCode}</span>
                  <span>Bàn: {order.tableName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Thu ngân: {order.cashierName}</span>
                  <span>Kênh: {order.channel.toUpperCase()}</span>
                </div>
                <div className="text-stone-500">
                  Thời gian: {new Date(order.createdAt).toLocaleString('vi-VN')}
                </div>
              </div>

              <div className="space-y-2 border-b border-dashed border-stone-300 pb-3">
                {order.items.length > 0 ? (
                  order.items.map((item) => (
                    <div key={item.cartItemId} className="space-y-0.5">
                      <div className="flex justify-between font-semibold">
                        <span>
                          {item.quantity}x {item.product.name} ({item.modifier.size})
                        </span>
                        <span className="tabular-nums">
                          {formatVND(item.unitPrice * item.quantity)}
                        </span>
                      </div>
                      <div className="text-[10px] text-stone-500">
                        Đường {item.modifier.sugarLevel} · {item.modifier.iceLevel}
                        {item.modifier.toppings.length > 0
                          ? ` · +${item.modifier.toppings.join(', ')}`
                          : ''}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-[11px]">{order.itemSummary}</div>
                )}
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-stone-600">
                  <span>Tạm tính ({order.itemCount} món)</span>
                  <span className="tabular-nums">{formatVND(order.subtotal)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Chiết khấu thành viên / KM</span>
                    <span className="tabular-nums">-{formatVND(order.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-stone-600">
                  <span>Thuế GTGT (VAT 8%)</span>
                  <span className="tabular-nums">{formatVND(order.tax)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold pt-1 border-t border-stone-300">
                  <span>TỔNG CỘNG</span>
                  <span className="tabular-nums">{formatVND(order.total)}</span>
                </div>
                <div className="text-[11px] text-stone-500 pt-1">
                  Thanh toán: {order.paymentMethod.toUpperCase()} · Đã trừ kho tự động
                </div>
              </div>

              {/* Barcode Graphic */}
              <div className="pt-2 text-center">
                <div className="inline-flex items-center justify-center gap-0.5 h-8 px-3 bg-white border border-stone-200">
                  {Array.from({ length: 28 }).map((_, i) => (
                    <span
                      key={i}
                      className={`inline-block h-6 bg-stone-900 ${
                        i % 3 === 0 ? 'w-1' : i % 2 === 0 ? 'w-0.5' : 'w-[1px]'
                      }`}
                    />
                  ))}
                </div>
                <div className="text-[10px] text-stone-500 mt-1">{order.orderCode}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="mt-3 w-full min-h-[44px] px-4 py-2.5 bg-stone-900 text-white text-xs font-semibold rounded-xl hover:bg-stone-800 transition-colors flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" />
              In Hóa Đơn Nhiệt Ngay (80mm)
            </button>
          </div>

          {/* Right: Instant E-Invoice via Email or SMS */}
          <div className="md:col-span-6 flex flex-col justify-between bg-[#F8F7F4] border border-stone-200 rounded-xl p-5">
            <div>
              <h3 className="text-sm font-bold text-stone-900 mb-1">
                Phát hành Hóa đơn điện tử (Email / SMS)
              </h3>
              <p className="text-xs text-stone-600 mb-4">
                Gửi biên lai điện tử có mã của Cơ quan Thuế và đường dẫn tra cứu PDF trực tiếp đến
                khách hàng.
              </p>

              <form onSubmit={handleSendEInvoice} className="space-y-3.5">
                <div>
                  <label
                    htmlFor="einvoice-email"
                    className="block text-xs font-medium text-stone-700 mb-1"
                  >
                    Email nhận hóa đơn điện tử
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                    <input
                      id="einvoice-email"
                      type="email"
                      placeholder="khachhang@congty.vn"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      className="w-full min-h-[42px] pl-9 pr-3 py-2 bg-white border border-stone-300 rounded-lg text-xs text-stone-900"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="einvoice-phone"
                    className="block text-xs font-medium text-stone-700 mb-1"
                  >
                    Số điện thoại nhận tin nhắn SMS
                  </label>
                  <div className="relative">
                    <MessageSquare className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                    <input
                      id="einvoice-phone"
                      type="tel"
                      placeholder="0903 128 456"
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      className="w-full min-h-[42px] pl-9 pr-3 py-2 bg-white border border-stone-300 rounded-lg text-xs font-mono text-stone-900"
                    />
                  </div>
                </div>

                {errorMsg && (
                  <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                    {errorMsg}
                  </div>
                )}

                {eInvoiceResult && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1 text-xs text-emerald-900">
                    <div className="flex items-center gap-1.5 font-semibold text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      Đã xuất và gửi Hóa đơn điện tử thành công!
                    </div>
                    <div className="font-mono text-[11px]">
                      Số HĐĐT: {eInvoiceResult.invoiceNumber} · Mã CQT:{' '}
                      {eInvoiceResult.taxAuthorityCode}
                    </div>
                    <div className="text-[11px] text-emerald-700">
                      Đã gửi tới: {eInvoiceResult.sentTo}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full min-h-[44px] px-4 py-2.5 bg-amber-700 text-white text-xs font-semibold rounded-xl hover:bg-amber-800 transition-colors disabled:opacity-50"
                >
                  {sending
                    ? 'Đang ký số & Gửi HĐĐT...'
                    : 'Gửi Hóa Đơn Điện Tử qua Email / SMS'}
                </button>
              </form>
            </div>

            <div className="mt-6 pt-4 border-t border-stone-200 flex items-center justify-between">
              <span className="text-[11px] text-stone-500">
                Đồng bộ Cloud Real-time · Lưu trữ bảo mật 10 năm
              </span>
              <button
                type="button"
                onClick={onClose}
                className="min-h-[40px] px-4 py-2 text-xs font-semibold text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-100"
              >
                Hoàn tất đóng
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
