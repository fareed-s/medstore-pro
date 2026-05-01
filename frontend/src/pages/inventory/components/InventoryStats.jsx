import { memo } from 'react';
import { useNavigate } from 'react-router-dom';

const StatCard = memo(function StatCard({ stat }) {
  const navigate = useNavigate();
  const onClick = stat.link ? () => navigate(stat.link) : undefined;
  return (
    <div className="stat-card" onClick={onClick} style={stat.link ? { cursor: 'pointer' } : {}}>
      <div className={`w-11 h-11 ${stat.bg} rounded-xl flex items-center justify-center`}>
        <stat.icon className={`w-5 h-5 ${stat.color}`} />
      </div>
      <div>
        <p className="text-xs text-gray-500">{stat.label}</p>
        <p className="text-xl font-heading font-bold text-gray-900">{stat.value}</p>
      </div>
    </div>
  );
});

function InventoryStats({ stats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
      {stats.map((s, i) => <StatCard key={i} stat={s} />)}
    </div>
  );
}

export default memo(InventoryStats);
