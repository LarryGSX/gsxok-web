// Server-only guard. Local staging must never point at a hosted service or live DB.
export function localStaging(env: Readonly<Record<string, string | undefined>> = process.env) {
  if (env.NEXT_PUBLIC_GSX_LOCAL_STAGING !== '1') return null
  const origin = env.NEXT_PUBLIC_GSX_STAGE_API_ORIGIN
  const db = env.DATABASE_URL ? new URL(env.DATABASE_URL) : null
  if (
    env.VERCEL ||
    origin !== 'http://127.0.0.1:4317' ||
    env.NEXT_PUBLIC_SANITY_PROJECT_ID !== 'gsxstage' ||
    env.NEXT_PUBLIC_SANITY_DATASET !== 'fictional' ||
    !db ||
    db.hostname !== '127.0.0.1' ||
    db.port !== '54329' ||
    db.pathname !== '/gsx_web_staging'
  )
    throw Error(
      'Local staging requires the fictional CMS and dedicated loopback database; hosted destinations are refused.'
    )
  return { origin }
}
