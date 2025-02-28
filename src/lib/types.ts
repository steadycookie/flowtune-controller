
export interface FrequencySettings {
  minFrequency: number;
  maxFrequency: number;
  step: number;
}

export interface FlowDataPoint {
  frequency: number;
  flowRate: number;
}

export interface SystemStatus {
  pumpConnected: boolean;
  flowMeterConnected: boolean;
  pumpRunning: boolean;
  scanning: boolean;
  currentFrequency: number | null;
  currentFlowRate: number | null;
  flowRateStable: boolean;
  scanProgress: number; // 0-100
  error: string | null;
}

export type ScanStatus = 'idle' | 'running' | 'completed' | 'error';

export interface ApiConfig {
  baseUrl: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
