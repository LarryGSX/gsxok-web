'use client'
import { Image } from 'next/dist/client/image-component'
import type { ImageProps } from 'next/image'

// Staging-only webpack alias: preserve the real Next optimizer while replacing
// image inputs with the generated local PNG. Production imports are untouched.
export default function FictionalImage(props: ImageProps) {
  return <Image {...props} src="http://127.0.0.1:4317/image.png" />
}
