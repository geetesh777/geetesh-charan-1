import React, { useState, useEffect, useMemo } from 'react';
import { Group, Member, Expense, ExpenseCategory, SplitType, Settlement, Balance } from './types';
import { Users, Wallet, Plus, Download, Receipt, Menu, Sparkles } from './components/ui/Icons';
import AddExpenseModal from './components/AddExpenseModal';
import Dashboard from './components/Dashboard';
import { generateSettlementInsight } from './services/geminiService';

// --- MOCK DATA INITIALIZATION ---
const MOCK_MEMBERS: Member[] = [
  { id: 'm1', name: 'Alice', avatar: 'https://picsum.photos/100/100?random=1' },
  { id: 'm2', name: 'Bob', avatar: 'https://picsum.photos/100/100?random=2' },
  { id: 'm3', name: 'Charlie', avatar: 'https://picsum.photos/100/100?random=3' },
  { id: 'm4', name: 'Diana', avatar: 'https://picsum.photos/100/100?random=4' },
];

const MOCK_EXPENSES: Expense[] = [
  {
    id: 'e1', groupId: 'g1', description: 'Airbnb Deposit', amount: 450.00, payerId: 'm1', date: '2023-10-01', category: ExpenseCategory.ACCOMMODATION, splitType: SplitType.EQUAL,
    splits: { 'm1': 1, 'm2': 1, 'm3': 1, 'm4': 1 }, isRecurring: false
  },
  {
    id: 'e2', groupId: 'g1', description: 'Supermarket Run', amount: 85.50, payerId: 'm2', date: '2023-10-02', category: ExpenseCategory.FOOD, splitType: SplitType.EQUAL,
    splits: { 'm1': 1, 'm2': 1, 'm3': 1, 'm4': 1 }, isRecurring: false
  },
  {
    id: 'e3', groupId: 'g1', description: 'Uber to Downtown', amount: 32.00, payerId: 'm3', date: '2023-10-02', category: ExpenseCategory.TRANSPORT, splitType: SplitType.EQUAL,
    splits: { 'm2': 1, 'm3': 1 }, isRecurring: false
  }
];

const App: React.FC = () => {
  // State
  const [activeTab, setActiveTab] = useState<'expenses' | 'balances'>('expenses');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [members, setMembers] = useState<Member[]>(MOCK_MEMBERS);
  const [expenses, setExpenses] = useState<Expense[]>(MOCK_EXPENSES);
  const [aiSummary, setAiSummary] = useState<string>("");
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Derived State: Calculate Balances
  // Simple algorithm: 
  // 1. Calculate total cost for everyone involved in an expense
  // 2. Subtract share from balance (owing), add paid amount to balance (owed)
  const balances = useMemo(() => {
    const bal: Record<string, number> = {};
    members.forEach(m => bal[m.id] = 0);

    expenses.forEach(exp => {
      const paidBy = exp.payerId;
      const amount = exp.amount;
      
      // Credit the payer
      bal[paidBy] += amount;

      // Debit the consumers
      const involvedIds = Object.keys(exp.splits);
      if (involvedIds.length === 0) return;

      // Currently only supporting EQUAL split logic for simplicity in demo
      const splitAmount = amount / involvedIds.length;
      involvedIds.forEach(id => {
        bal[id] -= splitAmount;
      });
    });

    return Object.keys(bal).map(id => ({ memberId: id, amount: bal[id] }));
  }, [expenses, members]);

  // Derived State: Settlements
  // Minimize transactions algorithm (Simplified greedy approach)
  const settlements = useMemo(() => {
    const sortedBalances = [...balances].sort((a, b) => a.amount - b.amount);
    const plans: Settlement[] = [];
    
    let i = 0; // Debtor pointer (negative balance)
    let j = sortedBalances.length - 1; // Creditor pointer (positive balance)

    // Working copies
    const currentBalances = sortedBalances.map(b => ({ ...b }));

    while (i < j) {
      const debtor = currentBalances[i];
      const creditor = currentBalances[j];
      
      // Simple tolerance for floating point errors
      if (Math.abs(debtor.amount) < 0.01) { i++; continue; }
      if (Math.abs(creditor.amount) < 0.01) { j--; continue; }

      const amount = Math.min(Math.abs(debtor.amount), creditor.amount);
      
      plans.push({
        from: debtor.memberId,
        to: creditor.memberId,
        amount: amount
      });

      debtor.amount += amount;
      creditor.amount -= amount;

      if (Math.abs(debtor.amount) < 0.01) i++;
      if (creditor.amount < 0.01) j--;
    }
    return plans;
  }, [balances]);

  // AI Insight Generation
  useEffect(() => {
    if (activeTab === 'balances' && settlements.length > 0) {
      setLoadingSummary(true);
      const memberMap = members.reduce((acc, m) => ({ ...acc, [m.id]: m.name }), {} as Record<string, string>);
      generateSettlementInsight(settlements, memberMap)
        .then(setAiSummary)
        .finally(() => setLoadingSummary(false));
    }
  }, [activeTab, settlements, members]);

  const handleAddExpense = (expenseData: any) => {
    const newExpense: Expense = {
      ...expenseData,
      id: Math.random().toString(36).substr(2, 9),
      groupId: 'g1'
    };
    setExpenses([newExpense, ...expenses]);
  };

  const downloadSummary = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Date,Description,Category,Payer,Amount\n"
      + expenses.map(e => `${e.date},${e.description},${e.category},${members.find(m => m.id === e.payerId)?.name},${e.amount}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "expenses_summary.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen pb-20 lg:pb-0">
      
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 p-2 rounded-lg text-white">
                <Users size={20} />
              </div>
              <span className="font-bold text-xl tracking-tight text-slate-800">FairShare<span className="text-indigo-600">.ai</span></span>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={downloadSummary} className="p-2 text-gray-500 hover:text-indigo-600 transition hidden sm:block" title="Download CSV">
                <Download size={20} />
              </button>
              <div className="flex -space-x-2">
                {members.map(m => (
                  <img key={m.id} className="w-8 h-8 rounded-full border-2 border-white" src={m.avatar} alt={m.name} />
                ))}
                <button className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 border-2 border-white text-xs font-bold">+</button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Dashboard Overview */}
        <Dashboard expenses={expenses} members={members} currency="$" />

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 mb-6">
           <button 
             onClick={() => setActiveTab('expenses')}
             className={`pb-3 px-4 text-sm font-medium transition flex items-center gap-2 ${activeTab === 'expenses' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
           >
             <Receipt size={16} />
             Expenses
           </button>
           <button 
             onClick={() => setActiveTab('balances')}
             className={`pb-3 px-4 text-sm font-medium transition flex items-center gap-2 ${activeTab === 'balances' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
           >
             <Wallet size={16} />
             Balances
           </button>
        </div>

        {/* Expenses List View */}
        {activeTab === 'expenses' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {expenses.map(expense => (
               <div key={expense.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-2xl">
                        {expense.category === ExpenseCategory.FOOD ? '🍔' : 
                         expense.category === ExpenseCategory.TRANSPORT ? '🚕' : 
                         expense.category === ExpenseCategory.ACCOMMODATION ? '🏠' : '💸'}
                     </div>
                     <div>
                        <h3 className="font-semibold text-gray-800">{expense.description}</h3>
                        <p className="text-xs text-gray-500">
                          <span className="font-medium text-gray-700">{members.find(m => m.id === expense.payerId)?.name}</span> paid ${expense.amount.toFixed(2)}
                        </p>
                     </div>
                  </div>
                  <div className="text-right">
                     <span className="block font-bold text-gray-900">${expense.amount.toFixed(2)}</span>
                     <span className="text-xs text-gray-400">{new Date(expense.date).toLocaleDateString()}</span>
                  </div>
               </div>
            ))}
            {expenses.length === 0 && (
                <div className="text-center py-20 text-gray-400">
                    <p>No expenses yet. Tap + to add one!</p>
                </div>
            )}
          </div>
        )}

        {/* Balances & Settlement View */}
        {activeTab === 'balances' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* AI Insight Banner */}
            {settlements.length > 0 && (
                <div className="bg-gradient-to-r from-violet-500 to-fuchsia-600 rounded-xl p-5 text-white mb-6 shadow-lg">
                    <div className="flex items-start gap-3">
                        <Sparkles className="mt-1 flex-shrink-0" size={20} />
                        <div>
                            <h3 className="font-bold text-sm uppercase tracking-wide opacity-80 mb-1">AI Financial Assistant</h3>
                            <p className="text-sm font-medium leading-relaxed">
                                {loadingSummary ? "Analysing group spending patterns..." : aiSummary}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Individual Net Balances */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">Net Balances</h3>
                    <div className="space-y-4">
                        {balances.map(b => (
                            <div key={b.memberId} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <img src={members.find(m => m.id === b.memberId)?.avatar} alt="" className="w-8 h-8 rounded-full" />
                                    <span className="font-medium text-gray-700">{members.find(m => m.id === b.memberId)?.name}</span>
                                </div>
                                <span className={`font-bold ${b.amount > 0 ? 'text-emerald-500' : b.amount < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                    {b.amount > 0 ? '+' : ''}{b.amount.toFixed(2)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Settlement Plan */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">Settlement Plan</h3>
                    {settlements.length === 0 ? (
                        <div className="text-center text-gray-400 py-8">All settled up! 🎉</div>
                    ) : (
                        <div className="space-y-4 relative">
                            {/* Simple timeline line */}
                            <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gray-100"></div>
                            
                            {settlements.map((s, idx) => (
                                <div key={idx} className="relative flex items-center gap-4 bg-gray-50 p-3 rounded-lg z-10">
                                    <div className="w-8 h-8 rounded-full bg-white border-2 border-red-200 flex items-center justify-center overflow-hidden shrink-0">
                                        <img src={members.find(m => m.id === s.from)?.avatar} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 text-sm">
                                        <span className="font-semibold text-gray-800">{members.find(m => m.id === s.from)?.name}</span>
                                        <span className="text-gray-500 px-1">pays</span>
                                        <span className="font-semibold text-gray-800">{members.find(m => m.id === s.to)?.name}</span>
                                    </div>
                                    <div className="font-bold text-gray-900 bg-white px-2 py-1 rounded shadow-sm border border-gray-200">
                                        ${s.amount.toFixed(2)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      <button 
        onClick={() => setIsAddModalOpen(true)}
        className="fixed bottom-6 right-6 bg-indigo-600 text-white w-14 h-14 rounded-full shadow-lg shadow-indigo-300 flex items-center justify-center hover:bg-indigo-700 hover:scale-105 transition active:scale-95 z-40"
      >
        <Plus size={28} />
      </button>

      <AddExpenseModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        members={members}
        onAdd={handleAddExpense}
      />
    </div>
  );
};

export default App;
