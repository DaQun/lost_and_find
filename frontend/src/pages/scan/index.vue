<template>
  <view class="page">
    <!-- ══════════════════ 状态 C：加载骨架屏 ══════════════════ -->
    <view v-if="pageState === 'loading'" class="skeleton-wrap">
      <!-- 顶部 Banner 骨架 -->
      <view class="sk-banner" />
      <view class="sk-body">
        <view class="sk-card">
          <view class="sk-line sk-line--title" />
          <view class="sk-line sk-line--sub" />
          <view class="sk-line sk-line--sub" />
        </view>
        <view class="sk-card">
          <view v-for="i in 4" :key="i" class="sk-line" :class="i % 2 === 0 ? 'sk-line--short' : ''" />
        </view>
      </view>
    </view>

    <!-- ══════════════════ 状态 D：404 ══════════════════ -->
    <view v-else-if="pageState === 'notfound'" class="center-state">
      <view class="center-state__icon-wrap center-state__icon-wrap--gray">
        <text class="center-state__icon">❓</text>
      </view>
      <text class="center-state__title">找不到此物品信息</text>
      <text class="center-state__desc">
        该二维码可能已被删除，或者链接有误。{{ '\n' }}如果您刚刚扫描了实物标签，请联系物品所有者。
      </text>
      <view class="center-state__tip-card">
        <text class="center-state__tip-icon">💡</text>
        <text class="center-state__tip-text">Lost & Find — 让失物找到回家的路</text>
      </view>
    </view>

    <!-- ══════════════════ 状态 B：已停用 ══════════════════ -->
    <view v-else-if="pageState === 'inactive'" class="center-state">
      <view class="center-state__icon-wrap center-state__icon-wrap--gray">
        <text class="center-state__icon">🔒</text>
      </view>
      <text class="center-state__title">此物品已找回</text>
      <text class="center-state__desc">
        物主已将此二维码停用。{{ '\n' }}感谢您的善意，这个世界因你而温暖 💛
      </text>
      <view class="center-state__badge">
        <text class="center-state__badge-dot" />
        <text class="center-state__badge-text">二维码已停用</text>
      </view>
      <!-- 底部品牌水印 -->
      <view class="brand-footer">
        <text class="brand-footer__icon">🔍</text>
        <text class="brand-footer__name">Lost &amp; Find</text>
        <text class="brand-footer__slogan">二维码失物招领平台</text>
      </view>
    </view>

    <!-- ══════════════════ 状态 A：正常（可联系） ══════════════════ -->
    <scroll-view v-else-if="pageState === 'active'" scroll-y class="scroll-wrap">
      <!-- ① 顶部 Banner -->
      <view class="banner" :style="{ background: bannerGradient }">
        <!-- 背景装饰圆 -->
        <view class="banner__deco banner__deco--1" />
        <view class="banner__deco banner__deco--2" />
        <view class="banner__deco banner__deco--3" />

        <!-- 物品 Emoji 图标 -->
        <view class="banner__icon-wrap">
          <text class="banner__icon">{{ itemInfo!.icon || '🏷️' }}</text>
        </view>

        <!-- 物品名称 -->
        <text class="banner__label">{{ itemInfo!.label }}</text>

        <!-- 失主昵称 -->
        <view class="banner__owner-row">
          <text class="banner__owner-prefix">失主：</text>
          <text class="banner__owner-name">{{ itemInfo!.ownerNickname || '匿名用户' }}</text>
        </view>

        <!-- 底部半圆弧过渡 -->
        <view class="banner__arc" />
      </view>

      <!-- ② 物品信息卡片 -->
      <view class="body-wrap">

        <!-- 物品描述卡 -->
        <view v-if="itemInfo!.description || itemInfo!.rewardText" class="info-card">
          <view v-if="itemInfo!.description" class="info-row">
            <text class="info-icon">📝</text>
            <view class="info-body">
              <text class="info-label">物品描述</text>
              <text class="info-value">{{ itemInfo!.description }}</text>
            </view>
          </view>

          <view v-if="itemInfo!.description && itemInfo!.rewardText" class="info-divider" />

          <view v-if="itemInfo!.rewardText" class="info-row">
            <text class="info-icon">💰</text>
            <view class="info-body">
              <text class="info-label">悬赏说明</text>
              <text class="info-value info-value--reward">{{ itemInfo!.rewardText }}</text>
            </view>
          </view>
        </view>

        <!-- 当描述和悬赏都没有时，显示简单提示卡 -->
        <view v-else class="simple-tip-card">
          <text class="simple-tip-icon">🙏</text>
          <text class="simple-tip-text">如果您捡到了这件物品，请通过下方表单联系失主</text>
        </view>

        <!-- ③ 联系留言表单 -->
        <view class="form-section">
          <!-- 区域标题 -->
          <view class="form-section__header">
            <view class="form-section__title-wrap">
              <view class="form-section__title-bar" />
              <text class="form-section__title">联系失主</text>
            </view>
            <text class="form-section__sub">填写后失主会第一时间看到你的留言</text>
          </view>

          <!-- 留言卡片 -->
          <view class="form-card">
            <!-- 你的姓名（可选） -->
            <view class="field">
              <view class="field__label-row">
                <text class="field__label">你的姓名</text>
                <text class="field__tag field__tag--optional">可选</text>
              </view>
              <view
                class="field__input-wrap"
                :class="{ 'field__input-wrap--focus': nameFocus }"
              >
                <text class="field__prefix-icon">👤</text>
                <input
                  v-model="form.finderName"
                  class="field__input"
                  placeholder="让失主知道是谁帮助了他"
                  placeholder-class="field__placeholder"
                  maxlength="20"
                  @focus="nameFocus = true"
                  @blur="nameFocus = false"
                />
              </view>
            </view>

            <!-- 联系方式（可选） -->
            <view class="field">
              <view class="field__label-row">
                <text class="field__label">联系方式</text>
                <text class="field__tag field__tag--optional">可选</text>
              </view>
              <view
                class="field__input-wrap"
                :class="{ 'field__input-wrap--focus': contactFocus }"
              >
                <text class="field__prefix-icon">📞</text>
                <input
                  v-model="form.finderContact"
                  class="field__input"
                  placeholder="电话 / 微信号 / 邮箱"
                  placeholder-class="field__placeholder"
                  maxlength="50"
                  @focus="contactFocus = true"
                  @blur="contactFocus = false"
                />
              </view>
            </view>

            <!-- 留言内容（必填） -->
            <view class="field" style="margin-bottom: 0;">
              <view class="field__label-row">
                <text class="field__label">留言内容</text>
                <text class="field__tag field__tag--required">必填</text>
              </view>
              <view
                class="field__textarea-wrap"
                :class="{
                  'field__input-wrap--focus': msgFocus,
                  'field__input-wrap--error': msgError,
                }"
              >
                <textarea
                  v-model="form.message"
                  class="field__textarea"
                  placeholder="告诉失主你在哪里，什么时候捡到的，以及物品现在的状态…"
                  placeholder-class="field__placeholder"
                  maxlength="500"
                  :auto-height="false"
                  @focus="msgFocus = true; msgError = false"
                  @blur="msgFocus = false"
                />
                <text class="field__char-count">{{ form.message.length }}/500</text>
              </view>
              <text v-if="msgError" class="field__error">请填写留言内容</text>
            </view>
          </view>

          <!-- 提交按钮 -->
          <view
            class="submit-btn"
            :class="{ 'submit-btn--loading': submitting, 'submit-btn--sent': sent }"
            @tap="onSubmit"
          >
            <view v-if="submitting" class="submit-spinner" />
            <text v-else-if="sent" class="submit-icon">✓</text>
            <text v-else class="submit-icon">💬</text>
            <text class="submit-text">
              {{ submitting ? '发送中...' : sent ? '已发送成功' : '发送留言给失主' }}
            </text>
          </view>

          <!-- 发送成功提示 -->
          <view v-if="sent" class="sent-tip">
            <text class="sent-tip__icon">🎉</text>
            <view class="sent-tip__body">
              <text class="sent-tip__title">留言已发送！</text>
              <text class="sent-tip__desc">失主会尽快与您联系，感谢您的善举 💛</text>
            </view>
          </view>

          <!-- 隐私说明 -->
          <view class="privacy-note">
            <text class="privacy-note__icon">🔒</text>
            <text class="privacy-note__text">
              你的留言将直接发送给失主，平台不会公开你的任何信息
            </text>
          </view>
        </view>

        <!-- 底部品牌水印 -->
        <view class="brand-footer">
          <text class="brand-footer__icon">🔍</text>
          <text class="brand-footer__name">Lost &amp; Find</text>
          <text class="brand-footer__slogan">二维码失物招领平台</text>
        </view>

        <!-- 底部安全区留白 -->
        <view class="bottom-safe" />
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { scanApi } from '@/api/scan'
import type { ScanResult } from '@/types'

// ─── 页面状态类型 ──────────────────────────────────────────────────────────────

type PageState = 'loading' | 'active' | 'inactive' | 'notfound'

// ─── 响应式状态 ────────────────────────────────────────────────────────────────

/** 当前页面展示状态 */
const pageState = ref<PageState>('loading')

/** 物品信息（从后端获取） */
const itemInfo = ref<ScanResult | null>(null)

/** 当前扫码 token（从 URL 参数获取） */
const currentToken = ref('')

/** 留言表单数据 */
const form = reactive({
  finderName: '',
  finderContact: '',
  message: '',
})

// 输入框聚焦状态
const nameFocus = ref(false)
const contactFocus = ref(false)
const msgFocus = ref(false)

// 错误状态
const msgError = ref(false)

// 提交状态
const submitting = ref(false)

/** 是否已成功发送（用于改变按钮样式及展示成功提示） */
const sent = ref(false)

// ─── 计算属性 ─────────────────────────────────────────────────────────────────

/** Banner 渐变背景色（根据物品颜色生成） */
const bannerGradient = computed(() => {
  const base = itemInfo.value?.color || '#3B82F6'
  return `linear-gradient(160deg, ${base} 0%, ${darkenHex(base, 35)} 100%)`
})

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

/**
 * 将十六进制颜色加深指定量
 * @param hex  十六进制颜色字符串（#RRGGBB）
 * @param amt  加深幅度（0 ~ 255）
 */
function darkenHex(hex: string, amt: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, (num >> 16) - amt)
  const g = Math.max(0, ((num >> 8) & 0x00ff) - amt)
  const b = Math.max(0, (num & 0x0000ff) - amt)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

// ─── 数据加载 ─────────────────────────────────────────────────────────────────

/**
 * 根据 token 拉取物品公开信息
 * 此接口无需登录，对所有访客开放
 */
async function loadItemInfo(token: string) {
  pageState.value = 'loading'
  try {
    const result = await scanApi.getItemInfo(token)
    itemInfo.value = result

    // 根据 isActive 决定展示哪个状态
    pageState.value = result.isActive ? 'active' : 'inactive'
  } catch (err: any) {
    // 404 或其他网络错误
    pageState.value = 'notfound'
  }
}

// ─── 表单验证 ─────────────────────────────────────────────────────────────────

function validateForm(): boolean {
  msgError.value = false

  if (!form.message.trim()) {
    msgError.value = true
    return false
  }

  return true
}

// ─── 发送留言 ─────────────────────────────────────────────────────────────────

async function onSubmit() {
  // 已发送成功时不重复提交
  if (sent.value || submitting.value) return

  if (!validateForm()) {
    uni.showToast({ title: '请填写留言内容', icon: 'none' })
    return
  }

  submitting.value = true
  try {
    await scanApi.sendMessage(currentToken.value, {
      finderName: form.finderName.trim() || undefined,
      finderContact: form.finderContact.trim() || undefined,
      message: form.message.trim(),
    })

    // 标记成功
    sent.value = true

    // 清空表单（保留 sent 状态让用户看到成功提示）
    form.finderName = ''
    form.finderContact = ''
    form.message = ''

    uni.showToast({ title: '发送成功 🎉', icon: 'success', duration: 2000 })
  } catch (err: any) {
    // 处理限流（429）等错误
    const msg = err?.message || '发送失败，请稍后重试'
    uni.showToast({ title: msg, icon: 'none', duration: 2500 })
  } finally {
    submitting.value = false
  }
}

// ─── 生命周期 ─────────────────────────────────────────────────────────────────

onLoad((options) => {
  const token = options?.token as string | undefined

  if (!token) {
    // 没有 token 参数 → 直接展示 404
    pageState.value = 'notfound'
    return
  }

  currentToken.value = token
  loadItemInfo(token)
})
</script>

<style scoped lang="scss">
// ─── 页面根容器 ───────────────────────────────────────────────────────────────

.page {
  min-height: 100vh;
  background: #f5f7fa;
}

.scroll-wrap {
  height: 100vh;
}

// ─── 骨架屏 ──────────────────────────────────────────────────────────────────

.skeleton-wrap {
  min-height: 100vh;
}

.sk-banner {
  height: 480rpx;
  background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
}

.sk-body {
  margin-top: -32rpx;
  padding: 0 32rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.sk-card {
  background: #fff;
  border-radius: 32rpx;
  padding: 36rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.sk-line {
  height: 28rpx;
  border-radius: 8rpx;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 400% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
  width: 100%;

  &--title {
    height: 36rpx;
    width: 55%;
  }

  &--sub {
    width: 80%;
  }

  &--short {
    width: 45%;
  }
}

@keyframes shimmer {
  0%   { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}

// ─── 居中状态（停用 / 404） ───────────────────────────────────────────────────

.center-state {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60rpx 60rpx 120rpx;
  gap: 28rpx;
  background: linear-gradient(160deg, #eff6ff 0%, #f5f7fa 100%);
}

.center-state__icon-wrap {
  width: 180rpx;
  height: 180rpx;
  border-radius: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12rpx;
  box-shadow: 0 16rpx 48rpx rgba(0, 0, 0, 0.08);

  &--gray {
    background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
  }
}

.center-state__icon {
  font-size: 88rpx;
  line-height: 1;
}

.center-state__title {
  font-size: 44rpx;
  font-weight: 800;
  color: #1e293b;
  text-align: center;
}

.center-state__desc {
  font-size: 28rpx;
  color: #64748b;
  text-align: center;
  line-height: 1.8;
  white-space: pre-line;
}

// 已停用徽章
.center-state__badge {
  display: flex;
  align-items: center;
  gap: 10rpx;
  background: #f1f5f9;
  border: 1rpx solid #e2e8f0;
  border-radius: 100rpx;
  padding: 14rpx 32rpx;
  margin-top: 8rpx;
}

.center-state__badge-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: #94a3b8;
}

.center-state__badge-text {
  font-size: 26rpx;
  color: #64748b;
  font-weight: 600;
}

// 404 提示卡
.center-state__tip-card {
  display: flex;
  align-items: center;
  gap: 14rpx;
  background: #eff6ff;
  border: 1rpx solid #bfdbfe;
  border-radius: 20rpx;
  padding: 20rpx 32rpx;
  margin-top: 12rpx;
}

.center-state__tip-icon {
  font-size: 32rpx;
  flex-shrink: 0;
}

.center-state__tip-text {
  font-size: 26rpx;
  color: #3b82f6;
  font-weight: 500;
}

// ─── Banner（正常状态） ───────────────────────────────────────────────────────

.banner {
  position: relative;
  overflow: hidden;
  padding: calc(env(safe-area-inset-top) + 80rpx) 48rpx 120rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
  transition: background 0.4s;
}

// 背景装饰圆
.banner__deco {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  pointer-events: none;

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
    bottom: 0;
    background: rgba(255, 255, 255, 0.07);
  }

  &--3 {
    width: 200rpx;
    height: 200rpx;
    right: 60rpx;
    bottom: 40rpx;
    background: rgba(255, 255, 255, 0.06);
  }
}

// Emoji 图标
.banner__icon-wrap {
  position: relative;
  z-index: 1;
  width: 148rpx;
  height: 148rpx;
  background: rgba(255, 255, 255, 0.22);
  border-radius: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12rpx 40rpx rgba(0, 0, 0, 0.18);
  margin-bottom: 8rpx;
}

.banner__icon {
  font-size: 80rpx;
  line-height: 1;
}

.banner__label {
  position: relative;
  z-index: 1;
  font-size: 48rpx;
  font-weight: 800;
  color: #ffffff;
  text-align: center;
  text-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.18);
  letter-spacing: 1rpx;
}

.banner__owner-row {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 4rpx;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 100rpx;
  padding: 12rpx 28rpx;
}

.banner__owner-prefix {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.8);
}

.banner__owner-name {
  font-size: 26rpx;
  color: #ffffff;
  font-weight: 600;
}

// 底部圆弧（让 Banner 与 body 过渡更柔和）
.banner__arc {
  position: absolute;
  bottom: -2rpx;
  left: 0;
  right: 0;
  height: 60rpx;
  background: #f5f7fa;
  border-radius: 100% 100% 0 0;
  z-index: 1;
}

// ─── 内容区 ───────────────────────────────────────────────────────────────────

.body-wrap {
  padding: 8rpx 32rpx 0;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

// ─── 物品信息卡片 ─────────────────────────────────────────────────────────────

.info-card {
  background: #ffffff;
  border-radius: 32rpx;
  padding: 36rpx;
  box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.06);
}

.info-row {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
}

.info-icon {
  font-size: 36rpx;
  flex-shrink: 0;
  line-height: 1.3;
}

.info-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.info-label {
  font-size: 24rpx;
  color: #94a3b8;
  font-weight: 500;
}

.info-value {
  font-size: 30rpx;
  color: #1e293b;
  line-height: 1.7;

  &--reward {
    color: #f59e0b;
    font-weight: 700;
    font-size: 32rpx;
  }
}

.info-divider {
  height: 1rpx;
  background: #f1f5f9;
  margin: 24rpx 0;
}

// 简单提示（描述和悬赏都没有时）
.simple-tip-card {
  background: #eff6ff;
  border: 1rpx solid #bfdbfe;
  border-radius: 24rpx;
  padding: 28rpx 32rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.simple-tip-icon {
  font-size: 36rpx;
  flex-shrink: 0;
}

.simple-tip-text {
  font-size: 28rpx;
  color: #3b82f6;
  line-height: 1.6;
}

// ─── 留言表单区 ───────────────────────────────────────────────────────────────

.form-section {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.form-section__header {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.form-section__title-wrap {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.form-section__title-bar {
  width: 8rpx;
  height: 36rpx;
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  border-radius: 100rpx;
}

.form-section__title {
  font-size: 34rpx;
  font-weight: 800;
  color: #1e293b;
}

.form-section__sub {
  font-size: 26rpx;
  color: #64748b;
  padding-left: 22rpx;
}

// 表单卡片
.form-card {
  background: #ffffff;
  border-radius: 32rpx;
  padding: 40rpx 36rpx;
  box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  gap: 36rpx;
}

// ─── 通用字段 ─────────────────────────────────────────────────────────────────

.field {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.field__label-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.field__label {
  font-size: 28rpx;
  font-weight: 600;
  color: #374151;
}

.field__tag {
  font-size: 20rpx;
  padding: 2rpx 14rpx;
  border-radius: 100rpx;

  &--optional {
    color: #94a3b8;
    background: #f8fafc;
    border: 1rpx solid #e2e8f0;
  }

  &--required {
    color: #ef4444;
    background: #fff1f2;
    border: 1rpx solid #fecdd3;
  }
}

// 单行输入框容器
.field__input-wrap {
  display: flex;
  align-items: center;
  gap: 14rpx;
  background: #f8fafc;
  border: 2rpx solid #e2e8f0;
  border-radius: 20rpx;
  padding: 0 24rpx;
  height: 96rpx;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;

  &--focus {
    border-color: #3b82f6;
    background: #eff6ff;
    box-shadow: 0 0 0 6rpx rgba(59, 130, 246, 0.1);
  }

  &--error {
    border-color: #ef4444;
    background: #fff5f5;
    box-shadow: 0 0 0 6rpx rgba(239, 68, 68, 0.08);
  }
}

.field__prefix-icon {
  font-size: 30rpx;
  flex-shrink: 0;
  line-height: 1;
}

.field__input {
  flex: 1;
  font-size: 30rpx;
  color: #1e293b;
  height: 100%;
}

.field__placeholder {
  color: #cbd5e1;
  font-size: 28rpx;
}

// 多行文本域容器
.field__textarea-wrap {
  background: #f8fafc;
  border: 2rpx solid #e2e8f0;
  border-radius: 20rpx;
  padding: 24rpx;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
  position: relative;
}

.field__textarea {
  width: 100%;
  height: 200rpx;
  font-size: 30rpx;
  color: #1e293b;
  line-height: 1.7;
}

.field__char-count {
  display: block;
  text-align: right;
  font-size: 22rpx;
  color: #94a3b8;
  margin-top: 12rpx;
}

.field__error {
  display: block;
  font-size: 24rpx;
  color: #ef4444;
  padding-left: 4rpx;
}

// ─── 提交按钮 ────────────────────────────────────────────────────────────────

.submit-btn {
  height: 108rpx;
  background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
  border-radius: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14rpx;
  box-shadow: 0 12rpx 32rpx rgba(59, 130, 246, 0.38);
  transition: opacity 0.15s, transform 0.15s;

  &:active {
    opacity: 0.88;
    transform: scale(0.98);
  }

  // 发送中
  &--loading {
    opacity: 0.8;
    pointer-events: none;
  }

  // 已发送成功
  &--sent {
    background: linear-gradient(135deg, #10b981, #059669);
    box-shadow: 0 12rpx 32rpx rgba(16, 185, 129, 0.35);
    pointer-events: none;
  }
}

.submit-spinner {
  width: 40rpx;
  height: 40rpx;
  border: 4rpx solid rgba(255, 255, 255, 0.35);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.75s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.submit-icon {
  font-size: 36rpx;
  color: #ffffff;
  line-height: 1;
}

.submit-text {
  font-size: 34rpx;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 1rpx;
}

// ─── 发送成功提示卡 ───────────────────────────────────────────────────────────

.sent-tip {
  background: #f0fdf4;
  border: 2rpx solid #bbf7d0;
  border-radius: 24rpx;
  padding: 28rpx 32rpx;
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
}

.sent-tip__icon {
  font-size: 40rpx;
  flex-shrink: 0;
  line-height: 1.2;
}

.sent-tip__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.sent-tip__title {
  font-size: 30rpx;
  font-weight: 700;
  color: #166534;
}

.sent-tip__desc {
  font-size: 26rpx;
  color: #16a34a;
  line-height: 1.6;
}

// ─── 隐私说明 ─────────────────────────────────────────────────────────────────

.privacy-note {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  padding: 4rpx 0;
}

.privacy-note__icon {
  font-size: 28rpx;
  flex-shrink: 0;
  line-height: 1.4;
}

.privacy-note__text {
  font-size: 24rpx;
  color: #94a3b8;
  line-height: 1.6;
  flex: 1;
}

// ─── 底部品牌水印 ─────────────────────────────────────────────────────────────

.brand-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 20rpx 0 8rpx;
  opacity: 0.55;
}

.brand-footer__icon {
  font-size: 40rpx;
}

.brand-footer__name {
  font-size: 26rpx;
  font-weight: 700;
  color: #64748b;
  letter-spacing: 2rpx;
}

.brand-footer__slogan {
  font-size: 22rpx;
  color: #94a3b8;
}

// ─── 底部安全区 ───────────────────────────────────────────────────────────────

.bottom-safe {
  height: calc(40rpx + env(safe-area-inset-bottom));
}
</style>
