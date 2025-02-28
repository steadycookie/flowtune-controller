
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { SystemStatus, FrequencySettings, FlowDataPoint, ScanStatus } from '@/lib/types';
import { setPumpFrequency, readFlowMeter, isFlowStable, startPump, stopPump } from '@/lib/mockApi';
import { Play, StopCircle, RotateCw } from 'lucide-react';
import { toast } from 'sonner';

interface ScanControlsProps {
  status: SystemStatus;
  frequencySettings: FrequencySettings;
  onAddDataPoint: (point: FlowDataPoint) => void;
  onStatusChange: () => void;
  disabled: boolean;
}

const ScanControls: React.FC<ScanControlsProps> = ({
  status,
  frequencySettings,
  onAddDataPoint,
  onStatusChange,
  disabled
}) => {
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<string>('');
  
  const calculateTotalSteps = (): number => {
    const { minFrequency, maxFrequency, step } = frequencySettings;
    if (step <= 0) return 0;
    return Math.floor((maxFrequency - minFrequency) / step) + 1;
  };
  
  const totalSteps = calculateTotalSteps();
  
  const startScan = async () => {
    if (disabled || scanStatus === 'running') return;
    
    const { minFrequency, maxFrequency, step } = frequencySettings;
    
    // Validation
    if (minFrequency >= maxFrequency) {
      toast.error('最小频率必须小于最大频率');
      return;
    }
    
    if (step <= 0) {
      toast.error('步长必须大于 0');
      return;
    }
    
    try {
      setScanStatus('running');
      setProgress(0);
      
      // Start the pump if it's not running
      if (!status.pumpRunning) {
        setCurrentStep('启动泵...');
        await startPump();
        onStatusChange();
      }
      
      const totalPoints = calculateTotalSteps();
      let currentPoint = 0;
      
      // Start the frequency scan
      for (let freq = minFrequency; freq <= maxFrequency; freq += step) {
        // Round to 1 decimal place to avoid floating point issues
        const frequency = Math.round(freq * 10) / 10;
        
        setCurrentStep(`设置频率: ${frequency} Hz`);
        await setPumpFrequency(frequency);
        onStatusChange();
        
        // Wait for stabilization
        setCurrentStep(`等待流量稳定...`);
        let stable = false;
        let attempts = 0;
        let readings: number[] = [];
        
        while (!stable && attempts < 20) {
          await new Promise(resolve => setTimeout(resolve, 500));
          const reading = await readFlowMeter();
          readings.push(reading);
          
          // Check stability after collecting enough readings
          if (readings.length >= 5) {
            stable = await isFlowStable();
          }
          
          onStatusChange();
          attempts++;
        }
        
        // Get the final reading (average of last 3 readings)
        const flowRate = readings.length >= 3 
          ? readings.slice(-3).reduce((sum, val) => sum + val, 0) / 3
          : readings[readings.length - 1];
        
        // Add data point
        onAddDataPoint({ frequency, flowRate });
        
        // Update progress
        currentPoint++;
        setProgress(Math.round((currentPoint / totalPoints) * 100));
        
        // Check if scan was cancelled
        if (scanStatus !== 'running') {
          break;
        }
      }
      
      setCurrentStep('扫描完成');
      setScanStatus('completed');
      
      // Stop the pump after scan
      await stopPump();
      onStatusChange();
      
      toast.success('频率扫描已完成');
    } catch (error) {
      console.error(error);
      setScanStatus('error');
      toast.error('扫描过程中出现错误');
    }
  };
  
  const stopScan = async () => {
    if (scanStatus === 'running') {
      setScanStatus('idle');
      setCurrentStep('扫描已停止');
      toast.info('扫描已停止');
      
      // Stop the pump
      try {
        await stopPump();
        onStatusChange();
      } catch (error) {
        console.error(error);
      }
    }
  };
  
  const resetScan = () => {
    setScanStatus('idle');
    setProgress(0);
    setCurrentStep('');
  };
  
  return (
    <Card className="w-full card-glow animate-float-in">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl">频率扫描</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>扫描范围</span>
            <span className="text-muted-foreground">
              {frequencySettings.minFrequency} Hz - {frequencySettings.maxFrequency} Hz (步长: {frequencySettings.step} Hz)
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span>预计数据点</span>
            <span className="font-mono">{totalSteps}</span>
          </div>
        </div>
        
        {(scanStatus === 'running' || scanStatus === 'completed') && (
          <div className="space-y-2 pt-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">扫描进度</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-center text-muted-foreground mt-1">
              {currentStep}
            </p>
          </div>
        )}
        
        <div className="flex justify-between pt-2">
          {scanStatus === 'idle' ? (
            <Button 
              onClick={startScan} 
              disabled={disabled || !status.pumpConnected || !status.flowMeterConnected}
              className="w-full bg-primary/90 hover:bg-primary"
            >
              <Play className="mr-2 h-4 w-4" />
              开始扫描
            </Button>
          ) : scanStatus === 'running' ? (
            <Button 
              onClick={stopScan} 
              variant="destructive"
              className="w-full"
            >
              <StopCircle className="mr-2 h-4 w-4" />
              停止扫描
            </Button>
          ) : (
            <Button 
              onClick={resetScan} 
              variant="outline"
              className="w-full"
            >
              <RotateCw className="mr-2 h-4 w-4" />
              重置
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ScanControls;
