import React, { useState } from 'react';
import {
  Download,
  TrendingUp,
  Calendar,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  formatVND,
  type PosOrder,
} from '../utils/posLogic';
import {
  HISTORICAL_7_DAYS_SALES,
  type HourlySaleMetric,
  type MonthlyFinancialMetric,
} from '../data/seedData';

interface AnalyticsReportViewProps {
  orders: PosOrder[];
  hourlyMetrics: HourlySaleMetric[];
  monthlyFinancials: MonthlyFinancialMetric[];
  canViewMonthlyPnl: boolean;
}

export const AnalyticsReportView: React.FC<AnalyticsReportViewProps> = ({
  orders,
  hourlyMetrics,
  monthlyFinancials,
}) => {
  const [reportTab, setReportTab] = useState<'daily' | 'monthly'>('daily');

  const liveOrdersRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const baseDailyRevenue = hourlyMetrics.reduce((sum, h) => sum + h.revenue, 0);
  const totalTodayRevenue = baseDailyRevenue + liveOrdersRevenue;
  const totalTodayOrders =
    hourlyMetrics.reduce((sum, h) => sum + h.orders, 0) + orders.length;
  const avgOrderValue = Math.round(totalTodayRevenue / Math.max(1, totalTodayOrders));

  // Format short, non-overlapping labels for 7-day chart
  const recent7DaysData = HISTORICAL_7_DAYS_SALES.map((day, idx) => {
    const isLast = idx === HISTORICAL_7_DAYS_SALES.length - 1;
    const shortDate = isLast
      ? '26/10 (Nay)'
      : day.dateLabel.replace(' (', ' · ').replace(')', '');
    return {
      ...day,
      shortLabel: shortDate,
      actualRevenue: isLast ? totalTodayRevenue : day.actualRevenue,
      ordersCount: isLast ? totalTodayOrders : day.ordersCount,
    };
  });

  // Format short, non-overlapping hour labels ('07h', '08h', ...)
  const hourlyChartData = hourlyMetrics.map((item) => ({
    ...item,
    shortHour: item.hour.replace(':00', 'h'),
  }));

  // Format monthly chart data with total expenses combined for clean visual comparison
  const monthlyChartData = monthlyFinancials.map((m) => ({
    ...m,
    shortMonth: m.month.replace('/2026', '/26'),
    totalCost: m.cogs + m.operatingExpense,
  }));

  const total7DaysRevenue = recent7DaysData.reduce((s, d) => s + d.actualRevenue, 0);
  const avg7DaysRevenue = Math.round(total7DaysRevenue / recent7DaysData.length);

  const handleDownloadCsv = () => {
    const rows = [
      ['Ngay', 'Doanh Thu Thuc Te (VND)', 'So Luong Don'],
      ...recent7DaysData.map((pt) => [
        pt.dateLabel,
        String(pt.actualRevenue),
        String(pt.ordersCount),
      ]),
    ];
    const csvContent = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `KaffeOS_BaoCaoDoanhThu_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Header & View Mode Switch */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-stone-900">
            Báo Cáo Doanh Thu & Lợi Nhuận (P&L)
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Thống kê doanh thu thực tế theo giờ, 7 ngày gần nhất và báo cáo tài chính hàng tháng
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="grid grid-cols-2 sm:flex items-center gap-1 p-1 bg-stone-100 rounded-xl">
            <button
              type="button"
              onClick={() => setReportTab('daily')}
              className={`min-w-0 overflow-hidden min-h-[38px] px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                reportTab === 'daily'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 shrink-0 hidden sm:inline" />
              <span className="truncate">Theo ngày</span>
            </button>
            <button
              type="button"
              onClick={() => setReportTab('monthly')}
              className={`min-w-0 overflow-hidden min-h-[38px] px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                reportTab === 'monthly'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 shrink-0 hidden sm:inline" />
              <span className="truncate">Theo tháng (P&L)</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleDownloadCsv}
            className="min-h-[38px] px-3.5 py-1.5 bg-white border border-stone-300 hover:bg-stone-50 text-stone-800 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>Xuất CSV</span>
          </button>
        </div>
      </div>

      {/* Top KPI Cards — 2x2 on Mobile, 4 cols on Desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="min-w-0 bg-white border border-stone-200 rounded-2xl p-3.5 sm:p-5 space-y-1">
          <div className="text-[11px] sm:text-xs font-medium text-stone-500 truncate">
            Doanh thu hôm nay
          </div>
          <div className="text-sm sm:text-xl xl:text-2xl font-bold font-mono tabular-nums text-stone-900 truncate">
            {formatVND(totalTodayRevenue)}
          </div>
          <div className="text-[11px] text-emerald-700 font-medium truncate">
            Trực tiếp từ POS
          </div>
        </div>

        <div className="min-w-0 bg-white border border-stone-200 rounded-2xl p-3.5 sm:p-5 space-y-1">
          <div className="text-[11px] sm:text-xs font-medium text-stone-500 truncate">
            Tổng số đơn hôm nay
          </div>
          <div className="text-sm sm:text-xl xl:text-2xl font-bold font-mono tabular-nums text-stone-900 truncate">
            {totalTodayOrders} đơn
          </div>
          <div className="text-[11px] text-stone-500 truncate">
            TB {formatVND(avgOrderValue)} / đơn
          </div>
        </div>

        <div className="min-w-0 bg-white border border-stone-200 rounded-2xl p-3.5 sm:p-5 space-y-1">
          <div className="text-[11px] sm:text-xs font-medium text-amber-800 truncate">
            Doanh thu 7 ngày qua
          </div>
          <div className="text-sm sm:text-xl xl:text-2xl font-bold font-mono tabular-nums text-amber-800 truncate">
            {formatVND(total7DaysRevenue)}
          </div>
          <div className="text-[11px] text-stone-500 truncate">
            TB {formatVND(avg7DaysRevenue)} / ngày
          </div>
        </div>

        <div className="min-w-0 bg-white border border-stone-200 rounded-2xl p-3.5 sm:p-5 space-y-1">
          <div className="text-[11px] sm:text-xs font-medium text-stone-500 truncate">
            Tỷ trọng QR & Ví ĐT
          </div>
          <div className="text-sm sm:text-xl xl:text-2xl font-bold font-mono tabular-nums text-emerald-700 truncate">
            78.0%
          </div>
          <div className="text-[11px] text-stone-500 truncate">
            VietQR, MoMo, ZaloPay
          </div>
        </div>
      </div>

      {reportTab === 'daily' ? (
        <div className="space-y-5">
          {/* Recharts 7-Day Historical Revenue Chart */}
          <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-stone-900">
                  Biểu Đồ Doanh Thu 7 Ngày Gần Nhất (20/10 – 26/10)
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Biến động doanh thu thực tế qua các ngày trong tuần
                </p>
              </div>
              <span className="text-xs font-mono font-semibold text-amber-800">
                Đơn vị: Triệu VNĐ (M)
              </span>
            </div>

            <div className="w-full h-60 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={recent7DaysData}
                  margin={{ top: 12, right: 20, left: 4, bottom: 4 }}
                >
                  <defs>
                    <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#B45309" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#B45309" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" vertical={false} />
                  <XAxis
                    dataKey="shortLabel"
                    padding={{ left: 16, right: 16 }}
                    minTickGap={14}
                    tickMargin={8}
                    tick={{ fontSize: 11, fill: '#57534E' }}
                    axisLine={{ stroke: '#D6D3D1' }}
                    tickLine={false}
                  />
                  <YAxis
                    width={42}
                    tickFormatter={(val: number) => `${(val / 1000000).toFixed(0)}M`}
                    tick={{ fontSize: 11, fill: '#57534E' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatVND(value), 'Doanh thu']}
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #E7E5E4',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="actualRevenue"
                    name="Doanh thu thực tế"
                    stroke="#B45309"
                    strokeWidth={2.5}
                    fill="url(#revFill)"
                    isAnimationActive={false}
                    dot={{ r: 4, fill: '#B45309', strokeWidth: 2, stroke: '#FFFFFF' }}
                    activeDot={{ r: 6 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Recharts Hourly Revenue Bar Chart (replaces cramped 10-col CSS bars) */}
            <div className="lg:col-span-7 bg-white border border-stone-200 rounded-2xl p-4 sm:p-6 space-y-4">
              <div>
                <h2 className="text-base font-bold text-stone-900">
                  Doanh Thu Theo Khung Giờ Trong Ngày (07h – 16h)
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Biểu đồ cột thể hiện khung giờ đông khách nhất tại quán
                </p>
              </div>

              <div className="w-full h-64 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={hourlyChartData}
                    margin={{ top: 12, right: 12, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" vertical={false} />
                    <XAxis
                      dataKey="shortHour"
                      minTickGap={8}
                      tickMargin={8}
                      tick={{ fontSize: 11, fill: '#57534E' }}
                      axisLine={{ stroke: '#D6D3D1' }}
                      tickLine={false}
                    />
                    <YAxis
                      width={42}
                      tickFormatter={(val: number) => `${(val / 1000000).toFixed(1)}M`}
                      tick={{ fontSize: 11, fill: '#57534E' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value: number) => [formatVND(value), 'Doanh thu giờ']}
                      contentStyle={{
                        borderRadius: '12px',
                        border: '1px solid #E7E5E4',
                        fontSize: '12px',
                      }}
                    />
                    <Bar
                      dataKey="revenue"
                      name="Doanh thu theo giờ"
                      fill="#1C1917"
                      isAnimationActive={false}
                      radius={[6, 6, 0, 0]}
                      maxBarSize={36}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Omnichannel & Payment Method Share */}
            <div className="lg:col-span-5 bg-white border border-stone-200 rounded-2xl p-4 sm:p-6 space-y-5">
              <div>
                <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Tỷ Trọng Doanh Thu Theo Kênh</span>
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Phân bổ doanh thu theo nguồn đơn hàng hôm nay
                </p>
              </div>

              <div className="space-y-3 text-xs">
                {[
                  { label: 'Tại bàn (Dine-in)', pct: 44, amount: totalTodayRevenue * 0.44 },
                  { label: 'Mang đi (Takeaway)', pct: 22, amount: totalTodayRevenue * 0.22 },
                  { label: 'GrabFood', pct: 18, amount: totalTodayRevenue * 0.18 },
                  { label: 'ShopeeFood', pct: 11, amount: totalTodayRevenue * 0.11 },
                  { label: 'Web Order', pct: 5, amount: totalTodayRevenue * 0.05 },
                ].map((ch) => (
                  <div key={ch.label} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 font-medium text-stone-800">
                      <span className="truncate">{ch.label}</span>
                      <span className="font-mono tabular-nums whitespace-nowrap shrink-0">
                        {ch.pct}% · {formatVND(ch.amount)}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${ch.pct}%` }}
                        className="h-full bg-stone-900 rounded-full"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-stone-200 space-y-2.5 text-xs">
                <div className="font-bold text-stone-900">Cơ cấu phương thức thanh toán</div>
                <div className="grid grid-cols-2 gap-2.5 font-mono text-[11px]">
                  <div className="min-w-0 p-3 bg-[#F8F7F4] rounded-xl border border-stone-200">
                    <div className="text-stone-500 truncate">VietQR Napas247</div>
                    <div className="font-bold text-stone-900 text-sm mt-0.5">48.5%</div>
                  </div>
                  <div className="min-w-0 p-3 bg-[#F8F7F4] rounded-xl border border-stone-200">
                    <div className="text-stone-500 truncate">MoMo / ZaloPay</div>
                    <div className="font-bold text-stone-900 text-sm mt-0.5">29.5%</div>
                  </div>
                  <div className="min-w-0 p-3 bg-[#F8F7F4] rounded-xl border border-stone-200">
                    <div className="text-stone-500 truncate">Tiền mặt tại quầy</div>
                    <div className="font-bold text-stone-900 text-sm mt-0.5">14.0%</div>
                  </div>
                  <div className="min-w-0 p-3 bg-[#F8F7F4] rounded-xl border border-stone-200">
                    <div className="text-stone-500 truncate">Thẻ ngân hàng</div>
                    <div className="font-bold text-stone-900 text-sm mt-0.5">8.0%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Recharts Monthly Financial Bar Chart (replaces cramped CSS columns) */}
          <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-stone-900">
                  Biểu Đồ Tài Chính 6 Tháng Gần Nhất (P&L)
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  So sánh trực quan Tổng Doanh Thu, Giá Vốn & Chi Phí và Lợi Nhuận Ròng
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-medium text-stone-700">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-stone-900 inline-block" />
                  <span>Tổng doanh thu</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-amber-600 inline-block" />
                  <span>Giá vốn & Chi phí</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-700 inline-block" />
                  <span>Lợi nhuận ròng</span>
                </span>
              </div>
            </div>

            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlyChartData}
                  margin={{ top: 12, right: 16, left: 0, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" vertical={false} />
                  <XAxis
                    dataKey="shortMonth"
                    tickMargin={8}
                    tick={{ fontSize: 11, fill: '#57534E' }}
                    axisLine={{ stroke: '#D6D3D1' }}
                    tickLine={false}
                  />
                  <YAxis
                    width={46}
                    tickFormatter={(val: number) => `${(val / 1000000).toFixed(0)}M`}
                    tick={{ fontSize: 11, fill: '#57534E' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatVND(value), '']}
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #E7E5E4',
                      fontSize: '12px',
                    }}
                  />
                  <Bar
                    dataKey="revenue"
                    name="Tổng doanh thu"
                    fill="#1C1917"
                    isAnimationActive={false}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />
                  <Bar
                    dataKey="totalCost"
                    name="Giá vốn & Chi phí"
                    fill="#D97706"
                    isAnimationActive={false}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />
                  <Bar
                    dataKey="netProfit"
                    name="Lợi nhuận ròng"
                    fill="#047857"
                    isAnimationActive={false}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Financial Ledger Table */}
          <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50 text-[11px] font-semibold text-stone-600">
                    <th className="py-3.5 px-4">Kỳ kế toán</th>
                    <th className="py-3.5 px-4 text-right">Tổng doanh thu</th>
                    <th className="py-3.5 px-4 text-right">Giá vốn nguyên liệu</th>
                    <th className="py-3.5 px-4 text-right">Chi phí vận hành</th>
                    <th className="py-3.5 px-4 text-right">Lợi nhuận ròng</th>
                    <th className="py-3.5 px-4 text-right">Biên lợi nhuận</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-xs font-mono">
                  {monthlyFinancials.map((m) => {
                    const margin = ((m.netProfit / m.revenue) * 100).toFixed(1);
                    return (
                      <tr key={m.month} className="hover:bg-stone-50/80">
                        <td className="py-3.5 px-4 font-bold text-stone-900">{m.month}</td>
                        <td className="py-3.5 px-4 text-right tabular-nums text-stone-900">
                          {formatVND(m.revenue)}
                        </td>
                        <td className="py-3.5 px-4 text-right tabular-nums text-stone-600">
                          {formatVND(m.cogs)}
                        </td>
                        <td className="py-3.5 px-4 text-right tabular-nums text-stone-600">
                          {formatVND(m.operatingExpense)}
                        </td>
                        <td className="py-3.5 px-4 text-right tabular-nums font-bold text-emerald-700">
                          {formatVND(m.netProfit)}
                        </td>
                        <td className="py-3.5 px-4 text-right tabular-nums text-amber-800 font-semibold">
                          {margin}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
