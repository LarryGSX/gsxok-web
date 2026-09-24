// See lib/sanity/client.ts for why this imports from the underlying
// packages directly rather than from next-sanity on this branch.
import groq from 'groq'
import { sanityClient, REVALIDATION_TAG } from './client'

// ── Shared field fragments ────────────────────────────────────────────────────

const imageFields = /* groq */`
  asset->{_id, url, metadata {dimensions, lqip}},
  alt,
  hotspot,
  crop
`

const slugField = /* groq */`slug { current }`

// ── Site Settings ─────────────────────────────────────────────────────────────

const SITE_SETTINGS_QUERY = groq`
  *[_type == "siteSettings" && _id == "siteSettings"][0] {
    siteName,
    tagline,
    logo { ${imageFields} },
    logoLight { ${imageFields} },
    heroImage { ${imageFields} },
    processImage { ${imageFields} },
    proofPoints,
    defaultMetaTitle,
    defaultMetaDescription,
    ogImage { ${imageFields} },
    contactEmail,
    contactPhone,
    address,
    siteBanner
  }
`

export async function getSiteSettings() {
  return sanityClient.fetch(SITE_SETTINGS_QUERY, {}, { next: { tags: [REVALIDATION_TAG] } })
}

// ── Products ──────────────────────────────────────────────────────────────────

const PRODUCT_CARD_FIELDS = /* groq */`
  _id,
  name,
  ${slugField},
  shortDescription,
  availabilityStatus,
  wholesalePrice,
  image { ${imageFields} },
  productFamily->{ name, ${slugField} },
  productFormat->{ name, ${slugField} },
  cannabinoidProfile[] {
    cannabinoid->{ name, abbreviation },
    amountMg
  },
  totalMgPerUnit
`

const ALL_PRODUCTS_QUERY = groq`
  *[_type == "product" && availabilityStatus != "discontinued"] | order(name asc) {
    ${PRODUCT_CARD_FIELDS}
  }
`

export async function getAllProducts() {
  return sanityClient.fetch(ALL_PRODUCTS_QUERY, {}, { next: { tags: [REVALIDATION_TAG] } })
}

const PRODUCT_BY_SLUG_QUERY = groq`
  *[_type == "product" && slug.current == $slug][0] {
    ${PRODUCT_CARD_FIELDS},
    longDescription,
    gallery[] { ${imageFields} },
    piecesPerUnit,
    flavors[]->{ name, ${slugField} },
    legacyPid
  }
`

export async function getProductBySlug(slug: string) {
  return sanityClient.fetch(PRODUCT_BY_SLUG_QUERY, { slug }, { next: { tags: [REVALIDATION_TAG] } })
}

const PRODUCTS_BY_FAMILY_QUERY = groq`
  *[_type == "product" && productFamily->slug.current == $familySlug && availabilityStatus != "discontinued"]
  | order(name asc) {
    ${PRODUCT_CARD_FIELDS}
  }
`

export async function getProductsByFamily(familySlug: string) {
  return sanityClient.fetch(
    PRODUCTS_BY_FAMILY_QUERY,
    { familySlug },
    { next: { tags: [REVALIDATION_TAG] } }
  )
}

/** Returns [{ _id, slug }] — used to generate static params at build time. */
const ALL_PRODUCT_SLUGS_QUERY = groq`
  *[_type == "product"] { "slug": slug.current }
`

export async function getAllProductSlugs() {
  return sanityClient.fetch<{ slug: string }[]>(ALL_PRODUCT_SLUGS_QUERY, {}, { next: { revalidate: false } })
}

// ── Dispensaries ──────────────────────────────────────────────────────────────

const ALL_DISPENSARIES_QUERY = groq`
  *[_type == "dispensary"] | order(name asc) {
    _id,
    name,
    ${slugField},
    address,
    city,
    state,
    zip,
    coordinates,
    phone,
    website,
    orderingUrl,
    directionsUrl,
    availabilityStatus,
    featuredProducts[]->{ _id, name, ${slugField}, image { ${imageFields} } }
  }
`

export async function getAllDispensaries() {
  return sanityClient.fetch(ALL_DISPENSARIES_QUERY, {}, { next: { tags: [REVALIDATION_TAG] } })
}

// ── Manufacturing Steps ───────────────────────────────────────────────────────

const MANUFACTURING_STEPS_QUERY = groq`
  *[_type == "manufacturingStep"] | order(order asc) {
    _id,
    order,
    title,
    description,
    icon { ${imageFields} }
  }
`

export async function getManufacturingSteps() {
  return sanityClient.fetch(MANUFACTURING_STEPS_QUERY, {}, { next: { tags: [REVALIDATION_TAG] } })
}

// ── Education Articles ────────────────────────────────────────────────────────

const ARTICLE_CARD_FIELDS = /* groq */`
  _id,
  title,
  ${slugField},
  summary,
  publishedAt,
  heroImage { ${imageFields} },
  category->{ name, ${slugField} }
`

const ALL_ARTICLES_QUERY = groq`
  *[_type == "educationArticle" && defined(publishedAt)] | order(publishedAt desc) {
    ${ARTICLE_CARD_FIELDS}
  }
`

export async function getAllArticles() {
  return sanityClient.fetch(ALL_ARTICLES_QUERY, {}, { next: { tags: [REVALIDATION_TAG] } })
}

const ARTICLE_BY_SLUG_QUERY = groq`
  *[_type == "educationArticle" && slug.current == $slug][0] {
    ${ARTICLE_CARD_FIELDS},
    body,
    seo,
    relatedProducts[]->{ ${PRODUCT_CARD_FIELDS} }
  }
`

export async function getArticleBySlug(slug: string) {
  return sanityClient.fetch(ARTICLE_BY_SLUG_QUERY, { slug }, { next: { tags: [REVALIDATION_TAG] } })
}

const ALL_ARTICLE_SLUGS_QUERY = groq`
  *[_type == "educationArticle" && defined(publishedAt)] { "slug": slug.current }
`

export async function getAllArticleSlugs() {
  return sanityClient.fetch<{ slug: string }[]>(ALL_ARTICLE_SLUGS_QUERY, {}, { next: { revalidate: false } })
}

// ── Taxonomy ──────────────────────────────────────────────────────────────────

const ALL_PRODUCT_FAMILIES_QUERY = groq`
  *[_type == "productFamily"] | order(name asc) { _id, name, ${slugField}, description }
`

export async function getAllProductFamilies() {
  return sanityClient.fetch(ALL_PRODUCT_FAMILIES_QUERY, {}, { next: { tags: [REVALIDATION_TAG] } })
}
