import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

/**
 * uni-app 要求导出 createApp 函数（而非直接调用 mount）
 * 框架会在合适的时机调用它，以支持 SSR 和多端编译
 */
export function createApp() {
  const app = createSSRApp(App)
  const pinia = createPinia()
  app.use(pinia)
  return { app, Pinia: pinia }
}
