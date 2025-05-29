// src/app/components/UwbPlot.tsx
'use client';
import useSWR from 'swr';
import {
  ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';

interface Reading {
  device_id: string;
  x: number;
  y: number;
  rssi: number;
  ts: string;
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function UwbPlot() {
  const { data, error } = useSWR<Reading[]>('/api/uwb-data', fetcher, {
    refreshInterval: 3000
  });

  if (error) return <div>Error loading UWB data</div>;
  if (!data)  return <div>Loading UWB data…</div>;

  return (
    <ScatterChart width={600} height={400} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
      <CartesianGrid />
      <XAxis dataKey="x" type="number" label={{ value: 'X (m)', position: 'insideBottom' }} />
      <YAxis dataKey="y" type="number" label={{ value: 'Y (m)', angle: -90, position: 'insideLeft' }} />
      <Tooltip cursor={{ strokeDasharray: '3 3' }} />
      <Scatter name="UWB" data={data} fill="#8884d8" />
    </ScatterChart>
  );
}
