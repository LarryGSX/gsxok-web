import { NextResponse } from 'next/server'
import { localStaging } from '@/staging/config'
import { requireAuth } from '@/lib/auth'
// Test observation only; no provisioning or authorization bypass. 404 outside local staging.
export async function GET() {
  if (!localStaging()) return new NextResponse(null, { status: 404 })
  try {
    const session = await requireAuth()
    return NextResponse.json({
      id: session.user.id,
      role: session.user.role,
      companyId: session.user.companyId,
    })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
