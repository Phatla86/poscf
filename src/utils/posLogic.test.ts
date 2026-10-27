import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateModifierUnitPrice,
  calculateOrderTotals,
  classifyStockLevel,
  deductInventoryForOrder,
  findProductByBarcode,
  hasRolePermission,
  buildVietQrPayload,
  computeSimpleAi7DayForecast,
  type Product,
  type InventoryItem,
  type CartItem,
} from './posLogic';

const sampleProduct: Product = {
  id: 'prd_cf_01',
  name: 'Cà Phê Sữa Đá Phin Đồng',
  category: 'coffee',
  price: 39000,
  cost: 12000,
  barcode: '8938501001',
  sku: 'CF-PHIN-01',
  available: true,
  subtitle: 'Robusta Honey & Arabica Cầu Đất',
  recipe: [
    { ingredientId: 'inv_beans_01', amountPerCup: 0.025 },
    { ingredientId: 'inv_milk_01', amountPerCup: 0.04 },
  ],
};

test('calculateModifierUnitPrice adds size and topping surcharges accurately', () => {
  const unitPrice = calculateModifierUnitPrice(39000, {
    size: 'L',
    sugarLevel: '70%',
    iceLevel: 'Bình thường',
    toppings: ['Kem phô mai muối biển', 'Trân châu trắng giòn'],
  });
  // 39000 + 12000 (L) + 12000 + 10000 = 73000
  assert.equal(unitPrice, 73000);
});

test('calculateOrderTotals computes loyalty discount, manual discount, and 8% VAT', () => {
  const cart: CartItem[] = [
    {
      cartItemId: 'ci_1',
      product: sampleProduct,
      quantity: 2,
      unitPrice: 50000,
      modifier: { size: 'M', sugarLevel: '100%', iceLevel: 'Bình thường', toppings: [] },
    },
  ];
  const breakdown = calculateOrderTotals(cart, 'Gold', 10, 0.08);
  // Subtotal = 100,000. Gold tier (10%) = 10,000. Remaining = 90,000. Manual 10% = 9,000.
  // Taxable = 81,000. VAT 8% = 6,480. Total = 87,480.
  assert.equal(breakdown.subtotal, 100000);
  assert.equal(breakdown.loyaltyDiscount, 10000);
  assert.equal(breakdown.manualDiscount, 9000);
  assert.equal(breakdown.tax, 6480);
  assert.equal(breakdown.total, 87480);
  assert.equal(breakdown.itemCount, 2);
});

test('findProductByBarcode matches both barcode and SKU case-insensitively', () => {
  assert.equal(findProductByBarcode([sampleProduct], '8938501001')?.id, 'prd_cf_01');
  assert.equal(findProductByBarcode([sampleProduct], 'cf-phin-01')?.id, 'prd_cf_01');
  assert.equal(findProductByBarcode([sampleProduct], '9999999999'), undefined);
});

test('deductInventoryForOrder deducts recipe quantities and detects low-stock alerts', () => {
  const inventory: InventoryItem[] = [
    {
      id: 'inv_beans_01',
      name: 'Hạt Cà Phê Arabica Cầu Đất',
      sku: 'ING-ARA-01',
      unit: 'kg',
      quantity: 2.05,
      minThreshold: 2.0,
      costPerUnit: 280000,
      supplier: 'Dalat Farm',
      updatedAt: '2026-10-26T00:00:00.000Z',
    },
  ];
  const cart: CartItem[] = [
    {
      cartItemId: 'ci_1',
      product: sampleProduct,
      quantity: 4,
      unitPrice: 39000,
      modifier: { size: 'S', sugarLevel: '70%', iceLevel: 'Bình thường', toppings: [] },
    },
  ];
  // 4 cups * 0.025kg = 0.1kg deducted -> 1.95kg left (<= 2.0 minThreshold -> warning)
  const { updatedInventory, lowStockTriggered } = deductInventoryForOrder(inventory, cart);
  assert.equal(updatedInventory[0].quantity, 1.95);
  assert.equal(lowStockTriggered.length, 1);
  assert.equal(classifyStockLevel(updatedInventory[0]), 'warning');
});

test('hasRolePermission enforces granular RBAC boundaries', () => {
  assert.equal(hasRolePermission('manager', 'reports_monthly_pnl'), true);
  assert.equal(hasRolePermission('cashier', 'pos_checkout'), true);
  assert.equal(hasRolePermission('cashier', 'reports_monthly_pnl'), false);
  assert.equal(hasRolePermission('barista', 'pos_checkout'), false);
  assert.equal(hasRolePermission('inventory', 'inventory_adjust'), true);
});

test('buildVietQrPayload formats EMVCo QR string, memo, and custom bank API URL', () => {
  const qr = buildVietQrPayload('ORD-1024', 85000, 'vietqr');
  assert.equal(qr.transferMemo, 'KAFFEOS ORD-1024');
  assert.ok(qr.qrPayloadString.includes('85000'));
  assert.ok(qr.qrImageUrl.includes('VCB-1903888999001-compact2.png'));

  const customQr = buildVietQrPayload('ORD-2050', 125000, 'vietqr', {
    storeName: 'TIỆM CÀ PHÊ SÀI GÒN',
    storeAddress: '12 Lê Lợi, Q.1',
    storePhone: '0909123456',
    storeTaxCode: '0312345678',
    bankId: 'MB',
    accountNo: '888899996666',
    accountName: 'NGUYEN VAN PHAT',
    transferPrefix: 'SGCAFE',
    qrTemplate: 'compact',
    qrApiUrlTemplate:
      'https://img.vietqr.io/image/{BANK_ID}-{ACCOUNT_NO}-{TEMPLATE}.png?amount={AMOUNT}&addInfo={MEMO}&accountName={ACCOUNT_NAME}',
  });
  assert.equal(customQr.transferMemo, 'SGCAFE ORD-2050');
  assert.equal(customQr.bankBin, 'MB');
  assert.equal(customQr.accountNo, '888899996666');
  assert.ok(
    customQr.qrImageUrl.includes(
      'https://img.vietqr.io/image/MB-888899996666-compact.png?amount=125000'
    )
  );
});

test('computeSimpleAi7DayForecast projects 7 future days with confidence bounds and seasonality', () => {
  const hist = [
    { dateISO: '2026-10-20T00:00:00.000Z', dateLabel: 'T3 (20/10)', dayOfWeek: 2, actualRevenue: 20000000, ordersCount: 240 },
    { dateISO: '2026-10-21T00:00:00.000Z', dateLabel: 'T4 (21/10)', dayOfWeek: 3, actualRevenue: 21000000, ordersCount: 250 },
    { dateISO: '2026-10-22T00:00:00.000Z', dateLabel: 'T5 (22/10)', dayOfWeek: 4, actualRevenue: 22000000, ordersCount: 260 },
    { dateISO: '2026-10-23T00:00:00.000Z', dateLabel: 'T6 (23/10)', dayOfWeek: 5, actualRevenue: 25000000, ordersCount: 290 },
    { dateISO: '2026-10-24T00:00:00.000Z', dateLabel: 'T7 (24/10)', dayOfWeek: 6, actualRevenue: 27000000, ordersCount: 310 },
    { dateISO: '2026-10-25T00:00:00.000Z', dateLabel: 'CN (25/10)', dayOfWeek: 0, actualRevenue: 26000000, ordersCount: 300 },
    { dateISO: '2026-10-26T00:00:00.000Z', dateLabel: 'Hôm nay (26/10)', dayOfWeek: 1, actualRevenue: 24000000, ordersCount: 285 },
  ];
  const baseResult = computeSimpleAi7DayForecast(hist, 0, 0.6);
  assert.equal(baseResult.next7DaysOnly.length, 7);
  assert.equal(baseResult.chartSeries.length, 14);
  // Last historical day bridges actualRevenue and predictedRevenue
  assert.equal(
    baseResult.chartSeries[6].actualRevenue,
    baseResult.chartSeries[6].predictedRevenue
  );
  // Every forecasted day has lowerBound < predictedRevenue < upperBound
  for (const day of baseResult.next7DaysOnly) {
    assert.ok(day.predictedRevenue !== null && day.predictedRevenue > 0);
    assert.ok(day.lowerBound !== null && day.lowerBound < day.predictedRevenue!);
    assert.ok(day.upperBound !== null && day.upperBound > day.predictedRevenue!);
  }
  // Positive scenario boost increases total forecasted revenue
  const boosted = computeSimpleAi7DayForecast(hist, 15, 0.6);
  assert.ok(boosted.totalNext7DaysRevenue > baseResult.totalNext7DaysRevenue);
});

