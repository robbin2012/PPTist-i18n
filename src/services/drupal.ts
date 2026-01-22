import type { Slide, SlideTheme } from '@/types/slides'

type DrupalContentType = 'aigc' | 'infographic_template'

interface SavePayload {
  title: string
  data: string
  cover?: File
  prompt?: string
  reference?: string
  uuid?: string
  contentType?: DrupalContentType
  fileName?: string
}

export interface DrupalPPTData {
  uuid?: string
  title?: string
  slides?: Slide[]
  theme?: SlideTheme
  width?: number
  height?: number
  prompt?: string
  reference?: string
}

const DRUPAL_TYPE = 'pptist'
const AIGC_CONTENT_TYPE = 'aigc'
const INFOGRAPHIC_CONTENT_TYPE = 'infographic_template'
const JSON_API_HEADERS = {
  Accept: 'application/vnd.api+json',
  'Content-Type': 'application/vnd.api+json',
}

let csrfToken: string | null = null

const sanitizeFilename = (name: string, fallback = 'cover.png') => {
  const clean = name.replace(/[^a-zA-Z0-9_.-]/g, '-')
  return clean || fallback
}

const fetchJson = async <T>(url: string, init: RequestInit = {}) => {
  const res = await fetch(url, { credentials: 'include', ...init })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || res.statusText)
  }
  return res.json() as Promise<T>
}

async function getLoginStatus(): Promise<boolean> {
  try {
    const res = await fetch('/user/login_status?_format=json', { credentials: 'include' })
    if (!res.ok) return false
    const data = await res.text()
    return data.trim() === '1' || data.trim() === '\"1\"'
  } catch (e) {
    console.error('[DrupalAPI] getLoginStatus failed:', e)
    return false
  }
}

async function getCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken
  const res = await fetch('/session/token', { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to fetch CSRF token')
  csrfToken = await res.text()
  return csrfToken
}

async function uploadFile(file: File): Promise<string> {
  const token = await getCsrfToken()
  const res = await fetch('/jsonapi/media/image/field_media_image', {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${sanitizeFilename(file.name)}"`,
      'X-CSRF-Token': token,
    },
    body: file,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || 'Upload file failed')
  }
  const json = await res.json()
  return json?.data?.id
}

async function createMedia(fileId: string, name: string): Promise<string> {
  const token = await getCsrfToken()
  const payload = {
    data: {
      type: 'media--image',
      attributes: { name },
      relationships: {
        field_media_image: {
          data: { type: 'file--file', id: fileId },
        },
      },
    },
  }
  const res = await fetch('/jsonapi/media/image', {
    method: 'POST',
    credentials: 'include',
    headers: { ...JSON_API_HEADERS, 'X-CSRF-Token': token },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || 'Create media failed')
  }
  const json = await res.json()
  return json?.data?.id
}

async function setNodeCover(nodeUuid: string, mediaId: string) {
  const token = await getCsrfToken()
  const payload = { data: { type: 'media--image', id: mediaId } }
  const res = await fetch(`/jsonapi/node/aigc/${nodeUuid}/relationships/cover`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { ...JSON_API_HEADERS, 'X-CSRF-Token': token },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || 'Update cover failed')
  }
}

async function uploadFileForNodeField(contentType: DrupalContentType, fieldName: string, file: File): Promise<string> {
  const token = await getCsrfToken()
  const res = await fetch(`/jsonapi/node/${contentType}/${fieldName}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${sanitizeFilename(file.name)}"`,
      'X-CSRF-Token': token,
    },
    body: file,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Upload ${fieldName} failed`)
  }

  const json = await res.json()
  return json?.data?.id
}

async function patchNodeFileRelationship(contentType: DrupalContentType, nodeUuid: string, fieldName: string, fileId: string) {
  const token = await getCsrfToken()
  const payload = {
    data: {
      type: 'file--file',
      id: fileId,
      meta: { description: null },
    },
  }

  const res = await fetch(`/jsonapi/node/${contentType}/${nodeUuid}/relationships/${fieldName}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { ...JSON_API_HEADERS, 'X-CSRF-Token': token },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Patch ${fieldName} failed`)
  }
}

async function createOrUpdateNode(payload: SavePayload): Promise<string> {
  const token = await getCsrfToken()
  const isUpdate = !!payload.uuid
  const url = isUpdate ? `/jsonapi/node/aigc/${payload.uuid}` : '/jsonapi/node/aigc'
  const method = isUpdate ? 'PATCH' : 'POST'

  const body = {
    data: {
      type: 'node--aigc',
      ...(isUpdate ? { id: payload.uuid } : {}),
      attributes: {
        title: payload.title,
        content_data: payload.data,
        content_type: [DRUPAL_TYPE],
        prompt: payload.prompt || undefined,
        reference_data: payload.reference || undefined,
      },
    },
  }

  const res = await fetch(url, {
    method,
    credentials: 'include',
    headers: { ...JSON_API_HEADERS, 'X-CSRF-Token': token },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || 'Save node failed')
  }

  const json = await res.json()
  return json?.data?.id
}

export async function saveSlides(payload: SavePayload) {
  const contentType: DrupalContentType = payload.contentType || AIGC_CONTENT_TYPE
  const loggedIn = await getLoginStatus()
  if (!loggedIn) {
    throw new Error('unauthorized')
  }

  if (contentType === INFOGRAPHIC_CONTENT_TYPE) {
    if (!payload.uuid) {
      throw new Error('missing uuid')
    }

    const fileName = payload.fileName || 'template.json'
    const file = new File([payload.data], fileName, { type: 'application/json' })
    const fileId = await uploadFileForNodeField(INFOGRAPHIC_CONTENT_TYPE, 'template_file', file)
    await patchNodeFileRelationship(INFOGRAPHIC_CONTENT_TYPE, payload.uuid, 'template_file', fileId)
    return { uuid: payload.uuid }
  }

  const nodeUuid = await createOrUpdateNode(payload)

  if (payload.cover) {
    const fid = await uploadFile(payload.cover)
    const mediaId = await createMedia(fid, payload.cover.name)
    await setNodeCover(nodeUuid, mediaId)
  }

  return { uuid: nodeUuid }
}

export async function loadSlides(uuid: string, contentType: DrupalContentType = AIGC_CONTENT_TYPE): Promise<DrupalPPTData> {
  if (contentType === INFOGRAPHIC_CONTENT_TYPE) {
    const data = await fetchJson<any>(`/jsonapi/node/${INFOGRAPHIC_CONTENT_TYPE}/${uuid}?include=template_file&fields[node--${INFOGRAPHIC_CONTENT_TYPE}]=title,template_file`)
    const attrs = data?.data?.attributes
    const fileEntity = Array.isArray(data?.included)
      ? data.included.find((item: any) => item?.type === 'file--file')
      : null
    const fileUrl = fileEntity?.attributes?.uri?.url || fileEntity?.attributes?.uri?.value
    if (!fileUrl) {
      throw new Error('template_file missing')
    }
    const resolvedUrl = fileUrl.startsWith('http') ? fileUrl : new URL(fileUrl, window.location.origin).toString()
    const fileResp = await fetch(resolvedUrl, { credentials: 'include' })
    if (!fileResp.ok) {
      throw new Error(`template_file download failed: ${fileResp.statusText}`)
    }
    const fileJson = await fileResp.json()
    return {
      uuid: data?.data?.id,
      title: attrs?.title,
      slides: fileJson?.slides,
      theme: fileJson?.theme,
      width: fileJson?.width ?? fileJson?.size?.width,
      height: fileJson?.height ?? fileJson?.size?.height,
    }
  }

  const data = await fetchJson<any>(`/jsonapi/node/aigc/${uuid}?fields[node--aigc]=title,content_data,prompt,reference_data`)
  const attrs = data?.data?.attributes
  if (!attrs?.content_data) {
    throw new Error('empty content_data')
  }

  const parsed = typeof attrs.content_data === 'string' ? JSON.parse(attrs.content_data) : attrs.content_data
  return {
    uuid: data?.data?.id,
    title: attrs.title,
    slides: parsed?.slides,
    theme: parsed?.theme,
    width: parsed?.width,
    height: parsed?.height,
    prompt: attrs.prompt,
    reference: attrs.reference_data,
  }
}

export async function loadSlidesByNid(nid: string, contentType: DrupalContentType = AIGC_CONTENT_TYPE): Promise<DrupalPPTData> {
  if (contentType === INFOGRAPHIC_CONTENT_TYPE) {
    const res = await fetchJson<any>(`/jsonapi/node/${INFOGRAPHIC_CONTENT_TYPE}?filter[drupal_internal__nid]=${nid}&fields[node--${INFOGRAPHIC_CONTENT_TYPE}]=title,template_file`)
    const item = Array.isArray(res?.data) ? res.data[0] : null
    if (!item?.id) throw new Error('node not found')
    return loadSlides(item.id, INFOGRAPHIC_CONTENT_TYPE)
  }

  const res = await fetchJson<any>(`/jsonapi/node/aigc?filter[drupal_internal__nid]=${nid}&fields[node--aigc]=title,content_data,prompt,reference_data`)
  const item = Array.isArray(res?.data) ? res.data[0] : null
  if (!item?.id) throw new Error('node not found')
  return loadSlides(item.id)
}

export async function ensureLogin() {
  const loggedIn = await getLoginStatus()
  if (!loggedIn) throw new Error('unauthorized')
  return true
}
