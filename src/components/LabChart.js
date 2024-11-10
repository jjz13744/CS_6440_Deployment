import React from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const LabChart = ({ labData, referenceRange, showReferenceLines }) => {
  console.log('LabChart rendering with:', { labData, referenceRange, showReferenceLines });

  // Sort the data by date in ascending order
  const sortedData = [...labData].sort((a, b) => new Date(a.date) - new Date(b.date));

  const dates = sortedData.map(data => new Date(data.date).toLocaleDateString());
  const values = sortedData.map(data => data.value);

  const maxValue = Math.max(...values, referenceRange ? referenceRange.high : 0);
  const minValue = Math.min(...values, referenceRange ? referenceRange.low : 0);
  const valueRange = maxValue - minValue;

  const data = {
    labels: dates,
    datasets: [
      {
        label: sortedData[0]?.test || 'Test',
        data: values,
        fill: false,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
        pointBackgroundColor: values.map(value => 
          (referenceRange && (value < referenceRange.low || value > referenceRange.high)) 
            ? 'red' 
            : 'rgb(75, 192, 192)'
        ),
        pointRadius: values.map(value => 
          (referenceRange && (value < referenceRange.low || value > referenceRange.high)) 
            ? 6 
            : 3
        ),
      }
    ]
  };

  const options = {
    scales: {
      x: {
        type: 'category',
        title: {
          display: true,
          text: 'Date'
        }
      },
      y: {
        beginAtZero: false,
        title: {
          display: true,
          text: 'Value'
        },
        ticks: {
          callback: function(value, index, values) {
            return value.toFixed(2);
          }
        },
        min: Math.max(0, minValue - valueRange * 0.1),  // Ensure min is not negative
        max: maxValue + valueRange * 0.1
      }
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
      },
      title: {
        display: true,
        text: 'Lab Results Over Time'
      }
    },
    responsive: true,
    maintainAspectRatio: false,
  };

  const plugins = [
    {
      id: 'referenceLine',
      afterDatasetsDraw: (chart) => {
        if (showReferenceLines && referenceRange) {
          const ctx = chart.ctx;
          const yAxis = chart.scales.y;
          const drawLine = (value, color) => {
            if (value >= yAxis.min && value <= yAxis.max) {
              const yPixel = yAxis.getPixelForValue(value);
              ctx.save();
              ctx.beginPath();
              ctx.moveTo(chart.chartArea.left, yPixel);
              ctx.lineTo(chart.chartArea.right, yPixel);
              ctx.lineWidth = 2;
              ctx.strokeStyle = color;
              ctx.stroke();
              ctx.restore();
            }
          };

          drawLine(referenceRange.low, 'rgb(255, 99, 132)');
          if (referenceRange.high < Infinity) {
            drawLine(referenceRange.high, 'rgb(255, 99, 132)');
          }
        }
      }
    }
  ];

  return (
    <div style={{ height: '400px' }}>
      <Line data={data} options={options} plugins={plugins} />
    </div>
  );
};

export default LabChart;
