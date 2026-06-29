import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, Star, Package, ChevronRight, CheckCircle2, QrCode, Clock, MapPin, AlertCircle, ShoppingCart } from 'lucide-react';
import { CustomUser, MerchOrder } from '../types';
import { MERCH_ITEMS, getPortalDB, savePortalDB, calculateResearcherStats } from '../services/storage';

interface ShopViewProps {
  user: CustomUser | null;
  onRefresh: () => void;
}

export const ShopView: React.FC<ShopViewProps> = ({ user, onRefresh }) => {
  const [selectedItem, setSelectedItem] = useState<typeof MERCH_ITEMS[0] | null>(null);
  const [showOrderSuccess, setShowOrderSuccess] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);

  const db = getPortalDB();
  const stats = user ? calculateResearcherStats(user.record_book_id) : { ratingPoints: 0 };
  
  // Рассчитываем доступные баллы (минус уже потраченные)
  const spentPoints = user ? db.merch_orders
    .filter(o => o.user_record_book === user.record_book_id && o.status !== 'отменен')
    .reduce((acc, o) => {
      const item = MERCH_ITEMS.find(i => i.id === o.item_id);
      return acc + (item?.price || 0);
    }, 0) : 0;

  const availablePoints = stats.ratingPoints - spentPoints;

  const handlePurchase = (item: typeof MERCH_ITEMS[0]) => {
    if (!user) return;
    if (availablePoints < item.price) return;

    const newOrder: MerchOrder = {
      id: 'order_' + Math.random().toString(36).substr(2, 9).toUpperCase(),
      user_record_book: user.record_book_id,
      item_id: item.id,
      item_name: item.name,
      status: 'ожидает',
      created_at: new Date().toISOString()
    };

    db.merch_orders.push(newOrder);
    savePortalDB(db);
    
    setLastOrderId(newOrder.id);
    setShowOrderSuccess(true);
    setSelectedItem(null);
    onRefresh();
  };

  const userOrders = user ? db.merch_orders.filter(o => o.user_record_book === user.record_book_id).reverse() : [];

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-10">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest border border-amber-200 dark:border-amber-800">
            <Star className="w-3 h-3 fill-current" />
            <span>Магазин лояльности СНО ФЭМ</span>
          </div>
          <h1 className="text-3xl font-black text-brand-blue dark:text-blue-200">Маркет достижений</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md">
            Обменивайте баллы за научную активность на эксклюзивный мерч факультета.
          </p>
        </div>

        <div className="flex items-center space-x-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-brand-gold flex items-center justify-center text-white shadow-lg">
            <Star className="w-6 h-6 fill-current" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Ваши баллы БГЭУ</p>
            <p className="text-2xl font-black text-brand-blue dark:text-white leading-none mt-1">
              {availablePoints} <span className="text-xs text-slate-400 font-normal">pts</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Merchandise Grid */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {MERCH_ITEMS.map((item) => (
            <motion.div 
              key={item.id}
              whileHover={{ y: -5 }}
              className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm group"
            >
              <div className="aspect-square relative overflow-hidden bg-slate-100 dark:bg-slate-800">
                <img 
                  src={item.image_url} 
                  alt={item.name} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 left-4">
                  <div className="px-3 py-1.5 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-white/20 text-brand-blue dark:text-white text-xs font-black shadow-lg flex items-center space-x-1">
                    <Star className="w-3 h-3 text-brand-gold fill-current" />
                    <span>{item.price} Б</span>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-3">
                <h3 className="font-black text-lg text-brand-blue dark:text-blue-200 leading-tight">{item.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {item.description}
                </p>
                <button 
                  disabled={availablePoints < item.price}
                  onClick={() => setSelectedItem(item)}
                  className={`w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                    availablePoints >= item.price 
                      ? 'bg-brand-blue hover:bg-blue-900 text-brand-gold shadow-lg active:scale-95' 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {availablePoints >= item.price ? 'Обменять баллы' : 'Недостаточно баллов'}
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Orders History & Dean's Office Info */}
        <div className="space-y-6">
          <div className="bg-brand-blue p-8 rounded-[2rem] text-white space-y-6 shadow-xl relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/20 blur-3xl rounded-full" />
            <h3 className="text-xl font-black flex items-center space-x-2 relative z-10">
              <MapPin className="w-5 h-5 text-brand-gold" />
              <span>Где забрать?</span>
            </h3>
            <div className="space-y-4 text-sm relative z-10">
              <div className="flex space-x-3">
                <div className="w-6 h-6 rounded-lg bg-blue-500/30 flex-shrink-0 flex items-center justify-center font-bold text-xs">1</div>
                <p className="text-blue-100">Выберите сувенир и подтвердите обмен баллов.</p>
              </div>
              <div className="flex space-x-3">
                <div className="w-6 h-6 rounded-lg bg-blue-500/30 flex-shrink-0 flex items-center justify-center font-bold text-xs">2</div>
                <p className="text-blue-100">Зайдите в <span className="font-bold text-white">Деканат ФЭМ (каб. 314, корп. 4)</span>.</p>
              </div>
              <div className="flex space-x-3">
                <div className="w-6 h-6 rounded-lg bg-blue-500/30 flex-shrink-0 flex items-center justify-center font-bold text-xs">3</div>
                <p className="text-blue-100">Покажите QR-код заказа ответственному за НИРС.</p>
              </div>
            </div>
            <div className="pt-4 border-t border-blue-800/50 relative z-10">
              <div className="flex items-center space-x-2 text-[10px] font-bold text-blue-300 uppercase tracking-wider">
                <Clock className="w-3 h-3" />
                <span>Время работы: Пн-Пт 14:00 - 17:00</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <h3 className="text-lg font-black text-brand-blue dark:text-blue-200 flex items-center space-x-2">
              <Package className="w-5 h-5 text-brand-gold" />
              <span>Ваши заказы</span>
            </h3>
            
            <div className="space-y-4">
              {userOrders.length > 0 ? userOrders.map((order) => (
                <div key={order.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-xs font-black text-brand-blue dark:text-white leading-tight">{order.item_name}</p>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                      order.status === 'ожидает' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono">ID: {order.id}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-[10px] text-slate-500">{new Date(order.created_at).toLocaleDateString()}</p>
                    <button className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                      <QrCode className="w-4 h-4 text-brand-blue dark:text-brand-gold" />
                    </button>
                  </div>
                </div>
              )) : (
                <div className="py-10 text-center space-y-2">
                  <ShoppingBag className="w-10 h-10 text-slate-200 dark:text-slate-700 mx-auto" />
                  <p className="text-xs text-slate-400 font-bold">Вы пока ничего не заказывали</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedItem(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl relative z-10 border border-slate-200 dark:border-slate-800"
            >
              <div className="p-8 space-y-6 text-center">
                <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-[2rem] flex items-center justify-center mx-auto">
                  <ShoppingCart className="w-10 h-10 text-amber-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-brand-blue dark:text-white">Подтверждение обмена</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Вы уверены, что хотите обменять <span className="font-bold text-brand-blue dark:text-white">{selectedItem.price} баллов</span> на <span className="font-bold text-brand-blue dark:text-white">«{selectedItem.name}»</span>?
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button 
                    onClick={() => setSelectedItem(null)}
                    className="flex-1 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm font-black text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                  >
                    Отмена
                  </button>
                  <button 
                    onClick={() => handlePurchase(selectedItem)}
                    className="flex-1 py-4 rounded-2xl bg-brand-blue text-brand-gold text-sm font-black shadow-lg hover:brightness-110 active:scale-95 transition-all"
                  >
                    Подтвердить
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showOrderSuccess && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl relative z-10 border border-slate-200 dark:border-slate-800"
            >
              <div className="p-8 space-y-6 text-center">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-[2rem] flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10 text-green-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-brand-blue dark:text-white">Заказ оформлен!</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    Ваш заказ <span className="font-bold text-mono">{lastOrderId}</span> успешно создан. Для получения сувенира обратитесь в деканат ФЭМ.
                  </p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl flex flex-col items-center space-y-2">
                  <QrCode className="w-24 h-24 text-brand-blue dark:text-white" />
                  <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Код получения: {lastOrderId}</p>
                </div>
                <button 
                  onClick={() => setShowOrderSuccess(false)}
                  className="w-full py-4 rounded-2xl bg-brand-blue text-brand-gold text-sm font-black shadow-lg hover:brightness-110 active:scale-95 transition-all"
                >
                  Закрыть
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
