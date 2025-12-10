/**
 * PDF 阅读器状态管理
 */
import { create } from 'zustand';

interface PDFState {
  // 状态
  scale: number;
  currentPage: number;
  totalPages: number;
  isLoading: boolean;

  // 操作
  setScale: (scale: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  setCurrentPage: (page: number) => void;
  setTotalPages: (total: number) => void;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  setIsLoading: (loading: boolean) => void;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const SCALE_STEP = 0.25;

export const usePDFStore = create<PDFState>((set, get) => ({
  // 初始状态
  scale: 1,
  currentPage: 1,
  totalPages: 0,
  isLoading: false,

  // 设置缩放比例
  setScale: (scale) => {
    const clampedScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));
    set({ scale: clampedScale });
  },

  // 放大
  zoomIn: () => {
    const { scale } = get();
    const newScale = Math.min(MAX_SCALE, scale + SCALE_STEP);
    set({ scale: newScale });
  },

  // 缩小
  zoomOut: () => {
    const { scale } = get();
    const newScale = Math.max(MIN_SCALE, scale - SCALE_STEP);
    set({ scale: newScale });
  },

  // 重置缩放
  resetZoom: () => {
    set({ scale: 1 });
  },

  // 设置当前页
  setCurrentPage: (page) => {
    set({ currentPage: page });
  },

  // 设置总页数
  setTotalPages: (total) => {
    set({ totalPages: total });
  },

  // 跳转到指定页
  goToPage: (page) => {
    const { totalPages } = get();
    if (page >= 1 && page <= totalPages) {
      set({ currentPage: page });
    }
  },

  // 下一页
  nextPage: () => {
    const { currentPage, totalPages } = get();
    if (currentPage < totalPages) {
      set({ currentPage: currentPage + 1 });
    }
  },

  // 上一页
  prevPage: () => {
    const { currentPage } = get();
    if (currentPage > 1) {
      set({ currentPage: currentPage - 1 });
    }
  },

  // 设置加载状态
  setIsLoading: (loading) => {
    set({ isLoading: loading });
  },
}));
