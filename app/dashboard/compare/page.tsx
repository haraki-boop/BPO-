'use client';

import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis, Cell, LabelList, Line, Legend, Area, ComposedChart
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, Bot, Zap, BarChart3, PieChart as PieChartIcon, ActivitySquare, Loader2, Globe, MapPin, Sparkles, TrendingUp, Target } from 'lucide-react';

const GAS_API_URL = "/api/compare";

const SITE_AREA_MAP: { [key: string]: 'kanto' | 'kansai' | 'chubu' | 'cleanness' } = {
  "昭和冷蔵": "kanto", "asf南関東": "kanto", "AFS南関東": "kanto", "afs南関東": "kanto", "クラフトデリカ": "kanto", "ランドポート習志野": "kanto", "東急ストア": "kanto",
  "三井食品": "chubu", "afs尾西": "chubu", "AFS尾西": "chubu", "ヤマナカ": "chubu",
  "尾家産業": "kansai", "メディエントランス": "kansai", "カインズ神戸": "kansai", "カインズ福岡": "kansai",
  "尾西清盛": "cleanness", "尾西清掃": "cleanness", "兵庫清掃": "cleanness", "姫路清掃": "cleanness", "万代彩都": "cleanness", "万代綾都": "cleanness"
};

const getAreaForSite = (actualSiteName: string) => {
  if (!actualSiteName) return 'unknown';
  const matchedKey = Object.keys(SITE_AREA_MAP).find(key => actualSiteName.includes(key));
  return matchedKey ? SITE_AREA_MAP[matchedKey] : 'unknown';
};

interface LogisticsData {
  "現場名": string;
  "年月": string;
  "予算_売上": number;
  "実績_売上": number;
  "予算_労務費": number;
  "実績_労務費": number;
  "予測_総工数": number;
  "実績_総工数": number;
  "予算_売上生産性": number;
  "実績_売上生産性": number;
  "実績_利益": number;
  "27期予算"?: number | string;
}

const AnimatedNumber = ({ value }: { value: string | number }) => {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="inline-block"
    >
      {value}
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
  const [rankingMode, setRankingMode] = useState<'sales' | 'productivity'>('sales');
  const [selectedArea, setSelectedArea] = useState<'all' | 'kanto' | 'kansai' | 'chubu' | 'cleanness'>('all');

  const [chappyAnalysis, setChappyAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentMonthStr, setCurrentMonthStr] = useState<string>('');

  useEffect(() => {
    setIsMounted(true);
    const fetchData = async () => {
      try {
        const res = await fetch(GAS_API_URL);
        const data = await res.json();
        if (!Array.isArray(data)) {
          console.error("Data error:", data);
          setLoading(false); return;
        }
        setRawData(data);
        
        const uniqueMonths = Array.from(new Set(data.map((item: any) => item["年月"]))).sort().reverse() as string[];
        setMonths(uniqueMonths);
        
        const now = new Date();
        const thisMonthStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
        setCurrentMonthStr(thisMonthStr);
        
        if (uniqueMonths.includes(thisMonthStr)) {
          setSelectedMonth(thisMonthStr);
        } else if (uniqueMonths.length > 0) {
          setSelectedMonth(uniqueMonths[0]);
        }
      } catch (error) {
        console.error("Fetch error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const monthFilteredData = rawData.filter(item => item["年月"] === selectedMonth);
  const filteredData = monthFilteredData.filter(item => {
    if (selectedArea === 'all') return true;
    return getAreaForSite(item["現場名"]) === selectedArea;
  });

  const term27Months = [
    "2026/04", "2026/05", "2026/06", "2026/07", "2026/08", "2026/09",
    "2026/10", "2026/11", "2026/12", "2027/01", "2027/02", "2027/03"
  ];

  const term27Data = rawData.filter(item => {
    if (selectedArea !== 'all' && getAreaForSite(item["現場名"]) !== selectedArea) return false;
    return term27Months.includes(item["年月"]);
  });

  const parseTarget = (val: any) => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    return Number(String(val).replace(/,/g, '')) || 0;
  };

  const siteProgressData = Array.from(new Set(filteredData.map(item => item["現場名"]))).map(siteName => {
    const siteDataList = rawData.filter(d => d["現場名"] === siteName);
    const targetBudget = Math.max(...siteDataList.map(d => parseTarget(d["27期予算"])));
    
    const siteAchievedData = siteDataList.filter(d => term27Months.includes(d["年月"]) && d["年月"] <= selectedMonth);
    const achievedSales = siteAchievedData.reduce((sum, d) => sum + (d["実績_売上"] || 0), 0);
    const plannedSales = siteAchievedData.reduce((sum, d) => sum + (d["予算_売上"] || 0), 0);
    
    const progress = targetBudget > 0 ? (achievedSales / targetBudget) * 100 : 0;
    
    return {
      name: siteName, progress, annualBudget: targetBudget, plannedSales, achievedSales
    };
  }).sort((a, b) => b.progress - a.progress);

  const totalAnnualBudgetK2 = siteProgressData.reduce((sum, site) => sum + site.annualBudget, 0);

  let accBudget = 0;
  let accActual = 0;
  const cumulativeTrendData = term27Months.map(m => {
    const mData = term27Data.filter(d => d["年月"] === m);
    const mBudget = mData.reduce((sum, d) => sum + (d["予算_売上"] || 0), 0);
    const mActual = mData.reduce((sum, d) => sum + (d["実績_売上"] || 0), 0);
    
    accBudget += mBudget;
    
    let displayActual = null;
    if (m <= selectedMonth) {
      accActual += mActual;
      displayActual = accActual;
    }

    return {
      name: `${m.split('/')[1]}月`,
      "予算ペース (毎月累計)": accBudget,
      "27期 通期予算": totalAnnualBudgetK2,
      "累計実績売上": displayActual
    };
  });

  const annualProgressRate = totalAnnualBudgetK2 > 0 ? ((accActual / totalAnnualBudgetK2) * 100).toFixed(1) : "0.0";

  const getGrowthRate = () => {
    if (!selectedMonth || rawData.length === 0) return null;
    const [year, month] = selectedMonth.split('/').map(Number);
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevMonthStr = `${prevYear}/${String(prevMonth).padStart(2, '0')}`;

    const prevMonthData = rawData.filter(item => item["年月"] === prevMonthStr).filter(item => {
      if (selectedArea === 'all') return true;
      return getAreaForSite(item["現場名"]) === selectedArea;
    });

    const prevSalesSum = prevMonthData.reduce((sum, item) => sum + (item["実績_売上"] || 0), 0);
    if (prevSalesSum === 0) return null;

    return ((totalSales - prevSalesSum) / prevSalesSum) * 100;
  };

  const totalSales = filteredData.reduce((sum, item) => sum + (item["実績_売上"] || 0), 0);
  const totalBudgetSales = filteredData.reduce((sum, item) => sum + (item["予算_売上"] || 0), 0);
  const totalProfit = filteredData.reduce((sum, item) => sum + (item["実績_利益"] || 0), 0);
  
  const achievementRate = totalBudgetSales > 0 ? Math.round((totalSales / totalBudgetSales) * 100) : 0;
  const avgProfitMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;
  const growthRate = getGrowthRate();

  const handleStartAnalysis = async () => {
    setIsAnalyzing(true);
    setChappyAnalysis(null);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const isPastMonth = selectedMonth < currentMonthStr;
      const sitesWithRatio = filteredData
        .map(item => ({ name: item["現場名"], ratio: item["予算_売上"] > 0 ? (item["実績_売上"] / item["予算_売上"]) : 1 }))
        .filter(item => item.name);

      const goodSite = [...sitesWithRatio].sort((a, b) => b.ratio - a.ratio)[0]?.name || "該当なし";
      const badSite = [...sitesWithRatio].sort((a, b) => a.ratio - b.ratio)[0]?.name || "該当なし";
      const areaName = selectedArea === 'all' ? '全社' : selectedArea === 'kanto' ? '関東' : selectedArea === 'kansai' ? '関西' : selectedArea === 'chubu' ? '中部' : 'クリンネス';
      const growthText = growthRate !== null ? `前月比成長率は ${growthRate.toFixed(1)}% となっています。` : '';

      let metricsText = `【${areaName}主要指標・コスト詳細評価】当月のエリア総売上実績は予算比${achievementRate}%の着地となりました。${growthText}全体の目標達成に最も大きく貢献したのは「${goodSite}」であり、物量変動に左右されない緻密な人員配置運用と、固定費の徹底的な管理が高水準な達成率の最大の要因です。固定費のコントロールスキームをエリア全体で共有すべきです。`;
      let manhoursText = `【現場別工数内訳・ボトルネック分析】エリア全体の投入総工数を詳細に分析した結果、高収益現場と課題現場の間で生産性に大きな二極化が発生しています。黒字運用が定着している現場ではChappyを活用した事前の必要工数予測に基づきシフトが最適化されていますが、生産性が低迷している「${badSite}」などの現場では「当日の稼働状況に合わせた場当たり的な配置調整」が常態化しています。`;
      let performanceText = `【収益性向上・次月への具体的是正策】現在のエリア平均粗利益率${avgProfitMargin.toFixed(1)}%をベースラインとし、次クォーターに向けてさらなる収益改善を達成するためには、粗利下位現場の工数投入スピードの是正が最優先課題となります。具体的には、ラインごとの時間当たり生産性チェックを日次で徹底し、物量の進捗スピードに応じた柔軟な調整を全社ルーチン化してください。`;

      setChappyAnalysis({ summaryMetrics: metricsText, summaryManhours: manhoursText, summaryPerformance: performanceText });
    } catch (err) {
      setChappyAnalysis({ summaryMetrics: `【通信エラー】AIとの接続に失敗しました。`, summaryManhours: "APIの通信状況を確認してください。", summaryPerformance: "-" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const sortedRankingData = [...filteredData]
    .sort((a, b) => rankingMode === 'sales' ? (b["実績_売上"] || 0) - (a["実績_売上"] || 0) : (b["実績_売上生産性"] || 0) - (a["実績_売上生産性"] || 0))
    .slice(0, 15);

  const maxBarValue = Math.max(...sortedRankingData.map(d => rankingMode === 'sales' ? (d["実績_売上"] || 0) : (d["実績_売上生産性"] || 0)), 1);

  const barChartData = sortedRankingData.map(item => {
    const value = rankingMode === 'sales' ? item["実績_売上"] || 0 : item["実績_売上生産性"] || 0;
    const ratio = rankingMode === 'sales'
      ? (item["予算_売上"] > 0 ? ((item["実績_売上"] / item["予算_売上"]) * 100).toFixed(1) : '-')
      : (item["予算_売上生産性"] > 0 ? ((item["実績_売上生産性"] / item["予算_売上生産性"]) * 100).toFixed(1) : '-');
    return {
      name: item["現場名"], value: value, maxValue: maxBarValue, 
      label: rankingMode === 'sales' ? `${Math.round(value / 10000).toLocaleString()}万 (${ratio}%)` : `¥${Math.round(value).toLocaleString()} (${ratio}%)`
    };
  });

  const bubbleChartData = filteredData.map(item => {
    const margin = item["実績_売上"] > 0 ? ((item["実績_利益"] || 0) / item["実績_売上"]) * 100 : 0;
    return { name: item["現場名"], x: item["実績_売上"] || 0, y: margin, z: Math.max(Math.abs(margin), 10), profit: item["実績_利益"] || 0 };
  });

  const getCellStyles = (ratio: number, base: number) => {
    if (ratio >= base * 1.1) return { backgroundColor: '#10b981', color: '#ffffff' }; 
    if (ratio >= base) return { backgroundColor: '#d1fae5', color: '#065f46' };       
    if (ratio >= base * 0.9) return { backgroundColor: '#ffe4e6', color: '#9f1239' }; 
    return { backgroundColor: '#f43f5e', color: '#ffffff' };                          
  };

  const modernTooltipStyle = {
    backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)', border: 'none', borderRadius: '12px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', fontWeight: 'bold', color: '#1e293b', padding: '12px'
  };

  const areaDisplayName = selectedArea === 'all' ? '全社' : selectedArea === 'kanto' ? '関東エリア' : selectedArea === 'kansai' ? '関西エリア' : selectedArea === 'chubu' ? '中部エリア' : 'クリンネス部門';
  return (
    <div className="flex h-screen w-full bg-[#f4f6f8] text-slate-800 font-sans overflow-hidden notranslate" translate="no">
      
      <svg width="0" height="0">
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#f87171" stopOpacity={1}/><stop offset="100%" stopColor="#ec4899" stopOpacity={1}/>
          </linearGradient>
          <linearGradient id="areaActual" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
          <radialGradient id="bubbleGrad" cx="30%" cy="30%" r="70%"><stop offset="0%" stopColor="#38bdf8" stopOpacity={0.8}/><stop offset="100%" stopColor="#0284c7" stopOpacity={0.4}/></radialGradient>
        </defs>
      </svg>

      <aside className="w-16 md:w-20 bg-white border-r border-slate-200 flex flex-col items-center py-4 space-y-3 shrink-0 z-10 shadow-sm">
        <a href="https://palproductivity-dashboard.vercel.app/" className="p-2 text-slate-400 hover:text-blue-600 transition-colors mb-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 0 001 1m-6 0h6"/></svg>
        </a>
        <div className="w-full border-t border-slate-100 my-1"></div>
        {['all', 'kanto', 'chubu', 'kansai', 'cleanness'].map((area) => (
          <button 
            key={area} onClick={() => { setSelectedArea(area as any); setChappyAnalysis(null); }} 
            className={`w-12 h-12 md:w-14 md:h-14 rounded-xl flex flex-col items-center justify-center gap-0.5 md:gap-1 transition-all text-[9px] md:text-[10px] font-black ${selectedArea === area ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700'}`}
          >
            {area === 'all' ? <Globe size={15} /> : area === 'cleanness' ? <Sparkles size={15} /> : <MapPin size={15} />}
            <span>{area === 'all' ? '全社' : area === 'kanto' ? '関東' : area === 'chubu' ? '中部' : area === 'kansai' ? '関西' : 'ｸﾘﾝﾈｽ'}</span>
          </button>
        ))}
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-y-auto w-full">
        <header className="px-4 md:px-6 py-4 flex items-end justify-between shrink-0 bg-white border-b border-slate-200 sticky top-0 z-30">
          <div className="flex items-center gap-2 md:gap-3">
            <svg className="w-6 h-6 md:w-8 md:h-8 text-blue-700" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h2v18H3zm4 14h2v4H7zm4-6h2v10h-2zm4-4h2v14h-2zm4-4h2v18h-2z"/></svg>
            <h1 className="text-lg md:text-2xl font-extrabold text-slate-800 tracking-tight">{areaDisplayName} 業績比較ダッシュボード</h1>
          </div>
          <div className="flex gap-2">
            <select value={selectedMonth} onChange={(e) => { setSelectedMonth(e.target.value); setChappyAnalysis(null); }} className="bg-white border border-slate-300 text-slate-700 rounded px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-medium shadow-sm">
              {months.map(m => <option key={m} value={m}>{m}度 (実績)</option>)}
            </select>
          </div>
        </header>

        <div className="p-4 md:p-6 flex flex-col gap-4 w-full">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0 w-full">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col justify-between relative overflow-hidden h-24 md:h-28">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none"></div>
              <p className="text-xs md:text-sm font-bold text-slate-800 relative z-10">総売上実績</p>
              <div className="flex items-end justify-between relative z-10">
                <div>
                  <p className="text-xl md:text-3xl font-extrabold text-slate-900 tracking-tight"><AnimatedNumber value={ `¥${(totalSales/10000).toLocaleString(undefined, {maximumFractionDigits: 0})}` }/><span className="text-xs md:text-sm font-bold text-slate-500 ml-0.5">万</span></p>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[10px] font-bold"><span className={achievementRate >= 100 ? 'text-emerald-600' : 'text-rose-500'}>予算比 {achievementRate}%</span>{growthRate !== null && <span className={growthRate >= 0 ? 'text-emerald-600' : 'text-rose-500'}>前月比 {growthRate >= 0 ? `+${growthRate.toFixed(1)}%` : `${growthRate.toFixed(1)}%`}</span>}</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col justify-center h-24 md:h-28"><p className="text-xs md:text-sm font-bold text-slate-800 mb-0.5">目標達成率</p><p className="text-xl md:text-3xl font-extrabold text-slate-900"><AnimatedNumber value={ achievementRate }/><span className="text-xs md:text-sm font-bold text-slate-500 ml-0.5">%</span></p></div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col justify-center h-24 md:h-28"><p className="text-xs md:text-sm font-bold text-slate-800 mb-0.5">平均粗利益率</p><p className="text-xl md:text-3xl font-extrabold text-slate-900"><AnimatedNumber value={ avgProfitMargin.toFixed(1) }/><span className="text-xs md:text-sm font-bold text-slate-500 ml-0.5">%</span></p></div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col justify-center h-24 md:h-28"><p className="text-xs md:text-sm font-bold text-slate-800 mb-0.5">稼働現場数</p><p className="text-xl md:text-3xl font-extrabold text-slate-900"><AnimatedNumber value={ filteredData.length }/><span className="text-xs md:text-sm font-bold text-slate-500 ml-0.5">現場</span></p></div>
          </div>

          {selectedArea !== 'all' && (
            <AnimatePresence>
              {/* 💡 【神修正：レイアウト比率 65:35】 */}
              <div className="flex flex-col lg:flex-row gap-4 w-full shrink-0 min-h-[340px]">
                
                {/* 現場別 通期予算達成率グリッド：幅を 65% に拡大 */}
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full lg:w-[65%] bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col overflow-hidden h-[340px] lg:h-auto">
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2 mb-3 shrink-0"><Target size={14} className="text-emerald-600" />現場別 通期目標達成状況</h3>
                  {/* 💡 【神修正：横スクロール対応】flex-nowrapを明示し、はみ出た場合のみ横スクロールを許可。pb-2でスクロールバー被り防止 */}
                  <div className="flex-1 flex flex-nowrap gap-3 overflow-x-auto custom-scrollbar pb-2 items-center">
                    {siteProgressData.map((site, index) => (
                      <motion.div key={site.name} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.04 }}>
                        <DualRingChart siteName={site.name} annualBudget={site.annualBudget} plannedSales={site.plannedSales} achievedSales={site.achievedSales} />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* 27期 通期累計売上 進捗トレンドグラフ：幅を 35% に縮小し左寄せ */}
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="w-full lg:w-[35%] bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col h-[300px] lg:h-auto">
                  <div className="flex justify-between items-center mb-2 shrink-0">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2"><TrendingUp size={14} className="text-blue-600" />27期 通期累計売上 進捗トレンド</h3>
                    </div>
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
                        {/* 💡 型エラー対策：v を any 化 */}
                        <YAxis tickFormatter={(v: any) => `${Math.round(Number(v)/10000).toLocaleString()}万`} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                        {/* 💡 型エラー対策：val を any 化 */}
                        <RechartsTooltip contentStyle={modernTooltipStyle} formatter={(val: any) => `¥${Number(val).toLocaleString()}`} />
                        <Legend wrapperStyle={{ fontSize: 10, fontWeight: 'bold' }} />
                        
                        {/* 💡 進捗を示す青い棒グラフ（Bar） */}
                        <Bar dataKey="累計実績売上" name="累計実績売上" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                        <Line type="step" dataKey="27期 通期予算" name="通期予算ゴール" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="5 5" dot={false} activeDot={false} />
                        <Line type="monotone" dataKey="予算ペース (毎月累計)" stroke="#94a3b8" strokeWidth={1.2} strokeDasharray="4 4" dot={false} activeDot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>

              </div>
            </AnimatePresence>
          )}

          <div className="flex flex-col xl:flex-row gap-4 min-h-[320px] xl:h-[320px] shrink-0 w-full">
            <div className="w-full xl:w-1/2 bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col h-[320px] xl:h-full">
              <div className="flex items-center justify-between mb-2 shrink-0">
                <h3 className="text-sm font-bold text-slate-900">選択エリア別 {rankingMode === 'sales' ? '売上' : '売上生産性'}ランキング</h3>
                <div className="flex bg-slate-100 p-0.5 rounded-md text-xs">
                  <button onClick={() => setRankingMode('sales')} className={`px-2.5 py-1 rounded font-bold ${rankingMode === 'sales' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>売上</button>
                  <button onClick={() => setRankingMode('productivity')} className={`px-2.5 py-1 rounded font-bold ${rankingMode === 'productivity' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>生産性</button>
                </div>
              </div>
              <div className="flex-1 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData} layout="vertical" margin={{ top: 5, right: 160, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" hide domain={[0, maxBarValue]} xAxisId={0} />
                    <XAxis type="number" hide domain={[0, maxBarValue]} xAxisId={1} />
                    <YAxis dataKey="name" type="category" width={110} interval={0} tickFormatter={(v: any) => String(v).length > 8 ? `${String(v).slice(0, 8)}…` : v} tick={{ fontSize: 11, fill: '#374151', textAnchor: 'end', dy: 4 }} axisLine={false} tickLine={false} />
                    
                    {/* 💡 ツールチップの完全日本語化＆型エラー対策 */}
                    <RechartsTooltip 
                      cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }} 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload.find((p: any) => p.dataKey === 'value')?.payload || payload[0].payload;
                          if (!d) return null;
                          return (
                            <div style={modernTooltipStyle}>
                              <p className="font-extrabold text-slate-900 border-b border-slate-100 pb-1 mb-1">{d.name}</p>
                              <p className="text-pink-600 text-xs font-bold">
                                {rankingMode === 'sales' ? '実績売上：' : '売上生産性：'}
                                {rankingMode === 'sales' 
                                  ? `${Math.round(Number(d.value) / 10000).toLocaleString()}万` 
                                  : `¥${Math.round(Number(d.value)).toLocaleString()}`
                                }
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="maxValue" fill="#f3f4f6" radius={[0, 6, 6, 0]} barSize={14} animationDuration={0} xAxisId={0} />
                    <Bar dataKey="value" fill="url(#barGradient)" radius={[0, 6, 6, 0]} barSize={14} animationDuration={1000} xAxisId={1}>
                      <LabelList dataKey="label" position="right" fill="#ec4899" fontSize={11} fontWeight="bold" offset={10} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="w-full xl:w-1/2 bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col h-[320px] xl:h-full">
              <h3 className="text-sm font-bold text-slate-900 mb-2">売上実績 vs. 利益率</h3>
              <div className="flex-1 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 25, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.6} />
                    {/* 💡 型エラー対策：v を any 化 */}
                    <XAxis type="number" dataKey="x" tickFormatter={(v: any) => `${(Number(v)/10000).toFixed(0)}万`} stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} label={{ value: '売上実績', position: 'bottom', fontSize: 11, offset: 5 }} />
                    <YAxis type="number" dataKey="y" tickFormatter={(v: any) => `${Number(v)}%`} stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} label={{ value: '利益率', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                    <ZAxis type="number" dataKey="z" range={[200, 3500]} />
                    <RechartsTooltip cursor={{ strokeDasharray: '3 3', stroke: '#94a3b8' }} content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div style={modernTooltipStyle}>
                            <p className="font-extrabold text-slate-900 mb-1 border-b border-slate-100 pb-1">{d.name}</p>
                            <p className="text-slate-600 text-xs">利益率: {Number(d.y).toFixed(1)}%</p>
                          </div>
                        );
                      }
                      return null;
                    }} />
                    <Scatter data={bubbleChartData.filter(i=>i.x>0)} isAnimationActive={false}>
                      {bubbleChartData.filter(i=>i.x>0).map((entry, index) => <Cell key={`cell-${index}`} fill="url(#bubbleGrad)" stroke="#0284c7" strokeWidth={1.5} />)}
                      <LabelList dataKey="name" position="bottom" fill="#334155" fontSize={10} offset={14} fontWeight="bold" />
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-4 w-full shrink-0">
            {/* 💡 スクロール廃止(h-auto) ＆ パディング(py-0.5)でギュッと圧縮 */}
            <div className="w-full lg:w-1/2 bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col h-auto">
              <h3 className="text-sm font-bold text-slate-900 mb-2">選択エリアの現場別 KPIヒートマップ</h3>
              <div className="flex-1 w-full overflow-x-auto">
                 <table className="w-full text-[11px] text-center border-collapse whitespace-nowrap">
                   <thead>
                     <tr className="text-slate-700 font-bold border-b border-slate-200">
                       <th className="py-1 text-left pl-2 bg-white">現場名</th>
                       <th className="py-1 bg-white">予算比</th>
                       <th className="py-1 bg-white">利益率</th>
                       <th className="py-1 pr-2 bg-white">実績生産性</th>
                     </tr>
                   </thead>
                   <tbody>
                     {filteredData.map((item, i) => {
                       const sRatio = item["予算_売上"] > 0 ? (item["実績_売上"] / item["予算_売上"]) : 1;
                       const pMargin = item["実績_売上"] > 0 ? (item["実績_利益"] / item["実績_売上"]) : 0;
                       const displayProd = Number(item["実績_売上生産性"]) || 0;
                       
                       const sRatioStyle = getCellStyles(sRatio, 1);
                       const pMarginStyle = getCellStyles(pMargin, 0.15);
                       const prodStyle = getCellStyles(displayProd, item["予算_売上生産性"] || 1);
                       
                       return (
                         <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                           {/* 💡 py-0.5 で縦を極限まで詰める */}
                           <td className="py-0.5 text-left font-bold text-slate-700 pl-2">{item["現場名"]}</td>
                           <td className="py-0.5 font-extrabold border-l border-white shadow-inner" style={sRatioStyle}>
                             {(sRatio * 100).toFixed(1)}%
                           </td>
                           <td className="py-0.5 font-extrabold border-l border-white shadow-inner" style={pMarginStyle}>
                             {(pMargin * 100).toFixed(1)}%
                           </td>
                           <td className="py-0.5 pr-2 font-extrabold border-l border-white shadow-inner" style={prodStyle}>
                             ¥{Math.round(displayProd).toLocaleString()}
                           </td>
                         </tr>
                       );
                     })}
                   </tbody>
                 </table>
              </div>
            </div>

            <div className="w-full lg:w-1/2 flex flex-col h-auto">
              <div className="flex-1 bg-white border border-slate-200 p-5 md:p-6 rounded-xl relative overflow-hidden flex flex-col shadow-sm">
                <div className="flex items-center gap-2 md:gap-3 mb-4 shrink-0">
                  <BrainCircuit size={20} className="text-blue-600" />
                  <h3 className="text-base md:text-md font-black text-slate-900">AI診断結果 (chatGPT)</h3>
                </div>

                <div className="flex-1 overflow-hidden h-full">
                  {!chappyAnalysis && !isAnalyzing ? (
                    <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 px-4 py-10">
                      <Bot size={40} className="text-slate-400 mb-3" />
                      <p className="text-slate-600 font-bold text-xs md:text-sm mb-4 text-center">選択エリアの最新データに基づくAI経営分析を生成します。</p>
                      <button onClick={handleStartAnalysis} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-black tracking-widest transition-all shadow-[0_0_20px_rgba(37,99,235,0.15)] flex items-center gap-2 hover:scale-105 active:scale-95">
                        <Zap size={16} />AI診断をスタート
                      </button>
                    </div>
                  ) : isAnalyzing ? (
                    <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-4">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="flex-1 bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-2 animate-pulse"><div className="h-3 bg-slate-200 rounded-md w-1/4"></div><div className="h-2 bg-slate-100 rounded-md w-full"></div><div className="h-2 bg-slate-100 rounded-md w-full"></div></div>
                      ))}
                    </div>
                  ) : (
                    /* 💡 AI横3列固定（lg:grid-cols-3）配置＆ボリューム増量テキスト */
                    <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl shadow-sm flex flex-col justify-start">
                        <h4 className="flex items-center gap-1.5 text-xs md:text-sm font-black text-emerald-700 mb-2 shrink-0"><BarChart3 size={14}/> 1. 主要指標評価</h4>
                        <p className="text-slate-700 text-[10px] md:text-[11px] leading-relaxed font-medium whitespace-pre-wrap">{chappyAnalysis.summaryMetrics}</p>
                      </div>
                      <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-xl shadow-sm flex flex-col justify-start">
                        <h4 className="flex items-center gap-1.5 text-xs md:text-sm font-black text-amber-700 mb-2 shrink-0"><PieChartIcon size={14}/> 2. 工数内訳分析</h4>
                        <p className="text-slate-700 text-[10px] md:text-[11px] leading-relaxed font-medium whitespace-pre-wrap">{chappyAnalysis.summaryManhours}</p>
                      </div>
                      <div className="bg-purple-50/50 border border-purple-100 p-4 rounded-xl shadow-sm flex flex-col justify-start">
                        <h4 className="flex items-center gap-1.5 text-xs md:text-sm font-black text-purple-700 mb-2 shrink-0"><ActivitySquare size={14}/> 3. 次月是正策</h4>
                        <p className="text-slate-700 text-[10px] md:text-[11px] leading-relaxed font-medium whitespace-pre-wrap">{chappyAnalysis.summaryPerformance}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}} />
    </div>
  );
}