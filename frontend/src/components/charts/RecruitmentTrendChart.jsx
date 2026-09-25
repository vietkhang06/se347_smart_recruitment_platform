import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { useTheme } from '../../context/ThemeContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function RecruitmentTrendChart({ weeklyData }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

  const data = {
    labels: weeklyData?.labels || ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"],
    datasets: [
      {
        label: 'Lượt nộp hồ sơ',
        data: weeklyData?.applications || [24, 38, 31, 52, 45, 68, 56],
        backgroundColor: isDark ? '#3fb978' : '#2d8653',
        borderRadius: 6,
      },
      {
        label: 'Lượt xem tin',
        data: weeklyData?.views ? weeklyData.views.map(v => Math.round(v / 3)) : [36, 48, 44, 70, 61, 96, 80],
        backgroundColor: isDark ? 'rgba(63, 185, 120, 0.25)' : 'rgba(45, 134, 83, 0.2)',
        borderRadius: 6,
      }
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: textColor,
          font: { family: 'Inter', size: 12, weight: '500' },
          usePointStyle: true,
          boxWidth: 8
        }
      },
      tooltip: {
        backgroundColor: isDark ? '#1e293b' : '#0f172a',
        titleColor: '#fff',
        bodyColor: '#fff',
        padding: 10,
        cornerRadius: 8,
      }
    },
    scales: {
      x: {
        ticks: { color: textColor, font: { family: 'Inter' } },
        grid: { display: false }
      },
      y: {
        ticks: { color: textColor, font: { family: 'Inter' } },
        grid: { color: gridColor }
      }
    }
  };

  return (
    <div style={{ height: "260px", width: "100%" }}>
      <Bar data={data} options={options} />
    </div>
  );
}
