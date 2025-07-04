import "@ant-design/v5-patch-for-react-19";
import React, { useState, useEffect } from "react";
import { InboxOutlined } from "@ant-design/icons";
import type { UploadFile, UploadProps } from "antd";
import { message, Upload, Button, Space, Progress, Card, List, Table, Tag } from "antd";
import { wsManager, type WebSocketMessage } from "./utils/WebSocketManager";
import { API_CONFIG } from "./config/config";

const { Dragger } = Upload;

interface ProcessingStatus {
  taskId: string;
  fileName: string;
  progress: number;
  status: "waiting" | "processing" | "completed" | "error" | "cancelled";
  message?: string;
}

interface TaskResult {
  taskId: string;
  fileName: string;
  status: "completed" | "error" | "cancelled";
  message?: string;
  timestamp: string;
}



interface TaskResponse {
  taskId: string;
  fileName: string;
}

const App: React.FC = () => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [processingTasks, setProcessingTasks] = useState<ProcessingStatus[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [taskResults, setTaskResults] = useState<TaskResult[]>([]);
  // 在组件中定义一个状态存储 sessionId
  const [sessionIddata, setSessionId] = useState<string>('');

  // 初始化 WebSocket 连接
  useEffect(() => {
    // 定义消息处理函数
    const handleWebSocketMessage = (data: WebSocketMessage) => {
      console.log('收到WebSocket消息:', data);
      if (data.type === 'identity' && data.sessionId) {
        setSessionId(data.sessionId); // 存储 sessionId
      }
      if (data.type === "processing") {
        // 处理任务中
        setProcessingTasks((prev) =>
          prev.map((task) =>
            task.taskId === data.taskId
              ? {
                ...task,
                progress: data.progress || task.progress,
                status: data.status as ProcessingStatus["status"] || task.status,
                message: data.message,
              }
              : task
          )
        );
      } else if (data.type === "completed") {
        // 处理完成
        setProcessingTasks((prev) =>
          prev.map((task) =>
            task.taskId === data.taskId
              ? {
                ...task,
                progress: 100,
                status: "completed",
                message: data.message || "处理完成",
              }
              : task
          )
        );
        // 添加到结果列表
        setTaskResults(prev => [...prev, {
          taskId: data.taskId,
          fileName: data.fileName,
          status: "completed",
          message: data.message || "处理完成",
          timestamp: new Date().toLocaleString()
        }]);
      } else if (data.type === "error") {
        // 错误
        setProcessingTasks((prev) =>
          prev.map((task) =>
            task.taskId === data.taskId
              ? { ...task, status: "error", message: data.message }
              : task
          )
        );
        // 添加到结果列表
        setTaskResults(prev => [...prev, {
          taskId: data.taskId,
          fileName: data.fileName,
          status: "error",
          message: data.message,
          timestamp: new Date().toLocaleString()
        }]);
      } else if (data.type === "cancelled") {
        // 任务取消
        setProcessingTasks((prev) =>
          prev.map((task) =>
            task.taskId === data.taskId
              ? { ...task, status: "cancelled", message: "任务已取消" }
              : task
          )
        );
        // 添加到结果列表
        setTaskResults(prev => [...prev, {
          taskId: data.taskId,
          fileName: data.fileName,
          status: "cancelled",
          message: "任务已取消",
          timestamp: new Date().toLocaleString()
        }]);
      }
    };

    // 连接WebSocket并添加监听器
    const initWebSocket = async () => {
      try {
        wsManager.addListener(handleWebSocketMessage);
        await wsManager.connect();
        setWsConnected(true);
        console.log('WebSocket管理器初始化成功');
      } catch (error) {
        console.error('WebSocket连接失败:', error);
        setWsConnected(false);
        message.error('WebSocket连接失败');
      }
    };

    initWebSocket();

    // 清理函数
    return () => {
      wsManager.removeListener(handleWebSocketMessage);
      // 注意：这里不要调用 wsManager.disconnect()
      // 因为其他组件可能还在使用这个连接
    };
  }, []);

  // 监听WebSocket连接状态
  useEffect(() => {
    const checkConnection = setInterval(() => {
      setWsConnected(wsManager.isConnected());
    }, 1000);

    return () => clearInterval(checkConnection);
  }, []);

  const handleUpload = async () => {
    if (fileList.length === 0) {
      message.warning("请先选择要上传的文件");
      return;
    }

    if (!wsConnected) {
      message.error("WebSocket未连接，无法接收处理进度");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      fileList.forEach((file) => {
        formData.append("files", file as unknown as File);
      });

      const response = await fetch(API_CONFIG.upload.multipleFiles, {
        method: "POST",
        headers: {
          "Session-Id": sessionIddata, // 使用存储的 sessionId
        },
        body: formData,
      });

      const result = await response.json();

      if (result.success && result.tasks) {
        // 初始化处理任务状态
        const initialTasks: ProcessingStatus[] = result.tasks.map(
          (task: TaskResponse) => ({
            taskId: task.taskId,
            fileName: task.fileName,
            progress: 0,
            status: "waiting" as const,
            message: "等待处理",
          })
        );

        setProcessingTasks(initialTasks);
        setFileList([]);
        message.success("文件上传成功，开始处理...");
      } else {
        throw new Error(result.message || "上传失败");
      }
    } catch (error) {
      console.error("上传失败:", error);
      message.error("上传失败");
    } finally {
      setUploading(false);
    }
  };

  const props: UploadProps = {
    name: "file",
    multiple: true,
    accept: ".xls,.xlsx",
    fileList: fileList,
    directory: false,
    beforeUpload: (file) => {
      setFileList((prev) => [...prev, file]);
      return false;
    },
    onRemove: (file) => {
      const index = fileList.indexOf(file);
      const newFileList = fileList.slice();
      newFileList.splice(index, 1);
      setFileList(newFileList);
    },
    listType: "picture",
    maxCount: 5,
    onDrop(e) {
      console.log("已删除文件", e.dataTransfer.files);
    },
  };

  const getProgressStatus = (status: ProcessingStatus["status"]) => {
    switch (status) {
      case "completed":
        return "success";
      case "error":
        return "exception";
      case "cancelled":
        return "exception";
      case "processing":
        return "active";
      default:
        return "normal";
    }
  };

  const getStatusColor = (status: ProcessingStatus["status"]) => {
    switch (status) {
      case "completed":
        return "#52c41a";
      case "error":
        return "#f5222d";
      case "cancelled":
        return "#d9d9d9";
      case "processing":
        return "#1890ff";
      case "waiting":
        return "#faad14";
      default:
        return "#666";
    }
  };

  // const cancelTask = async (taskId: string) => {
  //   try {
  //     const response = await fetch(
  //       API_CONFIG.tasks.cancel(taskId),
  //       {
  //         method: "DELETE",
  //       }
  //     );
  //     const result = await response.json();

  //     if (result.success) {
  //       message.success("任务已取消");
  //     } else {
  //       message.error("取消任务失败");
  //     }
  //   } catch {
  //     message.error("取消任务失败");
  //   }
  // };

  // const cancelAllTasks = async () => {
  //   try {
  //     const response = await fetch(API_CONFIG.tasks.base, {
  //       method: "DELETE",
  //     });
  //     const result = await response.json();

  //     if (result.success) {
  //       message.success("所有任务已取消");
  //     } else {
  //       message.error("取消任务失败");
  //     }
  //   } catch {
  //     message.error("取消任务失败");
  //   }
  // };
  
  // 下载错误报告
  const downloadErrorReport = async () => {
    try {
      // 创建一个a标签用于下载
      const link = document.createElement('a');
      // 设置下载链接，预留参数位置
      link.href = API_CONFIG.excel.downloadErrorReport;
      // 设置下载文件名
      link.download = `错误报告_${new Date().toISOString().split('T')[0]}.xlsx`;
      // 添加到body
      document.body.appendChild(link);
      // 模拟点击
      link.click();
      // 移除a标签
      document.body.removeChild(link);
      
      message.success("开始下载错误报告");
    } catch (error) {
      console.error("下载错误报告失败:", error);
      message.error("下载错误报告失败");
    }
  };

  return (
    <Space direction="horizontal" style={{ width: "100%", padding: "20px" }} size="large" align="start">
      <Card
        title="文件上传"
        style={{ maxWidth: "800px", margin: "0 auto" }}
        extra={
          <span style={{
            color: wsConnected ? '#52c41a' : '#f5222d',
            fontSize: '12px'
          }}>
            {wsConnected ? '🟢 已连接' : '🔴 未连接'}
          </span>
        }
      >
        <Dragger {...props}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽上传文件夹</p>
          <p className="ant-upload-hint">
            支持 .xls, .xlsx 格式的文件，
          </p>
        </Dragger>
        <Button
          type="primary"
          onClick={handleUpload}
          disabled={fileList.length === 0 || !wsConnected}
          loading={uploading}
          style={{ marginTop: 16 }}
        >
          {uploading ? "上传中" : "开始上传"}
        </Button>
      </Card>

      {processingTasks.length > 0 && (
        <Card 
          style={{ maxWidth: "800px", margin: "0 auto" }}
          title="处理进度"
        >
          <List 
            dataSource={processingTasks}
            renderItem={(task) => (
              <List.Item>
                <div style={{ width: "100%" }}>
                  <div
                    style={{
                      marginBottom: 8,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <strong>
                        {task.fileName}
                      </strong>
                      {task.status === "processing" && (
                        <span style={{ marginLeft: 8, color: "#1890ff" }}>
                          正在处理...
                        </span>
                      )}
                      {task.status === "waiting" && (
                        <span style={{ marginLeft: 8, color: "#faad14" }}>
                          等待中
                        </span>
                      )}
                    </div>
                    <span
                      style={{
                        color: getStatusColor(task.status),
                        fontSize: "12px",
                      }}
                    >
                      {task.status === "completed" && "已完成"}
                      {task.status === "error" && "处理出错"}
                      {task.status === "cancelled" && "已取消"}
                    </span>
                  </div>
                  <Progress
                    percent={task.progress}
                    status={getProgressStatus(task.status)}
                    showInfo={true}
                  />
                </div>
              </List.Item>
            )}
          />
        </Card>
      )}

      {/* 任务结果表格 */}
      {taskResults.length > 0 && (
        <Card 
          style={{ maxWidth: "800px", margin: "0 auto" }}
          title="处理结果"
          extra={
            <Space>
              {/* 只有存在错误结果时才显示下载错误报告按钮 */}
              {taskResults.some(task => task.status === 'error') && (
                <Button
                  size="small"
                  type="primary"
                  onClick={downloadErrorReport}
                >
                  下载错误报告
                </Button>
              )}
              <Button
                size="small"
                onClick={() => {
                  setTaskResults([]);
                  setProcessingTasks([]);
                }}
              >
                清空记录
              </Button>
            </Space>
          }
        >
          <Table 
            dataSource={taskResults}
            rowKey="taskId"
            pagination={{ pageSize: 5 }}
            columns={[
              {
                title: '文件名',
                dataIndex: 'fileName',
                key: 'fileName',
              },
              {
                title: '状态',
                dataIndex: 'status',
                key: 'status',
                render: (status: string) => {
                  let color = '';
                  let text = '';
                  
                  switch(status) {
                    case 'completed':
                      color = 'success';
                      text = '完成';
                      break;
                    case 'error':
                      color = 'error';
                      text = '错误';
                      break;
                    case 'cancelled':
                      color = 'default';
                      text = '已取消';
                      break;
                    default:
                      color = 'processing';
                      text = status;
                  }
                  
                  return <Tag color={color}>{text}</Tag>;
                }
              },
              {
                title: '消息',
                dataIndex: 'message',
                key: 'message',
                ellipsis: true,
                render: (text: string) => (
                  <span 
                    style={{ cursor: 'pointer' }} 
                    onClick={() => {
                      if (text) {
                        navigator.clipboard.writeText(text)
                          .then(() => message.success('消息已复制到剪贴板'))
                          .catch(() => message.error('复制失败'));
                      }
                    }}
                    title="点击复制消息内容"
                  >
                    {text}
                  </span>
                ),
              },
              {
                title: '时间',
                dataIndex: 'timestamp',
                key: 'timestamp',
              }
            ]}
          />
        </Card>
      )}
    </Space>
  );
};

export default App;