/// <reference types="vite/client" />

// .vue 文件模块声明
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent
  export default component
}

// Vite 环境变量类型声明
interface ImportMetaEnv {
  /** 后端 API 根路径，例如 http://localhost:3000/api/v1 */
  readonly VITE_API_BASE_URL: string
  /** 应用名称 */
  readonly VITE_APP_NAME: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
