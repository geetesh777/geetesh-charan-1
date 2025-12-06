import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Expense, ExpenseCategory, Member } from '../types';
import { TrendingUp, Activity } from './ui/Icons';

interface DashboardProps {
  expenses: Expense[];
  members: Member[];
  currency: string;
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981'];

const Dashboard: React.FC<DashboardProps> = ({ expenses, currency, members }) => {
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Prepare Pie Chart Data (By Category)
  const categoryData = Object.values(ExpenseCategory).map(cat => {
    return {
      name: cat,
      value: expenses.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0)
    };
  }).filter(d => d.value > 0);

  // Prepare Bar Chart Data (Spending by Member - Payer)
  const payerData = members.map(m => {
      return {
          name: m.name,
          amount: expenses.filter(e => e.payerId === m.id).reduce((sum, e) => sum + e.amount, 0)
      }
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Overview Card */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
        <div>
          <h2 className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-1">Total Trip Expenses</h2>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-slate-900">{currency}{totalSpent.toFixed(2)}</span>
            <span className="text-sm font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
              <TrendingUp size={14} /> +12%
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-2">Spending across {expenses.length} activities</p>
        </div>
        
        <div className="h-48 mt-6">
             <h3 className="text-xs font-semibold text-slate-400 mb-2">SPENDING BY CATEGORY</h3>
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value: number) => `${currency}${value.toFixed(2)}`} />
                </PieChart>
             </ResponsiveContainer>
        </div>
      </div>

      {/* Analytics Card */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Activity size={20} className="text-indigo-600"/>
                Payer Analytics
            </h2>
        </div>
        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={payerData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                    <RechartsTooltip cursor={{fill: '#f1f5f9'}} formatter={(value: number) => `${currency}${value.toFixed(2)}`} />
                    <Bar dataKey="amount" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
            </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
