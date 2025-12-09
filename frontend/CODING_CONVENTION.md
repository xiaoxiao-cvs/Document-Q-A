# 前端编码规范

本文档定义了项目前端开发的编码规范、代码风格、Git 提交规范、异常处理及日志记录标准，旨在保证代码质量和团队协作效率。

---

## 目录

1. [编码规范](#1-编码规范)
2. [代码风格](#2-代码风格)
3. [Git 提交规范](#3-git-提交规范)
4. [异常处理](#4-异常处理)
5. [日志记录](#5-日志记录)

---

## 1. 编码规范

### 1.1 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 组件 | PascalCase | `ChatMessage.tsx`, `PDFViewer.tsx` |
| 函数/方法 | camelCase | `handleSubmit`, `formatDate` |
| 自定义 Hook | camelCase，以 `use` 开头 | `useChat`, `usePDFLoader` |
| 常量 | SCREAMING_SNAKE_CASE | `MAX_FILE_SIZE`, `API_BASE_URL` |
| 类型/接口 | PascalCase，接口以 `I` 开头（可选） | `ChatMessage`, `IUserConfig` |
| 枚举 | PascalCase，成员使用 SCREAMING_SNAKE_CASE | `MessageType.USER_MESSAGE` |
| CSS 类名 | kebab-case（Tailwind 优先） | `chat-container`, `pdf-viewer` |
| 文件名 | 组件用 PascalCase，其他用 camelCase | `ChatPanel.tsx`, `apiClient.ts` |

### 1.2 目录结构规范

```
src/
├── components/           # 组件目录
│   ├── ui/              # 基础 UI 组件 (Button, Input, Modal)
│   ├── chat/            # 聊天相关组件
│   ├── pdf/             # PDF 相关组件
│   └── layout/          # 布局组件
├── hooks/               # 自定义 Hooks
├── stores/              # Zustand 状态管理
├── services/            # API 服务层
├── types/               # TypeScript 类型定义
├── utils/               # 工具函数
├── constants/           # 常量定义
├── styles/              # 全局样式
└── assets/              # 静态资源
```

### 1.3 组件编写规范

```tsx
// 组件文件结构示例: ChatMessage.tsx

// 1. 导入声明（按顺序：React -> 第三方库 -> 本地模块）
import { useState, useCallback } from 'react';
import { clsx } from 'clsx';
import { Button } from '@/components/ui/Button';
import { formatTime } from '@/utils/format';
import type { Message } from '@/types/chat';

// 2. 类型定义
interface ChatMessageProps {
  message: Message;
  isLast?: boolean;
  onRetry?: (id: string) => void;
}

// 3. 组件定义（使用函数声明或箭头函数，保持一致）
export function ChatMessage({ message, isLast = false, onRetry }: ChatMessageProps) {
  // 3.1 状态声明
  const [isExpanded, setIsExpanded] = useState(false);

  // 3.2 副作用 (useEffect)

  // 3.3 事件处理函数
  const handleRetry = useCallback(() => {
    onRetry?.(message.id);
  }, [message.id, onRetry]);

  // 3.4 渲染逻辑
  return (
    <div className={clsx('chat-message', { 'is-last': isLast })}>
      {/* 组件内容 */}
    </div>
  );
}
```

### 1.4 TypeScript 规范

```typescript
// 优先使用 type，复杂对象结构使用 interface
type MessageRole = 'user' | 'assistant' | 'system';

interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  sources?: SourceReference[];
}

// 避免使用 any，必要时使用 unknown 并进行类型守卫
function processData(data: unknown): string {
  if (typeof data === 'string') {
    return data;
  }
  throw new Error('Invalid data type');
}

// 使用泛型增强类型安全
function createStore<T>(initialState: T): Store<T> {
  // ...
}
```

---

## 2. 代码风格

### 2.1 格式化配置

项目使用 ESLint + Prettier 进行代码格式化，配置如下：

```json
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

### 2.2 ESLint 规则

```javascript
// .eslintrc.cjs
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier'
  ],
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': ['warn', { allow: ['warn', 'error'] }]
  }
};
```

### 2.3 代码风格要点

```typescript
// 使用 const 优先，需要重新赋值时使用 let，禁止 var
const MAX_RETRIES = 3;
let currentAttempt = 0;

// 使用模板字符串而非字符串拼接
const message = `用户 ${userName} 上传了文件 ${fileName}`;

// 使用可选链和空值合并运算符
const pageCount = document?.metadata?.pageCount ?? 0;

// 使用解构赋值
const { id, content, timestamp } = message;
const [first, ...rest] = items;

// 使用箭头函数作为回调
const filtered = messages.filter(msg => msg.role === 'user');

// 异步操作使用 async/await
async function fetchDocument(id: string): Promise<Document> {
  const response = await api.get(`/documents/${id}`);
  return response.data;
}

// 条件渲染使用三元运算符或逻辑与
return (
  <div>
    {isLoading ? <Skeleton /> : <Content data={data} />}
    {error && <ErrorMessage message={error} />}
  </div>
);
```

### 2.4 注释规范

```typescript
/**
 * 解析 PDF 文档并提取文本块
 * @param file - 上传的 PDF 文件
 * @param options - 解析配置选项
 * @returns 包含文本块和元数据的解析结果
 * @throws {ParseError} 当文件格式无效时抛出
 */
async function parsePDF(file: File, options?: ParseOptions): Promise<ParseResult> {
  // 实现逻辑
}

// 单行注释用于解释复杂逻辑
// 计算缩放后的坐标位置：原始坐标 * 当前缩放比例
const displayX = originalX * currentScale;

// TODO: 待优化 - 大文件分片上传
// FIXME: 修复 Safari 浏览器兼容性问题
// NOTE: 此处依赖后端返回的坐标格式为 [x0, y0, x1, y1]
```

---

## 3. Git 提交规范

### 3.1 Commit Message 格式

采用 Conventional Commits 规范：

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 3.2 Type 类型说明

| Type | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat(chat): 添加消息重试功能` |
| `fix` | Bug 修复 | `fix(pdf): 修复高亮定位偏移问题` |
| `docs` | 文档更新 | `docs: 更新 API 接口文档` |
| `style` | 代码格式（不影响逻辑） | `style: 格式化代码缩进` |
| `refactor` | 重构（非新功能、非修复） | `refactor(hooks): 重构 useChat 逻辑` |
| `perf` | 性能优化 | `perf(pdf): 优化 PDF 渲染性能` |
| `test` | 测试相关 | `test: 添加 ChatMessage 单元测试` |
| `chore` | 构建/工具变动 | `chore: 更新依赖版本` |
| `revert` | 回滚提交 | `revert: 回滚 feat(chat) 提交` |

### 3.3 Scope 范围说明

| Scope | 说明 |
|-------|------|
| `chat` | 聊天相关功能 |
| `pdf` | PDF 查看器相关 |
| `ui` | UI 组件 |
| `api` | API 服务层 |
| `store` | 状态管理 |
| `hooks` | 自定义 Hooks |
| `utils` | 工具函数 |
| `config` | 配置文件 |

### 3.4 提交示例

```bash
# 新功能
git commit -m "feat(chat): 添加流式消息显示功能"

# Bug 修复（关联 Issue）
git commit -m "fix(pdf): 修复缩放后高亮位置错误

修复了 PDF 缩放时高亮框坐标未同步更新的问题。
原因是坐标换算未考虑当前缩放比例。

Closes #12"

# 重构
git commit -m "refactor(store): 使用 Zustand 替换 Context 状态管理"
```


## 4. 异常处理

### 4.1 异常分类

```typescript
// types/errors.ts

// 基础错误类
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// API 请求错误
export class ApiError extends AppError {
  constructor(
    message: string,
    public statusCode: number,
    public response?: unknown
  ) {
    super(message, 'API_ERROR', statusCode);
    this.name = 'ApiError';
  }
}

// 文件处理错误
export class FileError extends AppError {
  constructor(message: string, code: string) {
    super(message, code);
    this.name = 'FileError';
  }
}

// PDF 解析错误
export class PDFError extends AppError {
  constructor(message: string) {
    super(message, 'PDF_ERROR');
    this.name = 'PDFError';
  }
}

// 网络错误
export class NetworkError extends AppError {
  constructor(message: string = '网络连接失败') {
    super(message, 'NETWORK_ERROR');
    this.name = 'NetworkError';
  }
}
```

### 4.2 错误码定义

```typescript
// constants/errorCodes.ts

export const ERROR_CODES = {
  // 文件相关 (1xxx)
  FILE_TOO_LARGE: { code: 'E1001', message: '文件大小超出限制' },
  FILE_TYPE_INVALID: { code: 'E1002', message: '不支持的文件类型' },
  FILE_UPLOAD_FAILED: { code: 'E1003', message: '文件上传失败' },

  // API 相关 (2xxx)
  API_TIMEOUT: { code: 'E2001', message: '请求超时，请重试' },
  API_UNAUTHORIZED: { code: 'E2002', message: '未授权访问' },
  API_SERVER_ERROR: { code: 'E2003', message: '服务器错误' },

  // PDF 相关 (3xxx)
  PDF_LOAD_FAILED: { code: 'E3001', message: 'PDF 加载失败' },
  PDF_RENDER_ERROR: { code: 'E3002', message: 'PDF 渲染错误' },
  PDF_PAGE_NOT_FOUND: { code: 'E3003', message: '页面不存在' },

  // 聊天相关 (4xxx)
  CHAT_SEND_FAILED: { code: 'E4001', message: '消息发送失败' },
  CHAT_STREAM_ERROR: { code: 'E4002', message: '消息流中断' },
  CHAT_TOKEN_EXCEEDED: { code: 'E4003', message: 'Token 超出限制' },
} as const;
```

### 4.3 异常处理模式

```typescript
// API 层异常处理
async function uploadDocument(file: File): Promise<UploadResult> {
  try {
    // 前置校验
    if (file.size > MAX_FILE_SIZE) {
      throw new FileError(ERROR_CODES.FILE_TOO_LARGE.message, 'E1001');
    }

    const response = await api.post('/upload', file);
    return response.data;
  } catch (error) {
    // 错误转换和上报
    if (error instanceof FileError) {
      throw error;
    }
    if (axios.isAxiosError(error)) {
      logger.error('文件上传失败', { error, fileName: file.name });
      throw new ApiError(
        error.response?.data?.message || '上传失败',
        error.response?.status || 500
      );
    }
    throw new AppError('未知错误', 'UNKNOWN_ERROR');
  }
}

// 组件层异常处理
function DocumentUploader() {
  const [error, setError] = useState<AppError | null>(null);

  const handleUpload = async (file: File) => {
    try {
      setError(null);
      await uploadDocument(file);
    } catch (err) {
      if (err instanceof AppError) {
        setError(err);
        logger.warn('上传操作失败', { code: err.code });
      } else {
        setError(new AppError('操作失败', 'UNKNOWN_ERROR'));
        logger.error('未捕获的异常', { error: err });
      }
    }
  };

  return (
    <div>
      {error && <ErrorAlert message={error.message} code={error.code} />}
      {/* 上传组件 */}
    </div>
  );
}
```

### 4.4 全局错误边界

```tsx
// components/ErrorBoundary.tsx

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{ fallback?: React.ReactNode }>,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('React 组件错误', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

---

## 5. 日志记录

### 5.1 日志级别定义

| 级别 | 方法 | 说明 | 使用场景 |
|------|------|------|----------|
| DEBUG | `logger.debug()` | 调试信息 | 开发环境详细调试，变量值追踪 |
| INFO | `logger.info()` | 一般信息 | 关键操作记录，流程节点标记 |
| WARN | `logger.warn()` | 警告信息 | 非致命错误，降级处理，性能警告 |
| ERROR | `logger.error()` | 错误信息 | 异常捕获，操作失败，系统错误 |

### 5.2 日志工具实现

```typescript
// utils/logger.ts

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private logLevel: LogLevel = this.isDevelopment ? 'debug' : 'info';

  private readonly levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  private shouldLog(level: LogLevel): boolean {
    return this.levelPriority[level] >= this.levelPriority[this.logLevel];
  }

  private formatEntry(level: LogLevel, message: string, context?: LogContext): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    };
  }

  private output(entry: LogEntry): void {
    const { level, timestamp, message, context } = entry;
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    switch (level) {
      case 'debug':
        console.debug(prefix, message, context ?? '');
        break;
      case 'info':
        console.info(prefix, message, context ?? '');
        break;
      case 'warn':
        console.warn(prefix, message, context ?? '');
        break;
      case 'error':
        console.error(prefix, message, context ?? '');
        break;
    }

    // 生产环境可对接远程日志服务
    if (!this.isDevelopment && level === 'error') {
      this.reportToServer(entry);
    }
  }

  private async reportToServer(entry: LogEntry): Promise<void> {
    try {
      // 对接远程日志服务（如 Sentry、自建服务等）
      // await fetch('/api/logs', { method: 'POST', body: JSON.stringify(entry) });
    } catch {
      // 静默失败，避免循环错误
    }
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      this.output(this.formatEntry('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      this.output(this.formatEntry('info', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      this.output(this.formatEntry('warn', message, context));
    }
  }

  error(message: string, context?: LogContext): void {
    if (this.shouldLog('error')) {
      this.output(this.formatEntry('error', message, context));
    }
  }
}

export const logger = new Logger();
```

### 5.3 日志使用规范

```typescript
// DEBUG - 开发调试信息
logger.debug('PDF 坐标换算', {
  originalBbox: [100, 200, 300, 400],
  scale: 1.5,
  displayBbox: [150, 300, 450, 600],
});

logger.debug('组件状态更新', {
  component: 'ChatPanel',
  prevState: { messageCount: 5 },
  nextState: { messageCount: 6 },
});

// INFO - 关键操作记录
logger.info('用户上传文档', {
  fileName: 'report.pdf',
  fileSize: 1024000,
  pageCount: 15,
});

logger.info('问答请求发送', {
  fileId: 'doc_123',
  questionLength: 50,
});

logger.info('流式响应完成', {
  fileId: 'doc_123',
  tokenCount: 256,
  duration: 3500,
});

// WARN - 警告信息
logger.warn('API 响应延迟', {
  endpoint: '/api/chat',
  duration: 5000,
  threshold: 3000,
});

logger.warn('文件大小接近限制', {
  fileName: 'large.pdf',
  fileSize: 9500000,
  maxSize: 10000000,
});

logger.warn('降级使用缓存数据', {
  reason: 'API 请求失败',
  cacheAge: 300000,
});

// ERROR - 错误信息
logger.error('PDF 加载失败', {
  fileId: 'doc_456',
  error: 'Invalid PDF structure',
  stack: error.stack,
});

logger.error('消息发送失败', {
  messageId: 'msg_789',
  statusCode: 500,
  response: errorResponse,
});

logger.error('未捕获的异常', {
  component: 'PDFViewer',
  error: error.message,
  props: { fileId, currentPage },
});
```

### 5.4 日志输出示例

```
[2025-01-15T10:30:00.123Z] [DEBUG] PDF 坐标换算 { originalBbox: [100, 200, 300, 400], scale: 1.5 }
[2025-01-15T10:30:01.456Z] [INFO] 用户上传文档 { fileName: 'report.pdf', fileSize: 1024000 }
[2025-01-15T10:30:05.789Z] [WARN] API 响应延迟 { endpoint: '/api/chat', duration: 5000 }
[2025-01-15T10:30:10.012Z] [ERROR] PDF 加载失败 { fileId: 'doc_456', error: 'Invalid PDF structure' }
```

---

## 附录：配置文件模板

### ESLint 配置

```javascript
// .eslintrc.cjs
module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
};
```

### Prettier 配置

```json
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

### TypeScript 配置

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

---

**文档版本**: 1.0.0  
**最后更新**: 2025-01-15  
**维护者**: Document Q&A 开发团队
