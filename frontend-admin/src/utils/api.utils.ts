/**
 * API Utility - Handles authentication errors and token management
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

interface FetchOptions extends RequestInit {
  headers?: Record<string, string>
}

const HTML_RESPONSE_REGEX = /<!doctype\s+html|<html|<body/i

const isHtmlPayload = (payload: string) => HTML_RESPONSE_REGEX.test(payload)

async function parseJsonOrThrow(response: Response, endpoint: string) {
  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    return response.json()
  }

  const rawText = await response.text()

  if (isHtmlPayload(rawText)) {
    throw new Error(`API ${endpoint} trả về HTML thay vì JSON. Kiểm tra VITE_API_URL và backend route.`)
  }

  throw new Error(
    `API ${endpoint} trả về định dạng không hợp lệ: ${contentType || 'unknown'}`
  )
}

/**
 * Fetch wrapper with automatic 401 handling
 * Clears auth state when unauthorized
 */
export async function apiCall(
  endpoint: string,
  options: FetchOptions = {}
): Promise<Response> {
  const token = localStorage.getItem('adminAccessToken')

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  // Add auth token if exists
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    })
  } catch (networkError) {
    console.error('Network error:', networkError)
    throw new Error('Network error. Please check your connection.')
  }

  // Handle 401 Unauthorized - Only logout if not already on login page
  if (response.status === 401) {
    // Check if already on login page to avoid redirect loop
    if (!window.location.pathname.includes('/login')) {
      // Clear auth state
      localStorage.removeItem('adminAccessToken')
      localStorage.removeItem('adminUser')

      // Redirect to login
      window.location.href = '/login'
    }

    throw new Error('Session expired. Please login again.')
  }

  // Handle other HTTP errors
  if (!response.ok) {
    let errorMessage = `HTTP Error ${response.status}`
    const contentType = response.headers.get('content-type') || ''

    try {
      if (contentType.includes('application/json')) {
        const errorData = await response.json()
        errorMessage = errorData.message || errorMessage
      } else {
        const rawText = await response.text()
        if (isHtmlPayload(rawText)) {
          errorMessage = `API ${endpoint} trả về HTML thay vì JSON. Kiểm tra VITE_API_URL và backend route.`
        } else if (rawText.trim()) {
          errorMessage = rawText.trim().slice(0, 200)
        } else {
          errorMessage = response.statusText || errorMessage
        }
      }
    } catch {
      // Response is not JSON, use status text
      errorMessage = response.statusText || errorMessage
    }

    throw new Error(errorMessage)
  }

  return response
}

/**
 * Convenience method for GET requests
 */
export async function apiGet(endpoint: string, options?: FetchOptions) {
  const response = await apiCall(endpoint, {
    ...options,
    method: 'GET',
  })
  return parseJsonOrThrow(response, endpoint)
}

/**
 * Convenience method for POST requests
 */
export async function apiPost(
  endpoint: string,
  data?: any,
  options?: FetchOptions
) {
  const response = await apiCall(endpoint, {
    ...options,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  })
  return parseJsonOrThrow(response, endpoint)
}

/**
 * Convenience method for PATCH requests
 */
export async function apiPatch(
  endpoint: string,
  data?: any,
  options?: FetchOptions
) {
  const response = await apiCall(endpoint, {
    ...options,
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  })
  return parseJsonOrThrow(response, endpoint)
}

/**
 * Convenience method for DELETE requests
 */
export async function apiDelete(endpoint: string, options?: FetchOptions) {
  const response = await apiCall(endpoint, {
    ...options,
    method: 'DELETE',
  })
  return parseJsonOrThrow(response, endpoint)
}
