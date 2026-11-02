export const accountMayAuthenticate = (status: string) => status === 'ACTIVE'

type CurrentIdentity = { id: string; role: string; accountStatus: string; companyId: string | null }
export async function currentWebsiteIdentity(
  id: string | undefined,
  lookup: (id: string) => Promise<CurrentIdentity | null>
) {
  if (!id) throw new Error('Unauthorized')
  const current = await lookup(id)
  if (
    !current ||
    current.id !== id ||
    !accountMayAuthenticate(current.accountStatus) ||
    !['ADMIN', 'BUYER'].includes(current.role)
  ) {
    throw new Error('Unauthorized')
  }
  return current
}
