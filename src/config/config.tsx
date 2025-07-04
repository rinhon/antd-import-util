/**
 * 全局配置文件
 * 集中管理所有API地址和端点
 */

// 从环境变量中获取API基础URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7777';

// 构建WebSocket URL (将http://转换为ws://)
const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws');

// API配置
export const API_CONFIG = {
  // 基础URL
  baseUrl: API_BASE_URL,
  
  // WebSocket
  ws: {
    baseUrl: WS_BASE_URL,
    endpoint: '/ws',
    url: `${WS_BASE_URL}/ws`,
  },
  
  // 文件上传
  upload: {
    multipleFiles: `${API_BASE_URL}/fileUpload/multipleFiles`,
  },
  
  // 任务管理
  tasks: {
    base: `${API_BASE_URL}/api/tasks`,
    cancel: (taskId: string) => `${API_BASE_URL}/api/tasks/${taskId}`,
  },
  
  // Excel相关
  excel: {
    downloadErrorReport: `${API_BASE_URL}/api/excel/downloadErrorExcel`,
  },
};

export default API_CONFIG;