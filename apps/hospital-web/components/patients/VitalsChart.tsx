'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';

interface VitalDataPoint {
  date: string;
  systolic_bp?: number;
  diastolic_bp?: number;
  heart_rate?: number;
  temperature?: number;
  blood_sugar?: number;
  spo2?: number;
  weight?: number;
}

interface VitalsChartProps {
  data: VitalDataPoint[];
  type?: 'bp' | 'heart_rate' | 'temperature' | 'blood_sugar' | 'spo2' | 'weight';
}

const chartConfigs = {
  bp: {
    title: '혈압 추이',
    lines: [
      { key: 'systolic_bp', name: '수축기', color: '#006A63' },
      { key: 'diastolic_bp', name: '이완기', color: '#002045' },
    ],
    unit: 'mmHg',
  },
  heart_rate: {
    title: '심박수 추이',
    lines: [{ key: 'heart_rate', name: '심박수', color: '#006A63' }],
    unit: 'bpm',
  },
  temperature: {
    title: '체온 추이',
    lines: [{ key: 'temperature', name: '체온', color: '#006A63' }],
    unit: 'C',
  },
  blood_sugar: {
    title: '혈당 추이',
    lines: [{ key: 'blood_sugar', name: '혈당', color: '#002045' }],
    unit: 'mg/dL',
  },
  spo2: {
    title: '산소포화도 추이',
    lines: [{ key: 'spo2', name: 'SpO2', color: '#006A63' }],
    unit: '%',
  },
  weight: {
    title: '체중 추이',
    lines: [{ key: 'weight', name: '체중', color: '#002045' }],
    unit: 'kg',
  },
};

export function VitalsChart({ data, type = 'bp' }: VitalsChartProps) {
  const config = chartConfigs[type];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{config.title}</CardTitle>
        <span className="text-xs text-on-surface-variant">({config.unit})</span>
      </CardHeader>

      {data.length === 0 ? (
        <p className="py-10 text-center text-sm text-on-surface-variant">
          바이탈 데이터가 없습니다.
        </p>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E9EB" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#42474E' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#42474E' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: 'none',
                  boxShadow: '0 10px 40px rgba(24,28,30,0.1)',
                  fontSize: 12,
                  padding: '12px 16px',
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 12 }}
                iconType="circle"
                iconSize={8}
              />
              {config.lines.map((line) => (
                <Line
                  key={line.key}
                  type="monotone"
                  dataKey={line.key}
                  name={line.name}
                  stroke={line.color}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: line.color, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: line.color, strokeWidth: 0 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
