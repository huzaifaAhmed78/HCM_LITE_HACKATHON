// Generic view: _id -> id, hide __v. Use for simple documents.
export function docView(doc) {
  const { _id, __v, key, ...rest } = doc.toObject ? doc.toObject() : doc
  return { id: String(_id), ...(key && key !== 'main' ? { key } : {}), ...rest }
}
