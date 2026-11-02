import { localStaging } from '@/staging/config'
import * as queries from '@/lib/sanity/queries'

// Fictional compatibility probe. Never available in a hosted/ordinary build.
export async function GET() {
  if (!localStaging()) return new Response(null, { status: 404 })
  const [
    settings,
    products,
    product,
    family,
    productSlugs,
    locations,
    steps,
    articles,
    article,
    articleSlugs,
    families,
  ] = await Promise.all([
    queries.getSiteSettings(),
    queries.getAllProducts(),
    queries.getProductBySlug('fictional-sample'),
    queries.getProductsByFamily('fictional-family'),
    queries.getAllProductSlugs(),
    queries.getAllDispensaries(),
    queries.getManufacturingSteps(),
    queries.getAllArticles(),
    queries.getArticleBySlug('fictional-article'),
    queries.getAllArticleSlugs(),
    queries.getAllProductFamilies(),
  ])
  return Response.json({
    settings: settings.siteName,
    products: products.length,
    product: product._id,
    family: family.length,
    productSlugs,
    locations: locations.length,
    steps: steps.length,
    articles: articles.length,
    article: article._id,
    articleSlugs,
    families: families.length,
  })
}
