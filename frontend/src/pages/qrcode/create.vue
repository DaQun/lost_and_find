<template>
  <view class="page">
    <!-- 顶部导航栏占位（uni-app 自定义导航） -->
    <view class="nav-bar">
      <view class="nav-back" @tap="goBack">
        <text class="nav-back-icon">‹</text>
      </view>
      <text class="nav-title">添加物品</text>
      <view class="nav-placeholder" />
    </view>

    <scroll-view scroll-y class="scroll-body" :style="{ height: scrollHeight }">
      <!-- ① 实时预览卡片 -->
      <view class="preview-section">
        <view class="preview-card" :style="{ background: previewGradient }">
          <view class="preview-icon-wrap">
            <text class="preview-icon">{{ form.icon }}</text>
          </view>
          <view class="preview-info">
            <text class="preview-label">{{ form.label || '物品名称' }}</text>
            <text v-if="form.rewardText" class="preview-reward">💰 {{ form.rewardText }}</text>
            <text v-else class="preview-reward preview-reward--placeholder">悬赏说明（可选）</text>
          </view>
          <!-- 装饰圆 -->
          <view class="preview-deco preview-deco--1" />
          <view class="preview-deco preview-deco--2" />
        </view>
        <text class="preview-hint">实时预览效果</text>
      </view>

      <!-- ② 表单卡片 -->
      <view class="form-card">
        <!-- 物品名称 -->
        <view class="field">
          <view class="field-header">
            <text class="field-label">物品名称</text>
            <text class="field-required">必填</text>
          </view>
          <view
            class="input-wrap"
            :class="{
              'input-wrap--focus': nameFocus,
              'input-wrap--error': nameError,
            }"
          >
            <input
              v-model="form.label"
              class="input-field"
              placeholder="例如：我的背包"
              placeholder-class="input-placeholder"
              maxlength="30"
              @focus="nameFocus = true; nameError = false"
              @blur="nameFocus = false; validateName()"
            />
            <text class="input-count">{{ form.label.length }}/30</text>
          </view>
          <text v-if="nameError" class="error-msg">请输入物品名称</text>
        </view>

        <!-- 备注描述 -->
        <view class="field">
          <view class="field-header">
            <text class="field-label">备注描述</text>
            <text class="field-optional">可选</text>
          </view>
          <view
            class="textarea-wrap"
            :class="{ 'input-wrap--focus': descFocus }"
          >
            <textarea
              v-model="form.description"
              class="textarea-field"
              placeholder="描述一下这个物品，比如外观特征、常放位置等…"
              placeholder-class="input-placeholder"
              maxlength="200"
              :auto-height="false"
              @focus="descFocus = true"
              @blur="descFocus = false"
            />
            <text class="textarea-count">{{ (form.description || '').length }}/200</text>
          </view>
        </view>

        <!-- Emoji 图标选择 -->
        <view class="field">
          <view class="field-header">
            <text class="field-label">物品图标</text>
          </view>
          <scroll-view scroll-x class="emoji-scroll" :show-scrollbar="false">
            <view class="emoji-list">
              <view
                v-for="emoji in EMOJI_OPTIONS"
                :key="emoji"
                class="emoji-item"
                :class="{ 'emoji-item--selected': form.icon === emoji }"
                :style="form.icon === emoji ? { borderColor: form.color, background: form.color + '18' } : {}"
                @tap="form.icon = emoji"
              >
                <text class="emoji-text">{{ emoji }}</text>
              </view>
            </view>
          </scroll-view>
        </view>

        <!-- 颜色选择 -->
        <view class="field">
          <view class="field-header">
            <text class="field-label">主题颜色</text>
          </view>
          <view class="color-list">
            <view
              v-for="color in COLOR_OPTIONS"
              :key="color"
              class="color-item"
              :style="{ background: color }"
              @tap="form.color = color"
            >
              <!-- 选中时显示白色勾 -->
              <text v-if="form.color === color" class="color-check">✓</text>
            </view>
          </view>
        </view>

        <!-- 悬赏说明 -->
        <view class="field">
          <view class="field-header">
            <text class="field-label">悬赏说明</text>
            <text class="field-optional">可选</text>
          </view>
          <view
            class="input-wrap"
            :class="{ 'input-wrap--focus': rewardFocus }"
          >
            <input
              v-model="form.rewardText"
              class="input-field"
              placeholder="例如：必有重谢，感激不尽"
              placeholder-class="input-placeholder"
              maxlength="50"
              @focus="rewardFocus = true"
              @blur="rewardFocus = false"
            />
          </view>
        </view>
      </view>

      <!-- 底部留白，防止按钮遮挡 -->
      <view class="bottom-spacer" />
    </scroll-view>

    <!-- 底部固定按钮 -->
    <view class="footer-bar">
      <view
        class="submit-btn"
        :class="{ 'submit-btn--loading': loading }"
        @tap="onSubmit"
      >
        <view v-if="loading" class="btn-spinner" />
        <text v-if="!loading" class="submit-icon">✨</text>
        <text class="submit-text">{{ loading ? '生成中...' : '生成二维码' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useQrCodesStore } from '@/stores/qrcodes'
import type { CreateQrCodeDto } from '@/types'

// ─── 常量 ─────────────────────────────────────────────────────────────────────

const EMOJI_OPTIONS = [
  '🎒', '🔑', '💼', '🎧', '💻', '📱', '👓', '🐕',
  '🐱', '🏋️', '🧳', '☂️', '📚', '🏃', '🎿', '🎸',
  '🎨', '⌚', '💳', '🏠',
]

const COLOR_OPTIONS = [
  '#3B82F6', // 蓝
  '#10B981', // 绿
  '#F59E0B', // 黄
  '#EF4444', // 红
  '#8B5CF6', // 紫
  '#EC4899', // 粉
]

// ─── Store ────────────────────────────────────────────────────────────────────

const qrStore = useQrCodesStore()

// ─── 表单状态 ─────────────────────────────────────────────────────────────────

const form = reactive({
  label: '',
  description: '',
  icon: EMOJI_OPTIONS[0],
  color: COLOR_OPTIONS[0],
  rewardText: '',
})

// 焦点状态
const nameFocus = ref(false)
const descFocus = ref(false)
const rewardFocus = ref(false)

// 错误状态
const nameError = ref(false)

// 提交加载
const loading = ref(false)

// 滚动容器高度（减去 nav + footer）
const scrollHeight = ref('calc(100vh - 200rpx)')

// ─── 计算属性 ─────────────────────────────────────────────────────────────────

/** 预览卡片渐变背景（主色 → 加深版本） */
const previewGradient = computed(() => {
  const base = form.color
  return `linear-gradient(135deg, ${base} 0%, ${darkenColor(base, 25)} 100%)`
})

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

/**
 * 简单的颜色加深函数
 * @param hex 十六进制颜色
 * @param amount 加深量 (0-100)
 */
function darkenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, (num >> 16) - amount)
  const g = Math.max(0, ((num >> 8) & 0x00ff) - amount)
  const b = Math.max(0, (num & 0x0000ff) - amount)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

// ─── 验证 ─────────────────────────────────────────────────────────────────────

function validateName(): boolean {
  if (!form.label.trim()) {
    nameError.value = true
    return false
  }
  nameError.value = false
  return true
}

function validateForm(): boolean {
  return validateName()
}

// ─── 导航 ─────────────────────────────────────────────────────────────────────

function goBack() {
  uni.navigateBack()
}

// ─── 提交 ─────────────────────────────────────────────────────────────────────

async function onSubmit() {
  if (loading.value) return
  if (!validateForm()) {
    uni.showToast({ title: '请填写物品名称', icon: 'none' })
    return
  }

  loading.value = true
  uni.showLoading({ title: '生成中...', mask: true })

  try {
    const dto: CreateQrCodeDto = {
      label: form.label.trim(),
      icon: form.icon,
      color: form.color,
    }

    if (form.description.trim()) dto.description = form.description.trim()
    if (form.rewardText.trim()) dto.rewardText = form.rewardText.trim()

    const newItem = await qrStore.create(dto)

    uni.hideLoading()
    uni.showToast({ title: '创建成功 🎉', icon: 'success' })

    // 短暂停顿，让 toast 显示完毕再跳转
    setTimeout(() => {
      uni.redirectTo({ url: `/pages/qrcode/detail?id=${newItem.id}` })
    }, 800)
  } catch (err: any) {
    uni.hideLoading()
    const msg = err?.message || '创建失败，请重试'
    uni.showToast({ title: msg, icon: 'none', duration: 2500 })
  } finally {
    loading.value = false
  }
}

// ─── 生命周期 ─────────────────────────────────────────────────────────────────

onLoad(() => {
  // 动态计算滚动区域高度（nav 约 88rpx，footer 约 112rpx，各留些余量）
  // uni-app 中无法直接拿到 rpx 对应 px，用系统 API 获取屏幕信息
  const sysInfo = uni.getSystemInfoSync()
  const winHeight = sysInfo.windowHeight
  // 大约扣除 nav(44px) + footer(80px) + safeArea
  const safeBottom = sysInfo.safeAreaInsets?.bottom ?? 0
  scrollHeight.value = `${winHeight - 44 - 80 - safeBottom}px`
})
</script>

<style scoped lang="scss">
// ─── 页面容器 ────────────────────────────────────────────────────────────────

.page {
  min-height: 100vh;
  background: #f5f7fa;
  display: flex;
  flex-direction: column;
}

// ─── 导航栏 ──────────────────────────────────────────────────────────────────

.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  height: 88rpx;
  background: #ffffff;
  border-bottom: 1rpx solid #f1f5f9;
  position: sticky;
  top: 0;
  z-index: 10;
}

.nav-back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #f8fafc;

  &:active {
    background: #e2e8f0;
  }
}

.nav-back-icon {
  font-size: 52rpx;
  color: #374151;
  line-height: 1;
  margin-top: -4rpx;
}

.nav-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #1e293b;
}

.nav-placeholder {
  width: 64rpx;
}

// ─── 滚动区域 ────────────────────────────────────────────────────────────────

.scroll-body {
  flex: 1;
}

// ─── 预览区域 ────────────────────────────────────────────────────────────────

.preview-section {
  padding: 32rpx 32rpx 0;
}

.preview-card {
  border-radius: 32rpx;
  padding: 40rpx 36rpx;
  display: flex;
  align-items: center;
  gap: 28rpx;
  position: relative;
  overflow: hidden;
  box-shadow: 0 12rpx 40rpx rgba(0, 0, 0, 0.15);
  transition: background 0.3s;
}

.preview-icon-wrap {
  width: 100rpx;
  height: 100rpx;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  z-index: 1;
}

.preview-icon {
  font-size: 52rpx;
  line-height: 1;
}

.preview-info {
  flex: 1;
  z-index: 1;
  min-width: 0;
}

.preview-label {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 10rpx;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preview-reward {
  display: block;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.85);

  &--placeholder {
    color: rgba(255, 255, 255, 0.45);
    font-style: italic;
  }
}

// 装饰圆
.preview-deco {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);

  &--1 {
    width: 200rpx;
    height: 200rpx;
    right: -60rpx;
    top: -80rpx;
  }

  &--2 {
    width: 140rpx;
    height: 140rpx;
    right: 60rpx;
    bottom: -60rpx;
  }
}

.preview-hint {
  display: block;
  text-align: center;
  font-size: 22rpx;
  color: #94a3b8;
  margin-top: 16rpx;
  margin-bottom: 8rpx;
}

// ─── 表单卡片 ────────────────────────────────────────────────────────────────

.form-card {
  margin: 24rpx 32rpx 0;
  background: #ffffff;
  border-radius: 32rpx;
  padding: 40rpx 36rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.04);
}

// ─── 表单字段通用 ────────────────────────────────────────────────────────────

.field {
  margin-bottom: 44rpx;

  &:last-child {
    margin-bottom: 0;
  }
}

.field-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.field-label {
  font-size: 28rpx;
  font-weight: 600;
  color: #374151;
}

.field-required {
  font-size: 20rpx;
  color: #ef4444;
  background: #fff1f2;
  border: 1rpx solid #fecdd3;
  border-radius: 100rpx;
  padding: 2rpx 12rpx;
}

.field-optional {
  font-size: 20rpx;
  color: #94a3b8;
  background: #f8fafc;
  border: 1rpx solid #e2e8f0;
  border-radius: 100rpx;
  padding: 2rpx 12rpx;
}

// ─── 单行输入框 ───────────────────────────────────────────────────────────────

.input-wrap {
  display: flex;
  align-items: center;
  background: #f8fafc;
  border: 2rpx solid #e2e8f0;
  border-radius: 20rpx;
  padding: 0 24rpx;
  height: 96rpx;
  transition: border-color 0.2s, box-shadow 0.2s;

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

.input-field {
  flex: 1;
  font-size: 30rpx;
  color: #1e293b;
  height: 100%;
}

.input-placeholder {
  color: #cbd5e1;
  font-size: 28rpx;
}

.input-count {
  font-size: 22rpx;
  color: #94a3b8;
  flex-shrink: 0;
  margin-left: 12rpx;
}

.error-msg {
  display: block;
  font-size: 24rpx;
  color: #ef4444;
  margin-top: 10rpx;
  padding-left: 4rpx;
}

// ─── 多行文本域 ───────────────────────────────────────────────────────────────

.textarea-wrap {
  background: #f8fafc;
  border: 2rpx solid #e2e8f0;
  border-radius: 20rpx;
  padding: 24rpx;
  transition: border-color 0.2s, box-shadow 0.2s;
  position: relative;

  &.input-wrap--focus {
    border-color: #3b82f6;
    background: #eff6ff;
    box-shadow: 0 0 0 6rpx rgba(59, 130, 246, 0.1);
  }
}

.textarea-field {
  width: 100%;
  height: 156rpx; // 约 3 行高
  font-size: 30rpx;
  color: #1e293b;
  line-height: 1.6;
}

.textarea-count {
  display: block;
  text-align: right;
  font-size: 22rpx;
  color: #94a3b8;
  margin-top: 12rpx;
}

// ─── Emoji 选择器 ─────────────────────────────────────────────────────────────

.emoji-scroll {
  width: 100%;
  white-space: nowrap;
}

.emoji-list {
  display: flex;
  gap: 16rpx;
  padding: 8rpx 4rpx 16rpx;
}

.emoji-item {
  flex-shrink: 0;
  width: 88rpx;
  height: 88rpx;
  background: #f8fafc;
  border: 3rpx solid #e2e8f0;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &--selected {
    // 选中样式由 :style 内联动态注入颜色
    border-width: 3rpx;
    transform: scale(1.08);
  }

  &:active {
    transform: scale(0.92);
  }
}

.emoji-text {
  font-size: 44rpx;
  line-height: 1;
}

// ─── 颜色选择器 ───────────────────────────────────────────────────────────────

.color-list {
  display: flex;
  gap: 24rpx;
  flex-wrap: wrap;
  padding: 8rpx 4rpx;
}

.color-item {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.15);
  transition: transform 0.15s, box-shadow 0.15s;
  border: 4rpx solid transparent;
  box-sizing: border-box;
  outline: 4rpx solid transparent;
  outline-offset: 4rpx;

  &:active {
    transform: scale(0.9);
  }

  // 通过 JS 动态加 class 不好实现"选中边框与背景同色"
  // 改用白色 check 标记实现视觉选中效果
}

.color-check {
  font-size: 36rpx;
  color: #ffffff;
  font-weight: 700;
  line-height: 1;
  text-shadow: 0 1rpx 4rpx rgba(0, 0, 0, 0.2);
}

// ─── 底部留白 ────────────────────────────────────────────────────────────────

.bottom-spacer {
  height: 180rpx;
}

// ─── 底部固定按钮栏 ───────────────────────────────────────────────────────────

.footer-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx 40rpx calc(20rpx + env(safe-area-inset-bottom));
  background: linear-gradient(to top, #f5f7fa 60%, transparent);
}

.submit-btn {
  height: 104rpx;
  background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
  border-radius: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  box-shadow: 0 12rpx 32rpx rgba(59, 130, 246, 0.4);
  transition: opacity 0.15s, transform 0.15s;

  &:active {
    opacity: 0.9;
    transform: scale(0.98);
  }

  &--loading {
    opacity: 0.8;
    pointer-events: none;
  }
}

.submit-icon {
  font-size: 36rpx;
  line-height: 1;
}

.submit-text {
  font-size: 34rpx;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 2rpx;
}

// 加载旋转动画
.btn-spinner {
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
</style>
