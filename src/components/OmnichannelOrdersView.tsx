import React, { useState } from 'react';
import {
  Printer,
  CheckCircle2,
  Clock,
  RefreshCw,
  PlusCircle,
  CloudCheck,
  WifiOff,
} from 'lucide-react';
import {
  formatVND,
  type PosOrder,
  type OrderStatus,
  type OrderChannel,
} from '../utils/posLogic';

interface OmnichannelOrdersViewProps {
  orders: PosOrder[];
  onAdvanceOrderStatus: (orderId: string, nextStatus: OrderStatus) => void;
  onSimulateIncomingOrder: (channel: OrderChannel) => void;
  onOpenReceipt: (order: PosOrder) => void;
  isOfflineMode: boolean;
  offlinePendingCount: number;
  onFlushOfflineQueue: () => void;
}

const CHANNEL_LABELS: Record<OrderChannel, string> = {
  dine_in: 'Tại bàn',
  takeaway: 'Mang đi',
  grabfood: 'GrabFood',
  shopeefood: 'ShopeeFood',
  web: 'Web Order',
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  preparing: 'Đang pha chế',
  ready: 'Sẵn sàng trả món',
  completed: 'Đã hoàn tất',
  cancelled: 'Đã hủy',
};

export const OmnichannelOrdersView: React.FC<OmnichannelOrdersViewProps> = ({
  orders,
  onAdvanceOrderStatus,
  onSimulateIncomingOrder,
  onOpenReceipt,
  isOfflineMode,
  offlinePendingCount,
  onFlushOfflineQueue,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [channelFilter, setChannelFilter] = useState<'all' | OrderChannel>('all');

  const filteredOrders = orders.filter((o) => {
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    const matchChannel = channelFilter === 'all' || o.channel === channelFilter;
    return matchStatus && matchChannel;
  });

  const preparingCount = orders.filter((o) => o.status === 'preparing').length;
  const readyCount = orders.filter((o) => o.status === 'ready').length;
  const completedCount = orders.filter((o) => o.status === 'completed').length;

  return (
    <div className="space-y-6">
      {/* Multi-device Sync & Omnichannel Simulation Header */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-stone-900">
            Điều Phối Đơn Hàng Đa Kênh & Màn Hình Pha Chế (KDS)
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Đồng bộ thời gian thực giữa Máy tính bảng Thu ngân · Màn hình Barista · Điện thoại Quản lý
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onSimulateIncomingOrder('grabfood')}
            className="min-h-[42px] px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-900 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <PlusCircle className="w-4 h-4 text-emerald-700" />
            <span>Nhận đơn GrabFood mới</span>
          </button>
          <button
            type="button"
            onClick={() => onSimulateIncomingOrder('shopeefood')}
            className="min-h-[42px] px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-900 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <PlusCircle className="w-4 h-4 text-amber-700" />
            <span>Nhận đơn ShopeeFood mới</span>
          </button>
          {offlinePendingCount > 0 && !isOfflineMode && (
            <button
              type="button"
              onClick={onFlushOfflineQueue}
              className="min-h-[42px] px-3.5 py-2 bg-amber-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 hover:bg-amber-800 transition-colors whitespace-nowrap"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Đồng bộ {offlinePendingCount} đơn Offline lên Cloud</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Strip — 2x2 on Mobile/Tablet, 4 cols on Desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="min-w-0 bg-white border border-stone-200 rounded-2xl p-3.5 sm:p-4 space-y-1">
          <div className="text-[11px] sm:text-xs text-stone-500 truncate">Tổng đơn trong ca</div>
          <div className="text-lg sm:text-2xl font-bold font-mono tabular-nums text-stone-900">
            {orders.length} đơn
          </div>
          <div className="text-[11px] text-stone-500 truncate">
            Tại bàn · Mang đi · App
          </div>
        </div>
        <div className="min-w-0 bg-white border border-stone-200 rounded-2xl p-3.5 sm:p-4 space-y-1">
          <div className="text-[11px] sm:text-xs text-amber-800 font-medium truncate">
            Đang pha chế (Bar)
          </div>
          <div className="text-lg sm:text-2xl font-bold font-mono tabular-nums text-amber-800">
            {preparingCount} đơn
          </div>
          <div className="text-[11px] text-stone-500 truncate">TB 2 phút 40 giây / đơn</div>
        </div>
        <div className="min-w-0 bg-white border border-stone-200 rounded-2xl p-3.5 sm:p-4 space-y-1">
          <div className="text-[11px] sm:text-xs text-emerald-700 font-medium truncate">
            Sẵn sàng trả món
          </div>
          <div className="text-lg sm:text-2xl font-bold font-mono tabular-nums text-emerald-700">
            {readyCount} đơn
          </div>
          <div className="text-[11px] text-stone-500 truncate">Sẵn sàng giao tại quầy</div>
        </div>
        <div className="min-w-0 bg-white border border-stone-200 rounded-2xl p-3.5 sm:p-4 space-y-1">
          <div className="text-[11px] sm:text-xs text-stone-500 truncate">Đã hoàn tất & Cloud</div>
          <div className="text-lg sm:text-2xl font-bold font-mono tabular-nums text-stone-900">
            {completedCount} đơn
          </div>
          <div className="text-[11px] text-stone-500 truncate">
            Hàng đợi Offline: {offlinePendingCount} đơn
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="w-full sm:w-auto flex items-center gap-1 p-1 bg-stone-200/70 rounded-xl overflow-x-auto">
          {(
            [
              { id: 'all', label: 'Tất cả' },
              { id: 'preparing', label: 'Đang pha chế' },
              { id: 'ready', label: 'Chờ giao' },
              { id: 'completed', label: 'Hoàn tất' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`min-h-[38px] px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-auto flex items-center gap-1 p-1 bg-stone-200/70 rounded-xl overflow-x-auto">
          {(
            [
              { id: 'all', label: 'Mọi kênh' },
              { id: 'dine_in', label: 'Tại bàn' },
              { id: 'takeaway', label: 'Mang đi' },
              { id: 'grabfood', label: 'GrabFood' },
              { id: 'shopeefood', label: 'ShopeeFood' },
              { id: 'web', label: 'Web Order' },
            ] as const
          ).map((ch) => (
            <button
              key={ch.id}
              type="button"
              onClick={() => setChannelFilter(ch.id)}
              className={`min-h-[38px] px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                channelFilter === ch.id
                  ? 'bg-stone-900 text-white'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {ch.label}
            </button>
          ))}
        </div>
      </div>

      {/* Order Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredOrders.map((order) => (
          <div
            key={order.id}
            className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              {/* Quiet unboxed metadata line */}
              <div className="flex items-center justify-between gap-2 text-xs text-stone-500 font-mono">
                <div className="flex items-center gap-1.5 min-w-0 truncate">
                  <span className="font-bold text-stone-900">{order.orderCode}</span>
                  <span aria-hidden="true">·</span>
                  <span className="truncate">{CHANNEL_LABELS[order.channel]}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {new Date(order.createdAt).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <span className="flex items-center gap-1 text-[11px] shrink-0">
                  {order.syncedToCloud !== false ? (
                    <>
                      <CloudCheck className="w-3.5 h-3.5 text-emerald-700" />
                      <span className="text-emerald-700">Đã đồng bộ</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3.5 h-3.5 text-amber-700" />
                      <span className="text-amber-700">Lưu Offline</span>
                    </>
                  )}
                </span>
              </div>

              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-bold text-stone-900 truncate">{order.tableName}</h3>
                <span
                  className={`text-xs font-semibold shrink-0 ${
                    order.status === 'preparing'
                      ? 'text-amber-700'
                      : order.status === 'ready'
                        ? 'text-emerald-700'
                        : 'text-stone-600'
                  }`}
                >
                  {STATUS_LABELS[order.status]}
                </span>
              </div>

              <p className="text-xs text-stone-700 bg-[#F8F7F4] border border-stone-200/80 rounded-xl p-3 leading-relaxed">
                {order.itemSummary}
              </p>

              <div className="flex items-center justify-between gap-2 text-xs text-stone-500">
                <span className="truncate">Thu ngân: {order.cashierName}</span>
                <span className="font-mono shrink-0">
                  {order.paymentMethod.toUpperCase()} ·{' '}
                  {order.eInvoiceSent ? 'Đã gửi HĐĐT' : 'HĐ in nhiệt'}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
              <div className="font-mono text-sm sm:text-base font-bold tabular-nums text-stone-900 whitespace-nowrap">
                {formatVND(order.total)}
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => onOpenReceipt(order)}
                  className="min-h-[38px] px-2.5 sm:px-3 py-1.5 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
                >
                  <Printer className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Hóa đơn<span className="hidden sm:inline"> / HĐĐT</span>
                  </span>
                </button>

                {order.status === 'preparing' && (
                  <button
                    type="button"
                    onClick={() => onAdvanceOrderStatus(order.id, 'ready')}
                    className="min-h-[38px] px-3 py-1.5 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
                  >
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>Báo pha xong</span>
                  </button>
                )}

                {order.status === 'ready' && (
                  <button
                    type="button"
                    onClick={() => onAdvanceOrderStatus(order.id, 'completed')}
                    className="min-h-[38px] px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Hoàn tất giao</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
