import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Account, SymbolQuote, Candle, Position, PendingOrder, PendingOrderType, Deal, MessageItem, TabType, Timeframe } from '../types/mt5';

interface TradingContextType {
  activeAccount: Account;
  accounts: Account[];
  setActiveAccount: (account: Account) => void;
  quotes: SymbolQuote[];
  selectedSymbol: string;
  setSelectedSymbol: (symbol: string) => void;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  timeframe: Timeframe;
  setTimeframe: (tf: Timeframe) => void;
  candles: Candle[];
  positions: Position[];
  pendingOrders: PendingOrder[];
  historyDeals: Deal[];
  openTrade: (symbol: string, type: 'buy' | 'sell', lots: number, sl?: number, tp?: number) => boolean;
  placePendingOrder: (
    symbol: string,
    type: PendingOrderType,
    lots: number,
    targetPrice: number,
    sl?: number,
    tp?: number
  ) => boolean;
  cancelPendingOrder: (orderId: string) => void;
  modifyPendingOrder: (orderId: string, targetPrice: number, sl?: number, tp?: number) => void;
  closePosition: (positionId: string) => void;
  closeAllPositions: () => void;
  modifyPosition: (positionId: string, sl?: number, tp?: number) => void;
  messages: MessageItem[];
  markMessageAsRead: (id: string) => void;
  unreadCount: number;
  totalProfit: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel: number;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
  openOrderModal: (symbol?: string) => void;
  orderModalSymbol: string | null;
  closeOrderModal: () => void;
  modifyingPosition: Position | null;
  setModifyingPosition: (pos: Position | null) => void;
  modifyingFocus: 'sl' | 'tp' | null;
  setModifyingFocus: (focus: 'sl' | 'tp' | null) => void;
  accountInfoModalOpen: boolean;
  setAccountInfoModalOpen: (open: boolean) => void;
  otpModalOpen: boolean;
  setOtpModalOpen: (open: boolean) => void;
  addAccountModalOpen: boolean;
  setAddAccountModalOpen: (open: boolean) => void;
  addNewAccount: (account: Partial<Account>) => void;
  deleteAccount: (accountId: string) => void;
  isLiveConnected: boolean;
}

// Balance calculation for "إسلام 1":
// Initial Deposit: 127.00 (2026.11.10)
// 2026.11.10: +30.10 | 2026.11.11: -15.90 + 45.20 = +29.30
// Total Balance = 127.00 + 30.10 + 29.30 = 186.40
//
// Balance calculation for "حسابي اسلام1":
// 2026.11.10: +27.00 | 2026.11.11: +26.53 + 29.24 + 26.14 - 55.00 = +26.91
// Net Total = 53.91
const HESABI_ESLAM1_DEFAULT_ACCOUNT: Account = {
  id: 'hesabi-eslam-1',
  name: 'حسابي اسلام1',
  broker: 'Exness Technologies Ltd',
  server: 'Exness-MT5Real35',
  accountNumber: '256476261',
  balance: 53.91,
  currency: 'USD',
  type: 'real',
  leverage: '1:2000',
  logoType: 'exness',
  lastKnownLabel: 'Standard · Access Point #3, Hedge'
};

const INITIAL_ACCOUNTS: Account[] = [
  {
    id: 'eslam-1-real',
    name: 'إسلام 1',
    broker: 'Exness Technologies Ltd',
    server: 'Exness-MT5Real35',
    accountNumber: '256476260',
    balance: 186.40,
    currency: 'USD',
    type: 'real',
    leverage: '1:2000',
    logoType: 'exness',
    lastKnownLabel: 'Standard · Access Point #3, Hedge'
  },
  HESABI_ESLAM1_DEFAULT_ACCOUNT,
  {
    id: 'exness-real-33',
    name: 'Standard',
    broker: 'Exness Technologies Ltd',
    server: 'Exness-MT5Real33',
    accountNumber: '252622825',
    balance: 0.00,
    currency: 'USD',
    type: 'real',
    leverage: '1:2000',
    logoType: 'exness',
    lastKnownLabel: 'Access Point #3, Hedge'
  },
  {
    id: 'exness-trial-16',
    name: 'Standard',
    broker: 'Exness Technologies Ltd',
    server: 'Exness-MT5Trial16',
    accountNumber: '472970564',
    balance: 29.35,
    currency: 'USD',
    type: 'demo',
    leverage: '1:200',
    logoType: 'exness',
    lastKnownLabel: 'آخر ما عرف، USD'
  },
  {
    id: 'metaquotes-demo',
    name: 'Eslam Alqadasi',
    broker: 'MetaQuotes Ltd.',
    server: 'MetaQuotes-Demo',
    accountNumber: '5058743039',
    balance: 3360.09,
    currency: 'USD',
    type: 'demo',
    leverage: '1:100',
    logoType: 'metaquotes',
    lastKnownLabel: 'آخر ما عرف، USD'
  }
];

const INITIAL_QUOTES: SymbolQuote[] = [
  {
    symbol: 'BTCUSDm',
    name: 'Bitcoin vs US Dollar',
    digits: 2,
    bid: 63950.98,
    ask: 63957.38,
    spread: 640,
    high: 68375.71,
    low: 61802.34,
    time: '10:44:07',
    change: -1.24,
    tickDirection: 'up',
    category: 'crypto',
    contractSize: 1,
    source: 'Binance Live'
  },
  {
    symbol: 'XAUUSDm',
    name: 'Gold vs US Dollar',
    digits: 3,
    bid: 3935.200,
    ask: 3935.440,
    spread: 240,
    high: 4065.300,
    low: 3930.100,
    time: '10:44:07',
    change: 0.57,
    tickDirection: 'up',
    category: 'metals',
    contractSize: 100,
    source: 'COMEX Live'
  },
  {
    symbol: 'XAGUSDm',
    name: 'Silver vs US Dollar',
    digits: 3,
    bid: 48.705,
    ask: 48.730,
    spread: 25,
    high: 53.134,
    low: 48.210,
    time: '10:44:07',
    change: -1.42,
    tickDirection: 'down',
    category: 'metals',
    contractSize: 5000,
    source: 'COMEX Live'
  },
  {
    symbol: 'USOILm',
    name: 'WTI Crude Oil vs US Dollar',
    digits: 3,
    bid: 84.553,
    ask: 84.583,
    spread: 30,
    high: 85.191,
    low: 84.005,
    time: '10:44:05',
    change: 0.73,
    tickDirection: 'up',
    category: 'commodities',
    contractSize: 1000,
    source: 'NYMEX Live'
  },
  {
    symbol: 'ETHUSDm',
    name: 'Ethereum vs US Dollar',
    digits: 2,
    bid: 2485.40,
    ask: 2486.90,
    spread: 150,
    high: 2540.00,
    low: 2410.00,
    time: '10:44:05',
    change: 0.84,
    tickDirection: 'up',
    category: 'crypto',
    contractSize: 1,
    source: 'Binance Live'
  },
  {
    symbol: 'BCHUSDm',
    name: 'Bitcoin Cash vs US Dollar',
    digits: 2,
    bid: 368.25,
    ask: 369.10,
    spread: 85,
    high: 375.80,
    low: 358.40,
    time: '10:44:02',
    change: 0.45,
    tickDirection: 'up',
    category: 'crypto',
    contractSize: 1
  },
  {
    symbol: 'BTCJPYm',
    name: 'Bitcoin vs Japanese Yen',
    digits: 0,
    bid: 9842510,
    ask: 9845120,
    spread: 2610,
    high: 9980000,
    low: 9690000,
    time: '10:44:01',
    change: -0.95,
    tickDirection: 'down',
    category: 'crypto',
    contractSize: 1
  },
  {
    symbol: 'LTCUSDm',
    name: 'Litecoin vs US Dollar',
    digits: 2,
    bid: 72.45,
    ask: 72.62,
    spread: 17,
    high: 74.10,
    low: 71.20,
    time: '10:44:00',
    change: 0.31,
    tickDirection: 'up',
    category: 'crypto',
    contractSize: 1
  },
  {
    symbol: 'XRPUSDm',
    name: 'Ripple vs US Dollar',
    digits: 4,
    bid: 0.5482,
    ask: 0.5489,
    spread: 7,
    high: 0.5620,
    low: 0.5390,
    time: '10:44:04',
    change: 1.12,
    tickDirection: 'up',
    category: 'crypto',
    contractSize: 100
  },
  {
    symbol: 'ADAUSDm',
    name: 'Cardano vs US Dollar',
    digits: 4,
    bid: 0.3645,
    ask: 0.3652,
    spread: 7,
    high: 0.3710,
    low: 0.3580,
    time: '10:44:00',
    change: -0.28,
    tickDirection: 'down',
    category: 'crypto',
    contractSize: 100
  },
  {
    symbol: 'BNBUSDm',
    name: 'Binance Coin vs US Dollar',
    digits: 2,
    bid: 584.20,
    ask: 584.90,
    spread: 70,
    high: 592.00,
    low: 576.50,
    time: '10:44:03',
    change: 0.65,
    tickDirection: 'up',
    category: 'crypto',
    contractSize: 1
  },
  {
    symbol: 'DOTUSDm',
    name: 'Polkadot vs US Dollar',
    digits: 3,
    bid: 4.382,
    ask: 4.395,
    spread: 13,
    high: 4.490,
    low: 4.290,
    time: '10:44:02',
    change: -0.44,
    tickDirection: 'down',
    category: 'crypto',
    contractSize: 10
  },
  {
    symbol: 'EURUSDm',
    name: 'Euro vs US Dollar',
    digits: 5,
    bid: 1.08425,
    ask: 1.08437,
    spread: 12,
    high: 1.08740,
    low: 1.08210,
    time: '10:44:07',
    change: -0.05,
    tickDirection: 'down',
    category: 'forex',
    contractSize: 100000
  },
  {
    symbol: 'GBPUSDm',
    name: 'Great Britain Pound vs US Dollar',
    digits: 5,
    bid: 1.26780,
    ask: 1.26795,
    spread: 15,
    high: 1.27150,
    low: 1.26420,
    time: '10:44:06',
    change: 0.18,
    tickDirection: 'up',
    category: 'forex',
    contractSize: 100000
  },
  {
    symbol: 'USDJPYm',
    name: 'US Dollar vs Japanese Yen',
    digits: 3,
    bid: 154.620,
    ask: 154.634,
    spread: 14,
    high: 155.200,
    low: 154.100,
    time: '10:44:05',
    change: 0.32,
    tickDirection: 'up',
    category: 'forex',
    contractSize: 100000
  },
  {
    symbol: 'US30m',
    name: 'Dow Jones Industrial Average',
    digits: 1,
    bid: 39420.5,
    ask: 39423.5,
    spread: 30,
    high: 39650.0,
    low: 39210.0,
    time: '10:44:01',
    change: -0.25,
    tickDirection: 'down',
    category: 'indices',
    contractSize: 1
  }
];

const INITIAL_POSITIONS: Position[] = [
  {
    id: 'pos-btc-1',
    ticket: 2773274125,
    symbol: 'BTCUSDm',
    type: 'buy',
    lots: 0.01,
    openPrice: 63580.00,
    currentPrice: 63950.98,
    sl: 61800.00,
    tp: 66800.00,
    swap: 0.00,
    commission: 0.00,
    profit: 3.71,
    openTime: '2026.11.15 06:15:22',
    accountId: 'exness-real-33'
  }
];

function formatDateYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}.${m}.${d}`;
}

function isHesabiEslam1Name(name?: string): boolean {
  if (!name) return false;
  const normalized = name
    .trim()
    .replace(/\s+/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي');
  return normalized === 'حسابياسلام1';
}

function createHesabiEslam1Deals(accountId: string): Deal[] {
  return [
    // Day 1: 2026.11.10 -> Gold XAUUSDm Buy 0.01: 4030.30 -> 4057.30 (+27.00) at 04:31:12 AM
    {
      id: `hesabi-deal-4-${accountId}`,
      ticket: 256476404,
      orderTicket: 256476403,
      symbol: 'XAUUSDm',
      type: 'buy',
      direction: 'out',
      lots: 0.01,
      openPrice: 4030.300,
      closePrice: 4057.300,
      swap: 0,
      commission: 0,
      profit: 27.00,
      openTime: '2026.11.10 04:31:12',
      closeTime: '2026.11.10 04:31:12',
      status: 'FILLED',
      accountId,
      comment: 'إغلاق بربح'
    },
    // Day 2: 2026.11.11 -> Silver XAGUSDm Buy 0.01: 52.53 -> 53.06 (+26.53) at 12:14:59 PM
    {
      id: `hesabi-deal-5-${accountId}`,
      ticket: 256476505,
      orderTicket: 256476504,
      symbol: 'XAGUSDm',
      type: 'buy',
      direction: 'out',
      lots: 0.01,
      openPrice: 52.530,
      closePrice: 53.060,
      swap: 0,
      commission: 0,
      profit: 26.53,
      openTime: '2026.11.11 12:14:59',
      closeTime: '2026.11.11 12:14:59',
      status: 'FILLED',
      accountId,
      comment: 'إغلاق بربح'
    },
    // Day 2: 2026.11.11 -> Gold XAUUSDm Buy 0.01: 4035.00 -> 4064.31 (+29.24) at 12:17:13 PM
    {
      id: `hesabi-deal-6-${accountId}`,
      ticket: 256476606,
      orderTicket: 256476605,
      symbol: 'XAUUSDm',
      type: 'buy',
      direction: 'out',
      lots: 0.01,
      openPrice: 4035.000,
      closePrice: 4064.310,
      swap: 0,
      commission: 0,
      profit: 29.24,
      openTime: '2026.11.11 12:17:13',
      closeTime: '2026.11.11 12:17:13',
      status: 'FILLED',
      accountId,
      comment: 'إغلاق بربح'
    },
    // Day 2: 2026.11.11 -> Gold XAUUSDm Buy 0.01: 4039.00 -> 4065.21 (+26.14) at 12:17:16 PM
    {
      id: `hesabi-deal-7-${accountId}`,
      ticket: 256476707,
      orderTicket: 256476706,
      symbol: 'XAUUSDm',
      type: 'buy',
      direction: 'out',
      lots: 0.01,
      openPrice: 4039.000,
      closePrice: 4065.210,
      swap: 0,
      commission: 0,
      profit: 26.14,
      openTime: '2026.11.11 12:17:16',
      closeTime: '2026.11.11 12:17:16',
      status: 'FILLED',
      accountId,
      comment: 'إغلاق بربح'
    },
    // Day 2: 2026.11.11 -> Balance deduction -55.00 at 13:32:12 (1:32:12 PM)
    {
      id: `hesabi-balance-deduct-11-${accountId}`,
      ticket: 256476808,
      symbol: 'Balance',
      type: 'deposit',
      lots: 0,
      openPrice: 0,
      closePrice: 0,
      swap: 0,
      commission: 0,
      profit: -55.00,
      openTime: '2026.11.11 13:32:12',
      closeTime: '2026.11.11 13:32:12',
      status: 'FILLED',
      accountId,
      comment: 'رصيد الحساب'
    }
  ];
}

function createInitialHistory(): Deal[] {
  return [
    // === Account: إسلام 1 (eslam-1-real) ===
    // Day 1: 2026.11.10 -> Deposit 127.00 + Trade 1 (03:16:00) Buy 4035.20 -> 4065.30 (+30.10)
    {
      id: 'eslam1-deposit',
      ticket: 256476001,
      symbol: 'Balance',
      type: 'deposit',
      lots: 0,
      openPrice: 0,
      closePrice: 0,
      swap: 0,
      commission: 0,
      profit: 127.00,
      openTime: '2026.11.10 01:00:00',
      closeTime: '2026.11.10 01:00:00',
      status: 'FILLED',
      accountId: 'eslam-1-real',
      comment: 'إيداع رصيد الحساب'
    },
    {
      id: 'eslam1-deal-1',
      ticket: 256476101,
      orderTicket: 256476100,
      symbol: 'XAUUSDm',
      type: 'buy',
      direction: 'out',
      lots: 0.01,
      openPrice: 4035.200,
      closePrice: 4065.300,
      swap: 0,
      commission: 0,
      profit: 30.10,
      openTime: '2026.11.10 03:16:00',
      closeTime: '2026.11.10 03:16:00',
      status: 'FILLED',
      accountId: 'eslam-1-real',
      comment: 'إغلاق بربح'
    },
    // Day 2: 2026.11.11 -> Trade 2 (05:31:00) Buy 3981.10 -> 3965.20 (-15.90)
    {
      id: 'eslam1-deal-2',
      ticket: 256476202,
      orderTicket: 256476201,
      symbol: 'XAUUSDm',
      type: 'buy',
      direction: 'out',
      lots: 0.01,
      openPrice: 3981.100,
      closePrice: 3965.200,
      swap: 0,
      commission: 0,
      profit: -15.90,
      openTime: '2026.11.11 05:31:00',
      closeTime: '2026.11.11 05:31:00',
      status: 'FILLED',
      accountId: 'eslam-1-real',
      comment: 'إغلاق بخسارة'
    },
    // Day 2: 2026.11.11 -> Trade 3 (07:22:00) Sell 3980.40 -> 3935.20 (+45.20)
    {
      id: 'eslam1-deal-3',
      ticket: 256476303,
      orderTicket: 256476302,
      symbol: 'XAUUSDm',
      type: 'sell',
      direction: 'out',
      lots: 0.01,
      openPrice: 3980.400,
      closePrice: 3935.200,
      swap: 0,
      commission: 0,
      profit: 45.20,
      openTime: '2026.11.11 07:22:00',
      closeTime: '2026.11.11 07:22:00',
      status: 'FILLED',
      accountId: 'eslam-1-real',
      comment: 'إغلاق بربح'
    },
    // === Account: حسابي اسلام1 (hesabi-eslam-1) ===
    ...createHesabiEslam1Deals('hesabi-eslam-1'),

    // === Account: Standard Trial (exness-trial-16) ===
    {
      id: 'trial-deposit-1',
      ticket: 48920100,
      symbol: 'Balance',
      type: 'deposit',
      lots: 0,
      openPrice: 0,
      closePrice: 0,
      swap: 0,
      commission: 0,
      profit: 19.51,
      openTime: '2026.11.10 02:00:00',
      closeTime: '2026.11.10 02:00:00',
      status: 'FILLED',
      accountId: 'exness-trial-16',
      comment: 'Deposit'
    },
    {
      id: 'trial-deal-1',
      ticket: 48920101,
      orderTicket: 48920100,
      symbol: 'XAUUSDm',
      type: 'buy',
      direction: 'out',
      lots: 0.01,
      openPrice: 4123.369,
      closePrice: 4122.625,
      swap: 0,
      commission: 0,
      profit: -0.74,
      openTime: '2026.11.10 06:42:35',
      closeTime: '2026.11.10 06:42:35',
      status: 'FILLED',
      accountId: 'exness-trial-16'
    },
    {
      id: 'trial-deal-2',
      ticket: 48920102,
      orderTicket: 48920101,
      symbol: 'USOILm',
      type: 'buy',
      direction: 'out',
      lots: 0.01,
      openPrice: 84.451,
      closePrice: 84.553,
      swap: 0,
      commission: 0,
      profit: 1.02,
      openTime: '2026.11.10 07:00:08',
      closeTime: '2026.11.10 07:00:08',
      status: 'FILLED',
      accountId: 'exness-trial-16'
    },

    // === Account: MetaQuotes Demo ===
    {
      id: 'deposit-demo-1',
      ticket: 50574100,
      symbol: 'Balance',
      type: 'deposit',
      lots: 0,
      openPrice: 0,
      closePrice: 0,
      swap: 0,
      commission: 0,
      profit: 3360.09,
      openTime: '2026.11.08 08:30:00',
      closeTime: '2026.11.08 08:30:00',
      status: 'FILLED',
      accountId: 'metaquotes-demo',
      comment: 'رصيد الحساب'
    }
  ];
}

const INITIAL_MESSAGES: MessageItem[] = [
  {
    id: 'msg-1',
    title: 'تم فتح حساب إسلام 1 الحقيقي بنجاح',
    content: 'تم تفعيل حسابك الحقيقي "إسلام 1" (Standard) على خادم Exness-MT5Real35 وإيداع مبلغ 127.00 USD وتحديث الرصيد إلى 186.40 USD.',
    sender: 'Exness Accounts',
    time: 'منذ 10 دقائق',
    read: false,
    type: 'security'
  },
  {
    id: 'msg-2',
    title: 'تأكيد إغلاق صفقة XAUUSDm بيع',
    content: 'تم إغلاق صفقة XAUUSDm sell 0.01 عند السعر 3935.20 بربح +45.20 USD بتاريخ 2026.11.11 07:22.',
    sender: 'MetaTrader 5 Server',
    time: 'منذ ساعة',
    read: false,
    type: 'system'
  },
  {
    id: 'msg-3',
    title: 'تأكيد إغلاق صفقة XAUUSDm شراء',
    content: 'تم إغلاق صفقة XAUUSDm buy 0.01 عند السعر 4065.30 بربح +30.10 USD بتاريخ 2026.11.10 03:16.',
    sender: 'MetaTrader 5 Server',
    time: 'أمس',
    read: false,
    type: 'system'
  },
  {
    id: 'msg-4',
    title: 'الحساب الإسلامي الخالي من الفوائد (Swap-Free)',
    content: 'حسابك مفعّل على الوضع الإسلامي الخالي من فوائد التبييت لجميع المعادن والعملات.',
    sender: 'Exness Support',
    time: 'أمس',
    read: false,
    type: 'system'
  },
  {
    id: 'msg-5',
    title: 'تحليل حركة BTCUSDm و XAUUSDm',
    content: 'تداول الذهب XAUUSDm حول مستويات 3935$ وسط ترقب للجلسة الأمريكية.',
    sender: 'MQL5 Market Pulse',
    time: 'قبل يومين',
    read: false,
    type: 'news'
  },
  {
    id: 'msg-6',
    title: 'تنبيه أمان تسجيل الدخول',
    content: 'تم تسجيل الدخول بنجاح من تطبيق MetaTrader 5 لنظام أندرويد.',
    sender: 'MetaQuotes Security',
    time: 'قبل يومين',
    read: false,
    type: 'security'
  },
  {
    id: 'msg-7',
    title: 'تحديث منصة MetaTrader 5',
    content: 'تحسينات في سرعة تنفيذ الأوامر وعرض السجل التاريخي بدقة اليوم.',
    sender: 'MetaQuotes Support',
    time: 'قبل 3 أيام',
    read: false,
    type: 'news'
  }
];

function getTfSeconds(tf: Timeframe): number {
  const map: Record<Timeframe, number> = {
    M1: 60,
    M5: 300,
    M15: 900,
    M30: 1800,
    H1: 3600,
    H4: 14400,
    D1: 86400,
    W1: 604800,
    MN: 2592000
  };
  return map[tf] || 900;
}

function generateCandlesForSymbol(symbol: string, timeframe: Timeframe, targetBid: number): Candle[] {
  const count = 240;
  const tfSec = getTfSeconds(timeframe);
  const nowSec = Math.floor(Date.now() / 1000);
  const currentBucket = Math.floor(nowSec / tfSec) * tfSec;

  let seed = 0;
  const seedStr = `${symbol}-${timeframe}`;
  for (let i = 0; i < seedStr.length; i++) {
    seed = (seed * 31 + seedStr.charCodeAt(i)) % 100000;
  }
  const nextRand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const tfFactor = Math.sqrt(tfSec / 900);
  const baseVol = targetBid * 0.0042 * Math.min(Math.max(tfFactor, 0.35), 4.5);

  const raw: Candle[] = new Array(count);
  let cursorClose = targetBid;

  for (let i = count - 1; i >= 0; i--) {
    const time = (currentBucket - (count - 1 - i) * tfSec) * 1000;
    const wave = Math.sin(i * 0.14) * 0.28 + Math.cos(i * 0.055) * 0.22;
    const delta = (nextRand() - 0.495 + wave * 0.35) * baseVol;
    const close = cursorClose;
    const open = Math.max(0.0001, close - delta);
    const wickUp = nextRand() * baseVol * 0.75;
    const wickDown = nextRand() * baseVol * 0.75;
    const high = Math.max(open, close) + wickUp;
    const low = Math.max(0.0001, Math.min(open, close) - wickDown);
    const volume = Math.floor(60 + nextRand() * 340);

    raw[i] = { time, open, high, low, close, volume };
    cursorClose = open;
  }

  return raw;
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

function ensureHesabiEslam1Migration(): void {
  try {
    const savedAccsRaw = localStorage.getItem('mt5_v3_accounts');
    const savedDealsRaw = localStorage.getItem('mt5_v3_history_deals');

    if (!savedAccsRaw) {
      localStorage.setItem('mt5_eslam1_revert_v1', '1');
      localStorage.setItem('mt5_hesabi_eslam1_seed_v1', '1');
      localStorage.setItem('mt5_hesabi_eslam1_deals_v1', '1');
      return;
    }

    const parsedAccs = JSON.parse(savedAccsRaw);
    if (!Array.isArray(parsedAccs)) return;
    let savedAccs: Account[] = parsedAccs;

    let savedDeals: Deal[] = [];
    if (savedDealsRaw) {
      const parsedDeals = JSON.parse(savedDealsRaw);
      if (Array.isArray(parsedDeals)) savedDeals = parsedDeals;
    } else {
      savedDeals = createInitialHistory();
    }

    let changed = false;

    // 1. Revert accidental Nov 10-11 additions from eslam-1-real if previously applied
    if (!localStorage.getItem('mt5_eslam1_revert_v1')) {
      const accidentalIds = new Set([
        'eslam1-deal-4',
        'eslam1-deal-5',
        'eslam1-deal-6',
        'eslam1-deal-7',
        'eslam1-balance-deduct-11'
      ]);
      const hadAccidental = savedDeals.some((d) => accidentalIds.has(d.id));
      if (hadAccidental) {
        savedDeals = savedDeals.filter((d) => !accidentalIds.has(d.id));
        savedAccs = savedAccs.map((a) =>
          a.id === 'eslam-1-real'
            ? { ...a, balance: parseFloat((a.balance - 53.91).toFixed(2)) }
            : a
        );
        changed = true;
      }
      localStorage.setItem('mt5_eslam1_revert_v1', '1');
    }

    // 2. Attach requested deals + balance deduction to the account named "حسابي اسلام1"
    const existingHesabi = savedAccs.find((a) => isHesabiEslam1Name(a.name));
    if (existingHesabi) {
      if (!localStorage.getItem('mt5_hesabi_eslam1_deals_v1')) {
        const hesabiDeals = createHesabiEslam1Deals(existingHesabi.id);
        const existingIds = new Set(savedDeals.map((d) => d.id));
        const toAdd = hesabiDeals.filter((d) => !existingIds.has(d.id));
        if (toAdd.length > 0) {
          savedDeals = [...toAdd, ...savedDeals];
          const delta = parseFloat(toAdd.reduce((s, d) => s + d.profit, 0).toFixed(2));
          savedAccs = savedAccs.map((a) =>
            a.id === existingHesabi.id
              ? { ...a, balance: parseFloat((a.balance + delta).toFixed(2)) }
              : a
          );
          changed = true;
        }
        localStorage.setItem('mt5_hesabi_eslam1_deals_v1', '1');
      }
      localStorage.setItem('mt5_hesabi_eslam1_seed_v1', '1');
    } else if (!localStorage.getItem('mt5_hesabi_eslam1_seed_v1')) {
      savedAccs = [HESABI_ESLAM1_DEFAULT_ACCOUNT, ...savedAccs];
      savedDeals = [...createHesabiEslam1Deals(HESABI_ESLAM1_DEFAULT_ACCOUNT.id), ...savedDeals];
      localStorage.setItem('mt5_hesabi_eslam1_seed_v1', '1');
      localStorage.setItem('mt5_hesabi_eslam1_deals_v1', '1');
      changed = true;
    }

    if (changed) {
      localStorage.setItem('mt5_v3_accounts', JSON.stringify(savedAccs));
      localStorage.setItem('mt5_v3_history_deals', JSON.stringify(savedDeals));
    }
  } catch {}
}

export const TradingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [accounts, setAccounts] = useState<Account[]>(() => {
    ensureHesabiEslam1Migration();
    try {
      const saved = localStorage.getItem('mt5_v3_accounts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_ACCOUNTS;
  });

  const [activeAccount, setActiveAccountState] = useState<Account>(() => {
    try {
      const savedId = localStorage.getItem('mt5_v3_active_account_id');
      const savedAccs = localStorage.getItem('mt5_v3_accounts');
      if (savedId && savedAccs) {
        const parsed: Account[] = JSON.parse(savedAccs);
        const found = parsed.find((a) => a.id === savedId);
        if (found) return found;
      }
    } catch {}
    return INITIAL_ACCOUNTS[0];
  });

  const [quotes, setQuotes] = useState<SymbolQuote[]>(INITIAL_QUOTES);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTCUSDm');
  const [activeTab, setActiveTab] = useState<TabType>('chart');
  const [timeframe, setTimeframe] = useState<Timeframe>('M15');
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);

  const [positions, setPositions] = useState<Position[]>(() => {
    try {
      const saved = localStorage.getItem('mt5_v3_positions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return INITIAL_POSITIONS;
  });

  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>(() => {
    try {
      const saved = localStorage.getItem('mt5_v3_pending_orders');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const [historyDeals, setHistoryDeals] = useState<Deal[]>(() => {
    try {
      const saved = localStorage.getItem('mt5_v3_history_deals');
      if (saved) {
        const parsed: Deal[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return createInitialHistory();
  });

  const [messages, setMessages] = useState<MessageItem[]>(INITIAL_MESSAGES);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [orderModalSymbol, setOrderModalSymbol] = useState<string | null>(null);
  const [modifyingPosition, setModifyingPosition] = useState<Position | null>(null);
  const [modifyingFocus, setModifyingFocus] = useState<'sl' | 'tp' | null>(null);
  const [accountInfoModalOpen, setAccountInfoModalOpen] = useState<boolean>(false);
  const [otpModalOpen, setOtpModalOpen] = useState<boolean>(false);
  const [addAccountModalOpen, setAddAccountModalOpen] = useState<boolean>(false);

  const [candles, setCandles] = useState<Candle[]>(() => {
    const q = INITIAL_QUOTES.find((item) => item.symbol === 'BTCUSDm') || INITIAL_QUOTES[0];
    return generateCandlesForSymbol(q.symbol, 'M15', q.bid);
  });

  useEffect(() => {
    const q = quotes.find((item) => item.symbol === selectedSymbol) || quotes[0];
    setCandles(generateCandlesForSymbol(selectedSymbol, timeframe, q.bid));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSymbol, timeframe]);

  useEffect(() => {
    try {
      localStorage.setItem('mt5_v3_accounts', JSON.stringify(accounts));
      localStorage.setItem('mt5_v3_active_account_id', activeAccount.id);
      localStorage.setItem('mt5_v3_positions', JSON.stringify(positions));
      localStorage.setItem('mt5_v3_pending_orders', JSON.stringify(pendingOrders));
      localStorage.setItem('mt5_v3_history_deals', JSON.stringify(historyDeals));
    } catch {}
  }, [accounts, activeAccount.id, positions, pendingOrders, historyDeals]);

  useEffect(() => {
    let active = true;
    const fetchCommodities = async () => {
      try {
        const res = await fetch('/api/commodities');
        if (!res.ok || !active) return;
        const data = await res.json();
        if (data && typeof data === 'object') {
          setQuotes((prev) =>
            prev.map((q) => {
              const live = data[q.symbol];
              if (!live || typeof live.price !== 'number') return q;
              const spreadVal = q.spread * Math.pow(10, -q.digits);
              return {
                ...q,
                bid: parseFloat(live.price.toFixed(q.digits)),
                ask: parseFloat((live.price + spreadVal).toFixed(q.digits)),
                high: parseFloat((live.high || live.price).toFixed(q.digits)),
                low: parseFloat((live.low || live.price).toFixed(q.digits)),
                change: parseFloat((live.change || q.change).toFixed(2))
              };
            })
          );
          setIsLiveConnected(true);
        }
      } catch {}
    };
    fetchCommodities();
    const interval = setInterval(fetchCommodities, 20000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

      setQuotes((prevQuotes) =>
        prevQuotes.map((q) => {
          const stepMagnitude =
            q.symbol === 'BTCUSDm'
              ? 18
              : q.symbol === 'BTCJPYm'
              ? 2400
              : q.symbol === 'XAUUSDm'
              ? 0.45
              : q.symbol === 'US30m'
              ? 4.5
              : q.digits >= 4
              ? 0.00018
              : 0.025;

          const delta = (Math.random() - 0.49) * stepMagnitude;
          const newBid = parseFloat(Math.max(0.0001, q.bid + delta).toFixed(q.digits));
          const spreadVal = q.spread * Math.pow(10, -q.digits);
          const newAsk = parseFloat((newBid + spreadVal).toFixed(q.digits));

          return {
            ...q,
            bid: newBid,
            ask: newAsk,
            high: Math.max(q.high, newBid),
            low: Math.min(q.low, newBid),
            time: timeStr,
            tickDirection: delta >= 0 ? 'up' : 'down'
          };
        })
      );
    }, 1100);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const activeQ = quotes.find((q) => q.symbol === selectedSymbol);
    if (activeQ) {
      setCandles((prev) => {
        if (prev.length === 0) return prev;
        const last = { ...prev[prev.length - 1] };
        last.close = activeQ.bid;
        last.high = Math.max(last.high, activeQ.bid);
        last.low = Math.min(last.low, activeQ.bid);
        last.volume += 1;
        return [...prev.slice(0, prev.length - 1), last];
      });
    }

    setPositions((prevPos) =>
      prevPos.map((pos) => {
        const q = quotes.find((item) => item.symbol === pos.symbol);
        if (!q) return pos;
        const closeRefPrice = pos.type === 'buy' ? q.bid : q.ask;
        const diff = pos.type === 'buy' ? closeRefPrice - pos.openPrice : pos.openPrice - closeRefPrice;
        const profitMultiplier =
          pos.symbol.startsWith('XAU')
            ? 100
            : pos.symbol.startsWith('XAG')
            ? 5000
            : pos.symbol.startsWith('BTC') || pos.symbol.startsWith('ETH')
            ? 1
            : pos.symbol.startsWith('USDJPY')
            ? 650
            : pos.symbol.startsWith('USOIL')
            ? 1000
            : 100000;
        const profit = parseFloat((diff * pos.lots * profitMultiplier).toFixed(2));
        return {
          ...pos,
          currentPrice: closeRefPrice,
          profit
        };
      })
    );
  }, [quotes, selectedSymbol]);

  useEffect(() => {
    if (pendingOrders.length === 0) return;

    const triggered: { order: PendingOrder; q: SymbolQuote }[] = [];
    pendingOrders.forEach((order) => {
      const q = quotes.find((item) => item.symbol === order.symbol);
      if (!q) return;
      const hit =
        (order.type === 'buy_limit' && q.ask <= order.targetPrice) ||
        (order.type === 'sell_limit' && q.bid >= order.targetPrice) ||
        (order.type === 'buy_stop' && q.ask >= order.targetPrice) ||
        (order.type === 'sell_stop' && q.bid <= order.targetPrice);
      if (hit) {
        triggered.push({ order, q });
      }
    });

    if (triggered.length > 0) {
      const triggeredIds = new Set(triggered.map((t) => t.order.id));
      const now = new Date();
      const timeFormatted = `${formatDateYMD(now)} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      const newPositions: Position[] = triggered.map(({ order, q }) => {
        const side: 'buy' | 'sell' = order.type.startsWith('buy') ? 'buy' : 'sell';
        const execPrice = side === 'buy' ? q.ask : q.bid;
        return {
          id: `pos-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          ticket: order.ticket,
          symbol: order.symbol,
          type: side,
          lots: order.lots,
          openPrice: execPrice,
          currentPrice: side === 'buy' ? q.bid : q.ask,
          sl: order.sl,
          tp: order.tp,
          swap: 0,
          commission: 0,
          profit: 0,
          openTime: timeFormatted,
          accountId: order.accountId
        };
      });
      setPendingOrders((prev) => prev.filter((o) => !triggeredIds.has(o.id)));
      setPositions((prev) => [...newPositions, ...prev]);
    } else {
      setPendingOrders((prev) => {
        let changed = false;
        const next = prev.map((o) => {
          const q = quotes.find((item) => item.symbol === o.symbol);
          if (!q) return o;
          const refPrice = o.type.startsWith('buy') ? q.ask : q.bid;
          if (o.currentPrice === refPrice) return o;
          changed = true;
          return { ...o, currentPrice: refPrice };
        });
        return changed ? next : prev;
      });
    }
  }, [quotes, pendingOrders]);

  const activePositions = positions.filter((p) => p.accountId === activeAccount.id);
  const totalProfit = parseFloat(activePositions.reduce((s, p) => s + p.profit, 0).toFixed(2));
  const equity = parseFloat((activeAccount.balance + totalProfit).toFixed(2));

  const leverageNum = parseInt(activeAccount.leverage.split(':')[1] || '2000', 10) || 2000;
  const margin = parseFloat(
    activePositions
      .reduce((sum, p) => {
        const q = quotes.find((item) => item.symbol === p.symbol);
        const contract = q?.contractSize || 100;
        return sum + (p.openPrice * p.lots * contract) / leverageNum;
      }, 0)
      .toFixed(2)
  );
  const freeMargin = parseFloat((equity - margin).toFixed(2));
  const marginLevel = margin > 0 ? parseFloat(((equity / margin) * 100).toFixed(2)) : 0;

  const openTrade = useCallback(
    (symbol: string, type: 'buy' | 'sell', lots: number, sl?: number, tp?: number): boolean => {
      const q = quotes.find((item) => item.symbol === symbol);
      if (!q) return false;
      const now = new Date();
      const timeFormatted = `${formatDateYMD(now)} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      const openPrice = type === 'buy' ? q.ask : q.bid;
      const currentPrice = type === 'buy' ? q.bid : q.ask;
      const ticket = Math.floor(2520000000 + Math.random() * 500000000);

      const newPos: Position = {
        id: `pos-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        ticket,
        symbol,
        type,
        lots,
        openPrice,
        currentPrice,
        sl,
        tp,
        swap: 0,
        commission: 0,
        profit: -parseFloat(((q.ask - q.bid) * lots * (symbol.startsWith('XAU') ? 100 : 1)).toFixed(2)),
        openTime: timeFormatted,
        accountId: activeAccount.id
      };

      setPositions((prev) => [newPos, ...prev]);
      return true;
    },
    [quotes, activeAccount.id]
  );

  const placePendingOrder = useCallback(
    (
      symbol: string,
      type: PendingOrderType,
      lots: number,
      targetPrice: number,
      sl?: number,
      tp?: number
    ): boolean => {
      const q = quotes.find((item) => item.symbol === symbol);
      if (!q || !isFinite(targetPrice) || targetPrice <= 0) return false;
      const now = new Date();
      const timeFormatted = `${formatDateYMD(now)} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      const ticket = Math.floor(2520000000 + Math.random() * 500000000);
      const refPrice = type.startsWith('buy') ? q.ask : q.bid;

      const newOrder: PendingOrder = {
        id: `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        ticket,
        symbol,
        type,
        lots,
        targetPrice: parseFloat(targetPrice.toFixed(q.digits)),
        currentPrice: refPrice,
        sl: sl && sl > 0 ? parseFloat(sl.toFixed(q.digits)) : undefined,
        tp: tp && tp > 0 ? parseFloat(tp.toFixed(q.digits)) : undefined,
        createdAt: timeFormatted,
        accountId: activeAccount.id
      };

      setPendingOrders((prev) => [newOrder, ...prev]);
      return true;
    },
    [quotes, activeAccount.id]
  );

  const cancelPendingOrder = useCallback(
    (orderId: string) => {
      const target = pendingOrders.find((o) => o.id === orderId);
      if (!target) return;
      const now = new Date();
      const closeTimeFormatted = `${formatDateYMD(now)} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      const canceledDeal: Deal = {
        id: `deal-cancel-${Date.now()}`,
        ticket: target.ticket,
        orderTicket: target.ticket,
        symbol: target.symbol,
        type: target.type.startsWith('buy') ? 'buy' : 'sell',
        direction: 'in',
        lots: target.lots,
        openPrice: target.targetPrice,
        closePrice: target.currentPrice,
        sl: target.sl,
        tp: target.tp,
        swap: 0,
        commission: 0,
        profit: 0,
        openTime: target.createdAt,
        closeTime: closeTimeFormatted,
        status: 'CANCELED',
        accountId: target.accountId,
        comment: `Canceled ${target.type.replace('_', ' ')}`
      };

      setPendingOrders((prev) => prev.filter((o) => o.id !== orderId));
      setHistoryDeals((prev) => [canceledDeal, ...prev]);
    },
    [pendingOrders]
  );

  const modifyPendingOrder = useCallback((orderId: string, targetPrice: number, sl?: number, tp?: number) => {
    setPendingOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              targetPrice: targetPrice > 0 ? targetPrice : o.targetPrice,
              sl: sl && sl > 0 ? sl : undefined,
              tp: tp && tp > 0 ? tp : undefined
            }
          : o
      )
    );
  }, []);

  const closePosition = useCallback(
    (positionId: string) => {
      const target = positions.find((p) => p.id === positionId);
      if (!target) return;

      const now = new Date();
      const closeTimeFormatted = `${formatDateYMD(now)} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

      const closedDeal: Deal = {
        id: `deal-${Date.now()}`,
        ticket: target.ticket,
        orderTicket: target.ticket - 2,
        symbol: target.symbol,
        type: target.type,
        direction: 'out',
        lots: target.lots,
        openPrice: target.openPrice,
        closePrice: target.currentPrice,
        sl: target.sl,
        tp: target.tp,
        swap: target.swap,
        commission: target.commission,
        profit: target.profit,
        openTime: target.openTime,
        closeTime: closeTimeFormatted,
        status: 'FILLED',
        accountId: target.accountId,
        comment: 'Closed at market'
      };

      setPositions((prev) => prev.filter((p) => p.id !== positionId));
      setHistoryDeals((prev) => [closedDeal, ...prev]);

      setAccounts((prev) =>
        prev.map((a) =>
          a.id === target.accountId
            ? { ...a, balance: parseFloat((a.balance + target.profit).toFixed(2)) }
            : a
        )
      );
      if (activeAccount.id === target.accountId) {
        const newBalance = parseFloat((activeAccount.balance + target.profit).toFixed(2));
        setActiveAccountState((prev) => ({ ...prev, balance: newBalance }));
      }
    },
    [positions, activeAccount]
  );

  const closeAllPositions = useCallback(() => {
    const accountPos = positions.filter((p) => p.accountId === activeAccount.id);
    if (accountPos.length === 0) return;

    const now = new Date();
    const closeTimeFormatted = `${formatDateYMD(now)} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const newDeals: Deal[] = accountPos.map((target, idx) => ({
      id: `deal-${Date.now()}-${idx}`,
      ticket: target.ticket,
      orderTicket: target.ticket - 2,
      symbol: target.symbol,
      type: target.type,
      direction: 'out',
      lots: target.lots,
      openPrice: target.openPrice,
      closePrice: target.currentPrice,
      sl: target.sl,
      tp: target.tp,
      swap: target.swap,
      commission: target.commission,
      profit: target.profit,
      openTime: target.openTime,
      closeTime: closeTimeFormatted,
      status: 'FILLED',
      accountId: target.accountId,
      comment: 'Bulk closed'
    }));

    const totalClosedProfit = accountPos.reduce((s, p) => s + p.profit, 0);
    setPositions((prev) => prev.filter((p) => p.accountId !== activeAccount.id));
    setHistoryDeals((prev) => [...newDeals, ...prev]);

    const newBalance = parseFloat((activeAccount.balance + totalClosedProfit).toFixed(2));
    const updatedAcc = { ...activeAccount, balance: newBalance };
    setActiveAccountState(updatedAcc);
    setAccounts((prev) => prev.map((a) => (a.id === updatedAcc.id ? updatedAcc : a)));
  }, [positions, activeAccount]);

  const modifyPosition = useCallback((positionId: string, sl?: number, tp?: number) => {
    setPositions((prev) =>
      prev.map((p) =>
        p.id === positionId
          ? {
              ...p,
              sl: sl && sl > 0 ? sl : undefined,
              tp: tp && tp > 0 ? tp : undefined
            }
          : p
      )
    );
    setModifyingPosition((prev) =>
      prev && prev.id === positionId
        ? {
            ...prev,
            sl: sl && sl > 0 ? sl : undefined,
            tp: tp && tp > 0 ? tp : undefined
          }
        : prev
    );
  }, []);

  const markMessageAsRead = (id: string) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, read: true } : m)));
  };

  const unreadCount = messages.filter((m) => !m.read).length;

  const openOrderModal = (symbol?: string) => {
    setOrderModalSymbol(symbol || selectedSymbol);
  };

  const closeOrderModal = () => {
    setOrderModalSymbol(null);
  };

  const addNewAccount = (acc: Partial<Account>) => {
    const isExness = acc.broker?.toLowerCase().includes('exness') || acc.logoType === 'exness';
    const initialBalance = acc.balance !== undefined && !isNaN(acc.balance) ? Number(acc.balance) : 1000;
    const now = new Date();
    const timeFormatted = `${formatDateYMD(now)} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const newAcc: Account = {
      id: `acc-${Date.now()}`,
      name: acc.name || 'Standard',
      broker: acc.broker || (isExness ? 'Exness Technologies Ltd' : 'MetaQuotes Ltd.'),
      server: acc.server || (isExness ? 'Exness-MT5Real35' : 'MetaQuotes-Demo'),
      accountNumber: acc.accountNumber || String(Math.floor(200000000 + Math.random() * 99999999)),
      balance: initialBalance,
      currency: acc.currency || 'USD',
      type: acc.type || 'demo',
      leverage: acc.leverage || '1:2000',
      logoType: isExness ? 'exness' : 'metaquotes',
      lastKnownLabel: `آخر ما عرف، ${acc.currency || 'USD'}`
    };

    const depositDeal: Deal = {
      id: `deposit-${Date.now()}`,
      ticket: Math.floor(10000000 + Math.random() * 89999999),
      symbol: 'Balance',
      type: 'deposit',
      lots: 0,
      openPrice: 0,
      closePrice: 0,
      swap: 0,
      commission: 0,
      profit: initialBalance,
      openTime: timeFormatted,
      closeTime: timeFormatted,
      status: 'FILLED',
      accountId: newAcc.id,
      comment: 'رصيد الحساب'
    };

    setAccounts((prev) => [newAcc, ...prev]);
    setActiveAccountState(newAcc);
    setHistoryDeals((prev) => [depositDeal, ...prev]);
    setAddAccountModalOpen(false);
  };

  const deleteAccount = (accountId: string) => {
    setAccounts((prev) => {
      const remaining = prev.filter((a) => a.id !== accountId);
      if (remaining.length === 0) {
        setActiveAccountState(INITIAL_ACCOUNTS[0]);
        return INITIAL_ACCOUNTS;
      }
      if (activeAccount.id === accountId) {
        setActiveAccountState(remaining[0]);
      }
      return remaining;
    });
    setPositions((prev) => prev.filter((p) => p.accountId !== accountId));
    setPendingOrders((prev) => prev.filter((o) => o.accountId !== accountId));
    setHistoryDeals((prev) => prev.filter((d) => d.accountId !== accountId));
  };

  const setActiveAccount = (account: Account) => {
    setActiveAccountState(account);
  };

  return (
    <TradingContext.Provider
      value={{
        activeAccount,
        accounts,
        setActiveAccount,
        quotes,
        selectedSymbol,
        setSelectedSymbol,
        activeTab,
        setActiveTab,
        timeframe,
        setTimeframe,
        candles,
        positions,
        pendingOrders,
        historyDeals,
        openTrade,
        placePendingOrder,
        cancelPendingOrder,
        modifyPendingOrder,
        closePosition,
        closeAllPositions,
        modifyPosition,
        messages,
        markMessageAsRead,
        unreadCount,
        totalProfit,
        equity,
        margin,
        freeMargin,
        marginLevel,
        isDrawerOpen,
        setIsDrawerOpen,
        openOrderModal,
        orderModalSymbol,
        closeOrderModal,
        modifyingPosition,
        setModifyingPosition,
        modifyingFocus,
        setModifyingFocus,
        accountInfoModalOpen,
        setAccountInfoModalOpen,
        otpModalOpen,
        setOtpModalOpen,
        addAccountModalOpen,
        setAddAccountModalOpen,
        addNewAccount,
        deleteAccount,
        isLiveConnected
      }}
    >
      {children}
    </TradingContext.Provider>
  );
};

export const useTrading = () => {
  const ctx = useContext(TradingContext);
  if (!ctx) throw new Error('useTrading must be used inside TradingProvider');
  return ctx;
};
