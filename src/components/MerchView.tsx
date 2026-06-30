import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, Star, Package, Clock, CheckCircle2, AlertCircle, ShoppingCart, Info, User } from 'lucide-react';
import { CustomUser, MerchItem, MerchOrder } from '../types';
import { placeMerchOrder, calculateResearcherStats, PortalDatabase } from '../services/storage';

interface MerchViewProps {
  db: PortalDatabase;
  user: CustomUser | null;
  onRefresh: () => void;
}

export const MerchView: React.FC<MerchViewProps> = ({ db, user, onRefresh }) => {
  const [selectedItem, setSelectedItem] = useState<MerchItem | null>(null);
  const [isOrdering, setIsOrdering] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const stats = user ? calculateResearcherStats(user.record_book_id) : { ratingPoints: 0 };
  const userOrders = user ? db.orders.filter(o => o.userRecordBook === user.record_book_id) : [];

  const handleOrder = (item: MerchItem) => {
    if (!user) return;
    setIsOrdering(true);
    const result = placeMerchOrder(user, item);
    setMessage({ text: result.message, type: result.success ? 'success' : 'error' });
    setIsOrdering(false);
    onRefresh();
    
    setTimeout(() => setMessage(null), 5000);
  };

  const getStatusBadge = (status: MerchOrder['status']) => {
    switch (status) {
      case 'pending': return (
        <span className="flex items-center space-x-1 px-2 py-1 rounded-full bg-emerald-100/50 text-emerald-700 text-[10px] font-bold uppercase">
          <Clock className="w-3 h-3" />
          <span>Ожидает</span>
        </span>
      );
      case 'ready': return (
        <span className="flex items-center space-x-1 px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase">
          <Package className="w-3 h-3" />
          <span>Готов к выдаче</span>
        </span>
      );
      case 'received': return (
        <span className="flex items-center space-x-1 px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase">
          <CheckCircle2 className="w-3 h-3" />
          <span>Получен</span>
        </span>
      );
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center p-3 bg-emerald-100/50 dark:bg-emerald-900/30 rounded-2xl mb-4">
          <ShoppingBag className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h1 className="text-3xl font-black text-[#052e16] dark:text-emerald-200 mb-2 italic">SNO MERCH STORE</h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
          Обменивайте свои достижения и баллы рейтинга на фирменную сувенирную продукцию СНО ФЭМ.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Боковая панель пользователя */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Ваш баланс</h3>
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-50/50 dark:bg-emerald-900/20 rounded-2xl text-emerald-600">
                <Star className="w-6 h-6 fill-current" />
              </div>
              <div>
                <div className="text-2xl font-black text-[#052e16] dark:text-emerald-100">{stats.ratingPoints}</div>
                <div className="text-xs text-slate-500">баллов рейтинга</div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Где получить?</h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Сувениры выдаются в <span className="font-bold">деканате ФЭМ</span> (Корпус 4, каб. 314) у <span className="text-[#052e16] dark:text-emerald-300 font-bold">заместителя декана</span> по научной работе.
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <User className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  При себе необходимо иметь <span className="font-bold italic text-slate-900 dark:text-white">зачётную книжку</span> для подтверждения личности.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Витрина товаров */}
        <div className="lg:col-span-3 space-y-8">
          <AnimatePresence>
            {message && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`p-4 rounded-2xl border flex items-center space-x-3 ${
                  message.type === 'success' 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400' 
                    : 'bg-rose-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400'
                }`}
              >
                {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                <p className="text-sm font-bold">{message.text}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {db.merch.map((item) => (
              <motion.div
                key={item.id}
                whileHover={{ y: -4 }}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition-all group"
              >
                <div className="aspect-[16/9] bg-slate-100 dark:bg-slate-800 flex items-center justify-center relative">
                  <Package className="w-12 h-12 text-slate-300 dark:text-slate-700" />
                  <div className="absolute top-4 right-4 px-3 py-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur rounded-full text-xs font-black text-emerald-600 border border-emerald-200 dark:border-amber-800">
                    {item.points} pts
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-black text-[#052e16] dark:text-emerald-200 mb-2 group-hover:text-emerald-600 transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">В наличии: {item.stock} шт</span>
                    <button
                      onClick={() => handleOrder(item)}
                      disabled={!user || stats.ratingPoints < item.points || item.stock <= 0}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                        !user || stats.ratingPoints < item.points || item.stock <= 0
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800'
                        : 'bg-[#052e16] text-white hover:bg-emerald-800 shadow-lg shadow-blue-900/20 active:scale-95'
                      }`}
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>Обменять</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Ваши заказы */}
          {userOrders.length > 0 && (
            <div className="mt-12">
              <h2 className="text-xl font-black text-[#052e16] dark:text-emerald-200 mb-6 flex items-center space-x-2">
                <ShoppingCart className="w-5 h-5" />
                <span>Ваши недавние заказы</span>
              </h2>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-6 py-4">Товар</th>
                      <th className="px-6 py-4">Дата</th>
                      <th className="px-6 py-4">Баллы</th>
                      <th className="px-6 py-4">Статус</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {userOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-[#052e16] dark:text-emerald-200">{order.itemName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">ID: {order.id}</div>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-emerald-600">
                          -{order.points}
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(order.status)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
