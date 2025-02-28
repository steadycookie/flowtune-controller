
# 流量-频率控制系统 - 后端

这是控制气泵和流量计的Python后端。

## 安装依赖

确保已安装Python 3.7或更高版本，然后运行：

```bash
pip install -r requirements.txt
```

## 配置串口

在`app.py`文件中，根据实际硬件连接修改以下配置：

```python
PUMP_PORT = 'COM3'  # 修改为实际的泵串口
FLOW_METER_PORT = 'COM4'  # 修改为实际的流量计串口
BAUD_RATE = 9600  # 修改为设备要求的波特率
```

## 运行后端

```bash
python app.py
```

服务器将在`http://localhost:5000`上运行，API端点位于`/api/*`路径下。

## API端点

- `GET /api/status` - 获取系统状态
- `POST /api/connect` - 连接设备
- `POST /api/pump/start` - 启动泵
- `POST /api/pump/stop` - 停止泵
- `POST /api/pump/frequency` - 设置泵频率
- `GET /api/flowmeter/read` - 读取流量
- `GET /api/flowmeter/stable` - 检查流量稳定性
- `POST /api/scan/start` - 开始频率扫描
- `POST /api/scan/stop` - 停止频率扫描
- `GET /api/scan/progress` - 获取扫描进度
- `GET /api/scan/data` - 获取扫描数据

## 模拟模式

如果无法连接真实设备，系统会自动切换到模拟模式，生成随机数据用于测试。
