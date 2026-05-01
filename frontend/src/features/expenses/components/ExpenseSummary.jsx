import { memo } from 'react';
import { useSelector, shallowEqual } from 'react-redux';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../../../utils/helpers';
import { selectExpensesSummary } from '../expensesSlice';

const COLORS = ['#059669','#10b981','#34d399','#f59e0b','#ef4444','#8b5cf6','#3b82f6','#ec4899','#14b8a6','#f97316','#6366f1','#84cc16','#a855f7','#64748b'];

function ExpenseSummary() {
  const summary = useSelector(selectExpensesSummary, shallowEqual);
  if (!summary?.byCategory?.length) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
      <div className="card">
        <h3 className="font-heading font-semibold text-gray-900 mb-3">By Category</h3>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie data={summary.byCategory.map((c) => ({ name: c._id, value: c.total }))}
              cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} dataKey="value">
              {summary.byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(val) => formatCurrency(val)} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="card">
        <h3 className="font-heading font-semibold text-gray-900 mb-3">Breakdown</h3>
        <div className="space-y-2 max-h-[240px] overflow-y-auto">
          {summary.byCategory.map((c, i) => (
            <div key={c._id} className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span className="flex-1 text-sm">{c._id}</span>
              <span className="text-sm font-medium">{formatCurrency(c.total)}</span>
              <span className="text-xs text-gray-400">{c.count}x</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default memo(ExpenseSummary);
