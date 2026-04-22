<template>
  <view class="page">
    <!-- 背景装饰圆 -->
    <view class="bg-circle bg-circle--1" />
    <view class="bg-circle bg-circle--2" />

    <view class="container">
      <!-- Logo 区域 -->
      <view class="logo-section">
        <view class="logo-icon">🔍</view>
        <text class="logo-title">Lost & Find</text>
        <text class="logo-subtitle">丢了东西？让我们帮你找回来</text>
      </view>

      <!-- 登录表单卡片 -->
      <view class="form-card">
        <text class="form-title">手机号登录</text>
        <text class="form-desc">首次登录将自动注册账号</text>

        <!-- 手机号输入框 -->
        <view class="input-group">
          <view class="input-label-row">
            <text class="input-label">手机号</text>
          </view>
          <view class="input-wrapper" :class="{ 'input-wrapper--focus': phoneFocus, 'input-wrapper--error': phoneError }">
            <text class="input-prefix">+86</text>
            <view class="input-divider" />
            <input
              v-model="phone"
              class="input-field"
              type="number"
              placeholder="请输入手机号"
              placeholder-class="input-placeholder"
              maxlength="11"
              @focus="phoneFocus = true; phoneError = ''"
              @blur="onPhoneBlur"
            />
          </view>
          <text v-if="phoneError" class="error-text">{{ phoneError }}</text>
        </view>

        <!-- 验证码输入框 -->
        <view class="input-group">
          <view class="input-label-row">
            <text class="input-label">验证码</text>
          </view>
          <view class="input-wrapper" :class="{ 'input-wrapper--focus': codeFocus, 'input-wrapper--error': codeError }">
            <input
              v-model="code"
              class="input-field"
              type="number"
              placeholder="请输入 6 位验证码"
              placeholder-class="input-placeholder"
              maxlength="6"
              @focus="codeFocus = true; codeError = ''"
              @blur="codeFocus = false"
            />
            <!-- 发送验证码按钮 -->
            <view
              class="send-code-btn"
              :class="{ 'send-code-btn--disabled': !canSendCode }"
              @tap="onSendCode"
            >
              <text class="send-code-text">
                {{ countdown > 0 ? `${countdown}s 后重发` : '获取验证码' }}
              </text>
            </view>
          </view>
          <text v-if="codeError" class="error-text">{{ codeError }}</text>
        </view>

        <!-- 登录按钮 -->
        <view
          class="login-btn"
          :class="{ 'login-btn--loading': loginLoading }"
          @tap="onLogin"
        >
          <view v-if="loginLoading" class="btn-spinner" />
          <text class="login-btn-text">{{ loginLoading ? '登录中...' : '立即登录' }}</text>
        </view>

        <!-- 条款说明 -->
        <text class="terms-text">
          登录即表示同意
          <text class="terms-link">《用户服务协议》</text>
          与
          <text class="terms-link">《隐私政策》</text>
        </text>
      </view>

      <!-- 底部说明 -->
      <view class="bottom-tips">
        <text class="tip-item">🔒 手机号仅用于登录，不会公开</text>
        <text class="tip-item">📱 找到物品后，拾到者直接留言联系你</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useAuthStore } from '@/stores/auth'

// ─── 状态 ───────────────────────────────────────────────────────────────────

const auth = useAuthStore()

const phone = ref('')
const code = ref('')
const phoneError = ref('')
const codeError = ref('')
const phoneFocus = ref(false)
const codeFocus = ref(false)
const countdown = ref(0)
const sendingCode = ref(false)
const loginLoading = ref(false)

let countdownTimer: ReturnType<typeof setInterval> | null = null

// ─── 计算属性 ─────────────────────────────────────────────────────────────────

/** 是否允许发送验证码：手机号合法且不在倒计时中 */
const canSendCode = computed(
  () => /^1\d{10}$/.test(phone.value) && countdown.value === 0 && !sendingCode.value,
)

// ─── 验证方法 ─────────────────────────────────────────────────────────────────

/** 手机号失焦验证 */
function onPhoneBlur() {
  phoneFocus.value = false
  if (phone.value && !/^1\d{10}$/.test(phone.value)) {
    phoneError.value = '请输入正确的 11 位手机号'
  }
}

/** 表单整体校验，返回 true 表示通过 */
function validateForm(): boolean {
  let valid = true
  phoneError.value = ''
  codeError.value = ''

  if (!phone.value) {
    phoneError.value = '请输入手机号'
    valid = false
  } else if (!/^1\d{10}$/.test(phone.value)) {
    phoneError.value = '请输入正确的 11 位手机号'
    valid = false
  }

  if (!code.value) {
    codeError.value = '请输入验证码'
    valid = false
  } else if (code.value.length !== 6) {
    codeError.value = '验证码为 6 位数字'
    valid = false
  }

  return valid
}

// ─── 业务逻辑 ─────────────────────────────────────────────────────────────────

/** 发送验证码 */
async function onSendCode() {
  if (!canSendCode.value) return

  // 手机号校验
  if (!/^1\d{10}$/.test(phone.value)) {
    phoneError.value = '请输入正确的 11 位手机号'
    return
  }

  sendingCode.value = true
  uni.showLoading({ title: '发送中...', mask: true })

  try {
    await auth.sendCode(phone.value)
    uni.hideLoading()
    uni.showToast({ title: '验证码已发送', icon: 'success' })
    startCountdown()
  } catch (err: any) {
    uni.hideLoading()
    const msg = err?.message || '发送失败，请稍后重试'
    uni.showToast({ title: msg, icon: 'none', duration: 2000 })
  } finally {
    sendingCode.value = false
  }
}

/** 启动 60s 倒计时 */
function startCountdown() {
  countdown.value = 60
  countdownTimer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) {
      clearInterval(countdownTimer!)
      countdownTimer = null
    }
  }, 1000)
}

/** 登录 */
async function onLogin() {
  if (loginLoading.value) return
  if (!validateForm()) return

  loginLoading.value = true
  try {
    await auth.login(phone.value, code.value)
    uni.showToast({ title: '登录成功', icon: 'success' })
    // 短暂延迟让 toast 显示完再跳转
    setTimeout(() => {
      uni.reLaunch({ url: '/pages/index/index' })
    }, 600)
  } catch (err: any) {
    const msg = err?.message || '登录失败，请检查验证码'
    uni.showToast({ title: msg, icon: 'none', duration: 2000 })
  } finally {
    loginLoading.value = false
  }
}

// ─── 生命周期 ─────────────────────────────────────────────────────────────────

onLoad(() => {
  // 如果已登录则直接跳转
  if (auth.isLoggedIn) {
    uni.reLaunch({ url: '/pages/index/index' })
  }
})
</script>

<style scoped lang="scss">
// ─── 页面容器 ────────────────────────────────────────────────────────────────

.page {
  min-height: 100vh;
  background: linear-gradient(160deg, #eff6ff 0%, #f5f7fa 50%, #eef2ff 100%);
  position: relative;
  overflow: hidden;
}

// ─── 背景装饰 ────────────────────────────────────────────────────────────────

.bg-circle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.12;

  &--1 {
    width: 600rpx;
    height: 600rpx;
    background: #3b82f6;
    top: -200rpx;
    right: -150rpx;
  }

  &--2 {
    width: 400rpx;
    height: 400rpx;
    background: #6366f1;
    bottom: 100rpx;
    left: -150rpx;
  }
}

// ─── 内容容器 ────────────────────────────────────────────────────────────────

.container {
  position: relative;
  z-index: 1;
  padding: 80rpx 40rpx 60rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

// ─── Logo 区域 ───────────────────────────────────────────────────────────────

.logo-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 64rpx;
}

.logo-icon {
  width: 160rpx;
  height: 160rpx;
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  border-radius: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 80rpx;
  margin-bottom: 28rpx;
  box-shadow: 0 16rpx 48rpx rgba(59, 130, 246, 0.35);
  // uni-app 中用 line-height 让 emoji 垂直居中
  line-height: 160rpx;
  text-align: center;
}

.logo-title {
  font-size: 52rpx;
  font-weight: 800;
  color: #1e293b;
  letter-spacing: 2rpx;
  margin-bottom: 16rpx;
}

.logo-subtitle {
  font-size: 28rpx;
  color: #64748b;
  letter-spacing: 1rpx;
}

// ─── 表单卡片 ────────────────────────────────────────────────────────────────

.form-card {
  width: 100%;
  background: #ffffff;
  border-radius: 40rpx;
  padding: 56rpx 48rpx 48rpx;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.08);
  box-sizing: border-box;
}

.form-title {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 8rpx;
}

.form-desc {
  display: block;
  font-size: 26rpx;
  color: #94a3b8;
  margin-bottom: 52rpx;
}

// ─── 输入框组 ────────────────────────────────────────────────────────────────

.input-group {
  margin-bottom: 36rpx;
}

.input-label-row {
  margin-bottom: 14rpx;
}

.input-label {
  font-size: 28rpx;
  font-weight: 600;
  color: #374151;
}

.input-wrapper {
  display: flex;
  align-items: center;
  background: #f8fafc;
  border: 2rpx solid #e2e8f0;
  border-radius: 20rpx;
  padding: 0 24rpx;
  height: 100rpx;
  transition: border-color 0.2s;

  &--focus {
    border-color: #3b82f6;
    background: #eff6ff;
    box-shadow: 0 0 0 6rpx rgba(59, 130, 246, 0.12);
  }

  &--error {
    border-color: #ef4444;
    background: #fff5f5;
    box-shadow: 0 0 0 6rpx rgba(239, 68, 68, 0.1);
  }
}

.input-prefix {
  font-size: 30rpx;
  color: #374151;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

.input-divider {
  width: 2rpx;
  height: 40rpx;
  background: #e2e8f0;
  margin: 0 20rpx;
  flex-shrink: 0;
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

.error-text {
  display: block;
  font-size: 24rpx;
  color: #ef4444;
  margin-top: 10rpx;
  padding-left: 4rpx;
}

// ─── 发送验证码按钮 ───────────────────────────────────────────────────────────

.send-code-btn {
  flex-shrink: 0;
  padding: 0 24rpx;
  height: 64rpx;
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  &--disabled {
    background: linear-gradient(135deg, #94a3b8, #94a3b8);
    opacity: 0.7;
  }
}

.send-code-text {
  font-size: 24rpx;
  color: #ffffff;
  font-weight: 600;
  white-space: nowrap;
}

// ─── 登录按钮 ────────────────────────────────────────────────────────────────

.login-btn {
  width: 100%;
  height: 104rpx;
  background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
  border-radius: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 12rpx;
  margin-bottom: 36rpx;
  box-shadow: 0 12rpx 32rpx rgba(59, 130, 246, 0.4);
  gap: 16rpx;

  &--loading {
    opacity: 0.85;
  }

  &:active {
    transform: scale(0.98);
    opacity: 0.9;
  }
}

.login-btn-text {
  font-size: 34rpx;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 2rpx;
}

// 加载动画（纯 CSS 旋转圆环）
.btn-spinner {
  width: 36rpx;
  height: 36rpx;
  border: 4rpx solid rgba(255, 255, 255, 0.35);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

// ─── 条款文字 ────────────────────────────────────────────────────────────────

.terms-text {
  display: block;
  text-align: center;
  font-size: 24rpx;
  color: #94a3b8;
  line-height: 1.6;
}

.terms-link {
  color: #3b82f6;
  font-weight: 500;
}

// ─── 底部提示 ────────────────────────────────────────────────────────────────

.bottom-tips {
  margin-top: 52rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18rpx;
}

.tip-item {
  font-size: 26rpx;
  color: #64748b;
  background: rgba(255, 255, 255, 0.7);
  padding: 14rpx 32rpx;
  border-radius: 100rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.9);
}
</style>
