// src/utils/websocketManager.ts

export interface WebSocketMessage {
  type: 'processing' | 'completed' | 'error' | 'cancelled' | 'identity';
  taskId: string;
  fileName: string;
  progress?: number;
  status?: string;
  message?: string;
  sessionId?: string;

}

type MessageListener = (data: WebSocketMessage) => void;

class WebSocketManager {
  private ws: WebSocket | null = null;
  private listeners: Set<MessageListener> = new Set();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private url: string;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private isConnecting: boolean = false;

  constructor(url: string) {
    this.url = url;
  }

  /**
   * 连接WebSocket
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      // 如果已经连接或正在连接，直接返回
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        resolve();
        return;
      }

      this.isConnecting = true;
      console.log('正在连接WebSocket...');

      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('WebSocket连接已建立');
          this.reconnectAttempts = 0;
          this.isConnecting = false;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data: WebSocketMessage = JSON.parse(event.data);
            // 通知所有监听器
            this.listeners.forEach(listener => listener(data));
          } catch (error) {
            console.error('解析WebSocket消息失败:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket连接已关闭', event.code, event.reason);
          this.isConnecting = false;
          this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket错误:', error);
          this.isConnecting = false;
          reject(error);
        };

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * 尝试重连
   */
  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('达到最大重连次数，停止重连');
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    console.log(`${delay / 1000}秒后尝试重连... (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect().catch(error => {
        console.error('重连失败:', error);
      });
    }, delay);
  }

  /**
   * 添加消息监听器
   */
  addListener(listener: MessageListener): void {
    this.listeners.add(listener);
  }

  /**
   * 移除消息监听器
   */
  removeListener(listener: MessageListener): void {
    this.listeners.delete(listener);
  }

  /**
   * 发送消息
   */
  send(message: any): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      return true;
    }
    console.warn('WebSocket未连接，无法发送消息');
    return false;
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.listeners.clear();
    this.reconnectAttempts = 0;
    this.isConnecting = false;
    console.log('WebSocket已断开连接');
  }

  /**
   * 获取连接状态
   */
  getReadyState(): number {
    return this.ws ? this.ws.readyState : WebSocket.CLOSED;
  }

  /**
   * 是否已连接
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// 导出单例实例
import { API_CONFIG } from '../config/config';

export const wsManager = new WebSocketManager(API_CONFIG.ws.url);