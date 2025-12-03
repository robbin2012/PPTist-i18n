/**
 * AI Service for PPT generation
 */

interface InfographicTemplate {
  id: string
  title: string
  cover: {
    webp?: { url: string; width: number; height: number }
    url?: string
  }
  category?: string
}

interface GenerateInfographicParams {
  prompt: string
  templateIds: string[]
  reference?: string
}

/**
 * Fetch available infographic templates from Drupal JSON:API
 */
export async function fetchInfographicTemplates(offset = 0, limit = 20): Promise<{ templates: InfographicTemplate[], hasMore: boolean }> {
  try {
    // Build Drupal JSON:API query parameters
    const params = new URLSearchParams({
      'filter[status]': '1',
      'include': 'cover.field_media_image,svg,tags',
      'fields[node--infographic_template]': 'title,cover,svg,tags,sticky,drupal_internal__nid',
      'fields[media--image]': 'field_media_image',
      'fields[file--file]': 'uri',
      'fields[taxonomy_term--tags]': 'name,drupal_internal__tid',
      'sort': '-sticky,-drupal_internal__nid',
      'page[offset]': offset.toString(),
      'page[limit]': limit.toString()
    })

    const response = await fetch(`/jsonapi/node/infographic_template?${params}`, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch templates: ${response.status} ${response.statusText}`)
    }

    const jsonApiResponse = await response.json()

    // Map Drupal JSON:API format to template format
    const templates = (jsonApiResponse.data || []).map((node: any) => {
      // Cover image URL is in relationships.cover.data.meta.url
      const coverUrl = node.relationships?.cover?.data?.meta?.url

      // Try to get dimensions from meta or use defaults
      const coverMeta = node.relationships?.cover?.data?.meta
      const width = coverMeta?.width || 800
      const height = coverMeta?.height || 600

      return {
        id: node.id,
        title: node.attributes?.title || 'Untitled',
        cover: {
          url: coverUrl,
          webp: coverUrl ? {
            url: coverUrl,
            width: width,
            height: height
          } : undefined
        },
        category: node.attributes?.category
      }
    })

    // Check if there are more pages
    const hasMore = templates.length === limit

    return { templates, hasMore }
  } catch (error) {
    console.error('Error fetching infographic templates:', error)
    throw error
  }
}

/**
 * Generate infographic slide using AI
 */
export async function generateInfographic(
  params: GenerateInfographicParams
): Promise<any> {
  try {
    const response = await fetch('/api/viz/pptist_infographic_create', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        prompt: params.prompt,
        template_ids: params.templateIds,
        reference: params.reference || '',
        return_json: true,
      }),
    })

    if (!response.ok) {
      try {
        const errorData = await response.json()
        const errorMsg = errorData.error || `API request failed: ${response.status} ${response.statusText}`
        const detail = errorData.detail ? `\n${errorData.detail}` : ''
        throw new Error(errorMsg + detail)
      } catch (e) {
        if (e instanceof Error && e.message.includes('API request failed')) {
          throw e
        }
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }
    }

    const data = await response.json()

    // Check if response contains an error field
    if (data.error) {
      throw new Error(data.error)
    }

    // Extract slides from PPT JSON
    // API returns full PPT structure, we only need the slides array
    if (data.slides && Array.isArray(data.slides)) {
      return { slides: data.slides }
    }

    return data
  } catch (error) {
    console.error('Error generating infographic:', error)
    throw error
  }
}
