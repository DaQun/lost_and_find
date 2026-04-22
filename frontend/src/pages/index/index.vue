<template>
  <view class="page">
    <!-- 顶部欢迎区域 -->
    <view class="header">
      <view class="header__inner">
        <view class="welcome-row">
          <view class="welcome-text">
            <text class="greeting">你好，{{ displayName }} 👋</text>
            <text class="sub-greeting">你的物品都在这里</text>
          </view>
          <!-- 消息入口：未读红点 -->
          <view class="notif-btn" @tap="goToMessages">
            <text class="notif-icon">🔔</text>
            <view v-if="msgStore.unreadCount > 0" class="notif-badge">
              <text class="notif-badge-text">
                {{ msgStore.unreadCount > 99 ? '99+' : msgStore.unreadCount }}
              </text>
            </view>
          </view>
        </view>

        <!-- 统计数据行 -->
        <view class="stats-row">
          <view class="stat-card">
            <text class="stat-value">{{ qrStore.list.length }}</text>
            <text class="stat-label">全部物品</text>
          </view>
          <view class="stat-divider" />
          <view class="stat-card">
            <text class="stat-value">{{ totalScanCount }}</text>
            <text class="stat-label">累计被扫</text>
          </view>
          <view class="stat-divider" />
          <view class="stat-card">
            <text class="stat-value">{{ activeCount }}</text>
            <text class="stat-label">启用中</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 列表区域 -->
    <view class="body">
      <!-- 顶部工具栏 -->
      <view class="toolbar">
        <text class="toolbar-title">我的物品</text>
        <view class="add-btn" @tap="goToCreate">
          <text class="add-btn-icon">＋</text>
          <text class="add-btn-text">添加物品</text>
        </view>
      </view>

      <!-- 加载骨架屏 -->
      <view v-if="qrStore.loading && qrStore.list.length === 0" class="skeleton-list">
        <view v-for="i in 3" :key="i" class="skeleton-card">
          <view class="skeleton-icon" />
          <view class="skeleton-content">
            <view class="skeleton-line skeleton-line--title" />
            <view class="skeleton-line skeleton-line--sub" />
          </view>
          <view class="skeleton-badge" />
        </view>
      </view>

      <!-- 物品列表 -->
      <view v-else-if="qrStore.list.length > 0" class="item-list">
        <view
          v-for="item in qrStore.list"
          :key="item.id"
          class="item-card"
          @tap="goToDetail(item.id)"
        >
          <!-- 左侧：emoji 圆形图标 -->
          <view
            class="item-icon"
            :style="{ background: item.color || '#3B82F6' }"
          >
            <text class="item-icon-emoji">{{ item.icon || '🏷️' }}</text>
          </view>

          <!-- 中间：主要信息 -->
          <view class="item-info">
            <text class="item-label">{{ item.label }}</text>
            <view class="item-meta">
              <text class="item-meta-text">🗓 {{ formatDate(item.createdAt) }}</text>
              <view class="item-meta-dot" />
              <text class="item-meta-text">👁 扫描 {{ item.scanCount }} 次</text>
            </view>
            <text v-if="item.rewardText" class="item-reward">💰 {{ item.rewardText }}</text>
          </view>

          <!-- 右侧：状态标签 + 箭头 -->
          <view class="item-right">
            <view
              class="status-tag"
              :class="item.isActive ? 'status-tag--active' : 'status-tag--inactive'"
            >
              <view
                class="status-dot"
                :class="item.isActive ? 'status-dot--active' : 'status-dot--inactive'"
              />
              <text class="status-text">{{ item.isActive ? '启用中' : '已停用' }}</text>
            </view>
            <text class="item-arrow">›</text>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-else class="empty-state">
        <text class="empty-emoji">🏷️</text>
        <text class="empty-title">还没有物品</text>
        <text class="empty-desc">为你的贵重物品生成专属二维码{{ '\n' }}万一丢失，拾到者可以立刻联系你</text>
        <view class="empty-add-btn" @tap="goToCreate">
          <text class="empty-add-text">＋ 添加第一个物品</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { useAuthStore } from '@/stores/auth'
import { useQrCodesStore } from '@/stores/qrcodes'
import { useMessagesStore } from '@/stores/messages'

// ─── Store ────────────────────────────────────────────────────────────────────

const auth = useAuthStore()
const qrStore = useQrCodesStore()
const msgStore = useMessagesStore()

// ─── 计算属性 ─────────────────────────────────────────────────────────────────

/** 显示昵称，优先 nickname，否则显示脱敏手机号 */
const displayName = computed(() => {
  if (auth.user?.nickname) return auth.user.nickname
  if (auth.user?.phone) {
    const p = auth.user.phone
    return p.slice(0, 3) + '****' + p.slice(-4)
  }
  return '用户'
})

/** 累计扫码次数 */
const totalScanCount = computed(() =>
  qrStore.list.reduce((sum, item) => sum + (item.scanCount || 0), 0),
)

/** 启用中的物品数 */
const activeCount = computed(() => qrStore.list.filter((item) => item.isActive).length)

// ─── 格式化工具 ───────────────────────────────────────────────────────────────

/**
 * 格式化日期为 MM-DD 或 YYYY-MM-DD
 * 当年只显示月日，否则显示完整年月日
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const isThisYear = date.getFullYear() === now.getFullYear()

  if (isThisYear) {
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${m}-${d}`
  }

  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// ─── 业务逻辑 ─────────────────────────────────────────────────────────────────

/** 加载列表 + 未读消息数 */
async function loadData() {
  try {
    await Promise.all([
      qrStore.fetchList(),
      msgStore.fetchUnreadCount(),
    ])
  } catch (err: any) {
    uni.showToast({ title: err?.message || '加载失败', icon: 'none' })
  }
}

/** 跳转到创建页 */
function goToCreate() {
  uni.navigateTo({ url: '/pages/qrcode/create' })
}

/** 跳转到详情页 */
function goToDetail(id: string) {
  uni.navigateTo({ url: `/pages/qrcode/detail?id=${id}` })
}

/** 跳转到消息页（TabBar） */
function goToMessages() {
  uni.switchTab({ url: '/pages/messages/index' })
}

// ─── 生命周期 ─────────────────────────────────────────────────────────────────

/** 每次显示时刷新（从详情页返回时也会触发） */
onShow(async () => {
  if (!auth.isLoggedIn) {
    uni.reLaunch({ url: '/pages/login/index' })
    return
  }
  await loadData()
})

/** 下拉刷新 */
onPullDownRefresh(async () => {
  try {
    await loadData()
  } finally {
    uni.stopPullDownRefresh()
  }
})
</script>

<style scoped lang="scss">
// ─── 页面 ────────────────────────────────────────────────────────────────────

.page {
  min-height: 100vh;
  background: #f5f7fa;
}

// ─── 顶部 Header ─────────────────────────────────────────────────────────────

.header {
  background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
  padding-bottom: 48rpx;
  // 配合 body 的负边距营造卡片浮起感
}

.header__inner {
  padding: 100rpx 40rpx 0;
}

.welcome-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 40rpx;
}

.welcome-text {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.greeting {
  font-size: 40rpx;
  font-weight: 700;
  color: #ffffff;
  line-height: 1.2;
}

.sub-greeting {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.75);
}

// 消息铃铛按钮
.notif-btn {
  position: relative;
  width: 80rpx;
  height: 80rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 4rpx;
}

.notif-icon {
  font-size: 38rpx;
}

.notif-badge {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  min-width: 32rpx;
  height: 32rpx;
  background: #ef4444;
  border-radius: 100rpx;
  border: 3rpx solid rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6rpx;
  box-sizing: border-box;
}

.notif-badge-text {
  font-size: 18rpx;
  color: #fff;
  font-weight: 700;
}

// ─── 统计卡片 ────────────────────────────────────────────────────────────────

.stats-row {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 24rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  padding: 28rpx 0;
}

.stat-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.stat-value {
  font-size: 48rpx;
  font-weight: 800;
  color: #ffffff;
  line-height: 1;
}

.stat-label {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.7);
}

.stat-divider {
  width: 1rpx;
  height: 60rpx;
  background: rgba(255, 255, 255, 0.3);
}

// ─── 内容区域 ────────────────────────────────────────────────────────────────

.body {
  margin-top: -24rpx;
  background: #f5f7fa;
  border-radius: 32rpx 32rpx 0 0;
  padding: 36rpx 32rpx 48rpx;
  min-height: 60vh;
}

// ─── 工具栏 ──────────────────────────────────────────────────────────────────

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 28rpx;
}

.toolbar-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #1e293b;
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  background: #eff6ff;
  border: 2rpx solid #bfdbfe;
  border-radius: 100rpx;
  padding: 14rpx 28rpx;

  &:active {
    opacity: 0.7;
  }
}

.add-btn-icon {
  font-size: 30rpx;
  color: #3b82f6;
  line-height: 1;
  font-weight: 300;
}

.add-btn-text {
  font-size: 26rpx;
  color: #3b82f6;
  font-weight: 600;
}

// ─── 骨架屏 ──────────────────────────────────────────────────────────────────

.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.skeleton-card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 28rpx 28rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.skeleton-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: #e2e8f0;
  flex-shrink: 0;
}

.skeleton-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.skeleton-line {
  height: 24rpx;
  background: #e2e8f0;
  border-radius: 8rpx;

  &--title { width: 60%; }
  &--sub   { width: 40%; }
}

.skeleton-badge {
  width: 96rpx;
  height: 44rpx;
  border-radius: 100rpx;
  background: #e2e8f0;
  flex-shrink: 0;
}

// ─── 物品列表 ────────────────────────────────────────────────────────────────

.item-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.item-card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 28rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);

  &:active {
    opacity: 0.85;
    transform: scale(0.99);
  }
}

// 左侧图标
.item-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.15);
}

.item-icon-emoji {
  font-size: 44rpx;
  line-height: 96rpx;
  text-align: center;
}

// 中间信息
.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  min-width: 0;
}

.item-label {
  font-size: 32rpx;
  font-weight: 700;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 10rpx;
  flex-wrap: nowrap;
}

.item-meta-text {
  font-size: 22rpx;
  color: #94a3b8;
}

.item-meta-dot {
  width: 6rpx;
  height: 6rpx;
  border-radius: 50%;
  background: #cbd5e1;
  flex-shrink: 0;
}

.item-reward {
  font-size: 22rpx;
  color: #f59e0b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

// 右侧状态
.item-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12rpx;
  flex-shrink: 0;
}

.status-tag {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 18rpx;
  border-radius: 100rpx;
  white-space: nowrap;

  &--active {
    background: #f0fdf4;
    border: 1rpx solid #bbf7d0;
  }

  &--inactive {
    background: #f8fafc;
    border: 1rpx solid #e2e8f0;
  }
}

.status-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  flex-shrink: 0;

  &--active   { background: #22c55e; }
  &--inactive { background: #94a3b8; }
}

.status-text {
  font-size: 22rpx;
  font-weight: 600;

  .status-tag--active &   { color: #16a34a; }
  .status-tag--inactive & { color: #64748b; }
}

.item-arrow {
  font-size: 40rpx;
  color: #cbd5e1;
  line-height: 1;
  font-weight: 300;
}

// ─── 空状态 ──────────────────────────────────────────────────────────────────

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 100rpx 40rpx 60rpx;
  gap: 20rpx;
}

.empty-emoji {
  font-size: 120rpx;
  margin-bottom: 8rpx;
}

.empty-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #1e293b;
}

.empty-desc {
  font-size: 28rpx;
  color: #64748b;
  text-align: center;
  line-height: 1.7;
  white-space: pre-line;
}

.empty-add-btn {
  margin-top: 16rpx;
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  border-radius: 100rpx;
  padding: 26rpx 64rpx;
  box-shadow: 0 8rpx 24rpx rgba(59, 130, 246, 0.35);

  &:active {
    opacity: 0.85;
  }
}

.empty-add-text {
  font-size: 30rpx;
  font-weight: 700;
  color: #ffffff;
}
</style>
