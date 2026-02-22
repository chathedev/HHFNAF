type JsonLdValue = Record<string, unknown> | Array<Record<string, unknown>>

export function JsonLd({ data, id }: { data: JsonLdValue; id?: string }) {
  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
