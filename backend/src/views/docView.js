// Generic view: _id -> id, hide __v. Use for simple documents.
export function docView(doc) {
  const { _id, __v, key, ...rest } = doc.toObject ? doc.toObject() : doc
  // `id` is the official field. `_id` is also sent so older screens that read `_id` keep working.
  return { id: String(_id), _id: String(_id), ...(key && key !== 'main' ? { key } : {}), ...rest }
}
