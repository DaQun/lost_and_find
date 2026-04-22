<template>
  <view class="page">
    <!-- 顶部背景装饰 -->
    <view class="header-bg">
      <view class="header-bg__circle header-bg__circle--1" />
      <view class="header-bg__circle header-bg__circle--2" />
    </view>

    <!-- 用户信息卡片 -->
    <view class="user-card">
      <!-- 头像区 -->
      <view class="user-card__avatar-wrap">
        <view class="user-card__avatar">
          <text v-if="!auth.user?.avatarUrl" class="user-card__avatar-initial">
            {{ avatarInitial }}
          </text>
          <image
            v-else
            :src="auth.user.avatarUrl"
            class="user-card__avatar-img"
            mode="aspectFill"
          />
        </view>
        <!-- 在线状态绿点 -->
        <view class="user-card__online-dot" />
      </view>

      <!-- 昵称 & 手机号 -->
      <view class="user-card__info">
        <text class="user-card__nickname">{{ displayName }}</text>
        <text class="user-card__phone">{{ maskedPhone }}</text>
      </view>

      <!-- 编辑昵称快捷按钮 -->
      <view class="user-card__edit-btn" @tap="onEditNickname">
        <text class="user-card__edit-icon">✏️</text>
      </view>
    </view>

    <!-- 统计数据行 -->
    <view class="stats-row">
      <view class="stats-item">
        <text class="stats-value">{{ qrStore.list.length }}</text>
        <text class="stats-label">物品总数</text>
      </view>
      <view class="stats-divider" />
      <view class="stats-item">
        <text class="stats-value">{{ totalScanCount }}</text>
        <text class="stats-label">累计被扫</text>
      </view>
      <view class="stats-divider" />
      <view class="stats-item">
        <text class="stats-value">{{ activeCount }}</text>
        <text class="stats-label">启用中</text>
      </view>
    </view>

    <!-- 功能菜单 -->
    <view class="menu-section">
      <text class="menu-section__title">设置</text>

      <view class="menu-card">
        <!-- 编辑资料 -->
        <view class="menu-item" @tap="onEditNickname">
          <view class="menu-item__left">
            <view class="menu-item__icon-wrap menu-item__icon-wrap--blue">
              <text class="menu-item__icon">📝</text>
            </view>
            <text class="menu-item__label">编辑资料</text>
          </view>
          <text class="menu-item__arrow">›</text>
        </view>

        <view class="menu-divider" />

        <!-- 我的统计 -->
        <view class="menu-item" @tap="onShowStats">
          <view class="menu-item__left">
            <view class="menu-item__icon-wrap menu-item__icon-wrap--purple">
              <text class="menu-item__icon">📊</text>
            </view>
            <text class="menu-item__label">我的统计</text>
          </view>
          <text class="menu-item__arrow">›</text>
        </view>

        <view class="menu-divider" />

        <!-- 通知设置 -->
        <view class="menu-item menu-item--disabled">
          <view class="menu-item__left">
            <view class="menu-item__icon-wrap menu-item__icon-wrap--orange">
              <text class="menu-item__icon">🔔</text>
            </view>
            <text class="menu-item__label">通知设置</text>
          </view>
          <view class="menu-item__right-group">
            <text class="menu-item__coming-soon">即将开放</text>
            <text class="menu-item__arrow menu-item__arrow--muted">›</text>
          </view>
        </view>

        <view class="menu-divider" />

        <!-- 关于 App -->
        <view class="menu-item" @tap="onAbout">
          <view class="menu-item__left">
            <view class="menu-item__icon-wrap menu-item__icon-wrap--teal">
              <text class="menu-item__icon">ℹ️</text>
            </view>
            <text class="menu-item__label">关于 App</text>
          </view>
          <view class="menu-item__right-group">
            <text class="menu-item__version">v{{ APP_VERSION }}</text>
            <text class="menu-item__arrow">›</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 账号安全区块 -->
    <view class="menu-section">
      <text class="menu-section__title">账号</text>

      <view class="menu-card">
        <!-- 账号安全（占位，后续扩展） -->
        <view class="menu-item menu-item--disabled">
          <view class="menu-item__left">
            <view class="menu-item__icon-wrap menu-item__icon-wrap--green">
              <text class="menu-item__icon">🔐</text>
            </view>
            <text class="menu-item__label">账号安全</text>
          </view>
          <view class="menu-item__right-group">
            <text class="menu-item__coming-soon">即将开放</text>
            <text class="menu-item__arrow menu-item__arrow--muted">›</text>
          </view>
        </view>

        <view class="menu-divider" />

        <!-- 注销账号 -->
        <view class="menu-item" @tap="onDeleteAccount">
          <view class="menu-item__left">
            <view class="menu-item__icon-wrap menu-item__icon-wrap--red-light">
              <text class="menu-item__icon">🗑</text>
            </view>
            <text class="menu-item__label menu-item__label--danger">注销账号</text>
          </view>
          <text class="menu-item__arrow menu-item__arrow--danger">›</text>
        </view>
      </view>
    </view>

    <!-- 退出登录按钮 -->
    <view class="logout-section">
      <view class="logout-btn" @tap="onLogout">
        <text class="logout-btn__icon">🚪</text>
        <text class="logout-btn__text">退出登录</text>
      </view>
      <text class="logout-hint">退出后仍可凭手机号重新登录</text>
    </view>

    <!-- 底部版权信息 -->
    <view class="footer">
      <text class="footer__logo">🔍 Lost & Find</text>
      <text class="footer__copy">用科技守护你的珍贵物品</text>
      <text class="footer__version">Version {{ APP_VERSION }} · Build 2025</text>
    </view>

    <!-- 底部安全区留白 -->
    <view class="safe-bottom" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useAuthStore } from '@/stores/auth'
import { useQrCodesStore } from '@/stores/qrcodes'

// ─── 常量 ─────────────────────────────────────────────────────────────────────

const APP_VERSION = '1.0.0'

// ─── Store ────────────────────────────────────────────────────────────────────

const auth = useAuthStore()
const qrStore = useQrCodesStore()

// ─── 状态 ─────────────────────────────────────────────────────────────────────

/** 是否正在提交编辑昵称请求 */
const savingNickname = ref(false)

// ─── 计算属性 ─────────────────────────────────────────────────────────────────

/** 显示名称：昵称 > 脱敏手机号 > "用户" */
const displayName = computed(() => {
  if (auth.user?.nickname) return auth.user.nickname
  if (auth.user?.phone) return maskPhone(auth.user.phone)
  return '用户'
})

/** 头像首字（用于无头像时的占位文字） */
const avatarInitial = computed(() => {
  const name = auth.user?.nickname || auth.user?.phone || '?'
  // 取第一个字符，对于中文姓名取第一个字
  return name.charAt(0).toUpperCase()
})

/** 手机号脱敏，格式：138****8888 */
const maskedPhone = computed(() => {
  const phone = auth.user?.phone
  if (!phone) return auth.user?.email || '未绑定手机号'
  if (phone.length < 7) return phone
  return phone.slice(0, 3) + '****' + phone.slice(-4)
})

/** 累计扫码次数 */
const totalScanCount = computed(() =>
  qrStore.list.reduce((sum, item) => sum + (item.scanCount || 0), 0),
)

/** 启用中的物品数量 */
const activeCount = computed(() => qrStore.list.filter((item) => item.isActive).length)

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

/**
 * 将手机号脱敏显示
 * 例如：13812345678 → 138****5678
 */
function maskPhone(phone: string): string {
  if (phone.length < 7) return phone
  return phone.slice(0, 3) + '****' + phone.slice(-4)
}

// ─── 编辑昵称 ────────────────────────────────────────────────────────────────

/**
 * 弹出输入框让用户修改昵称
 * 使用 uni.showModal 的 editable 模式（仅部分平台支持），
 * 降级处理时通过提示引导用户操作
 */
function onEditNickname() {
  // uni.showModal 在各平台有不同支持程度
  // 这里使用标准 showModal + 说明文字简单实现
  uni.showModal({
    title: '✏️ 修改昵称',
    content: '请输入新昵称（2-20个字符）',
    editable: true,
    placeholderText: auth.user?.nickname || '请输入昵称',
    confirmText: '保存',
    cancelText: '取消',
    success: async (res) => {
      if (!res.confirm) return

      const newNickname = res.content?.trim() ?? ''

      // 基本校验
      if (!newNickname) {
        uni.showToast({ title: '昵称不能为空', icon: 'none' })
        return
      }
      if (newNickname.length < 2) {
        uni.showToast({ title: '昵称至少 2 个字符', icon: 'none' })
        return
      }
      if (newNickname.length > 20) {
        uni.showToast({ title: '昵称不超过 20 个字符', icon: 'none' })
        return
      }

      // 若昵称未变，不请求接口
      if (newNickname === auth.user?.nickname) {
        uni.showToast({ title: '昵称未变更', icon: 'none' })
        return
      }

      await saveNickname(newNickname)
    },
  })
}

/** 调用 API 保存昵称 */
async function saveNickname(nickname: string) {
  if (savingNickname.value) return
  savingNickname.value = true
  uni.showLoading({ title: '保存中...', mask: true })

  try {
    // 通过 fetch 直接调用 PATCH /users/me
    // auth store 通常不封装 updateProfile，这里直接调用 API
    const res = await uni.request({
      url: `${getApiBase()}/users/me`,
      method: 'PATCH',
      header: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.accessToken}`,
      },
      data: { nickname },
    })

    if ((res as any).statusCode >= 400) {
      throw new Error('保存失败，请重试')
    }

    // 乐观更新本地 user 对象（直接修改属性，避免整体替换带来的 Pinia 类型问题）
    if (auth.user) {
      auth.user.nickname = nickname
    }

    uni.hideLoading()
    uni.showToast({ title: '昵称已更新 ✓', icon: 'success' })
  } catch (err: any) {
    uni.hideLoading()
    const msg = err?.message || '保存失败，请重试'
    uni.showToast({ title: msg, icon: 'none', duration: 2000 })
  } finally {
    savingNickname.value = false
  }
}

// ─── 我的统计弹窗 ─────────────────────────────────────────────────────────────

function onShowStats() {
  const total = qrStore.list.length
  const active = activeCount.value
  const inactive = total - active
  const scans = totalScanCount.value

  uni.showModal({
    title: '📊 我的统计',
    content: [
      `📦 物品总数：${total} 个`,
      `✅ 启用中：${active} 个`,
      `⏸ 已停用：${inactive} 个`,
      `👁 累计被扫：${scans} 次`,
      '',
      '感谢你使用 Lost & Find 守护你的物品！',
    ].join('\n'),
    showCancel: false,
    confirmText: '知道了',
  })
}

// ─── 关于 App ─────────────────────────────────────────────────────────────────

function onAbout() {
  uni.showModal({
    title: '🔍 关于 Lost & Find',
    content: [
      `版本：v${APP_VERSION}`,
      '',
      'Lost & Find 是一款二维码失物招领 App。',
      '将二维码贴在你的物品上，万一丢失，拾到者扫码即可联系你，无需暴露手机号。',
      '',
      '🔒 保护隐私  📱 多端支持  🌏 即时通知',
    ].join('\n'),
    showCancel: false,
    confirmText: '好的',
  })
}

// ─── 注销账号 ────────────────────────────────────────────────────────────────

function onDeleteAccount() {
  uni.showModal({
    title: '⚠️ 注销账号',
    content:
      '注销账号将永久删除你的所有数据，包括：\n\n• 所有二维码\n• 所有扫码记录\n• 所有留言消息\n\n此操作不可撤销，请谨慎操作。',
    confirmText: '确认注销',
    confirmColor: '#EF4444',
    cancelText: '再想想',
    success: (res) => {
      if (!res.confirm) return
      // 二次确认，防止误触
      uni.showModal({
        title: '最后确认',
        content: '你确定要注销账号吗？所有数据将被永久清除。',
        confirmText: '确认删除',
        confirmColor: '#EF4444',
        cancelText: '取消',
        success: async (res2) => {
          if (!res2.confirm) return
          await doDeleteAccount()
        },
      })
    },
  })
}

async function doDeleteAccount() {
  uni.showLoading({ title: '注销中...', mask: true })
  try {
    await uni.request({
      url: `${getApiBase()}/users/me`,
      method: 'DELETE',
      header: { Authorization: `Bearer ${auth.accessToken}` },
    })
    uni.hideLoading()
    uni.showToast({ title: '账号已注销', icon: 'success' })
    // 清除本地登录状态并跳转登录页
    await auth.logout()
    setTimeout(() => {
      uni.reLaunch({ url: '/pages/login/index' })
    }, 1000)
  } catch (err: any) {
    uni.hideLoading()
    const msg = err?.message || '注销失败，请重试'
    uni.showToast({ title: msg, icon: 'none', duration: 2000 })
  }
}

// ─── 退出登录 ────────────────────────────────────────────────────────────────

function onLogout() {
  uni.showModal({
    title: '退出登录',
    content: '确认退出当前账号？退出后你可以随时重新登录。',
    confirmText: '退出',
    confirmColor: '#EF4444',
    cancelText: '取消',
    success: async (res) => {
      if (!res.confirm) return
      await doLogout()
    },
  })
}

async function doLogout() {
  uni.showLoading({ title: '退出中...', mask: true })
  try {
    await auth.logout()
    uni.hideLoading()
    uni.showToast({ title: '已退出登录', icon: 'success' })
    setTimeout(() => {
      uni.reLaunch({ url: '/pages/login/index' })
    }, 800)
  } catch (err: any) {
    uni.hideLoading()
    // 即使接口失败，本地也清除 token 并跳转
    uni.reLaunch({ url: '/pages/login/index' })
  }
}

// ─── 工具：获取 API base ──────────────────────────────────────────────────────

function getApiBase(): string {
  // 从环境变量读取，fallback 到本地开发地址
  // @ts-ignore
  return (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL)
    || 'http://localhost:3000/api/v1'
}

// ─── 生命周期 ─────────────────────────────────────────────────────────────────

/**
 * 每次页面显示时刷新数据
 * 例如：从编辑页返回后需要更新显示
 */
onShow(async () => {
  if (!auth.isLoggedIn) {
    uni.reLaunch({ url: '/pages/login/index' })
    return
  }

  // 静默刷新物品列表（获取最新统计数据）
  try {
    await qrStore.fetchList()
  } catch {
    // 静默失败，不打扰用户
  }
})
</script>

<style scoped lang="scss">
// ─── 页面根容器 ───────────────────────────────────────────────────────────────

.page {
  min-height: 100vh;
  background: #f5f7fa;
  position: relative;
}

// ─── 顶部背景装饰 ────────────────────────────────────────────────────────────

.header-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 440rpx;
  background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
  border-radius: 0 0 60rpx 60rpx;
  overflow: hidden;
  z-index: 0;
}

// 背景装饰圆（产生层次感）
.header-bg__circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);

  &--1 {
    width: 500rpx;
    height: 500rpx;
    right: -150rpx;
    top: -180rpx;
  }

  &--2 {
    width: 300rpx;
    height: 300rpx;
    left: -80rpx;
    bottom: 40rpx;
  }
}

// ─── 用户信息卡片 ─────────────────────────────────────────────────────────────

.user-card {
  position: relative;
  z-index: 1;
  margin: calc(100rpx + env(safe-area-inset-top)) 32rpx 0;
  background: rgba(255, 255, 255, 0.18);
  border: 1rpx solid rgba(255, 255, 255, 0.3);
  border-radius: 40rpx;
  padding: 36rpx 36rpx 36rpx 36rpx;
  display: flex;
  align-items: center;
  gap: 28rpx;
  backdrop-filter: blur(16rpx);
}

// 头像
.user-card__avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.user-card__avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(255,255,255,0.35), rgba(255,255,255,0.15));
  border: 4rpx solid rgba(255, 255, 255, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.15);
}

.user-card__avatar-initial {
  font-size: 56rpx;
  font-weight: 700;
  color: #ffffff;
  line-height: 1;
}

.user-card__avatar-img {
  width: 100%;
  height: 100%;
}

// 在线状态绿点
.user-card__online-dot {
  position: absolute;
  bottom: 4rpx;
  right: 4rpx;
  width: 24rpx;
  height: 24rpx;
  background: #22c55e;
  border-radius: 50%;
  border: 4rpx solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 2rpx 8rpx rgba(34, 197, 94, 0.4);
}

// 昵称 & 手机号
.user-card__info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  min-width: 0;
}

.user-card__nickname {
  font-size: 40rpx;
  font-weight: 800;
  color: #ffffff;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.12);
}

.user-card__phone {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.75);
  letter-spacing: 1rpx;
}

// 编辑按钮
.user-card__edit-btn {
  flex-shrink: 0;
  width: 68rpx;
  height: 68rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;

  &:active {
    background: rgba(255, 255, 255, 0.35);
  }
}

.user-card__edit-icon {
  font-size: 30rpx;
  line-height: 1;
}

// ─── 统计数据行 ───────────────────────────────────────────────────────────────

.stats-row {
  position: relative;
  z-index: 1;
  margin: 24rpx 32rpx 0;
  background: #ffffff;
  border-radius: 28rpx;
  padding: 32rpx 0;
  display: flex;
  align-items: center;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.06);
}

.stats-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.stats-value {
  font-size: 52rpx;
  font-weight: 800;
  color: #1e293b;
  line-height: 1;
  letter-spacing: -1rpx;
}

.stats-label {
  font-size: 22rpx;
  color: #94a3b8;
  font-weight: 500;
}

.stats-divider {
  width: 1rpx;
  height: 60rpx;
  background: #e2e8f0;
}

// ─── 菜单区块 ────────────────────────────────────────────────────────────────

.menu-section {
  margin: 36rpx 32rpx 0;
}

.menu-section__title {
  display: block;
  font-size: 24rpx;
  font-weight: 700;
  color: #94a3b8;
  letter-spacing: 2rpx;
  text-transform: uppercase;
  margin-bottom: 16rpx;
  padding-left: 4rpx;
}

.menu-card {
  background: #ffffff;
  border-radius: 28rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.04);
}

// ─── 单个菜单项 ───────────────────────────────────────────────────────────────

.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx;
  transition: background 0.15s;

  &:active {
    background: #f8fafc;
  }

  // 禁用（即将开放）状态
  &--disabled {
    pointer-events: none;
    opacity: 0.75;
  }
}

.menu-item__left {
  display: flex;
  align-items: center;
  gap: 24rpx;
  flex: 1;
  min-width: 0;
}

// 图标容器（各色背景）
.menu-item__icon-wrap {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &--blue      { background: #eff6ff; }
  &--purple    { background: #f5f3ff; }
  &--orange    { background: #fff7ed; }
  &--teal      { background: #f0fdfa; }
  &--green     { background: #f0fdf4; }
  &--red-light { background: #fff5f5; }
}

.menu-item__icon {
  font-size: 34rpx;
  line-height: 1;
}

.menu-item__label {
  font-size: 30rpx;
  font-weight: 600;
  color: #1e293b;

  // 危险操作（注销账号）使用红色
  &--danger {
    color: #ef4444;
  }
}

// 右侧箭头
.menu-item__arrow {
  font-size: 44rpx;
  color: #cbd5e1;
  font-weight: 300;
  line-height: 1;
  flex-shrink: 0;

  &--muted  { color: #e2e8f0; }
  &--danger { color: #fca5a5; }
}

// 右侧组合（版本号 + 箭头 / 即将开放 + 箭头）
.menu-item__right-group {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.menu-item__version {
  font-size: 26rpx;
  color: #94a3b8;
  font-weight: 500;
}

.menu-item__coming-soon {
  font-size: 22rpx;
  color: #f59e0b;
  background: #fffbeb;
  border: 1rpx solid #fde68a;
  border-radius: 100rpx;
  padding: 4rpx 16rpx;
  font-weight: 600;
}

// 分割线
.menu-divider {
  height: 1rpx;
  background: #f1f5f9;
  margin: 0 32rpx;
}

// ─── 退出登录区 ───────────────────────────────────────────────────────────────

.logout-section {
  margin: 48rpx 32rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
}

.logout-btn {
  width: 100%;
  height: 104rpx;
  background: #fff5f5;
  border: 2rpx solid #fecdd3;
  border-radius: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  transition: background 0.15s, transform 0.15s;

  &:active {
    background: #fee2e2;
    transform: scale(0.99);
  }
}

.logout-btn__icon {
  font-size: 36rpx;
  line-height: 1;
}

.logout-btn__text {
  font-size: 34rpx;
  font-weight: 700;
  color: #ef4444;
  letter-spacing: 2rpx;
}

.logout-hint {
  font-size: 24rpx;
  color: #94a3b8;
  text-align: center;
}

// ─── 底部版权 ────────────────────────────────────────────────────────────────

.footer {
  margin-top: 56rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
  padding: 0 40rpx;
  opacity: 0.5;
}

.footer__logo {
  font-size: 30rpx;
  font-weight: 800;
  color: #1e293b;
  letter-spacing: 2rpx;
}

.footer__copy {
  font-size: 24rpx;
  color: #64748b;
}

.footer__version {
  font-size: 22rpx;
  color: #94a3b8;
}

// ─── 底部安全区 ───────────────────────────────────────────────────────────────

.safe-bottom {
  height: calc(48rpx + env(safe-area-inset-bottom));
}
</style>
