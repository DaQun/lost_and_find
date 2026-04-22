<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
import { useAuthStore } from './stores/auth'
import { useMessagesStore } from './stores/messages'

onLaunch(() => {
  const auth = useAuthStore()

  // 第一步：从本地存储恢复 token 和用户信息（必须最先执行）
  // 若不调用 init()，state 中的 accessToken 初始为 null，isLoggedIn 永远为 false
  auth.init()

  // 第二步：根据恢复结果决定跳转方向
  if (!auth.isLoggedIn) {
    uni.reLaunch({ url: '/pages/login/index' })
  } else {
    // 已登录：后台静默拉取未读消息数，用于 TabBar 角标
    const messages = useMessagesStore()
    messages.fetchUnreadCount()
  }
})

onShow(() => {
  console.log('App Show')
})

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
