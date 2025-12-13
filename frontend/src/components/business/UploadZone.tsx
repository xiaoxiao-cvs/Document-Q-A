import React, { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, File, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UploadZoneProps {
  onUpload: (files: File[]) => void
  uploading?: boolean
  accept?: Record<string, string[]>
  maxSize?: number
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  onUpload,
  uploading = false,
  accept = {
    'application/pdf': ['.pdf'],
    'text/plain': ['.txt'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  },
  maxSize = 10 * 1024 * 1024, // 10MB
}) => {
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setSelectedFiles(acceptedFiles)
  }, [])

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

  return (
    <div className="p-4 space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all',
          isDragActive
            ? 'border-dark bg-dark/5 border-solid'
            : 'border-light/30 hover:border-light/50 bg-dark-secondary/50',
          uploading && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input {...getInputProps()} disabled={uploading} />
        <Upload className={cn(
          'w-12 h-12 mx-auto mb-4',
          isDragActive ? 'text-dark' : 'text-light/60'
        )} />
        {isDragActive ? (
          <p className="text-light font-medium">释放以上传文件...</p>
        ) : (
          <>
            <p className="text-light font-medium mb-2">拖拽文件到这里</p>
            <p className="text-light/60 text-sm">或点击选择文件</p>
            <p className="text-light/40 text-xs mt-2">支持 PDF, TXT, DOCX (最大 10MB)</p>
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
                className="flex items-center gap-3 p-3 bg-dark-secondary rounded-xl border border-dark/10"
              >
                <File className="w-4 h-4 text-light/60 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-light truncate">{file.name}</p>
                  <p className="text-xs text-light/40">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                {!uploading && (
                  <button
                    onClick={() => removeFile(index)}
                    className="p-1 hover:bg-dark/20 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-light/60" />
                  </button>
                )}
              </motion.div>
            ))}

            {/* Upload Button */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={handleUpload}
              disabled={uploading}
              className={cn(
                'w-full py-3 px-4 bg-light text-dark rounded-xl font-medium transition-all',
                'hover:bg-light/90 disabled:opacity-50 disabled:cursor-not-allowed',
                'flex items-center justify-center gap-2'
              )}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  上传中...
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
