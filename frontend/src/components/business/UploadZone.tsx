
import React, { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, File, X, Loader2, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ProgressBar } from '../ui/Progress'

interface UploadZoneProps {
  onUpload: (files: File[]) => void
  uploading?: boolean
  uploadProgress?: number
  accept?: Record<string, string[]>
  maxSize?: number
  compact?: boolean
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  onUpload,
  uploading = false,
  uploadProgress = 0,
  accept = {
    'application/pdf': ['.pdf'],
    'text/plain': ['.txt'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  },
  maxSize = 10 * 1024 * 1024, // 10MB
  compact = false,
}) => {
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (compact) {
      // 紧凑模式直接上传
      onUpload(acceptedFiles)
    } else {
      setSelectedFiles(acceptedFiles)
    }
  }, [compact, onUpload])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: true,
  })

  const handleUpload = () => {
    if (selectedFiles.length > 0) {
      onUpload(selectedFiles)
      setSelectedFiles([])
    }
  }

  const removeFile = (index: number) => {
    setSelectedFiles(files => files.filter((_, i) => i !== index))
  }

  // 紧凑模式 - 卡片大小的上传区
  if (compact) {
    return (
      <div
        {...getRootProps()}
        className={cn(
          'flex-shrink-0 w-56 cursor-pointer group/upload',
          'bg-white rounded-xl border-2 border-dashed border-gray-300',
          'hover:border-gray-400 hover:bg-gray-50 transition-all duration-200',
          isDragActive && 'border-gray-500 bg-gray-100 border-solid',
          uploading && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input {...getInputProps()} disabled={uploading} />
        {/* 上半部分 - 图标区域，与缩略图高度一致 */}
        <div className="h-32 flex flex-col items-center justify-center border-b border-gray-100">
          {uploading ? (
            <>
              <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
              {uploadProgress > 0 && (
                <p className="text-xs text-gray-400 mt-2">{uploadProgress}%</p>
              )}
            </>
          ) : isDragActive ? (
            <Upload className="w-8 h-8 text-gray-600" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center group-hover/upload:bg-gray-200 transition-colors">
              <Plus className="w-6 h-6 text-gray-500" />
            </div>
          )}
        </div>
        {/* 下半部分 - 文字区域，与文档信息区域一致 */}
        <div className="p-3">
          <p className="text-sm text-gray-700 font-medium mb-1">
            {uploading ? '上传中...' : isDragActive ? '释放上传' : '上传文档'}
          </p>
          <p className="text-xs text-gray-400">点击或拖拽文件</p>
          <p className="text-xs text-gray-300 mt-1">PDF, TXT, DOCX</p>
        </div>
      </div>
    )
  }

  // 标准模式 - 大上传区
  return (
    <div className="p-4 space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all',
          isDragActive
            ? 'border-gray-600 bg-gray-100 border-solid'
            : 'border-gray-300 hover:border-gray-400 bg-gray-50',
          uploading && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input {...getInputProps()} disabled={uploading} />
        <Upload className={cn(
          'w-12 h-12 mx-auto mb-4',
          isDragActive ? 'text-gray-700' : 'text-gray-400'
        )} />
        {isDragActive ? (
          <p className="text-gray-700 font-medium">释放以上传文件...</p>
        ) : (
          <>
            <p className="text-gray-700 font-medium mb-2">拖拽文件到这里</p>
            <p className="text-gray-500 text-sm">或点击选择文件</p>
            <p className="text-gray-400 text-xs mt-2">支持 PDF, TXT, DOCX (最大 10MB)</p>
          </>
        )}
      </div>

      {/* Selected Files */}
      <AnimatePresence>
        {selectedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            {selectedFiles.map((file, index) => (
              <motion.div
                key={`${file.name}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200"
              >
                <File className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate">{file.name}</p>
                  <p className="text-xs text-gray-400">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                {!uploading && (
                  <button
                    onClick={() => removeFile(index)}
                    className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                )}
              </motion.div>
            ))}

            {/* Upload Progress */}
            {uploading && uploadProgress > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <ProgressBar 
                  progress={uploadProgress} 
                  variant={uploadProgress === 100 ? 'success' : 'default'}
                />
              </motion.div>
            )}

            {/* Upload Button */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={handleUpload}
              disabled={uploading}
              className={cn(
                'w-full py-3 px-4 bg-gray-800 text-white rounded-xl font-medium transition-all',
                'hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed',
                'flex items-center justify-center gap-2'
              )}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  上传中... {uploadProgress > 0 && `${uploadProgress}%`}
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  上传 {selectedFiles.length} 个文件
                </>
              )}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
