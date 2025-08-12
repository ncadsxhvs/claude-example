'use client';

interface ChartData {
  label: string;
  value: number;
  color: string;
}

interface SimpleChartProps {
  data: ChartData[];
  title: string;
  type: 'bar' | 'pie';
}

export default function SimpleChart({ data, title, type }: SimpleChartProps) {
  if (data.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium mb-2">{title}</h3>
        <div className="text-gray-500 text-sm">No data available</div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value));

  if (type === 'bar') {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium mb-4">{title}</h3>
        <div className="space-y-3">
          {data.map((item, index) => (
            <div key={index} className="flex items-center space-x-3">
              <div className="w-20 text-sm text-gray-600 truncate">
                {item.label}
              </div>
              <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                <div
                  className="h-4 rounded-full transition-all duration-300"
                  style={{
                    backgroundColor: item.color,
                    width: `${(item.value / maxValue) * 100}%`
                  }}
                />
              </div>
              <div className="w-12 text-sm text-gray-700 text-right">
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Simple pie chart representation
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <h3 className="font-medium mb-4">{title}</h3>
      <div className="flex items-center justify-center mb-4">
        <div className="relative w-32 h-32">
          <svg className="w-full h-full" viewBox="0 0 42 42">
            <circle
              cx="21"
              cy="21"
              r="15.915"
              fill="transparent"
              stroke="#e5e7eb"
              strokeWidth="3"
            />
            {data.map((item, index) => {
              const percentage = (item.value / total) * 100;
              const offset = data.slice(0, index).reduce((sum, d) => sum + (d.value / total) * 100, 0);
              
              return (
                <circle
                  key={index}
                  cx="21"
                  cy="21"
                  r="15.915"
                  fill="transparent"
                  stroke={item.color}
                  strokeWidth="3"
                  strokeDasharray={`${percentage} ${100 - percentage}`}
                  strokeDashoffset={`${25 - offset}`}
                  className="transition-all duration-300"
                />
              );
            })}
          </svg>
        </div>
      </div>
      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-gray-600">{item.label}</span>
            </div>
            <div className="text-sm text-gray-700">
              {item.value} ({Math.round((item.value / total) * 100)}%)
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}