import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  theme: 'dark' | 'light'
  activeTab: string
  pollingEnabled: boolean
  sseEnabled: boolean
  lmStudioHost: string
  lmStudioPort: number
  autoConnect: boolean
  streamingEnabled: boolean
  loggingEnabled: boolean
  logLevel: 'debug' | 'info' | 'warn' | 'error'
  cacheEmbeddings: boolean
  defaultReranker: 'fast' | 'deep' | 'cascade' | 'hybrid'
  vramBudget: number
  autoEvict: boolean
  preWarmModels: boolean

  setTheme: (theme: 'dark' | 'light') => void
  setActiveTab: (tab: string) => void
  togglePolling: () => void
  toggleSSE: () => void
  setLmStudioConnection: (host: string, port: number) => void
  setAutoConnect: (enabled: boolean) => void
  setStreamingEnabled: (enabled: boolean) => void
  setLoggingEnabled: (enabled: boolean) => void
  setLogLevel: (level: 'debug' | 'info' | 'warn' | 'error') => void
  setCacheEmbeddings: (enabled: boolean) => void
  setDefaultReranker: (mode: 'fast' | 'deep' | 'cascade' | 'hybrid') => void
  setVramBudget: (budget: number) => void
  setAutoEvict: (enabled: boolean) => void
  setPreWarmModels: (enabled: boolean) => void
  reset: () => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      activeTab: 'dashboard',
      pollingEnabled: true,
      sseEnabled: false,
      lmStudioHost: 'localhost',
      lmStudioPort: 1234,
      autoConnect: true,
      streamingEnabled: true,
      loggingEnabled: true,
      logLevel: 'info',
      cacheEmbeddings: true,
      defaultReranker: 'cascade',
      vramBudget: 8192,
      autoEvict: true,
      preWarmModels: true,

      setTheme: (theme) => set({ theme }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      togglePolling: () => set((s) => ({ pollingEnabled: !s.pollingEnabled })),
      toggleSSE: () => set((s) => ({ sseEnabled: !s.sseEnabled })),
      setLmStudioConnection: (host, port) => set({ lmStudioHost: host, lmStudioPort: port }),
      setAutoConnect: (enabled) => set({ autoConnect: enabled }),
      setStreamingEnabled: (enabled) => set({ streamingEnabled: enabled }),
      setLoggingEnabled: (enabled) => set({ loggingEnabled: enabled }),
      setLogLevel: (level) => set({ logLevel: level }),
      setCacheEmbeddings: (enabled) => set({ cacheEmbeddings: enabled }),
      setDefaultReranker: (mode) => set({ defaultReranker: mode }),
      setVramBudget: (budget) => set({ vramBudget: budget }),
      setAutoEvict: (enabled) => set({ autoEvict: enabled }),
      setPreWarmModels: (enabled) => set({ preWarmModels: enabled }),

      reset: () =>
        set({
          theme: 'dark',
          activeTab: 'dashboard',
          pollingEnabled: true,
          sseEnabled: false,
          lmStudioHost: 'localhost',
          lmStudioPort: 1234,
          autoConnect: true,
          streamingEnabled: true,
          loggingEnabled: true,
          logLevel: 'info',
          cacheEmbeddings: true,
          defaultReranker: 'cascade',
          vramBudget: 8192,
          autoEvict: true,
          preWarmModels: true,
        }),
    }),
    {
      name: 'lmstudio-settings',
      partialize: (state) => ({
        theme: state.theme,
        activeTab: state.activeTab,
        pollingEnabled: state.pollingEnabled,
        sseEnabled: state.sseEnabled,
        lmStudioHost: state.lmStudioHost,
        lmStudioPort: state.lmStudioPort,
        autoConnect: state.autoConnect,
        streamingEnabled: state.streamingEnabled,
        loggingEnabled: state.loggingEnabled,
        logLevel: state.logLevel,
        cacheEmbeddings: state.cacheEmbeddings,
        defaultReranker: state.defaultReranker,
        vramBudget: state.vramBudget,
        autoEvict: state.autoEvict,
        preWarmModels: state.preWarmModels,
      }),
    }
  )
)
