<template>
  <view class="page">
    <!-- 顶部 Header -->
    <view class="header">
      <view class="header__inner">
        <view class="header__title-row">
          <text class="header__title">消息中心</text>
          <!-- 未读徽章 -->
          <view v-if="msgStore.unreadCount > 0" class="header__badge">
            <text class="header__badge-text">
              {{ msgStore.unreadCount > 99 ? '99+' : msgStore.unreadCount }}
            </text>
          </view>
        </view>
        <text class="header__sub">拾到者发来的留言都在这里</text>

        <!-- 全部 / 未读 切换 Tab -->
        <view class="tab-bar">
          <view
            class="tab-item"
            :class="{ 'tab-item--active': activeTab === 'all' }"
            @tap="switchTab('all')"
          >
            <text class="tab-text">全部留言</text>
            <view v-if="activeTab === 'all'" class="tab-indicator" />
          </view>
          <view
            class="tab-item"
            :class="{ 'tab-item--active': activeTab === 'unread' }"
            @tap="switchTab('unread')"
          >
            <text class="tab-text">未读</text>
            <text v-if="msgStore.unreadCount > 0" class="tab-unread-badge">
              {{ msgStore.unreadCount }}
            </text>
            <view v-if="activeTab === 'unread'" class="tab-indicator" />
          </view>
        </view>
      </view>
    </view>

    <!-- 列表区 -->
    <view class="body">
      <!-- 加载骨架屏 -->
      <view v-if="msgStore.loading && msgStore.list.length === 0" class="skeleton-list">
        <view v-for="i in 4" :key="i" class="skeleton-card">
          <view class="skeleton-avatar" />
          <view class="skeleton-content">
            <view class="skeleton-line skeleton-line--tag" />
            <view class="skeleton-line skeleton-line--main" />
            <view class="skeleton-line skeleton-line--sub" />
          </view>
          <view class="skeleton-dot" />
        </view>
      </view>

      <!-- 消息列表 -->
      <scroll-view
        v-else-if="displayList.length > 0"
        scroll-y
        class="msg-scroll"
        refresher-enabled
        :refresher-triggered="refreshing"
        @refresherrefresh="onRefresh"
      >
        <view class="msg-list">
          <view
            v-for="msg in displayList"
            :key="msg.id"
            class="msg-card"
            :class="{ 'msg-card--unread': !msg.isRead }"
            @tap="onClickMessage(msg)"
          >
            <!-- 左侧：物品 emoji 图标 -->
            <view
              class="msg-avatar"
              :style="{ background: getItemColor(msg) }"
            >
              <text class="msg-avatar-emoji">{{ getItemIcon(msg) }}</text>
            </view>

            <!-- 中间：主要信息 -->
            <view class="msg-body">
              <!-- 物品名称标签 -->
              <view class="msg-item-tag">
                <text class="msg-item-tag-text">{{ msg.qrCode?.label || '未知物品' }}</text>
              </view>

              <!-- 留言内容（最多两行截断） -->
              <text class="msg-content">{{ msg.message }}</text>

              <!-- 底部元信息：发信人 + 时间 -->
              <view class="msg-meta">
                <text v-if="msg.finderName" class="msg-finder">
                  {{ msg.finderName }}
                </text>
                <text v-else class="msg-finder msg-finder--anon">匿名好心人</text>
                <view class="msg-meta-dot" />
                <text class="msg-time">{{ formatTime(msg.createdAt) }}</text>
              </view>
            </view>

            <!-- 右侧：未读红点 / 已读勾 -->
            <view class="msg-status">
              <view v-if="!msg.isRead" class="unread-dot" />
              <text v-else class="read-check">✓</text>
            </view>
          </view>
        </view>
        <!-- 底部安全区 -->
        <view class="list-bottom-safe" />
      </scroll-view>

      <!-- 空状态 -->
      <view v-else class="empty-state">
        <view class="empty-icon-wrap">
          <text class="empty-icon">💬</text>
        </view>
        <text class="empty-title">暂时没有留言</text>
        <text class="empty-desc">
          {{ activeTab === 'unread' ? '没有未读留言，已全部查看 ✓' : '当拾到者扫描你的二维码并留言后，消息会出现在这里' }}
        </text>
        <view v-if="activeTab === 'unread'" class="empty-switch-btn" @tap="switchTab('all')">
          <text class="empty-switch-text">查看全部留言</text>
        </view>
      </view>
    </view>

    <!-- ───────────── 留言详情浮层 ───────────── -->
    <view v-if="detailVisible" class="overlay" @tap.stop="closeDetail" />

    <view
      class="detail-panel"
      :class="{ 'detail-panel--visible': detailVisible }"
    >
      <view v-if="activeMsg" class="detail-inner">
        <!-- 拖动条 -->
        <view class="detail-drag-bar" />

        <!-- 顶部：物品信息 + 关闭 -->
        <view class="detail-header">
          <view class="detail-item-info">
            <view
              class="detail-item-icon"
              :style="{ background: getItemColor(activeMsg) }"
            >
              <text class="detail-item-icon-emoji">{{ getItemIcon(activeMsg) }}</text>
            </view>
            <view class="detail-item-text">
              <text class="detail-item-label">{{ activeMsg.qrCode?.label || '未知物品' }}</text>
              <text class="detail-item-time">{{ formatFullTime(activeMsg.createdAt) }}</text>
            </view>
          </view>
          <view class="detail-close-btn" @tap="closeDetail">
            <text class="detail-close-icon">✕</text>
          </view>
        </view>

        <!-- 留言正文 -->
        <view class="detail-message-wrap">
          <text class="detail-message-text">{{ activeMsg.message }}</text>
        </view>

        <!-- 留言者信息 -->
        <view class="detail-finder-card">
          <view class="detail-finder-row">
            <text class="detail-finder-key">留言者</text>
            <text class="detail-finder-val">
              {{ activeMsg.finderName || '匿名好心人 🙏' }}
            </text>
          </view>
          <view v-if="activeMsg.finderContact" class="detail-divider" />
          <view v-if="activeMsg.finderContact" class="detail-finder-row">
            <text class="detail-finder-key">联系方式</text>
            <text
              class="detail-finder-val detail-finder-val--contact"
              @tap="copyContact(activeMsg.finderContact!)"
            >
              {{ activeMsg.finderContact }}
              <text class="detail-copy-hint"> 点击复制</text>
            </text>
          </view>
          <view v-else class="detail-finder-row">
            <text class="detail-finder-key">联系方式</text>
            <text class="detail-finder-val detail-finder-val--empty">未留联系方式</text>
          </view>
        </view>

        <!-- 未读时的标记已读按钮 -->
        <view
          v-if="!activeMsg.isRead"
          class="detail-read-btn"
          :class="{ 'detail-read-btn--loading': markingRead }"
          @tap="onMarkAsRead"
        >
          <view v-if="markingRead" class="detail-spinner" />
          <text v-else class="detail-read-icon">✓</text>
          <text class="detail-read-text">{{ markingRead ? '标记中...' : '标记为已读' }}</text>
        </view>

        <!-- 已读时的提示 -->
        <view v-else class="detail-read-badge">
          <text class="detail-read-badge-icon">✓</text>
          <text class="detail-read-badge-text">已读</text>
        </view>

        <!-- 底部安全区 -->
        <view class="detail-safe-bottom" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { useAuthStore } from '@/stores/auth'
import { useMessagesStore } from '@/stores/messages'
import type { ContactMessage } from '@/types'

// ─── Store ────────────────────────────────────────────────────────────────────

const auth = useAuthStore()
const msgStore = useMessagesStore()

// ─── 状态 ─────────────────────────────────────────────────────────────────────

/** 当前激活的 Tab：全部 / 未读 */
const activeTab = ref<'all' | 'unread'>('all')

/** 下拉刷新触发状态 */
const refreshing = ref(false)

/** 留言详情浮层是否可见 */
const detailVisible = ref(false)

/** 当前展开的留言 */
const activeMsg = ref<ContactMessage | null>(null)

/** 是否正在标记已读 */
const markingRead = ref(false)

// ─── 计算属性 ─────────────────────────────────────────────────────────────────

/**
 * 根据 activeTab 过滤显示的消息列表
 * 后端排序：最新在前（createdAt DESC）
 */
const displayList = computed(() => {
  if (activeTab.value === 'unread') {
    return msgStore.list.filter((m) => !m.isRead)
  }
  return msgStore.list
})

// ─── 格式化工具 ───────────────────────────────────────────────────────────────

/**
 * 格式化为相对时间文字
 * 今天显示 HH:mm，本周显示周几，更早显示 MM-DD
 */
function formatTime(dateStr: string): string {
  const now = new Date()
  const d = new Date(dateStr)
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  const diffHour = Math.floor(diffMs / 3_600_000)
  const diffDay = Math.floor(diffMs / 86_400_000)

  if (diffMin < 1) return '刚刚'
  if (diffMin < 60) return `${diffMin} 分钟前`
  if (diffHour < 24) return `${diffHour} 小时前`
  if (diffDay < 7) return `${diffDay} 天前`

  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  return `${mo}-${da}`
}

/**
 * 格式化为完整时间（详情面板用）
 */
function formatFullTime(dateStr: string): string {
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${y}年${mo}月${da}日 ${h}:${mi}`
}

// ─── 物品信息辅助 ────────────────────────────────────────────────────────────

/** 获取留言对应物品的主题色（无则用主色蓝） */
function getItemColor(msg: ContactMessage): string {
  return (msg.qrCode as any)?.color || '#3B82F6'
}

/** 获取留言对应物品的 Emoji 图标（无则用默认标签） */
function getItemIcon(msg: ContactMessage): string {
  return (msg.qrCode as any)?.icon || '🏷️'
}

// ─── Tab 切换 ────────────────────────────────────────────────────────────────

async function switchTab(tab: 'all' | 'unread') {
  if (activeTab.value === tab) return
  activeTab.value = tab
  await loadMessages()
}

// ─── 数据加载 ─────────────────────────────────────────────────────────────────

/**
 * 加载消息列表和未读数
 * unreadOnly 根据当前 Tab 决定
 */
async function loadMessages() {
  try {
    await Promise.all([
      msgStore.fetchList(activeTab.value === 'unread' ? true : undefined),
      msgStore.fetchUnreadCount(),
    ])
  } catch (err: any) {
    const msg = err?.message || '加载失败，请重试'
    uni.showToast({ title: msg, icon: 'none', duration: 2000 })
  }
}

// ─── 留言详情操作 ────────────────────────────────────────────────────────────

/** 点击消息卡片，展开详情浮层 */
async function onClickMessage(msg: ContactMessage) {
  activeMsg.value = msg
  detailVisible.value = true

  // 若未读，自动标记已读
  if (!msg.isRead) {
    await autoMarkRead(msg)
  }
}

/** 关闭详情浮层 */
function closeDetail() {
  detailVisible.value = false
  // 稍微延迟后清除数据，避免浮层收起动画中内容闪消
  setTimeout(() => {
    activeMsg.value = null
  }, 300)
}

/** 自动标记已读（不弹 toast，静默处理） */
async function autoMarkRead(msg: ContactMessage) {
  try {
    await msgStore.markAsRead(msg.id)
    // 本地同步更新，不再等下次刷新
    const found = msgStore.list.find((m) => m.id === msg.id)
    if (found) found.isRead = true
    if (activeMsg.value?.id === msg.id) {
      activeMsg.value = { ...activeMsg.value, isRead: true }
    }
  } catch {
    // 静默失败，不打扰用户
  }
}

/** 手动点击"标记为已读"按钮 */
async function onMarkAsRead() {
  if (!activeMsg.value || markingRead.value) return
  markingRead.value = true
  try {
    await msgStore.markAsRead(activeMsg.value.id)
    // 本地同步
    const found = msgStore.list.find((m) => m.id === activeMsg.value!.id)
    if (found) found.isRead = true
    activeMsg.value = { ...activeMsg.value, isRead: true }
    uni.showToast({ title: '已标记为已读', icon: 'success' })
  } catch (err: any) {
    const msg = err?.message || '操作失败，请重试'
    uni.showToast({ title: msg, icon: 'none', duration: 2000 })
  } finally {
    markingRead.value = false
  }
}

/** 复制联系方式 */
function copyContact(contact: string) {
  uni.setClipboardData({
    data: contact,
    success: () => {
      uni.showToast({ title: '联系方式已复制', icon: 'success' })
    },
  })
}

// ─── 下拉刷新 ────────────────────────────────────────────────────────────────

onPullDownRefresh(async () => {
  refreshing.value = true
  try {
    await loadMessages()
  } finally {
    refreshing.value = false
    uni.stopPullDownRefresh()
  }
})

// ─── 生命周期 ─────────────────────────────────────────────────────────────────

/** 每次页面显示时刷新（从 detail 返回、切换 TabBar 等） */
onShow(async () => {
  if (!auth.isLoggedIn) {
    uni.reLaunch({ url: '/pages/login/index' })
    return
  }
  await loadMessages()
})
</script>

<style scoped lang="scss">
// ─── 页面根容器 ───────────────────────────────────────────────────────────────

.page {
  min-height: 100vh;
  background: #f5f7fa;
  position: relative;
}

// ─── 顶部 Header ─────────────────────────────────────────────────────────────

.header {
  background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
  padding-bottom: 0;
}

.header__inner {
  padding: 100rpx 40rpx 0;
}

.header__title-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 10rpx;
}

.header__title {
  font-size: 44rpx;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: 1rpx;
}

.header__badge {
  background: #ef4444;
  border-radius: 100rpx;
  padding: 4rpx 16rpx;
  min-width: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3rpx solid rgba(255, 255, 255, 0.4);
}

.header__badge-text {
  font-size: 22rpx;
  color: #ffffff;
  font-weight: 700;
  line-height: 1;
}

.header__sub {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.72);
  margin-bottom: 36rpx;
  display: block;
}

// ─── Tab 切换栏 ───────────────────────────────────────────────────────────────

.tab-bar {
  display: flex;
  align-items: flex-end;
  gap: 0;
}

.tab-item {
  position: relative;
  padding: 0 4rpx 28rpx;
  margin-right: 48rpx;
  display: flex;
  align-items: center;
  gap: 10rpx;
  cursor: pointer;

  &:active {
    opacity: 0.7;
  }
}

.tab-text {
  font-size: 30rpx;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.6);
  transition: color 0.2s, font-weight 0.2s;

  .tab-item--active & {
    color: #ffffff;
    font-weight: 700;
    font-size: 32rpx;
  }
}

.tab-unread-badge {
  background: #ef4444;
  border-radius: 100rpx;
  font-size: 20rpx;
  color: #ffffff;
  font-weight: 700;
  padding: 2rpx 12rpx;
  line-height: 1.3;
}

.tab-indicator {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 6rpx;
  background: #ffffff;
  border-radius: 100rpx 100rpx 0 0;
}

// ─── 内容区域 ────────────────────────────────────────────────────────────────

.body {
  margin-top: -2rpx;
  background: #f5f7fa;
  border-radius: 32rpx 32rpx 0 0;
  min-height: 70vh;
  padding-top: 8rpx;
}

// ─── 骨架屏 ──────────────────────────────────────────────────────────────────

.skeleton-list {
  padding: 24rpx 32rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.skeleton-card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 28rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.skeleton-avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: #e2e8f0;
  flex-shrink: 0;
}

.skeleton-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.skeleton-line {
  border-radius: 8rpx;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 400% 100%;
  animation: skeleton-shimmer 1.4s ease-in-out infinite;

  &--tag   { height: 28rpx; width: 30%; border-radius: 100rpx; }
  &--main  { height: 32rpx; width: 90%; }
  &--sub   { height: 24rpx; width: 55%; }
}

@keyframes skeleton-shimmer {
  0%   { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}

.skeleton-dot {
  width: 24rpx;
  height: 24rpx;
  border-radius: 50%;
  background: #e2e8f0;
  flex-shrink: 0;
}

// ─── 消息滚动容器 ─────────────────────────────────────────────────────────────

.msg-scroll {
  height: calc(100vh - 340rpx); // 340rpx ≈ header 高度
}

.msg-list {
  padding: 24rpx 32rpx 0;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.list-bottom-safe {
  height: calc(40rpx + env(safe-area-inset-bottom));
}

// ─── 消息卡片 ────────────────────────────────────────────────────────────────

.msg-card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 28rpx;
  display: flex;
  align-items: flex-start;
  gap: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
  position: relative;
  transition: opacity 0.15s, transform 0.15s;

  &:active {
    opacity: 0.8;
    transform: scale(0.99);
  }

  // 未读消息左边蓝色竖条
  &--unread::before {
    content: '';
    position: absolute;
    left: 0;
    top: 20rpx;
    bottom: 20rpx;
    width: 6rpx;
    background: linear-gradient(135deg, #3b82f6, #6366f1);
    border-radius: 0 4rpx 4rpx 0;
  }
}

// ─── 左侧头像 ────────────────────────────────────────────────────────────────

.msg-avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.12);
}

.msg-avatar-emoji {
  font-size: 40rpx;
  line-height: 1;
}

// ─── 中间主体内容 ─────────────────────────────────────────────────────────────

.msg-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

// 物品名称标签
.msg-item-tag {
  display: inline-flex;
  align-self: flex-start;
  background: #eff6ff;
  border: 1rpx solid #bfdbfe;
  border-radius: 100rpx;
  padding: 4rpx 16rpx;
}

.msg-item-tag-text {
  font-size: 22rpx;
  color: #3b82f6;
  font-weight: 600;
  white-space: nowrap;
}

// 留言正文（最多两行）
.msg-content {
  font-size: 28rpx;
  color: #1e293b;
  line-height: 1.6;
  // 超过两行省略
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  word-break: break-all;
}

// 底部元信息
.msg-meta {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.msg-finder {
  font-size: 22rpx;
  color: #64748b;
  white-space: nowrap;
  max-width: 160rpx;
  overflow: hidden;
  text-overflow: ellipsis;

  &--anon {
    color: #94a3b8;
    font-style: italic;
  }
}

.msg-meta-dot {
  width: 6rpx;
  height: 6rpx;
  border-radius: 50%;
  background: #cbd5e1;
  flex-shrink: 0;
}

.msg-time {
  font-size: 22rpx;
  color: #94a3b8;
  white-space: nowrap;
}

// ─── 右侧状态 ────────────────────────────────────────────────────────────────

.msg-status {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 4rpx;
}

// 未读红点
.unread-dot {
  width: 20rpx;
  height: 20rpx;
  border-radius: 50%;
  background: #ef4444;
  box-shadow: 0 0 0 5rpx rgba(239, 68, 68, 0.2);
}

// 已读勾
.read-check {
  font-size: 28rpx;
  color: #cbd5e1;
  font-weight: 700;
  line-height: 1;
}

// ─── 空状态 ──────────────────────────────────────────────────────────────────

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 60rpx 80rpx;
  gap: 24rpx;
}

.empty-icon-wrap {
  width: 180rpx;
  height: 180rpx;
  background: linear-gradient(135deg, #eff6ff, #e0e7ff);
  border-radius: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8rpx;
  box-shadow: 0 12rpx 40rpx rgba(99, 102, 241, 0.15);
}

.empty-icon {
  font-size: 88rpx;
  line-height: 1;
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
}

.empty-switch-btn {
  margin-top: 8rpx;
  background: #eff6ff;
  border: 2rpx solid #bfdbfe;
  border-radius: 100rpx;
  padding: 20rpx 52rpx;

  &:active {
    opacity: 0.7;
  }
}

.empty-switch-text {
  font-size: 28rpx;
  color: #3b82f6;
  font-weight: 600;
}

// ─── 详情浮层遮罩 ────────────────────────────────────────────────────────────

.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 100;
  backdrop-filter: blur(2rpx);
}

// ─── 详情浮层面板（底部抽屉样式） ────────────────────────────────────────────

.detail-panel {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 101;
  // 默认隐藏在屏幕底部以外
  transform: translateY(110%);
  transition: transform 0.32s cubic-bezier(0.32, 1, 0.4, 1);
  border-radius: 48rpx 48rpx 0 0;
  background: #ffffff;
  box-shadow: 0 -8rpx 40rpx rgba(0, 0, 0, 0.15);
  overflow: hidden;

  &--visible {
    transform: translateY(0);
  }
}

.detail-inner {
  padding: 0 40rpx;
  padding-bottom: calc(60rpx + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 28rpx;
}

// 顶部拖动条
.detail-drag-bar {
  width: 80rpx;
  height: 8rpx;
  background: #e2e8f0;
  border-radius: 100rpx;
  margin: 24rpx auto 8rpx;
  flex-shrink: 0;
}

// ─── 详情面板 Header ─────────────────────────────────────────────────────────

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.detail-item-info {
  display: flex;
  align-items: center;
  gap: 20rpx;
  flex: 1;
  min-width: 0;
}

.detail-item-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.12);
}

.detail-item-icon-emoji {
  font-size: 38rpx;
  line-height: 1;
}

.detail-item-text {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}

.detail-item-label {
  font-size: 32rpx;
  font-weight: 700;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.detail-item-time {
  font-size: 22rpx;
  color: #94a3b8;
}

.detail-close-btn {
  width: 68rpx;
  height: 68rpx;
  background: #f1f5f9;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-left: 16rpx;

  &:active {
    background: #e2e8f0;
  }
}

.detail-close-icon {
  font-size: 28rpx;
  color: #64748b;
  line-height: 1;
}

// ─── 留言正文区 ───────────────────────────────────────────────────────────────

.detail-message-wrap {
  background: #f8fafc;
  border-radius: 24rpx;
  padding: 32rpx;
  border: 1rpx solid #e2e8f0;
}

.detail-message-text {
  font-size: 30rpx;
  color: #1e293b;
  line-height: 1.8;
  word-break: break-all;
  white-space: pre-wrap;
}

// ─── 留言者信息卡 ────────────────────────────────────────────────────────────

.detail-finder-card {
  background: #f8fafc;
  border-radius: 24rpx;
  border: 1rpx solid #e2e8f0;
  overflow: hidden;
}

.detail-finder-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  gap: 16rpx;
}

.detail-divider {
  height: 1rpx;
  background: #e2e8f0;
  margin: 0 32rpx;
}

.detail-finder-key {
  font-size: 26rpx;
  color: #64748b;
  font-weight: 500;
  flex-shrink: 0;
}

.detail-finder-val {
  font-size: 28rpx;
  color: #1e293b;
  font-weight: 600;
  text-align: right;
  word-break: break-all;

  // 可点击复制的联系方式
  &--contact {
    color: #3b82f6;
    text-decoration: underline;
    text-decoration-color: rgba(59, 130, 246, 0.3);
  }

  // 未留联系方式
  &--empty {
    color: #94a3b8;
    font-weight: 400;
    font-style: italic;
  }
}

.detail-copy-hint {
  font-size: 22rpx;
  color: #94a3b8;
  font-weight: 400;
  font-style: normal;
  text-decoration: none;
}

// ─── 标记已读按钮 ─────────────────────────────────────────────────────────────

.detail-read-btn {
  height: 96rpx;
  background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  box-shadow: 0 8rpx 24rpx rgba(59, 130, 246, 0.35);
  transition: opacity 0.15s, transform 0.15s;

  &:active {
    opacity: 0.88;
    transform: scale(0.98);
  }

  &--loading {
    opacity: 0.75;
    pointer-events: none;
  }
}

.detail-read-icon {
  font-size: 32rpx;
  color: #ffffff;
  line-height: 1;
  font-weight: 700;
}

.detail-read-text {
  font-size: 32rpx;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 1rpx;
}

// 加载旋转动画
.detail-spinner {
  width: 36rpx;
  height: 36rpx;
  border: 4rpx solid rgba(255, 255, 255, 0.35);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.75s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

// ─── 已读徽章 ────────────────────────────────────────────────────────────────

.detail-read-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  background: #f0fdf4;
  border: 1rpx solid #bbf7d0;
  border-radius: 24rpx;
  height: 80rpx;
}

.detail-read-badge-icon {
  font-size: 28rpx;
  color: #22c55e;
  font-weight: 800;
  line-height: 1;
}

.detail-read-badge-text {
  font-size: 28rpx;
  color: #16a34a;
  font-weight: 600;
}

// ─── 详情面板底部安全区 ───────────────────────────────────────────────────────

.detail-safe-bottom {
  height: calc(16rpx + env(safe-area-inset-bottom));
}
</style>
