import React, { useState } from 'react';
import {
  AlertTriangle,
  PackagePlus,
  BellRing,
  Search,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';
import {
  classifyStockLevel,
  formatVND,
  type InventoryItem,
} from '../utils/posLogic';

interface InventoryViewProps {
  inventory: InventoryItem[];
  canAdjustInventory: boolean;
  onRestockItem: (itemId: string, addedQuantity: number, newMinThreshold?: number) => void;
  onAutoReplenishAllLowStock: () => void;
  pushNotifications: { id: string; message: string; time: string }[];
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  inventory,
  canAdjustInventory,
  onRestockItem,
  onAutoReplenishAllLowStock,
  pushNotifications,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'low' | 'normal'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [addQtyInput, setAddQtyInput] = useState<number>(10);
  const [thresholdInput, setThresholdInput] = useState<number>(5);

  const lowStockItems = inventory.filter((item) => classifyStockLevel(item) !== 'normal');
  const totalWarehouseValue = inventory.reduce(
    (sum, item) => sum + item.quantity * item.costPerUnit,
    0
  );

  const filteredItems = inventory.filter((item) => {
    const level = classifyStockLevel(item);
    const matchFilter =
      filterMode === 'all' ||
      (filterMode === 'low' && level !== 'normal') ||
      (filterMode === 'normal' && level === 'normal');
    const q = searchQuery.trim().toLowerCase();
    const matchSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      item.supplier.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setAddQtyInput(Math.max(5, Math.ceil(item.minThreshold * 1.5)));
    setThresholdInput(item.minThreshold);
  };

  return (
    <div className="space-y-5">
      {/* Header & Auto Purchase Order Action */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3.5">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-stone-900">
            Quản Lý Kho Nguyên Liệu & Cảnh Báo Tự Động
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Định lượng tự động trừ theo công thức từng ly bán ra · Cảnh báo tức thì khi chạm ngưỡng tối thiểu
          </p>
        </div>

        <button
          type="button"
          disabled={!canAdjustInventory || lowStockItems.length === 0}
          onClick={onAutoReplenishAllLowStock}
          className="w-full sm:w-auto min-h-[42px] px-4 py-2 bg-amber-700 text-white text-xs font-semibold rounded-xl hover:bg-amber-800 transition-colors disabled:opacity-40 flex items-center justify-center gap-2 shrink-0"
        >
          <PackagePlus className="w-4 h-4 shrink-0" />
          <span className="truncate">
            Nhập bổ sung tự động ({lowStockItems.length} mã thiếu)
          </span>
        </button>
      </div>

      {/* Automatic Low-Stock Alert Banner */}
      {lowStockItems.length > 0 && (
        <div className="bg-amber-50/90 border border-amber-300 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <AlertTriangle className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-bold text-stone-900">
                Cảnh báo tồn kho: {lowStockItems.length} nguyên liệu dưới ngưỡng an toàn
              </h2>
              <p className="text-xs text-stone-700 mt-1 leading-relaxed">
                Cần nhập ngay:{' '}
                <strong className="font-semibold">
                  {lowStockItems.map((i) => `${i.name} (còn ${i.quantity} ${i.unit})`).join(' · ')}
                </strong>
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono font-semibold text-amber-900 shrink-0">
            Trạng thái: Đã báo Chủ quán
          </span>
        </div>
      )}

      {/* KPI Summary Row — 2+1 on Mobile, 3 cols on Tablet/Desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="min-w-0 bg-white border border-stone-200 rounded-2xl p-3.5 sm:p-5 space-y-1">
          <div className="text-[11px] sm:text-xs font-medium text-stone-500 truncate">
            Danh mục nguyên liệu
          </div>
          <div className="text-base sm:text-xl lg:text-2xl font-bold font-mono tabular-nums text-stone-900 truncate">
            {inventory.length} mặt hàng
          </div>
          <div className="text-[11px] text-stone-500 truncate">
            Trừ định lượng tự động
          </div>
        </div>

        <div className="min-w-0 bg-white border border-stone-200 rounded-2xl p-3.5 sm:p-5 space-y-1">
          <div className="text-[11px] sm:text-xs font-medium text-amber-800 truncate">
            Cần nhập khẩn
          </div>
          <div className="text-base sm:text-xl lg:text-2xl font-bold font-mono tabular-nums text-amber-800 truncate">
            {lowStockItems.length} mặt hàng
          </div>
          <div className="text-[11px] text-stone-500 truncate">
            Tồn &le; Ngưỡng tối thiểu
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 min-w-0 bg-white border border-stone-200 rounded-2xl p-3.5 sm:p-5 space-y-1">
          <div className="text-[11px] sm:text-xs font-medium text-stone-500 truncate">
            Tổng giá trị vốn tồn kho
          </div>
          <div className="text-base sm:text-xl lg:text-2xl font-bold font-mono tabular-nums text-stone-900 truncate">
            {formatVND(totalWarehouseValue)}
          </div>
          <div className="text-[11px] text-stone-500 truncate">
            Tính theo đơn giá nhập bình quân
          </div>
        </div>
      </div>

      {/* Search & Filter Bar — Overflow-safe on 360px Mobile & Desktop */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="w-full sm:w-auto grid grid-cols-3 sm:flex items-center gap-1 p-1 bg-stone-200/70 rounded-xl">
          {(
            [
              { id: 'all', label: `Tất cả (${inventory.length})` },
              { id: 'low', label: `Sắp hết (${lowStockItems.length})` },
              {
                id: 'normal',
                label: `Đủ hàng (${inventory.length - lowStockItems.length})`,
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterMode(tab.id)}
              className={`min-w-0 overflow-hidden min-h-[38px] px-2 sm:px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center ${
                filterMode === tab.id
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <span className="truncate">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
          <input
            type="search"
            aria-label="Tìm nguyên liệu hoặc nhà cung cấp"
            placeholder="Tìm nguyên liệu, mã SKU, nhà cung cấp..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full min-h-[40px] pl-9 pr-3 py-1.5 bg-white border border-stone-200 rounded-xl text-xs text-stone-900"
          />
        </div>
      </div>

      {/* Mobile & Small Screen Card List (< md) — Zero horizontal squishing */}
      <div className="md:hidden grid grid-cols-1 gap-3">
        {filteredItems.map((item) => {
          const level = classifyStockLevel(item);
          return (
            <div
              key={item.id}
              className="bg-white border border-stone-200 rounded-2xl p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-2.5">
                <div className="min-w-0">
                  <div className="font-bold text-sm text-stone-900 leading-snug">{item.name}</div>
                  <div className="text-[11px] font-mono text-stone-500 truncate mt-0.5">
                    {item.sku} · {item.supplier}
                  </div>
                </div>

                <div className="shrink-0">
                  {level === 'critical' ? (
                    <span className="text-[11px] text-red-700 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Cạn kho</span>
                    </span>
                  ) : level === 'warning' ? (
                    <span className="text-[11px] text-amber-700 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Sắp hết</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>An toàn</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 p-2.5 bg-[#F8F7F4] border border-stone-200/70 rounded-xl text-xs">
                <div className="min-w-0">
                  <div className="text-[10px] text-stone-500 truncate">Tồn thực tế</div>
                  <div className="font-mono font-bold tabular-nums text-stone-900 truncate mt-0.5">
                    {item.quantity} {item.unit}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-stone-500 truncate">Ngưỡng tối thiểu</div>
                  <div className="font-mono tabular-nums text-stone-700 truncate mt-0.5">
                    {item.minThreshold} {item.unit}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-stone-500 truncate">Đơn giá vốn</div>
                  <div className="font-mono tabular-nums text-stone-700 truncate mt-0.5">
                    {formatVND(item.costPerUnit)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-[11px] font-mono text-stone-400">
                  Cập nhật{' '}
                  {new Date(item.updatedAt).toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={!canAdjustInventory}
                    onClick={() => onRestockItem(item.id, 5)}
                    aria-label={`Nhập nhanh +5 ${item.unit} cho ${item.name}`}
                    className="min-h-[36px] px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 font-mono text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
                  >
                    +5 {item.unit}
                  </button>
                  <button
                    type="button"
                    disabled={!canAdjustInventory}
                    onClick={() => openEditModal(item)}
                    aria-label={`Điều chỉnh kho ${item.name}`}
                    className="min-h-[36px] px-3.5 py-1 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
                  >
                    Nhập kho
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tablet & Desktop Inventory Data Table (>= md) — Clean whitespace-nowrap proportions */}
      <div className="hidden md:block bg-white border border-stone-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-[11px] font-semibold text-stone-600">
                <th className="py-3.5 px-4">Mã SKU · Nguyên liệu</th>
                <th className="py-3.5 px-4">Nhà cung cấp</th>
                <th className="py-3.5 px-4 text-right">Tồn thực tế</th>
                <th className="py-3.5 px-4 text-right">Ngưỡng tối thiểu</th>
                <th className="py-3.5 px-4 text-right">Đơn giá vốn</th>
                <th className="py-3.5 px-4">Trạng thái</th>
                <th className="py-3.5 px-4 text-right">Thao tác nhập kho</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-xs">
              {filteredItems.map((item) => {
                const level = classifyStockLevel(item);
                const stockPct = Math.min(
                  100,
                  Math.round((item.quantity / Math.max(1, item.minThreshold * 2)) * 100)
                );
                return (
                  <tr key={item.id} className="hover:bg-stone-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-stone-900">{item.name}</div>
                      <div className="text-[11px] font-mono text-stone-500 mt-0.5">
                        {item.sku} · Cập nhật{' '}
                        {new Date(item.updatedAt).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-stone-600">{item.supplier}</td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="font-mono font-bold tabular-nums text-stone-900">
                        {item.quantity} {item.unit}
                      </div>
                      <div className="w-20 ml-auto h-1.5 bg-stone-100 rounded-full overflow-hidden mt-1">
                        <div
                          style={{ width: `${stockPct}%` }}
                          className={`h-full rounded-full ${
                            level === 'critical'
                              ? 'bg-red-600'
                              : level === 'warning'
                                ? 'bg-amber-600'
                                : 'bg-emerald-600'
                          }`}
                        />
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-stone-500">
                      {item.minThreshold} {item.unit}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-stone-700">
                      {formatVND(item.costPerUnit)}/{item.unit}
                    </td>
                    <td className="py-3.5 px-4">
                      {level === 'critical' ? (
                        <span className="text-red-700 font-semibold inline-flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>Cạn kho khẩn cấp</span>
                        </span>
                      ) : level === 'warning' ? (
                        <span className="text-amber-700 font-semibold inline-flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>Cần nhập bổ sung</span>
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-medium inline-flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>An toàn định mức</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={!canAdjustInventory}
                          onClick={() => onRestockItem(item.id, 5)}
                          aria-label={`Nhập nhanh +5 ${item.unit} cho ${item.name}`}
                          className="min-h-[36px] px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 font-mono text-xs font-semibold rounded-lg transition-colors disabled:opacity-40 whitespace-nowrap"
                        >
                          +5 {item.unit}
                        </button>
                        <button
                          type="button"
                          disabled={!canAdjustInventory}
                          onClick={() => openEditModal(item)}
                          aria-label={`Điều chỉnh kho ${item.name}`}
                          className="min-h-[36px] px-3 py-1 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-40 whitespace-nowrap"
                        >
                          Nhập kho
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Push Notification Real-time Feed */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
            <BellRing className="w-4 h-4 text-amber-700 shrink-0" />
            <span>Nhật ký Biến động Kho & Cảnh báo Tồn kho</span>
          </h3>
          <span className="text-xs text-stone-500 flex items-center gap-1">
            <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
            <span>Đồng bộ Cloud thời gian thực</span>
          </span>
        </div>
        <div className="divide-y divide-stone-100 text-xs">
          {pushNotifications.map((notif) => (
            <div
              key={notif.id}
              className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4"
            >
              <span className="text-stone-800 leading-relaxed">{notif.message}</span>
              <span className="font-mono text-[11px] text-stone-500 shrink-0">{notif.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Modal for Custom Restock & Threshold */}
      {editingItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="restock-modal-title"
        >
          <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-md p-5 sm:p-6 space-y-4 shadow-xl">
            <h3 id="restock-modal-title" className="text-base font-bold text-stone-900">
              Phiếu Nhập Kho · {editingItem.name}
            </h3>
            <p className="text-xs text-stone-500">
              Tồn hiện tại: {editingItem.quantity} {editingItem.unit} · Nhà cung cấp:{' '}
              {editingItem.supplier}
            </p>

            <div className="space-y-3">
              <div>
                <label
                  htmlFor="restock-qty-input"
                  className="block text-xs font-medium text-stone-700 mb-1"
                >
                  Số lượng nhập thêm ({editingItem.unit})
                </label>
                <input
                  id="restock-qty-input"
                  type="number"
                  min={1}
                  value={addQtyInput}
                  onChange={(e) => setAddQtyInput(Number(e.target.value) || 0)}
                  className="w-full min-h-[42px] px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg font-mono text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="restock-threshold-input"
                  className="block text-xs font-medium text-stone-700 mb-1"
                >
                  Ngưỡng cảnh báo tối thiểu ({editingItem.unit})
                </label>
                <input
                  id="restock-threshold-input"
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={thresholdInput}
                  onChange={(e) => setThresholdInput(Number(e.target.value) || 0)}
                  className="w-full min-h-[42px] px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg font-mono text-sm"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="min-h-[42px] px-4 py-2 text-xs font-medium text-stone-700 bg-stone-100 rounded-lg"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  onRestockItem(editingItem.id, addQtyInput, thresholdInput);
                  setEditingItem(null);
                }}
                className="min-h-[42px] px-4 py-2 text-xs font-semibold text-white bg-stone-900 rounded-lg hover:bg-stone-800"
              >
                Xác nhận nhập kho
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
