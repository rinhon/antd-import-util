import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Progress, List, Button, Space } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";

interface UploadProgress {
  filename: string;
  percent: number;
  // status: "success" | "exception" | "active" | "uploading" | "pending" | "canceled"; // 添加你使用的所有其他状态
  status: string; 
}
const UploadStatusData = {
  success: 'success',
  exception: 'exception',
  active: 'active',
  uploading: 'uploading',
  pending: 'pending',
  canceled: 'canceled',
} as const;


const UploadProgress: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [progressData, setProgressData] = useState<UploadProgress[]>([]);
  const [uploading, setUploading] = useState(false);
  const [completed, setCompleted] = useState(false);

  // 从路由状态获取文件列表
  const files = location.state?.files || [];

  useEffect(() => {
    if (files.length > 0 && !uploading && !completed) {
      startUpload();
    }
  }, []);

  const startUpload = () => {
    setUploading(true);
    setProgressData(files.map((filename: string) => ({
      filename,
      percent: 0,
      status: 'active'
    })));

    // 模拟从服务端获取进度
    const interval = setInterval(() => {
      setProgressData((prev) => {
        const newData = prev.map((item) => {
          if (item.percent < 100) {
            const increment = Math.floor(Math.random() * 10) + 5;
            const newPercent = Math.min(item.percent + increment, 100);
            return {
              ...item,
              percent: newPercent,
              status: newPercent === 100 ? UploadStatusData.success : UploadStatusData.active
            };
          }
          return item;
        });

        // 检查是否全部完成
        if (newData.every(item => item.percent === 100)) {
          clearInterval(interval);
          setCompleted(true);
        }

        return newData;
      });
    }, 800);
  };

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate(-1)}
        >
          返回
        </Button>
        
        <h2>文件上传进度</h2>
        
        <List
          dataSource={progressData}
          renderItem={item => (
            <List.Item>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>{item.filename}</div>
                <Progress 
                  percent={item.percent} 
                  status={item.status as "success" | "exception" | "active" | "normal" | undefined}
                  strokeColor={item.status === 'success' ? '#52c41a' : undefined}
                />
              </Space>
            </List.Item>
          )}
        />

        {completed && (
          <Button 
            type="primary" 
            onClick={() => navigate('/')}
          >
            返回首页
          </Button>
        )}
      </Space>
    </div>
  );
};

export default UploadProgress;
