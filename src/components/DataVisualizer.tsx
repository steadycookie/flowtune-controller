
import React, { useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FlowDataPoint } from '@/lib/types';
import { Download, RefreshCw } from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';

interface DataVisualizerProps {
  data: FlowDataPoint[];
  onClearData: () => void;
}

const DataVisualizer: React.FC<DataVisualizerProps> = ({ data, onClearData }) => {
  const chartData = data.map(point => ({
    frequency: point.frequency,
    flowRate: parseFloat(point.flowRate.toFixed(2))
  }));

  const exportDataToCSV = () => {
    if (data.length === 0) return;
    
    // Create CSV content
    const csvContent = [
      "Frequency (Hz),Flow Rate (L/min)",
      ...data.map(point => `${point.frequency},${point.flowRate.toFixed(3)}`)
    ].join("\n");
    
    // Create a blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `flow_data_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <Card className="w-full card-glow min-h-[400px] animate-float-in">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xl">频率-流量关系</CardTitle>
          <p className="text-sm text-muted-foreground">
            记录点: {data.length}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onClearData}
            disabled={data.length === 0}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            清除
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={exportDataToCSV}
            disabled={data.length === 0}
          >
            <Download className="h-4 w-4 mr-1" />
            导出
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-1 pb-4">
        {data.length > 0 ? (
          <div className="h-[350px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 30, left: 15, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="frequency" 
                  label={{ 
                    value: '频率 (Hz)', 
                    position: 'insideBottomRight', 
                    offset: -5 
                  }}
                />
                <YAxis 
                  label={{ 
                    value: '流量 (L/min)', 
                    angle: -90, 
                    position: 'insideLeft',
                    offset: -5
                  }}
                />
                <Tooltip 
                  formatter={(value) => [`${value} L/min`, "流量"]}
                  labelFormatter={(label) => `频率: ${label} Hz`}
                />
                <Legend verticalAlign="top" height={36} />
                <Line
                  type="monotone"
                  dataKey="flowRate"
                  name="流量"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  animationDuration={500}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[350px] flex items-center justify-center">
            <div className="text-muted-foreground text-center">
              <p>尚无数据</p>
              <p className="text-sm mt-1">开始扫描以收集数据</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DataVisualizer;
