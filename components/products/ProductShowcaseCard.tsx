import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import type { ProductVariant } from '@/lib/products/catalog'

// Light-theme product card for the cream product-showcase pages (Products
// page and similar catalog contexts). Distinct from components/cards/
// ProductCard.tsx, which is a dark-theme wholesale/portal card that links to
// a per-product detail route. This card never links to a detail page — it
// shows the real package art plus the consumer CTA only.

interface ProductShowcaseCardProps {
  variant: ProductVariant
  /**
   * 'large' = flagship (Chocolate Bites), 'medium' = the other multi-product
   * families (Gummies, Fruit Crunchers), 'default' = single-SKU families
   * (The Hammer) which are deliberately left at their original size rather
   * than enlarged to fill their column, 'compact' = Chocolate Bites Singles,
   * slightly smaller than 'default' so tall poster-style package art reads
   * a bit less large without shrinking the category itself.
   */
  size?: 'compact' | 'default' | 'medium' | 'large'
  /**
   * True when this card shares a row with siblings (the family has more
   * than one product) — lets the CTA align to a shared bottom baseline via
   * the grid row's stretched height. A card that's always alone in its own
   * row (The Hammer) has no sibling to stretch against, so it keeps a fixed
   * gap instead — mt-auto would just collapse to 0 there.
   */
  alignToRow?: boolean
}

const maxWidthClass: Record<NonNullable<ProductShowcaseCardProps['size']>, string> = {
  compact: 'max-w-[170px]',
  default: 'max-w-[240px]',
  medium: 'max-w-[280px]',
  large: 'max-w-[360px]',
}

const imageSizes: Record<NonNullable<ProductShowcaseCardProps['size']>, string> = {
  compact: '(max-width: 768px) 36vw, 170px',
  default: '(max-width: 768px) 50vw, 240px',
  medium: '(max-width: 768px) 50vw, 280px',
  large: '(max-width: 768px) 65vw, 360px',
}

export function ProductShowcaseCard({ variant, size = 'default', alignToRow = false }: ProductShowcaseCardProps) {
  // netWeight/pieceCount are shown once at the family level (see
  // ProductFamilySection's `facts`), not repeated on every card. enhancement
  // (the formulation name — "Sativa Enhanced", "THC + CBD") gets its own
  // more readable line below, rather than being folded into this smaller
  // supporting-detail line with ratio/perPiece.
  const secondaryFacts = [variant.ratio, variant.perPiece].filter(Boolean)

  return (
    // h-full + the parent row's default grid stretch means every card in a
    // row shares the same height; mt-auto on the CTA then pushes it to a
    // shared bottom baseline regardless of how many lines the name/flavor/
    // facts text above it wraps to.
    <div className="h-full flex flex-col items-center text-center">
      <div className={`w-full flex items-center justify-center ${maxWidthClass[size]}`}>
        {variant.placeholder ? (
          <div
            className="w-full aspect-[583/1000] flex items-center justify-center border border-dashed border-[var(--color-border)] bg-[rgba(0,0,0,0.03)]"
            role="img"
            aria-label={`${variant.name} package image coming soon`}
          >
            <span className="text-label text-[var(--color-muted)] text-center px-3">Image Coming Soon</span>
          </div>
        ) : (
          <Image
            src={variant.imageUrl!}
            alt={variant.imageAlt!}
            width={variant.imageWidth!}
            height={variant.imageHeight!}
            sizes={imageSizes[size]}
            className="w-full h-auto"
          />
        )}
      </div>

      {/* mb-8 is the guaranteed minimum gap to the CTA below, on every card,
          at every breakpoint — not just whatever's left over after mt-auto
          redistributes row-stretch space (which could be near-zero when
          sibling cards have similarly short text). */}
      <div className="flex flex-col items-center mb-8">
        <h3 className="text-h4 text-[var(--color-dark)] mt-5">
          {variant.name}
        </h3>

        {variant.flavor && (
          <p className="text-body-sm text-[var(--color-muted)] mt-1">{variant.flavor}</p>
        )}

        {variant.enhancement && (
          <p className="text-body-sm text-[var(--color-dark)] mt-1" style={{ fontWeight: 600 }}>
            {variant.enhancement}
          </p>
        )}

        {secondaryFacts.length > 0 && (
          <p className="text-label text-[var(--color-muted)] mt-2 max-w-[26ch]">
            {secondaryFacts.join(' · ')}
          </p>
        )}
      </div>

      <Button
        href="/find-gsx"
        variant="primary"
        size="sm"
        className={alignToRow ? 'sm:mt-auto' : ''}
      >
        Find This Product Near You
      </Button>
    </div>
  )
}
