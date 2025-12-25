import { useState, useEffect } from 'react'
import { Eye, EyeOff, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { settingsApi, LLMConfig, LLMConfigUpdate } from '@/api'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [config, setConfig] = useState<LLMConfig | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 表单状态
  const [apiBase, setApiBase] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [embeddingModel, setEmbeddingModel] = useState('')

  // 加载配置
  useEffect(() => {
    if (isOpen) {
      loadConfig()
    }
  }, [isOpen])

  const loadConfig = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await settingsApi.getLLMConfig()
      setConfig(data)
      setApiBase(data.api_base || '')
      setModel(data.model || 'gpt-3.5-turbo')
      setEmbeddingModel(data.embedding_model || 'text-embedding-ada-002')
      setApiKey('') // 不回显密钥
    } catch (err) {
      setError('加载配置失败')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setTestResult(null)
    setSaveSuccess(false)
    try {
      const updateData: LLMConfigUpdate = {
        api_base: apiBase || null,
        model: model || null,
        embedding_model: embeddingModel || null,
      }
      // 只有当用户输入了新的 API Key 才更新
      if (apiKey) {
        updateData.api_key = apiKey
      }
      const data = await settingsApi.updateLLMConfig(updateData)
      setConfig(data)
      setApiKey('') // 清空输入的密钥
      setSaveSuccess(true)
      // 3秒后自动隐藏成功提示
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      setError('保存配置失败')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const result = await settingsApi.testLLMConnection()
      setTestResult(result)
    } catch (err) {
      setTestResult({ success: false, message: '测试请求失败' })
      console.error(err)
    } finally {
      setTesting(false)
    }
  }

  // 常用模型预设
  const modelPresets = [
    { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
    { label: 'GPT-4', value: 'gpt-4' },
    { label: 'GPT-4 Turbo', value: 'gpt-4-turbo-preview' },
    { label: 'GPT-4o', value: 'gpt-4o' },
    { label: 'GPT-4o Mini', value: 'gpt-4o-mini' },
    { label: 'Claude 3 Opus', value: 'claude-3-opus-20240229' },
    { label: 'Claude 3 Sonnet', value: 'claude-3-sonnet-20240229' },
    { label: 'Deepseek Chat', value: 'deepseek-chat' },
  ]

  const embeddingPresets = [
    { label: 'text-embedding-ada-002', value: 'text-embedding-ada-002' },
    { label: 'text-embedding-3-small', value: 'text-embedding-3-small' },
    { label: 'text-embedding-3-large', value: 'text-embedding-3-large' },
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="模型设置" size="lg">
      <div className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <>
            {/* API Base URL */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                API 地址 (Base URL)
              </label>
              <Input
                type="text"
                placeholder="https://api.openai.com/v1 (留空使用官方地址)"
                value={apiBase}
                onChange={(e) => setApiBase(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                支持 OpenAI 兼容的 API 地址，如 DeepSeek、Azure OpenAI 等
              </p>
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                API 密钥 (Key)
              </label>
              <div className="relative">
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  placeholder={config?.api_key_set ? '已设置，输入新密钥可更新' : '请输入 API 密钥'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {config?.api_key_set && config.api_key_preview && (
                <p className="text-xs text-gray-500">
                  当前密钥: {config.api_key_preview}
                </p>
              )}
            </div>

            {/* Model */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                对话模型 (Model)
              </label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="gpt-3.5-turbo"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="flex-1"
                />
                <select
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-800 dark:border-gray-600"
                  value=""
                  onChange={(e) => e.target.value && setModel(e.target.value)}
                >
                  <option value="">选择预设</option>
                  {modelPresets.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Embedding Model */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                嵌入模型 (Embedding Model)
              </label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="text-embedding-ada-002"
                  value={embeddingModel}
                  onChange={(e) => setEmbeddingModel(e.target.value)}
                  className="flex-1"
                />
                <select
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-800 dark:border-gray-600"
                  value=""
                  onChange={(e) => e.target.value && setEmbeddingModel(e.target.value)}
                >
                  <option value="">选择预设</option>
                  {embeddingPresets.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            {/* Save Success Message */}
            {saveSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                保存配置成功！
              </div>
            )}

            {/* Test Result */}
            {testResult && (
              <div
                className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
                  testResult.success
                    ? 'bg-green-50 border border-green-200 text-green-600'
                    : 'bg-red-50 border border-red-200 text-red-600'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                {testResult.message}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={handleTest} disabled={testing}>
                {testing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    测试中...
                  </>
                ) : (
                  '测试连接'
                )}
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    保存中...
                  </>
                ) : (
                  '保存配置'
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
