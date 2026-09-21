/**
 * App/user ids are 64-bit snowflake values. The backend serializes them as
 * JSON strings (see e.g. GET /app/get/vo, whose `id` comes back as
 * "459547437171974144"), because that magnitude exceeds
 * Number.MAX_SAFE_INTEGER and would silently lose precision as a JS number.
 * We keep ids as strings everywhere in the UI and only reach for this at the
 * boundary with Orval's generated functions, whose OpenAPI-derived types
 * (correctly, from the Java `Long` they mirror) say `number` — Spring/Jackson
 * parses a numeric string into a `Long` field or query param just fine, so
 * the cast is type-only and doesn't touch the actual runtime value.
 */
export function asApiId(id: string): number {
  return id as unknown as number
}
