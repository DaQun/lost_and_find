import { defineConfig, loadEnv } from "vite";
import uni from "@dcloudio/vite-plugin-uni";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [uni()],

    server: {
      // 监听所有网络接口，允许通过局域网 IP 访问（如 192.168.x.x:5173）
      host: "0.0.0.0",
      port: 5173,
      // 代理：将 /api/* 转发到后端 localhost:3000
      // 这样无论从哪个 IP 访问前端，API 请求都由 Vite 服务器在内部转发
      // 浏览器/手机只需要知道前端 IP，不需要直接访问后端
      proxy: {
        "/api": {
          target: "http://localhost:3000",
          changeOrigin: true,
          // 保留路径前缀（/api/v1/... → http://localhost:3000/api/v1/...）
          rewrite: (path) => path,
        },
      },
    },

    define: {
      // 将环境变量显式注入，确保在小程序等非标准环境中也能正确访问
      "import.meta.env.VITE_API_BASE_URL": JSON.stringify(
        env.VITE_API_BASE_URL ?? "/api/v1",
      ),
      "import.meta.env.VITE_APP_NAME": JSON.stringify(
        env.VITE_APP_NAME ?? "Lost & Find",
      ),
    },
  };
});
