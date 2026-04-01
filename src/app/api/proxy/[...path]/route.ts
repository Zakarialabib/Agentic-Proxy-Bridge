import { NextRequest, NextResponse } from 'next/server'

async function forward(request: NextRequest, params: Promise<{ path: string[] }>) {
  const url = new URL(request.url)
  const port = url.searchParams.get('XTransformPort') || '3001'
  url.searchParams.delete('XTransformPort')

  const resolvedParams = await params
  const path = resolvedParams.path.join('/')
  const query = url.searchParams.toString()
  const upstreamPath = path.startsWith('v1/') || path === 'health'
    ? `/${path}`
    : `/api/proxy/${path}`
  const proxyUrl = `http://127.0.0.1:${port}${upstreamPath}${query ? `?${query}` : ''}`

  try {
    const response = await fetch(proxyUrl, {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.text(),
    })

    const contentType = response.headers.get('content-type') || ''

    // SSE / streaming: pass the body through as a readable stream
    if (contentType.includes('text/event-stream') || (contentType.includes('text/plain') && response.body)) {
      return new Response(response.body, {
        status: response.status,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

    if (contentType.includes('application/json')) {
      return NextResponse.json(await response.json(), { status: response.status })
    }

    return new NextResponse(await response.text(), { status: response.status })
  } catch (error) {
    console.error('Proxy error:', error)
    return NextResponse.json({ error: 'Proxy connection failed' }, { status: 500 })
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return forward(request, params)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return forward(request, params)
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return forward(request, params)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return forward(request, params)
}