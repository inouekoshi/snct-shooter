/// <reference lib="webworker" />
import { defaultCache } from '@serwist/next/worker'
import { NetworkOnly, Serwist, type PrecacheEntry, type RuntimeCaching } from 'serwist'

declare const self: ServiceWorkerGlobalScope & { __SW_MANIFEST: (PrecacheEntry | string)[] }

const apiNetworkOnly: RuntimeCaching = {
  matcher: ({ sameOrigin, url }) => sameOrigin && url.pathname.startsWith('/api/'),
  handler: new NetworkOnly(),
}

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [apiNetworkOnly, ...defaultCache],
})

serwist.addEventListeners()
