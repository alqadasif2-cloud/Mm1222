import React, { useState, useEffect } from 'react';
import { useTrading } from '../../context/TradingContext';
import { PendingOrderType } from '../../types/mt5';

export const NewOrderModal: React.FC = () => {
  const {
    orderModalSymbol,
    closeOrderModal,
    quotes,
    openTrade,
    placePendingOrder,
    setActiveTab,
    setSelectedSymbol
  } = useTrading();

  const [lot, setLot] = useState<number>(0.01);
  const [sl, setSl] = useState<string>('');
  const [tp, setTp] = useState<string>('');
  const [orderType, setOrderType] = useState<'market' | PendingOrderType>('market');
  const [targetPrice, setTargetPrice] = useState<string>('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const quote = quotes.find((q) => q.symbol === orderModalSymbol) || quotes[0];

  useEffect(() => {
    if (!orderModalSymbol || !quote) return;
    if (orderType === 'buy_limit' || orderType === 'sell_stop') {
      const suggested = quote.bid * 0.995;
      setTargetPrice(suggested.toFixed(quote.digits));
    } else if (orderType === 'sell_limit' || orderType === 'buy_stop') {
      const suggested = quote.ask * 1.005;
      setTargetPrice(suggested.toFixed(quote.digits));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderType, orderModalSymbol]);

  if (!orderModalSymbol) return null;

  const handleExecuteMarket = (type: 'buy' | 'sell') => {
    const success = openTrade(
      quote.symbol,
      type,
      lot,
      sl ? parseFloat(sl) : undefined,
      tp ? parseFloat(tp) : undefined
    );
    if (success) {
      setFeedback(`تم تنفيذ أمر ${type === 'buy' ? 'الشراء' : 'البيع'} بنجاح`);
      setTimeout(() => {
        setFeedback(null);
        closeOrderModal();
        setActiveTab('trade');
      }, 600);
    }
  };

  const handlePlacePending = () => {
    if (orderType === 'market') return;
    const priceNum = parseFloat(targetPrice);
    if (isNaN(priceNum) || priceNum <= 0) return;

    const success = placePendingOrder(
      quote.symbol,
      orderType,
      lot,
      priceNum,
      sl ? parseFloat(sl) : undefined,
      tp ? parseFloat(tp) : undefined
    );
    if (success) {
      const label = orderType.replace('_', ' ').toUpperCase();
      setFeedback(`تم وضع أمر ${label} عند ${priceNum.toFixed(quote.digits)}`);
      setTimeout(() => {
        setFeedback(null);
        closeOrderModal();
        setActiveTab('trade');
      }, 650);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 select-none animate-fadeIn"
      onClick={closeOrderModal}
    >
      <div
        className="bg-[#161920] border border-[#2a2f3a] rounded-2xl w-full max-w-sm overflow-hidden text-right shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 bg-[#101318] border-b border-[#222732] flex items-center justify-between">
          <button
            onClick={closeOrderModal}
            className="w-8 h-8 rounded-full bg-white/5 text-[#8e9aa8] hover:text-white cursor-pointer"
          >
            ✕
          </button>
          <div className="text-center">
            <select
              value={quote.symbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              className="bg-transparent text-lg font-num font-bold text-white outline-none text-center cursor-pointer"
            >
              {quotes.map((q) => (
                <option key={q.symbol} value={q.symbol} className="bg-[#161920]">
                  {q.symbol}
                </option>
              ))}
            </select>
            <span className="text-xs text-[#8e9aa8] block">{quote.name}</span>
          </div>
          <div className="w-8" />
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="text-[11px] text-[#8e9aa8] block mb-1">نوع التنفيذ:</label>
            <select
              value={orderType}
              onChange={(e) => setOrderType(e.target.value as typeof orderType)}
              className="w-full bg-[#0e1116] text-white text-xs font-bold py-2.5 px-3 rounded-xl border border-[#282d38] outline-none"
            >
              <option value="market">تنفيذ فوري بالسوق (Market Execution)</option>
              <option value="buy_limit">أمر شراء معلق (Buy Limit)</option>
              <option value="sell_limit">أمر بيع معلق (Sell Limit)</option>
              <option value="buy_stop">أمر شراء إيقاف (Buy Stop)</option>
              <option value="sell_stop">أمر بيع إيقاف (Sell Stop)</option>
            </select>
          </div>

          {orderType !== 'market' && (
            <div>
              <label className="text-[11px] text-[#64b5f6] block mb-1">السعر المحدد للأمر (Price):</label>
              <input
                type="number"
                step="any"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                dir="ltr"
                className="w-full bg-[#0e1116] border border-[#3897f0]/60 rounded-xl px-3 py-2 text-center text-white font-num font-bold text-sm outline-none"
              />
            </div>
          )}

          <div>
            <label className="text-[11px] text-[#8e9aa8] block mb-1">حجم العقد (Lots):</label>
            <div dir="ltr" className="flex items-center justify-between bg-[#0e1116] border border-[#282d38] rounded-xl p-1">
              <button
                onClick={() => setLot((p) => Math.max(0.01, parseFloat((p - 0.1).toFixed(2))))}
                className="px-2.5 py-1.5 text-xs font-num font-bold text-[#8e9aa8] hover:text-white cursor-pointer"
              >
                -0.1
              </button>
              <button
                onClick={() => setLot((p) => Math.max(0.01, parseFloat((p - 0.01).toFixed(2))))}
                className="px-2.5 py-1.5 text-xs font-num font-bold text-[#8e9aa8] hover:text-white cursor-pointer"
              >
                -0.01
              </button>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={lot}
                onChange={(e) => setLot(Math.max(0.01, parseFloat(e.target.value) || 0.01))}
                className="w-16 text-center bg-transparent text-white font-num font-bold text-sm outline-none"
              />
              <button
                onClick={() => setLot((p) => parseFloat((p + 0.01).toFixed(2)))}
                className="px-2.5 py-1.5 text-xs font-num font-bold text-[#8e9aa8] hover:text-white cursor-pointer"
              >
                +0.01
              </button>
              <button
                onClick={() => setLot((p) => parseFloat((p + 0.1).toFixed(2)))}
                className="px-2.5 py-1.5 text-xs font-num font-bold text-[#8e9aa8] hover:text-white cursor-pointer"
              >
                +0.1
              </button>
            </div>
          </div>

          <div dir="ltr" className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-[#ff7043] block mb-1 text-right">وقف الخسارة (SL):</label>
              <input
                type="number"
                step="any"
                placeholder="اختياري"
                value={sl}
                onChange={(e) => setSl(e.target.value)}
                className="w-full bg-[#0e1116] border border-[#d84315]/60 rounded-xl px-3 py-2 text-white font-num text-xs outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] text-[#26a69a] block mb-1 text-right">أخذ الربح (TP):</label>
              <input
                type="number"
                step="any"
                placeholder="اختياري"
                value={tp}
                onChange={(e) => setTp(e.target.value)}
                className="w-full bg-[#0e1116] border border-[#26a69a]/60 rounded-xl px-3 py-2 text-white font-num text-xs outline-none"
              />
            </div>
          </div>

          <div dir="ltr" className="flex items-center justify-around py-1 font-num">
            <span className="text-lg font-bold text-[#ef5350]">{quote.bid.toFixed(quote.digits)}</span>
            <span className="text-lg font-bold text-[#2196f3]">{quote.ask.toFixed(quote.digits)}</span>
          </div>

          {feedback && (
            <div className="bg-[#26a69a]/20 border border-[#26a69a] text-[#26a69a] text-xs font-bold py-2 px-3 rounded-xl text-center">
              ✓ {feedback}
            </div>
          )}

          {orderType === 'market' ? (
            <div dir="ltr" className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleExecuteMarket('sell')}
                className="py-3 bg-[#d32f2f] hover:bg-[#c62828] text-white font-bold rounded-xl text-sm cursor-pointer transition-colors"
              >
                SELL
              </button>
              <button
                onClick={() => handleExecuteMarket('buy')}
                className="py-3 bg-[#1976d2] hover:bg-[#1565c0] text-white font-bold rounded-xl text-sm cursor-pointer transition-colors"
              >
                BUY
              </button>
            </div>
          ) : (
            <button
              onClick={handlePlacePending}
              className={`w-full py-3 font-bold rounded-xl text-sm text-white cursor-pointer transition-colors ${
                orderType.startsWith('buy')
                  ? 'bg-[#1976d2] hover:bg-[#1565c0]'
                  : 'bg-[#d32f2f] hover:bg-[#c62828]'
              }`}
            >
              وضع أمر {orderType.replace('_', ' ').toUpperCase()}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
