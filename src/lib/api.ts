
import { SystemStatus, FlowDataPoint, ApiResponse, ApiConfig } from './types';
import { generateMockResponse } from './mockApi';

// API配置
const API_CONFIG: ApiConfig = {
  baseUrl: 'http://localhost:5000/api',
  // 在Lovable环境中自动启用模拟模式
  useMock: typeof window !== 'undefined' && 
           window.location.hostname.includes('lovableproject.com')
};

// 基础请求函数
async function fetchApi<T>(
  endpoint: string, 
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any
): Promise<ApiResponse<T>> {
  // 如果启用了模拟模式，使用模拟数据
  if (API_CONFIG.useMock) {
    console.log(`[Mock API] ${method} ${endpoint}`);
    return generateMockResponse<T>(endpoint, method, body);
  }

  try {
    const response = await fetch(`${API_CONFIG.baseUrl}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || '请求失败');
    }
    
    return { success: true, data: data as T };
  } catch (error) {
    console.error('API请求错误:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '未知错误'
    };
  }
}

// 系统API
export async function getSystemStatus(): Promise<ApiResponse<SystemStatus>> {
  return await fetchApi<SystemStatus>('/status');
}

export async function connectDevices(): Promise<ApiResponse<{ pumpConnected: boolean, flowMeterConnected: boolean }>> {
  return await fetchApi<{ pumpConnected: boolean, flowMeterConnected: boolean }>('/connect', 'POST');
}

// 泵控制API
export async function startPump(): Promise<ApiResponse<void>> {
  return await fetchApi<void>('/pump/start', 'POST');
}

export async function stopPump(): Promise<ApiResponse<void>> {
  return await fetchApi<void>('/pump/stop', 'POST');
}

export async function setPumpFrequency(frequency: number): Promise<ApiResponse<void>> {
  return await fetchApi<void>('/pump/frequency', 'POST', { frequency });
}

// 流量计API
export async function readFlowMeter(): Promise<ApiResponse<number>> {
  return await fetchApi<number>('/flowmeter/read');
}

export async function isFlowStable(): Promise<ApiResponse<boolean>> {
  return await fetchApi<boolean>('/flowmeter/stable');
}

// 扫描控制API
export async function startScan(settings: {
  minFrequency: number;
  maxFrequency: number;
  step: number;
}): Promise<ApiResponse<void>> {
  return await fetchApi<void>('/scan/start', 'POST', settings);
}

export async function stopScan(): Promise<ApiResponse<void>> {
  return await fetchApi<void>('/scan/stop', 'POST');
}

export async function getScanProgress(): Promise<ApiResponse<{
  progress: number;
  currentStep: string;
  lastDataPoint?: FlowDataPoint;
}>> {
  return await fetchApi<{
    progress: number;
    currentStep: string;
    lastDataPoint?: FlowDataPoint;
  }>('/scan/progress');
}

export async function getScanData(): Promise<ApiResponse<FlowDataPoint[]>> {
  return await fetchApi<FlowDataPoint[]>('/scan/data');
}
