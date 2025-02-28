
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { SystemStatus, FrequencySettings, FlowDataPoint, ScanStatus } from '@/lib/types';
import { startScan, stopScan, getScanProgress } from '@/lib/api';
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
  const [isPolling, setIsPolling] = useState<boolean>(false);
  
  const calculateTotalSteps = (): number => {
    const { minFrequency, maxFrequency, step } = frequencySettings;
    if (step <= 0) return 0;
    return Math.floor((maxFrequency - minFrequency) / step) + 1;
  };
  
  const totalSteps = calculateTotalSteps();
  
  // 监视扫描进度
  useEffect(() => {
    let intervalId: number | undefined;
    
    // 如果正在扫描，则轮询进度
    if (scanStatus === 'running' && !isPolling) {
      setIsPolling(true);
      intervalId = window.setInterval(async () => {
        try {
          const response = await getScanProgress();
          
          if (response.success) {
            const { progress, currentStep, lastDataPoint } = response.data!;
            
            setProgress(progress);
            setCurrentStep(currentStep);
            
            // 如果有新数据点，则添加到图表
            if (lastDataPoint) {
              onAddDataPoint(lastDataPoint);
            }
            
            // 如果进度已完成，则更新状态
            if (progress === 100) {
              setScanStatus('completed');
              setIsPolling(false);
              clearInterval(intervalId);
            }
            
            onStatusChange();
          }
        } catch (error) {
          console.error('获取扫描进度失败:', error);
        }
      }, 1000);
    }
    
    return () => {
      if (intervalId !== undefined) {
        clearInterval(intervalId);
        setIsPolling(false);
      }
    };
  }, [scanStatus, isPolling, onAddDataPoint, onStatusChange]);
  
  const handleStartScan = async () => {
    if (disabled || scanStatus === 'running') return;
    
    const { minFrequency, maxFrequency, step } = frequencySettings;
    
    // 验证
    if (minFrequency >= maxFrequency) {
      toast.error('最小频率必须小于最大频率');
      return;
    }
    
    if (step <= 0) {
      toast.error('步长必须大于 0');
      return;
    }
    
    try {
      // 开始扫描
      const response = await startScan({
        minFrequency,
        maxFrequency,
        step
      });
      
      if (response.success) {
        setScanStatus('running');
        setProgress(0);
        setCurrentStep('正在启动扫描...');
        toast.success('扫描已开始');
      } else {
        toast.error(`开始扫描失败: ${response.error}`);
      }
    } catch (error) {
      console.error(error);
      setScanStatus('error');
      toast.error('扫描过程中出现错误');
    }
  };
  
  const handleStopScan = async () => {
    if (scanStatus === 'running') {
      try {
        const response = await stopScan();
        
        if (response.success) {
          setScanStatus('idle');
          setCurrentStep('扫描已停止');
          toast.info('扫描已停止');
          onStatusChange();
        } else {
          toast.error(`停止扫描失败: ${response.error}`);
        }
      } catch (error) {
        console.error(error);
        toast.error('停止扫描失败');
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
              onClick={handleStartScan} 
              disabled={disabled || !status.pumpConnected || !status.flowMeterConnected}
              className="w-full bg-primary/90 hover:bg-primary"
            >
              <Play className="mr-2 h-4 w-4" />
              开始扫描
            </Button>
          ) : scanStatus === 'running' ? (
            <Button 
              onClick={handleStopScan} 
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
