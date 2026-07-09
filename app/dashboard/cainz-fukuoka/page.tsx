// @ts-nocheck
'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { ArrowLeft, Activity, Calculator, TrendingUp, Calendar, Rocket, Leaf, MessageSquare, Clock, Bot, ThumbsUp, ThumbsDown, Plus, X, Building2, ChevronDown, ShieldAlert as AccidentIcon, Zap, AlertTriangle, CheckCircle2, Edit2, Loader2, Search, BrainCircuit, Printer, FileText, Eye, EyeOff, RefreshCw, Pin, Target, Award, LineChart as LineChartIcon, Copy } from 'lucide-react';
import Link from 'next/link';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, AreaChart, Area, ComposedChart, BarChart, Bar, ReferenceLine, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, LineChart as RechartsLineChart, Line as RechartsLine } from 'recharts';

// =========================================================
// 🚀 共通ユーティリティ関数
// =========================================================
const n = (val: any) => {
  if (val === undefined || val === null || val === "") return 0;
  return parseFloat(val.toString().replace(/[^0-9.-]/g, '')) || 0;
};

const getAvailableMonths = () => {
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();
  const months = [];
  for (let i = 0; i < 6; i++) {
    let m = currentMonth - i;
    let y = currentYear;
    if (m <= 0) {
      m += 12;
      y -= 1;
    }
    months.push({
      year: y,
      month: m.toString(),
      display: `${String(y).slice(-2)}年${m}月`
    });
  }
  return months.reverse();
};

const AnimatedNumber = ({ value }: { value: number }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (value === 0 || isNaN(value)) { setCount(0); return; }
    let start = 0; const duration = 1200; const interval = 16;
    const step = value / (duration / interval);
    const timer = setInterval(() => {
      start += step;
      if (start >= value) { setCount(value); clearInterval(timer); }
      else { setCount(Math.floor(start)); }
    }, interval);
    return () => clearInterval(timer);
  }, [value]);
  return <>{count.toLocaleString(undefined, { maximumFractionDigits: 1 })}</>;
};

export default function UniversalDashboardPage() {
  // =========================================================
  // 🏢 【拠点マスター設定】
  // =========================================================
  const LOCATION_ID = 'cainz-fukuoka'; 
  const LOCATION_NAME = 'カインズ福岡センター'; 
  
  const GAS_URL = `/api/gas?location=${LOCATION_ID}`;
  const [isMounted, setIsMounted] = useState(false);
  const [data, setData] = useState<any>(null);

  // タブ管理・表示モード管理
  const [activeTab, setActiveTab] = useState('sales');
  const [activeMonthlyTab, setActiveMonthlyTab] = useState<'salesConfirmed' | 'productivity'>('salesConfirmed');
  const [activeActionTab, setActiveActionTab] = useState<'dx' | 'env' | 'history'>('dx');
  const [displayMode, setDisplayMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedWeek, setSelectedWeek] = useState<number>(0);

  // 月選択ステート
  const [globalSelectedMonth, setGlobalSelectedMonth] = useState<string>('');
  const [contractSelectedMonth, setContractSelectedMonth] = useState<string>('');
  const [salesMonth, setSalesMonth] = useState<string>('');
  const [prodSelectedMonth, setProdSelectedMonth] = useState<string>('');

  const [hideZeroContracts, setHideZeroContracts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showHiddenItems, setShowHiddenItems] = useState(false);        
  const [showHiddenMetrics, setShowHiddenMetrics] = useState(false);    

  const [tabAiAnalysis, setTabAiAnalysis] = useState<{ [key: string]: string }>({});
  const [isTabAnalyzing, setIsTabAnalyzing] = useState<{ [key: string]: boolean }>({});

  const [dxItems, setDxItems] = useState<any[]>([]);
  const [envItems, setEnvItems] = useState<any[]>([]);
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [metricSettings, setMetricSettings] = useState<any[]>([]); 
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const [newItem, setNewItem] = useState({
    name: '', effect: '', startDate: '', endDate: '', customerRelated: false, ratio: 0, client: '', proposal: '', detail: '', result: '●', url: ''
  });

  const [toastInfo, setToastInfo] = useState<{show: boolean, msg: string, type: 'success'|'error'}>({show: false, msg: '', type: 'success'});

  // =========================================================
  // 🚨 事故管理ダッシュボード用のState（四半期目標対応）
  // =========================================================
  const [activeAccidentTab, setActiveAccidentTab] = useState<'summary' | 'measures'>('summary');
  const [accidentMeasures, setAccidentMeasures] = useState<any[]>([]);
  const [accidentGoals, setAccidentGoals] = useState<any[]>([]);
  
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editGoalData, setEditGoalData] = useState({ goal_text: '', target_value: 0 });
  const [isMeasureModalOpen, setIsMeasureModalOpen] = useState(false);
  const [editMeasureData, setEditMeasureData] = useState<any>({ 
    id: null, category: '', accident_type: '', accident_no: '', title: '', effect: '', start_date: '', status: '実行中', url: '' 
  });

  const lowIsBetterMetrics = ["労務費", "タイミー", "外注費", "社会保険", "雇用保険", "有給", "交通費", "工数", "事故", "償却", "残業", "深夜", "超過", "違反者", "総工数", "減価償却費", "原価"];

  const formatVal = (val: number, title?: string) => {
    if (val === undefined || val === null || isNaN(val)) return '0';
    if (!title) return Math.round(val).toLocaleString();
    if (title.includes("%") || title.includes("率")) return `${val.toFixed(1)}%`;
    if (title.includes("生産性") || /時給|最低賃金|人数|在籍者|違反者/.test(title)) return Number(val.toFixed(1)).toLocaleString();
    if (/売上|原価|費|利益|金額|単価|通過/.test(title)) return `¥${Math.round(val).toLocaleString()}`;
    return Math.round(val).toLocaleString();
  };

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastInfo({ show: true, msg, type });
    setTimeout(() => setToastInfo({ show: false, msg: '', type: 'success' }), 3000);
  };

  const handleReloadData = async () => {
    setData(null);
    await fetchDashboardData(true);
  };

  const supabaseRequest = async (table: string, method: string, body?: any) => {
    try {
      let query = '';
      if (method === 'GET') query = `?location_id=eq.${LOCATION_ID}&order=id.asc`;
      if (method === 'PATCH' || method === 'DELETE') query = `?id=eq.${body.id}`;
      
      const cleanBody = method === 'PATCH' ? { ...body } : body;
      if (method === 'PATCH') delete cleanBody.id;

      const res = await fetch('/api/supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table, actionMethod: method, payload: (method === 'POST' || method === 'PATCH') ? cleanBody : undefined, query })
      });

      if (!res.ok) {
        const errDetail = await res.json().catch(() => ({}));
        throw new Error(`[API Error] ${res.status}: ${errDetail.error || 'Unknown'}`);
      }

      return method === 'DELETE' ? true : await res.json();
    } catch (e) { 
      console.error("Secure Supabase Operation Error:", e); 
      throw e; 
    }
  };

  const fetchSupabaseData = async () => {
    const safeFetch = async (table: string) => {
      return supabaseRequest(table, 'GET').catch(err => {
        console.warn(`⚠️ テーブル [${table}] のデータ取得に失敗したため空配列で防衛しました。`);
        return [];
      });
    };

    const [dxData, envData, historyData, settingsData, measuresData, goalsData] = await Promise.all([
      safeFetch('dx_actions'), 
      safeFetch('env_actions'), 
      safeFetch('sales_history'),
      safeFetch('dashboard_metric_settings'),
      safeFetch('accident_measures'),
      safeFetch('accident_goals') 
    ]);
    
    if (dxData) setDxItems(dxData); 
    if (envData) setEnvItems(envData); 
    if (historyData) setHistoryItems(historyData);
    if (settingsData) setMetricSettings(settingsData);
    if (measuresData) setAccidentMeasures(measuresData);
    if (goalsData) setAccidentGoals(goalsData);
  };

  const fetchDashboardData = async (isReload = false) => {
    fetchSupabaseData();

    try {
      const res = await fetch(GAS_URL);
      const json = await res.json();
      setData(json);
      if (!isReload && json && json.labels && json.labels.length > 0) {
        const firstLabel = String(json.labels[0]);
        
        let extractedMonth = (new Date().getMonth() + 1).toString();
        if (firstLabel.includes('/')) {
          const parts = firstLabel.split('/');
          if (parts.length === 3) extractedMonth = parseInt(parts[1], 10).toString();
          if (parts.length === 2) extractedMonth = parseInt(parts[0], 10).toString();
        }

        setGlobalSelectedMonth(extractedMonth);
        setProdSelectedMonth(extractedMonth);

        if (json.contractYojitsuData && json.contractYojitsuData.length > 0) {
          const cLabels = json.contractYojitsuData[0].labels || [];
          const cleanCLabels = cLabels.map((l: any) => String(l).replace('月', ''));
          if (cleanCLabels.includes(extractedMonth)) setContractSelectedMonth(extractedMonth);
          else setContractSelectedMonth(cleanCLabels[0] || '4');
        }

        if (json.salesConfirmedData) {
          const sKeys = Object.keys(json.salesConfirmedData);
          const d = new Date();
          d.setMonth(d.getMonth() - 1);
          const targetMonth = `${d.getFullYear()}/${("0" + (d.getMonth() + 1)).slice(-2)}`;
          
          if (sKeys.includes(targetMonth)) {
            setSalesMonth(targetMonth);
          } else {
            sKeys.sort();
            if (sKeys.length > 0) setSalesMonth(sKeys[sKeys.length - 1]);
          }
        }
      }
      if (isReload) showToast('最新データを取得しました', 'success');
    } catch (err) {
      console.error("Fetch Error:", err);
      showToast('データの取得に失敗しました', 'error');
    }
  };

  useEffect(() => {
    setIsMounted(true);
    fetchDashboardData(false);
  }, []);

  useEffect(() => {
    setTabAiAnalysis({});
  }, [globalSelectedMonth]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setSearchQuery('');
  };

  const handleToggleMetricSetting = async (metricTitle: string, field: 'is_pinned' | 'is_hidden', currentVal: boolean) => {
    try {
      const existing = metricSettings.find(s => s.tab_id === activeTab && s.metric_title === metricTitle);
      
      const payload: any = {
        location_id: LOCATION_ID,
        tab_id: activeTab,
        metric_title: metricTitle,
        is_pinned: field === 'is_pinned' ? !currentVal : (existing ? existing.is_pinned : false),
        is_hidden: field === 'is_hidden' ? !currentVal : (existing ? existing.is_hidden : false)
      };

      if (existing) {
        payload.id = existing.id;
        await supabaseRequest('dashboard_metric_settings', 'PATCH', payload);
      } else {
        await supabaseRequest('dashboard_metric_settings', 'POST', payload);
      }

      const updatedSettings = await supabaseRequest('dashboard_metric_settings', 'GET').catch(() => []);
      if (updatedSettings) setMetricSettings(updatedSettings);
      showToast('グラフの設定を保存しました', 'success');
    } catch (e) {
      showToast('設定の保存に失敗しました。F12コンソールを確認してください。', 'error');
    }
  };

  const tabs = [
    { id: 'sales', label: '1. 売上進捗', icon: Calculator, color: '#2563eb', dataKey: 'salesData' },
    { id: 'manhours', label: '2. 工数詳細', icon: Clock, color: '#059669', dataKey: 'logisticsData' },
    { id: 'volume', label: '3. 実績物量', icon: Activity, color: '#d97706', dataKey: 'volumeData' },
    { id: 'productivity', label: '4. 生産性', icon: TrendingUp, color: '#ca8a04', dataKey: 'productivityData' },
    { id: 'labor', label: '5. 労務管理', icon: CheckCircle2, color: '#ec4899', dataKey: 'laborData' },
    { id: 'monthly', label: '6. 月次データ', icon: Award, color: '#0ea5e9' },
    { id: 'actions', label: '7. アクション', icon: Rocket, color: '#7c3aed' },
    { id: 'accidents', label: '8. 事故管理', icon: AccidentIcon, color: '#f59e0b' },
    { id: 'contract', label: '9. 請負予実', icon: FileText, color: '#3b82f6' },
  ];

  const currentTab = tabs.find(t => t.id === activeTab) || tabs[0];
  const availableMonths = getAvailableMonths();

  const dataMonth = useMemo(() => {
    if (!data || !data.labels || data.labels.length === 0) return (new Date().getMonth() + 1).toString();
    const firstLabel = String(data.labels[0]);
    
    if (firstLabel.includes('/')) {
      const parts = firstLabel.split('/');
      if (parts.length === 3) return parseInt(parts[1], 10).toString();
      if (parts.length === 2) return parseInt(parts[0], 10).toString();
    }
    return (new Date().getMonth() + 1).toString();
  }, [data]);

  const baseLabelsFiltered = data ? (data.labels || []) : [];
  const currentMonthIndices = baseLabelsFiltered.map((_: any, idx: number) => idx);

  // =========================================================
  // 📊 請負予実データ処理
  // =========================================================
  const contractAvailableMonths = (() => {
    if (!data || !data.contractYojitsuData || !Array.isArray(data.contractYojitsuData)) return [];
    const sets = new Set<string>();
    data.contractYojitsuData.forEach((item: any) => {
      if (item && item.labels && Array.isArray(item.labels)) {
        item.labels.forEach((lbl: any) => { if (lbl) sets.add(String(lbl).replace('月', '')); });
      }
    });
    return Array.from(sets).sort((a, b) => {
      const getOrder = (mStr: string) => { const val = parseInt(mStr, 10) || 0; return val >= 4 ? 
        val : val + 12; };
      return getOrder(a) - getOrder(b);
    });
  })();

  const contractList = (() => {
    if (!data || !data.contractYojitsuData || !Array.isArray(data.contractYojitsuData)) return [];
    const cMap = new Map();
    data.contractYojitsuData.forEach((item: any) => {
      if (!item || !item.title) return;
      const isYosan = item.title.startsWith('予算_');
      const isJisseki = item.title.startsWith('実績_');
      const cleanTitle = item.title.replace('予算_', '').replace('実績_', '');
      if (!cMap.has(cleanTitle)) {
        cMap.set(cleanTitle, { 
          title: cleanTitle, 
          labels: item.labels || [], 
          actual: new Array((item.labels || []).length).fill(0), 
          forecast: new Array((item.labels || []).length).fill(0) 
        });
      }
      const entry = cMap.get(cleanTitle);
      if (isJisseki) entry.actual = item.values || [];
      if (isYosan) entry.forecast = item.values || [];
    });
    let list = Array.from(cMap.values());
    if (searchQuery) list = list.filter(m => m.title && m.title.toLowerCase().includes(searchQuery.toLowerCase()));
    return list;
  })();

  const weeklyGroups = (() => {
    const groups: { weekNum: number; label: string; indices: number[] }[] = [];
    if (!baseLabelsFiltered || baseLabelsFiltered.length === 0) return groups;
    let currentWeekIndices: number[] = []; let weekCount = 1; let startLabel = baseLabelsFiltered[0];

    baseLabelsFiltered.forEach((label: string, idx: number) => {
      const labelStr = String(label);
      let dayStr = labelStr.replace(/[^0-9]/g, '') || '1';
      if (labelStr.includes('/')) {
        const parts = labelStr.split('/');
        dayStr = parts[parts.length - 1];
      }
      const dayNum = parseInt(dayStr, 10);
      const currentYear = new Date().getFullYear();
      const date = new Date(currentYear, parseInt(dataMonth) - 1, dayNum);

      if (date.getDay() === 0 && currentWeekIndices.length > 0) {
        groups.push({ weekNum: weekCount, label: `第${weekCount}週 (${startLabel} ～ ${baseLabelsFiltered[idx - 1]})`, indices: currentWeekIndices });
        weekCount++; startLabel = label; currentWeekIndices = [];
      }
      currentWeekIndices.push(idx);
    });
    if (currentWeekIndices.length > 0) {
      groups.push({ weekNum: weekCount, label: `第${weekCount}週 (${startLabel} ～ ${baseLabelsFiltered[baseLabelsFiltered.length - 1]})`, indices: currentWeekIndices });
    }
    return groups;
  })();

  const getCombinedMetrics = () => {
    if (!data) return [];
    const targetDataKey = currentTab.dataKey;
    if (!targetDataKey || targetDataKey === 'salesConfirmedData') return [];

    let allItems = data[targetDataKey] || [];
    const combinedMap = new Map();

    allItems.forEach((item: any) => {
      if (!item || !item.title || !item.values || !Array.isArray(item.values)) return;
      const normalizedTitle = item.title.replace('＿', '_');

      let cleanTitle = normalizedTitle
        .replace('今月', '').replace('先月', '').replace('前年', '')
        .replace('実績_', '').replace('予測_', '').replace('予算_', '').replace('目標_', '')
        .replace('実績', '').replace('予測', '').replace('予算', '').replace('目標', '');
      if (cleanTitle.includes('社会保険')) cleanTitle = '社会保険';

      if (!combinedMap.has(cleanTitle)) {
        const setting = metricSettings.find(s => s.tab_id === activeTab && s.metric_title === cleanTitle);
        combinedMap.set(cleanTitle, {
          title: cleanTitle, labels: item.labels || baseLabelsFiltered,
          actual_thisMonth: new Array((item.labels || baseLabelsFiltered).length).fill(0),
          actual_lastMonth: new Array((item.labels || baseLabelsFiltered).length).fill(0),
          actual_lastYear: new Array((item.labels || baseLabelsFiltered).length).fill(0),
          forecast: new Array((item.labels || baseLabelsFiltered).length).fill(0),
          forecast_yosan: new Array((item.labels || baseLabelsFiltered).length).fill(0), 
          forecast_yosoku: new Array((item.labels || baseLabelsFiltered).length).fill(0),
          forecastType: '予測',
          is_pinned: setting ? setting.is_pinned : false, is_hidden: setting ? setting.is_hidden : false   
        });
      }
      const entry = combinedMap.get(cleanTitle);
      const isYosan = normalizedTitle.match(/予算|予測|目標/);
      const isJisseki = !isYosan;

      if (isJisseki) {
        if (normalizedTitle.includes('先月')) entry.actual_lastMonth = item.values;
        else if (normalizedTitle.includes('前年')) entry.actual_lastYear = item.values;
        else entry.actual_thisMonth = item.values;
      }

      if (isYosan && (normalizedTitle.includes('今月') || !normalizedTitle.match(/先月|前年/))) {
        if (normalizedTitle.includes('予測')) {
            entry.forecast_yosoku = item.values;
        } else if (normalizedTitle.includes('予算') || normalizedTitle.includes('目標')) {
            entry.forecast_yosan = item.values;
        }

        if (normalizedTitle.includes('予算')) { entry.forecastType = '予算'; entry.forecast = item.values; }
        else if (normalizedTitle.includes('目標')) { entry.forecastType = '目標'; entry.forecast = item.values; }
        else if (entry.forecastType === '予測' && (!entry.forecast || !entry.forecast.some((v: number) => v > 0))) {
            entry.forecast = item.values;
        }
      }
    });

    let result = Array.from(combinedMap.values()).map(m => {
        // 🌟 売上進捗タブ ✕ 週次モード のときは強制的に「予測」データを適用する
        if (activeTab === 'sales' && displayMode === 'weekly') {
            if (m.forecast_yosoku && m.forecast_yosoku.some((v: number) => n(v) > 0)) {
                m.forecast = m.forecast_yosoku;
                m.forecastType = '予測';
            }
        } else if (activeTab === 'sales' && displayMode === 'monthly') {
            if (m.forecast_yosan && m.forecast_yosan.some((v: number) => n(v) > 0)) {
                m.forecast = m.forecast_yosan;
                m.forecastType = '予算';
            }
        }
        return m;
    });

    if (displayMode === 'daily' || displayMode === 'weekly' || displayMode === 'monthly') {
      const hiddenKeywords = ["本部費", "償却費", "社会保険", "雇用保険", "交通費", "有給"];
      result = result.filter(m => !hiddenKeywords.some(k => m.title.includes(k)));
    }
    
    if (searchQuery) result = result.filter(m => m.title.toLowerCase().includes(searchQuery.toLowerCase()));

    if (activeTab === 'labor') {
      const staffSetting = metricSettings.find(s => s.tab_id === activeTab && s.metric_title === 'スタッフ工数 (通常・残業・深夜)');
      const stackedGroups: any = {
        'スタッフ工数': { 
          title: 'スタッフ工数 (通常・残業・深夜)', 
          isStacked: true, 
          data: {}, 
          forecast: [], 
          forecastType: '予測',
          is_pinned: staffSetting ? staffSetting.is_pinned : false, 
          is_hidden: staffSetting ? staffSetting.is_hidden : false 
        },
      };
      const finalResult: any[] = [];
      result.forEach(m => {
        if (m.title === '社員工数_残業工数') { m.title = '社員工数_残業'; finalResult.push(m); }
        else if (m.title === '社員工数_通常工数' || m.title === '社員工数_深夜工数') { }
        else if (m.title === 'スタッフ工数_通常工数') stackedGroups['スタッフ工数'].data['通常'] = m;
        else if (m.title === 'スタッフ工数_残業工数') stackedGroups['スタッフ工数'].data['残業'] = m;
        else if (m.title === 'スタッフ工数_深夜工数') stackedGroups['スタッフ工数'].data['深夜'] = m;
        else if (m.title === 'スタッフ工数') {
          stackedGroups['スタッフ工数'].forecast = m.forecast; 
          stackedGroups['スタッフ工数'].forecastType = m.forecastType;
          stackedGroups['スタッフ工数'].actual_lastMonth = m.actual_lastMonth; 
          stackedGroups['スタッフ工数'].actual_lastYear = m.actual_lastYear;
        }
        else finalResult.push(m);
      });
      if (Object.keys(stackedGroups['スタッフ工数'].data).length > 0) finalResult.push(stackedGroups['スタッフ工数']);
      return finalResult;
    }
    return result;
  };

  const sortedMetrics = getCombinedMetrics();

  // 🌟 【最終入力日基準 ＆ ペース色判定 ＆ 物量の予測達成率 適用版】
  const finalSortedMetrics = useMemo(() => {
    if (!['sales', 'manhours', 'volume', 'productivity', 'labor'].includes(activeTab)) return sortedMetrics;
    
    const metricsWithValues = sortedMetrics.map(m => {
      const isAvgMetric = m.title.includes("生産性") || m.title.includes("%") || m.title.includes("率") || m.title.includes("単価") || m.title.includes("時給");
      const isCost = lowIsBetterMetrics.some(k => m.title.includes(k)) || activeTab === 'manhours' || m.title.includes('原価');
      const isStacked = m.isStacked;

      // 💡 日次進捗計算用：当月の「最終入力更新日」のインデックスを特定
      let lastInputIdx = -1;
      currentMonthIndices.forEach(idx => {
        let actVal = isStacked ? (n(m.data['通常']?.actual_thisMonth[idx]) + n(m.data['残業']?.actual_thisMonth[idx]) + n(m.data['深夜']?.actual_thisMonth[idx])) : n(m.actual_thisMonth?.[idx]);
        if (actVal > 0) lastInputIdx = idx;
      });

      // 月次モードの着地計算
      if (displayMode === 'monthly') {
        let totalBudget = 0; let totalChakuchi = 0; let validBudgetDays = 0; let validChakuchiDays = 0;
        let totalLastMonth = 0; let totalLastYear = 0; let validLastMonthDays = 0; let validLastYearDays = 0;
        let hasFct = false;

        let pureActSum = 0; let pureFctSum = 0;

        currentMonthIndices.forEach(idx => {
          let actVal = 0; let fctVal = 0; let lastAct = 0; let prevYearAct = 0;
          
          if (isStacked) {
            const getStacked = (arrKey: string) => n(m.data['通常']?.[arrKey]?.[idx]) + n(m.data['残業']?.[arrKey]?.[idx]) + n(m.data['深夜']?.[arrKey]?.[idx]);
            actVal = getStacked('actual_thisMonth');
            fctVal = m.forecast && n(m.forecast[idx]) > 0 ? n(m.forecast[idx]) : getStacked('forecast');
            lastAct = m.actual_lastMonth && n(m.actual_lastMonth[idx]) > 0 ? n(m.actual_lastMonth[idx]) : getStacked('actual_lastMonth');
            prevYearAct = m.actual_lastYear && n(m.actual_lastYear[idx]) > 0 ? n(m.actual_lastYear[idx]) : getStacked('actual_lastYear');
          } else {
            actVal = n(m.actual_thisMonth?.[idx]); 
            fctVal = n(m.forecast?.[idx]);
            lastAct = n(m.actual_lastMonth?.[idx]); 
            prevYearAct = n(m.actual_lastYear?.[idx]);
          }

          pureActSum += actVal;
          pureFctSum += fctVal;

          if (fctVal > 0) { totalBudget += fctVal; validBudgetDays++; hasFct = true; }
          if (lastAct > 0) { totalLastMonth += lastAct; validLastMonthDays++; }
          if (prevYearAct > 0) { totalLastYear += prevYearAct; validLastYearDays++; }

          if (idx <= lastInputIdx) {
            totalChakuchi += actVal;
            if (actVal > 0) validChakuchiDays++;
          } else {
            if (!m.title.match(/外注費|募集|事故/)) {
              totalChakuchi += fctVal; 
              if (fctVal > 0) validChakuchiDays++; 
            }
          }
        });

        // 🌟 物量タブの特別対応：着地ではなく「実績累計 ÷ 予測累計」
        if (activeTab === 'volume') {
            const finalAct = isAvgMetric && validChakuchiDays > 0 ? pureActSum / validChakuchiDays : pureActSum;
            const finalFct = isAvgMetric && validBudgetDays > 0 ? pureFctSum / validBudgetDays : pureFctSum;
            const finalLastMonth = isAvgMetric && validLastMonthDays > 0 ? totalLastMonth / validLastMonthDays : totalLastMonth;
            const finalLastYear = isAvgMetric && validLastYearDays > 0 ? totalLastYear / validLastYearDays : totalLastYear;
            
            return { 
                ...m, _sortVal: finalAct, _monthlyBudget: finalFct, _monthlyChakuchi: finalAct, _monthlyLastAct: finalLastMonth, _monthlyPrevYearAct: finalLastYear, _lastInputIdx: lastInputIdx 
            };
        }

        if (!hasFct && lastInputIdx >= 0 && lastInputIdx < currentMonthIndices.length - 1 && !isAvgMetric && !m.title.match(/外注費|募集|事故/)) {
          let actSum = 0; let actDays = 0;
          for (let i = 0; i <= lastInputIdx; i++) {
            let v = isStacked ? (n(m.data['通常']?.actual_thisMonth[i]) + n(m.data['残業']?.actual_thisMonth[i]) + n(m.data['深夜']?.actual_thisMonth[i])) : n(m.actual_thisMonth?.[i]);
            if (v > 0) { actSum += v; actDays++; }
          }
          const dAvg = actDays > 0 ? actSum / actDays : 0;
          totalChakuchi = actSum + (dAvg * (currentMonthIndices.length - (lastInputIdx + 1)));
          validChakuchiDays = currentMonthIndices.length;
        }

        const finalBudget = isAvgMetric && validBudgetDays > 0 ? totalBudget / validBudgetDays : totalBudget;
        const finalChakuchi = isAvgMetric && validChakuchiDays > 0 ? totalChakuchi / validChakuchiDays : totalChakuchi;
        const finalLastMonth = isAvgMetric && validLastMonthDays > 0 ? totalLastMonth / validLastMonthDays : totalLastMonth;
        const finalLastYear = isAvgMetric && validLastYearDays > 0 ? totalLastYear / validLastYearDays : totalLastYear;

        return { 
          ...m, _sortVal: finalChakuchi, _monthlyBudget: finalBudget, _monthlyChakuchi: finalChakuchi, _monthlyLastAct: finalLastMonth, _monthlyPrevYearAct: finalLastYear, _lastInputIdx: lastInputIdx 
        };
      }

      // 共通（日次・週次用）
      let actVal = 0;
      const targetIndices = displayMode === 'weekly' ? (weeklyGroups[selectedWeek]?.indices || []) : currentMonthIndices.filter(idx => idx <= lastInputIdx);
      
      if (isStacked) {
        const sumKey = (key: string, metricArr: string) => targetIndices.reduce((sum, idx) => sum + n(m.data[key]?.[metricArr]?.[idx]), 0);
        actVal = sumKey('通常', 'actual_thisMonth') + sumKey('残業', 'actual_thisMonth') + sumKey('深夜', 'actual_thisMonth');
      } else {
        const acts = targetIndices.map(idx => n(m.actual_thisMonth?.[idx]));
        if (isAvgMetric) {
          const valid = acts.filter(v => v > 0);
          actVal = valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : 0;
        } else {
          actVal = acts.reduce((a, b) => a + b, 0);
        }
      }
      return { ...m, _sortVal: actVal, _lastInputIdx: lastInputIdx };
    });

    let filteredMetrics = metricsWithValues;
    if (!showHiddenMetrics) {
      filteredMetrics = filteredMetrics.filter(m => !m.is_hidden);
    }
    
    return filteredMetrics.sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1; 
      return b._sortVal - a._sortVal;
    });
  }, [sortedMetrics, displayMode, selectedWeek, dataMonth, currentMonthIndices, baseLabelsFiltered, activeTab, weeklyGroups, showHiddenMetrics]);

  // =========================================================
  // 起動用：日次月別の一括処理関数 (生産性・物量) ★完全汎用・複数合算(+)対応版
  // =========================================================
  const computedVaultProductivity = useMemo(() => {
    if (!data) return { items: [], summary: { totalVolume: 0, totalHours: 0, totalProd: 0, lastMonthRatio: { vol: 0, hrs: 0, prod: 0 } } };
    
    const targetMonthStr = `/${prodSelectedMonth.padStart(2, '0')}/`;
    let prevM = parseInt(prodSelectedMonth, 10) - 1;
    if (prevM <= 0) prevM += 12;
    const prevMonthStr = `/${String(prevM).padStart(2, '0')}/`;

    const processNames = data.masterSettings?.TARGET_CATEGORIES || [];
    const mappingMap = data.masterSettings?.NAME_MAPPING || {};
    const volumeMap = data.masterSettings?.VOLUME_MAPPING || {};
    
    const mappedProcessNames = processNames.map((proc: string) => mappingMap[proc] || proc);

    // 🌟 '+' で複数指定された物量名も分解してユニークリスト化（二重計上防止）
    const uniqueVolumeTargets = Array.from(new Set(
        processNames.length > 0 
        ? processNames.flatMap((proc: string) => {
            const vStr = volumeMap[proc] || mappingMap[proc] || proc;
            return vStr.split('+').map((s: string) => s.trim());
          }) 
        : []
    ));

    const getMonthSummary = (monthStr: string) => {
        let vol = 0; let hrs = 0;
        if (data.volumeAccumulatedData) {
            data.volumeAccumulatedData.forEach((item: any) => {
                const itemName = item.title.replace('蓄積実績_', '');
                if (processNames.length === 0 || uniqueVolumeTargets.includes(itemName)) {
                    item.labels.forEach((date: string, idx: number) => {
                        if (date.includes(monthStr)) vol += n(item.values[idx]);
                    });
                }
            });
        }
        if (data.manhoursAccumulatedData) {
            data.manhoursAccumulatedData.forEach((item: any) => {
                if (item.title !== '蓄積実績_工数') return;
                item.labels.forEach((date: string, idx: number) => {
                    if (date.includes(monthStr)) hrs += n(item.values[idx]);
                });
            });
        }
        const prod = hrs > 0 ? vol / hrs : 0;
        return { vol, hrs, prod };
    };

    const prevSummary = getMonthSummary(prevMonthStr);
    const calcRatio = (curr: number, prev: number) => prev > 0 ? (curr / prev) * 100 : 0;

    const vRows: any[] = [];
    if (data.volumeAccumulatedData) {
      data.volumeAccumulatedData.forEach((item: any) => {
        const itemName = item.title.replace('蓄積実績_', '');
        item.labels.forEach((date: string, idx: number) => {
          if (date.includes(targetMonthStr)) {
            vRows.push({ date: date, item: itemName, value: n(item.values[idx]) });
          }
        });
      });
    }

    const hTotalRows: any[] = [];
    if (data.manhoursAccumulatedData) {
      data.manhoursAccumulatedData.forEach((item: any) => {
        if (item.title !== '蓄積実績_工数') return;
        item.labels.forEach((date: string, idx: number) => {
          if (date.includes(targetMonthStr)) {
            const existing = hTotalRows.find(h => h.date === date);
            if (existing) existing.value += n(item.values[idx]);
            else hTotalRows.push({ date: date, value: n(item.values[idx]) });
          }
        });
      });
    }

    const pRows: any[] = [];
    if (data.productivityAccumulatedData) {
      data.productivityAccumulatedData.forEach((item: any) => {
        const itemName = item.title.replace('蓄積実績_作業生産性_', '');
        item.labels.forEach((date: string, idx: number) => {
          if (date.includes(targetMonthStr)) {
            pRows.push({ date: date, item: itemName, value: n(item.values[idx]) });
          }
        });
      });
    }
    
    const allDates = Array.from(new Set([...vRows.map((r: any) => r.date), ...hTotalRows.map((r: any) => r.date), ...pRows.map((r: any) => r.date)])).sort();
    
    let centerTotalVolume = 0; let centerTotalHours = 0;
    const fallbackProcessNames = processNames.length > 0 ? processNames : Array.from(new Set([...vRows.map((r: any) => r.item), ...pRows.map((r: any) => r.item)]));

    const items = fallbackProcessNames.map((proc: string) => {
      let procTotalVolume = 0; let prodSum = 0; let prodCount = 0;
      
      const prodName = mappingMap[proc] || proc;
      const volNameStr = volumeMap[proc] || mappingMap[proc] || proc;
      
      // 🌟 '+' で分割して複数のターゲット配列にする
      const volTargets = volNameStr.split('+').map((s: string) => s.trim());
      
      const dailyList = allDates.map(dt => {
        // 🌟 複数指定された物量をすべて合算する
        const vol = vRows
            .filter((r: any) => r.date === dt && (volTargets.includes(r.item) || r.item === proc))
            .reduce((sum: number, r: any) => sum + r.value, 0);
        
        const pMob = pRows.find((r: any) => r.date === dt && (r.item === prodName || r.item === proc));
        const prod = pMob ? pMob.value : 0;
        
        procTotalVolume += vol;
        if (prod > 0) { prodSum += prod; prodCount++; }
        
        return { date: dt.split('/').slice(1).join('/'), volume: vol, hours: 0, prod: prod };
      });
      
      const procTotalProd = prodCount > 0 ? prodSum / prodCount : 0;

      return { process: proc, dailyList, totalVolume: procTotalVolume, totalHours: 0, totalProd: procTotalProd };
    });
    
    centerTotalVolume = allDates.reduce((sum, dt) => {
        const dayVol = vRows.filter((r: any) => r.date === dt && (uniqueVolumeTargets.length > 0 ? uniqueVolumeTargets.includes(r.item) : true))
                            .reduce((dSum: number, r: any) => dSum + r.value, 0);
        return sum + dayVol;
    }, 0);
    centerTotalHours = hTotalRows.reduce((sum, r) => sum + r.value, 0);
    
    const centerDailyList = allDates.map(dt => {
      const dayVol = vRows.filter((r: any) => r.date === dt && (uniqueVolumeTargets.length > 0 ? uniqueVolumeTargets.includes(r.item) : fallbackProcessNames.includes(r.item)))
                          .reduce((sum: number, r: any) => sum + r.value, 0);
      const dayHrsRow = hTotalRows.find((r: any) => r.date === dt);
      const dayHrs = dayHrsRow ? dayHrsRow.value : 0;
      const dayProd = dayHrs > 0 ? dayVol / dayHrs : 0;
      return { date: dt.split('/').slice(1).join('/'), volume: dayVol, hours: dayHrs, prod: dayProd };
    });
    
    const centerTotalProd = centerTotalHours > 0 ? centerTotalVolume / centerTotalHours : 0;
    
    items.unshift({
      process: "★ 合計",
      dailyList: centerDailyList,
      totalVolume: centerTotalVolume,
      totalHours: centerTotalHours,
      totalProd: centerTotalProd
    });
    
    return { 
      items, 
      summary: { 
        totalVolume: centerTotalVolume, 
        totalHours: centerTotalHours, 
        totalProd: centerTotalProd,
        lastMonthRatio: { vol: calcRatio(centerTotalVolume, prevSummary.vol), hrs: calcRatio(centerTotalHours, prevSummary.hrs), prod: calcRatio(centerTotalProd, prevSummary.prod) }
      } 
    };
  }, [data, prodSelectedMonth]);

  // =========================================================
  // 🚨 事故管理ダッシュボード用の計算ロジック
  // =========================================================

  const getLevelStyles = (count: number) => {
    if (count >= 3) return { cardBorder: 'border-rose-100', bg: 'bg-rose-50', text: 'text-rose-600', meterBorder: 'border-rose-400', icon: <AccidentIcon className="text-rose-500" size={22} /> };
    if (count === 2) return { cardBorder: 'border-amber-100', bg: 'bg-amber-50', text: 'text-amber-600', meterBorder: 'border-amber-400', icon: <AlertTriangle className="text-amber-500" size={22} /> };
    return { cardBorder: 'border-blue-100', bg: 'bg-blue-50', text: 'text-blue-600', meterBorder: 'border-blue-400', icon: <CheckCircle2 className="text-blue-500" size={22} /> };
  };

  const calculateDaysSince = (dateStr: string) => {
    if (!dateStr || dateStr === "未取得" || dateStr === "履歴なし" || dateStr === "データなし" || dateStr === "-") return 0;
    const last = new Date(dateStr); if (isNaN(last.getTime())) return 0;
    const today = new Date(); const diffTime = Math.abs(today.getTime() - last.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const splitLabelAndUnit = (rawName: string) => {
    const parts = rawName.split(/_|\\|\//);
    if (parts.length > 1) {
        return { name: parts[0], unit: parts[1] };
    }
    return { name: rawName, unit: '件' }; 
  };

  const accidentCategories = (() => {
    if (!data) return [];
    const rawRecords = data.accidentData || [];
    const absoluteLastDateMap: any = {}; const catMap: any = {};
    const allCategoryNames = Array.from(new Set([
      ...rawRecords.map((r: any) => r.category || r['カテゴリー'] || r['作業部門']).filter(Boolean),
      ...accidentMeasures.map((m: any) => m.category).filter(Boolean)
    ])) as string[];
    
    rawRecords.forEach((row: any) => {
      const name = row.category || row['カテゴリー'] || row['作業部門'];
      if (!name) return;
      
      if (row.date && n(row.total) > 0) {
        const rowDate = new Date(row.date);
        if (!isNaN(rowDate.getTime())) { if (!absoluteLastDateMap[name] || rowDate > new Date(absoluteLastDateMap[name])) { absoluteLastDateMap[name] = row.date; } }
      }
      if (row.date) {
        const parts = row.date.split('/');
        if (parts.length >= 2) {
          const monthNum = parseInt(parts[1], 10).toString();
          if (monthNum === globalSelectedMonth) {
            if (!catMap[name]) catMap[name] = { chaseOn: 0, chaseOff: 0, total: 0 };
            catMap[name].chaseOn += n(row.chaseOn); catMap[name].chaseOff += n(row.chaseOff); catMap[name].total += n(row.total);
          }
        }
      }
    });
    let result = allCategoryNames.map(name => ({ name: name, chaseOn: catMap[name]?.chaseOn || 0, chaseOff: catMap[name]?.chaseOff || 0, total: catMap[name]?.total || 0, lastDate: absoluteLastDateMap[name] || '履歴なし' }));
    if (searchQuery) result = result.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
    if (result.length === 0) return [{ name: "該当データなし", lastDate: "-", chaseOn: 0, chaseOff: 0, total: 0 }];
    return result;
  })();

  const accidentSummary = useMemo(() => {
    if (!data || !data.accidentData) return { thisTotal: 0, lastTotal: 0, diff: 0, ratio: 0 };
    const rawRecords = data.accidentData || [];
    let thisTotal = 0; let lastTotal = 0;
    const curMonth = parseInt(globalSelectedMonth, 10);
    const lastMonth = curMonth === 1 ? 12 : curMonth - 1;
    rawRecords.forEach((row: any) => {
      if (row.date) {
        const parts = row.date.split('/');
        if (parts.length >= 2) {
          const m = parseInt(parts[1], 10);
          if (m === curMonth) thisTotal += n(row.total);
          if (m === lastMonth) lastTotal += n(row.total);
        }
      }
    });
    const diff = thisTotal - lastTotal;
    const ratio = lastTotal > 0 ? (thisTotal / lastTotal) * 100 : (thisTotal === 0 ? 0 : 100);
    return { thisTotal, lastTotal, diff, ratio };
  }, [data, globalSelectedMonth]);

  const currentQuarterInfo = useMemo(() => {
    const m = parseInt(globalSelectedMonth, 10) || (new Date().getMonth() + 1);
    if (m >= 4 && m <= 6) return { name: '1Q (4〜6月)', months: [4, 5, 6] };
    if (m >= 7 && m <= 9) return { name: '2Q (7〜9月)', months: [7, 8, 9] };
    if (m >= 10 && m <= 12) return { name: '3Q (10〜12月)', months: [10, 11, 12] };
    if (m >= 1 && m <= 3) return { name: '4Q (1〜3月)', months: [1, 2, 3] };
    return { name: '1Q (4〜6月)', months: [4, 5, 6] };
  }, [globalSelectedMonth]);

  const currentAccidentGoal = useMemo(() => {
    return accidentGoals.find(g => g.quarter === currentQuarterInfo.name) || null;
  }, [accidentGoals, currentQuarterInfo]);

  const currentQuarterAccidents = useMemo(() => {
    if (!data || !data.accidentData) return 0;
    return data.accidentData.reduce((sum: number, row: any) => {
      if (row.date) {
        const parts = row.date.split('/');
        if (parts.length >= 2) {
          const m = parseInt(parts[1], 10);
          if (currentQuarterInfo.months.includes(m)) return sum + n(row.total);
        }
      }
      return sum;
    }, 0);
  }, [data, currentQuarterInfo]);

  const accidentCategoryTrendData = useMemo(() => {
    if (!data || !data.accidentData) return { chartData: [], categories: [] };
    const monthlyMap = new Map();
    const categoriesSet = new Set<string>();

    data.accidentData.forEach((row: any) => {
      const cat = row.category || row['カテゴリー'] || row['作業部門'];
      if (row.date && cat) {
        const parts = row.date.split('/');
        if (parts.length >= 2) {
          const mKey = `${parseInt(parts[1], 10)}月`;
          categoriesSet.add(cat);
          if (!monthlyMap.has(mKey)) monthlyMap.set(mKey, { name: mKey });
          const mData = monthlyMap.get(mKey);
          mData[cat] = (mData[cat] || 0) + n(row.total);
        }
      }
    });
    
    const chartData = Array.from(monthlyMap.values()).sort((a, b) => {
      const getVal = (mStr: string) => { const v = parseInt(mStr); return v >= 4 ? v : v + 12; };
      return getVal(a.name) - getVal(b.name);
    });
    
    return { chartData, categories: Array.from(categoriesSet) };
  }, [data]);

  const uniqueAccidentTypes = useMemo(() => {
    const types = new Set<string>();
    accidentMeasures.forEach((m: any) => { if (m.accident_type) types.add(m.accident_type); });
    if (data?.accidentData) {
      data.accidentData.forEach((r: any) => {
        const t = r.accident_type || r.type || r['事故種類'] || r['事故種別'] || r['種類'];
        if (t) types.add(t);
      });
    }
    return Array.from(types);
  }, [data, accidentMeasures]);

  const getBeforeAfterStats = (categoryName: string, startDateStr: string) => {
    if (!startDateStr || !data?.accidentData || !categoryName) return { beforeAvg: 0, afterAvg: 0, hasData: false };
    const startDate = new Date(startDateStr);
    if (isNaN(startDate.getTime())) return { beforeAvg: 0, afterAvg: 0, hasData: false };

    let beforeTotal = 0; let afterTotal = 0;
    const beforeMonths = new Set(); const afterMonths = new Set();

    data.accidentData.forEach((row: any) => {
      const rowCat = row.category || row['カテゴリー'] || row['作業部門'];
      if (rowCat === categoryName && row.date) {
         const rowDate = new Date(row.date);
         if (isNaN(rowDate.getTime())) return;
         const monthKey = `${rowDate.getFullYear()}-${rowDate.getMonth()}`;
         if (rowDate < startDate) {
           beforeTotal += n(row.total);
           beforeMonths.add(monthKey);
         } else {
           afterTotal += n(row.total);
           afterMonths.add(monthKey);
         }
      }
    });
    
    const bAvg = beforeMonths.size > 0 ? beforeTotal / beforeMonths.size : 0;
    const aAvg = afterMonths.size > 0 ? afterTotal / afterMonths.size : (afterTotal > 0 ? afterTotal : 0);
    return { beforeAvg: bAvg, afterAvg: aAvg, hasData: beforeTotal > 0 || afterTotal > 0 };
  };

  const handleCopyWorkflowData = () => {
    if (accidentMeasures.length === 0) {
      showToast('コピーする対策データがありません', 'error');
      return;
    }
    
    const targetMonthStr = parseInt(globalSelectedMonth, 10).toString();

    const textToCopy = accidentMeasures
      .filter(m => {
        const hasData = m.accident_no || m.url;
        if (!hasData) return false;
        if (!m.start_date) return false;
        const parts = m.start_date.split(/[-/]/); 
        if (parts.length >= 2) {
          const monthNum = parseInt(parts[1], 10).toString();
          return monthNum === targetMonthStr;
        }
        return false;
      })
      .map(m => `事故NO: ${m.accident_no || '未設定'}\nURL: ${m.url || '未設定'}`)
      .join('\n\n');
    
    if (!textToCopy) {
      showToast(`${globalSelectedMonth}月の申請用データがありません`, 'error');
      return;
    }

    navigator.clipboard.writeText(textToCopy).then(() => {
      showToast(`${globalSelectedMonth}月の申請データをコピーしました！`, 'success');
    }).catch(err => {
      showToast('コピーに失敗しました', 'error');
    });
  };

  const filteredDxItems = dxItems.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.effect.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredEnvItems = envItems.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.effect.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredHistoryItems = historyItems.filter(item => item.client?.toLowerCase().includes(searchQuery.toLowerCase()) || item.proposal?.toLowerCase().includes(searchQuery.toLowerCase()) || item.detail?.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleStartTabAnalysis = async (tabId: string) => {
    setIsTabAnalyzing(prev => ({ ...prev, [tabId]: true }));
    try {
      let payloadItems: any[] = [];
      let analysisType = 'evaluation';
      if (tabId === 'actions') {
        analysisType = 'summary';
        payloadItems = [
          { category: 'DX推進', items: filteredDxItems },
          { category: '現場改善', items: filteredEnvItems },
          { category: '営業履歴', items: filteredHistoryItems }
        ];
      } else if (tabId === 'contract') {
        payloadItems = contractList.map(m => {
          const targetIdx = m.labels.findIndex(lbl => String(lbl).replace('月','') === String(contractSelectedMonth));
          return { 項目: m.title, 月度: `${contractSelectedMonth}月`, 実績: targetIdx !== -1 ? m.actual[targetIdx] : 0, 予算: targetIdx !== -1 ? 
          m.forecast[targetIdx] : 0, 差異: targetIdx !== -1 ? (n(m.actual[targetIdx]) - n(m.forecast[targetIdx])) : 0 };
        });
      }
      const res = await fetch('/api/analyze-tab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tabId: tabId, items: payloadItems, analysisType: analysisType })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'API通信エラー');
      setTabAiAnalysis(prev => ({ ...prev, [tabId]: json.evaluation }));
    } catch (err: any) { setTabAiAnalysis(prev => ({ ...prev, [tabId]: `【エラー】${err.message}` })); }
    finally { setIsTabAnalyzing(prev => ({ ...prev, [tabId]: false })); }
  };

  const handleOpenAddModal = () => {
    setEditingIndex(null);
    setNewItem({ name: '', effect: '', startDate: '', endDate: '', customerRelated: false, ratio: 0, client: '', proposal: '', detail: '', result: '●', url: '' });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (index: number) => {
    setEditingIndex(index);
    if (activeActionTab === 'history') {
      const item = historyItems[index];
      setNewItem({ name: '', effect: '', endDate: '', customerRelated: false, ratio: 0, startDate: item.date ? item.date.replace(/\//g, '-') : '', client: item.client || '', proposal: item.proposal || '', detail: item.detail || '', result: item.result || '●', url: item.url || '' });
    } else {
      const targetList = activeActionTab === 'dx' ? dxItems : envItems; const item = targetList[index];
      setNewItem({ client: '', proposal: '', detail: '', result: '●', name: item.name || '', effect: item.effect === '未入力' ? '' : (item.effect || ''), startDate: item.start_date ? item.start_date.replace(/\//g, '-') : '', endDate: item.end_date ? item.end_date.replace(/\//g, '-') : '', customerRelated: item.customer_related === 'あり', ratio: item.ratio || 0, url: item.url || '' });
    }
    setIsModalOpen(true);
  };

  const handleSaveItem = async () => {
    setIsModalOpen(false);
    if (activeActionTab === 'history') {
      if (!newItem.client || !newItem.proposal) return;
      const payload: any = { location_id: LOCATION_ID, date: newItem.startDate ? 
      newItem.startDate.replace(/-/g, '/') : '', client: newItem.client, proposal: newItem.proposal, detail: newItem.detail || '', result: newItem.result, url: newItem.url || '' };
      if (editingIndex !== null) { payload.id = historyItems[editingIndex].id; await supabaseRequest('sales_history', 'PATCH', payload); }
      else { await supabaseRequest('sales_history', 'POST', payload); }
    } else {
      if (!newItem.name) return;
      const payload: any = { location_id: LOCATION_ID, name: newItem.name, effect: newItem.effect || '未入力', start_date: newItem.startDate ? 
      newItem.startDate.replace(/-/g, '/') : '', end_date: newItem.endDate ? newItem.endDate.replace(/-/g, '/') : '', customer_related: newItem.customerRelated ? 
      'あり' : 'なし', ratio: Number(newItem.ratio), url: newItem.url || '' };
      const targetTable = activeActionTab === 'dx' ? 'dx_actions' : 'env_actions';
      if (editingIndex !== null) {
        const targetList = activeActionTab === 'dx' ? dxItems : envItems; payload.id = targetList[editingIndex].id; await supabaseRequest(targetTable, 'PATCH', payload);
      } else { await supabaseRequest(targetTable, 'POST', payload); }
    }
    await fetchSupabaseData();
    showToast('データを保存しました', 'success');
  };

  const handleDeleteItem = async (indexToDelete: number) => {
    if (activeActionTab === 'history') await supabaseRequest('sales_history', 'DELETE', { id: historyItems[indexToDelete].id });
    else if (activeActionTab === 'dx') await supabaseRequest('dx_actions', 'DELETE', { id: dxItems[indexToDelete].id });
    else await supabaseRequest('env_actions', 'DELETE', { id: envItems[indexToDelete].id });
    await fetchSupabaseData();
    showToast('データを削除しました', 'success');
  };

  const handleToggleHideItem = async (item: any, table: string) => {
    const payload = { id: item.id, is_hidden: !item.is_hidden };
    await supabaseRequest(table, 'PATCH', payload);
    await fetchSupabaseData();
    showToast(item.is_hidden ? '項目を再表示しました' : '項目を非表示にしました', 'success');
  };

  const handleToggleHideMetric = async (metricTitle: string) => {
    const existing = metricSettings.find(s => s.tab_id === activeTab && s.metric_title === metricTitle);
    const isCurrentlyHidden = existing ? existing.is_hidden : false;
    await handleToggleMetricSetting(metricTitle, 'is_hidden', isCurrentlyHidden);
  };

  const handleTogglePinMetric = async (metricTitle: string) => {
    const existing = metricSettings.find(s => s.tab_id === activeTab && s.metric_title === metricTitle);
    const isCurrentlyPinned = existing ? existing.is_pinned : false;
    await handleToggleMetricSetting(metricTitle, 'is_pinned', isCurrentlyPinned);
  };

  const handleSaveGoal = async () => {
    const payload: any = { location_id: LOCATION_ID, quarter: currentQuarterInfo.name, goal_text: editGoalData.goal_text, target_value: Number(editGoalData.target_value) };
    if (currentAccidentGoal?.id) { payload.id = currentAccidentGoal.id; await supabaseRequest('accident_goals', 'PATCH', payload); } 
    else { await supabaseRequest('accident_goals', 'POST', payload); }
    await fetchSupabaseData();
    setIsGoalModalOpen(false);
    showToast('目標を保存しました', 'success');
  };

  const handleSaveMeasure = async () => {
    if (!editMeasureData.title || !editMeasureData.accident_type) {
      return showToast('事故種類と対策名は必須です', 'error');
    }
    const payload: any = {
      location_id: LOCATION_ID, 
      category: editMeasureData.category, 
      accident_type: editMeasureData.accident_type,
      accident_no: editMeasureData.accident_no,
      title: editMeasureData.title, 
      effect: editMeasureData.effect,
      start_date: editMeasureData.start_date.replace(/-/g, '/'), 
      url: editMeasureData.url, 
      status: editMeasureData.status, 
      is_hidden: false
    };
    
    if (editMeasureData.id) { payload.id = editMeasureData.id; await supabaseRequest('accident_measures', 'PATCH', payload); } 
    else { await supabaseRequest('accident_measures', 'POST', payload); }
    
    await fetchSupabaseData();
    setIsMeasureModalOpen(false);
    showToast('対策を保存しました', 'success');
  };

  const handleDeleteMeasure = async (id: string) => {
    if (!confirm("この対策を削除しますか？")) return;
    await supabaseRequest('accident_measures', 'DELETE', { id });
    await fetchSupabaseData();
    showToast('対策を削除しました', 'success');
  };

  if (!data || !isMounted) {
    return (
      <div className="h-screen bg-slate-50 flex flex-col items-center justify-center relative overflow-hidden notranslate" translate="no">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse" />
        <div className="relative z-10 flex flex-col items-center">
          <div className="bg-white px-6 py-3.5 rounded-2xl mb-8 shadow-sm border border-slate-200">
            <img src="/pal-logo.png" alt="PAL Logo" className="h-8 md:h-10 w-auto object-contain" />
          </div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-[0.2em] mb-8 text-slate-800 text-center px-4 drop-shadow-sm">
            <span className="text-blue-600">PAL</span> Productivity Dashboard
          </h1>
          <div className="w-64 h-1.5 bg-slate-200 rounded-full overflow-hidden mb-6 shadow-inner relative">
            <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full w-1/2" style={{ animation: 'loading-slide 2s ease-in-out infinite' }} />
          </div>
          <div className="flex items-center gap-3 text-slate-500">
            <Loader2 className="animate-spin text-blue-500" size={18} />
            <span className="text-[11px] font-bold tracking-widest uppercase">Connecting to Database...</span>
          </div>
        </div>
        <style dangerouslySetInnerHTML={{__html: `@keyframes loading-slide { 0% { transform: translateX(-100%); width: 50%; } 100% { transform: translateX(250%); width: 50%; } }`}} />
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20 notranslate print:bg-white print:pb-0 print:block" translate="no">
      <style dangerouslySetInnerHTML={{__html: `@media print { @page { size: A4 portrait; margin: 10mm; } body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } main { zoom: 0.65; } .print-avoid-break { page-break-inside: avoid; } }`}} />

      <header className="bg-white border-b border-slate-200 px-4 md:px-10 py-3 md:py-0 md:h-20 flex flex-col md:flex-row justify-between items-center sticky top-0 z-40 backdrop-blur-md bg-white/80 gap-3 md:gap-0 print:hidden">
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3">
            <img src="/pal-logo.png" alt="PAL Logo" className="h-6 md:h-7 w-auto object-contain shrink-0" />
            <div className="h-4 w-[1px] bg-slate-200 shrink-0 hidden md:block" />
          </div>
          <Link href="/" className="flex items-center gap-1.5 text-slate-400 no-underline font-black hover:text-blue-600 transition-colors">
            <ArrowLeft size={15} /> <span className="text-[11px] md:text-xs tracking-tight">MAPへ</span>
          </Link>
        </div>
        <div className="text-center w-full md:w-auto order-first md:order-none mb-1 md:mb-0">
          <h1 className="text-base md:text-lg font-black italic tracking-tighter uppercase text-slate-800">経営ダッシュボード : {LOCATION_NAME}</h1>
          <p className="text-[8px] md:text-[9px] font-bold text-blue-600 tracking-[0.2em] uppercase mt-0.5">STRATEGIC MANAGEMENT LAYER</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2 md:gap-3 items-center w-full md:w-auto">
          <div className="hidden md:flex gap-1 md:gap-2 mr-1">
            <button onClick={handleReloadData} className="p-2 md:px-3 md:py-2 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-lg md:rounded-xl transition-all shadow-sm flex items-center gap-1.5 border border-slate-200"><RefreshCw size={13} /><span className="hidden md:inline text-[10px] font-black tracking-wider">データ更新</span></button>
            <button onClick={() => window.print()} className="p-2 md:px-3 md:py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg md:rounded-xl transition-all shadow-md flex items-center gap-1.5"><Printer size={13} /><span className="hidden md:inline text-[10px] font-black tracking-wider">PDF出力</span></button>
          </div>
          {['sales', 'manhours', 'volume', 'productivity', 'labor'].includes(activeTab) && (
            <div className="flex bg-white md:bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1 shadow-sm w-[48%] md:w-auto justify-between">
              <button onClick={() => setDisplayMode('daily')} className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${displayMode === 'daily' ? 'bg-slate-900 md:bg-white text-white md:text-blue-600 shadow-sm border border-slate-200/50' : 'text-slate-400 hover:text-slate-600'}`}>日次</button>
              <button onClick={() => setDisplayMode('weekly')} className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${displayMode === 'weekly' ? 'bg-slate-900 md:bg-white text-white md:text-blue-600 shadow-sm border border-slate-200/50' : 'text-slate-400 hover:text-slate-600'}`}>週次</button>
              <button onClick={() => setDisplayMode('monthly')} className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${displayMode === 'monthly' ? 'bg-slate-900 md:bg-white text-white md:text-blue-600 shadow-sm border border-slate-200/50' : 'text-slate-400 hover:text-slate-600'}`}>月次</button>
            </div>
          )}
          {activeTab === 'actions' && <button onClick={handleOpenAddModal} className="hidden md:flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black tracking-wider transition-all shadow-md"><Plus size={14} /> 新規追加</button>}
        </div>
      </header>

      <main className="p-4 md:p-8 max-w-[1800px] mx-auto space-y-4 md:space-y-6 print:p-0 print:space-y-8">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 print:hidden">
          <div className="flex flex-wrap gap-2">
            {tabs.map((t) => <button key={t.id} onClick={() => handleTabChange(t.id)} className={`px-3 md:px-4 py-2.5 rounded-xl transition-all font-black text-[10px] md:text-xs flex-grow md:flex-grow-0 text-center ${activeTab === t.id ? 'bg-slate-900 text-white shadow-lg' : 'bg-white border text-slate-500 hover:bg-slate-50'}`}>{t.label}</button>)}
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto justify-end">
            {['sales', 'manhours', 'volume', 'productivity', 'labor'].includes(activeTab) && (
              <button onClick={() => setShowHiddenMetrics(!showHiddenMetrics)} className={`px-3 py-2 rounded-xl text-[10px] md:text-xs font-black border transition-all whitespace-nowrap shrink-0 shadow-sm ${showHiddenMetrics ? 'bg-slate-800 text-white border-slate-700 shadow-inner' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                {showHiddenMetrics ? '非表示グラフを隠す(ON)' : '非表示グラフを表示'}
              </button>
            )}
            <div className="relative w-full sm:w-72 shrink-0">
              <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="項目を絞り込み検索..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white border border-slate-200 text-xs font-bold text-slate-700 pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" />
            </div>
            
            {['accidents'].includes(activeTab) && (
              <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 px-3 py-2.5 rounded-xl shadow-sm shrink-0">
                <Calendar size={14} className="text-blue-500" />
                <select value={globalSelectedMonth} onChange={(e) => setGlobalSelectedMonth(e.target.value)} className="bg-transparent border-none text-blue-800 text-xs font-black focus:outline-none cursor-pointer">
                  {availableMonths.map((m, idx) => (
                    <option key={idx} value={m.month}>{m.display}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="text-blue-400" />
              </div>
            )}
          </div>
        </div>

        {displayMode === 'weekly' && !['monthly', 'actions', 'accidents', 'contract'].includes(activeTab) && (
          <div className="bg-white border border-slate-200 p-3 md:p-4 rounded-2xl md:rounded-3xl shadow-sm flex flex-wrap gap-2 items-center print:hidden">
            <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-wider mr-2 ml-1">週の選択:</span>
            {weeklyGroups.map((g, idx) => <button key={idx} onClick={() => setSelectedWeek(idx)} className={`px-4 md:px-5 py-2 rounded-xl font-black text-[10px] md:text-xs transition-all ${selectedWeek === idx ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>{g.label}</button>)}
          </div>
        )}

        {/* =========================================
        【1〜5】売上・工数・物量・生産性・労務管理 共通グラフエリア
        ========================================= */}
        {['sales', 'manhours', 'volume', 'productivity', 'labor'].includes(activeTab) && (
          <div className={`grid gap-4 md:gap-6 print:grid-cols-2 print:gap-8 ${displayMode !== 'daily' ? 'grid-cols-1 lg:grid-cols-2' : ''}`} style={displayMode === 'daily' ? { gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 450px), 1fr))' } : {}}>
            {finalSortedMetrics.length === 0 && <div className="col-span-full py-10 text-center text-slate-400 font-bold">データがありません。GAS側でデータを転写してください。</div>}

            {finalSortedMetrics.map((m, i) => {
              const isAvgMetric = m.title.includes("生産性") || m.title.includes("%") || m.title.includes("率") || m.title.includes("単価") || m.title.includes("時給");
              const isCost = lowIsBetterMetrics.some(k => m.title.includes(k)) || activeTab === 'manhours' || m.title.includes('原価');
              const isStacked = m.isStacked;
              const isMonthly = displayMode === 'monthly';
              const isWeekly = displayMode === 'weekly';
              const lastLbl = isWeekly ? '先週' : '先月';

              let chartData = [];
              let dispAct = m._sortVal; 
              let dispFct = 0; 
              let dispLastAct: number | null = 0; 
              let dispPrevYearAct = 0;
              
              let currentRatio = 0; 
              let isPaceGood = true; // 🌟 追加：緑・赤のペース判定用

              let diffLastMonth = 0; 
              let diffLastYear = 0;
              let lastMonthRatio = 0; 
              let lastYearRatio = 0; 
              let hasForecastData = m.forecast?.some((v: number) => n(v) > 0) || false;

              let totalChakuchi = 0; 
              let validChakuchiDays = 0;
              let dailyAvg = 0;

              const weekIdx = weeklyGroups[selectedWeek]?.indices || [];
              const lastInputIdx = m._lastInputIdx !== undefined ? m._lastInputIdx : -1;
              const targetIndices = isMonthly ? currentMonthIndices : (isWeekly ? weekIdx : currentMonthIndices.filter(idx => idx <= lastInputIdx));

              if (isMonthly) {
                dispAct = m._monthlyChakuchi;
                dispFct = m._monthlyBudget;
                dispLastAct = m._monthlyLastAct;
                dispPrevYearAct = m._monthlyPrevYearAct;

                currentRatio = dispFct > 0 ? (dispAct / dispFct) * 100 : 0;
                isPaceGood = isCost ? dispAct <= dispFct : dispAct >= dispFct;

                currentMonthIndices.forEach(idx => {
                  let actVal = isStacked ? (n(m.data['通常']?.actual_thisMonth[idx]) + n(m.data['残業']?.actual_thisMonth[idx]) + n(m.data['深夜']?.actual_thisMonth[idx])) : n(m.actual_thisMonth?.[idx]);
                  if (actVal > 0) { totalChakuchi += actVal; validChakuchiDays++; }
                });
                dailyAvg = validChakuchiDays > 0 ? totalChakuchi / validChakuchiDays : 0;

              } else if (isWeekly) {
                if (!isStacked) {
                  const fcts = targetIndices.map(idx => n(m.forecast[idx]));
                  dispFct = isAvgMetric ? (fcts.filter(v=>v>0).length>0?fcts.filter(v=>v>0).reduce((a,b)=>a+b,0)/fcts.filter(v=>v>0).length:0) : fcts.reduce((a, b) => a + b, 0);
                } else {
                  dispFct = m.forecast && m.forecast.length > 0 ? targetIndices.reduce((sum, idx) => sum + n(m.forecast[idx]), 0) : 0;
                }
                dispPrevYearAct = targetIndices.reduce((sum, idx) => sum + (isStacked ? (n(m.data['通常']?.actual_lastYear[idx])+n(m.data['残業']?.actual_lastYear[idx])+n(m.data['深夜']?.actual_lastYear[idx])) : n(m.actual_lastYear[idx])), 0);
                if (isAvgMetric) dispPrevYearAct /= targetIndices.length || 1;

                if (selectedWeek === 0) {
                  dispLastAct = null;
                } else {
                  const prevWeekIndices = weeklyGroups[selectedWeek - 1].indices;
                  dispLastAct = prevWeekIndices.reduce((sum, idx) => sum + (isStacked ? (n(m.data['通常']?.actual_thisMonth[idx])+n(m.data['残業']?.actual_thisMonth[idx])+n(m.data['深夜']?.actual_thisMonth[idx])) : n(m.actual_thisMonth[idx])), 0);
                  if (isAvgMetric) dispLastAct /= prevWeekIndices.length || 1;
                }

                currentRatio = dispFct > 0 ? (dispAct / dispFct) * 100 : 0;
                isPaceGood = isCost ? dispAct <= dispFct : dispAct >= dispFct;
              } else {
                // 🌟 日次モード（Daily）
                let totalMonthlyFct = 0;
                let paceFct = 0;
                let validBudgetDays = 0;
                let validPaceDays = 0;

                currentMonthIndices.forEach(idx => {
                  let f = isStacked ? (m.forecast ? n(m.forecast[idx]) : 0) : n(m.forecast[idx]);
                  if (f > 0) validBudgetDays++;
                  totalMonthlyFct += f;
                  if (idx <= lastInputIdx) {
                    paceFct += f;
                    if (f > 0) validPaceDays++;
                  }
                });

                if (isAvgMetric) {
                  totalMonthlyFct = validBudgetDays > 0 ? totalMonthlyFct / validBudgetDays : 0;
                  paceFct = validPaceDays > 0 ? paceFct / validPaceDays : 0;
                }

                if (!isStacked) {
                  const fcts = targetIndices.map(idx => n(m.forecast[idx]));
                  dispFct = isAvgMetric ? (fcts.filter(v=>v>0).length>0?fcts.filter(v=>v>0).reduce((a,b)=>a+b,0)/fcts.filter(v=>v>0).length:0) : fcts.reduce((a, b) => a + b, 0);
                } else {
                  dispFct = m.forecast && m.forecast.length > 0 ? targetIndices.reduce((sum, idx) => sum + n(m.forecast[idx]), 0) : 0;
                }
                
                dispLastAct = targetIndices.reduce((sum, idx) => sum + (isStacked ? (n(m.data['通常']?.actual_lastMonth[idx])+n(m.data['残業']?.actual_lastMonth[idx])+n(m.data['深夜']?.actual_lastMonth[idx])) : n(m.actual_lastMonth[idx])), 0);
                dispPrevYearAct = targetIndices.reduce((sum, idx) => sum + (isStacked ? (n(m.data['通常']?.actual_lastYear[idx])+n(m.data['残業']?.actual_lastYear[idx])+n(m.data['深夜']?.actual_lastYear[idx])) : n(m.actual_lastYear[idx])), 0);
                if (isAvgMetric) { dispLastAct /= targetIndices.length || 1; dispPrevYearAct /= targetIndices.length || 1; }

                // 日次の進捗％：月間トータル枠に対してどこまで来ているか（平均の場合は目標平均に対して今の平均がどうなのか）
                currentRatio = totalMonthlyFct > 0 ? (dispAct / totalMonthlyFct) * 100 : 0;
                
                // 日次のペース色判定：最終入力日時点までの「本来の予算（paceFct）」vs「実績（dispAct）」
                isPaceGood = isCost ? dispAct <= paceFct : dispAct >= paceFct;
              }

              // 🌟 緑・赤の色分け（パーセンテージとは切り離した判定）
              const ratioColorClass = isPaceGood ? 'text-emerald-400' : 'text-rose-400';

              diffLastMonth = dispLastAct !== null ? dispAct - dispLastAct : 0; 
              diffLastYear = dispAct - dispPrevYearAct;
              lastMonthRatio = dispLastAct !== null && dispLastAct > 0 ? (dispAct / dispLastAct) * 100 : (dispLastAct !== null && dispAct > 0 ? 100 : 0);
              lastYearRatio = dispPrevYearAct > 0 ? (dispAct / dispPrevYearAct) * 100 : (dispAct > 0 ? 100 : 0);

              const chartIndicesForRender = isMonthly ? currentMonthIndices : (displayMode === 'daily' ? currentMonthIndices : weekIdx);
              chartData = chartIndicesForRender.map(idx => {
                if (isStacked) {
                  let fctVal = m.forecast ? n(m.forecast[idx]) : 0;
                  if (fctVal === 0 && !hasForecastData && !isAvgMetric && dailyAvg > 0) {
                    fctVal = dailyAvg;
                  }
                  return { 
                    name: baseLabelsFiltered[idx], 
                    通常: n(m.data['通常']?.actual_thisMonth[idx]), 
                    残業: n(m.data['残業']?.actual_thisMonth[idx]), 
                    深夜: n(m.data['深夜']?.actual_thisMonth[idx]),
                    [m.forecastType]: fctVal
                  };
                }
                
                let fctVal = n(m.forecast[idx]);
                if (fctVal === 0 && !hasForecastData && !isAvgMetric && dailyAvg > 0) {
                  fctVal = dailyAvg;
                }
                return { name: m.labels[idx], 今月実績: n(m.actual_thisMonth[idx]), 先月: n(m.actual_lastMonth[idx]), 前年: n(m.actual_lastYear[idx]), [m.forecastType]: fctVal };
              });

              if (!hasForecastData && !isAvgMetric && dailyAvg > 0) hasForecastData = true;

              const getDiffBgBorderColor = (diff: number | null, isCost: boolean) => {
                if (diff === null || diff === 0) return 'text-slate-500 bg-slate-50 border-slate-200';
                return (isCost ? diff > 0 : diff < 0) ? 'text-rose-600 bg-rose-50 border-rose-200' : 'text-emerald-600 bg-emerald-50 border-emerald-200';
              };
              const getDarkBadgeStyle = (diff: number | null, isCost: boolean) => {
                if (diff === null || diff === 0) return 'bg-slate-800 text-slate-400 border-slate-700';
                return (isCost ? diff > 0 : diff < 0) ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
              };

              const primaryColor = currentTab.color;
              const secondaryColor = '#8b5cf6';

              return (
                <div key={i} className={`print-avoid-break p-4 rounded-2xl shadow-sm flex flex-col gap-3 min-w-0 overflow-hidden transition-all border ${m.is_hidden ? 'opacity-40 bg-slate-100 border-dashed border-amber-300' : 'bg-white border-slate-200'}`}>
                  
                  {/* ヘッダー領域: バッジ類とタイトル */}
                  <div className="flex flex-col gap-2 border-b border-slate-100 pb-2">
                    <div className="flex justify-between items-center w-full">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] md:text-[11px] font-black text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200 uppercase tracking-widest shadow-sm whitespace-nowrap">{dataMonth}月</span>
                        {m.is_pinned && <span className="text-[9px] font-black bg-blue-600 text-white px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow-sm">📌 固定中</span>}
                      </div>
                      <div className="flex gap-1.5 print:hidden z-20">
                        <button onClick={() => handleTogglePinMetric(m.title)} className={`w-7 h-7 flex items-center justify-center rounded-full border shadow-sm transition-all ${m.is_pinned ? 'bg-blue-100 border-blue-300 text-blue-600 font-black' : 'bg-white text-slate-400 hover:text-blue-500'}`} title={m.is_pinned ? "最上位ピン留めを解除" : "最上位にピン留めする"}><Pin size={13} className={m.is_pinned ? "fill-blue-600 rotate-45" : ""} /></button>
                        <button onClick={() => handleToggleHideMetric(m.title)} className={`w-7 h-7 flex items-center justify-center rounded-full border shadow-sm transition-all ${m.is_hidden ? 'bg-amber-100 border-amber-300 text-amber-600' : 'bg-white text-slate-400 hover:text-amber-500'}`} title={m.is_hidden ? "グラフを表示する" : "グラフを非表示にする"}><Eye size={13} /></button>
                      </div>
                    </div>
                    <h4 className="text-sm md:text-base font-black text-slate-900 tracking-tighter leading-snug truncate" title={m.title}>{m.title}</h4>
                  </div>

                  {/* 実績額と進捗率、比較バッジ */}
                  <div className="flex flex-col gap-2.5 pt-0.5 pb-1">
                    <div className="flex justify-between items-start w-full gap-4">
                      <div className="flex-1">
                        {(displayMode === 'daily' || displayMode === 'monthly') && (
                          <div className="mt-0">
                            {/* 💡 物量の月次なら「当月実績合計」、それ以外は「月末着地予測」 */}
                            <span className="text-[10px] md:text-[11px] font-bold text-slate-400 block mb-0.5">
                              {isMonthly ? (activeTab === 'volume' ? '当月実績合計' : '月末着地予測') : (!isAvgMetric ? '当週合計実績' : '当週平均実績')}
                            </span>
                            <p className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tighter leading-none">{formatVal(dispAct, m.title)}</p>
                          </div>
                        )}
                      </div>
                      
                      {/* 💡 工数と労務管理の時は「目標・達成率」パネルを非表示にする */}
                      {(displayMode === 'daily' || displayMode === 'monthly') && (hasForecastData || isMonthly) && !isStacked && !['manhours', 'labor'].includes(activeTab) && (
                        <div className="flex items-center gap-2 bg-slate-900 text-white px-3 py-1.5 rounded-xl shadow-sm text-right shrink-0">
                          {/* 💡 物量の月次なら「予測達成率」 */}
                          <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">{isMonthly ? (activeTab === 'volume' ? '予測達成率' : '予算達成率') : '月間進捗'}</span>
                          <span className={`text-sm sm:text-base font-black whitespace-nowrap ${ratioColorClass}`}>{currentRatio.toFixed(1)}%</span>
                        </div>
                      )}
                    </div>

                    {/* 先月差・前年差のバッジ右詰め */}
                    {(displayMode === 'daily' || displayMode === 'monthly') && (
                      <div className="flex flex-col gap-1.5 w-full mt-0.5">
                        <div className="flex flex-wrap gap-1.5 justify-end">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 border shadow-sm ${getDiffBgBorderColor(dispLastAct === null ? null : diffLastMonth, isCost)}`}>
                            <span className="text-slate-400 font-medium">{lastLbl}{isMonthly ? '差' : '比'}:</span>
                            <span className="font-black">{dispLastAct === null ? '-' : (diffLastMonth > 0 ? '+' : '') + formatVal(diffLastMonth, m.title)}</span>
                            {dispLastAct !== null && <span className="text-[9px] opacity-75">({lastMonthRatio.toFixed(1)}%)</span>}
                          </span>
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 border shadow-sm ${getDiffBgBorderColor(diffLastYear, isCost)}`}>
                            <span className="text-slate-400 font-medium">前年{isMonthly ? '差' : '比'}:</span>
                            <span className="font-black">{diffLastYear > 0 ? '+' : ''} {formatVal(diffLastYear, m.title)}</span>
                            <span className="text-[9px] opacity-75">({lastYearRatio.toFixed(1)}%)</span>
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 justify-end mt-0.5">
                          <span className="bg-slate-50 text-slate-600 px-2.5 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1 shadow-sm">
                            <span className="text-slate-400 font-medium">{lastLbl}:</span>
                            <span className="font-mono font-black">{dispLastAct === null ? '-' : formatVal(dispLastAct, m.title)}</span>
                          </span>
                          <span className="bg-amber-50 text-amber-800 px-2.5 py-1 rounded-lg border border-amber-200 text-[10px] font-bold flex items-center gap-1 shadow-sm">
                            <span className="text-amber-500 font-medium">前年:</span>
                            <span className="font-mono font-black">{formatVal(dispPrevYearAct, m.title)}</span>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className={displayMode !== 'daily' ? 'flex flex-col xl:flex-row gap-4 items-stretch w-full min-w-0' : 'w-full min-w-0'}>
                    <div className="flex-1 w-full h-[220px] min-h-[220px] bg-slate-50/50 p-2 rounded-2xl border min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        {isStacked ? (
                          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} axisLine={false} tickLine={false} />
                            <YAxis stroke="#94a3b8" fontSize={9} axisLine={false} tickLine={false} tickFormatter={(v) => v.toLocaleString()} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                            <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', paddingBottom: '10px' }} />
                            <Bar name="通常" dataKey="通常" stackId="a" fill="#0ea5e9" />
                            <Bar name="残業" dataKey="残業" stackId="a" fill="#ef4444" />
                            <Bar name="深夜" dataKey="深夜" stackId="a" fill="#a855f7" radius={[4, 4, 0, 0]} />
                            {hasForecastData && <Area type="step" name={m.forecastType} dataKey={m.forecastType} stroke={secondaryColor} strokeWidth={2} strokeDasharray="5 5" fillOpacity={0} />}
                          </ComposedChart>
                        ) : (
                          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id={`colorAct-${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={primaryColor} stopOpacity={0.4}/><stop offset="95%" stopColor={primaryColor} stopOpacity={0}/></linearGradient>
                              <linearGradient id={`colorFct-${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={secondaryColor} stopOpacity={0.15}/><stop offset="95%" stopColor={secondaryColor} stopOpacity={0}/></linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} axisLine={false} tickLine={false} />
                            <YAxis stroke="#94a3b8" fontSize={9} axisLine={false} tickLine={false} tickFormatter={(v) => v.toLocaleString()} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                            <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', paddingBottom: '10px' }} />
                            {chartData.some(d => d["前年"]) && <Area type="monotone" name="前年" dataKey="前年" stroke="#fbbf24" strokeWidth={2.5} fillOpacity={0} />}
                            {chartData.some(d => d["先月"]) && <Area type="monotone" name="先月" dataKey="先月" stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 4" fillOpacity={0} />}
                            <Area type="monotone" name="今月実績" dataKey="今月実績" stroke={primaryColor} strokeWidth={3} fillOpacity={1} fill={`url(#colorAct-${i})`} activeDot={{ r: 5 }} />
                            {hasForecastData && <Area type="step" name={m.forecastType} dataKey={m.forecastType} stroke={secondaryColor} strokeWidth={2} strokeDasharray="5 5" fillOpacity={1} fill={`url(#colorFct-${i})`} />}
                          </AreaChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                    {/* 週次・月次の時に右側に出現する黒いフォアキャストパネル */}
                    {displayMode !== 'daily' && (
                      <div className="w-full xl:w-[240px] bg-slate-900 text-white p-5 rounded-2xl flex flex-col justify-between shrink-0 shadow-inner min-w-0">
                        <div>
                          <p className="text-[9px] font-black tracking-widest text-blue-400 uppercase mb-3">{isMonthly ? '月次フォアキャスト確定' : (!isAvgMetric ? '当週合計確認':'当週平均確認')}</p>
                          <div className="mb-3">
                            {/* 💡 物量の月次なら「当月実績合計」、それ以外は「月末着地予測」 */}
                            <span className="text-[10px] md:text-[11px] font-bold text-slate-400 block mb-0.5">
                              {isMonthly ? (activeTab === 'volume' ? '当月実績合計' : '月末着地予測') : (!isAvgMetric ? '当週合計実績' : '当週平均実績')}
                            </span>
                            <span className="text-2xl md:text-3xl font-black text-white block tracking-tighter">{formatVal(dispAct, m.title)}</span>
                          </div>
                          
                          {/* 💡 工数と労務管理の時は「目標・達成率」パネルを非表示にする */}
                          {(hasForecastData || isMonthly) && !isStacked && !['manhours', 'labor'].includes(activeTab) && (
                            <div className="space-y-2 mt-3 pt-3 border-t border-slate-700/50">
                              <div className="flex justify-between items-baseline">
                                <span className="text-[10px] md:text-xs font-bold text-slate-400 whitespace-nowrap">
                                  {isMonthly ? (activeTab === 'volume' ? `今月${m.forecastType}合計` : '今月目標設定') : (!isAvgMetric ? `当週${m.forecastType}` : `当週平均${m.forecastType}`)}
                                </span>
                                <span className="text-sm md:text-base font-bold text-slate-300">{formatVal(dispFct, m.title)}</span>
                              </div>
                              <div className="flex justify-between items-baseline">
                                <span className="text-[10px] md:text-xs font-black text-blue-400 whitespace-nowrap">達成率</span>
                                <span className={`text-lg md:text-xl font-black whitespace-nowrap ${ratioColorClass}`}>{currentRatio.toFixed(1)}%</span>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="border-t border-slate-800 pt-3 mt-3 flex flex-col gap-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">{lastLbl}{isMonthly?'着地':'比'}</span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border whitespace-nowrap ${getDarkBadgeStyle(dispLastAct === null ? null : diffLastMonth, isCost)}`}>
                              {dispLastAct === null ? '-' : `${diffLastMonth > 0 ? '▲' : diffLastMonth < 0 ? '▼' : ''} ${lastMonthRatio.toFixed(1)}%`}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">前年{isMonthly?'着地':'比'}</span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border whitespace-nowrap ${getDarkBadgeStyle(diffLastYear, isCost)}`}>
                              {diffLastYear > 0 ? '▲' : diffLastYear < 0 ? '▼' : ''} {lastYearRatio.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* =========================================
        🌟【統合】6. 月次データ統合タブ（サブタブ式）
        ========================================= */}
        {activeTab === 'monthly' && (
          <div className="space-y-6">
            <div className="border-b border-slate-200 pb-3 md:pb-4 flex flex-col gap-4">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 md:gap-3"><Award className="text-sky-500" size={24} /> 6. 月次統合データ</h2>
                <p className="text-slate-400 text-xs md:text-sm font-bold mt-1 uppercase tracking-widest">Monthly Confirmed & Productivity Report</p>
              </div>
              
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1 shadow-sm w-full sm:w-auto self-start print:hidden">
                <button onClick={() => setActiveMonthlyTab('salesConfirmed')} className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${activeMonthlyTab === 'salesConfirmed' ? 'bg-white text-sky-600 shadow-sm border border-slate-200/60' : 'text-slate-500 hover:text-slate-800'}`}><CheckCircle2 size={14} /> 売上確定</button>
                <button onClick={() => setActiveMonthlyTab('productivity')} className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${activeMonthlyTab === 'productivity' ? 'bg-white text-amber-600 shadow-sm border border-slate-200/60' : 'text-slate-500 hover:text-slate-800'}`}><Award size={14} /> 生産性推移</button>
              </div>
            </div>

            {/* サブタブ内訳1: 月次売上確定 */}
            {activeMonthlyTab === 'salesConfirmed' && (
              <div className="space-y-4">
                <div className="flex justify-end print:hidden">
                  <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-xl shadow-sm">
                    <Calendar size={12} className="text-blue-500" />
                    <select value={salesMonth} onChange={(e) => setSalesMonth(e.target.value)} className="bg-transparent border-none text-blue-800 text-[10px] md:text-[11px] font-black focus:outline-none cursor-pointer">
                      {Object.keys(data?.salesConfirmedData || {}).sort().reverse().map((m, idx) => {
                        const parts = m.split('/');
                        const displayStr = parts.length === 2 ? `${parts[0].slice(-2)}年${parseInt(parts[1], 10)}月` : m;
                        return <option key={idx} value={m}>{displayStr}</option>;
                      })}
                    </select>
                    <ChevronDown size={11} className="text-blue-400" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                  {(!data?.salesConfirmedData || !data.salesConfirmedData[salesMonth] || data.salesConfirmedData[salesMonth].length === 0) ? (
                    <div className="col-span-full py-10 text-center text-slate-400 font-bold">選択された月度の月次確定データがありません。シートの転写マクロを実行してください。</div>
                  ) : (
                    data.salesConfirmedData[salesMonth].map((item: any, i: number) => {
                      const diffLastMonth = item.今月 - item.先月;
                      return (
                        <div key={i} className="bg-white border border-slate-200 p-4 md:p-5 rounded-2xl shadow-sm flex flex-col justify-between gap-3 transition-all hover:shadow-md border-t-4 print:break-inside-avoid print:shadow-none print:border-slate-300" style={{ borderTopColor: '#0ea5e9' }}>
                          <h4 className="text-sm md:text-base font-black text-slate-800 tracking-tight line-clamp-2">{item.title}</h4>
                          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 mt-2 print:bg-white print:border-slate-200">
                            <div className="flex justify-between items-end mb-2">
                              <span className="text-[10px] md:text-xs font-bold text-sky-600 whitespace-nowrap">当月確定</span>
                              <span className="text-lg md:text-xl font-black text-slate-900 whitespace-nowrap">{formatVal(item.今月, item.title)}</span>
                            </div>
                            <div className="space-y-1.5 pt-2 border-t border-slate-200/60">
                              <div className="flex justify-between items-center">
                                <span className="text-[9px] md:text-[10px] font-bold text-slate-400 whitespace-nowrap">前月確定</span>
                                <div className="text-right flex items-center">
                                  <span className="text-xs font-bold text-slate-600 mr-2 whitespace-nowrap">{formatVal(item.先月, item.title)}</span>
                                  <span className={`text-[9px] font-black w-16 text-right whitespace-nowrap ${diffLastMonth > 0 ? 'text-emerald-500' : diffLastMonth < 0 ? 'text-rose-500' : 'text-slate-400'}`}>{diffLastMonth > 0 ? '▲' : diffLastMonth < 0 ? '▼' : '±'} {formatVal(Math.abs(diffLastMonth), item.title)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* 🌟 サブタブ内訳2: 月次生産性推移（データテーブル＋巨大サマリーカード） + 横並び％ */}
            {activeMonthlyTab === 'productivity' && (
              <div className="space-y-6">
                <div className="flex justify-end print:hidden">
                  <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-xl shadow-sm">
                    <Calendar size={12} className="text-blue-500" />
                    <select value={prodSelectedMonth} onChange={(e) => setProdSelectedMonth(e.target.value)} className="bg-transparent border-none text-blue-800 text-[10px] md:text-[11px] font-black focus:outline-none cursor-pointer">
                      {availableMonths.map((m, idx) => (
                        <option key={idx} value={m.month}>{m.display}</option>
                      ))}
                    </select>
                    <ChevronDown size={11} className="text-blue-400" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 bg-slate-900 text-white p-6 md:p-8 rounded-[2rem] shadow-xl border border-slate-800">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-amber-400 tracking-widest uppercase block">月間総実績物量 (指定カテゴリ合計)</span>
                    <div className="flex items-baseline gap-3">
                      <h3 className="text-3xl md:text-4xl font-black tracking-tighter text-white">
                        <AnimatedNumber value={computedVaultProductivity.summary.totalVolume} /> <span className="text-xs font-bold text-slate-400">点</span>
                      </h3>
                      {computedVaultProductivity.summary.lastMonthRatio.vol > 0 && (
                        <span className={`text-[11px] md:text-xs font-black ${computedVaultProductivity.summary.lastMonthRatio.vol >= 100 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          先月比: {computedVaultProductivity.summary.lastMonthRatio.vol.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1 border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-6">
                    <span className="text-[10px] font-black text-sky-400 tracking-widest uppercase block">月間総実績工数 (センター総工数金庫)</span>
                    <div className="flex items-baseline gap-3">
                      <h3 className="text-3xl md:text-4xl font-black tracking-tighter text-white">
                        <AnimatedNumber value={computedVaultProductivity.summary.totalHours} /> <span className="text-xs font-bold text-slate-400">h</span>
                      </h3>
                      {computedVaultProductivity.summary.lastMonthRatio.hrs > 0 && (
                        <span className={`text-[11px] md:text-xs font-black ${computedVaultProductivity.summary.lastMonthRatio.hrs <= 100 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          先月比: {computedVaultProductivity.summary.lastMonthRatio.hrs.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1 border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-6 bg-gradient-to-r from-transparent to-amber-500/5 rounded-xl">
                    <span className="text-[10px] font-black text-emerald-400 tracking-widest uppercase block">総作業生産性 (総物量 ÷ 総工数)</span>
                    <div className="flex items-baseline gap-3">
                      <h3 className="text-3xl md:text-4xl font-black tracking-tighter text-emerald-400">
                        {computedVaultProductivity.summary.totalProd.toFixed(1)} <span className="text-xs font-bold text-emerald-500/60">個/h</span>
                      </h3>
                      {computedVaultProductivity.summary.lastMonthRatio.prod > 0 && (
                        <span className={`text-[11px] md:text-xs font-black ${computedVaultProductivity.summary.lastMonthRatio.prod >= 100 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          先月比: {computedVaultProductivity.summary.lastMonthRatio.prod.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {computedVaultProductivity.items.length === 0 ? (
                    <div className="col-span-full py-10 text-center text-slate-400 font-bold">蓄積金庫にデータが存在しません。GAS側の一括更新スイッチを起動してください。</div>
                  ) : (
                    computedVaultProductivity.items.map((item, idx) => (
                      <div key={idx} className={`p-5 md:p-6 rounded-3xl shadow-sm flex flex-col gap-4 border bg-white border-slate-200 print-avoid-break print:shadow-none ${idx === 0 ? 'border-l-8 border-l-blue-600 bg-blue-50/5' : ''}`}>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-3 gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${idx === 0 ? 'bg-blue-500 animate-pulse' : 'bg-amber-500'}`} />
                            <h4 className="text-sm md:text-base font-black text-slate-900 tracking-tight">{item.process}</h4>
                          </div>
                          <div className="flex gap-4 text-[10px] md:text-xs font-bold text-slate-500 bg-slate-50 border border-slate-100 px-3 py-1 rounded-xl">
                            <div>期間物量: <span className="font-black text-slate-800">{item.totalVolume.toLocaleString()}</span></div>
                            {idx === 0 && <div>期間工数: <span className="font-black text-slate-800">{item.totalHours.toLocaleString()}h</span></div>}
                            <div className="text-blue-600">{idx === 0 ? '期間生産性' : '平均生産性'}: <span className="font-black">{item.totalProd.toFixed(1)}</span></div>
                          </div>
                        </div>

                        <div className="max-h-[250px] overflow-y-auto border border-slate-200/60 rounded-xl divide-y divide-slate-100 bg-slate-50/30">
                          <div className={`grid ${idx === 0 ? 'grid-cols-4' : 'grid-cols-3'} bg-slate-100 px-4 py-2 text-[9px] md:text-[10px] font-black text-slate-400 tracking-wider uppercase sticky top-0 z-10 border-b border-slate-200`}>
                            <div>日付</div>
                            <div className="text-right">実績物量</div>
                            {idx === 0 && <div className="text-right">実績工数</div>}
                            <div className="text-right text-blue-600">作業生産性</div>
                          </div>
                          {item.dailyList.filter((d: any) => d.volume > 0 || d.hours > 0 || d.prod > 0).length === 0 ? (
                            <div className="p-8 text-center text-xs text-slate-400 font-bold">この月の稼働蓄積データはありません。</div>
                          ) : (
                            item.dailyList.filter((d: any) => d.volume > 0 || d.hours > 0 || d.prod > 0).map((day: any, dIdx: number) => (
                              <div key={dIdx} className={`grid ${idx === 0 ? 'grid-cols-4' : 'grid-cols-3'} px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-white transition-colors items-center`}>
                                <div className="font-mono text-slate-400">{day.date}</div>
                                <div className="text-right font-mono text-slate-800">{day.volume.toLocaleString()}</div>
                                {idx === 0 && <div className="text-right font-mono text-slate-800">{day.hours.toLocaleString()} h</div>}
                                <div className="text-right font-mono font-black text-blue-600 bg-blue-50/50 py-0.5 px-1.5 rounded w-fit ml-auto">{day.prod > 0 ? day.prod.toFixed(1) : '0.0'}</div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================
        🚀 【7】アクション統合タブ
        ========================================= */}
        {activeTab === 'actions' && (
          <div className="space-y-6">
            <div className="border-b border-slate-200 pb-3 md:pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 md:gap-3"><Rocket className="text-purple-500" size={24} /> 7. アクション施策管理</h2>
                <p className="text-slate-400 text-xs md:text-sm font-bold mt-1 uppercase tracking-widest">Operation & DX Action Roadmap</p>
              </div>
              <button onClick={() => setShowHiddenItems(!showHiddenItems)} className={`px-3 py-1.5 md:px-4 md:py-2 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black border transition-all whitespace-nowrap shrink-0 shadow-sm print:hidden ${showHiddenItems ? 'bg-purple-600 text-white border-purple-700 shadow-inner' : 'bg-white text-purple-600 border-purple-200 hover:bg-purple-50'}`}>
                {showHiddenItems ? '非表示項目を隠す(ON)' : '非表示項目を表示'}
              </button>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1 shadow-sm max-w-md print:hidden">
              <button onClick={() => { setActiveActionTab('dx'); setSearchQuery(''); }} className={`flex-1 px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${activeActionTab === 'dx' ? 'bg-white text-purple-600 shadow-sm border border-slate-200/60' : 'text-slate-500 hover:text-slate-800'}`}><Rocket size={14} /> DX推進</button>
              <button onClick={() => { setActiveActionTab('env'); setSearchQuery(''); }} className={`flex-1 px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${activeActionTab === 'env' ? 'bg-white text-emerald-600 shadow-sm border border-slate-200/60' : 'text-slate-500 hover:text-slate-800'}`}><Leaf size={14} /> 現場改善</button>
              <button onClick={() => { setActiveActionTab('history'); setSearchQuery(''); }} className={`flex-1 px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${activeActionTab === 'history' ? 'bg-white text-rose-600 shadow-sm border border-slate-200/60' : 'text-slate-500 hover:text-slate-800'}`}><MessageSquare size={14} /> 営業履歴</button>
            </div>

            {(activeActionTab === 'dx' || activeActionTab === 'env') && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8 print:grid-cols-2">
                {(() => {
                  const currentItems = activeActionTab === 'dx' ? filteredDxItems : filteredEnvItems;
                  const sortedItems = [...currentItems].sort((a: any, b: any) => (b.start_date || '').localeCompare(a.start_date || ''));
                  const targetTable = activeActionTab === 'dx' ? 'dx_actions' : 'env_actions';
                  const displayItems = showHiddenItems ? sortedItems : sortedItems.filter((item: any) => !item.is_hidden);
                  const themeColor = activeActionTab === 'dx' ? '#7c3aed' : '#10b981';
                  
                  if (displayItems.length === 0) return <div className="col-span-1 lg:col-span-2 bg-white border p-8 md:p-12 rounded-2xl md:rounded-[2.5rem] text-center text-slate-400 font-bold text-xs md:text-sm">💡 該当する施策アクションはありません。</div>;
                  return displayItems.map((item, index) => {
                    const itemRatio = Math.min(100, Math.max(0, Math.round(n(item.ratio))));
                    const realIdx = (activeActionTab === 'dx' ? dxItems : envItems).findIndex(x => x.id === item.id);

                    return (
                      <div key={index} className={`print-avoid-break bg-white border p-5 md:p-8 rounded-3xl shadow-sm flex flex-col md:flex-row gap-4 md:gap-6 items-center transition-all relative overflow-hidden print:shadow-none print:border-slate-300 ${item.is_hidden ? 'opacity-40 bg-slate-100 border-dashed' : item.customer_related === 'あり' ? 'border-rose-200 bg-rose-50/10' : 'border-slate-200'}`}>
                        <div className="absolute top-3 right-3 flex gap-1.5 print:hidden">
                          <button onClick={() => handleToggleHideItem(item, targetTable)} className={`w-7 h-7 flex items-center justify-center rounded-full border shadow-sm transition-all ${item.is_hidden ? 'bg-amber-100 border-amber-200 text-amber-600' : 'bg-white text-slate-400 hover:text-amber-500'}`} title={item.is_hidden ? "再表示する" : "隠す"}>{item.is_hidden ? <Eye size={13} /> : <EyeOff size={13} />}</button>
                          <button onClick={() => handleOpenEditModal(realIdx)} className="w-7 h-7 flex items-center justify-center rounded-full bg-white border text-slate-400 shadow-sm hover:text-blue-500 transition-all"><Edit2 size={13} /></button>
                          <button onClick={() => { if(confirm("削除しますか？")) handleDeleteItem(realIdx); }} className="w-7 h-7 flex items-center justify-center rounded-full bg-white border text-slate-400 shadow-sm hover:text-rose-500 transition-all"><X size={14} /></button>
                        </div>
                        <div className="w-[120px] h-[120px] md:w-[140px] md:h-[140px] relative shrink-0 min-w-0 mt-6 md:mt-0 print:w-[140px] print:h-[140px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart><Pie data={[{ name: '完了', value: itemRatio }, { name: '未完了', value: 100 - itemRatio }]} cx="50%" cy="50%" innerRadius="65%" outerRadius="85%" startAngle={90} endAngle={-270} dataKey="value"><Cell fill={item.is_hidden ? "#94a3b8" : themeColor} /><Cell fill={item.customer_related === 'あり' ? "#ffe4e6" : "#f1f5f9"} /></Pie></PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-xl md:text-2xl font-black tracking-tighter" style={{ color: item.is_hidden ? '#64748b' : themeColor }}>{itemRatio}%</span><span className="text-[7px] md:text-[8px] font-bold text-slate-400 uppercase tracking-widest">{itemRatio === 100 ? '完了' : '進捗率'}</span></div>
                        </div>
                        <div className="flex-1 space-y-3 w-full pr-0 md:pr-10">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap mb-1">
                              <span className="text-[8px] md:text-[9px] font-black px-2 py-0.5 rounded-md text-white print:border print:text-slate-700" style={{ backgroundColor: item.is_hidden ? '#64748b' : themeColor }}>施策 {index + 1}</span>
                              {item.start_date && <span className="text-[8px] md:text-[9px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">📅 {item.start_date} ～ {item.end_date || '未定'}</span>}
                              {item.customer_related === 'あり' && !item.is_hidden && <span className="text-[8px] md:text-[9px] font-black px-2 py-0.5 rounded-md bg-rose-600 text-white shadow-sm">🚨 顧客関連</span>}
                            </div>
                            <h3 className="text-sm md:text-base font-black text-slate-900 tracking-tight leading-snug">{item.name}</h3>
                          </div>
                          {item.effect && item.effect !== "未入力" && <div className="text-[10px] md:text-[11px] font-medium text-slate-600 bg-slate-50 border p-2.5 md:p-3 rounded-xl print:bg-white print:border-slate-200"><span className="text-amber-500 font-black">💡 狙う効果:</span> {item.effect}</div>}
                          {item.url && (
                            <a href={item.url} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1.5 mt-2 text-[11px] font-black hover:underline transition-colors px-3 py-1.5 rounded-lg border border-transparent bg-slate-100 hover:bg-slate-200`} style={{ color: themeColor }}>
                              <FileText size={12} /> 関連資料・リンクを開く
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
            
            {activeActionTab === 'history' && (
              <div className="bg-white border border-slate-200 p-4 md:p-8 rounded-3xl shadow-sm space-y-4 md:space-y-6 print:shadow-none print:border-none print:p-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 py-2 print:grid-cols-2">
                  {(() => {
                    const sortedHistoryItems = [...filteredHistoryItems].sort((a: any, b: any) => {
                      const parseDate = (dStr: string) => {
                        if (!dStr) return new Date(0);
                        const parts = dStr.split('/');
                        if (parts.length === 3) return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                        if (parts.length === 2) return new Date(2026, parseInt(parts[0]) - 1, parseInt(parts[1]));
                        return new Date(dStr);
                      };
                      return parseDate(b.date).getTime() - parseDate(a.date).getTime();
                    });
                    const displayHistory = showHiddenItems ? sortedHistoryItems : sortedHistoryItems.filter((log: any) => !log.is_hidden);
                    if (displayHistory.length === 0) return <div className="col-span-1 lg:col-span-2 text-slate-400 text-[11px] md:text-sm font-bold pl-2 py-4">💡 該当する商談営業履歴ログはありません。</div>;
                    
                    return displayHistory.map((log, index) => {
                      const realIdx = historyItems.findIndex(x => x.id === log.id);
                      return (
                        <div key={index} className={`print-avoid-break bg-slate-50 border p-4 md:p-6 rounded-2xl md:rounded-3xl space-y-3 relative group transition-all print:bg-white print:border-slate-300 ${log.is_hidden ? 'opacity-40 bg-slate-200 border-dashed shadow-none' : 'border-slate-100 hover:shadow-md'}`}>
                          <div className="absolute top-3 right-3 flex gap-1.5 print:hidden">
                            <button onClick={() => handleToggleHideItem(log, 'sales_history')} className={`w-7 h-7 flex items-center justify-center rounded-full border shadow-sm transition-all ${log.is_hidden ? 'bg-amber-100 border-amber-200 text-amber-600' : 'bg-white text-slate-400 hover:text-amber-500'}`} title={log.is_hidden ? "再表示する" : "隠す"}>
                              {log.is_hidden ? <Eye size={13} /> : <EyeOff size={13} />}
                            </button>
                            <button onClick={() => handleOpenEditModal(realIdx)} className="w-7 h-7 flex items-center justify-center rounded-full bg-white border text-slate-400 shadow-sm hover:text-blue-500 transition-all"><Edit2 size={13} /></button>
                            <button onClick={() => { if(confirm("消去しますか？")) handleDeleteItem(realIdx); }} className="w-7 h-7 flex items-center justify-center rounded-full bg-white border text-slate-400 shadow-sm hover:text-rose-500 transition-all"><X size={14} /></button>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 md:gap-3 pr-24 print:pr-0">
                            <div className="bg-white border-2 border-rose-500 p-1 md:p-1.5 rounded-full text-rose-500 shrink-0"><Building2 size={10} /></div>
                            <span className="text-[10px] md:text-xs bg-slate-900 text-white px-2 md:px-2.5 py-0.5 rounded-lg font-mono font-black print:bg-slate-100 print:text-slate-800 print:border">{log.date || '日付未設定'}</span>
                            <h4 className="text-sm md:text-base font-black text-slate-900 tracking-tight">{log.client}</h4>
                            <span className={`text-[9px] md:text-[11px] font-black px-2 md:px-3 py-0.5 rounded-full border ${log.result === '●' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>結果: {log.result}</span>
                          </div>
                          {log.proposal && <div className="text-[10px] md:text-xs font-black text-slate-800 bg-white border px-2.5 md:px-3 py-1.5 rounded-xl w-fit"><span className="text-rose-500 font-extrabold">💡 提案内容:</span> {log.proposal}</div>}
                          {log.detail && <p className="text-[11px] md:text-[12px] font-medium text-slate-600 leading-relaxed whitespace-pre-wrap">{log.detail}</p>}
                          {log.url && (
                            <a href={log.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 mt-2 text-[11px] font-black hover:underline transition-colors px-3 py-1.5 rounded-lg border border-transparent bg-rose-100 text-rose-600">
                              <FileText size={12} /> 関連資料・リンクを開く
                            </a>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================
        📊 【8】事故管理（目標・推移・対策 統合ダッシュボード）
        ========================================= */}
        {activeTab === 'accidents' && (
          <div className="space-y-4 md:space-y-6 print:space-y-6">
            
            {/* 🎯 1. 四半期目標バナー ＆ 進捗プログレスバー */}
            <div className="flex justify-end print:hidden w-full mb-4">
              <div className="bg-gradient-to-r from-amber-500 to-rose-500 rounded-2xl p-[2px] shadow-sm w-full md:w-[37.5%]">
                <div className="bg-white/95 backdrop-blur-sm rounded-[14px] p-6 md:p-7 flex flex-col xl:flex-row items-center gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-[200px] w-full">
                    <div className="bg-amber-100 text-amber-600 p-2 rounded-xl shrink-0"><Target size={20} /></div>
                    <div className="w-full">
                      <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest block">今四半期の安全目標</span>
                      {/* 💡 選択された月の四半期に対応する目標を描画する */}
                      <h3 className="text-2xl font-black text-slate-800 tracking-tight truncate">{currentAccidentGoal?.goal_text || "目標が未設定です"}</h3>
                    </div>
                  </div>
                  
                  {/* 🌟 四半期進捗エリア */}
                  {currentAccidentGoal?.target_value > 0 && (
                    <div className="flex-1 w-full flex flex-col justify-center px-2">
                      <div className="flex justify-between items-end mb-1">
                        <span className="text-[10px] font-bold text-slate-500">{currentQuarterInfo.name} 消化状況</span>
                        <div className="text-right">
                          <span className="text-lg font-black text-slate-800 leading-none">{currentQuarterAccidents}</span>
                          <span className="text-[10px] font-bold text-slate-400 mx-1">/</span>
                          <span className="text-[10px] font-bold text-slate-500">許容 {currentAccidentGoal.target_value} 件</span>
                          <span className={`ml-2 text-sm font-black ${(currentQuarterAccidents / currentAccidentGoal.target_value) * 100 >= 100 ? 'text-rose-500' : 'text-emerald-500'}`}>
                            {((currentQuarterAccidents / currentAccidentGoal.target_value) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/50 relative">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${((currentQuarterAccidents / currentAccidentGoal.target_value) * 100) >= 100 ? 'bg-rose-500' : 'bg-gradient-to-r from-emerald-400 to-amber-400'}`} 
                          style={{ width: `${Math.min(((currentQuarterAccidents / currentAccidentGoal.target_value) * 100), 100)}%` }}
                        />
                        {((currentQuarterAccidents / currentAccidentGoal.target_value) * 100) >= 100 && <div className="absolute inset-0 bg-rose-500/20 animate-pulse" />}
                      </div>
                    </div>
                  )}
                  
                  {/* 💡 編集モーダルへは該当Qの目標を渡す */}
                  <button onClick={() => { setEditGoalData({ goal_text: currentAccidentGoal?.goal_text || '', target_value: currentAccidentGoal?.target_value || 0 }); setIsGoalModalOpen(true); }} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all shrink-0 border border-slate-200 xl:ml-auto"><Edit2 size={14} /></button>
                </div>
              </div>
            </div>

            {/* 🌟 サブタブ切り替えボタン */}
            <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1 shadow-sm w-fit self-start print:hidden">
              <button onClick={() => setActiveAccidentTab('summary')} className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${activeAccidentTab === 'summary' ? 'bg-white text-amber-600 shadow-sm border border-slate-200/60' : 'text-slate-500 hover:text-slate-800'}`}>
                <Activity size={14} /> 事故サマリー推移
              </button>
              <button onClick={() => setActiveAccidentTab('measures')} className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${activeAccidentTab === 'measures' ? 'bg-white text-emerald-600 shadow-sm border border-slate-200/60' : 'text-slate-500 hover:text-slate-800'}`}>
                <Rocket size={14} /> 対策アクション管理
              </button>
            </div>

            {/* 🔽 サブタブ：サマリー画面 */}
            {activeAccidentTab === 'summary' && (
              <div className="space-y-6">
                <div className="border-b border-slate-200 pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2"><AccidentIcon className="text-amber-500" size={22} /> 現状サマリー ({globalSelectedMonth}月度)</h2>
                  <div className={`flex items-center gap-4 px-4 py-2 rounded-xl border shadow-sm transition-all print:hidden ${accidentSummary.ratio >= 100 ? 'bg-rose-50 border-rose-300 text-rose-700 font-black' : 'bg-emerald-50/60 border-emerald-100 text-emerald-800'}`}>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black uppercase tracking-widest">センター当月総事故</span>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="text-sm md:text-base font-extrabold">{accidentSummary.thisTotal} 件</span>
                        <span className="text-[10px] opacity-75">(先月: {accidentSummary.lastTotal}件 / 前月差: {accidentSummary.diff >= 0 ? `+${accidentSummary.diff}` : accidentSummary.diff}件)</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {accidentCategories.length === 0 && <div className="col-span-full py-6 text-center text-slate-400 font-bold">データがありません。</div>}
                  {accidentCategories.map((cat, i) => {
                    const styles = getLevelStyles(cat.total); 
                    const daysSince = calculateDaysSince(cat.lastDate);

                    const curMonth = parseInt(globalSelectedMonth, 10);
                    const catRows = (data?.accidentData || []).filter((r: any) => {
                        const rowCat = r.category || r['カテゴリー'] || r['作業部門'];
                        if (rowCat !== cat.name || !r.date) return false;
                        const parts = r.date.split('/');
                        return parts.length >= 2 && parseInt(parts[1], 10) === curMonth;
                    });

                    const dynamicStats: { name: string, value: number, unit: string }[] = [];
                    const tempMap: any = {};
                    
                    catRows.forEach((r: any) => {
                        Object.keys(r).forEach(key => {
                            if (['date', 'category', 'カテゴリー', '作業部門', 'total', 'accident_type', 'type', '事故種類', '事故種別', '種類'].includes(key)) return;
                            
                            if (key.includes('_') || key.includes('/')) {
                                const { name: itemName, unit } = splitLabelAndUnit(key);
                                if (!tempMap[itemName]) tempMap[itemName] = { value: 0, unit };
                                tempMap[itemName].value += n(r[key]);
                            }
                        });
                    });
                    
                    Object.keys(tempMap).forEach(k => {
                        dynamicStats.push({ name: k, value: tempMap[k].value, unit: tempMap[k].unit });
                    });

                    return (
                      <div key={i} className={`bg-white border-2 ${styles.cardBorder} p-4 rounded-2xl shadow-sm relative flex flex-col justify-between`}>
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="text-sm font-black text-slate-800 flex items-center gap-1">{styles.icon} {cat.name}</h3>
                          <div className="bg-slate-900 text-white px-2 py-1 rounded-lg flex items-center gap-1">
                            <span className="text-[8px] font-bold text-blue-400">無事故</span>
                            <span className="text-sm font-black italic"><AnimatedNumber value={daysSince} /></span>
                            <span className="text-[8px]">DAYS</span>
                          </div>
                        </div>
                        <div className="flex items-end justify-between">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">当月発生</span>
                            <div className="flex items-baseline gap-1">
                              <span className={`text-4xl font-black tracking-tighter ${styles.text}`}><AnimatedNumber value={cat.total} /></span>
                              <span className="text-sm font-bold text-slate-500">件</span>
                            </div>
                          </div>
                          
                          <div className="text-right text-[10px] font-bold text-slate-500">
                            {dynamicStats.length > 0 ? (
                                dynamicStats.map((stat, idx) => (
                                    <p key={idx}>{stat.name}: <span className="font-black text-slate-700">{stat.value.toLocaleString()}</span> {stat.unit}</p>
                                ))
                            ) : (
                                <>
                                  <p>追走あり: <span className="font-black text-slate-700">{cat.chaseOn}</span> 件</p>
                                  <p>追走なし: <span className="font-black text-slate-700">{cat.chaseOff}</span> 件</p>
                                </>
                            )}
                            <p className="mt-1 text-[9px] text-slate-400 border-t border-slate-200/60 pt-1">最終: {cat.lastDate}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 📈 作業部門別 折れ線グラフ */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 md:p-6 shadow-sm">
                  <h3 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2 mb-4"><LineChartIcon className="text-blue-500" size={18} /> 作業部門別 事故推推トレンド（4月〜）</h3>
                  <div className="h-[250px] w-full pr-4">
                    {accidentCategoryTrendData.chartData.length === 0 ? (
                      <div className="h-full w-full flex items-center justify-center text-slate-400 font-bold text-xs">グラフデータがありません</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsLineChart data={accidentCategoryTrendData.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                          <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                          <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }} iconType="circle" />
                          {accidentCategoryTrendData.categories.map((cat, idx) => {
                            const colors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899'];
                            return <RechartsLine key={cat} type="monotone" name={cat} dataKey={cat} stroke={colors[idx % colors.length]} strokeWidth={2.5} activeDot={{ r: 6 }} />;
                          })}
                        </RechartsLineChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 🔽 サブタブ：対策アクション管理画面 */}
            {activeAccidentTab === 'measures' && (
              <div className="space-y-6">
                
                {/* 📊 事故種類別 積み上げ棒グラフ＆円グラフ（単月） */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 md:p-6 shadow-sm">
                  <h3 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2 mb-4">
                    <Activity className="text-emerald-500" size={18} /> 事故種別 発生内訳 ({globalSelectedMonth}月度)
                  </h3>
                  
                  {(() => {
                    const targetMonth = parseInt(globalSelectedMonth, 10).toString();
                    const monthlyAccidentMap = new Map();
                    const uniqueTypesInMonth = new Set<string>();

                    if (data?.accidentData) {
                      data.accidentData.forEach((row: any) => {
                        if (row.date) {
                          const parts = row.date.split('/');
                          if (parts.length >= 2 && parseInt(parts[1], 10).toString() === targetMonth) {
                            const cat = row.category || row['カテゴリー'] || row['作業部門'] || '未分類';
                            const type = row.accident_type || row.type || row['事故種類'] || row['事故種別'] || row['種類'] || '不明';
                            const val = n(row.total);

                            if (!monthlyAccidentMap.has(cat)) monthlyAccidentMap.set(cat, new Map());
                            const typeMap = monthlyAccidentMap.get(cat);
                            typeMap.set(type, (typeMap.get(type) || 0) + val);
                            uniqueTypesInMonth.add(type);
                          }
                        }
                      });
                    }

                    const barChartData: any[] = [];
                    const pieChartData: any[] = [];
                    const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];
                    const typeColorMap: any = {};
                    Array.from(uniqueTypesInMonth).forEach((t, i) => { typeColorMap[t as string] = colors[i % colors.length]; });

                    Array.from(monthlyAccidentMap.entries()).forEach(([cat, typeMap]) => {
                      const barEntry: any = { name: cat, total: 0 };
                      const pieDetails: any[] = [];
                      Array.from(typeMap.entries()).forEach(([type, count]) => {
                        barEntry[type] = count;
                        barEntry.total += (count as number);
                        pieDetails.push({ name: type, value: count, fill: typeColorMap[type] });
                      });
                      barChartData.push(barEntry);
                      pieChartData.push({ category: cat, total: barEntry.total, details: pieDetails.sort((a,b)=>b.value-a.value) });
                    });

                    barChartData.sort((a, b) => b.total - a.total);
                    pieChartData.sort((a, b) => b.total - a.total);

                    if (barChartData.length === 0) {
                      return <div className="h-[200px] w-full flex items-center justify-center text-slate-400 font-bold text-xs">今月の発生データはありません</div>;
                    }

                    return (
                      <div className="space-y-8">
                        {/* 100%積み上げ 円グラフエリア */}
                        <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
                          {pieChartData.map((pd, idx) => (
                            <div key={idx} className="flex flex-col items-center min-w-[120px] bg-slate-50 border border-slate-100 p-3 rounded-2xl shadow-sm shrink-0">
                              <span className="text-[10px] font-black text-slate-700 bg-white px-2 py-0.5 rounded-md border shadow-sm mb-2">{pd.category}</span>
                              <div className="w-[80px] h-[80px] relative">
                                <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                    <Pie data={pd.details} cx="50%" cy="50%" innerRadius="40%" outerRadius="90%" dataKey="value" stroke="none">
                                      {pd.details.map((entry: any, i: number) => <Cell key={`cell-${i}`} fill={entry.fill} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ fontSize: '10px', borderRadius: '8px', padding: '4px 8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} itemStyle={{ padding: 0 }} />
                                  </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                  <span className="text-xs font-black text-slate-800">{pd.total}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* カテゴリごとの積み上げ棒グラフ */}
                        <div className="h-[250px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                              <XAxis dataKey="name" stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                              <YAxis allowDecimals={false} stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                              <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                              <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }} iconType="circle" />
                              {Array.from(uniqueTypesInMonth).map((type: any) => (
                                <Bar key={type} name={type} dataKey={type} stackId="a" fill={typeColorMap[type]} barSize={36} />
                              ))}
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-slate-200 pb-2 gap-3">
                  <h3 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2"><CheckCircle2 className="text-emerald-500" size={18} /> 実行中の事故対策アクション</h3>
                  <div className="flex gap-2 w-full sm:w-auto">
                    {/* 📋 一括コピーボタン */}
                    <button onClick={handleCopyWorkflowData} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-[10px] font-black shadow-sm transition-all">
                      <Copy size={12} className="text-blue-500" /> 申請用データを一括コピー
                    </button>
                    <button onClick={() => { setEditMeasureData({ id: null, category: '', accident_type: '', accident_no: '', title: '', effect: '', start_date: '', status: '実行中', url: '' }); setIsMeasureModalOpen(true); }} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-black shadow-sm transition-all"><Plus size={12} /> 対策を追加</button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {(() => {
                    const filteredMeasures = accidentMeasures.filter(m => {
                      if (!m.start_date) return false;
                      const parts = m.start_date.split(/[\/\-]/);
                      return parts.length >= 2 && parseInt(parts[1], 10).toString() === globalSelectedMonth;
                    });

                    if (filteredMeasures.length === 0) {
                      return <div className="col-span-full py-10 bg-slate-50 rounded-2xl text-center text-slate-400 font-bold text-xs border border-dashed border-slate-200">💡 この月（{globalSelectedMonth}月度）に開始した対策アクションはありません。</div>;
                    }

                    return filteredMeasures.map((measure, index) => {
                      const targetCategory = measure.category || '未設定';
                      const stats = getBeforeAfterStats(targetCategory, measure.start_date);
                      const isImproved = stats.hasData && stats.afterAvg < stats.beforeAvg;
                      
                      let statusBadge = "bg-slate-100 text-slate-600";
                      if (measure.status === '完了') statusBadge = "bg-emerald-100 text-emerald-700 border-emerald-200 border";
                      if (measure.status === '実行中') statusBadge = "bg-blue-100 text-blue-700 border-blue-200 border";
                      if (measure.status === '形骸化') statusBadge = "bg-rose-100 text-rose-700 border-rose-200 border";

                      return (
                        <div key={index} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col gap-3 relative transition-all hover:shadow-md">
                          <div className="absolute top-4 right-4 flex gap-1.5">
                            <button onClick={() => { setEditMeasureData({ ...measure, start_date: measure.start_date?.replace(/\//g, '-') }); setIsMeasureModalOpen(true); }} className="text-slate-400 hover:text-blue-500"><Edit2 size={14} /></button>
                            <button onClick={() => handleDeleteMeasure(measure.id)} className="text-slate-400 hover:text-rose-500"><X size={16} /></button>
                          </div>

                          {/* カテゴリ、種類、ステータス */}
                          <div className="flex flex-wrap items-center gap-2 pr-12">
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${statusBadge}`}>🏷️ {measure.status || '未設定'}</span>
                            <span className="text-[9px] font-black bg-slate-800 text-white px-2 py-0.5 rounded-md">[{measure.category}] {measure.accident_type && `➔ ${measure.accident_type}`}</span>
                            {measure.start_date && <span className="text-[9px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">📅 開始: {measure.start_date}</span>}
                          </div>
                          
                          <h4 className="text-sm font-black text-slate-900 leading-tight">{measure.title}</h4>
                          {measure.accident_no && <div className="text-[10px] font-mono font-bold text-slate-500">事故NO: {measure.accident_no}</div>}
                          
                          {/* 🌟 狙う効果・概要の表示 */}
                          {measure.effect && measure.effect !== "未入力" && (
                            <div className="text-[10px] md:text-[11px] font-medium text-slate-600 bg-slate-50 border p-2.5 md:p-3 rounded-xl print:bg-white print:border-slate-200">
                              <span className="text-amber-500 font-black">💡 狙う効果・概要:</span> {measure.effect}
                            </div>
                          )}

                          {/* 🌟 Before / After */}
                          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col gap-2 mt-1">
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="font-bold text-slate-500">📊 対策の効果検証 ([{targetCategory}])</span>
                              {stats.hasData ? (
                                <span className={`font-black flex items-center gap-1 ${isImproved ? 'text-emerald-600' : 'text-rose-500'}`}>
                                  {isImproved ? '🔥 改善！' : '⚠️ 悪化・変化なし'}
                                </span>
                              ) : (
                                <span className="text-slate-400 font-bold">データ不足</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-slate-700 bg-white border px-2 py-1.5 rounded-lg w-fit">
                              <span className="text-slate-400">対策前: <span className="text-slate-800">{stats.beforeAvg.toFixed(1)}件/月</span></span>
                              <ArrowLeft size={10} className="rotate-180 text-slate-300" />
                              <span className={isImproved ? "text-emerald-600" : ""}>対策後: <span className="font-black">{stats.afterAvg.toFixed(1)}件/月</span></span>
                            </div>
                          </div>

                          {measure.url && (
                            <a href={measure.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 mt-1 text-[10px] font-black hover:underline transition-colors px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 w-fit hover:bg-slate-50 shadow-sm">
                              <FileText size={12} className="text-rose-500" /> ワークフローを開く
                            </a>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================
        📊 【9】請負予実ダッシュボード
        ========================================= */}
        {activeTab === 'contract' && (
          <div className="space-y-4 md:space-y-6">
            <div className="border-b border-slate-200 pb-3 md:pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 md:gap-3"><FileText className="text-blue-500" size={24} /> 9. 請負予実ダッシュボード</h2>
                <p className="text-slate-400 text-xs md:text-sm font-bold mt-1 uppercase tracking-widest">Contract Performance vs Budget</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                <button onClick={() => setHideZeroContracts(!hideZeroContracts)} className={`px-3 py-1.5 md:px-4 md:py-2 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black border transition-all whitespace-nowrap shrink-0 shadow-sm print:hidden ${hideZeroContracts ? 
                  'bg-blue-600 text-white border-blue-700 shadow-inner' : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'}`}>
                  {hideZeroContracts ? '0の項目を隠す(ON)' : '0の項目も表示'}
                </button>
                <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-xl shadow-sm">
                  <Calendar size={12} className="text-blue-500" />
                  <select value={contractSelectedMonth} onChange={(e) => setContractSelectedMonth(e.target.value)} className="bg-transparent border-none text-blue-800 text-[10px] md:text-xs font-black focus:outline-none cursor-pointer">
                    {contractAvailableMonths.map((m, idx) => <option key={idx} value={m}>{m}月度 データ</option>)}
                  </select>
                  <ChevronDown size={11} className="text-blue-400" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 md:gap-3 print:grid-cols-8 print:gap-2">
              {contractList.length === 0 && <div className="col-span-full py-10 text-center text-slate-400 font-bold">データがありません。GAS側でデータを転写してください。</div>}
              {contractList.map((m, i) => {
                const targetIdx = m.labels.findIndex(lbl => String(lbl).replace('月', '') === String(contractSelectedMonth));
                const actVal = targetIdx !== -1 ? n(m.actual[targetIdx]) : 0;
                const fctVal = targetIdx !== -1 ? n(m.forecast[targetIdx]) : 0;
                if (hideZeroContracts && actVal === 0 && fctVal === 0) return null;
                const diffVal = actVal - fctVal;
                const ratioVal = fctVal > 0 ? (actVal / fctVal) * 100 : 0;
                return (
                  <div key={i} className="bg-white border border-slate-200 p-2.5 rounded-xl shadow-sm flex flex-col justify-between gap-1.5 transition-all hover:shadow-md border-t-4 print:break-inside-avoid print:shadow-none print:border-slate-300" style={{ borderTopColor: '#3b82f6' }}>
                    <div className="border-b border-slate-100 pb-1">
                      <h4 className="text-[10px] md:text-xs font-black text-slate-800 tracking-tight leading-snug line-clamp-2 min-h-[2.5rem]" title={m.title}>{m.title}</h4>
                    </div>
                    <div className="space-y-1 mt-1">
                      <div className="flex justify-between items-end">
                        <span className="text-[8px] text-slate-400 font-bold whitespace-nowrap">実績</span>
                        <span className="text-xs md:text-sm font-black text-slate-800 whitespace-nowrap">{formatVal(actVal, m.title)}</span>
                      </div>
                      <div className="flex justify-between items-end">
                        <span className="text-[8px] text-slate-400 font-bold whitespace-nowrap">予算</span>
                        <span className="text-[9px] md:text-[10px] font-bold text-slate-500 whitespace-nowrap">{formatVal(fctVal, m.title)}</span>
                      </div>
                      <div className="flex justify-between items-end border-t border-dashed border-slate-200 pt-1">
                        <span className="text-[8px] text-slate-400 font-bold whitespace-nowrap">差異</span>
                        <span className={`text-[10px] md:text-xs font-black whitespace-nowrap ${diffVal > 0 ? 'text-emerald-600' : diffVal < 0 ? 
                          'text-rose-600' : 'text-slate-500'}`}>{diffVal > 0 ? '+' : ''}{formatVal(diffVal, m.title)}</span>
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-1.5 flex justify-between items-center border border-slate-100 mt-1 print:bg-white print:border-slate-200">
                      <span className="text-[7px] text-slate-400 font-black whitespace-nowrap">達成率</span>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded flex items-center whitespace-nowrap ${ratioVal >= 100 ? 
                        'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{ratioVal > 0 ? `${ratioVal.toFixed(1)}%` : '--%'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* 通知（Toast）ポップアップ */}
      {toastInfo.show && (
        <div className={`fixed bottom-6 right-6 md:bottom-10 md:right-10 z-50 px-5 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl shadow-2xl border flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 print:hidden ${toastInfo.type === 'success' ? 
          'bg-slate-900 border-slate-800 text-white' : 'bg-rose-600 border-rose-700 text-white'}`}>
          {toastInfo.type === 'success' ? <CheckCircle2 size={20} className="text-emerald-400" /> : <AlertTriangle size={20} className="text-white" />}
          <span className="text-xs md:text-sm font-bold tracking-wider">{toastInfo.msg}</span>
        </div>
      )}

      {/* 新規追加・編集モーダル（アクションタブ用） */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 print:hidden">
          <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-2xl space-y-4 md:space-y-6">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-sm md:text-base font-black text-slate-900">
                【{activeTab === 'actions' ? (activeActionTab === 'dx' ? 'DX推進' : activeActionTab === 'env' ? '現場改善' : '営業履歴') : tabs.find(t=>t.id===activeTab)?.label}】データの{editingIndex !== null ? 
                '編集上書き' : '新規追加'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-900 bg-slate-100 p-1.5 rounded-full"><X size={16} /></button>
            </div>

            {(activeTab === 'actions' && activeActionTab === 'history') ? (
              <div className="space-y-3 md:space-y-4 text-[11px] md:text-xs font-bold text-slate-700">
                <div className="space-y-1"><label className="text-slate-400">1. 日付 *必須</label><input type="date" value={newItem.startDate} onChange={(e) => setNewItem({...newItem, startDate: e.target.value})} className="w-full bg-slate-50 border rounded-xl px-3 md:px-4 py-2.5 md:py-3 font-semibold text-slate-900" /></div>
                <div className="space-y-1"><label className="text-slate-400">2. 誰に *必須</label><input type="text" value={newItem.client} onChange={(e) => setNewItem({...newItem, client: e.target.value})} className="w-full bg-slate-50 border rounded-xl px-3 md:px-4 py-2.5 md:py-3 font-semibold text-slate-900" /></div>
                <div className="space-y-1"><label className="text-slate-400">3. 何を *必須</label><input type="text" value={newItem.proposal} onChange={(e) => setNewItem({...newItem, proposal: e.target.value})} className="w-full bg-slate-50 border rounded-xl px-3 md:px-4 py-2.5 md:py-3 h-16 resize-none font-semibold text-slate-900" /></div>
                <div className="space-y-1"><label className="text-slate-400">4. 内容詳細</label><textarea value={newItem.detail} onChange={(e) => setNewItem({...newItem, detail: e.target.value})} className="w-full bg-slate-50 border rounded-xl px-3 md:px-4 py-2.5 md:py-3 h-20 md:h-24 resize-none font-semibold text-slate-900" /></div>
                <div className="space-y-1"><label className="text-slate-400">5. 関連URLリンク</label><input type="url" placeholder="https://..." value={newItem.url} onChange={(e) => setNewItem({...newItem, url: e.target.value})} className="w-full bg-slate-50 border rounded-xl px-3 md:px-4 py-2.5 md:py-3 font-semibold text-slate-900" /></div>

                <div className="space-y-1">
                  <label className="text-slate-400">6. 商談結果</label>
                  <div className="grid grid-cols-3 gap-2 md:gap-3">
                    {['●', '×', '△'].map(res => (
                      <button key={res} type="button" onClick={() => setNewItem({...newItem, result: res})} className={`py-2 md:py-2.5 rounded-xl font-black border transition-all ${newItem.result === res ? 
                        'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-600'}`}>{res}</button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 md:space-y-4 text-[11px] md:text-xs font-bold text-slate-700">
                <div className="space-y-1"><label className="text-slate-400">項目名 *必須</label><input type="text" value={newItem.name} onChange={(e) => setNewItem({...newItem, name: e.target.value})} className="w-full bg-slate-50 border rounded-xl px-3 md:px-4 py-2.5 md:py-3 font-semibold text-slate-900" /></div>
                <div className="space-y-1"><label className="text-slate-400">想定効果</label><textarea value={newItem.effect} onChange={(e) => setNewItem({...newItem, effect: e.target.value})} className="w-full bg-slate-50 border rounded-xl px-3 md:px-4 py-2.5 md:py-3 h-16 resize-none font-semibold text-slate-900" /></div>
                <div className="space-y-1"><label className="text-slate-400">関連URLリンク</label><input type="url" placeholder="https://..." value={newItem.url} onChange={(e) => setNewItem({...newItem, url: e.target.value})} className="w-full bg-slate-50 border rounded-xl px-3 md:px-4 py-2.5 md:py-3 font-semibold text-slate-900" /></div>

                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <input type="date" value={newItem.startDate} onChange={(e) => setNewItem({...newItem, startDate: e.target.value})} className="w-full bg-slate-50 border rounded-xl px-3 md:px-4 py-2.5 md:py-3 font-semibold text-slate-900" />
                  <input type="date" value={newItem.endDate} onChange={(e) => setNewItem({...newItem, endDate: e.target.value})} className="w-full bg-slate-50 border rounded-xl px-3 md:px-4 py-2.5 md:py-3 font-semibold text-slate-900" />
                </div>
                <div className="flex items-center gap-2 bg-slate-50 p-2.5 md:p-3 rounded-xl border border-slate-100 cursor-pointer" onClick={() => setNewItem({...newItem, customerRelated: !newItem.customerRelated})}>
                  <input type="checkbox" checked={newItem.customerRelated} onChange={() => {}} className="accent-slate-900 w-4 h-4" />
                  <span className="text-[11px] md:text-xs text-slate-900 font-black">この施策は「顧客関連」に影響あり</span>
                </div>
                <div className="space-y-1 bg-slate-50 p-2.5 md:p-3 rounded-xl border">
                  <div className="flex justify-between font-black">
                    <label className="text-slate-400">進捗</label>
                    <span className="text-slate-900">{newItem.ratio}%</span>
                  </div>
                  <input type="range" min="0" max="100" step="5" value={newItem.ratio} onChange={(e) => setNewItem({...newItem, ratio: Number(e.target.value)})} className="w-full accent-slate-900" />
                </div>
              </div>
            )}
            <div className="flex gap-2 md:gap-3 pt-2">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 md:py-3 bg-slate-100 rounded-xl font-bold text-slate-700 text-xs">キャンセル</button>
              <button onClick={handleSaveItem} className="flex-1 py-2.5 md:py-3 bg-slate-900 text-white rounded-xl font-black shadow-md text-xs">データを安全に保存</button>
            </div>
          </div>
        </div>
      )}

      {/* 🎯 四半期目標編集モーダル（事故管理タブ用） */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-[2rem] p-6 md:p-8 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2"><Target className="text-amber-500" size={20} /> {currentQuarterInfo.name} 四半期目標の設定</h3>
            <div className="space-y-4 text-xs font-bold text-slate-700">
              <div className="space-y-1"><label className="text-slate-400">目標の宣言（スローガン）</label><input type="text" value={editGoalData.goal_text || ''} onChange={(e) => setEditGoalData({...editGoalData, goal_text: e.target.value})} className="w-full bg-slate-50 border rounded-xl px-4 py-3" /></div>
              <div className="space-y-1"><label className="text-slate-400">目標許容件数（これ以下に抑える件数）</label><input type="number" value={editGoalData.target_value || ''} onChange={(e) => setEditGoalData({...editGoalData, target_value: e.target.value})} className="w-full bg-slate-50 border rounded-xl px-4 py-3" /></div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setIsGoalModalOpen(false)} className="flex-1 py-3 bg-slate-100 rounded-xl font-bold text-slate-700 text-xs">キャンセル</button>
              <button onClick={handleSaveGoal} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-black shadow-md text-xs">目標を保存</button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 事故対策アクション編集モーダル（事故管理タブ用） */}
      {isMeasureModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-lg rounded-[2rem] p-6 md:p-8 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-slate-900">事故対策アクションの{editMeasureData.id ? '編集' : '追加'}</h3>
            <div className="space-y-4 text-xs font-bold text-slate-700">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400">対象の作業部門 (カテゴリ) *必須</label>
                  <input type="text" list="accident-categories-list" value={editMeasureData.category || ''} onChange={(e) => setEditMeasureData({...editMeasureData, category: e.target.value})} className="w-full bg-slate-50 border rounded-xl px-4 py-3" placeholder="入力または選択" />
                  <datalist id="accident-categories-list">{accidentCategories.map(c => <option key={c.name} value={c.name} />)}</datalist>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400">具体的な事故種類 *必須</label>
                  <input type="text" list="accident-types-list" value={editMeasureData.accident_type || ''} onChange={(e) => setEditMeasureData({...editMeasureData, accident_type: e.target.value})} className="w-full bg-slate-50 border rounded-xl px-4 py-3" placeholder="例: 誤配, 数量違い" />
                  <datalist id="accident-types-list">{uniqueAccidentTypes.map(t => <option key={t} value={t} />)}</datalist>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-slate-400">事故NO</label><input type="text" value={editMeasureData.accident_no || ''} onChange={(e) => setEditMeasureData({...editMeasureData, accident_no: e.target.value})} className="w-full bg-slate-50 border rounded-xl px-4 py-3" placeholder="申請用番号" /></div>
                <div className="space-y-1">
                  <label className="text-slate-400">対策ステータス</label>
                  <select value={editMeasureData.status || '実行中'} onChange={(e) => setEditMeasureData({...editMeasureData, status: e.target.value})} className="w-full bg-slate-50 border rounded-xl px-4 py-3">
                    <option value="未着手">未着手</option>
                    <option value="実行中">実行中</option>
                    <option value="完了">完了（定着）</option>
                    <option value="形骸化">形骸化・やり直し</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1"><label className="text-slate-400">対策のタイトル *必須</label><input type="text" value={editMeasureData.title || ''} onChange={(e) => setEditMeasureData({...editMeasureData, title: e.target.value})} className="w-full bg-slate-50 border rounded-xl px-4 py-3" placeholder="例: ピッキング時のWチェック徹底" /></div>
              <div className="space-y-1"><label className="text-slate-400">狙う効果・概要</label><textarea value={editMeasureData.effect || ''} onChange={(e) => setEditMeasureData({...editMeasureData, effect: e.target.value})} className="w-full bg-slate-50 border rounded-xl px-4 py-3 h-16 resize-none" /></div>
              <div className="space-y-1"><label className="text-slate-400">ワークフローURLリンク</label><input type="url" value={editMeasureData.url || ''} onChange={(e) => setEditMeasureData({...editMeasureData, url: e.target.value})} className="w-full bg-slate-50 border rounded-xl px-4 py-3" placeholder="https://..." /></div>
              <div className="space-y-1"><label className="text-slate-400">対策の開始日（Before/After集計基準日）</label><input type="date" value={editMeasureData.start_date || ''} onChange={(e) => setEditMeasureData({...editMeasureData, start_date: e.target.value})} className="w-full bg-slate-50 border rounded-xl px-4 py-3" /></div>
              
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setIsMeasureModalOpen(false)} className="flex-1 py-3 bg-slate-100 rounded-xl font-bold text-slate-700 text-xs">キャンセル</button>
              <button onClick={handleSaveMeasure} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-black shadow-md text-xs">対策を保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}