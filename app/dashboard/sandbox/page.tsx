// @ts-nocheck
'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis, Cell, LabelList, Line, Legend, Area, ComposedChart,
  PieChart, Pie, LineChart, AreaChart
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Loader2, Globe, MapPin, Sparkles, TrendingUp, Target, Layers, Trophy, Settings2, ShieldAlert, Rocket, Leaf, MessageSquare, FileText, Search, Activity, ChevronDown, PieChart as PieChartIcon, Calendar, AlertTriangle } from 'lucide-react';

const GAS_API_URL = "/api/compare";

const SITE_AREA_MAP: { [key: string]: 'kanto' | 'kansai' | 'chubu' | 'cleanness' } = {
  "昭和冷蔵": "kanto", "asf南関東": "kanto", "AFS南関東": "kanto", "afs南関東": "kanto", "クラフトデリカ": "kanto", "ランドポート習志野": "kanto", "東急ストア": "kanto",
  "三井食品": "chubu", "afs尾西": "chubu", "AFS尾西": "chubu", "ヤマナカ": "chubu",
  "尾家産業": "kansai", "メディエントランス": "kansai", "カインズ神戸": "kansai", "カインズ福岡": "kansai",
  "尾西清盛": "cleanness", "尾西清鎖": "cleanness", "尾西清掃": "cleanness", "兵庫清掃": "cleanness", "姫路清掃": "cleanness", "万代彩都": "cleanness", "万代綾都": "cleanness",
  "himeji-afs-seiso": "cleanness", "hyogo-seiso": "cleanness", "binisai-seiso": "cleanness", "afs-bisai-seiso": "cleanness",
  "万代渋川": "cleanness", "mandai-sibukawa": "cleanness"
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
  "binisai-seiso": "尾西清掃",
  "afs-bisai-seiso": "尾西清掃",
  "mandai-sibukawa": "万代渋川"
};

const PROD_COLORS = ['#3b82f6', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6', '#0ea5e9', '#f43f5e', '#84cc16', '#6366f1', '#14b8a6', '#d946ef', '#f97316'];

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

const CustomDropdown = ({ value, options, onChange, align = 'left' }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative inline-block text-left z-40">
      <div
        className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="font-black text-blue-600 text-[11px] truncate max-w-[120px]">{value}</span>
        <ChevronDown size={14} className="text-slate-400 shrink-0" />
      </div>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} mt-2 w-56 bg-white rounded-xl shadow-2xl z-50 border border-slate-100 max-h-64 overflow-y-auto custom-scrollbar`}>
            <div className="p-1">
              {options.map((opt: string) => (
                <div
                  key={opt}
                  className={`px-3 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors ${value === opt ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'}`}
                  onClick={() => { onChange(opt); setIsOpen(false); }}
                >
                  {opt}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const DiffBadge = ({ curr, prev, isInverse = false, isDecimal = false, label, asPercentChange = false }: any) => {
  if (!prev) return <span className="text-slate-300 text-[9px] font-bold flex w-full justify-center">-</span>;
  const diff = curr - prev;
  if (diff === 0) return <span className="text-slate-400 text-[9px] font-bold flex w-full justify-center items-center gap-0.5">±0 <span className="font-medium opacity-70 scale-90">{label}</span></span>;
  
  const isPositive = diff > 0;
  const isGood = isInverse ? !isPositive : isPositive;
  const color = isGood ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-rose-600 bg-rose-50 border-rose-100';
  const arrow = isPositive ? '↑' : '↓';
  const prefix = isPositive ? '+' : '';
  
  let diffStr = '';
  if (asPercentChange) {
    const pct = (diff / prev) * 100;
    diffStr = `${pct.toFixed(1)}%`;
  } else {
    diffStr = isDecimal ? diff.toFixed(1) : Math.round(diff).toLocaleString();
  }
  
  return (
    <span className={`${color} text-[9px] font-black px-1.5 py-[2px] rounded border flex items-center justify-center w-full gap-0.5 tracking-tighter`}>
      {arrow}{prefix}{diffStr} <span className="font-medium text-[8px] opacity-70 scale-90">{label}</span>
    </span>
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
  const [selectedArea, setSelectedArea] = useState<'all' | 'kanto' | 'kansai' | 'chubu' | 'cleanness' | 'productivity' | 'actions' | 'accidents'>('all');

  const [rankingTarget, setRankingTarget] = useState<string>('実績_売上高');
  const [scatterX, setScatterX] = useState<string>('実績_売上高');
  const [scatterY, setScatterY] = useState<string>('実績_純売上高');

  const [activeTopTab, setActiveTopTab] = useState<'dashboard' | 'productivity' | 'actions' | 'accidents'>('dashboard');
  
  const [prodAreaFilters, setProdAreaFilters] = useState({ kanto: true, chubu: true, kansai: true });

  const [actionCategory, setActionCategory] = useState<'dx' | 'env' | 'history'>('dx');
  const [actionLocationFilter, setActionLocationFilter] = useState<string>('all');
  const [actionSearchQuery, setActionSearchQuery] = useState<string>('');
  const [allActions, setAllActions] = useState<any[]>([]);
  const [actionYearFilter, setActionYearFilter] = useState<string>('all');
  const [actionMonthFilter, setActionMonthFilter] = useState<string>('all');

  const [filterDxCustomer, setFilterDxCustomer] = useState<boolean>(true);
  const [filterDxInternal, setFilterDxInternal] = useState<boolean>(true);
  const [filterHistSuccess, setFilterHistSuccess] = useState<boolean>(true);
  const [filterHistPending, setFilterHistPending] = useState<boolean>(true);
  const [filterHistLost, setFilterHistLost] = useState<boolean>(true);

  const [allAccidents, setAllAccidents] = useState<any[]>([]);
  const [accSheetLogs, setAccSheetLogs] = useState<any[]>([]);
  const [accLocationFilter, setAccLocationFilter] = useState<string>('all');
  const [accYearFilter, setAccYearFilter] = useState<string>('all');
  const [accMonthFilter, setAccMonthFilter] = useState<string>('all');
  const [accSearchQuery, setAccSearchQuery] = useState<string>('');
  const [accViewTab, setAccViewTab] = useState<'all' | 'improved' | 'retry'>('all');

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
        
        // 💡 配列チェックの強制終了を撤廃し、GASからのJSONを直接受け取る
        let perfData = [];
        let accData = [];

        if (Array.isArray(data)) {
          perfData = data;
        } else {
          perfData = data.performance || [];
          accData = data.accidents || [];
        }

        // 業績データのフォーマット（日付の調整 ＋ 「事故」データの強制ブロックバリア）
        const formattedData = perfData
          .filter((item: any) => {
            const siteName = String(item["現場名"] || item.site || "");
            return !siteName.includes("事故"); // 💡 ここで「事故_昭和冷蔵」などを絶対に弾く
          })
          .map((item: any) => {
            const rawDateKey = item["日付"] || item["年月"] || "";
            return { ...item, "日付": formatMonth(rawDateKey) };
          });

        setRawData(formattedData);
        setAccSheetLogs(accData);

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
        const [dx, env, history, accidentsData] = await Promise.all([
          fetchTable('dx_actions'), fetchTable('env_actions'), fetchTable('sales_history'), fetchTable('accident_measures')
        ]);
        
        const combined = [
          ...dx.map((d: any) => ({ ...d, actionType: 'DX推進', dateStr: d.start_date })),
          ...env.map((e: any) => ({ ...e, actionType: '現場改善', dateStr: e.start_date })),
          ...history.map((h: any) => ({ ...h, actionType: '営業履歴', dateStr: h.date }))
        ].sort((a, b) => (b.dateStr || '').localeCompare(a.dateStr || ''));
        
        setAllActions(combined);
        setAllAccidents((accidentsData || []).map((a: any) => ({ ...a, dateStr: a.start_date })).sort((a: any, b: any) => (b.dateStr || '').localeCompare(a.dateStr || '')));
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
    if (selectedArea === 'actions' || selectedArea === 'productivity' || selectedArea === 'accidents') return false; 
    return getAreaForSite(item["現場名"]) === selectedArea;
  });

  const term27Months = [
    "2026/04", "2026/05", "2026/06", "2026/07", "2026/08", "2026/09",
    "2026/10", "2026/11", "2026/12", "2027/01", "2027/02", "2027/03"
  ];

  const term27Data = rawData.filter(item => {
    if (selectedArea !== 'all' && selectedArea !== 'actions' && selectedArea !== 'productivity' && selectedArea !== 'accidents' && getAreaForSite(item["現場名"]) !== selectedArea) return false;
    return term27Months.includes(item["日付"]);
  });

  const uniqueSitesProd = useMemo(() => Array.from(new Set(rawData
    .filter(d => term27Months.includes(d["日付"]))
    .map(d => d["現場名"])
    .filter(site => {
      const area = getAreaForSite(site);
      if (area === 'cleanness') return false;
      if (area === 'kanto' && !prodAreaFilters.kanto) return false;
      if (area === 'chubu' && !prodAreaFilters.chubu) return false;
      if (area === 'kansai' && !prodAreaFilters.kansai) return false;
      return true;
    }) 
  )), [rawData, term27Months, prodAreaFilters]);

  const siteCardsData = useMemo(() => {
    const selectedIdx = months.indexOf(selectedMonth);
    const prevMonthStr = selectedIdx >= 0 && selectedIdx + 1 < months.length ? months[selectedIdx + 1] : null;
    const prev2MonthStr = selectedIdx >= 0 && selectedIdx + 2 < months.length ? months[selectedIdx + 2] : null;

    let totalVol = 0; let totalHrs = 0;
    let prevTotalVol = 0; let prevTotalHrs = 0;
    let prev2TotalVol = 0; let prev2TotalHrs = 0;

    const list = uniqueSitesProd.map(site => {
      const getSiteData = (m: string | null) => {
        if (!m) return { prod: 0, vol: 0, hrs: 0 };
        const d = rawData.find(item => item["日付"] === m && item["現場名"] === site);
        return d ? {
          prod: Number(d["作業生産性"]) || 0,
          vol: Number(d["実績_物量"]) || 0,
          hrs: Number(d["実績_工数"]) || 0
        } : { prod: 0, vol: 0, hrs: 0 };
      };

      const current = getSiteData(selectedMonth);
      const prev = getSiteData(prevMonthStr);
      const prev2 = getSiteData(prev2MonthStr);

      totalVol += current.vol; totalHrs += current.hrs;
      prevTotalVol += prev.vol; prevTotalHrs += prev.hrs;
      prev2TotalVol += prev2.vol; prev2TotalHrs += prev2.hrs;

      const trendData = term27Months.map(m => {
        if (m > selectedMonth) {
          return { month: m.split('/')[1] + '月' }; 
        }
        const d = getSiteData(m);
        return { 
          month: m.split('/')[1] + '月', 
          prod: d.prod > 0 ? d.prod : null, 
          vol: d.vol > 0 ? d.vol : null, 
          hrs: d.hrs > 0 ? d.hrs : null 
        };
      });

      return { site, current, prev, prev2, trendData };
    });

    list.sort((a, b) => b.current.prod - a.current.prod);

    const currentAvgProd = totalHrs > 0 ? totalVol / totalHrs : 0;
    const prevAvgProd = prevTotalHrs > 0 ? prevTotalVol / prevTotalHrs : 0;
    const prev2AvgProd = prev2TotalHrs > 0 ? prev2TotalVol / prev2TotalHrs : 0;

    return {
      list,
      totals: { 
        currentAvgProd, prevAvgProd, prev2AvgProd, 
        totalVol, prevTotalVol, prev2TotalVol, 
        totalHrs, prevTotalHrs, prev2TotalHrs 
      }
    };
  }, [rawData, selectedMonth, uniqueSitesProd, term27Months, months]);

  const productivityChartData = useMemo(() => {
    return term27Months.map(m => {
      const monthData: any = { month: m.split('/')[1] + '月' };
      
      if (m <= selectedMonth) {
        uniqueSitesProd.forEach(site => {
          const d = rawData.find(item => item["日付"] === m && item["現場名"] === site);
          if (d) {
            const prod = Number(d['作業生産性']);
            monthData[site] = prod > 0 ? prod : null;
            monthData[`${site}_vol`] = Number(d['実績_物量']) || 0;
            monthData[`${site}_hrs`] = Number(d['実績_工数']) || 0;
          }
        });
      }
      return monthData;
    });
  }, [rawData, selectedMonth, uniqueSitesProd, term27Months]);

  const ProductivityTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={modernTooltipStyle} className="pointer-events-none shadow-2xl bg-white/95 backdrop-blur-md border border-slate-200">
          <p className="font-extrabold text-slate-900 mb-2 border-b border-slate-200 pb-1">{label}</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 max-w-[600px]">
            {payload.map((entry: any, index: number) => {
              const site = entry.dataKey;
              const val = entry.value;
              const vol = entry.payload[`${site}_vol`];
              const hrs = entry.payload[`${site}_hrs`];
              if(val == null && !vol && !hrs) return null;
              return (
                <div key={index} className="flex flex-col">
                  <p className="text-[11px] font-bold truncate w-full" style={{ color: entry.color }}>■ {site}</p>
                  <div className="pl-2 mt-0.5 text-[9px] text-slate-500 flex flex-col gap-0.5">
                    <span className="font-black text-slate-800">生産性: {Number(val).toFixed(2)}</span>
                    <span>物: {Number(vol).toLocaleString()} / 工: {Number(hrs).toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  const parseTarget = (val: any) => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    return Number(String(val).replace(/,/g, '')) || 0;
  };

  const siteProgressData = Array.from(new Set(filteredData.map(item => item["現場名"]))).map(siteName => {
    const siteDataList = rawData.filter(d => d["現場名"] === siteName);
    const annual27 = Math.max(...siteDataList.map(d => parseTarget(d["27期予算"])));
    const sumMonthly = siteDataList.filter(d => term27Months.includes(d["日付"])).reduce((sum, d) => sum + parseTarget(d["予算_売上高"]), 0);
    const targetBudget = annual27 > 0 ? annual27 : sumMonthly;

    const siteAchievedData = siteDataList.filter(d => term27Months.includes(d["日付"]) && d["日付"] <= selectedMonth);
    const achievedSales = siteAchievedData.reduce((sum, d) => sum + (Number(d["実績_売上高"]) || Number(d["確定売上"]) || 0), 0);
    const plannedSales = targetBudget > 0 ? (targetBudget / 12) * siteAchievedData.length : 0;
    const progress = targetBudget > 0 ? (achievedSales / targetBudget) * 100 : 0;
    return { name: siteName, progress, annualBudget: targetBudget, plannedSales, achievedSales };
  }).sort((a, b) => b.progress - a.progress);

  const totalAnnualBudgetK2 = siteProgressData.reduce((sum, site) => sum + site.annualBudget, 0);

  let accBudget = 0;
  let accActual = 0;
  const cumulativeTrendData = term27Months.map(m => {
    const mData = term27Data.filter(d => d["日付"] === m);
    const mActual = mData.reduce((sum, d) => sum + (Number(d["実績_売上高"]) || Number(d["確定売上"]) || 0), 0);
    const mTarget = mData.reduce((sum, d) => sum + (parseTarget(d["27期予算"]) / 12 || parseTarget(d["予算_売上高"]) || 0), 0);
    
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

  const availableActionYears = useMemo(() => {
    const years = allActions.map(a => {
      if (!a.dateStr) return '';
      const parts = a.dateStr.split('/');
      return parts.length > 0 ? parts[0] : '';
    }).filter(Boolean);
    return Array.from(new Set(years)).sort().reverse();
  }, [allActions]);

  const availableActionLocations = useMemo(() => {
    const locs = allActions.filter(a => {
      const locName = LOCATION_NAME_MAP[a.location_id] || a.location_id;
      return getAreaForSite(locName) !== 'cleanness' && getAreaForSite(a.location_id) !== 'cleanness';
    }).map(a => a.location_id).filter(Boolean);
    return Array.from(new Set(locs));
  }, [allActions]);

  const filteredActionsForView = useMemo(() => {
    return allActions.filter(a => {
      const locName = LOCATION_NAME_MAP[a.location_id] || a.location_id;
      if (getAreaForSite(locName) === 'cleanness' || getAreaForSite(a.location_id) === 'cleanness') return false;

      const matchType = actionCategory === 'dx' ? a.actionType === 'DX推進' : actionCategory === 'env' ? a.actionType === '現場改善' : a.actionType === '営業履歴';
      const matchLoc = actionLocationFilter === 'all' || a.location_id === actionLocationFilter;
      
      const dateParts = (a.dateStr || '').split('/');
      const y = dateParts[0] || '';
      const m = dateParts[1] ? dateParts[1].padStart(2, '0') : '';
      
      const matchYear = actionYearFilter === 'all' || y === actionYearFilter;
      const matchMonth = actionMonthFilter === 'all' || m === actionMonthFilter;
      
      const searchLower = actionSearchQuery.toLowerCase();
      const matchSearch = actionSearchQuery === '' || 
        (a.name || '').toLowerCase().includes(searchLower) ||
        (a.client || '').toLowerCase().includes(searchLower) ||
        (a.effect || '').toLowerCase().includes(searchLower) ||
        (a.proposal || '').toLowerCase().includes(searchLower) ||
        (a.detail || '').toLowerCase().includes(searchLower) ||
        (LOCATION_NAME_MAP[a.location_id] || a.location_id).toLowerCase().includes(searchLower);

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

      return matchType && matchYear && matchMonth && matchLoc && matchSearch && matchStatus;
    });
  }, [allActions, actionCategory, actionYearFilter, actionMonthFilter, actionLocationFilter, actionSearchQuery, filterDxCustomer, filterDxInternal, filterHistSuccess, filterHistPending, filterHistLost]);

  const actionCountByLocation = useMemo(() => {
    const baseActions = allActions.filter(a => {
      const locName = LOCATION_NAME_MAP[a.location_id] || a.location_id;
      if (getAreaForSite(locName) === 'cleanness' || getAreaForSite(a.location_id) === 'cleanness') return false;

      const matchType = actionCategory === 'dx' ? a.actionType === 'DX推進' : actionCategory === 'env' ? a.actionType === '現場改善' : a.actionType === '営業履歴';
      
      const dateParts = (a.dateStr || '').split('/');
      const y = dateParts[0] || '';
      const m = dateParts[1] ? dateParts[1].padStart(2, '0') : '';
      
      const matchYear = actionYearFilter === 'all' || y === actionYearFilter;
      const matchMonth = actionMonthFilter === 'all' || m === actionMonthFilter;
      
      const searchLower = actionSearchQuery.toLowerCase();
      const matchSearch = actionSearchQuery === '' || 
        (a.name || '').toLowerCase().includes(searchLower) ||
        (a.client || '').toLowerCase().includes(searchLower) ||
        (a.effect || '').toLowerCase().includes(searchLower) ||
        (a.proposal || '').toLowerCase().includes(searchLower) ||
        (a.detail || '').toLowerCase().includes(searchLower) ||
        (LOCATION_NAME_MAP[a.location_id] || a.location_id).toLowerCase().includes(searchLower);

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

      return matchType && matchYear && matchMonth && matchSearch && matchStatus;
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
  }, [allActions, actionCategory, actionYearFilter, actionMonthFilter, actionSearchQuery, filterDxCustomer, filterDxInternal, filterHistSuccess, filterHistPending, filterHistLost]);

  const maxActionBarValue = actionCountByLocation.length > 0 ? actionCountByLocation[0].maxValue : 1;

  const availableAccYears = useMemo(() => {
    const years = allAccidents.map(a => a.dateStr?.split('-')[0] || a.dateStr?.split('/')[0] || '').filter(Boolean);
    return Array.from(new Set(years)).sort().reverse();
  }, [allAccidents]);

  const availableAccLocations = useMemo(() => {
    const locs = allAccidents.map(a => a.location_id).filter(Boolean);
    return Array.from(new Set(locs));
  }, [allAccidents]);

  // 💡 【修正反映済み】事故効果測定のイコール対応＆汎用カテゴリ対応ブロック
  const processedAccidents = useMemo(() => {
    return allAccidents.map(acc => {
      const locName = LOCATION_NAME_MAP[acc.location_id] || acc.location_id;
      const startDateStr = acc.dateStr || acc.start_date;
      let beforeCount = 0;
      let afterCount = 0;

      if (startDateStr && accSheetLogs.length > 0) {
        const startTarget = new Date(startDateStr);
        if (!isNaN(startTarget.getTime())) {
          const oneMonthAgo = new Date(startTarget.getTime() - 30 * 24 * 60 * 60 * 1000);
          const oneMonthLater = new Date(startTarget.getTime() + 30 * 24 * 60 * 60 * 1000);

          accSheetLogs.forEach(log => {
            const matchSite = log.site === locName || log.site === acc.location_id || (locName && log.site.includes(locName));
            
            const logTypeStr = String(log.type || '').trim();
            const accTypeStr = String(acc.accident_type || '').trim();
            const accCatStr = String(acc.category || '').trim();
            
            const matchType = 
              (accTypeStr && logTypeStr.includes(accTypeStr)) || 
              (accCatStr && logTypeStr.includes(accCatStr)) || 
              logTypeStr === accTypeStr;
            
            if (matchSite && matchType) {
              const logDate = new Date(log.date);
              if (!isNaN(logDate.getTime())) {
                if (logDate >= oneMonthAgo && logDate < startTarget) {
                  beforeCount += Number(log.count || log.合計 || 1);
                }
                if (logDate >= startTarget && logDate <= oneMonthLater) {
                  afterCount += Number(log.count || log.合計 || 1);
                }
              }
            }
          });
        }
      }

      const isImproved = afterCount <= beforeCount;
      const statusLabel = isImproved ? "🟢 改善！" : "⚠️ 効果なし。対策やり直し対象";

      return {
        ...acc,
        beforeCount,
        afterCount,
        isImproved,
        statusLabel
      };
    });
  }, [allAccidents, accSheetLogs]);

  const filteredAccidents = useMemo(() => {
    return processedAccidents.filter(a => {
      const dParts = (a.dateStr || '').replace(/-/g, '/').split('/');
      const y = dParts[0] || '';
      const m = dParts[1] ? dParts[1].padStart(2, '0') : '';
      const searchLow = accSearchQuery.toLowerCase();
      
      const matchSearch = accSearchQuery === '' || 
        (a.title || '').toLowerCase().includes(searchLow) || 
        (a.effect || '').toLowerCase().includes(searchLow) || 
        (a.accident_type || '').toLowerCase().includes(searchLow) ||
        (LOCATION_NAME_MAP[a.location_id] || a.location_id).toLowerCase().includes(searchLow);
      
      const matchBasic = (accYearFilter === 'all' || y === accYearFilter) && 
                         (accMonthFilter === 'all' || m === accMonthFilter) && 
                         (accLocationFilter === 'all' || a.location_id === accLocationFilter) && 
                         matchSearch;

      if (!matchBasic) return false;
      if (accViewTab === 'improved') return a.isImproved;
      if (accViewTab === 'retry') return !a.isImproved;
      return true;
    });
  }, [processedAccidents, accYearFilter, accMonthFilter, accLocationFilter, accSearchQuery, accViewTab]);

  const accCountByLocation = useMemo(() => {
    const counts: { [key: string]: number } = {};
    filteredAccidents.forEach(a => {
      const locName = LOCATION_NAME_MAP[a.location_id] || a.location_id;
      counts[locName] = (counts[locName] || 0) + 1;
    });
    const sorted = Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    const maxVal = sorted.length > 0 ? Math.max(...sorted.map(d => d.value)) : 1;
    const adjustedMax = Math.ceil(maxVal * 1.15);
    return sorted.map(d => ({ ...d, maxValue: adjustedMax }));
  }, [filteredAccidents]);

  const maxAccBarValue = accCountByLocation.length > 0 ? accCountByLocation[0].maxValue : 1;

  const modernTooltipStyle = {
    backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(12px)', border: '1px solid #e2e8f0', borderRadius: '16px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', fontWeight: 'bold', color: '#1e293b', padding: '16px'
  };

  const areaDisplayName = selectedArea === 'all' ? '全社' : selectedArea === 'kanto' ? '関東エリア' : selectedArea === 'kansai' ? '関西エリア' : selectedArea === 'chubu' ? '中部エリア' : selectedArea === 'cleanness' ? 'クリンネス部門' : selectedArea === 'productivity' ? '生産性ボード' : selectedArea === 'accidents' ? '事故対策ビュー' : '全拠点アクション';

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
    <div className="flex h-screen w-full bg-[#f8fafc] text-slate-800 font-sans overflow-hidden notranslate" translate="no">
      <svg width="0" height="0">
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#f87171" stopOpacity={1}/>
            <stop offset="100%" stopColor="#ec4899" stopOpacity={1}/>
          </linearGradient>
          <radialGradient id="bubbleGrad" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.8}/>
            <stop offset="100%" stopColor="#0284c7" stopOpacity={0.4}/>
          </radialGradient>
        </defs>
      </svg>

      <aside className="w-16 md:w-20 bg-white border-r border-slate-200 flex flex-col items-center py-4 space-y-3 shrink-0 z-10 shadow-sm overflow-y-auto">
        <a href="https://palproductivity-dashboard.vercel.app/" className="p-2 text-slate-400 hover:text-blue-600 transition-colors mb-2">
          {/* 💡 SVGアイコンのエラー修正済み */}
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </a>
        <div className="w-full border-t border-slate-100 my-1"></div>
        
        {['all', 'kanto', 'chubu', 'kansai', 'cleanness', 'productivity', 'actions', 'accidents'].map((area) => (
          <button 
            key={area} onClick={() => { setSelectedArea(area as any); setActiveTopTab(area === 'actions' ? 'actions' : area === 'productivity' ? 'productivity' : area === 'accidents' ? 'accidents' : 'dashboard'); }} 
            className={`w-12 h-12 md:w-14 md:h-14 rounded-xl flex flex-col items-center justify-center gap-0.5 md:gap-1 transition-all text-[9px] md:text-[10px] font-black shrink-0 ${selectedArea === area ? (area === 'actions' ? 'bg-purple-600 text-white shadow-md' : area === 'productivity' ? 'bg-indigo-600 text-white shadow-md' : area === 'accidents' ? 'bg-rose-600 text-white shadow-md' : 'bg-blue-600 text-white shadow-md') : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700'}`}
          >
            {area === 'all' ? <Globe size={15} /> : area === 'cleanness' ? <Sparkles size={15} /> : area === 'actions' ? <Rocket size={15} /> : area === 'productivity' ? <Activity size={15} /> : area === 'accidents' ? <ShieldAlert size={15} /> : <MapPin size={15} />}
            <span>{area === 'all' ? '全社' : area === 'kanto' ? '関東' : area === 'chubu' ? '中部' : area === 'kansai' ? '関西' : area === 'cleanness' ? 'ｸﾘﾝﾈｽ' : area === 'productivity' ? '生産性' : area === 'accidents' ? '事故対策' : 'ｱｸｼｮﾝ'}</span>
          </button>
        ))}
      </aside>

      <AnimatePresence mode="wait">
        {activeTopTab === 'accidents' ? (
          <motion.main key="accidents" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col h-full overflow-hidden w-full relative bg-rose-50/30">
            <header className="px-4 md:px-6 py-4 flex flex-col md:flex-row md:items-center justify-between shrink-0 bg-white border-b border-rose-200 z-30 gap-4">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="p-2 bg-rose-100 rounded-lg border border-rose-200"><AlertTriangle className="w-6 h-6 md:w-8 md:h-8 text-rose-600" /></div>
                <div>
                  <h1 className="text-lg md:text-2xl font-extrabold text-slate-800 tracking-tight">事故・インシデント対策ビュー</h1>
                  <p className="text-[11px] font-bold text-slate-500 mt-0.5">現場別の事故対策一覧と、前後1ヶ月のログ自動効果検証</p>
                </div>
              </div>
              <div className="relative w-full md:w-72">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="事故種別、内容、拠点で検索..." value={accSearchQuery} onChange={(e) => setAccSearchQuery(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-sm font-bold text-slate-700 pl-9 pr-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-sm transition-all" />
              </div>
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 w-full space-y-6 relative">
              <div className="flex flex-col bg-white p-4 rounded-xl border border-rose-200 shadow-sm gap-4">
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                  <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1 shadow-sm w-full xl:w-auto">
                    <button onClick={() => setAccViewTab('all')} className={`flex-1 xl:flex-none px-5 py-2 rounded-lg text-xs font-black transition-all ${accViewTab === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>すべて ({processedAccidents.length})</button>
                    <button onClick={() => setAccViewTab('improved')} className={`flex-1 xl:flex-none px-5 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1 ${accViewTab === 'improved' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-emerald-600'}`}>🟢 改善された対策 ({processedAccidents.filter(a => a.isImproved).length})</button>
                    <button onClick={() => setAccViewTab('retry')} className={`flex-1 xl:flex-none px-5 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1 ${accViewTab === 'retry' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-rose-600'}`}>🚨 やり直し対象 ({processedAccidents.filter(a => !a.isImproved).length})</button>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400">対象拠点:</span>
                      <CustomDropdown value={accLocationFilter === 'all' ? 'すべての拠点' : (LOCATION_NAME_MAP[accLocationFilter] || accLocationFilter)} options={['すべての拠点', ...availableAccLocations.map(l => LOCATION_NAME_MAP[l] || l)]} onChange={(val: string) => {
                        if(val === 'すべての拠点') setAccLocationFilter('all');
                        else setAccLocationFilter(Object.keys(LOCATION_NAME_MAP).find(k => LOCATION_NAME_MAP[k] === val) || val);
                      }} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400">発生時期:</span>
                      <CustomDropdown value={accYearFilter === 'all' ? 'すべての年' : `${accYearFilter}年`} options={['すべての年', ...availableAccYears.map(y => `${y}年`)]} onChange={(val: string) => setAccYearFilter(val === 'すべての年' ? 'all' : val.replace('年', ''))} />
                      <CustomDropdown value={accMonthFilter === 'all' ? 'すべての月' : `${parseInt(accMonthFilter, 10)}月`} options={['すべての月', ...['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => `${parseInt(m, 10)}月`)]} onChange={(val: string) => setAccMonthFilter(val === 'すべての月' ? 'all' : val.replace('月', '').padStart(2, '0'))} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col lg:flex-row gap-6 items-start relative">
                <div className="w-full lg:w-[55%] xl:w-[60%] order-2 lg:order-1">
                  {filteredAccidents.length === 0 ? (
                    <div className="bg-white border border-slate-200 p-12 rounded-3xl text-center text-slate-400 font-bold text-sm shadow-sm">💡 条件に一致する事故データがありません。</div>
                  ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-5">
                      {filteredAccidents.map((item, idx) => {
                        const locName = LOCATION_NAME_MAP[item.location_id] || item.location_id;
                        return (
                          <div key={idx} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-3 relative overflow-hidden transition-all hover:shadow-md group">
                            <div className={`absolute top-0 left-0 w-1.5 h-full ${item.isImproved ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                            
                            <div className="flex justify-between items-start pl-2">
                              <div className="flex flex-wrap gap-1.5 items-center">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black text-white shadow-sm ${item.isImproved ? 'bg-emerald-500' : 'bg-rose-500'}`}>{locName}</span>
                                {item.dateStr && <span className="text-[10px] font-bold text-slate-400">📅 開始日: {item.dateStr}</span>}
                                {item.accident_type && <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 shadow-sm">{item.accident_type}</span>}
                              </div>
                            </div>
                            
                            <h3 className="text-sm font-black text-slate-800 leading-snug pl-2">{item.title !== 'EMPTY' ? item.title : '【詳細未登録】'}</h3>
                            <p className="text-[10px] font-bold text-slate-400 pl-2 -mt-2">管理番号: {item.accident_no !== 'EMPTY' ? item.accident_no : '未採番'}</p>

                            <div className="w-full space-y-3 mt-auto pl-2 pt-2">
                              {item.effect && item.effect !== "EMPTY" && (
                                <div className="text-[11px] font-medium text-slate-600 p-2.5 rounded-xl border border-slate-100 line-clamp-3 bg-slate-50">
                                  <span className="text-slate-800 font-black mr-1">💡 狙う効果・概要:</span>{item.effect}
                                </div>
                              )}

                              <div className={`border rounded-xl p-3 space-y-2.5 relative overflow-hidden ${item.isImproved ? 'bg-emerald-50/40 border-emerald-100' : 'bg-rose-50/40 border-rose-100'}`}>
                                <div className="flex justify-between items-center relative z-10">
                                  <span className="text-[10px] font-black text-slate-600 flex items-center gap-1">📊 対策の効果検証 ([{item.category || '未分類'}])</span>
                                  <span className={`text-[10px] font-black px-2 py-0.5 rounded shadow-sm text-white ${item.isImproved ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}>
                                    {item.statusLabel}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-[11px] font-black relative z-10">
                                  <span className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 shadow-sm">対策前(1ヶ月): {item.beforeCount}件</span>
                                  <span className="text-slate-300">→</span>
                                  <span className={`px-2.5 py-1.5 rounded-lg border shadow-sm ${item.isImproved ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-rose-50 border-rose-200 text-rose-600'}`}>対策後(1ヶ月): {item.afterCount}件</span>
                                </div>
                              </div>

                              {item.url && item.url !== "EMPTY" && (
                                <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex w-fit items-center gap-1 mt-1 text-[10px] font-black hover:underline transition-colors px-2 py-1.5 rounded-lg border border-transparent bg-slate-50 text-rose-600">
                                  <FileText size={12} /> ワークフローを開く
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="w-full lg:w-[45%] xl:w-[40%] bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col h-[500px] lg:sticky lg:top-4 order-1 lg:order-2">
                  <div className="flex items-center justify-between mb-4 shrink-0 border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <ShieldAlert size={16} className="text-rose-500" />
                      拠点別 事故・対策件数ランキング
                    </h3>
                  </div>
                  <div className="flex-1 w-full min-h-0 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={accCountByLocation} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                        <XAxis type="number" hide domain={[0, maxAccBarValue]} xAxisId={0} />
                        <XAxis type="number" hide domain={[0, maxAccBarValue]} xAxisId={1} />
                        <YAxis dataKey="name" type="category" width={100} interval={0} tickFormatter={(v: any) => String(v).length > 8 ? `${String(v).slice(0, 8)}…` : v} tick={{ fontSize: 11, fill: '#374151', textAnchor: 'end', dy: 4 }} axisLine={false} tickLine={false} />
                        <RechartsTooltip cursor={{ fill: 'rgba(255, 228, 230, 0.5)' }} contentStyle={modernTooltipStyle} formatter={(val: any, name: any) => name === 'maxValue' ? [] : [`${val}件`, '件数']} />
                        <Bar dataKey="maxValue" fill="#f3f4f6" radius={[0, 6, 6, 0]} barSize={16} animationDuration={0} xAxisId={0} />
                        <Bar dataKey="value" fill="#f43f5e" radius={[0, 6, 6, 0]} barSize={16} animationDuration={1000} xAxisId={1}>
                          <LabelList dataKey="value" position="right" fill="#f43f5e" fontSize={12} fontWeight="bold" offset={10} formatter={(v: any) => `${v}件`} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </motion.main>

        ) : activeTopTab === 'productivity' ? (
          <motion.main key="prod" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col h-full overflow-hidden w-full relative bg-slate-50/50">
            <header className="px-6 py-5 flex flex-col md:flex-row md:items-center justify-between shrink-0 bg-white border-b border-slate-200 z-30 shadow-sm gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 rounded-lg border border-indigo-100"><Activity className="w-6 h-6 text-indigo-600" /></div>
                <div>
                  <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">全拠点 パフォーマンスボード</h1>
                  <p className="text-[11px] font-bold text-slate-400 mt-0.5">現場別の生産性・物量・工数を可視化</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-lg border border-slate-200 shadow-inner">
                  <span className="text-[10px] font-bold text-slate-400 mr-2 ml-1">エリア絞り込み:</span>
                  <label className="flex items-center gap-1 cursor-pointer text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors px-2">
                    <input type="checkbox" checked={prodAreaFilters.kanto} onChange={(e) => setProdAreaFilters(p => ({...p, kanto: e.target.checked}))} className="accent-indigo-600 w-3.5 h-3.5" />
                    関東
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors px-2 border-l border-slate-300">
                    <input type="checkbox" checked={prodAreaFilters.chubu} onChange={(e) => setProdAreaFilters(p => ({...p, chubu: e.target.checked}))} className="accent-indigo-600 w-3.5 h-3.5" />
                    中部
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors px-2 border-l border-slate-300">
                    <input type="checkbox" checked={prodAreaFilters.kansai} onChange={(e) => setProdAreaFilters(p => ({...p, kansai: e.target.checked}))} className="accent-indigo-600 w-3.5 h-3.5" />
                    関西
                  </label>
                </div>
                <CustomDropdown value={selectedMonth} options={months} onChange={setSelectedMonth} align="right" />
              </div>
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 w-full space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 shrink-0">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col relative overflow-hidden group hover:shadow-md transition-shadow">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none transition-transform group-hover:scale-110"></div>
                  <p className="text-[11px] font-black text-slate-500 mb-1 relative z-10 flex items-center gap-1.5"><Activity size={14} className="text-indigo-500"/>選択エリア平均 作業生産性</p>
                  <div className="flex items-end justify-between relative z-10 mt-auto">
                    <p className="text-4xl font-extrabold text-slate-900 tracking-tighter"><AnimatedNumber value={siteCardsData.totals.currentAvgProd.toFixed(1)}/></p>
                    <div className="flex flex-col gap-1 w-24">
                      <DiffBadge curr={siteCardsData.totals.currentAvgProd} prev={siteCardsData.totals.prevAvgProd} asPercentChange label="vs先月" />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col relative overflow-hidden group hover:shadow-md transition-shadow">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none transition-transform group-hover:scale-110"></div>
                  <p className="text-[11px] font-black text-slate-500 mb-1 relative z-10 flex items-center gap-1.5"><Layers size={14} className="text-blue-500"/>選択エリア合算 総物量</p>
                  <div className="flex items-end justify-between relative z-10 mt-auto">
                    <p className="text-4xl font-extrabold text-slate-900 tracking-tighter"><AnimatedNumber value={Math.round(siteCardsData.totals.totalVol).toLocaleString()}/></p>
                    <div className="flex flex-col gap-1 w-24">
                      <DiffBadge curr={siteCardsData.totals.totalVol} prev={siteCardsData.totals.prevTotalVol} label="vs先月" />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col relative overflow-hidden group hover:shadow-md transition-shadow">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none transition-transform group-hover:scale-110"></div>
                  <p className="text-[11px] font-black text-slate-500 mb-1 relative z-10 flex items-center gap-1.5"><Target size={14} className="text-rose-500"/>選択エリア合算 総工数</p>
                  <div className="flex items-end justify-between relative z-10 mt-auto">
                    <p className="text-4xl font-extrabold text-slate-900 tracking-tighter"><AnimatedNumber value={Math.round(siteCardsData.totals.totalHrs).toLocaleString()}/></p>
                    <div className="flex flex-col gap-1 w-24">
                      <DiffBadge curr={siteCardsData.totals.totalHrs} prev={siteCardsData.totals.prevTotalHrs} isInverse label="vs先月" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col h-[320px]">
                <div className="flex justify-between items-center mb-4 shrink-0">
                  <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                    <TrendingUp size={16} className="text-indigo-500" /> エリア内 全現場推移チャート: 作業生産性
                  </h3>
                </div>
                <div className="flex-1 w-full min-h-0 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={productivityChartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                      <RechartsTooltip content={<ProductivityTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 2, strokeDasharray: '5 5' }} />
                      <Legend wrapperStyle={{ fontSize: 10, fontWeight: 'bold', paddingTop: '10px' }} />
                      {uniqueSitesProd.map((site, idx) => (
                        <Line key={site} type="monotone" dataKey={site} stroke={PROD_COLORS[idx % PROD_COLORS.length]} strokeWidth={2.5} dot={{ r: 3, strokeWidth: 1.5 }} activeDot={{ r: 6 }} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {siteCardsData.list.map((card, idx) => (
                  <div key={card.site} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm hover:shadow-lg transition-all flex flex-col min-h-[440px] relative overflow-hidden group">
                    
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-extrabold text-slate-800 text-[15px] flex items-center gap-1.5 z-10">
                        <MapPin size={16} className="text-indigo-400"/>
                        {card.site}
                      </h3>
                      <div className="bg-slate-100 text-slate-500 px-2 py-1 rounded-md text-[10px] font-black border border-slate-200 shadow-sm z-10 flex items-center gap-1">
                        <Calendar size={12} /> {selectedMonth} 実績
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-4 z-10">
                      <div className="bg-slate-50/80 p-2 rounded-xl border border-slate-100 flex flex-col items-center text-center">
                        <p className="text-[9px] font-bold text-slate-400 mb-0.5">生産性</p>
                        <p className="text-base font-black text-indigo-600 tracking-tight">{card.current.prod.toFixed(1)}</p>
                        <div className="flex flex-col w-full gap-1 mt-1.5 px-0.5">
                          <DiffBadge curr={card.current.prod} prev={card.prev.prod} asPercentChange label="vs先月" />
                          <DiffBadge curr={card.current.prod} prev={card.prev2.prod} asPercentChange label="vs先々月" />
                        </div>
                      </div>
                      <div className="bg-slate-50/80 p-2 rounded-xl border border-slate-100 flex flex-col items-center text-center">
                        <p className="text-[9px] font-bold text-slate-400 mb-0.5">物量</p>
                        <p className="text-[13px] font-black text-slate-700 tracking-tight mt-1">{Math.round(card.current.vol).toLocaleString()}</p>
                        <div className="flex flex-col w-full gap-1 mt-2 px-0.5">
                          <DiffBadge curr={card.current.vol} prev={card.prev.vol} label="vs先月" />
                          <DiffBadge curr={card.current.vol} prev={card.prev2.vol} label="vs先々月" />
                        </div>
                      </div>
                      <div className="bg-slate-50/80 p-2 rounded-xl border border-slate-100 flex flex-col items-center text-center">
                        <p className="text-[9px] font-bold text-slate-400 mb-0.5">工数</p>
                        <p className="text-[13px] font-black text-slate-700 tracking-tight mt-1">{Math.round(card.current.hrs).toLocaleString()}</p>
                        <div className="flex flex-col w-full gap-1 mt-2 px-0.5">
                          <DiffBadge curr={card.current.hrs} prev={card.prev.hrs} isInverse label="vs先月" />
                          <DiffBadge curr={card.current.hrs} prev={card.prev2.hrs} isInverse label="vs先々月" />
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 w-full relative z-10 mt-2 border-t border-slate-100 pt-3">
                      <p className="text-[9px] font-bold text-slate-300 absolute top-3 left-0 z-0">12 Month Trend (Prod, Vol, Hrs)</p>
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={card.trendData} margin={{ top: 15, right: 5, left: 5, bottom: 5 }}>
                          <YAxis yAxisId="vol" domain={['auto', 'auto']} hide />
                          <YAxis yAxisId="hrs" domain={['auto', 'auto']} hide />
                          <YAxis yAxisId="prod" domain={['auto', 'auto']} hide />
                          <RechartsTooltip 
                            contentStyle={{...modernTooltipStyle, padding: '8px'}} 
                            formatter={(value: any, name: any) => {
                              if (name === "prod") return [Number(value).toFixed(1), "生産性"];
                              if (name === "vol") return [Number(value).toLocaleString(), "物量"];
                              if (name === "hrs") return [Number(value).toLocaleString(), "工数"];
                              return [value, name];
                            }}
                            labelStyle={{fontSize: '10px', color: '#64748b', fontWeight: 'bold', marginBottom: '4px'}}
                          />
                          <Area yAxisId="vol" type="monotone" dataKey="vol" fill="#e0f2fe" stroke="none" name="vol" />
                          <Bar yAxisId="hrs" dataKey="hrs" fill="#fecdd3" name="hrs" radius={[2,2,0,0]} barSize={8} />
                          <Line yAxisId="prod" type="monotone" dataKey="prod" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 0 }} activeDot={{ r: 4, strokeWidth: 0 }} name="prod" />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                    
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  </div>
                ))}
              </div>

            </div>
          </motion.main>

        ) : activeTopTab === 'actions' ? (
          <motion.main key="actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col h-full overflow-hidden w-full relative">
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
                      <CustomDropdown value={actionLocationFilter === 'all' ? 'すべての拠点' : (LOCATION_NAME_MAP[actionLocationFilter] || actionLocationFilter)} options={['すべての拠点', ...availableActionLocations.map(l => LOCATION_NAME_MAP[l] || l)]} onChange={(val: string) => {
                        if(val === 'すべての拠点') setActionLocationFilter('all');
                        else {
                          const originalKey = Object.keys(LOCATION_NAME_MAP).find(k => LOCATION_NAME_MAP[k] === val) || val;
                          setActionLocationFilter(originalKey);
                        }
                      }} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400">時期:</span>
                      <CustomDropdown value={actionYearFilter === 'all' ? 'すべての年' : `${actionYearFilter}年`} options={['すべての年', ...availableActionYears.map(y => `${y}年`)]} onChange={(val: string) => setActionYearFilter(val === 'すべての年' ? 'all' : val.replace('年', ''))} />
                      <CustomDropdown value={actionMonthFilter === 'all' ? 'すべての月' : `${parseInt(actionMonthFilter, 10)}月`} options={['すべての月', ...['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => `${parseInt(m, 10)}月`)]} onChange={(val: string) => setActionMonthFilter(val === 'すべての月' ? 'all' : val.replace('月', '').padStart(2, '0'))} />
                    </div>
                  </div>
                </div>

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

              <div className="flex flex-col lg:flex-row gap-6 items-start relative">
                <div className="w-full lg:w-[55%] xl:w-[60%] order-2 lg:order-1">
                  {(() => {
                    if (filteredActionsForView.length === 0) {
                      return <div className="bg-white border border-slate-200 p-12 rounded-3xl text-center text-slate-400 font-bold text-sm shadow-sm">💡 条件に一致するアクションデータがありません。</div>;
                    }

                    if (actionCategory === 'dx' || actionCategory === 'env') {
                      const themeColor = actionCategory === 'dx' ? '#9333ea' : '#10b981'; 
                      const bgLightColor = actionCategory === 'dx' ? 'bg-purple-50' : 'bg-emerald-50';
                      return (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-5">
                          {filteredActionsForView.map((item, idx) => {
                            const itemRatio = Math.min(100, Math.max(0, Math.round(Number(item.ratio) || 0)));
                            const locName = LOCATION_NAME_MAP[item.location_id] || item.location_id;
                            return (
                              <div key={idx} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-3 relative overflow-hidden transition-all hover:shadow-md group">
                                <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: themeColor }}></div>
                                
                                <div className="flex justify-between items-start pl-2">
                                  <div className="flex flex-wrap gap-1.5 items-center">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-black text-white shadow-sm" style={{ backgroundColor: themeColor }}>{locName}</span>
                                    {item.dateStr && <span className="text-[10px] font-bold text-slate-400">📅 {item.dateStr}</span>}
                                    
                                    {item.customer_related === 'あり' ? (
                                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200 shadow-sm">🚨 顧客関連</span>
                                    ) : (
                                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-50 text-slate-500 border border-slate-200 shadow-sm">🏢 社内施策</span>
                                    )}
                                  </div>
                                </div>
                                
                                <h3 className="text-sm font-black text-slate-800 leading-snug pl-2">{item.name}</h3>
                                
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
                      return (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-5">
                          {filteredActionsForView.map((log, idx) => {
                            const locName = LOCATION_NAME_MAP[log.location_id] || log.location_id;
                            return (
                              <div key={idx} className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-col space-y-3 relative overflow-hidden hover:shadow-md transition-all group">
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500"></div>

                                <div className="flex justify-between items-start pl-2">
                                  <div className="flex flex-wrap gap-1.5 items-center">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-black text-white shadow-sm bg-rose-500">{locName}</span>
                                    {log.dateStr && <span className="text-[10px] font-bold text-slate-400">📅 {log.dateStr}</span>}
                                    
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
                                    <a href={log.url} target="_blank" rel="noopener noreferrer" className="inline-flex w-fit items-center gap-1 mt-1 text-[10px] font-black hover:underline transition-colors px-2 py-1.5 rounded-lg border border-transparent bg-rose-50 text-rose-600">
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
          </motion.main>
        ) : (
          <motion.main key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col h-full overflow-hidden w-full relative">
            <header className="px-4 md:px-6 py-4 flex items-end justify-between shrink-0 bg-white border-b border-slate-200 z-30">
              <div className="flex items-center gap-2 md:gap-3">
                <svg className="w-6 h-6 md:w-8 md:h-8 text-blue-700" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h2v18H3zm4 14h2v4H7zm4-6h2v10h-2zm4-4h2v14h-2zm4-4h2v18h-2z"/></svg>
                <h1 className="text-lg md:text-2xl font-extrabold text-slate-800 tracking-tight">{areaDisplayName} 業績比較ダッシュボード</h1>
              </div>
              <div className="flex gap-2">
                <CustomDropdown value={selectedMonth} options={months} onChange={setSelectedMonth} align="right" />
              </div>
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 w-full space-y-6">
              <div className="flex flex-col gap-5 w-full">
                
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

                <div className="flex flex-col lg:flex-row gap-4 h-auto lg:h-[380px] shrink-0 w-full">
                  <div className="w-full lg:w-1/2 bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col h-[320px] lg:h-full min-w-0">
                    <div className="flex items-center justify-between mb-2 shrink-0 border-b border-slate-100 pb-2">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5"><Trophy size={16} className="text-amber-500" />現場別 実績ランキング</h3>
                      <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 text-xs shadow-sm">
                        <span className="text-slate-400 font-bold text-[10px]">実績項目:</span>
                        <CustomDropdown value={rankingTarget} options={actualNumericKeys} onChange={setRankingTarget} align="right" />
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
                        <span className="text-slate-400 font-bold text-[10px]">X軸:</span>
                        <CustomDropdown value={scatterX} options={numericKeys} onChange={setScatterX} />
                        <span className="text-slate-300 font-bold ml-1">vs</span>
                        <span className="text-slate-400 font-bold text-[10px] ml-1">Y軸:</span>
                        <CustomDropdown value={scatterY} options={numericKeys} onChange={setScatterY} align="right" />
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

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 w-full">
                  
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

                <div className="flex flex-col lg:flex-row gap-4 w-full shrink-0">
                  <div className="w-full bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col h-auto">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-slate-900">現場別 最新データマトリックス (全項目プレビュー)</h3>
                    </div>
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
                  </div>
                </div>

              </div>
            </div>
          </motion.main>
        )}
      </AnimatePresence>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { height: 8px; width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; border: 2px solid transparent; background-clip: padding-box; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; border: 2px solid transparent; background-clip: padding-box; }
      `}} />
    </div>
  );
}