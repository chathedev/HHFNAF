"use client"

import NextImage from "next/image"
import type { ComponentProps } from "react"
import imageLoader from "@/lib/image-loader"

// next/image with short /i/... URLs (see lib/image-loader.ts). The loader is set per image,
// not in next.config, because a config-wide custom loader switches off the Next optimizer.
export default function Image(props: ComponentProps<typeof NextImage>) {
  if (props.unoptimized || props.loader) return <NextImage {...props} />
  return <NextImage loader={imageLoader} {...props} />
}
