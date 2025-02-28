
import { FlowDataPoint, SystemStatus } from "./types";

// These functions simulate the hardware API calls
// In a real application, these would communicate with the actual hardware

// Mock state
let mockPumpRunning = false;
let mockCurrentFrequency = 0;
let mockFlowRate = 0;
let mockFlowMeterReads: number[] = [];
let mockIsStable = false;

// Simulates connecting to the pump
export function connectToPump(): Promise<boolean> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, 800);
  });
}

// Simulates connecting to the flow meter
export function connectToFlowMeter(): Promise<boolean> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, 1200);
  });
}

// Simulates starting the pump
export function startPump(): Promise<boolean> {
  return new Promise((resolve) => {
    setTimeout(() => {
      mockPumpRunning = true;
      resolve(true);
    }, 500);
  });
}

// Simulates stopping the pump
export function stopPump(): Promise<boolean> {
  return new Promise((resolve) => {
    setTimeout(() => {
      mockPumpRunning = false;
      mockCurrentFrequency = 0;
      mockFlowRate = 0;
      resolve(true);
    }, 500);
  });
}

// Simulates setting the pump frequency
export function setPumpFrequency(frequency: number): Promise<boolean> {
  return new Promise((resolve) => {
    setTimeout(() => {
      mockCurrentFrequency = frequency;
      // Simulate relationship between frequency and flow rate with some noise
      mockFlowRate = 0.5 * frequency + Math.random() * (frequency / 10);
      mockFlowMeterReads = [];
      mockIsStable = false;
      resolve(true);
    }, 300);
  });
}

// Simulates reading from the flow meter
export function readFlowMeter(): Promise<number> {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Add some noise to flow readings
      const reading = mockPumpRunning 
        ? mockFlowRate + (Math.random() * 0.4 - 0.2)
        : 0;
      
      mockFlowMeterReads.push(reading);
      
      // Check if we have enough readings to determine stability
      if (mockFlowMeterReads.length > 5) {
        const recent = mockFlowMeterReads.slice(-5);
        const avg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
        const allClose = recent.every(val => Math.abs(val - avg) < 0.3);
        mockIsStable = allClose;
      }
      
      resolve(reading);
    }, 200);
  });
}

// Checks if flow readings are stable
export function isFlowStable(): Promise<boolean> {
  return Promise.resolve(mockIsStable);
}

// Get the current system status
export function getSystemStatus(): Promise<SystemStatus> {
  return Promise.resolve({
    pumpConnected: true,
    flowMeterConnected: true,
    pumpRunning: mockPumpRunning,
    scanning: false,
    currentFrequency: mockPumpRunning ? mockCurrentFrequency : null,
    currentFlowRate: mockPumpRunning ? mockFlowRate : null,
    flowRateStable: mockIsStable,
    scanProgress: 0,
    error: null
  });
}

// Helper function to generate mock data for initial display
export function generateMockData(): FlowDataPoint[] {
  const data: FlowDataPoint[] = [];
  for (let freq = 10; freq <= 50; freq += 5) {
    data.push({
      frequency: freq,
      flowRate: 0.5 * freq + Math.random() * (freq / 5)
    });
  }
  return data;
}
