import test from 'node:test'
import assert from 'node:assert/strict'
import { localStaging } from '../staging/config.ts'

const fixture = {
  NEXT_PUBLIC_GSX_LOCAL_STAGING: '1',
  NEXT_PUBLIC_GSX_STAGE_API_ORIGIN: 'http://127.0.0.1:4317',
  NEXT_PUBLIC_SANITY_PROJECT_ID: 'gsxstage',
  NEXT_PUBLIC_SANITY_DATASET: 'fictional',
  DATABASE_URL: 'postgresql://fictional:PLACEHOLDER@127.0.0.1:54329/gsx_web_staging',
}
test('local staging is off by default and accepts only exact fictional destinations', () => {
  assert.equal(localStaging({}), null)
  assert.deepEqual(localStaging(fixture), { origin: 'http://127.0.0.1:4317' })
  for (const change of [
    { VERCEL: '1' },
    { NEXT_PUBLIC_SANITY_DATASET: 'production' },
    { NEXT_PUBLIC_SANITY_PROJECT_ID: 'another-project' },
    { NEXT_PUBLIC_GSX_STAGE_API_ORIGIN: 'https://cms.example.invalid' },
    { DATABASE_URL: 'postgresql://fictional:PLACEHOLDER@db.example.invalid/gsx_web_staging' },
    { DATABASE_URL: 'postgresql://fictional:PLACEHOLDER@127.0.0.1:54329/production' },
  ]) {
    assert.throws(() => localStaging({ ...fixture, ...change }), /Local staging/)
  }
})
