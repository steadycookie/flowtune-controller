
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { SystemStatus } from '@/lib/types';
import { readFlowMeter } from '@/lib/api';

interface FlowMonitorProps {
  status: SystemStatus;
  onStatusChange: () => void;
}

const FlowMonitor: React.FC<FlowMonitorProps> = ({ status, onStatusChange }) => {
  const [recentReadings, setRecentReadings] = useState<number[]>([]);
  const [isPolling, setIsPolling] = useState<boolean>(false);

  // 根据泵状态开始/停止轮询
  useEffect(() => {
    let intervalId: number | undefined;
    
    if (status.pumpRunning && !isPolling) {
      setIsPolling(true);
      intervalId = window.setInterval(async () => {
        try {
          const response = await readFlowMeter();
          if (response.success && response.data !== undefined) {
            setRecentReadings(prev => {
              const newReadings = [...prev, response.data!];
              return newReadings.slice(-10); // 保留最后10个读数
            });
            onStatusChange();
          }
        } catch (error) {
          console.error('读取流量计失败:', error);
        }
      }, 1000);
    }
    
    return () => {
      if (intervalId !== undefined) {
        clearInterval(intervalId);
        setIsPolling(false);
      }
    };
  }, [status.pumpRunning, isPolling, onStatusChange]);

  // 根据最近读数计算稳定性百分比
  const calculateStabilityPercentage = (): number => {
    if (recentReadings.length < 3) return 0;
    
    const recent = recentReadings.slice(-5);
    const avg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const deviations = recent.map(val => Math.abs((val - avg) / avg) * 100);
    const maxDeviation = Math.max(...deviations);
    
    return Math.max(0, Math.min(100, 100 - maxDeviation * 5));
  };

  const stabilityPercentage = calculateStabilityPercentage();
  
  return (
    <Card className="w-full card-glow animate-float-in">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl">流量监测</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">当前流量</div>
            <div className="text-4xl font-light relative flex items-center justify-center h-16">
              {status.pumpRunning ? (
                <div className="flex items-baseline">
                  <span className={`transition-all duration-300 ${status.flowRateStable ? '' : 'animate-pulse-subtle'}`}>
                    {status.currentFlowRate ? status.currentFlowRate.toFixed(2) : '0.00'}
                  </span>
                  <span className="text-sm ml-1 text-muted-foreground">L/min</span>
                </div>
              ) : (
                <span className="text-muted-foreground text-xl">--</span>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">流量稳定性</span>
              <span className={`font-medium ${
                stabilityPercentage > 80 ? 'text-emerald-600' : 
                stabilityPercentage > 50 ? 'text-amber-600' : 
                'text-muted-foreground'
              }`}>
                {stabilityPercentage.toFixed(0)}%
              </span>
            </div>
            <Progress value={stabilityPercentage} className="h-2" />
          </div>
          
          {recentReadings.length > 0 && (
            <div className="pt-2">
              <div className="text-xs text-muted-foreground mb-2">最近读数</div>
              <div className="flex justify-between h-16 items-end border-b border-border/50 pt-1 pb-1 relative">
                {recentReadings.slice(-10).map((reading, index) => {
                  const height = `${Math.min(100, (reading / (Math.max(...recentReadings) * 1.2)) * 100)}%`;
                  return (
                    <div 
                      key={index} 
                      className="w-[8%] bg-primary/20 rounded-t-sm transition-all duration-300 animate-data-appear"
                      style={{ height }}
                    ></div>
                  );
                })}
                {/* 零线 */}
                <div className="absolute bottom-0 w-full h-[1px] bg-border/50"></div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FlowMonitor;
