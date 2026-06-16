// @ts-nocheck
'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis, Cell, LabelList, Line, Legend, Area, ComposedChart,
  PieChart, Pie
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Loader2, Globe, MapPin, Sparkles, TrendingUp, Target, Layers, Trophy, Settings2, ShieldAlert, Rocket, Leaf, MessageSquare, FileText, Search } from 'lucide-react';

const GAS_API_URL = "/api/compare";

const SITE_AREA_MAP: { [key: string]: 'kanto' | 'kansai' | 'chubu' | 'cleanness' } = {
  "昭和冷蔵": "kanto", "asf南関東": "kanto", "AFS南関東": "kanto", "afs南関東": "kanto", "クラフトデリカ": "kanto", "ランドポート習志野": "kanto", "東急ストア": "kanto",
  "三井食品": "chubu", "afs尾西": "chubu", "AFS尾西": "chubu", "ヤマナカ": "chubu",
  "尾家産業": "kansai", "メディエントランス": "kansai", "カインズ神戸": "kansai", "カインズ福岡": "kansai",
  "尾西清盛": "cleanness", "尾西清鎖": "cleanness", "尾西清掃": "cleanness", "兵庫清掃": "cleanness", "姫路清掃": "cleanness", "万代彩都": "cleanness", "万代綾都": "cleanness",
  "himeji-afs-seiso": "cleanness", "hyogo-seiso": "cleanness", "binisai-seiso": "cleanness"
};

const LOCATION_NAME_MAP: { [key: string]: string } = {
  "afs-bisai": "afs尾西",
  "afs-minamikanto": "afs南関東",
  "cainz-kobe": "カインズ神戸",
  "cainz-fukuoka": "カインズ福岡",
  "medi-entrance": "メディエントランス",
  "mitsui-chubu": "三井食品",
  "oie-hannan": "尾家産業",
  "showa-reizo": "昭和冷蔵",
  "tokyu-store": "東急ストア",
  "yamanaka-shionagi": "ヤマナカ",
  "craft-delica": "クラフトデリカ",
  "landport-narashino": "ランドポート習志野",
  "mandai-saito": "万代彩都",
  "himeji-afs-seiso": "姫路清掃",
  "hyogo-seiso": "兵庫清掃",
  "binisai-seiso": "尾西清掃"
};

const getAreaForSite = (actualSiteName: string) => {
  if (!actualSiteName) return 'unknown';
  const matchedKey = Object.keys(SITE_AREA_MAP).find(key => actualSiteName.includes(key));
  return matchedKey ? SITE_AREA_MAP[matchedKey] : 'unknown';
};

interface LogisticsData {
  "現場名": string;
  "日付": string; 
  [key: string]: any;
}

const AnimatedNumber = ({ value }: { value: string | number }) => {
  const safeValue = Number.isNaN(value) ? 0 : value;
  return (
    <motion.span
      key={String(safeValue)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="inline-block"
    >
      {safeValue}
    </motion.span>
  );
};

const DualRingChart = ({ 
  siteName, annualBudget, plannedSales, achievedSales 
}: { 
  siteName: string; annualBudget: number; plannedSales: number; achievedSales: number; 
}) => {
  const actualRatio = annualBudget > 0 ? (achievedSales / annualBudget) * 100 : 0;
  const planRatio = annualBudget > 0 ? (plannedSales / annualBudget) * 100 : 0;
  
  const radiusOuter = 58;
  const radiusInner = 44;
  const circOuter = 2 * Math.PI * radiusOuter;
  const circInner = 2 * Math.PI * radiusInner;
  
  const offsetOuter = circOuter - (Math.min(actualRatio, 100) / 100) * circOuter;
  const offsetInner = circInner - (Math.min(planRatio, 100) / 100) * circInner;

  const diff = achievedSales - plannedSales;
  const formatM = (val: number) => Math.round(val / 10000).toLocaleString() + '万';

  return (
    <div className="flex flex-col items-center p-4 w-[280px] bg-slate-50/50 rounded-2xl border border-slate-100 shadow-sm shrink-0">
      <div className="text-center w-full mb-2 border-b border-slate-100 pb-1.5">
        <h4 className="font-extrabold text-[#1e254c] text-xs truncate px-1" title={siteName}>{siteName}</h4>
      </div>
      
      <div className="relative w-[140px] h-[140px] flex items-center justify-center">
        <svg width="140" height="140" className="transform -rotate-90">
          <circle cx="70" cy="70" r={radiusOuter} stroke="#e2e8f0" strokeWidth="8" fill="none" />
          <circle cx="70" cy="70" r={radiusOuter} stroke="#00a6c0" strokeWidth="8" fill="none"
                  strokeDasharray={circOuter} strokeDashoffset={offsetOuter} strokeLinecap="round" className="transition-all duration-1000" />
          
          <circle cx="70" cy="70" r={radiusInner} stroke="#e2e8f0" strokeWidth="8" fill="none" />
          <circle cx="70" cy="70" r={radiusInner} stroke="#1e254c" strokeWidth="8" fill="none"
                  strokeDasharray={circInner} strokeDashoffset={offsetInner} strokeLinecap="round" className="transition-all duration-1000" />
        </svg>
        
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-[14px] font-black text-[#1e254c] tracking-tight">{formatM(achievedSales)}</span>
          <span className={`text-[11px] font-bold mt-0.5 ${diff >= 0 ? 'text-[#00a6c0]' : 'text-[#e6005c]'}`}>
            {diff >= 0 ? '+' : ''}{formatM(diff)}
          </span>
        </div>

        <div className="absolute top-0 left-0 text-[9px] font-bold text-[#00a6c0] bg-white/80 px-1 rounded">実績 {actualRatio.toFixed(0)}%</div>
        <div className="absolute bottom-0 left-0 text-[9px] font-bold text-[#1e254c] bg-white/80 px-1 rounded">予定 {planRatio.toFixed(0)}%</div>
        <div className="absolute top-0 right-0 text-[9px] font-bold text-slate-400 bg-white/80 px-1 rounded">予算:{formatM(annualBudget)}</div>
      </div>
    </div>
  );
};

export default function CompareDashboardPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [rawData, setRawData] = useState<LogisticsData[]>([]);
  const [months, setMonths] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedArea, setSelectedArea] = useState<'all' | 'kanto' | 'kansai' | 'chubu' | 'cleanness' | 'actions'>('all');

  const [rankingTarget, setRankingTarget] = useState<string>('実績_売上高');
  const [scatterX, setScatterX] = useState<string>('実績_売上高');
  const [scatterY, setScatterY] = useState<string>('実績_純売上高');

  // アクションタブ専用ステート
  const [activeTopTab, setActiveTopTab] = useState<'dashboard' | 'actions'>('dashboard');
  const [actionCategory, setActionCategory] = useState<'dx' | 'env' | 'history'>('dx');
  const [actionMonthFilter, setActionMonthFilter] = useState<string>('all');
  const [actionLocationFilter, setActionLocationFilter] = useState<string>('all');
  const [actionSearchQuery, setActionSearchQuery] = useState<string>('');
  const [allActions, setAllActions] = useState<any[]>([]);

  // 🌟 追加: チェックボックス（レ点フィルター）用ステート
  const [filterDxCustomer, setFilterDxCustomer] = useState<boolean>(true);
  const [filterDxInternal, setFilterDxInternal] = useState<boolean>(true);
  const [filterHistSuccess, setFilterHistSuccess] = useState<boolean>(true);
  const [filterHistPending, setFilterHistPending] = useState<boolean>(true);
  const [filterHistLost, setFilterHistLost] = useState<boolean>(true);

  // UTC日付バグ迎撃用フォーマット関数
  const formatMonth = (dateStr: string) => {
    if (!dateStr) return "";
    const cleanStr = String(dateStr).trim().replace(/度/g, '');
    if (cleanStr.includes('T') || cleanStr.includes('-')) {
      const d = new Date(cleanStr);
      if (!isNaN(d.getTime())) return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
    const parts = cleanStr.replace(/-/g, '/').split('/');
    if (parts.length >= 2) return `${parts[0]}/${parts[1].padStart(2, '0')}`;
    return cleanStr;
  };

  useEffect(() => {
    setIsMounted(true);
    const fetchData = async () => {
      try {
        const res = await fetch(GAS_API_URL);
        const data = await res.json();
        if (!Array.isArray(data)) { setLoading(false); return; }
        
        const formattedData = data.map((item: any) => {
          const rawDateKey = item["日付"] || item["年月"] || "";
          return { ...item, "日付": formatMonth(rawDateKey) };
        });

        setRawData(formattedData);
        
        const uniqueMonths = Array.from(new Set(formattedData.map((item: any) => item["日付"])))
          .filter(Boolean).sort().reverse() as string[];
        
        setMonths(uniqueMonths);
        
        const now = new Date();
        const thisMonthStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
        
        if (uniqueMonths.includes(thisMonthStr)) setSelectedMonth(thisMonthStr);
        else if (uniqueMonths.length > 0) setSelectedMonth(uniqueMonths[0]);

      } catch (error) {
        console.error("Fetch error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // 全拠点アクションデータ（清掃拠点除外）の取得
  useEffect(() => {
    const fetchAllActions = async () => {
      try {
        const fetchTable = async (table: string) => {
          const res = await fetch('/api/supabase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ table, actionMethod: 'GET', query: '?order=id.desc' })
          });
          return res.ok ? await res.json() : [];
        };
        const [dx, env, history] = await Promise.all([fetchTable('dx_actions'), fetchTable('env_actions'), fetchTable('sales_history')]);
        
        const combined = [
          ...dx.map((d: any) => ({ ...d, actionType: 'DX推進', dateStr: d.start_date })),
          ...env.map((e: any) => ({ ...e, actionType: '現場改善', dateStr: e.start_date })),
          ...history.map((h: any) => ({ ...h, actionType: '営業履歴', dateStr: h.date }))
        ].filter(a => {
          const siteName = LOCATION_NAME_MAP[a.location_id] || a.location_id;
          return getAreaForSite(siteName) !== 'cleanness'; // 清掃拠点を除外
        }).sort((a, b) => (b.dateStr || '').localeCompare(a.dateStr || ''));
        
        setAllActions(combined);
      } catch (err) { 
        console.error("Actions fetch error:", err); 
      }
    };
    fetchAllActions();
  }, []);

  const numericKeys = useMemo(() => {
    if (rawData.length === 0) return [];
    const firstItem = rawData.find(item => Object.keys(item).length > 5) || rawData[0];
    return Object.keys(firstItem).filter(key => typeof firstItem[key] === 'number' && key !== '日付' && key !== '現場名');
  }, [rawData]);

  const actualNumericKeys = useMemo(() => {
    return numericKeys.filter(key => key.includes('実績'));
  }, [numericKeys]);

  const monthFilteredData = rawData.filter(item => item["日付"] === selectedMonth);
  const filteredData = monthFilteredData.filter(item => {
    if (selectedArea === 'all') return true;
    if (selectedArea === 'actions') return false; 
    return getAreaForSite(item["現場名"]) === selectedArea;
  });

  const term27Months = [
    "2026/04", "2026/05", "2026/06", "2026/07", "2026/08", "2026/09",
    "2026/10", "2026/11", "2026/12", "2027/01", "2027/02", "2027/03"
  ];

  const term27Data = rawData.filter(item => {
    if (selectedArea !== 'all' && selectedArea !== 'actions' && getAreaForSite(item["現場名"]) !== selectedArea) return false;
    return term27Months.includes(item["日付"]);
  });

  const parseTarget = (val: any) => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    return Number(String(val).replace(/,/g, '')) || 0;
  };

  const siteProgressData = Array.from(new Set(filteredData.map(item => item["現場名"]))).map(siteName => {
    const siteDataList = rawData.filter(d => d["現場名"] === siteName);
    const targetBudget = Math.max(...siteDataList.map(d => parseTarget(d["27期予算"]) || parseTarget(d["予算_売上高"])));
    const siteAchievedData = siteDataList.filter(d => term27Months.includes(d["日付"]) && d["日付"] <= selectedMonth);
    const achievedSales = siteAchievedData.reduce((sum, d) => sum + (Number(d["実績_売上高"]) || Number(d["確定売上"]) || 0), 0);
    const plannedSales = (targetBudget / 12) * siteAchievedData.length;
    const progress = targetBudget > 0 ? (achievedSales / targetBudget) * 100 : 0;
    return { name: siteName, progress, annualBudget: targetBudget, plannedSales, achievedSales };
  }).sort((a, b) => b.progress - a.progress);

  const totalAnnualBudgetK2 = siteProgressData.reduce((sum, site) => sum + site.annualBudget, 0);

  let accBudget = 0;
  let accActual = 0;
  const cumulativeTrendData = term27Months.map(m => {
    const mData = term27Data.filter(d => d["日付"] === m);
    const mActual = mData.reduce((sum, d) => sum + (Number(d["実績_売上高"]) || Number(d["確定売上"]) || 0), 0);
    const mTarget = mData.reduce((sum, d) => sum + (parseTarget(d["27期予算"]) / 12 || parseTarget(d["予算_売上高"]) / 12 || 0), 0); 
    accBudget += mTarget;
    let displayActual = null;
    if (m <= selectedMonth) {
      accActual += mActual;
      displayActual = accActual;
    }
    return { name: `${m.split('/')[1]}月`, "予算ペース (毎月累計)": accBudget, "27期 通期予算": totalAnnualBudgetK2, "累計実績売上": displayActual };
  });

  const annualProgressRate = totalAnnualBudgetK2 > 0 ? ((accActual / totalAnnualBudgetK2) * 100).toFixed(1) : "0.0";

  const totalSales = filteredData.reduce((sum, item) => sum + (Number(item["実績_売上高"]) || Number(item["確定売上"]) || 0), 0);
  const totalBudgetSales = filteredData.reduce((sum, item) => sum + (parseTarget(item["予算_売上高"]) || parseTarget(item["27期予算"])/12 || 0), 0);
  const totalProfit = filteredData.reduce((sum, item) => sum + (Number(item["実績_当期純利益"]) || Number(item["実績_純売上高"]) || Number(item["実績_利益"]) || 0), 0);
  
  const achievementRate = totalBudgetSales > 0 ? Math.round((totalSales / totalBudgetSales) * 100) : 0;
  const avgProfitMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

  const sortedRankingData = [...filteredData]
    .sort((a, b) => (Number(b[rankingTarget]) || 0) - (Number(a[rankingTarget]) || 0))
    .slice(0, 15);

  const maxBarValue = Math.max(...sortedRankingData.map(d => Number(d[rankingTarget]) || 0), 1);

  const barChartData = sortedRankingData.map(item => {
    const value = Number(item[rankingTarget]) || 0;
    const labelStr = Math.abs(value) >= 10000 ? `${(value / 10000).toFixed(1)}万` : value.toLocaleString();
    return { name: item["現場名"], value: value, maxValue: maxBarValue, label: labelStr };
  });

  const maxX = Math.max(...filteredData.map(d => Number(d[scatterX]) || 0), 1);
  const maxY = Math.max(...filteredData.map(d => Number(d[scatterY]) || 0), 1);

  const dynamicScatterData = filteredData.map(item => {
    const xVal = Number(item[scatterX]) || 0;
    const yVal = Number(item[scatterY]) || 0;
    const ratioX = Math.max(xVal, 0) / maxX;
    const ratioY = Math.max(yVal, 0) / maxY;
    let zVal = ratioX + ratioY;
    if (zVal <= 0.1) zVal = 0.1;
    return { name: item["現場名"], x: xVal, y: yVal, z: zVal };
  });

  const stackChartData = useMemo(() => {
    return filteredData.map(item => {
      const sales = Number(item["実績_売上高"]) || Number(item["確定売上"]) || 0;
      const profit = Number(item["実績_当期純利益"]) || Number(item["実績_純売上高"]) || Number(item["実績_利益"]) || 0;
      const cost = Math.max(sales - profit, 0);
      const profitPercent = sales > 0 ? (profit / sales) * 100 : 0;
      const costPercent = sales > 0 ? (cost / sales) * 100 : 0;
      
      const r1 = Number(item["実績_商品誤配費"]) || 0;
      const r2 = Number(item["実績_商品破損費"]) || 0;
      const r3 = Number(item["実績_労働災害費"]) || 0;
      
      return {
        name: item["現場名"], 
        "売上高": sales, 
        "純利益": profit, 
        "原価構成": cost, 
        "利益比率(%)": profitPercent, 
        "原価比率(%)": costPercent, 
        "商品誤配費": r1, 
        "商品破損費": r2, 
        "労働災害費": r3
      };
    }).sort((a, b) => b["売上高"] - a["売上高"]);
  }, [filteredData]);

  const sideBySideChartData = useMemo(() => {
    return filteredData.map(item => {
      const basePay = Number(item["実績_給与手当（原）"]) || 0;
      const shaho = Number(item["実績_社会保険"]) || 0;
      const yukyu = Number(item["実績_有給"]) || 0;
      const travelActual = Number(item["実績_旅費交通費（原）"]) || 0;
      const laborCostActual = Number(item["実績_労務費"]) || 0;
      const grossProfit = Number(item["実績_当期純利益"]) || Number(item["実績_純売上高"]) || Number(item["実績_利益"]) || 0;

      const totalLaborCost = basePay + shaho + yukyu + travelActual;

      return {
        name: item["現場名"],
        "ベース給与": basePay,
        "社会保険": shaho,
        "有給コスト": yukyu,
        "旅費交通費": travelActual,
        "実績_労務費": laborCostActual,
        "総人件費": totalLaborCost,
        "生み出した利益": grossProfit
      };
    }).sort((a, b) => b["ベース給与"] - a["ベース給与"]).slice(0, 15);
  }, [filteredData]);

  // アクション一覧用のフィルターデータ
  const availableActionMonths = useMemo(() => {
    const months = allActions.map(a => {
      if (!a.dateStr) return '';
      const parts = a.dateStr.split('/');
      return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : '';
    }).filter(Boolean);
    return Array.from(new Set(months)).sort().reverse();
  }, [allActions]);

  const availableActionLocations = useMemo(() => {
    const locs = allActions.map(a => a.location_id).filter(Boolean);
    return Array.from(new Set(locs));
  }, [allActions]);

  // 🌟 検索フィルター＋レ点チェック込みのアクション一覧生成ロジック
  const filteredActionsForView = useMemo(() => {
    return allActions.filter(a => {
      const matchType = actionCategory === 'dx' ? a.actionType === 'DX推進' : actionCategory === 'env' ? a.actionType === '現場改善' : a.actionType === '営業履歴';
      const matchMonth = actionMonthFilter === 'all' || (a.dateStr && a.dateStr.startsWith(actionMonthFilter));
      const matchLoc = actionLocationFilter === 'all' || a.location_id === actionLocationFilter;
      
      const searchLower = actionSearchQuery.toLowerCase();
      const matchSearch = actionSearchQuery === '' || 
        (a.name || '').toLowerCase().includes(searchLower) ||
        (a.client || '').toLowerCase().includes(searchLower) ||
        (a.effect || '').toLowerCase().includes(searchLower) ||
        (a.proposal || '').toLowerCase().includes(searchLower) ||
        (a.detail || '').toLowerCase().includes(searchLower) ||
        (LOCATION_NAME_MAP[a.location_id] || a.location_id).toLowerCase().includes(searchLower);

      // 🌟 レ点チェックの条件判定
      let matchStatus = false;
      if (actionCategory === 'dx' || actionCategory === 'env') {
        const isCustomer = a.customer_related === 'あり';
        matchStatus = (isCustomer && filterDxCustomer) || (!isCustomer && filterDxInternal);
      } else {
        const res = a.result;
        if (res === '●' || res === '〇') matchStatus = filterHistSuccess;
        else if (res === '×') matchStatus = filterHistLost;
        else matchStatus = filterHistPending; // △ やその他はすべて保留/継続チェックに連動
      }

      return matchType && matchMonth && matchLoc && matchSearch && matchStatus;
    });
  }, [allActions, actionCategory, actionMonthFilter, actionLocationFilter, actionSearchQuery, filterDxCustomer, filterDxInternal, filterHistSuccess, filterHistPending, filterHistLost]);

  // 🌟 レ点チェック込みのアクション件数を集計するロジック（ランキンググラフ用）
  const actionCountByLocation = useMemo(() => {
    const baseActions = allActions.filter(a => {
      const matchType = actionCategory === 'dx' ? a.actionType === 'DX推進' : actionCategory === 'env' ? a.actionType === '現場改善' : a.actionType === '営業履歴';
      const matchMonth = actionMonthFilter === 'all' || (a.dateStr && a.dateStr.startsWith(actionMonthFilter));
      
      const searchLower = actionSearchQuery.toLowerCase();
      const matchSearch = actionSearchQuery === '' || 
        (a.name || '').toLowerCase().includes(searchLower) ||
        (a.client || '').toLowerCase().includes(searchLower) ||
        (a.effect || '').toLowerCase().includes(searchLower) ||
        (a.proposal || '').toLowerCase().includes(searchLower) ||
        (a.detail || '').toLowerCase().includes(searchLower) ||
        (LOCATION_NAME_MAP[a.location_id] || a.location_id).toLowerCase().includes(searchLower);

      // 🌟 レ点チェックの条件判定
      let matchStatus = false;
      if (actionCategory === 'dx' || actionCategory === 'env') {
        const isCustomer = a.customer_related === 'あり';
        matchStatus = (isCustomer && filterDxCustomer) || (!isCustomer && filterDxInternal);
      } else {
        const res = a.result;
        if (res === '●' || res === '〇') matchStatus = filterHistSuccess;
        else if (res === '×') matchStatus = filterHistLost;
        else matchStatus = filterHistPending;
      }

      return matchType && matchMonth && matchSearch && matchStatus; // locationFilterはランキング全体比較のため除外
    });

    const counts: { [key: string]: number } = {};
    baseActions.forEach(a => {
      const locName = LOCATION_NAME_MAP[a.location_id] || a.location_id;
      counts[locName] = (counts[locName] || 0) + 1;
    });

    const sorted = Object.entries(counts)
      .map(([name, count]) => ({ name, value: count }))
      .sort((a, b) => b.value - a.value);

    const maxVal = sorted.length > 0 ? Math.max(...sorted.map(d => d.value)) : 1;
    const adjustedMax = Math.ceil(maxVal * 1.15); 
    return sorted.map(d => ({ ...d, maxValue: adjustedMax }));
  }, [allActions, actionCategory, actionMonthFilter, actionSearchQuery, filterDxCustomer, filterDxInternal, filterHistSuccess, filterHistPending, filterHistLost]);

  const maxActionBarValue = actionCountByLocation.length > 0 ? actionCountByLocation[0].maxValue : 1;

  const modernTooltipStyle = {
    backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)', border: 'none', borderRadius: '12px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', fontWeight: 'bold', color: '#1e293b', padding: '12px'
  };

  const areaDisplayName = selectedArea === 'all' ? '全社' : selectedArea === 'kanto' ? '関東エリア' : selectedArea === 'kansai' ? '関西エリア' : selectedArea === 'chubu' ? '中部エリア' : selectedArea === 'cleanness' ? 'クリンネス部門' : '全拠点アクション';

  if (loading || !isMounted) {
    return (
      <div className="h-screen w-full bg-slate-900 flex flex-col items-center justify-center relative overflow-hidden notranslate" translate="no">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/20 rounded-full blur-[120px] pointer-events-none animate-pulse" />
        <div className="relative z-10 flex flex-col items-center">
          <div className="bg-white px-6 py-3.5 rounded-2xl mb-8 shadow-lg border border-slate-700/50">
            <img src="/pal-logo.png" alt="PAL Logo" className="h-8 md:h-10 w-auto object-contain" />
          </div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-[0.2em] mb-8 text-white text-center px-4 drop-shadow-md">
            <span className="text-blue-400">PAL</span> HQ Strategic Board
          </h1>
          <div className="w-64 h-1.5 bg-slate-800 rounded-full overflow-hidden mb-6 shadow-inner relative border border-slate-700">
            <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-indigo-400 rounded-full w-1/2" style={{ animation: 'loading-slide 2s ease-in-out infinite' }} />
          </div>
          <div className="flex items-center gap-3 text-slate-400">
            <Loader2 className="animate-spin text-blue-400" size={18} />
            <span className="text-[11px] font-bold tracking-widest uppercase">Connecting to HQ Database...</span>
          </div>
        </div>
        <style dangerouslySetInnerHTML={{__html: `@keyframes loading-slide { 0% { transform: translateX(-100%); width: 50%; } 100% { transform: translateX(250%); width: 50%; } }`}} />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#f4f6f8] text-slate-800 font-sans overflow-hidden notranslate" translate="no">
      
      <svg width="0" height="0">
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#f87171" stopOpacity={1}/><stop offset="100%" stopColor="#ec4899" stopOpacity={1}/>
          </linearGradient>
          <radialGradient id="bubbleGrad" cx="30%" cy="30%" r="70%"><stop offset="0%" stopColor="#38bdf8" stopOpacity={0.8}/><stop offset="100%" stopColor="#0284c7" stopOpacity={0.4}/></radialGradient>
        </defs>
      </svg>

      <aside className="w-16 md:w-20 bg-white border-r border-slate-200 flex flex-col items-center py-4 space-y-3 shrink-0 z-10 shadow-sm overflow-y-auto">
        <a href="https://palproductivity-dashboard.vercel.app/" className="p-2 text-slate-400 hover:text-blue-600 transition-colors mb-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 0 001 1m-6 0h6"/></svg>
        </a>
        <div className="w-full border-t border-slate-100 my-1"></div>
        
        {['all', 'kanto', 'chubu', 'kansai', 'cleanness', 'actions'].map((area) => (
          <button 
            key={area} onClick={() => { setSelectedArea(area as any); setActiveTopTab(area === 'actions' ? 'actions' : 'dashboard'); }} 
            className={`w-12 h-12 md:w-14 md:h-14 rounded-xl flex flex-col items-center justify-center gap-0.5 md:gap-1 transition-all text-[9px] md:text-[10px] font-black shrink-0 ${selectedArea === area ? (area === 'actions' ? 'bg-purple-600 text-white shadow-md' : 'bg-blue-600 text-white shadow-md') : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700'}`}
          >
            {area === 'all' ? <Globe size={15} /> : area === 'cleanness' ? <Sparkles size={15} /> : area === 'actions' ? <Rocket size={15} /> : <MapPin size={15} />}
            <span>{area === 'all' ? '全社' : area === 'kanto' ? '関東' : area === 'chubu' ? '中部' : area === 'kansai' ? '関西' : area === 'cleanness' ? 'ｸﾘﾝﾈｽ' : 'ｱｸｼｮﾝ'}</span>
          </button>
        ))}
      </aside>

      {/* 画面の切り替え： アクション画面 or 既存のKPI画面 */}
      {activeTopTab === 'actions' ? (
        <main className="flex-1 flex flex-col h-full overflow-hidden w-full relative">
          <header className="px-4 md:px-6 py-4 flex flex-col md:flex-row md:items-center justify-between shrink-0 bg-white border-b border-slate-200 z-30 gap-4">
            <div className="flex items-center gap-2 md:gap-3">
              <Rocket className="w-6 h-6 md:w-8 md:h-8 text-purple-600" />
              <h1 className="text-lg md:text-2xl font-extrabold text-slate-800 tracking-tight">全拠点アクション横断ビュー</h1>
            </div>

            <div className="relative w-full md:w-72">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="施策名、拠点、内容で検索..." 
                value={actionSearchQuery} 
                onChange={(e) => setActionSearchQuery(e.target.value)} 
                className="w-full bg-slate-50 border border-slate-200 text-sm font-bold text-slate-700 pl-9 pr-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm transition-all" 
              />
            </div>
          </header>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 w-full space-y-6 relative">
            <div className="flex flex-col bg-white p-4 rounded-xl border border-slate-200 shadow-sm gap-4">
              <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1 shadow-sm w-full xl:w-auto">
                  <button onClick={() => setActionCategory('dx')} className={`flex-1 xl:flex-none px-6 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${actionCategory === 'dx' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}><Rocket size={14} /> DX推進</button>
                  <button onClick={() => setActionCategory('env')} className={`flex-1 xl:flex-none px-6 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${actionCategory === 'env' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}><Leaf size={14} /> 現場改善</button>
                  <button onClick={() => setActionCategory('history')} className={`flex-1 xl:flex-none px-6 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${actionCategory === 'history' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}><MessageSquare size={14} /> 営業履歴</button>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400">拠点:</span>
                    <select value={actionLocationFilter} onChange={(e) => setActionLocationFilter(e.target.value)} className="bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold outline-none cursor-pointer">
                      <option value="all">すべての拠点</option>
                      {availableActionLocations.map(loc => <option key={loc} value={loc}>{LOCATION_NAME_MAP[loc] || loc}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400">月度:</span>
                    <select value={actionMonthFilter} onChange={(e) => setActionMonthFilter(e.target.value)} className="bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold outline-none cursor-pointer">
                      <option value="all">すべての月</option>
                      {availableActionMonths.map(m => <option key={m} value={m}>{m} アクション</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* 🌟 追加：チェックボックス（レ点フィルター）エリア */}
              <div className="w-full flex items-center flex-wrap gap-4 pt-3 mt-1 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-400">表示絞り込み:</span>
                {actionCategory === 'history' ? (
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-700">
                      <input type="checkbox" checked={filterHistSuccess} onChange={e => setFilterHistSuccess(e.target.checked)} className="accent-emerald-500 w-3.5 h-3.5" />
                      🟢 成功/前進
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-700">
                      <input type="checkbox" checked={filterHistPending} onChange={e => setFilterHistPending(e.target.checked)} className="accent-amber-500 w-3.5 h-3.5" />
                      ⚠️ 保留/継続
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-700">
                      <input type="checkbox" checked={filterHistLost} onChange={e => setFilterHistLost(e.target.checked)} className="accent-rose-500 w-3.5 h-3.5" />
                      ❌ 失注/中止
                    </label>
                  </div>
                ) : (
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-700">
                      <input type="checkbox" checked={filterDxCustomer} onChange={e => setFilterDxCustomer(e.target.checked)} className="accent-rose-500 w-3.5 h-3.5" />
                      🚨 顧客関連
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-700">
                      <input type="checkbox" checked={filterDxInternal} onChange={e => setFilterDxInternal(e.target.checked)} className="accent-slate-500 w-3.5 h-3.5" />
                      🏢 社内施策
                    </label>
                  </div>
                )}
              </div>

            </div>

            {/* アクションリストとグラフの左右分割レイアウト */}
            <div className="flex flex-col lg:flex-row gap-6 items-start relative">
              
              {/* 左半分：アクションリスト（洗練されたカード群） */}
              <div className="w-full lg:w-[55%] xl:w-[60%] order-2 lg:order-1">
                {(() => {
                  if (filteredActionsForView.length === 0) {
                    return <div className="bg-white border border-slate-200 p-12 rounded-3xl text-center text-slate-400 font-bold text-sm shadow-sm">💡 条件に一致するアクションデータがありません。</div>;
                  }

                  if (actionCategory === 'dx' || actionCategory === 'env') {
                    const themeColor = actionCategory === 'dx' ? '#9333ea' : '#10b981'; // より鮮やかな紫と緑
                    const bgLightColor = actionCategory === 'dx' ? 'bg-purple-50' : 'bg-emerald-50';
                    return (
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-5">
                        {filteredActionsForView.map((item, idx) => {
                          const itemRatio = Math.min(100, Math.max(0, Math.round(Number(item.ratio) || 0)));
                          const locName = LOCATION_NAME_MAP[item.location_id] || item.location_id;
                          return (
                            <div key={idx} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-3 relative overflow-hidden transition-all hover:shadow-md group">
                              {/* 左端のアクセントライン */}
                              <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: themeColor }}></div>
                              
                              <div className="flex justify-between items-start pl-2">
                                <div className="flex flex-wrap gap-1.5 items-center">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-black text-white shadow-sm" style={{ backgroundColor: themeColor }}>{locName}</span>
                                  {item.dateStr && <span className="text-[10px] font-bold text-slate-400">📅 {item.dateStr}</span>}
                                  
                                  {/* 🌟 顧客関連/社内施策 バッジ追加 */}
                                  {item.customer_related === 'あり' ? (
                                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200 shadow-sm">🚨 顧客関連</span>
                                  ) : (
                                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-50 text-slate-500 border border-slate-200 shadow-sm">🏢 社内施策</span>
                                  )}
                                </div>
                              </div>
                              
                              <h3 className="text-sm font-black text-slate-800 leading-snug pl-2">{item.name}</h3>
                              
                              {/* 🌟 スマートなリニアプログレスバー */}
                              <div className="space-y-1 pl-2 mt-1">
                                <div className="flex justify-between text-[10px] font-black">
                                  <span className="text-slate-400 uppercase tracking-wider">Progress</span>
                                  <span style={{ color: themeColor }}>{itemRatio}%</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                  <div className="h-1.5 rounded-full transition-all duration-1000" style={{ width: `${itemRatio}%`, backgroundColor: themeColor }}></div>
                                </div>
                              </div>

                              <div className="w-full space-y-2 mt-auto pl-2 pt-2">
                                {item.effect && item.effect !== "未入力" && (
                                  <div className={`text-[11px] font-medium text-slate-600 p-2.5 rounded-xl border border-slate-100 line-clamp-3 ${bgLightColor}`}>
                                    <span className="text-amber-500 font-black mr-1">💡</span>{item.effect}
                                  </div>
                                )}
                                {item.url && (
                                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex w-fit items-center gap-1 mt-1 text-[10px] font-black hover:underline transition-colors px-2 py-1.5 rounded-lg border border-transparent bg-slate-50 text-slate-600" style={{ color: themeColor }}>
                                    <FileText size={12} /> 関連リンクを開く
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  } else {
                    // 営業履歴のカード表示
                    return (
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-5">
                        {filteredActionsForView.map((log, idx) => {
                          const locName = LOCATION_NAME_MAP[log.location_id] || log.location_id;
                          return (
                            <div key={idx} className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-col space-y-3 relative overflow-hidden hover:shadow-md transition-all group">
                              {/* 左端のアクセントライン */}
                              <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500"></div>

                              <div className="flex justify-between items-start pl-2">
                                <div className="flex flex-wrap gap-1.5 items-center">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-black text-white shadow-sm bg-rose-500">{locName}</span>
                                  {log.dateStr && <span className="text-[10px] font-bold text-slate-400">📅 {log.dateStr}</span>}
                                  
                                  {/* 🌟 営業履歴：〇△×の専用カラーバッジ */}
                                  {(() => {
                                    const res = log.result;
                                    if (res === '●' || res === '〇') return <span className="text-[9px] font-black px-1.5 py-0.5 rounded border shadow-sm bg-emerald-50 text-emerald-700 border-emerald-200">🟢 成功/前進</span>;
                                    if (res === '×') return <span className="text-[9px] font-black px-1.5 py-0.5 rounded border shadow-sm bg-rose-50 text-rose-700 border-rose-200">❌ 失注/中止</span>;
                                    if (res === '△') return <span className="text-[9px] font-black px-1.5 py-0.5 rounded border shadow-sm bg-amber-50 text-amber-700 border-amber-200">⚠️ 保留/継続</span>;
                                    return <span className="text-[9px] font-black px-1.5 py-0.5 rounded border shadow-sm bg-slate-50 text-slate-700 border-slate-200">結果: {res}</span>;
                                  })()}
                                </div>
                              </div>

                              <h4 className="text-sm font-black text-slate-900 tracking-tight pl-2 mt-1">{log.client}</h4>
                              
                              <div className="pl-2 mt-auto space-y-2">
                                {log.proposal && <div className="text-[11px] font-black text-slate-800 bg-rose-50 border border-rose-100 px-2.5 py-1.5 rounded-lg w-fit"><span className="text-rose-500 font-extrabold mr-1">💡 提案:</span>{log.proposal}</div>}
                                {log.detail && <p className="text-[11px] font-medium text-slate-600 leading-relaxed whitespace-pre-wrap line-clamp-3">{log.detail}</p>}
                                
                                {log.url && (
                                  <a href={log.url} target="_blank" rel="noopener noreferrer" className="inline-flex w-fit items-center gap-1 mt-1 text-[10px] font-black hover:underline transition-colors px-2 py-1.5 rounded-lg border border-transparent bg-slate-50 text-rose-600">
                                    <FileText size={12} /> 関連リンクを開く
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }
                })()}
              </div>

              {/* 右半分：ランキンググラフ（スクロール追従） */}
              <div className="w-full lg:w-[45%] xl:w-[40%] bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col h-[500px] lg:sticky lg:top-4 order-1 lg:order-2">
                <div className="flex items-center justify-between mb-4 shrink-0 border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Trophy size={16} className={actionCategory === 'dx' ? 'text-purple-500' : actionCategory === 'env' ? 'text-emerald-500' : 'text-rose-500'} />
                    拠点別 件数ランキング ({actionCategory === 'dx' ? 'DX推進' : actionCategory === 'env' ? '現場改善' : '営業履歴'})
                  </h3>
                </div>
                <div className="flex-1 w-full min-h-0 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={actionCountByLocation} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" hide domain={[0, maxActionBarValue]} xAxisId={0} />
                      <XAxis type="number" hide domain={[0, maxActionBarValue]} xAxisId={1} />
                      <YAxis dataKey="name" type="category" width={100} interval={0} tickFormatter={(v: any) => String(v).length > 8 ? `${String(v).slice(0, 8)}…` : v} tick={{ fontSize: 11, fill: '#374151', textAnchor: 'end', dy: 4 }} axisLine={false} tickLine={false} />
                      <RechartsTooltip cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }} contentStyle={modernTooltipStyle} formatter={(val: any, name: any) => {
                        if (name === 'maxValue') return [];
                        return [`${val}件`, '件数'];
                      }} />
                      <Bar dataKey="maxValue" fill="#f3f4f6" radius={[0, 6, 6, 0]} barSize={16} animationDuration={0} xAxisId={0} />
                      <Bar dataKey="value" fill={actionCategory === 'dx' ? '#9333ea' : actionCategory === 'env' ? '#10b981' : '#f43f5e'} radius={[0, 6, 6, 0]} barSize={16} animationDuration={1000} xAxisId={1}>
                        <LabelList dataKey="value" position="right" fill={actionCategory === 'dx' ? '#9333ea' : actionCategory === 'env' ? '#10b981' : '#f43f5e'} fontSize={12} fontWeight="bold" offset={10} formatter={(v: any) => `${v}件`} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          </div>
        </main>
      ) : (
        <main className="flex-1 flex flex-col h-full overflow-hidden w-full relative">
          <header className="px-4 md:px-6 py-4 flex items-end justify-between shrink-0 bg-white border-b border-slate-200 z-30">
            <div className="flex items-center gap-2 md:gap-3">
              <svg className="w-6 h-6 md:w-8 md:h-8 text-blue-700" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h2v18H3zm4 14h2v4H7zm4-6h2v10h-2zm4-4h2v14h-2zm4-4h2v18h-2z"/></svg>
              <h1 className="text-lg md:text-2xl font-extrabold text-slate-800 tracking-tight">{areaDisplayName} 業績比較ダッシュボード</h1>
            </div>
            <div className="flex gap-2">
              <select value={selectedMonth} onChange={(e) => { setSelectedMonth(e.target.value); }} className="bg-white border border-slate-300 text-slate-700 rounded px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-medium shadow-sm cursor-pointer outline-none">
                {months.map(m => <option key={m} value={m}>{m}度 (実績)</option>)}
              </select>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 w-full space-y-6">
            <div className="flex flex-col gap-5 w-full">
              
              {/* 4大KPIボックス */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0 w-full">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col justify-between relative overflow-hidden h-24 md:h-28">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none"></div>
                  <p className="text-xs md:text-sm font-bold text-slate-800 relative z-10">総確定売上</p>
                  <div className="flex items-end justify-between relative z-10">
                    <div>
                      <p className="text-xl md:text-3xl font-extrabold text-slate-900 tracking-tight"><AnimatedNumber value={ `¥${(totalSales/10000).toLocaleString(undefined, {maximumFractionDigits: 0})}` }/><span className="text-xs md:text-sm font-bold text-slate-500 ml-0.5">万</span></p>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[10px] font-bold"><span className="text-emerald-600">予算比 {achievementRate}%</span></div>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col justify-center h-24 md:h-28"><p className="text-xs md:text-sm font-bold text-slate-800 mb-0.5">当月予測達成率</p><p className="text-xl md:text-3xl font-extrabold text-slate-900"><AnimatedNumber value={ achievementRate }/><span className="text-xs md:text-sm font-bold text-slate-500 ml-0.5">%</span></p></div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col justify-center h-24 md:h-28"><p className="text-xs md:text-sm font-bold text-slate-800 mb-0.5">平均当期純利益率</p><p className="text-xl md:text-3xl font-extrabold text-slate-900"><AnimatedNumber value={ avgProfitMargin.toFixed(1) }/><span className="text-xs md:text-sm font-bold text-slate-500 ml-0.5">%</span></p></div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col justify-center h-24 md:h-28"><p className="text-xs md:text-sm font-bold text-slate-800 mb-0.5">稼働現場数</p><p className="text-xl md:text-3xl font-extrabold text-slate-900"><AnimatedNumber value={ filteredData.length }/><span className="text-xs md:text-sm font-bold text-slate-500 ml-0.5">現場</span></p></div>
              </div>

              {selectedArea !== 'all' && (
                <div className="flex flex-col lg:flex-row gap-4 w-full shrink-0 min-h-[340px]">
                  <div className="w-full lg:w-[65%] bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col overflow-hidden h-[340px] lg:h-auto min-w-0">
                    <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2 mb-3 shrink-0"><Target size={14} className="text-emerald-600" />現場別 通期27期予算進捗状況</h3>
                    <div className="flex-1 flex flex-nowrap gap-3 overflow-x-auto custom-scrollbar pb-2 items-center w-full min-w-0 scroll-smooth">
                      {siteProgressData.map((site, index) => (
                        <div key={site.name} className="shrink-0">
                          <DualRingChart siteName={site.name} annualBudget={site.annualBudget} plannedSales={site.plannedSales} achievedSales={site.achievedSales} />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="w-full lg:w-[35%] bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col h-[300px] lg:h-auto">
                    <div className="flex justify-between items-center mb-2 shrink-0">
                      <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2"><TrendingUp size={14} className="text-blue-600" />27期 通期累計売上 進捗トレンド</h3>
                      <div className="bg-blue-50 px-2.5 py-1 rounded border border-blue-100 text-center">
                        <span className="text-[9px] text-blue-600 block font-black leading-none mb-0.5">通期進捗率</span>
                        <span className="text-sm font-black text-blue-700 leading-none">{annualProgressRate}%</span>
                      </div>
                    </div>
                    <div className="flex-1 w-full min-h-0 relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={cumulativeTrendData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                          <YAxis tickFormatter={(v: any) => `${Math.round(v/10000)}万`} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                          <RechartsTooltip contentStyle={modernTooltipStyle} formatter={(val: any) => `¥${Number(val).toLocaleString()}`} />
                          <Legend wrapperStyle={{ fontSize: 10, fontWeight: 'bold' }} />
                          <Bar dataKey="累計実績売上" name="累計実績売上" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                          <Line type="step" dataKey="27期 通期予算" name="通期予算ゴール" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="5 5" dot={false} activeDot={false} />
                          <Line type="monotone" dataKey="予算ペース (毎月累計)" stroke="#94a3b8" strokeWidth={1.2} strokeDasharray="4 4" dot={false} activeDot={false} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {/* 実績ランキング ＆ 巨大化バブル散布図 */}
              <div className="flex flex-col lg:flex-row gap-4 h-auto lg:h-[380px] shrink-0 w-full">
                <div className="w-full lg:w-1/2 bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col h-[320px] lg:h-full min-w-0">
                  <div className="flex items-center justify-between mb-2 shrink-0 border-b border-slate-100 pb-2">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5"><Trophy size={16} className="text-amber-500" />現場別 実績ランキング</h3>
                    <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 text-xs shadow-sm">
                      <span className="text-slate-400 font-bold text-[10px]">実績項目:</span>
                      <select value={rankingTarget} onChange={(e) => setRankingTarget(e.target.value)} className="bg-transparent font-black text-blue-600 outline-none w-32 truncate cursor-pointer">
                        {actualNumericKeys.map(k => <option key={k} value={k}>{k}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex-1 w-full min-h-0 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barChartData} layout="vertical" margin={{ top: 5, right: 70, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                        <XAxis type="number" hide domain={[0, maxBarValue]} xAxisId={0} />
                        <XAxis type="number" hide domain={[0, maxBarValue]} xAxisId={1} />
                        <YAxis dataKey="name" type="category" width={110} interval={0} tickFormatter={(v: any) => String(v).length > 8 ? `${String(v).slice(0, 8)}…` : v} tick={{ fontSize: 11, fill: '#374151', textAnchor: 'end', dy: 4 }} axisLine={false} tickLine={false} />
                        <RechartsTooltip cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }} contentStyle={modernTooltipStyle} formatter={(val: any) => Number(val).toLocaleString()} />
                        <Bar dataKey="maxValue" fill="#f3f4f6" radius={[0, 6, 6, 0]} barSize={14} animationDuration={0} xAxisId={0} />
                        <Bar dataKey="value" fill="url(#barGradient)" radius={[0, 6, 6, 0]} barSize={14} animationDuration={1000} xAxisId={1}>
                          <LabelList dataKey="label" position="right" fill="#ec4899" fontSize={11} fontWeight="bold" offset={10} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="w-full lg:w-1/2 bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col h-[380px] lg:h-full min-w-0">
                  <div className="flex flex-col gap-2 mb-2 shrink-0 border-b border-slate-100 pb-2">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5"><Settings2 size={16} className="text-blue-600" />フリースタイル・戦略分析チャート（散布図）</h3>
                    <div className="flex gap-2 items-center text-xs">
                      <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border shadow-sm">
                        <span className="text-slate-400 font-bold text-[10px]">X軸:</span>
                        <select value={scatterX} onChange={(e) => setScatterX(e.target.value)} className="bg-transparent font-black text-slate-700 outline-none w-28 truncate cursor-pointer">
                          {numericKeys.map(k => <option key={k} value={k}>{k}</option>)}
                        </select>
                      </div>
                      <span className="text-slate-300 font-bold">vs</span>
                      <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border shadow-sm">
                        <span className="text-slate-400 font-bold text-[10px]">Y軸:</span>
                        <select value={scatterY} onChange={(e) => setScatterY(e.target.value)} className="bg-transparent font-black text-slate-700 outline-none w-28 truncate pointer-events-auto cursor-pointer">
                          {numericKeys.map(k => <option key={k} value={k}>{k}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 w-full min-h-0 relative mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 20, right: 20, bottom: 25, left: -10 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.6} />
                        <XAxis type="number" dataKey="x" tickFormatter={(v: any) => v >= 10000 ? `${(Number(v)/10000).toFixed(0)}万` : v} stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} label={{ value: scatterX, position: 'bottom', fontSize: 10, offset: 5 }} />
                        <YAxis type="number" dataKey="y" tickFormatter={(v: any) => v >= 10000 ? `${(Number(v)/10000).toFixed(0)}万` : v} stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} label={{ value: scatterY, angle: -90, position: 'insideLeft', fontSize: 10 }} />
                        <ZAxis type="number" dataKey="z" range={[200, 3500]} />
                        <RechartsTooltip cursor={{ strokeDasharray: '3 3', stroke: '#94a3b8' }} content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                              <div style={modernTooltipStyle}>
                                <p className="font-extrabold text-slate-900 mb-1 border-b border-slate-100 pb-1">{d.name}</p>
                                <p className="text-slate-600 text-[11px] mb-0.5 font-bold">{scatterX}: <span className="text-blue-600">{Number(d.x).toLocaleString()}</span></p>
                                <p className="text-slate-600 text-[11px] font-bold">{scatterY}: <span className="text-pink-600">{Number(d.y).toLocaleString()}</span></p>
                              </div>
                            );
                          }
                          return null;
                        }} />
                        <Scatter data={dynamicScatterData} isAnimationActive={false}>
                          {dynamicScatterData.map((entry, index) => <Cell key={`cell-${index}`} fill="url(#bubbleGrad)" stroke="#0284c7" strokeWidth={1.5} />)}
                          <LabelList dataKey="name" position="bottom" fill="#334155" fontSize={10} offset={14} fontWeight="bold" />
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="flex flex-col xl:flex-row gap-5 w-full">
                
                {/* 左翼：隠れコスト詳細分析チャート */}
                <div className="w-full xl:w-1/2 bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col h-[400px]">
                  <div className="flex flex-col mb-4 shrink-0 border-b border-slate-100 pb-2">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5"><TrendingUp size={16} className="text-indigo-600"/> ベース給与 vs 隠れコスト詳細分析</h3>
                    <p className="text-[10px] text-slate-400 font-bold">有給・交通費実績・社会保険を網羅しベース給与＆総労務費と対比</p>
                  </div>
                  <div className="flex-1 w-full min-h-0 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={sideBySideChartData} margin={{ top: 20, right: 0, left: -10, bottom: 25 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" interval={0} tickFormatter={(v: any) => String(v).length > 5 ? `${String(v).slice(0, 5)}…` : v} tick={{ fontSize: 9, fill: '#64748b', fontWeight: 'bold' }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" />
                        
                        <YAxis yAxisId="left" tickFormatter={(v: any) => `${Math.round(v/10000)}万`} tick={{ fontSize: 10, fill: '#4f46e5', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                        <YAxis yAxisId="right" orientation="right" tickFormatter={(v: any) => `${Math.round(v/10000)}万`} tick={{ fontSize: 10, fill: '#ec4899', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                        
                        <RechartsTooltip contentStyle={modernTooltipStyle} cursor={{fill: '#f1f5f9'}} formatter={(val: any) => `¥${Number(val).toLocaleString()}`} />
                        <Legend wrapperStyle={{ fontSize: 10, fontWeight: 'bold' }} verticalAlign="top" />
                        
                        <Bar yAxisId="left" dataKey="社会保険" stackId="hidden_cost" fill="#3b82f6" name="実績_社会保険" />
                        <Bar yAxisId="left" dataKey="有給コスト" stackId="hidden_cost" fill="#8b5cf6" name="実績_有給" />
                        <Bar yAxisId="left" dataKey="旅費交通費" stackId="hidden_cost" fill="#f59e0b" name="実績_旅費交通費（原）" radius={[4, 4, 0, 0]} />
                        
                        <Line yAxisId="right" type="monotone" dataKey="ベース給与" stroke="#ec4899" strokeWidth={2.5} name="実績_給与手当（原）" dot={{ r: 4, fill: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                        <Line yAxisId="right" type="monotone" dataKey="実績_労務費" stroke="#1d4ed8" strokeWidth={2.5} name="実績_労務費" dot={{ r: 4, fill: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 右翼：労働生産性効果タワーチャート */}
                <div className="w-full xl:w-1/2 bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col h-[400px]">
                  <div className="flex flex-col mb-4 shrink-0 border-b border-slate-100 pb-2">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5"><Layers size={16} className="text-emerald-600"/> 総人件費 vs 粗利益（労働生産性効果）</h3>
                    <p className="text-[10px] text-slate-400 font-bold">人件費全体の投資（棒）に対し、どれだけの利益（ピンク線）を回収できたかを追跡</p>
                  </div>
                  <div className="flex-1 w-full min-h-0 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={sideBySideChartData} margin={{ top: 20, right: 0, left: -10, bottom: 25 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" interval={0} tickFormatter={(v: any) => String(v).length > 5 ? `${String(v).slice(0, 5)}…` : v} tick={{ fontSize: 9, fill: '#64748b', fontWeight: 'bold' }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" />
                        
                        <YAxis yAxisId="left" tickFormatter={(v: any) => `${Math.round(v/10000)}万`} tick={{ fontSize: 10, fill: '#10b981', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                        <YAxis yAxisId="right" orientation="right" tickFormatter={(v: any) => `${Math.round(v/10000)}万`} tick={{ fontSize: 10, fill: '#f43f5e', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                        
                        <RechartsTooltip contentStyle={modernTooltipStyle} cursor={{fill: '#f1f5f9'}} formatter={(val: any) => `¥${Number(val).toLocaleString()}`} />
                        <Legend wrapperStyle={{ fontSize: 10, fontWeight: 'bold' }} verticalAlign="top" />
                        
                        <Bar yAxisId="left" dataKey="総人件費" fill="#10b981" name="総人件費 (給与+社保+有給+交通費)" radius={[4, 4, 0, 0]} />
                        <Line yAxisId="right" type="monotone" dataKey="生み出した利益" stroke="#f43f5e" strokeWidth={2.5} name="実績粗利益" dot={{ r: 4, fill: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

              {/* 3大戦略積み上げタワー（スタックチャート） */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 w-full">
                
                {/* ① 原価の解剖 */}
                <div className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col h-[350px]">
                  <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5 mb-2 text-[#2563eb]"><Layers size={14}/> 1. 現場別 利益・原価の解剖 (100%スタック)</h3>
                  <div className="flex-1 w-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stackChartData} margin={{ top: 10, right: 10, left: -25, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 'bold' }} angle={-25} textAnchor="end" interval={0} />
                        <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 9, fontWeight: 'bold' }} />
                        <RechartsTooltip contentStyle={modernTooltipStyle} />
                        <Legend wrapperStyle={{ fontSize: 10, fontWeight: 'bold' }} verticalAlign="top" />
                        <Bar dataKey="純利益" name="利益率" stackId="cost" fill="#10b981" />
                        <Bar dataKey="原価構成" name="原価率" stackId="cost" fill="#f87171" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* ② リスク＆コンプライアンス要塞タワー */}
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col h-[350px]">
                  <h3 className="text-xs font-black flex items-center gap-1.5 mb-2 text-rose-400"><ShieldAlert size={14}/> 2. リスク・コンプライアンス要塞タワー (損失金額)</h3>
                  <div className="flex-1 w-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stackChartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.4} />
                        <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 'bold' }} angle={-25} textAnchor="end" interval={0} />
                        <YAxis tickFormatter={(v) => v >= 10000 ? `${Math.round(v/10000)}万` : v} tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 'bold' }} />
                        <RechartsTooltip contentStyle={{ ...modernTooltipStyle, backgroundColor: '#0f172a', color: '#fff' }} formatter={(value: any, name: string) => [`¥${Number(value).toLocaleString()}`, name]} />
                        <Legend wrapperStyle={{ fontSize: 10, fontWeight: 'bold', color: '#fff' }} verticalAlign="top" />
                        <Bar dataKey="商品誤配費" name="商品誤配費" stackId="risk" fill="#ef4444" />
                        <Bar dataKey="商品破損費" name="商品破損費" stackId="risk" fill="#f59e0b" />
                        <Bar dataKey="労働災害費" name="労働災害費" stackId="risk" fill="#a855f7" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* ③ 売上高 vs 原価＋利益 */}
                <div className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col h-[350px]">
                  <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5 mb-2 text-[#7c3aed]"><BarChart3 size={14}/> 3. 総売上高 vs 原価・純利益 (ツインタワー)</h3>
                  <div className="flex-1 w-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stackChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 'bold' }} angle={-25} textAnchor="end" interval={0} />
                        <YAxis tickFormatter={(v) => `${Math.round(v/10000)}万`} tick={{ fontSize: 9, fontWeight: 'bold' }} />
                        <RechartsTooltip contentStyle={modernTooltipStyle} formatter={(val: any) => `¥${Number(val).toLocaleString()}`} />
                        <Legend wrapperStyle={{ fontSize: 10, fontWeight: 'bold' }} verticalAlign="top" />
                        <Bar dataKey="売上高" name="総売上高" stackId="left-tower" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={12} />
                        <Bar dataKey="原価構成" name="原価総額" stackId="right-tower" fill="#94a3b8" barSize={12} />
                        <Bar dataKey="純利益" name="実績純利益" stackId="right-tower" fill="#10b981" radius={[4, 4, 0, 0]} barSize={12} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

              {/* 最新データマトリックス */}
              <div className="flex flex-col lg:flex-row gap-4 w-full shrink-0">
                <div className="w-full bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col h-auto">
                  <h3 className="text-sm font-bold text-slate-900 mb-2">現場別 最新データマトリックス (横スクロール対応)</h3>
                  <div className="flex-1 w-full overflow-x-auto custom-scrollbar border rounded-lg border-slate-200">
                    <table className="w-full text-[11px] text-center border-collapse whitespace-nowrap">
                      <thead>
                        <tr className="text-slate-700 font-bold bg-slate-50 border-b border-slate-200">
                          <th className="py-2 text-left pl-3 sticky left-0 bg-slate-50 border-r border-slate-200 z-10">現場名</th>
                          {numericKeys.map(key => (
                            <th key={key} className="py-2 px-4 border-r border-slate-100">{key}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredData.map((item, i) => (
                          <tr key={i} className="border-b border-slate-100 hover:bg-blue-50/50 transition-colors">
                            <td className="py-1.5 text-left font-extrabold text-slate-800 pl-3 sticky left-0 bg-white border-r border-slate-200 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">{item["現場名"]}</td>
                            {numericKeys.map(key => {
                              const val = Number(item[key]) || 0;
                              return (
                                <td key={key} className="py-1.5 px-4 font-bold text-slate-600 border-r border-slate-50">
                                  {Math.abs(val) >= 10000 ? `${(val/10000).toFixed(1)}万` : val.toLocaleString()}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[9px] text-slate-400 mt-2 font-bold text-right">※全項目（スプレッドシートの有効列すべて）をプレビューしています。</p>
                </div>
              </div>

            </div>
          </div>
        </main>
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}} />
    </div>
  );
}