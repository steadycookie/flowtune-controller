
import { SystemStatus, FlowDataPoint } from './types';

// 模拟数据
let mockSystemStatus: SystemStatus = {
  pumpConnected: false,
  flowMeterConnected: false,
  pumpRunning: false,
  scanning: false,
  currentFrequency: null,
  currentFlowRate: null,
  flowRateStable: false,
  scanProgress: 0,
  error: null
};

let mockScanData: FlowDataPoint[] = [];
let mockScanProgress = {
  progress: 0,
  currentStep: "",
  lastDataPoint: null as FlowDataPoint | null
};

// 模拟扫描过程
let scanInterval: number | null = null;

// 辅助函数 - 生成随机流量
function generateRandomFlow(frequency: number): number {
  // 模拟一个基于频率的流量曲线
  const baseFlow = frequency * 0.1;
  const variance = baseFlow * 0.2;
  return baseFlow + (Math.random() * variance * 2 - variance);
}

// 开始模拟扫描过程
function startMockScan(minFreq: number, maxFreq: number, step: number) {
  if (scanInterval) {
    clearInterval(scanInterval);
  }
  
  mockSystemStatus.scanning = true;
  mockSystemStatus.pumpRunning = true;
  mockScanProgress.progress = 0;
  mockScanProgress.currentStep = "开始扫描...";
  mockScanData = [];
  
  let currentFreq = minFreq;
  const totalSteps = Math.ceil((maxFreq - minFreq) / step);
  let currentStep = 0;
  
  // 创建模拟扫描过程的定时器
  scanInterval = window.setInterval(() => {
    if (currentFreq <= maxFreq) {
      mockSystemStatus.currentFrequency = currentFreq;
      mockSystemStatus.currentFlowRate = generateRandomFlow(currentFreq);
      mockSystemStatus.flowRateStable = true;
      
      const dataPoint = {
        frequency: currentFreq,
        flowRate: mockSystemStatus.currentFlowRate
      };
      
      mockScanData.push(dataPoint);
      mockScanProgress.lastDataPoint = dataPoint;
      mockScanProgress.currentStep = `测量频率 ${currentFreq.toFixed(1)} Hz`;
      
      currentFreq += step;
      currentStep++;
      mockScanProgress.progress = Math.round((currentStep / totalSteps) * 100);
    } else {
      // 扫描完成
      mockSystemStatus.scanning = false;
      mockScanProgress.currentStep = "扫描完成";
      mockScanProgress.progress = 100;
      
      if (scanInterval) {
        clearInterval(scanInterval);
        scanInterval = null;
      }
    }
  }, 1500); // 每1.5秒更新一次
}

// 模拟API响应
export function generateMockResponse<T>(
  endpoint: string,
  method: string,
  body?: any
): Promise<{ success: boolean; data?: T; error?: string }> {
  return new Promise((resolve) => {
    // 添加模拟延迟
    setTimeout(() => {
      // 系统状态
      if (endpoint === '/status') {
        resolve({ success: true, data: { ...mockSystemStatus } as unknown as T });
      }
      
      // 连接设备
      else if (endpoint === '/connect' && method === 'POST') {
        mockSystemStatus.pumpConnected = true;
        mockSystemStatus.flowMeterConnected = true;
        resolve({ 
          success: true, 
          data: { 
            pumpConnected: true, 
            flowMeterConnected: true 
          } as unknown as T 
        });
      }
      
      // 启动泵
      else if (endpoint === '/pump/start' && method === 'POST') {
        mockSystemStatus.pumpRunning = true;
        mockSystemStatus.currentFrequency = 10;
        mockSystemStatus.currentFlowRate = generateRandomFlow(10);
        resolve({ success: true, data: undefined as unknown as T });
      }
      
      // 停止泵
      else if (endpoint === '/pump/stop' && method === 'POST') {
        mockSystemStatus.pumpRunning = false;
        mockSystemStatus.currentFrequency = null;
        mockSystemStatus.currentFlowRate = null;
        mockSystemStatus.flowRateStable = false;
        
        if (mockSystemStatus.scanning) {
          mockSystemStatus.scanning = false;
          if (scanInterval) {
            clearInterval(scanInterval);
            scanInterval = null;
          }
        }
        
        resolve({ success: true, data: undefined as unknown as T });
      }
      
      // 设置频率
      else if (endpoint === '/pump/frequency' && method === 'POST') {
        if (!mockSystemStatus.pumpRunning) {
          resolve({ success: false, error: '泵未运行' });
          return;
        }
        
        const frequency = body?.frequency || 10;
        mockSystemStatus.currentFrequency = frequency;
        mockSystemStatus.currentFlowRate = generateRandomFlow(frequency);
        mockSystemStatus.flowRateStable = true;
        
        resolve({ success: true, data: undefined as unknown as T });
      }
      
      // 读取流量
      else if (endpoint === '/flowmeter/read') {
        if (!mockSystemStatus.pumpRunning || mockSystemStatus.currentFrequency === null) {
          resolve({ success: true, data: 0 as unknown as T });
          return;
        }
        
        const flow = generateRandomFlow(mockSystemStatus.currentFrequency);
        mockSystemStatus.currentFlowRate = flow;
        resolve({ success: true, data: flow as unknown as T });
      }
      
      // 检查流量稳定性
      else if (endpoint === '/flowmeter/stable') {
        if (!mockSystemStatus.pumpRunning) {
          resolve({ success: true, data: false as unknown as T });
          return;
        }
        
        mockSystemStatus.flowRateStable = true;
        resolve({ success: true, data: true as unknown as T });
      }
      
      // 开始扫描
      else if (endpoint === '/scan/start' && method === 'POST') {
        const { minFrequency, maxFrequency, step } = body || {};
        
        if (!mockSystemStatus.pumpConnected || !mockSystemStatus.flowMeterConnected) {
          resolve({ success: false, error: '设备未连接' });
          return;
        }
        
        startMockScan(minFrequency, maxFrequency, step);
        resolve({ success: true, data: undefined as unknown as T });
      }
      
      // 停止扫描
      else if (endpoint === '/scan/stop' && method === 'POST') {
        if (!mockSystemStatus.scanning) {
          resolve({ success: false, error: '没有正在进行的扫描' });
          return;
        }
        
        mockSystemStatus.scanning = false;
        if (scanInterval) {
          clearInterval(scanInterval);
          scanInterval = null;
        }
        
        resolve({ success: true, data: undefined as unknown as T });
      }
      
      // 获取扫描进度
      else if (endpoint === '/scan/progress') {
        resolve({ success: true, data: { ...mockScanProgress } as unknown as T });
      }
      
      // 获取扫描数据
      else if (endpoint === '/scan/data') {
        resolve({ success: true, data: [...mockScanData] as unknown as T });
      }
      
      // 未知端点
      else {
        resolve({ success: false, error: `未实现的模拟API: ${method} ${endpoint}` });
      }
    }, 300); // 添加300ms的延迟模拟网络请求
  });
}
