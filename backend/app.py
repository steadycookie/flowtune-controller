
from flask import Flask, request, jsonify
from flask_cors import CORS
import time
import threading
import random
import serial
import json
import logging
from typing import Dict, List, Optional, Union, Any

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 全局状态
system_state = {
    "pumpConnected": False,
    "flowMeterConnected": False,
    "pumpRunning": False,
    "scanning": False,
    "currentFrequency": None,
    "currentFlowRate": None,
    "flowRateStable": False,
    "scanProgress": 0,
    "error": None
}

# 扫描线程状态
scan_thread = None
scan_data = []
scan_status = {
    "running": False,
    "progress": 0,
    "currentStep": "",
    "lastDataPoint": None
}

# 流量计读数历史，用于判断稳定性
flow_readings_history = []

# 串口连接实例
pump_serial = None
flow_meter_serial = None

# 串口配置
PUMP_PORT = 'COM3'  # 根据实际情况修改
FLOW_METER_PORT = 'COM4'  # 根据实际情况修改
BAUD_RATE = 9600

# 辅助函数 - 模拟设备通信（当无法连接真实设备时使用）
def simulate_device_response(command: str) -> str:
    """模拟设备响应，用于测试"""
    time.sleep(0.1)  # 模拟通信延迟
    if "READ" in command:
        return f"VALUE:{random.uniform(0.5, 5.0):.2f}"
    elif "FREQ" in command:
        freq = command.split(":")[-1]
        return f"OK:FREQ:{freq}"
    elif "START" in command:
        return "OK:PUMP:RUNNING"
    elif "STOP" in command:
        return "OK:PUMP:STOPPED"
    return "OK"

# 设备通信函数
def send_command_to_pump(command: str) -> str:
    """向泵发送命令并返回响应"""
    if pump_serial and pump_serial.is_open:
        try:
            pump_serial.write(f"{command}\r\n".encode())
            time.sleep(0.1)
            response = pump_serial.read_all().decode().strip()
            return response
        except Exception as e:
            logger.error(f"泵通信错误: {e}")
            return f"ERROR:{str(e)}"
    return simulate_device_response(command)

def read_flow_meter() -> float:
    """读取流量计的值"""
    if flow_meter_serial and flow_meter_serial.is_open:
        try:
            flow_meter_serial.write(b"READ\r\n")
            time.sleep(0.1)
            response = flow_meter_serial.read_all().decode().strip()
            if "VALUE:" in response:
                value = float(response.split(":")[-1])
                return value
            return 0.0
        except Exception as e:
            logger.error(f"流量计通信错误: {e}")
            return 0.0
    return random.uniform(0.5, 5.0)  # 模拟读数

def is_flow_stable() -> bool:
    """判断流量是否稳定"""
    global flow_readings_history
    
    if len(flow_readings_history) < 5:
        return False
    
    # 只取最近5个读数
    recent = flow_readings_history[-5:]
    avg = sum(recent) / len(recent)
    
    # 计算每个读数与平均值的偏差百分比
    deviations = [abs((val - avg) / avg) * 100 for val in recent]
    max_deviation = max(deviations)
    
    # 如果最大偏差小于5%，则认为稳定
    return max_deviation < 5.0

# 扫描函数
def run_frequency_scan(min_freq: float, max_freq: float, step: float):
    """执行频率扫描的线程函数"""
    global scan_status, scan_data, system_state
    
    scan_data = []
    scan_status["running"] = True
    scan_status["progress"] = 0
    total_steps = int((max_freq - min_freq) / step) + 1
    current_step = 0
    
    try:
        # 启动泵（如果尚未运行）
        if not system_state["pumpRunning"]:
            scan_status["currentStep"] = "启动泵..."
            send_command_to_pump("PUMP:START")
            system_state["pumpRunning"] = True
            time.sleep(1)  # 等待泵启动
        
        # 执行频率扫描
        for freq in [min_freq + step * i for i in range(total_steps)]:
            # 检查是否取消扫描
            if not scan_status["running"]:
                break
                
            freq = round(freq, 1)  # 四舍五入到一位小数
            
            # 设置频率
            scan_status["currentStep"] = f"设置频率: {freq} Hz"
            response = send_command_to_pump(f"PUMP:FREQ:{freq}")
            
            if "ERROR" in response:
                raise Exception(f"设置频率失败: {response}")
                
            system_state["currentFrequency"] = freq
            time.sleep(2)  # 等待泵调整到新频率
            
            # 等待流量稳定
            scan_status["currentStep"] = "等待流量稳定..."
            stable = False
            attempts = 0
            flow_readings_history.clear()
            
            while not stable and attempts < 20:
                # 读取流量
                flow = read_flow_meter()
                flow_readings_history.append(flow)
                system_state["currentFlowRate"] = flow
                
                # 检查稳定性
                if len(flow_readings_history) >= 5:
                    stable = is_flow_stable()
                    system_state["flowRateStable"] = stable
                
                time.sleep(0.5)
                attempts += 1
            
            # 获取最终读数（最后3个读数的平均值）
            if len(flow_readings_history) >= 3:
                flow_rate = sum(flow_readings_history[-3:]) / 3
            else:
                flow_rate = flow_readings_history[-1] if flow_readings_history else 0
                
            # 添加数据点
            data_point = {"frequency": freq, "flowRate": round(flow_rate, 3)}
            scan_data.append(data_point)
            scan_status["lastDataPoint"] = data_point
            
            # 更新进度
            current_step += 1
            scan_status["progress"] = int((current_step / total_steps) * 100)
        
        scan_status["currentStep"] = "扫描完成"
        
    except Exception as e:
        logger.error(f"扫描过程错误: {e}")
        scan_status["currentStep"] = f"错误: {str(e)}"
        system_state["error"] = str(e)
    finally:
        # 停止泵
        send_command_to_pump("PUMP:STOP")
        system_state["pumpRunning"] = False
        system_state["scanning"] = False
        scan_status["running"] = False
        scan_status["progress"] = 100 if current_step == total_steps else scan_status["progress"]

# API路由
@app.route('/api/status', methods=['GET'])
def get_status():
    """获取系统状态"""
    # 更新当前流量（如果泵在运行）
    if system_state["pumpRunning"]:
        flow = read_flow_meter()
        flow_readings_history.append(flow)
        if len(flow_readings_history) > 10:
            flow_readings_history.pop(0)
        system_state["currentFlowRate"] = flow
        system_state["flowRateStable"] = is_flow_stable()
    
    return jsonify(system_state)

@app.route('/api/connect', methods=['POST'])
def connect_devices():
    """连接泵和流量计"""
    global pump_serial, flow_meter_serial, system_state
    
    result = {"pumpConnected": False, "flowMeterConnected": False}
    
    try:
        # 尝试连接泵
        try:
            pump_serial = serial.Serial(PUMP_PORT, BAUD_RATE, timeout=1)
            system_state["pumpConnected"] = True
            result["pumpConnected"] = True
            logger.info("泵连接成功")
        except Exception as e:
            logger.warning(f"泵连接失败: {e}")
            # 在开发/测试环境中，可以模拟连接成功
            system_state["pumpConnected"] = True
            result["pumpConnected"] = True
            
        # 尝试连接流量计
        try:
            flow_meter_serial = serial.Serial(FLOW_METER_PORT, BAUD_RATE, timeout=1)
            system_state["flowMeterConnected"] = True
            result["flowMeterConnected"] = True
            logger.info("流量计连接成功")
        except Exception as e:
            logger.warning(f"流量计连接失败: {e}")
            # 在开发/测试环境中，可以模拟连接成功
            system_state["flowMeterConnected"] = True
            result["flowMeterConnected"] = True
        
        system_state["error"] = None
        return jsonify(result)
        
    except Exception as e:
        error_msg = f"连接设备失败: {str(e)}"
        system_state["error"] = error_msg
        return jsonify({"error": error_msg}), 500

@app.route('/api/pump/start', methods=['POST'])
def start_pump():
    """启动泵"""
    if not system_state["pumpConnected"]:
        return jsonify({"error": "泵未连接"}), 400
        
    response = send_command_to_pump("PUMP:START")
    if "ERROR" in response:
        return jsonify({"error": f"启动泵失败: {response}"}), 500
        
    system_state["pumpRunning"] = True
    return jsonify({"success": True})

@app.route('/api/pump/stop', methods=['POST'])
def stop_pump():
    """停止泵"""
    if not system_state["pumpConnected"]:
        return jsonify({"error": "泵未连接"}), 400
        
    response = send_command_to_pump("PUMP:STOP")
    if "ERROR" in response:
        return jsonify({"error": f"停止泵失败: {response}"}), 500
        
    system_state["pumpRunning"] = False
    system_state["currentFrequency"] = None
    system_state["currentFlowRate"] = None
    system_state["flowRateStable"] = False
    return jsonify({"success": True})

@app.route('/api/pump/frequency', methods=['POST'])
def set_frequency():
    """设置泵频率"""
    data = request.json
    frequency = data.get('frequency')
    
    if frequency is None:
        return jsonify({"error": "未提供频率参数"}), 400
    
    if not system_state["pumpConnected"]:
        return jsonify({"error": "泵未连接"}), 400
        
    if not system_state["pumpRunning"]:
        return jsonify({"error": "泵未运行"}), 400
    
    response = send_command_to_pump(f"PUMP:FREQ:{frequency}")
    if "ERROR" in response:
        return jsonify({"error": f"设置频率失败: {response}"}), 500
    
    system_state["currentFrequency"] = float(frequency)
    return jsonify({"success": True})

@app.route('/api/flowmeter/read', methods=['GET'])
def get_flow_rate():
    """读取流量计"""
    if not system_state["flowMeterConnected"]:
        return jsonify({"error": "流量计未连接"}), 400
    
    flow = read_flow_meter()
    flow_readings_history.append(flow)
    if len(flow_readings_history) > 10:
        flow_readings_history.pop(0)
    
    system_state["currentFlowRate"] = flow
    return jsonify(flow)

@app.route('/api/flowmeter/stable', methods=['GET'])
def check_flow_stable():
    """检查流量是否稳定"""
    if not system_state["flowMeterConnected"]:
        return jsonify({"error": "流量计未连接"}), 400
    
    stable = is_flow_stable()
    system_state["flowRateStable"] = stable
    return jsonify(stable)

@app.route('/api/scan/start', methods=['POST'])
def start_scan():
    """开始频率扫描"""
    global scan_thread, scan_status, system_state
    
    if scan_status["running"]:
        return jsonify({"error": "扫描已在进行中"}), 400
    
    if not system_state["pumpConnected"] or not system_state["flowMeterConnected"]:
        return jsonify({"error": "设备未连接"}), 400
    
    data = request.json
    min_freq = float(data.get('minFrequency', 10))
    max_freq = float(data.get('maxFrequency', 50))
    step = float(data.get('step', 5))
    
    if min_freq >= max_freq:
        return jsonify({"error": "最小频率必须小于最大频率"}), 400
    
    if step <= 0:
        return jsonify({"error": "步长必须大于0"}), 400
    
    # 启动扫描线程
    scan_thread = threading.Thread(
        target=run_frequency_scan,
        args=(min_freq, max_freq, step)
    )
    scan_thread.daemon = True
    scan_thread.start()
    
    system_state["scanning"] = True
    return jsonify({"success": True})

@app.route('/api/scan/stop', methods=['POST'])
def stop_scan():
    """停止频率扫描"""
    global scan_status, system_state
    
    if not scan_status["running"]:
        return jsonify({"error": "没有正在进行的扫描"}), 400
    
    scan_status["running"] = False
    scan_status["currentStep"] = "扫描已停止"
    system_state["scanning"] = False
    
    return jsonify({"success": True})

@app.route('/api/scan/progress', methods=['GET'])
def get_scan_progress():
    """获取扫描进度"""
    return jsonify({
        "progress": scan_status["progress"],
        "currentStep": scan_status["currentStep"],
        "lastDataPoint": scan_status["lastDataPoint"]
    })

@app.route('/api/scan/data', methods=['GET'])
def get_scan_data():
    """获取扫描数据"""
    return jsonify(scan_data)

if __name__ == '__main__':
    # 尝试连接设备
    try:
        pump_serial = serial.Serial(PUMP_PORT, BAUD_RATE, timeout=1)
        system_state["pumpConnected"] = True
        logger.info("泵连接成功")
    except Exception as e:
        logger.warning(f"泵连接失败，将使用模拟模式: {e}")
        # 在开发/测试环境中，设置为已连接便于测试
        system_state["pumpConnected"] = True
    
    try:
        flow_meter_serial = serial.Serial(FLOW_METER_PORT, BAUD_RATE, timeout=1)
        system_state["flowMeterConnected"] = True
        logger.info("流量计连接成功")
    except Exception as e:
        logger.warning(f"流量计连接失败，将使用模拟模式: {e}")
        # 在开发/测试环境中，设置为已连接便于测试
        system_state["flowMeterConnected"] = True
    
    # 启动Flask应用
    app.run(host='0.0.0.0', port=5000, debug=True)
