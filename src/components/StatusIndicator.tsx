
import React from 'react';
import { Check, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SystemStatus } from '@/lib/types';

interface StatusIndicatorProps {
  status: SystemStatus;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
  return (
    <div className="flex items-center space-x-6 bg-white/70 backdrop-blur-sm rounded-lg p-3 animate-float-in">
      <StatusItem 
        label="泵连接"
        connected={status.pumpConnected}
      />
      <StatusItem 
        label="流量计连接"
        connected={status.flowMeterConnected}
      />
      <StatusItem 
        label="泵运行"
        connected={status.pumpRunning}
        type="running"
      />
      <StatusItem 
        label="流量稳定"
        connected={status.flowRateStable}
        type="stability"
      />
      
      {status.error && (
        <div className="flex items-center text-destructive ml-auto">
          <AlertCircle className="h-4 w-4 mr-1" />
          <span className="text-sm font-medium">{status.error}</span>
        </div>
      )}
    </div>
  );
};

interface StatusItemProps {
  label: string;
  connected: boolean;
  type?: 'connection' | 'running' | 'stability';
}

const StatusItem: React.FC<StatusItemProps> = ({ 
  label, 
  connected, 
  type = 'connection' 
}) => {
  return (
    <div className="flex flex-col items-center">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className={cn(
        "flex items-center justify-center rounded-full h-6 w-6",
        connected ? 
          type === 'running' ? "bg-amber-100 text-amber-700" :
          type === 'stability' ? "bg-emerald-100 text-emerald-700" :
          "bg-primary/10 text-primary" : 
          "bg-muted text-muted-foreground"
      )}>
        {connected ? (
          type === 'running' ? (
            <span className="text-xs font-semibold">ON</span>
          ) : (
            <Check className="h-3 w-3" />
          )
        ) : (
          <X className="h-3 w-3" />
        )}
      </div>
    </div>
  );
};

export default StatusIndicator;
