'use client';

import type { Product, Variant } from '@/lib/types/ui';

interface VariantSelectorProps {
  product: Product;
  selected?: Variant;
  onChange: (variant: Variant) => void;
}

export function VariantSelector({ product, selected, onChange }: VariantSelectorProps) {
  if (!product.variants || product.variants.length === 0) return null;

  const labels = Array.from(
    new Set(product.variants.flatMap((variant) => variant.attributes.map((attribute) => attribute.label)))
  );

  return (
    <div className="my-4 p-5 border border-[var(--line)] rounded-xl bg-[var(--bg)]">
      <span className="block text-[10px] tracking-widest uppercase text-[var(--gold)] mb-4">
        Choisir votre édition
      </span>
      {labels.map((label) => (
        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-5 mt-4 text-sm" key={label}>
          <strong className="min-w-[70px] font-medium text-[var(--ink)]">{label}</strong>
          <div className="flex flex-wrap gap-2">
            {product.variants
              ?.filter((variant) => variant.attributes.some((attribute) => attribute.label === label))
              .map((variant) => {
                const attribute = variant.attributes.find((item) => item.label === label);
                const isSelected = selected?.id === variant.id;
                return (
                  <button
                    key={variant.id}
                    className={`px-4 py-2 border rounded-lg transition-all text-sm ${
                      isSelected 
                        ? 'border-[var(--gold)] bg-[var(--paper)] text-[var(--ink)] font-medium shadow-sm' 
                        : 'border-[var(--line)] bg-white text-[var(--muted)] hover:border-[var(--gold)]'
                    }`}
                    onClick={() => onChange(variant)}
                    aria-pressed={isSelected}
                  >
                    {attribute?.value}
                  </button>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}
