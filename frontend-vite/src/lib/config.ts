const rawProxyUrl = import.meta.env.VITE_PROXY_BRIDGE_URL
export const PROXY_BRIDGE_URL = rawProxyUrl && rawProxyUrl.length > 0 ? rawProxyUrl : ''
