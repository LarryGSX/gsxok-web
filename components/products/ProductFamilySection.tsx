import { ProductShowcaseCard } from './ProductShowcaseCard'
import type { ProductFamily } from '@/lib/products/catalog'

const G = 'w-full max-w-[1280px] mx-auto px-6 md:px-16 xl:px-24'

interface ProductFamilySectionProps {
  family: ProductFamily
  index: number
  /** Flagship gets larger package artwork and a wider product column (not a larger heading, headings stay uniform across families). */
  emphasis?: 'flagship' | 'standard' | 'simple'
  tone?: 'cream' | 'cream-2'
  /** Anchor id for footer/nav deep links (e.g. footer's "/products#gummies"). */
  id?: string
  /**
   * Overrides the emphasis-derived artwork size for this family only, without
   * touching that emphasis's column split or section padding (e.g. Chocolate
   * Bites Singles keeps 'standard' emphasis/spacing but uses slightly smaller
   * 'compact' artwork).
   */
  cardSize?: 'compact' | 'default' | 'medium' | 'large' | 'xlarge'
  /**
   * Nudges the left intro block up (negative px) at xl+ only, for a family
   * whose product row got noticeably shorter (e.g. Chocolate Bites Singles'
   * smaller artwork) so the intro no longer centers against empty space left
   * by the shrunk row. Below xl the intro stacks above the row normally and
   * this has no effect. Applied via a CSS var so omitting it is a no-op.
   */
  introOffset?: number
  /**
   * 'row' (default): the standard intro-left / product-row-right template
   * used by four of the five families. 'solo': a centered, single-product
   * closing treatment used only by The Hammer, so the page's one single-SKU
   * family reads as a deliberate final moment rather than a small card in a
   * row with less room than everyone else.
   */
  layout?: 'row' | 'solo'
}

export function ProductFamilySection({ family, index, emphasis = 'standard', tone = 'cream', id, cardSize, introOffset, layout = 'row' }: ProductFamilySectionProps) {
  // Flagship (Chocolate Bites) gets larger artwork; single-SKU families
  // (The Hammer) stay at the original size rather than being stretched to
  // fill their column. Standard families sit at the row-favoring end of the
  // approved 30-35 / 65-70 split (30/70) so their 3-across row is as wide as
  // spec allows; flagship goes slightly past that (26/74) specifically so
  // its artwork still reads as visibly larger than standard's, which is
  // already at the spec ceiling. The split only activates at xl (1280px+);
  // below that, three fixed-width cards in a ~65-70% column would be too
  // cramped to read as a "horizontal editorial row" rather than "squeezed",
  // so it stacks instead (full-width row, same responsive column count as
  // before this pass).
  const resolvedCardSize = cardSize ?? (emphasis === 'flagship' ? 'large' : emphasis === 'simple' ? 'default' : 'medium')
  const count = family.variants.length
  const introSplit = emphasis === 'flagship' ? 'xl:grid-cols-[22fr_78fr]' : 'xl:grid-cols-[30fr_70fr]'

  const rowCols =
    count >= 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : count === 2 ? 'sm:grid-cols-2' : ''

  // Small numeral eyebrow ("01"-"05") above every family heading — a
  // restrained editorial rhythm device so five sections read as five
  // distinct chapters, not one repeating catalog template. Same treatment
  // in both layouts below.
  const eyebrow = (
    <p className="text-label" style={{ color: 'var(--color-green)', marginBottom: '0.6rem' }}>
      {String(index).padStart(2, '0')}
    </p>
  )

  // Family-level potency + package facts — given noticeably more visual
  // weight (text-h4) than ordinary package metadata (text-label), since
  // potency is an explicit product differentiator, not incidental detail.
  const potencyBlock = (family.potencyValue || family.packageFacts) && (
    <div className="mt-4">
      {family.potencyValue && (
        <>
          <p className="text-label" style={{ color: 'var(--color-muted)' }}>{family.potencyLabel}</p>
          <p className="text-h4 text-[var(--color-dark)] mt-1">{family.potencyValue}</p>
        </>
      )}
      {family.packageFacts && (
        <p className="text-label mt-2" style={{ color: 'var(--color-muted)' }}>{family.packageFacts}</p>
      )}
    </div>
  )

  return (
    <section
      id={id}
      className="relative border-t border-[var(--color-border)] scroll-mt-16 md:scroll-mt-18 bg-[length:100%_96px] md:bg-[length:100%_160px] bg-no-repeat bg-top"
      style={{
        backgroundColor: tone === 'cream' ? 'var(--color-cream)' : 'var(--color-cream-2)',
        // Shallow green-to-cream fade at the very top edge only — strongest
        // in the first 20% of the fade box (roughly 19px mobile / 32px
        // desktop), fully resolved to transparent (pure cream showing
        // through) by 60% of the box (roughly 58px mobile / 96px desktop),
        // well before the family intro/product content renders. Percentage
        // stops so the same gradient scales correctly for the two
        // background-size heights set in className above.
        backgroundImage:
          'linear-gradient(to bottom, rgba(26,122,74,0.32) 0%, rgba(26,122,74,0.12) 20%, rgba(26,122,74,0) 60%, rgba(26,122,74,0) 100%)',
      }}
    >
      {layout === 'solo' ? (
        // Centered, single-product closing treatment — The Hammer only.
        // Full section padding (not the compressed 'simple' padding the
        // rest of this family's config still uses for other purposes),
        // so this reads as a deliberate final moment, not a small
        // afterthought squeezed into less room than its neighbors.
        <div className={G} style={{ paddingTop: '4.5rem', paddingBottom: '5rem' }}>
          <div className="flex flex-col items-center text-center mx-auto" style={{ maxWidth: '480px' }}>
            {eyebrow}
            <h2 className="text-h2 text-[var(--color-dark)]">{family.name}</h2>
            <div style={{ width: '40px', height: '2px', backgroundColor: 'var(--color-green)', margin: '0.9rem auto 0' }} />
            <p className="text-body text-[var(--color-muted)] mt-3">{family.description}</p>
            {potencyBlock}
          </div>
          {/* mx-auto block (not flex justify-center) so this wrapper has a
              real definite width for ProductShowcaseCard's own internal
              w-full/max-w to resolve against — as a flex child instead, it
              had no definite containing width and collapsed to its content
              size, never reaching the intended xlarge cap. */}
          <div className="mt-10 mx-auto" style={{ maxWidth: '420px' }}>
            <ProductShowcaseCard variant={family.variants[0]} size={resolvedCardSize} alignToRow={false} />
          </div>
        </div>
      ) : (
        <div className={`${G} ${emphasis === 'simple' ? 'py-10 md:py-12' : 'py-14 md:py-20'}`}>
          <div className={`xl:grid ${introSplit} xl:items-center xl:gap-x-12`}>
            {/* Family intro: numeral eyebrow, heading, green rule, description */}
            <div
              className="xl:[transform:translateY(var(--intro-offset,0px))]"
              style={{ '--intro-offset': `${introOffset ?? 0}px` } as any}
            >
              {eyebrow}
              <h2 className="text-h2 text-[var(--color-dark)]">
                {family.name}
              </h2>
              <div style={{ width: '40px', height: '2px', backgroundColor: 'var(--color-green)', marginTop: '0.9rem' }} />
              <p className="text-body text-[var(--color-muted)] mt-3 max-w-[42ch]">{family.description}</p>
              {potencyBlock}
            </div>

            {/* Product row: horizontal on desktop, stacks under the intro below xl */}
            <div
              className={`grid grid-cols-1 ${rowCols} gap-x-6 gap-y-10 mt-8 xl:mt-0 ${
                count === 1 ? 'max-w-xs xl:max-w-none' : ''
              }`}
            >
              {family.variants.map((variant) => (
                <ProductShowcaseCard key={variant.slug} variant={variant} size={resolvedCardSize} alignToRow={count > 1} />
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
