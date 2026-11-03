// lib/compliance/documents.ts
// Compliance Documents page content.
//
// To replace a document (OMMA license renewal, updated DEA paperwork): save
// the new PDF over the existing file in public/compliance/ using the SAME
// file name, and update the description here if it no longer applies (for
// example, once a DEA registration is actually issued). The page and the
// download buttons pick up the new file with no other change.

export interface ComplianceDocument {
  slug: string
  title: string
  description: string
  // Path under public/ — served at this same URL on the live site.
  file: string
}

export const COMPLIANCE_DOCUMENTS: ComplianceDocument[] = [
  {
    slug: 'omma-processor-license',
    title: 'GSX — OMMA Processor License',
    description: 'The current GSX Oklahoma Medical Marijuana Authority (OMMA) processor license.',
    file: '/compliance/GSX-OMMA-Processor-License.pdf',
  },
  {
    slug: 'dea-registration-application-documentation',
    title: 'GSX — DEA Registration Application Documentation',
    // Application paperwork only. Do not describe this as an approved or
    // issued DEA registration unless the replacement document shows one.
    description: 'DEA Form 225 application paperwork for GSX, completed in June 2026. This is application documentation, not an issued DEA registration.',
    file: '/compliance/GSX-DEA-Registration-Application-Documentation.pdf',
  },
]
