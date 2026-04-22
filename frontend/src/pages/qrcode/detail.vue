<template>
  <view class="page">
    <!-- 加载骨架屏 -->
    <view v-if="loading" class="skeleton-page">
      <view class="skeleton-banner" />
      <view class="skeleton-body-wrap">
        <view class="skeleton-qr-card">
          <view class="skeleton-qr-img" />
          <view class="skeleton-line skeleton-line--sm" />
        </view>
        <view class="skeleton-info-card">
          <view v-for="i in 4" :key="i" class="skeleton-line" :class="i % 2 === 0 ? 'skeleton-line--sm' : ''" />
        </view>
      </view>
    </view>

    <!-- 正常内容 -->
    <scroll-view v-else-if="qrCode" scroll-y class="scroll-wrap">
      <!-- ① 顶部彩色 Banner -->
      <view class="banner" :style="{ background: bannerGradient }">
        <!-- 装饰圆 -->
        <view class="banner-deco banner-deco--1" />
        <view class="banner-deco banner-deco--2" />
        <view class="banner-deco banner-deco--3" />

        <!-- 返回按钮 -->
        <view class="back-btn" @tap="goBack">
          <text class="back-icon">‹</text>
        </view>

        <!-- 主内容 -->
        <view class="banner-content">
          <view class="banner-icon-wrap">
            <text class="banner-icon">{{ qrCode.icon || '🏷️' }}</text>
          </view>
          <text class="banner-label">{{ qrCode.label }}</text>
          <view class="banner-status-row">
            <view class="banner-status" :class="qrCode.isActive ? 'banner-status--active' : 'banner-status--inactive'">
              <view class="banner-status-dot" :class="qrCode.isActive ? 'banner-status-dot--active' : ''" />
              <text class="banner-status-text">{{ qrCode.isActive ? '启用中' : '已停用' }}</text>
            </view>
            <text class="banner-scan-count">👁 {{ qrCode.scanCount }} 次扫描</text>
          </view>
        </view>
      </view>

      <!-- ② 内容区（圆角卡片浮起于 Banner 之上） -->
      <view class="body-wrap">

        <!-- 二维码图片卡片 -->
        <view class="qr-card">
          <text class="qr-card-title">专属二维码</text>
          <view class="qr-img-wrap">
            <image
              v-if="qrCode.qrImageData"
              :src="qrCode.qrImageData"
              class="qr-img"
              mode="aspectFit"
            />
            <view v-else class="qr-img-placeholder">
              <text class="qr-img-placeholder-icon">📷</text>
              <text class="qr-img-placeholder-text">二维码生成中</text>
            </view>
          </view>
          <text class="qr-hint">将此二维码打印或截图，贴在你的物品上</text>

          <!-- 操作按钮组 -->
          <view class="qr-actions">
            <!-- 保存图片 -->
            <view class="qr-action-btn qr-action-btn--save" @tap="onSaveImage">
              <text class="qr-action-icon">⬇</text>
              <text class="qr-action-text">保存图片</text>
            </view>

            <!-- 启用 / 停用 -->
            <view
              class="qr-action-btn"
              :class="qrCode.isActive ? 'qr-action-btn--pause' : 'qr-action-btn--resume'"
              @tap="onToggle"
            >
              <text class="qr-action-icon">{{ qrCode.isActive ? '⏸' : '▶' }}</text>
              <text class="qr-action-text">{{ qrCode.isActive ? '停用' : '启用' }}</text>
            </view>
          </view>
        </view>

        <!-- 物品信息卡片 -->
        <view class="info-card">
          <text class="info-card-title">物品信息</text>

          <!-- 名称 -->
          <view class="info-row">
            <view class="info-row-left">
              <text class="info-icon">🏷️</text>
              <text class="info-key">物品名称</text>
            </view>
            <text class="info-val">{{ qrCode.label }}</text>
          </view>

          <!-- 描述 -->
          <view v-if="qrCode.description" class="info-row info-row--multiline">
            <view class="info-row-left">
              <text class="info-icon">📝</text>
              <text class="info-key">物品描述</text>
            </view>
            <text class="info-val info-val--multiline">{{ qrCode.description }}</text>
          </view>

          <!-- 悬赏 -->
          <view v-if="qrCode.rewardText" class="info-row">
            <view class="info-row-left">
              <text class="info-icon">💰</text>
              <text class="info-key">悬赏说明</text>
            </view>
            <text class="info-val info-val--reward">{{ qrCode.rewardText }}</text>
          </view>

          <view class="info-divider" />

          <!-- 扫码次数 -->
          <view class="info-row">
            <view class="info-row-left">
              <text class="info-icon">📊</text>
              <text class="info-key">累计扫描</text>
            </view>
            <text class="info-val info-val--num">{{ qrCode.scanCount }} 次</text>
          </view>

          <!-- 创建时间 -->
          <view class="info-row">
            <view class="info-row-left">
              <text class="info-icon">🗓</text>
              <text class="info-key">创建时间</text>
            </view>
            <text class="info-val">{{ formatDate(qrCode.createdAt) }}</text>
          </view>

          <!-- 最后更新 -->
          <view class="info-row" style="border-bottom: none;">
            <view class="info-row-left">
              <text class="info-icon">🔄</text>
              <text class="info-key">最后更新</text>
            </view>
            <text class="info-val">{{ formatDate(qrCode.updatedAt) }}</text>
          </view>
        </view>

        <!-- 停用提示卡（仅停用状态显示） -->
        <view v-if="!qrCode.isActive" class="inactive-tip">
          <text class="inactive-tip-icon">🔒</text>
          <view class="inactive-tip-body">
            <text class="inactive-tip-title">此二维码已停用</text>
            <text class="inactive-tip-desc">停用后拾到者将无法发送留言。点击"启用"恢复正常使用。</text>
          </view>
        </view>

        <!-- 危险操作区 -->
        <view class="danger-zone">
          <view class="danger-btn" @tap="onDelete">
            <text class="danger-icon">🗑</text>
            <text class="danger-text">删除此物品</text>
          </view>
          <text class="danger-hint">删除后无法恢复，且所有扫码记录和留言都将清除</text>
        </view>

        <!-- 底部安全区留白 -->
        <view class="bottom-safe" />
      </view>
    </scroll-view>

    <!-- 404 状态 -->
    <view v-else class="not-found">
      <text class="not-found-emoji">❓</text>
      <text class="not-found-title">找不到此物品</text>
      <text class="not-found-desc">该二维码可能已被删除</text>
      <view class="not-found-btn" @tap="goBack">
        <text class="not-found-btn-text">返回上一页</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useQrCodesStore } from '@/stores/qrcodes'
import type { QrCodeWithImage } from '@/types'

// ─── Store ────────────────────────────────────────────────────────────────────

const qrStore = useQrCodesStore()

// ─── 状态 ─────────────────────────────────────────────────────────────────────

/** 当前展示的二维码详情（含 qrImageData） */
const qrCode = ref<QrCodeWithImage | null>(null)

/** 页面是否正在加载 */
const loading = ref(true)

/** 当前物品 ID（从 URL 参数获取） */
const currentId = ref('')

// ─── 计算属性 ─────────────────────────────────────────────────────────────────

/** Banner 渐变背景色 */
const bannerGradient = computed(() => {
  const base = qrCode.value?.color || '#3B82F6'
  return `linear-gradient(160deg, ${base} 0%, ${darkenHex(base, 30)} 100%)`
})

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

/**
 * 将十六进制颜色加深指定量
 */
function darkenHex(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, (num >> 16) - amount)
  const g = Math.max(0, ((num >> 8) & 0x00ff) - amount)
  const b = Math.max(0, (num & 0x0000ff) - amount)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

/**
 * 格式化日期为本地可读格式（YYYY年MM月DD日 HH:mm）
 */
function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${y}年${mo}月${da}日 ${h}:${mi}`
}

// ─── 数据加载 ─────────────────────────────────────────────────────────────────

async function loadDetail(id: string) {
  loading.value = true
  try {
    await qrStore.fetchOne(id)
    qrCode.value = qrStore.currentQrCode
  } catch (err: any) {
    const msg = err?.message || '加载失败，请重试'
    uni.showToast({ title: msg, icon: 'none', duration: 2000 })
    qrCode.value = null
  } finally {
    loading.value = false
  }
}

// ─── 操作：保存图片 ───────────────────────────────────────────────────────────

async function onSaveImage() {
  if (!qrCode.value?.qrImageData) {
    uni.showToast({ title: '二维码图片不存在', icon: 'none' })
    return
  }

  // 先保存 base64 到临时文件，再存相册
  // uni-app 的 saveImageToPhotosAlbum 只接受本地路径或网络 URL
  // 对于 base64 需要先写入临时文件
  try {
    uni.showLoading({ title: '保存中...', mask: true })

    // 将 base64 Data URL 中的内容提取出来
    const base64Data = qrCode.value.qrImageData.replace(/^data:image\/\w+;base64,/, '')

    // 写入临时文件
    const tempFilePath = `${uni.env.USER_DATA_PATH}/qr_${currentId.value}.png`

    const fsm = uni.getFileSystemManager()
    fsm.writeFileSync(tempFilePath, base64Data, 'base64')

    // 保存到相册
    await new Promise<void>((resolve, reject) => {
      uni.saveImageToPhotosAlbum({
        filePath: tempFilePath,
        success: () => resolve(),
        fail: (err) => reject(err),
      })
    })

    uni.hideLoading()
    uni.showToast({ title: '已保存到相册 ✓', icon: 'success' })
  } catch (err: any) {
    uni.hideLoading()
    // 用户拒绝授权时的提示
    if (err?.errMsg?.includes('auth deny') || err?.errMsg?.includes('authorize')) {
      uni.showModal({
        title: '需要相册权限',
        content: '请在系统设置中允许访问相册，以便保存二维码图片',
        showCancel: false,
        confirmText: '知道了',
      })
    } else {
      uni.showToast({ title: '保存失败，请重试', icon: 'none', duration: 2000 })
    }
  }
}

// ─── 操作：启用/停用切换 ──────────────────────────────────────────────────────

async function onToggle() {
  if (!qrCode.value) return

  const nextState = !qrCode.value.isActive
  const actionText = nextState ? '启用' : '停用'

  const { confirm } = await new Promise<{ confirm: boolean }>((resolve) => {
    uni.showModal({
      title: `确认${actionText}`,
      content: nextState
        ? '启用后，拾到者扫码可以看到物品信息并发送留言。'
        : '停用后，拾到者扫码将无法发送留言。',
      confirmText: actionText,
      confirmColor: nextState ? '#10B981' : '#F59E0B',
      success: (res) => resolve({ confirm: res.confirm }),
    })
  })

  if (!confirm) return

  uni.showLoading({ title: `${actionText}中...`, mask: true })
  try {
    await qrStore.toggle(currentId.value)
    // 重新拉取最新数据
    await loadDetail(currentId.value)
    uni.hideLoading()
    uni.showToast({ title: `已${actionText} ✓`, icon: 'success' })
  } catch (err: any) {
    uni.hideLoading()
    const msg = err?.message || `${actionText}失败`
    uni.showToast({ title: msg, icon: 'none', duration: 2000 })
  }
}

// ─── 操作：删除物品 ───────────────────────────────────────────────────────────

async function onDelete() {
  if (!qrCode.value) return

  const { confirm } = await new Promise<{ confirm: boolean }>((resolve) => {
    uni.showModal({
      title: '⚠️ 确认删除',
      content: `删除"${qrCode.value!.label}"后，对应的二维码将永久失效，所有扫码记录和留言也会一并清除，此操作不可撤销。`,
      confirmText: '确认删除',
      confirmColor: '#EF4444',
      cancelText: '再想想',
      success: (res) => resolve({ confirm: res.confirm }),
    })
  })

  if (!confirm) return

  uni.showLoading({ title: '删除中...', mask: true })
  try {
    await qrStore.remove(currentId.value)
    uni.hideLoading()
    uni.showToast({ title: '已删除', icon: 'success' })
    // 延迟返回，让 toast 显示完毕
    setTimeout(() => {
      uni.navigateBack()
    }, 800)
  } catch (err: any) {
    uni.hideLoading()
    const msg = err?.message || '删除失败，请重试'
    uni.showToast({ title: msg, icon: 'none', duration: 2000 })
  }
}

// ─── 导航 ─────────────────────────────────────────────────────────────────────

function goBack() {
  uni.navigateBack()
}

// ─── 生命周期 ─────────────────────────────────────────────────────────────────

onLoad((options) => {
  const id = options?.id as string | undefined
  if (!id) {
    uni.showToast({ title: '参数错误', icon: 'none' })
    loading.value = false
    return
  }
  currentId.value = id
  loadDetail(id)
})
</script>

<style scoped lang="scss">
// ─── 页面容器 ────────────────────────────────────────────────────────────────

.page {
  min-height: 100vh;
  background: #f5f7fa;
}

.scroll-wrap {
  height: 100vh;
}

// ─── Banner ──────────────────────────────────────────────────────────────────

.banner {
  position: relative;
  overflow: hidden;
  padding: 100rpx 40rpx 100rpx;
  // 顶部留出系统状态栏
  padding-top: calc(100rpx + env(safe-area-inset-top));
}

// 背景装饰圆
.banner-deco {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);

  &--1 {
    width: 400rpx;
    height: 400rpx;
    right: -120rpx;
    top: -120rpx;
  }

  &--2 {
    width: 280rpx;
    height: 280rpx;
    left: -80rpx;
    bottom: -80rpx;
  }

  &--3 {
    width: 180rpx;
    height: 180rpx;
    right: 60rpx;
    bottom: -40rpx;
    background: rgba(255, 255, 255, 0.06);
  }
}

// 返回按钮
.back-btn {
  position: absolute;
  top: calc(40rpx + env(safe-area-inset-top));
  left: 32rpx;
  width: 72rpx;
  height: 72rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;

  &:active {
    background: rgba(255, 255, 255, 0.35);
  }
}

.back-icon {
  font-size: 52rpx;
  color: #ffffff;
  line-height: 1;
  margin-top: -4rpx;
}

// Banner 主体内容
.banner-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
}

.banner-icon-wrap {
  width: 136rpx;
  height: 136rpx;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.15);
}

.banner-icon {
  font-size: 72rpx;
  line-height: 1;
}

.banner-label {
  font-size: 44rpx;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: 1rpx;
  text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.15);
}

.banner-status-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.banner-status {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 10rpx 24rpx;
  border-radius: 100rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.35);

  &--active {
    background: rgba(16, 185, 129, 0.25);
  }

  &--inactive {
    background: rgba(0, 0, 0, 0.2);
  }
}

.banner-status-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);

  &--active {
    background: #34d399;
    box-shadow: 0 0 0 4rpx rgba(52, 211, 153, 0.4);
  }
}

.banner-status-text {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.95);
  font-weight: 600;
}

.banner-scan-count {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
  background: rgba(0, 0, 0, 0.15);
  padding: 10rpx 24rpx;
  border-radius: 100rpx;
}

// ─── 内容区浮起包裹 ───────────────────────────────────────────────────────────

.body-wrap {
  margin-top: -40rpx;
  padding: 0 32rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

// ─── 二维码卡片 ───────────────────────────────────────────────────────────────

.qr-card {
  background: #ffffff;
  border-radius: 32rpx;
  padding: 40rpx 36rpx 32rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
}

.qr-card-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #1e293b;
  align-self: flex-start;
}

.qr-img-wrap {
  width: 400rpx;
  height: 400rpx;
  background: #f8fafc;
  border-radius: 20rpx;
  border: 2rpx dashed #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.qr-img {
  width: 380rpx;
  height: 380rpx;
}

.qr-img-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}

.qr-img-placeholder-icon {
  font-size: 64rpx;
}

.qr-img-placeholder-text {
  font-size: 26rpx;
  color: #94a3b8;
}

.qr-hint {
  font-size: 24rpx;
  color: #94a3b8;
  text-align: center;
  line-height: 1.6;
}

// 操作按钮组
.qr-actions {
  display: flex;
  gap: 20rpx;
  width: 100%;
  margin-top: 8rpx;
}

.qr-action-btn {
  flex: 1;
  height: 88rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  border: 2rpx solid transparent;
  transition: opacity 0.15s, transform 0.15s;

  &:active {
    opacity: 0.75;
    transform: scale(0.97);
  }

  // 保存图片 - 主色填充
  &--save {
    background: linear-gradient(135deg, #3b82f6, #6366f1);
    box-shadow: 0 6rpx 20rpx rgba(59, 130, 246, 0.35);
  }

  // 停用 - 橙色边框
  &--pause {
    background: #fff7ed;
    border-color: #fed7aa;
  }

  // 启用 - 绿色边框
  &--resume {
    background: #f0fdf4;
    border-color: #bbf7d0;
  }
}

.qr-action-icon {
  font-size: 28rpx;
  line-height: 1;
}

.qr-action-text {
  font-size: 28rpx;
  font-weight: 600;

  .qr-action-btn--save &   { color: #ffffff; }
  .qr-action-btn--pause &  { color: #f59e0b; }
  .qr-action-btn--resume & { color: #10b981; }
}

// ─── 物品信息卡片 ─────────────────────────────────────────────────────────────

.info-card {
  background: #ffffff;
  border-radius: 32rpx;
  padding: 36rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.05);
}

.info-card-title {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 28rpx;
}

.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22rpx 0;
  border-bottom: 1rpx solid #f1f5f9;
  gap: 20rpx;

  &--multiline {
    align-items: flex-start;
  }
}

.info-row-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-shrink: 0;
}

.info-icon {
  font-size: 28rpx;
  line-height: 1;
}

.info-key {
  font-size: 28rpx;
  color: #64748b;
  white-space: nowrap;
}

.info-val {
  font-size: 28rpx;
  color: #1e293b;
  font-weight: 500;
  text-align: right;

  &--multiline {
    text-align: right;
    line-height: 1.6;
    flex: 1;
    word-break: break-all;
  }

  &--reward {
    color: #f59e0b;
    font-weight: 600;
  }

  &--num {
    color: #3b82f6;
    font-weight: 700;
    font-size: 32rpx;
  }
}

.info-divider {
  height: 1rpx;
  background: #e2e8f0;
  margin: 8rpx 0;
}

// ─── 停用提示卡 ───────────────────────────────────────────────────────────────

.inactive-tip {
  background: #fffbeb;
  border: 2rpx solid #fde68a;
  border-radius: 24rpx;
  padding: 28rpx 32rpx;
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
}

.inactive-tip-icon {
  font-size: 40rpx;
  flex-shrink: 0;
  line-height: 1.2;
}

.inactive-tip-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.inactive-tip-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #92400e;
}

.inactive-tip-desc {
  font-size: 24rpx;
  color: #b45309;
  line-height: 1.6;
}

// ─── 危险操作区 ───────────────────────────────────────────────────────────────

.danger-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  padding: 8rpx 0 16rpx;
}

.danger-btn {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 24rpx 60rpx;
  border: 2rpx solid #fecdd3;
  border-radius: 20rpx;
  background: #fff5f5;
  transition: opacity 0.15s;

  &:active {
    opacity: 0.7;
    background: #fee2e2;
  }
}

.danger-icon {
  font-size: 30rpx;
  line-height: 1;
}

.danger-text {
  font-size: 30rpx;
  font-weight: 600;
  color: #ef4444;
}

.danger-hint {
  font-size: 22rpx;
  color: #94a3b8;
  text-align: center;
  line-height: 1.5;
  padding: 0 20rpx;
}

// ─── 底部安全区 ───────────────────────────────────────────────────────────────

.bottom-safe {
  height: calc(40rpx + env(safe-area-inset-bottom));
}

// ─── 骨架屏 ──────────────────────────────────────────────────────────────────

.skeleton-page {
  min-height: 100vh;
}

.skeleton-banner {
  height: 420rpx;
  background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
}

.skeleton-body-wrap {
  margin-top: -40rpx;
  padding: 0 32rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.skeleton-qr-card {
  background: #fff;
  border-radius: 32rpx;
  padding: 40rpx 36rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
}

.skeleton-qr-img {
  width: 400rpx;
  height: 400rpx;
  background: #e2e8f0;
  border-radius: 20rpx;
}

.skeleton-info-card {
  background: #fff;
  border-radius: 32rpx;
  padding: 36rpx;
  display: flex;
  flex-direction: column;
  gap: 28rpx;
}

// 通用骨架线条
.skeleton-line {
  height: 32rpx;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 400% 100%;
  animation: skeleton-shimmer 1.4s ease-in-out infinite;
  border-radius: 8rpx;
  width: 100%;

  &--sm {
    width: 60%;
    height: 24rpx;
    align-self: center;
  }
}

@keyframes skeleton-shimmer {
  0%   { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}

// ─── 404 状态 ────────────────────────────────────────────────────────────────

.not-found {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20rpx;
  padding: 0 60rpx;
}

.not-found-emoji {
  font-size: 120rpx;
  margin-bottom: 12rpx;
}

.not-found-title {
  font-size: 40rpx;
  font-weight: 700;
  color: #1e293b;
}

.not-found-desc {
  font-size: 28rpx;
  color: #64748b;
}

.not-found-btn {
  margin-top: 28rpx;
  background: #3b82f6;
  border-radius: 100rpx;
  padding: 24rpx 64rpx;

  &:active {
    opacity: 0.8;
  }
}

.not-found-btn-text {
  font-size: 30rpx;
  font-weight: 600;
  color: #ffffff;
}
</style>
