/**
 * API 配置和基础客户端
 */
import axios, { type AxiosInstance, type AxiosError } from 'axios';

// API 基础配置
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
export const API_PREFIX = '/api';

// 创建 axios 实例
export const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}${API_PREFIX}`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // 可以在这里添加认证 token 等
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // 统一错误处理
    const message = (error.response?.data as { detail?: string })?.detail || error.message;
    console.error('API Error:', message);
    return Promise.reject(new Error(message));
  }
);

/**
 * 创建 SSE (Server-Sent Events) 连接
 */
export function createSSEConnection(url: string): EventSource {
  return new EventSource(`${API_BASE_URL}${API_PREFIX}${url}`);
}

/**
 * 获取文件下载 URL
 */
export function getFileUrl(documentId: string): string {
  return `${API_BASE_URL}${API_PREFIX}/documents/${documentId}/file`;
}
