export async function uploadMaterial(file: File): Promise<{ storageKey?: string }> {
  const form = new FormData()
  form.append('file', file)

  const response = await fetch('/api/materials/upload', {
    method: 'POST',
    credentials: 'include',
    body: form,
  })
  const data: unknown = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = typeof data === 'object' && data && 'error' in data && typeof data.error === 'string'
      ? data.error
      : '文件上传失败，请稍后重试。'
    throw new Error(message)
  }
  return typeof data === 'object' && data && 'storageKey' in data && typeof data.storageKey === 'string'
    ? { storageKey: data.storageKey }
    : {}
}
