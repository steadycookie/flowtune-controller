
# 流量-频率控制系统

流量-频率控制系统是一个完整的端到端解决方案，用于控制气泵频率并测量对应流量。该系统包括React前端和Python后端，支持通过串口与真实硬件通信。

## 系统特点

- 实时流量监测与数据可视化
- 泵频率精确控制
- 自动频率-流量扫描
- 数据导出功能
- 设备连接状态监控

## 项目结构

- `src/` - React前端代码
  - `components/` - UI组件
  - `lib/` - 工具函数和API通信
  - `pages/` - 页面组件
- `backend/` - Python后端代码
  - `app.py` - Flask API服务
  - `requirements.txt` - Python依赖

## 快速开始

### 启动后端

1. 进入backend目录
```bash
cd backend
```

2. 安装Python依赖
```bash
pip install -r requirements.txt
```

3. 配置串口（根据实际设备修改`app.py`中的端口设置）

4. 启动Flask服务
```bash
python app.py
```

### 启动前端

1. 安装依赖
```bash
npm install
```

2. 启动开发服务器
```bash
npm run dev
```

## 开发指南

### API通信

前端通过`src/lib/api.ts`中定义的接口与后端通信，所有API调用都返回`ApiResponse`类型的响应。

### 硬件通信

后端使用pyserial库与硬件设备通信，支持通过串口发送和接收命令，也提供了模拟模式用于开发测试。

## 扩展与定制

- 在`backend/app.py`中修改设备通信协议以适配不同的泵和流量计
- 在`src/components/`中自定义UI组件以满足特定需求
- 调整`src/lib/types.ts`中的类型定义以支持更多数据字段

## 技术栈

### 前端
- React
- TypeScript
- Tailwind CSS
- Shadcn/UI
- Recharts

### 后端
- Python
- Flask
- PySerial
