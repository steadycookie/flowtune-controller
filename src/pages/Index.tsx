
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import FrequencyControl from '@/components/FrequencyControl';
import FlowMonitor from '@/components/FlowMonitor';
import DataVisualizer from '@/components/DataVisualizer';
import ScanControls from '@/components/ScanControls';
import StatusIndicator from '@/components/StatusIndicator';
import { FrequencySettings, FlowDataPoint, SystemStatus } from '@/lib/types';
import { connectToPump, connectToFlowMeter, getSystemStatus, generateMockData } from '@/lib/mockApi';

const Index = () => {
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    pumpConnected: false,
    flowMeterConnected: false,
    pumpRunning: false,
    scanning: false,
    currentFrequency: null,
    currentFlowRate: null,
    flowRateStable: false,
    scanProgress: 0,
    error: null
  });
  
  const [frequencySettings, setFrequencySettings] = useState<FrequencySettings>({
    minFrequency: 10,
    maxFrequency: 50,
    step: 5
  });
  
  const [flowData, setFlowData] = useState<FlowDataPoint[]>([]);
  const [initializing, setInitializing] = useState<boolean>(true);
  
  // Initialize connections to devices
  useEffect(() => {
    const initializeDevices = async () => {
      try {
        // Connect to pump
        const pumpConnected = await connectToPump();
        if (pumpConnected) {
          toast.success('泵连接成功');
        } else {
          toast.error('泵连接失败');
        }
        
        // Connect to flow meter
        const flowMeterConnected = await connectToFlowMeter();
        if (flowMeterConnected) {
          toast.success('流量计连接成功');
        } else {
          toast.error('流量计连接失败');
        }
        
        // Update status
        updateSystemStatus();
        setInitializing(false);
      } catch (error) {
        console.error('初始化设备失败:', error);
        toast.error('连接设备失败，请检查连接');
        setInitializing(false);
      }
    };
    
    initializeDevices();
  }, []);
  
  // Periodically update system status
  useEffect(() => {
    const intervalId = setInterval(updateSystemStatus, 2000);
    return () => clearInterval(intervalId);
  }, []);
  
  const updateSystemStatus = async () => {
    try {
      const status = await getSystemStatus();
      setSystemStatus(status);
    } catch (error) {
      console.error('获取系统状态失败:', error);
    }
  };
  
  const handleAddDataPoint = (point: FlowDataPoint) => {
    setFlowData(prev => {
      // Check if we already have a data point with this frequency
      const exists = prev.some(p => p.frequency === point.frequency);
      if (exists) {
        // Replace the existing point
        return prev.map(p => 
          p.frequency === point.frequency ? point : p
        );
      } else {
        // Add new point and sort by frequency
        return [...prev, point].sort((a, b) => a.frequency - b.frequency);
      }
    });
  };
  
  const handleClearData = () => {
    setFlowData([]);
    toast.info('数据已清除');
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="container max-w-7xl mx-auto py-8 px-4 sm:px-6">
        <header className="mb-8 text-center">
          <h1 className="text-2xl sm:text-3xl font-light tracking-tight mb-2">流量-频率控制系统</h1>
          <p className="text-muted-foreground">控制气泵频率并测量对应流量</p>
        </header>
        
        <div className="mb-6">
          <StatusIndicator status={systemStatus} />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            <FrequencyControl 
              status={systemStatus}
              frequencySettings={frequencySettings}
              setFrequencySettings={setFrequencySettings}
              onStatusChange={updateSystemStatus}
              disabled={initializing || systemStatus.scanning}
            />
            
            <ScanControls 
              status={systemStatus}
              frequencySettings={frequencySettings}
              onAddDataPoint={handleAddDataPoint}
              onStatusChange={updateSystemStatus}
              disabled={initializing}
            />
          </div>
          
          <div className="space-y-6">
            <FlowMonitor 
              status={systemStatus}
              onStatusChange={updateSystemStatus}
            />
          </div>
          
          <div className="lg:col-span-1">
            <DataVisualizer 
              data={flowData} 
              onClearData={handleClearData}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
