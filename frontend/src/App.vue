<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
import { useAuthStore } from './stores/auth'
import { useMessagesStore } from './stores/messages'

onLaunch(() => {
  // 从本地存储恢复 token 和用户信息（必须最先执行）
  useAuthStore().init();
});

onShow(() => {
  // 扫码落地页是公开的，不需要登录
  if (isScanPage()) {
    return
  }

  const auth = useAuthStore()
  if (!auth.isLoggedIn) {
    uni.reLaunch({ url: '/pages/login/index' })
  } else {
    // 已登录：后台静默拉取未读消息数，用于 TabBar 角标
    const messages = useMessagesStore()
    messages.fetchUnreadCount()
  }
})

function isScanPage(): boolean {
  // #ifdef H5
  if (window.location.pathname.includes('pages/scan/index')) {
    return true
  }
  // #endif

  // 非 H5 平台（如 App、小程序），通过 getCurrentPages 检测
  const pages = getCurrentPages()
  if (pages.length === 0) return false

  const currentPage = pages[pages.length - 1]
  const currentPath = currentPage?.route || ''
  const currentQuery = currentPage?.options || {}

  return currentPath === 'pages/scan/index' || !!currentQuery.token
}

onHide(() => {
  console.log('App Hide')
})
</script>

<style>
/* 全局样式 */
page {
  background-color: #f5f7fa;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* 去除按钮默认边框 */
button::after {
  border: none;
}

/* 统一 input placeholder 颜色 */
input::placeholder,
textarea::placeholder {
  color: #9ca3af;
}

/* 安全区域适配 */
.safe-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
