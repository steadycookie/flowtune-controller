
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { PlayCircle, StopCircle } from 'lucide-react';
import { FrequencySettings, SystemStatus } from '@/lib/types';
import { startPump, stopPump, setPumpFrequency } from '@/lib/api';
import { toast } from 'sonner';

interface FrequencyControlProps {
  status: SystemStatus;
  frequencySettings: FrequencySettings;
  setFrequencySettings: React.Dispatch<React.SetStateAction<FrequencySettings>>;
  onStatusChange: () => void;
  disabled: boolean;
}

const FrequencyControl: React.FC<FrequencyControlProps> = ({
  status,
  frequencySettings,
  setFrequencySettings,
  onStatusChange,
  disabled
}) => {
  const [manualFrequency, setManualFrequency] = useState<number>(0);

  // 当泵启动时设置初始手动频率
  useEffect(() => {
    if (status.currentFrequency !== null) {
      setManualFrequency(status.currentFrequency);
    }
  }, [status.currentFrequency]);

  const handleStartPump = async () => {
    try {
      const response = await startPump();
      if (response.success) {
        if (manualFrequency > 0) {
          await setPumpFrequency(manualFrequency);
        }
        onStatusChange();
        toast.success('泵已启动');
      } else {
        toast.error(`启动泵失败: ${response.error}`);
      }
    } catch (error) {
      toast.error('启动泵失败，请检查连接');
      console.error(error);
    }
  };

  const handleStopPump = async () => {
    try {
      const response = await stopPump();
      if (response.success) {
        onStatusChange();
        toast.success('泵已停止');
      } else {
        toast.error(`停止泵失败: ${response.error}`);
      }
    } catch (error) {
      toast.error('停止泵失败，请检查连接');
      console.error(error);
    }
  };

  const handleFrequencyChange = async (value: number) => {
    setManualFrequency(value);
    if (status.pumpRunning) {
      try {
        const response = await setPumpFrequency(value);
        if (response.success) {
          onStatusChange();
        } else {
          toast.error(`修改频率失败: ${response.error}`);
        }
      } catch (error) {
        toast.error('修改频率失败，请检查连接');
        console.error(error);
      }
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>, 
    field: keyof FrequencySettings
  ) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0) {
      setFrequencySettings(prev => ({ ...prev, [field]: value }));
    }
  };

  return (
    <Card className="w-full card-glow animate-float-in">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl">频率控制</CardTitle>
        <CardDescription>设置泵的工作频率参数</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="minFrequency" className="text-xs">最小频率 (Hz)</Label>
            <Input 
              id="minFrequency"
              type="number"
              min={0}
              step={0.1}
              disabled={disabled}
              value={frequencySettings.minFrequency}
              onChange={(e) => handleInputChange(e, 'minFrequency')}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="maxFrequency" className="text-xs">最大频率 (Hz)</Label>
            <Input 
              id="maxFrequency"
              type="number"
              min={0}
              step={0.1}
              disabled={disabled}
              value={frequencySettings.maxFrequency}
              onChange={(e) => handleInputChange(e, 'maxFrequency')}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="stepFrequency" className="text-xs">步长 (Hz)</Label>
            <Input 
              id="stepFrequency"
              type="number"
              min={0.1}
              step={0.1}
              disabled={disabled}
              value={frequencySettings.step}
              onChange={(e) => handleInputChange(e, 'step')}
              className="mt-1"
            />
          </div>
        </div>
        
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="manualFrequency" className="text-sm">手动控制频率</Label>
            <span className="text-sm font-medium">{manualFrequency.toFixed(1)} Hz</span>
          </div>
          <div className="flex items-center space-x-2">
            <Slider
              id="manualFrequency"
              min={0}
              max={Math.max(50, frequencySettings.maxFrequency)}
              step={0.1}
              value={[manualFrequency]}
              onValueChange={([value]) => handleFrequencyChange(value)}
              disabled={disabled || !status.pumpRunning}
              className="flex-grow"
            />
          </div>
        </div>
        
        <div className="flex justify-between pt-2">
          {!status.pumpRunning ? (
            <Button 
              onClick={handleStartPump} 
              disabled={disabled || !status.pumpConnected}
              className="w-full bg-primary/90 hover:bg-primary transition-colors duration-200"
            >
              <PlayCircle className="mr-2 h-4 w-4" />
              启动泵
            </Button>
          ) : (
            <Button 
              onClick={handleStopPump} 
              variant="destructive"
              disabled={disabled}
              className="w-full"
            >
              <StopCircle className="mr-2 h-4 w-4" />
              停止泵
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FrequencyControl;
