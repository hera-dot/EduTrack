import { useEffect, useRef } from 'react';
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';

Chart.register(
  LineController,
  LineElement,
  PointElement,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler
);

export function PerformanceLineChart({
  data,
}: {
  data: { dateLabel: string; examTitle: string; percentage: number }[];
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: data.map((d) => d.dateLabel),
        datasets: [
          {
            label: 'Examination Score (%)',
            data: data.map((d) => d.percentage),
            borderColor: '#1E3A8A',
            backgroundColor: 'rgba(30, 58, 138, 0.08)',
            borderWidth: 2.5,
            pointBackgroundColor: '#5B21B6',
            pointBorderColor: '#FFFFFF',
            pointBorderWidth: 2,
            pointRadius: 5,
            tension: 0.25,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (items) => {
                const idx = items[0]?.dataIndex ?? 0;
                return data[idx]?.examTitle || '';
              },
              label: (ctx) => `Score: ${ctx.parsed.y}%`,
            },
          },
        },
        scales: {
          y: {
            min: 0,
            max: 100,
            ticks: {
              callback: (v) => `${v}%`,
              color: '#64748B',
              font: { family: 'JetBrains Mono, monospace', size: 11 },
            },
            grid: { color: '#E2E8F0' },
          },
          x: {
            ticks: {
              color: '#64748B',
              font: { family: 'DM Sans, sans-serif', size: 12 },
            },
            grid: { display: false },
          },
        },
      },
    });

    return () => chart.destroy();
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="h-60 flex items-center justify-center text-sm text-slate-500 border border-dashed border-slate-200 rounded-lg">
        Complete at least one examination to plot your score trajectory.
      </div>
    );
  }

  return (
    <div className="h-60 w-full">
      <canvas ref={canvasRef} />
    </div>
  );
}

export function SubjectBarChart({
  data,
}: {
  data: { label: string; value: number }[];
  unit?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: data.map((d) => d.label),
        datasets: [
          {
            label: 'Average Score (%)',
            data: data.map((d) => d.value),
            backgroundColor: data.map((d) =>
              d.value >= 75 ? '#1E3A8A' : d.value >= 55 ? '#6D28D9' : '#D97706'
            ),
            borderRadius: 6,
            maxBarThickness: 44,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.parsed.y}%`,
            },
          },
        },
        scales: {
          y: {
            min: 0,
            max: 100,
            ticks: {
              callback: (v) => `${v}%`,
              color: '#64748B',
              font: { family: 'JetBrains Mono, monospace', size: 11 },
            },
            grid: { color: '#E2E8F0' },
          },
          x: {
            ticks: {
              color: '#475569',
              font: { family: 'DM Sans, sans-serif', size: 12 },
            },
            grid: { display: false },
          },
        },
      },
    });

    return () => chart.destroy();
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="h-60 flex items-center justify-center text-sm text-slate-500 border border-dashed border-slate-200 rounded-lg">
        No subject data available yet.
      </div>
    );
  }

  return (
    <div className="h-60 w-full">
      <canvas ref={canvasRef} />
    </div>
  );
}
