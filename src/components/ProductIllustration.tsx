import React from 'react';
import type { ProductCategory } from '../utils/posLogic';

interface ProductIllustrationProps {
  productId: string;
  category: ProductCategory;
  className?: string;
}

export const ProductIllustration: React.FC<ProductIllustrationProps> = ({
  productId,
  category,
  className = 'w-full h-32',
}) => {
  const paletteByProduct: Record<
    string,
    { bg: string; liquidTop: string; liquidBottom: string; accent: string; rim: string }
  > = {
    prd_cf_01: {
      bg: 'from-[#EFECE6] to-[#E5DEC9]',
      liquidTop: '#4A2C18',
      liquidBottom: '#E8D8C3',
      accent: '#B45309',
      rim: '#78350F',
    },
    prd_cf_02: {
      bg: 'from-[#F3EFEA] to-[#E6DFD5]',
      liquidTop: '#F5EFE6',
      liquidBottom: '#6F4E37',
      accent: '#D97706',
      rim: '#573B26',
    },
    prd_cf_03: {
      bg: 'from-[#F7F2E7] to-[#EFE2C6]',
      liquidTop: '#9A3412',
      liquidBottom: '#D97706',
      accent: '#F59E0B',
      rim: '#7C2D12',
    },
    prd_cf_04: {
      bg: 'from-[#F2EFE9] to-[#E4DDD0]',
      liquidTop: '#D6C7B2',
      liquidBottom: '#785A46',
      accent: '#A16207',
      rim: '#574132',
    },
    prd_tea_01: {
      bg: 'from-[#ECF3E8] to-[#D9E8D1]',
      liquidTop: '#FAF8F5',
      liquidBottom: '#3F6212',
      accent: '#65A30D',
      rim: '#365314',
    },
    prd_tea_02: {
      bg: 'from-[#F9EFEA] to-[#F1DDD2]',
      liquidTop: '#EA580C',
      liquidBottom: '#FDBA74',
      accent: '#FB923C',
      rim: '#9A3412',
    },
    prd_frz_01: {
      bg: 'from-[#F4EFEA] to-[#E5D7C8]',
      liquidTop: '#FFFBEB',
      liquidBottom: '#78350F',
      accent: '#D97706',
      rim: '#451A03',
    },
    prd_bkr_01: {
      bg: 'from-[#FBF4E6] to-[#F2E2C4]',
      liquidTop: '#D97706',
      liquidBottom: '#92400E',
      accent: '#F59E0B',
      rim: '#78350F',
    },
    prd_bkr_02: {
      bg: 'from-[#F3ECE7] to-[#E3D5CA]',
      liquidTop: '#573B26',
      liquidBottom: '#E7DACB',
      accent: '#78350F',
      rim: '#451A03',
    },
    prd_bns_01: {
      bg: 'from-[#EDEAE4] to-[#DDD6C9]',
      liquidTop: '#292524',
      liquidBottom: '#57534E',
      accent: '#B45309',
      rim: '#1C1917',
    },
  };

  const scheme = paletteByProduct[productId] || {
    bg: 'from-[#F3F1EC] to-[#E6E2D8]',
    liquidTop: '#6F4E37',
    liquidBottom: '#D6C7B2',
    accent: '#B45309',
    rim: '#44403C',
  };

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br ${scheme.bg} flex items-center justify-center select-none ${className}`}
      aria-hidden="true"
    >
      {/* Subtle architectural grid lines */}
      <svg className="w-24 h-24 drop-shadow-sm" viewBox="0 0 120 120" fill="none">
        <circle cx="60" cy="60" r="46" fill="#FFFFFF" fillOpacity="0.55" />
        {category === 'bakery' ? (
          <>
            {/* Ceramic plate + Artisan Croissant / Pastry */}
            <ellipse cx="60" cy="84" rx="38" ry="9" fill="#FFFFFF" stroke="#D6D3CD" strokeWidth="1.5" />
            <path
              d="M30 72C26 56 42 42 60 42C78 42 94 56 90 72C86 78 76 74 60 74C44 74 34 78 30 72Z"
              fill={scheme.liquidTop}
              stroke={scheme.rim}
              strokeWidth="2"
            />
            <path
              d="M42 48C50 56 70 56 78 48M36 60C48 66 72 66 84 60"
              stroke="#FEF3C7"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </>
        ) : category === 'beans' ? (
          <>
            {/* Specialty Roastery Bag */}
            <rect
              x="36"
              y="26"
              width="48"
              height="68"
              rx="6"
              fill={scheme.liquidTop}
              stroke={scheme.rim}
              strokeWidth="2"
            />
            <rect x="42" y="42" width="36" height="28" rx="3" fill="#F8F7F4" />
            <circle cx="60" cy="34" r="3" fill={scheme.accent} />
            <ellipse cx="60" cy="56" rx="7" ry="5" fill={scheme.accent} />
            <path d="M54 56C58 53 62 59 66 56" stroke="#FFF" strokeWidth="1.5" />
          </>
        ) : (
          <>
            {/* Faceted Specialty Glass */}
            <path
              d="M38 32H82L76 92C75.5 95.5 72.5 98 69 98H51C47.5 98 44.5 95.5 44 92L38 32Z"
              fill="#FFFFFF"
              fillOpacity="0.85"
              stroke={scheme.rim}
              strokeWidth="2"
            />
            {/* Upper Layer */}
            <path
              d="M40 42H80L78 66H42L40 42Z"
              fill={scheme.liquidTop}
              fillOpacity="0.9"
            />
            {/* Lower Layer */}
            <path
              d="M42 66H78L75.5 91C75.2 93.8 72.8 96 70 96H50C47.2 96 44.8 93.8 44.5 91L42 66Z"
              fill={scheme.liquidBottom}
              fillOpacity="0.92"
            />
            {/* Ice Cubes */}
            <rect
              x="47"
              y="47"
              width="10"
              height="10"
              rx="2"
              transform="rotate(-8 47 47)"
              fill="#FFFFFF"
              fillOpacity="0.65"
            />
            <rect
              x="61"
              y="50"
              width="10"
              height="10"
              rx="2"
              transform="rotate(11 61 50)"
              fill="#FFFFFF"
              fillOpacity="0.65"
            />
            {/* Straw / Garnish */}
            <path d="M66 18L58 84" stroke={scheme.accent} strokeWidth="3" strokeLinecap="round" />
            {productId === 'prd_cf_03' && (
              <circle cx="75" cy="32" r="9" fill="#F59E0B" stroke="#FFF" strokeWidth="2" />
            )}
          </>
        )}
      </svg>
    </div>
  );
};

export const VietQrMatrixSvg: React.FC<{ seed: string; className?: string }> = ({
  seed,
  className = 'w-44 h-44',
}) => {
  // Deterministic 21x21 QR-like matrix from seed string
  const size = 21;
  const cells: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const drawFinder = (r0: number, c0: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        cells[r0 + r][c0 + c] = isBorder || isInner;
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const inFinder =
        (r < 8 && c < 8) || (r < 8 && c >= size - 8) || (r >= size - 8 && c < 8);
      if (inFinder) continue;
      const bit = ((r * 31 + c * 17 + Math.abs(hash)) % 7) < 3;
      cells[r][c] = bit;
    }
  }

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className={`bg-white p-2 border border-stone-200 rounded-lg ${className}`}
      role="img"
      aria-label="Mã QR Thanh Toán Điện Tử"
    >
      {cells.map((row, rIdx) =>
        row.map((filled, cIdx) =>
          filled ? (
            <rect key={`${rIdx}-${cIdx}`} x={cIdx} y={rIdx} width={1} height={1} fill="#1C1917" />
          ) : null
        )
      )}
    </svg>
  );
};
