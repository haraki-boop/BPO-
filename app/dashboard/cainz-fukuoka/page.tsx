// @ts-nocheck
'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { ArrowLeft, Activity, Calculator, TrendingUp, Calendar, Rocket, Leaf, MessageSquare, Clock, Bot, ThumbsUp, ThumbsDown, Plus, X, Building2, ChevronDown, ShieldAlert as AccidentIcon, Zap, AlertTriangle, CheckCircle2, Edit2, Loader2, Search, BrainCircuit, Printer, FileText, Eye, EyeOff, RefreshCw, Pin } from 'lucide-react';
import Link from 'next/link';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, AreaChart, Area, ComposedChart, BarChart, Bar, ReferenceLine, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';

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
  const months = [];
  for (let i = 0; i < 6; i++) {
    let m = currentMonth - i;
    if (m <= 0) m += 12;
    months.push(m.toString());
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
  // 🏢 【拠点マスター設定】（※他拠点にコピペする時はここだけ変える！）
  // =========================================================
  const LOCATION_ID = 'cainz-fukuoka'; 
  const LOCATION_NAME = 'カインズ福岡'; 
  
  // 🛡️ 新仕様：直接のURLを削除し、安全な中継所を呼び出す
  const GAS_URL = `/api/gas?location=${LOCATION_ID}`;
  const [isMounted, setIsMounted] = useState(false);
  const [data, setData] = useState<any>(null);

  // タブ管理・表示モード管理
  const [activeTab, setActiveTab] = useState('sales');
  const [activeActionTab, setActiveActionTab] = useState<'dx' | 'env' | 'history'>('dx');
  const [displayMode, setDisplayMode] = useState<'daily' | 'weekly'>('daily');
  const [selectedWeek, setSelectedWeek] = useState<number>(0);

  // 月選択ステート
  const [globalSelectedMonth, setGlobalSelectedMonth] = useState<string>('');
  const [contractSelectedMonth, setContractSelectedMonth] = useState<string>('');
  
  // 追加：月次確定タブ専用の年月ステート（例：2026/05）
  const [salesMonth, setSalesMonth] = useState<string>('');

  const [hideZeroContracts, setHideZeroContracts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // 非表示項目のトグリスイッチ
  const [showHiddenItems, setShowHiddenItems] = useState(false);        
  const [showHiddenMetrics, setShowHiddenMetrics] = useState(false);    

  // AI診断用ステート
  const [tabAiAnalysis, setTabAiAnalysis] = useState<{ [key: string]: string }>({});
  const [isTabAnalyzing, setIsTabAnalyzing] = useState<{ [key: string]: boolean }>({});

  // Supabaseデータ格納用ステート
  const [dxItems, setDxItems] = useState<any[]>([]);
  const [envItems, setEnvItems] = useState<any[]>([]);
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [metricSettings, setMetricSettings] = useState<any[]>([]); 
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const [newItem, setNewItem] = useState({
    name: '', effect: '', startDate: '', endDate: '', customerRelated: false, ratio: 0, client: '', proposal: '', detail: '', result: '●'
  });

  const [toastInfo, setToastInfo] = useState<{show: boolean, msg: string, type: 'success'|'error'}>({show: false, msg: '', type: 'success'});

  const lowIsBetterMetrics = ["労務費", "タイミー", "外注費", "社会保険", "雇用保険", "有給", "交通費", "工数", "事故", "償却", "残業", "深夜", "超過", "違反者", "総工数", "減価償却費", "原価"];

  const formatVal = (val: number, title?: string) => {
    if (val === undefined || val === null || isNaN(val)) return '0';
    if (!title) return Math.round(val).toLocaleString();
    if (title.includes("%") || title.includes("率")) return `${val.toFixed(1)}%`;
    if (title.includes("生産性") || /時給|最低賃金|人数|在籍者|違反者/.test(title)) return Number(val.toFixed(1)).toLocaleString();
    if (/売上|原価|費|利益|金額|単価/.test(title)) return `¥${Math.round(val).toLocaleString()}`;
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
        body: JSON.stringify({
          table: table,
          actionMethod: method,
          payload: (method === 'POST' || method === 'PATCH') ? cleanBody : undefined,
          query: query
        })
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

    const [dxData, envData, historyData, settingsData] = await Promise.all([
      safeFetch('dx_actions'), 
      safeFetch('env_actions'), 
      safeFetch('sales_history'),
      safeFetch('dashboard_metric_settings') 
    ]);
    
    if (dxData) setDxItems(dxData); 
    if (envData) setEnvItems(envData); 
    if (historyData) setHistoryItems(historyData);
    if (settingsData) setMetricSettings(settingsData);
  };

  const fetchDashboardData = async (isReload = false) => {
    fetchSupabaseData();

    try {
      const res = await fetch(GAS_URL);
      const json = await res.json();
      setData(json);
      if (!isReload && json && json.labels && json.labels.length > 0) {
        const firstLabel = json.labels[0];
        const extractedMonth = firstLabel.includes('/') ? parseInt(firstLabel.split('/')[0], 10).toString() : (new Date().getMonth() + 1).toString();

        setGlobalSelectedMonth(extractedMonth);

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
    { id: 'salesConfirmed', label: '6. 月次確定', icon: CheckCircle2, color: '#0ea5e9', dataKey: 'salesConfirmedData' },
    { id: 'actions', label: '7. アクション', icon: Rocket, color: '#7c3aed' },
    { id: 'accidents', label: '8. 事故管理', icon: AccidentIcon, color: '#f59e0b' },
    { id: 'contract', label: '9. 請負予実', icon: FileText, color: '#3b82f6' },
  ];

  const currentTab = tabs.find(t => t.id === activeTab) || tabs[0];
  const availableMonths = getAvailableMonths();

  const dataMonth = useMemo(() => {
    if (!data || !data.labels || data.labels.length === 0) return (new Date().getMonth() + 1).toString();
    const firstLabel = data.labels[0];
    if (firstLabel.includes('/')) return parseInt(firstLabel.split('/')[0], 10).toString();
    return (new Date().getMonth() + 1).toString();
  }, [data]);

  const baseLabelsFiltered = data ? (data.labels || []) : [];
  const currentMonthIndices = baseLabelsFiltered.map((_, idx) => idx);

  const contractAvailableMonths = (() => {
    if (!data || !data.contractYojitsuData || data.contractYojitsuData.length === 0) return [];
    const sets = new Set<string>();
    data.contractYojitsuData.forEach((item: any) => {
      if (item.labels) {
        item.labels.forEach((lbl: any) => { if (lbl) sets.add(String(lbl).replace('月', '')); });
      }
    });
    return Array.from(sets).sort((a, b) => {
      const getOrder = (mStr: string) => { const val = parseInt(mStr, 10) || 0; return val >= 4 ? val : val + 12; };
      return getOrder(a) - getOrder(b);
    });
  })();

  const weeklyGroups = (() => {
    const groups: { weekNum: number; label: string; indices: number[] }[] = [];
    if (!baseLabelsFiltered || baseLabelsFiltered.length === 0) return groups;
    let currentWeekIndices: number[] = []; let weekCount = 1; let startLabel = baseLabelsFiltered[0];

    baseLabelsFiltered.forEach((label: string, idx: number) => {
      const dayStr = label.includes('/') ? label.split('/').pop() : label.replace(/[^0-9]/g, '');
      const dayNum = parseInt(dayStr || '1', 10);
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
          title: cleanTitle,
          labels: item.labels || baseLabelsFiltered,
          actual_thisMonth: new Array((item.labels || baseLabelsFiltered).length).fill(0),
          actual_lastMonth: new Array((item.labels || baseLabelsFiltered).length).fill(0),
          actual_lastYear: new Array((item.labels || baseLabelsFiltered).length).fill(0),
          forecast: new Array((item.labels || baseLabelsFiltered).length).fill(0),
          forecastType: '予測',
          is_pinned: setting ? setting.is_pinned : false,   
          is_hidden: setting ? setting.is_hidden : false    
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
  
  // 💡 【ここを追加】すでに金庫に「予算」が入っていて、今来たのが「予測」なら上書きせずスルー！
  if (entry.forecastType === '予算' && normalizedTitle.includes('予測')) return;

  entry.forecast = item.values;
  if (normalizedTitle.includes('予算')) entry.forecastType = '予算';
  else if (normalizedTitle.includes('目標')) entry.forecastType = '目標';
  else entry.forecastType = '予測';
}
    });

    let result = Array.from(combinedMap.values());
    if (displayMode === 'daily' || displayMode === 'weekly') {
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
          is_pinned: staffSetting ? staffSetting.is_pinned : false,
          is_hidden: staffSetting ? staffSetting.is_hidden : false
        },
      };

      const finalResult: any[] = [];
      result.forEach(m => {
        if (m.title === '社員工数_残業工数') {
          m.title = '社員工数_残業';
          finalResult.push(m);
        }
        else if (m.title === '社員工数_通常工数' || m.title === '社員工数_深夜工数') {
        }
        else if (m.title === 'スタッフ工数_通常工数') stackedGroups['スタッフ工数'].data['通常'] = m;
        else if (m.title === 'スタッフ工数_残業工数') stackedGroups['スタッフ工数'].data['残業'] = m;
        else if (m.title === 'スタッフ工数_深夜工数') stackedGroups['スタッフ工数'].data['深夜'] = m;
        else finalResult.push(m);
      });

      if (Object.keys(stackedGroups['スタッフ工数'].data).length > 0) finalResult.push(stackedGroups['スタッフ工数']);
      return finalResult;
    }
    return result;
  };

  const sortedMetrics = getCombinedMetrics();

  const finalSortedMetrics = useMemo(() => {
    if (!['sales', 'manhours', 'volume', 'productivity', 'labor'].includes(activeTab)) return sortedMetrics;

    const metricsWithValues = sortedMetrics.map(m => {
      const isAvgMetric = m.title.includes("生産性") || m.title.includes("%") || m.title.includes("率") || m.title.includes("単価") || m.title.includes("時給");
      const weekIdx = weeklyGroups[selectedWeek]?.indices || [];

      const targetIndices = displayMode === 'weekly' ? weekIdx :
        currentMonthIndices.filter(idx => {
          if (!baseLabelsFiltered[idx]) return false;
          const dayStr = baseLabelsFiltered[idx].includes('/') ? baseLabelsFiltered[idx].split('/').pop() : baseLabelsFiltered[idx].replace(/[^0-9]/g, '') || '1';
          const dayNum = parseInt(dayStr, 10);
          const todayMonth = new Date().getMonth() + 1; const selMonth = parseInt(dataMonth, 10);
          if (selMonth !== todayMonth) return true;
          return dayNum <= new Date().getDate();
        });

      let actVal = 0;
      if (m.isStacked) {
        const sumKey = (key: string, metricArr: string) => targetIndices.reduce((sum, idx) => sum + n(m.data[key]?.[metricArr]?.[idx]), 0);
        actVal = sumKey('通常', 'actual_thisMonth') + sumKey('残業', 'actual_thisMonth') + sumKey('深夜', 'actual_thisMonth');
      } else {
        const acts = targetIndices.map(idx => n(m.actual_thisMonth[idx]));
        if (isAvgMetric) {
          const valid = acts.filter(v => v > 0);
          actVal = valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : 0;
        } else {
          actVal = acts.reduce((a, b) => a + b, 0);
        }
      }
      return { ...m, _sortVal: actVal };
    });

    let filteredMetrics = metricsWithValues;
    if (!showHiddenMetrics) {
      filteredMetrics = filteredMetrics.filter(m => !m.is_hidden);
    }

    return filteredMetrics.sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) {
        return a.is_pinned ? -1 : 1; 
      }
      return b._sortVal - a._sortVal;
    });
  }, [sortedMetrics, displayMode, selectedWeek, dataMonth, currentMonthIndices, baseLabelsFiltered, activeTab, weeklyGroups, showHiddenMetrics]);

  const contractList = (() => {
    if (!data || !data.contractYojitsuData) return [];
    const cMap = new Map();
    data.contractYojitsuData.forEach((item: any) => {
      if (!item.title) return;
      const isYosan = item.title.startsWith('予算_');
      const isJisseki = item.title.startsWith('実績_');
      const cleanTitle = item.title.replace('予算_', '').replace('実績_', '');
      if (!cMap.has(cleanTitle)) {
        cMap.set(cleanTitle, { title: cleanTitle, labels: item.labels || [], actual: new Array((item.labels || []).length).fill(0), forecast: new Array((item.labels || []).length).fill(0) });
      }
      const entry = cMap.get(cleanTitle);
      if (isJisseki) entry.actual = item.values;
      if (isYosan) entry.forecast = item.values;
    });
    let list = Array.from(cMap.values());
    if (searchQuery) list = list.filter(m => m.title.toLowerCase().includes(searchQuery.toLowerCase()));
    return list;
  })();

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

  const accidentCategories = (() => {
    if (!data) return [];
    const rawRecords = data.accidentData || [];
    const absoluteLastDateMap: any = {}; const catMap: any = {};
    const allCategoryNames = Array.from(new Set(rawRecords.map((r: any) => r.category))).filter(Boolean) as string[];
    rawRecords.forEach((row: any) => {
      const name = row.category;
      if (row.date) {
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
          return { 項目: m.title, 月度: `${contractSelectedMonth}月`, 実績: targetIdx !== -1 ? m.actual[targetIdx] : 0, 予算: targetIdx !== -1 ? m.forecast[targetIdx] : 0, 差異: targetIdx !== -1 ? (n(m.actual[targetIdx]) - n(m.forecast[targetIdx])) : 0 };
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
    setNewItem({ name: '', effect: '', startDate: '', endDate: '', customerRelated: false, ratio: 0, client: '', proposal: '', detail: '', result: '●' });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (index: number) => {
    setEditingIndex(index);
    if (activeActionTab === 'history') {
      const item = historyItems[index];
      setNewItem({ startDate: item.date ? item.date.replace(/\//g, '-') : '', client: item.client || '', proposal: item.proposal || '', detail: item.detail || '', result: item.result || '●' });
    } else {
      const targetList = activeActionTab === 'dx' ? dxItems : envItems; const item = targetList[index];
      setNewItem({ name: item.name || '', effect: item.effect === '未入力' ? '' : (item.effect || ''), startDate: item.start_date ? item.start_date.replace(/\//g, '-') : '', endDate: item.end_date ? item.end_date.replace(/\//g, '-') : '', customer_related: item.customer_related === 'あり', ratio: item.ratio || 0 });
    }
    setIsModalOpen(true);
  };

  // ⚡ 爆速化適用：モーダルを一瞬で閉じて、Supabaseだけを再取得する！
  const handleSaveItem = async () => {
    setIsModalOpen(false);

    if (activeActionTab === 'history') {
      if (!newItem.client || !newItem.proposal) return;
      const payload = { location_id: LOCATION_ID, date: newItem.startDate ? newItem.startDate.replace(/-/g, '/') : '', client: newItem.client, proposal: newItem.proposal, detail: newItem.detail || '', result: newItem.result };
      if (editingIndex !== null) { payload.id = historyItems[editingIndex].id; await supabaseRequest('sales_history', 'PATCH', payload); }
      else { await supabaseRequest('sales_history', 'POST', payload); }
    } else {
      if (!newItem.name) return;
      const payload = { location_id: LOCATION_ID, name: newItem.name, effect: newItem.effect || '未入力', start_date: newItem.startDate ? newItem.startDate.replace(/-/g, '/') : '', end_date: newItem.endDate ? newItem.endDate.replace(/-/g, '/') : '', customer_related: newItem.customerRelated ? 'あり' : 'なし', ratio: Number(newItem.ratio) };
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
              <button onClick={() => setDisplayMode('daily')} className={`flex-1 md:flex-none px-5 py-1.5 rounded-lg text-[10px] font-black transition-all ${displayMode === 'daily' ? 'bg-slate-900 md:bg-white text-white md:text-blue-600 shadow-sm border border-slate-200/50' : 'text-slate-400 hover:text-slate-600'}`}>日次</button>
              <button onClick={() => setDisplayMode('weekly')} className={`flex-1 md:flex-none px-5 py-1.5 rounded-lg text-[10px] font-black transition-all ${displayMode === 'weekly' ? 'bg-slate-900 md:bg-white text-white md:text-blue-600 shadow-sm border border-slate-200/50' : 'text-slate-400 hover:text-slate-600'}`}>週次</button>
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
              <button
                onClick={() => setShowHiddenMetrics(!showHiddenMetrics)}
                className={`px-3 py-2 rounded-xl text-[10px] md:text-xs font-black border transition-all whitespace-nowrap shrink-0 shadow-sm ${showHiddenMetrics ? 'bg-slate-800 text-white border-slate-700 shadow-inner' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
              >
                {showHiddenMetrics ? '非表示グラフを隠す(ON)' : '非表示グラフを表示'}
              </button>
            )}
            <div className="relative w-full sm:w-72 shrink-0">
              <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="項目を絞り込み検索..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white border border-slate-200 text-xs font-bold text-slate-700 pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" />
            </div>
          </div>
        </div>

        {displayMode === 'weekly' && !['salesConfirmed', 'actions', 'accidents', 'contract'].includes(activeTab) && (
          <div className="bg-white border border-slate-200 p-3 md:p-4 rounded-2xl md:rounded-3xl shadow-sm flex flex-wrap gap-2 items-center print:hidden">
            <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-wider mr-2 ml-1">週の選択:</span>
            {weeklyGroups.map((g, idx) => <button key={idx} onClick={() => setSelectedWeek(idx)} className={`px-4 md:px-5 py-2 rounded-xl font-black text-[10px] md:text-xs transition-all ${selectedWeek === idx ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>{g.label}</button>)}
          </div>
        )}

        {['actions', 'contract'].includes(activeTab) && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm flex flex-col md:flex-row items-start gap-4 mb-2 relative overflow-hidden print:bg-white">
            <div className="bg-white p-3 rounded-2xl shadow-sm shrink-0 hidden md:block border"><Bot size={24} className="text-blue-600" /></div>
            <div className="relative z-10 w-full">
              <h3 className="text-xs md:text-[13px] font-black text-blue-900 mb-2">AI Strategy Insight (chatGPT) - 専門コンサルタント</h3>
              {(() => {
                const currentKey = activeTab;
                const displayLabel = currentKey === 'actions' ? 'DX・現場改善・営業の全アクション' : '請負予実';
                
                if (!tabAiAnalysis[currentKey] && !isTabAnalyzing[currentKey]) {
                  return <button onClick={() => handleStartTabAnalysis(currentKey)} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-2"><Zap size={14}/> {displayLabel} データをAIに総合診断させる</button>;
                } else if (isTabAnalyzing[currentKey]) {
                  return <div className="flex items-center gap-2 text-blue-600 text-xs font-bold animate-pulse py-2"><BrainCircuit size={16} className="animate-spin" /> 物流プロフェッショナルAIがデータを多角分析中...</div>;
                } else {
                  return <div className="text-xs font-bold text-slate-700 leading-relaxed whitespace-pre-wrap bg-white/60 p-4 rounded-xl border border-slate-200">{tabAiAnalysis[currentKey]}</div>;
                }
              })()}
            </div>
          </div>
        )}

        {/* =========================================
        【1〜5】売上・工数・物量・生産性・労務管理 共通グラフ
        ========================================= */}
        {['sales', 'manhours', 'volume', 'productivity', 'labor'].includes(activeTab) && (
          <div
            className={`grid gap-4 md:gap-6 print:grid-cols-2 print:gap-8 ${displayMode !== 'daily' ? 'grid-cols-1 lg:grid-cols-2' : ''}`}
            style={displayMode === 'daily' ? { gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 450px), 1fr))' } : {}}
          >
            {finalSortedMetrics.length === 0 && <div className="col-span-full py-10 text-center text-slate-400 font-bold">データがありません。GAS側でデータを転写してください。</div>}

            {finalSortedMetrics.map((m, i) => {
              const isAvgMetric = m.title.includes("生産性") || m.title.includes("%") || m.title.includes("率") || m.title.includes("単価") || m.title.includes("時給");
              const isCost = lowIsBetterMetrics.some(k => m.title.includes(k)) || activeTab === 'manhours' || m.title.includes('原価');
              const isStacked = m.isStacked;
              const weekIdx = weeklyGroups[selectedWeek]?.indices || [];

              let chartData = [];
              let dispAct = m._sortVal;
              let dispFct = 0; let dispLastAct = 0; let dispPrevYearAct = 0;
              let currentRatio = 0; let diffLastMonth = 0; let diffLastYear = 0;
              let lastMonthRatio = 0; let lastYearRatio = 0; let hasForecastData = false;

              const calcAvg = (arr: number[]) => { const valid = arr.filter(v => v > 0); return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : 0; };
              const targetIndices = displayMode === 'weekly' ? weekIdx :
                currentMonthIndices.filter(idx => {
                  if (!baseLabelsFiltered[idx]) return false;
                  const dayStr = baseLabelsFiltered[idx].includes('/') ? baseLabelsFiltered[idx].split('/').pop() : baseLabelsFiltered[idx].replace(/[^0-9]/g, '') || '1';
                  const dayNum = parseInt(dayStr, 10);
                  const todayMonth = new Date().getMonth() + 1; const selMonth = parseInt(dataMonth, 10);
                  if (selMonth !== todayMonth) return true;
                  return dayNum <= new Date().getDate();
                });

              if (targetIndices.length === 0 && displayMode === 'daily') targetIndices.push(...currentMonthIndices);

              if (isStacked) {
                chartData = (displayMode === 'daily' ? currentMonthIndices : weekIdx).map(idx => ({
                  name: baseLabelsFiltered[idx],
                  通常: n(m.data['通常']?.actual_thisMonth[idx]),
                  残業: n(m.data['残業']?.actual_thisMonth[idx]),
                  深夜: n(m.data['深夜']?.actual_thisMonth[idx]),
                }));

                const sumKey = (key: string, metricArr: string) => targetIndices.reduce((sum, idx) => sum + n(m.data[key]?.[metricArr]?.[idx]), 0);
                dispLastAct = sumKey('通常', 'actual_lastMonth') + sumKey('残業', 'actual_lastMonth') + sumKey('深夜', 'actual_lastMonth');
                dispPrevYearAct = sumKey('通常', 'actual_lastYear') + sumKey('残業', 'actual_lastYear') + sumKey('深夜', 'actual_lastYear');

                diffLastMonth = dispAct - dispLastAct; diffLastYear = dispAct - dispPrevYearAct;
                lastMonthRatio = dispLastAct > 0 ? (dispAct / dispLastAct) * 100 : (dispAct > 0 ? 100 : 0);
                lastYearRatio = dispPrevYearAct > 0 ? (dispAct / dispPrevYearAct) * 100 : (dispAct > 0 ? 100 : 0);
              }
              else {
                chartData = (displayMode === 'daily' ? currentMonthIndices : weekIdx).map(idx => ({
                  name: m.labels[idx],
                  今月実績: n(m.actual_thisMonth[idx]),
                  先月: n(m.actual_lastMonth[idx]),
                  前年: n(m.actual_lastYear[idx]),
                  [m.forecastType]: n(m.forecast[idx])
                }));

                const fcts = targetIndices.map(idx => n(m.forecast[idx]));
                const lastActs = targetIndices.map(idx => n(m.actual_lastMonth[idx]));
                const prevYearActs = targetIndices.map(idx => n(m.actual_lastYear[idx]));

                if (isAvgMetric) {
                  dispFct = calcAvg(fcts) || 1; dispLastAct = calcAvg(lastActs); dispPrevYearAct = calcAvg(prevYearActs);
                } else {
                  dispFct = fcts.reduce((a, b) => a + b, 0) || 1; dispLastAct = lastActs.reduce((a, b) => a + b, 0); dispPrevYearAct = prevYearActs.reduce((a, b) => a + b, 0);
                }

                hasForecastData = m.forecast?.some((v: number) => n(v) > 0) || false;
                currentRatio = dispFct > 0 ? (dispAct / dispFct) * 100 : 0;
                diffLastMonth = dispAct - dispLastAct; diffLastYear = dispAct - dispPrevYearAct;
                lastMonthRatio = dispLastAct > 0 ? (dispAct / dispLastAct) * 100 : (dispAct > 0 ? 100 : 0);
                lastYearRatio = dispPrevYearAct > 0 ? (dispAct / dispPrevYearAct) * 100 : (dispAct > 0 ? 100 : 0);
              }

              const getDiffBgBorderColor = (diff: number, isCost: boolean) => {
                if (diff === 0) return 'text-slate-500 bg-slate-50 border-slate-200';
                if (isCost) return diff > 0 ? 'text-rose-600 bg-rose-50 border-rose-200' : 'text-emerald-600 bg-emerald-50 border-emerald-200';
                return diff > 0 ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-rose-600 bg-rose-50 border-rose-200';
              };

              const getDarkBadgeStyle = (diff: number, isCost: boolean) => {
                if (diff === 0) return 'bg-slate-800 text-slate-400 border-slate-700';
                if (isCost) return diff > 0 ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
                return diff > 0 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border-rose-500/30';
              };

              const primaryColor = currentTab.color;
              const secondaryColor = '#8b5cf6';
              const lastMonthColor = '#94a3b8';
              const prevYearColor = '#fbbf24';

              return (
                <div key={i} className={`print-avoid-break p-5 md:p-6 rounded-3xl shadow-sm flex flex-col gap-4 md:gap-5 min-w-0 overflow-hidden print:shadow-none print:border-slate-300 transition-all border relative ${m.is_hidden ? 'opacity-40 bg-slate-100 border-dashed border-amber-300' : 'bg-white border-slate-200'}`}>
                  
                  {/* 📌 グラフ操作用コントロールスイッチを右上に配置（印刷時は非表示） */}
                  <div className="absolute top-4 right-4 flex gap-1.5 print:hidden z-20">
                    <button 
                      onClick={() => handleToggleMetricSetting(m.title, 'is_pinned', m.is_pinned)} 
                      className={`w-7 h-7 flex items-center justify-center rounded-full border shadow-sm transition-all ${m.is_pinned ? 'bg-blue-100 border-blue-300 text-blue-600 font-black' : 'bg-white text-slate-400 hover:text-blue-500'}`} 
                      title={m.is_pinned ? "最上位ピン留めを解除" : "最上位にピン留めする"}
                    >
                      <Pin size={13} className={m.is_pinned ? "fill-blue-600 rotate-45" : ""} />
                    </button>
                    <button 
                      onClick={() => handleToggleMetricSetting(m.title, 'is_hidden', m.is_hidden)} 
                      className={`w-7 h-7 flex items-center justify-center rounded-full border shadow-sm transition-all ${m.is_hidden ? 'bg-amber-100 border-amber-300 text-amber-600' : 'bg-white text-slate-400 hover:text-amber-500'}`} 
                      title={m.is_hidden ? "グラフを表示する" : "グラフを非表示にする"}
                    >
                      {m.is_hidden ? <Eye size={13} /> : <EyeOff size={13} />}
                    </button>
                  </div>

                  <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-4 border-b border-slate-100 pb-4 print:border-slate-200">
                    <div className="flex-1 flex flex-col items-start min-w-0 w-full pr-16">
                      <div className="flex items-center gap-3 mb-1.5 w-full">
                        <span className="text-[10px] md:text-[11px] font-black text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200 uppercase tracking-widest shadow-sm whitespace-nowrap shrink-0">
                          {dataMonth}月
                        </span>
                        {m.is_pinned && <span className="text-[9px] font-black bg-blue-600 text-white px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow-sm shrink-0">📌 固定中</span>}
                        <h4 className="text-sm md:text-base font-black text-slate-900 tracking-tighter uppercase leading-tight truncate">
                          {m.title}
                        </h4>
                      </div>
                      {displayMode === 'daily' && <p className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tighter leading-none mt-1.5">{formatVal(dispAct, m.title)}</p>}
                    </div>

                    {displayMode === 'daily' && (
                      <div className="flex flex-col gap-2 shrink-0 w-full xl:w-auto">
                        <div className="flex gap-2">
                          {hasForecastData && !isStacked ? (
                            <div className="flex items-center gap-3 bg-white border px-4 py-1.5 rounded-xl shadow-sm flex-1 xl:flex-none justify-center">
                              <span className="text-xs font-bold text-slate-400 whitespace-nowrap">進捗率</span>
                              <span className={`text-xl font-black whitespace-nowrap ${currentRatio >= 100 ? (isCost ? 'text-rose-600' : 'text-emerald-600') : (isCost ? 'text-emerald-600' : 'text-rose-600')}`}>{currentRatio.toFixed(1)}%</span>
                            </div>
                          ) : (
                            <>
                              <div className="flex flex-col bg-white border px-3 py-1 rounded-xl flex-1 items-center justify-center"><span className="text-[9px] font-bold text-slate-400 whitespace-nowrap">先月比</span><span className={`text-sm font-black whitespace-nowrap ${diffLastMonth >= 0 ? (isCost ? 'text-rose-600' : 'text-emerald-600') : (isCost ? 'text-emerald-600' : 'text-rose-600')}`}>{lastMonthRatio.toFixed(1)}%</span></div>
                              <div className="flex flex-col bg-white border px-3 py-1 rounded-xl flex-1 items-center justify-center"><span className="text-[9px] font-bold text-slate-400 whitespace-nowrap">前年比</span><span className={`text-sm font-black whitespace-nowrap ${diffLastYear >= 0 ? (isCost ? 'text-rose-600' : 'text-emerald-600') : (isCost ? 'text-emerald-600' : 'text-rose-600')}`}>{lastYearRatio.toFixed(1)}%</span></div>
                            </>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <span className={`flex-1 xl:flex-none text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center justify-between gap-3 border ${getDiffBgBorderColor(diffLastMonth, isCost)}`}>
                            <span className="whitespace-nowrap">先月比</span> <span className="whitespace-nowrap font-black">{diffLastMonth > 0 ? '+' : diffLastMonth < 0 ? '-' : '±'}{hasForecastData && !isStacked ? formatVal(Math.abs(diffLastMonth), m.title) : `${lastMonthRatio.toFixed(1)}%`}</span>
                          </span>
                          <span className={`flex-1 xl:flex-none text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center justify-between gap-3 border ${getDiffBgBorderColor(diffLastYear, isCost)}`}>
                            <span className="whitespace-nowrap">前年比</span> <span className="whitespace-nowrap font-black">{diffLastYear > 0 ? '+' : diffLastYear < 0 ? '-' : '±'}{hasForecastData && !isStacked ? formatVal(Math.abs(diffLastYear), m.title) : `${lastYearRatio.toFixed(1)}%`}</span>
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <div className="bg-slate-50 px-3 py-1 rounded-lg border flex-1 xl:flex-none flex justify-between items-center gap-3"><span className="text-[9px] font-bold text-slate-400 whitespace-nowrap">先月</span><span className="text-[10px] font-black text-slate-600 whitespace-nowrap">{formatVal(dispLastAct, m.title)}</span></div>
                          <div className="bg-amber-50 px-3 py-1 rounded-lg border border-amber-200 flex-1 xl:flex-none flex justify-between items-center gap-3"><span className="text-[9px] font-bold text-amber-600 whitespace-nowrap">前年</span><span className="text-[10px] font-black text-amber-700 whitespace-nowrap">{formatVal(dispPrevYearAct, m.title)}</span></div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className={displayMode !== 'daily' ? 'flex flex-col xl:flex-row gap-4 items-stretch w-full min-w-0' : 'w-full min-w-0'}>
                    <div className="flex-1 w-full h-[220px] min-h-[220px] bg-slate-50/50 p-2 rounded-2xl border min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        {isStacked ? (
                          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} axisLine={false} tickLine={false} />
                            <YAxis stroke="#94a3b8" fontSize={9} axisLine={false} tickLine={false} tickFormatter={(v) => v.toLocaleString()} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                            <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', paddingBottom: '10px' }} />
                            <Bar name="通常" dataKey="通常" stackId="a" fill="#0ea5e9" />
                            <Bar name="残業" dataKey="残業" stackId="a" fill="#ef4444" />
                            <Bar name="深夜" dataKey="深夜" stackId="a" fill="#a855f7" radius={[4, 4, 0, 0]} />
                          </BarChart>
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
                            {chartData.some(d => d["前年"]) && <Area type="monotone" name="前年" dataKey="前年" stroke={prevYearColor} strokeWidth={2.5} fillOpacity={0} />}
                            {chartData.some(d => d["先月"]) && <Area type="monotone" name="先月" dataKey="先月" stroke={lastMonthColor} strokeWidth={2} strokeDasharray="4 4" fillOpacity={0} />}
                            <Area type="monotone" name="今月実績" dataKey="今月実績" stroke={primaryColor} strokeWidth={3} fillOpacity={1} fill={`url(#colorAct-${i})`} activeDot={{ r: 5 }} />
                            {hasForecastData && <Area type="monotone" name={m.forecastType} dataKey={m.forecastType} stroke={secondaryColor} strokeWidth={2} strokeDasharray="5 5" fillOpacity={1} fill={`url(#colorFct-${i})`} />}
                          </AreaChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                    {displayMode !== 'daily' && (
                      <div className="w-full xl:w-[240px] bg-slate-900 text-white p-5 rounded-2xl flex flex-col justify-between shrink-0 shadow-inner min-w-0">
                        <div>
                          <p className="text-[9px] font-black tracking-widest text-blue-400 uppercase">当週{!isAvgMetric ? '合計':'平均'}確認</p>
                          <div className="flex justify-between items-baseline mt-3">
                            <span className="text-[10px] md:text-xs font-bold text-slate-400 whitespace-nowrap">
                              {!isAvgMetric ? '当週合計実績' : '当週平均実績'}
                            </span>
                            <span className="text-xl md:text-2xl font-black text-white">{formatVal(dispAct, m.title)}</span>
                          </div>

                          {hasForecastData && !isStacked && (
                            <>
                              <div className="flex justify-between items-baseline mt-2">
                                <span className="text-[10px] md:text-xs font-bold text-slate-400 whitespace-nowrap">
                                  {!isAvgMetric ? `当週${m.forecastType}` : `当週平均${m.forecastType}`}
                                </span>
                                <span className="text-sm md:text-base font-bold text-slate-300">{formatVal(dispFct, m.title)}</span>
                              </div>
                              <div className="flex justify-between items-baseline mt-2.5 border-t border-slate-700/50 pt-2.5">
                                <span className="text-[10px] md:text-xs font-black text-blue-400 whitespace-nowrap">達成率</span>
                                <span className={`text-xl md:text-2xl font-black whitespace-nowrap ${currentRatio >= 100 ? (isCost ? 'text-rose-400' : 'text-emerald-400') : (isCost ? 'text-emerald-400' : 'text-rose-400')}`}>{currentRatio.toFixed(1)}%</span>
                              </div>
                            </>
                          )}
                        </div>

                        <div className="border-t border-slate-800 pt-3 mt-3 flex flex-col gap-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">先月比</span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border whitespace-nowrap ${getDarkBadgeStyle(diffLastMonth, isCost)}`}>
                              {diffLastMonth > 0 ? '▲' : diffLastMonth < 0 ? '▼' : ''} {lastMonthRatio.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">前年比</span>
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
        【6】月次確定（売上確定）タブ
        ========================================= */}
        {activeTab === 'salesConfirmed' && (
          <div className="space-y-4 md:space-y-6">
            <div className="border-b border-slate-200 pb-3 md:pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 md:gap-3">
                  <CheckCircle2 className="text-sky-500" size={24} /> 6. 月次確定 (売上確定)
                </h2>
                <p className="text-slate-400 text-xs md:text-sm font-bold mt-1 uppercase tracking-widest">Monthly Confirmed Sales Report</p>
              </div>
              <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-xl print:hidden shadow-sm">
                <Calendar size={12} className="text-blue-500" />
                <select value={salesMonth} onChange={(e) => setSalesMonth(e.target.value)} className="bg-transparent border-none text-blue-800 text-[10px] md:text-[11px] font-black focus:outline-none cursor-pointer">
                  {Object.keys(data?.salesConfirmedData || {}).sort().reverse().map((m, idx) => (
                    <option key={idx} value={m}>{m} 確定データ</option>
                  ))}
                </select>
                <ChevronDown size={11} className="text-blue-400" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {(!data?.salesConfirmedData || !data.salesConfirmedData[salesMonth] || data.salesConfirmedData[salesMonth].length === 0) ? (
                <div className="col-span-full py-10 text-center text-slate-400 font-bold">選択された月度（{salesMonth}）の月次確定データがありません。シートの転写マクロを実行してください。</div>
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

        {/* =========================================
        🚀 【7】アクション統合タブ
        ========================================= */}
        {activeTab === 'actions' && (
          <div className="space-y-6">
            <div className="border-b border-slate-200 pb-3 md:pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 md:gap-3">
                  <Rocket className="text-purple-500" size={24} /> 7. アクション施策管理
                </h2>
                <p className="text-slate-400 text-xs md:text-sm font-bold mt-1 uppercase tracking-widest">Operation & DX Action Roadmap</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowHiddenItems(!showHiddenItems)}
                  className={`px-3 py-1.5 md:px-4 md:py-2 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black border transition-all whitespace-nowrap shrink-0 shadow-sm print:hidden ${showHiddenItems ? 'bg-purple-600 text-white border-purple-700 shadow-inner' : 'bg-white text-purple-600 border-purple-200 hover:bg-purple-50'}`}
                >
                  {showHiddenItems ? '非表示項目を隠す(ON)' : '非表示項目を表示'}
                </button>
              </div>
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
                  const targetTable = activeActionTab === 'dx' ? 'dx_actions' : 'env_actions';
                  const displayItems = showHiddenItems ? currentItems : currentItems.filter((item: any) => !item.is_hidden);
                  const themeColor = activeActionTab === 'dx' ? '#7c3aed' : '#10b981';
                  
                  if (displayItems.length === 0) return <div className="col-span-1 lg:col-span-2 bg-white border p-8 md:p-12 rounded-2xl md:rounded-[2.5rem] text-center text-slate-400 font-bold text-xs md:text-sm">💡 該当する施策アクションはありません。</div>;
                  
                  return displayItems.map((item, index) => {
                    const itemRatio = Math.min(100, Math.max(0, Math.round(n(item.ratio))));
                    const chartPieData = [{ name: '完了', value: itemRatio }, { name: '未完了', value: 100 - itemRatio }];
                    return (
                      <div key={index} className={`print-avoid-break bg-white border p-5 md:p-8 rounded-3xl shadow-sm flex flex-col md:flex-row gap-4 md:gap-6 items-center transition-all relative overflow-hidden print:shadow-none print:border-slate-300 ${item.is_hidden ? 'opacity-40 bg-slate-100 border-dashed' : item.customer_related === 'あり' ? 'border-rose-200 bg-rose-50/10' : 'border-slate-200'}`}>
                        <div className="absolute top-3 right-3 flex gap-1.5 print:hidden">
                          <button onClick={() => handleToggleHideItem(item, targetTable)} className={`w-7 h-7 flex items-center justify-center rounded-full border shadow-sm transition-all ${item.is_hidden ? 'bg-amber-100 border-amber-200 text-amber-600' : 'bg-white text-slate-400 hover:text-amber-500'}`} title={item.is_hidden ? "再表示する" : "隠す"}>
                            {item.is_hidden ? <Eye size={13} /> : <EyeOff size={13} />}
                          </button>
                          <button onClick={() => handleOpenEditModal(index)} className="w-7 h-7 flex items-center justify-center rounded-full bg-white border text-slate-400 shadow-sm hover:text-blue-500 transition-all"><Edit2 size={13} /></button>
                          <button onClick={() => { if(confirm("削除しますか？")) handleDeleteItem(index); }} className="w-7 h-7 flex items-center justify-center rounded-full bg-white border text-slate-400 shadow-sm hover:text-rose-500 transition-all"><X size={14} /></button>
                        </div>
                        <div className="w-[120px] h-[120px] md:w-[140px] md:h-[140px] relative shrink-0 min-w-0 mt-6 md:mt-0 print:w-[140px] print:h-[140px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={chartPieData} cx="50%" cy="50%" innerRadius="65%" outerRadius="85%" startAngle={90} endAngle={-270} dataKey="value">
                                <Cell fill={item.is_hidden ? "#94a3b8" : themeColor} /> <Cell fill={item.customer_related === 'あり' ? "#ffe4e6" : "#f1f5f9"} />
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-xl md:text-2xl font-black tracking-tighter" style={{ color: item.is_hidden ? '#64748b' : themeColor }}>{itemRatio}%</span>
                            <span className="text-[7px] md:text-[8px] font-bold text-slate-400 uppercase tracking-widest">{itemRatio === 100 ? '完了' : '進捗率'}</span>
                          </div>
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
                    return displayHistory.map((log, index) => (
                      <div key={index} className={`print-avoid-break bg-slate-50 border p-4 md:p-6 rounded-2xl md:rounded-3xl space-y-3 relative group transition-all print:bg-white print:border-slate-300 ${log.is_hidden ? 'opacity-40 bg-slate-200 border-dashed shadow-none' : 'border-slate-100 hover:shadow-md'}`}>
                        <div className="absolute top-3 right-3 flex gap-1.5 print:hidden">
                          <button onClick={() => handleToggleHideItem(log, 'sales_history')} className={`w-7 h-7 flex items-center justify-center rounded-full border shadow-sm transition-all ${log.is_hidden ? 'bg-amber-100 border-amber-200 text-amber-600' : 'bg-white text-slate-400 hover:text-amber-500'}`} title={log.is_hidden ? "再表示する" : "隠す"}>
                            {log.is_hidden ? <Eye size={13} /> : <EyeOff size={13} />}
                          </button>
                          <button onClick={() => handleOpenEditModal(index)} className="w-7 h-7 flex items-center justify-center rounded-full bg-white border text-slate-400 shadow-sm hover:text-blue-500 transition-all"><Edit2 size={13} /></button>
                          <button onClick={() => { if(confirm("消去しますか？")) handleDeleteItem(index); }} className="w-7 h-7 flex items-center justify-center rounded-full bg-white border text-slate-400 shadow-sm hover:text-rose-500 transition-all"><X size={14} /></button>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 md:gap-3 pr-24 print:pr-0">
                          <div className="bg-white border-2 border-rose-500 p-1 md:p-1.5 rounded-full text-rose-500 shrink-0"><Building2 size={10} /></div>
                          <span className="text-[10px] md:text-xs bg-slate-900 text-white px-2 md:px-2.5 py-0.5 rounded-lg font-mono font-black print:bg-slate-100 print:text-slate-800 print:border">{log.date || '日付未設定'}</span>
                          <h4 className="text-sm md:text-base font-black text-slate-900 tracking-tight">{log.client}</h4>
                          <span className={`text-[9px] md:text-[11px] font-black px-2 md:px-3 py-0.5 rounded-full border ${log.result === '●' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>結果: {log.result}</span>
                        </div>
                        {log.proposal && <div className="text-[10px] md:text-xs font-black text-slate-800 bg-white border px-2.5 md:px-3 py-1.5 rounded-xl w-fit"><span className="text-rose-500 font-extrabold">💡 提案内容:</span> {log.proposal}</div>}
                        {log.detail && <p className="text-[11px] md:text-[12px] font-medium text-slate-600 leading-relaxed whitespace-pre-wrap">{log.detail}</p>}
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================
        📊 【8】事故管理タブ
        ========================================= */}
        {activeTab === 'accidents' && (
          <div className="space-y-6 md:space-y-8">
            <div className="border-b border-slate-200 pb-3 md:pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 md:gap-3"><AccidentIcon className="text-amber-500" size={24} /> 8. カテゴリ別 事故件数 ({globalSelectedMonth}月度)</h2>
                <p className="text-slate-400 text-xs md:text-sm font-bold mt-1 uppercase tracking-widest">Category-wise Safety Performance</p>
              </div>

              <div className="flex flex-wrap items-center gap-3.5 flex-1 justify-start lg:justify-center px-2 md:px-6 print:hidden">
                <div className={`flex items-center gap-5 px-5 py-2.5 rounded-2xl border shadow-sm transition-all ${accidentSummary.ratio >= 100 ? 'bg-rose-50 border-rose-300 text-rose-700 animate-pulse font-black' : 'bg-emerald-50/60 border-emerald-100 text-emerald-800'}`}>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">センター全体の当月総事故</span>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-base md:text-lg font-extrabold">{accidentSummary.thisTotal} 件</span>
                      <span className="text-[10px] text-slate-500">
                        (先月: {accidentSummary.lastTotal}件 / 前月差: {accidentSummary.diff >= 0 ? `+${accidentSummary.diff}` : accidentSummary.diff}件)
                      </span>
                    </div>
                  </div>
                  <div className="h-8 w-[1px] bg-slate-200" />
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">事故発生率 (先月比)</span>
                    <span className="text-xs md:text-base font-extrabold tracking-tight mt-0.5 flex items-center gap-1">
                      {accidentSummary.ratio.toFixed(1)}% {accidentSummary.ratio >= 100 ? '🚨 [目標超過]' : '✅ [安全圏]'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-xl print:hidden shadow-sm">
                <Calendar size={12} className="text-blue-500" />
                <select value={globalSelectedMonth} onChange={(e) => setGlobalSelectedMonth(e.target.value)} className="bg-transparent border-none text-blue-800 text-[10px] md:text-[11px] font-black focus:outline-none cursor-pointer">
                  {availableMonths.map((m, idx) => <option key={idx} value={m}>{m}月度 事故統計</option>)}
                </select>
                <ChevronDown size={11} className="text-blue-400" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 print:grid-cols-2 print:gap-6">
              {accidentCategories.length === 0 && <div className="col-span-full py-10 text-center text-slate-400 font-bold">検索条件に一致する data がありません。</div>}
              {accidentCategories.map((cat, i) => {
                const styles = getLevelStyles(cat.total); const daysSince = calculateDaysSince(cat.lastDate);
                return (
                  <div key={i} className={`print-avoid-break bg-white border-2 ${styles.cardBorder} p-5 md:p-6 rounded-3xl md:rounded-[2rem] shadow-sm relative transition-all flex flex-col justify-between print:shadow-none`}>
                    <div className="flex justify-between items-start mb-5 md:mb-6">
                      <div className="flex items-center gap-2">
                        {styles.icon} <h3 className="text-base md:text-xl font-black text-slate-800">{cat.name}</h3>
                      </div>
                      <div className="bg-slate-900 text-white px-3 md:px-4 py-1.5 rounded-xl md:rounded-2xl flex items-center gap-1.5 md:gap-2 shadow-md print:shadow-none print:border print:bg-white print:text-slate-800">
                        <span className="text-[8px] md:text-[10px] font-bold text-blue-400 tracking-wider">無事故</span>
                        <span className="text-lg md:text-2xl font-black italic tracking-tighter"><AnimatedNumber value={daysSince} /></span>
                        <span className="text-[8px] md:text-[10px] font-bold">DAYS</span>
                      </div>
                    </div>
                    <div className="flex justify-center mb-6 md:mb-8 relative">
                      <div className={`w-32 h-32 md:w-48 md:h-48 rounded-full border-8 md:border-[16px] flex flex-col items-center justify-center bg-white shadow-inner z-10 relative ${styles.meterBorder} ${styles.text}`}>
                        <span className="text-[9px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-[-2px] md:mb-[-5px]">当月事故</span>
                        <span className="text-5xl md:text-7xl font-black tracking-tighter"><AnimatedNumber value={cat.total} /></span>
                        <span className="text-[8px] md:text-[10px] font-bold">件</span>
                      </div>
                    </div>
                    <div className="flex justify-center gap-2 md:gap-4 text-[10px] md:text-sm font-bold">
                      <div className="flex-1 flex flex-col items-center justify-center p-2.5 md:p-4 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 min-w-0">
                        <span className="text-[8px] md:text-[10px] font-black uppercase tracking-wider mb-1 text-center truncate w-full">
                          {data?.accidentTitles?.chaseOn || "追走あり"}
                        </span>
                        <div className="flex items-baseline gap-1"><span className="text-xl md:text-3xl font-black"><AnimatedNumber value={cat.chaseOn}/></span><span className="text-[10px] md:text-xs">件</span></div>
                      </div>
                      <div className="flex-1 flex flex-col items-center justify-center p-2.5 md:p-4 bg-slate-50 text-slate-500 rounded-xl border border-slate-200 min-w-0">
                        <span className="text-[8px] md:text-[10px] font-black uppercase tracking-wider mb-1 text-center truncate w-full">
                          {data?.accidentTitles?.chaseOff || "追走なし"}
                        </span>
                        <div className="flex items-baseline gap-1"><span className="text-base md:text-2xl font-black"><AnimatedNumber value={cat.chaseOff}/></span><span className="text-[9px] md:text-[11px]">件</span></div>
                      </div>
                    </div>
                    <div className="text-center mt-5 md:mt-8 border-t border-slate-100 pt-3 md:pt-4"><p className="text-[9px] md:text-[11px] font-bold text-slate-400">最終発生日: {cat.lastDate}</p></div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =========================================
        📊 【9】請負予実ダッシュボード
        ========================================= */}
        {activeTab === 'contract' && (
          <div className="space-y-4 md:space-y-6">
            <div className="border-b border-slate-200 pb-3 md:pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 md:gap-3">
                  <FileText className="text-blue-500" size={24} /> 9. 請負予実ダッシュボード
                </h2>
                <p className="text-slate-400 text-xs md:text-sm font-bold mt-1 uppercase tracking-widest">Contract Performance vs Budget</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                <button
                  onClick={() => setHideZeroContracts(!hideZeroContracts)}
                  className={`px-3 py-1.5 md:px-4 md:py-2 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black border transition-all whitespace-nowrap shrink-0 shadow-sm print:hidden ${hideZeroContracts ? 'bg-blue-600 text-white border-blue-700 shadow-inner' : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'}`}
                >
                  {hideZeroContracts ? '0の項目を隠す(ON)' : '0の項目も表示'}
                </button>
                <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-xl shadow-sm">
                  <Calendar size={12} className="text-blue-500" />
                  <select
                    value={contractSelectedMonth}
                    onChange={(e) => setContractSelectedMonth(e.target.value)}
                    className="bg-transparent border-none text-blue-800 text-[10px] md:text-xs font-black focus:outline-none cursor-pointer"
                  >
                    {contractAvailableMonths.map((m, idx) => (
                      <option key={idx} value={m}>{m}月度 データ</option>
                    ))}
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
                        <span className={`text-[10px] md:text-xs font-black whitespace-nowrap ${diffVal > 0 ? 'text-emerald-600' : diffVal < 0 ? 'text-rose-600' : 'text-slate-500'}`}>{diffVal > 0 ? '+' : ''}{formatVal(diffVal, m.title)}</span>
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-1.5 flex justify-between items-center border border-slate-100 mt-1 print:bg-white print:border-slate-200">
                      <span className="text-[7px] text-slate-400 font-black whitespace-nowrap">達成率</span>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded flex items-center whitespace-nowrap ${ratioVal >= 100 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{ratioVal > 0 ? `${ratioVal.toFixed(1)}%` : '--%'}</span>
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
        <div className={`fixed bottom-6 right-6 md:bottom-10 md:right-10 z-50 px-5 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl shadow-2xl border flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 print:hidden ${toastInfo.type === 'success' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-rose-600 border-rose-700 text-white'}`}>
          {toastInfo.type === 'success' ? <CheckCircle2 size={20} className="text-emerald-400" /> : <AlertTriangle size={20} className="text-white" />}
          <span className="text-xs md:text-sm font-bold tracking-wider">{toastInfo.msg}</span>
        </div>
      )}

      {/* 新規追加・編集モーダル */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 print:hidden">
          <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-2xl space-y-4 md:space-y-6">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-sm md:text-base font-black text-slate-900">
                【{activeTab === 'actions' ? (activeActionTab === 'dx' ? 'DX推進' : activeActionTab === 'env' ? '現場改善' : '営業履歴') : tabs.find(t=>t.id===activeTab)?.label}】データの{editingIndex !== null ? '編集上書き' : '新規追加'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-900 bg-slate-100 p-1.5 rounded-full"><X size={16} /></button>
            </div>
            
            {(activeTab === 'actions' && activeActionTab === 'history') ? (
              <div className="space-y-3 md:space-y-4 text-[11px] md:text-xs font-bold text-slate-700">
                <div className="space-y-1"><label className="text-slate-400">1. 日付 *必須</label><input type="date" value={newItem.startDate} onChange={(e) => setNewItem({...newItem, startDate: e.target.value})} className="w-full bg-slate-50 border rounded-xl px-3 md:px-4 py-2.5 md:py-3 font-semibold text-slate-900" /></div>
                <div className="space-y-1"><label className="text-slate-400">2. 誰に *必須</label><input type="text" value={newItem.client} onChange={(e) => setNewItem({...newItem, client: e.target.value})} className="w-full bg-slate-50 border rounded-xl px-3 md:px-4 py-2.5 md:py-3 font-semibold text-slate-900" /></div>
                <div className="space-y-1"><label className="text-slate-400">3. 何を *必須</label><input type="text" value={newItem.proposal} onChange={(e) => setNewItem({...newItem, proposal: e.target.value})} className="w-full bg-slate-50 border rounded-xl px-3 md:px-4 py-2.5 md:py-3 h-16 resize-none font-semibold text-slate-900" /></div>
                <div className="space-y-1"><label className="text-slate-400">4. 内容詳細</label><textarea value={newItem.detail} onChange={(e) => setNewItem({...newItem, detail: e.target.value})} className="w-full bg-slate-50 border rounded-xl px-3 md:px-4 py-2.5 md:py-3 h-20 md:h-24 resize-none font-semibold text-slate-900" /></div>
                <div className="space-y-1">
                  <label className="text-slate-400">5. 商談結果</label>
                  <div className="grid grid-cols-3 gap-2 md:gap-3">
                    {['●', '×', '△'].map(res => (
                      <button key={res} type="button" onClick={() => setNewItem({...newItem, result: res})} className={`py-2 md:py-2.5 rounded-xl font-black border transition-all ${newItem.result === res ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-600'}`}>{res}</button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 md:space-y-4 text-[11px] md:text-xs font-bold text-slate-700">
                <div className="space-y-1"><label className="text-slate-400">項目名 *必須</label><input type="text" value={newItem.name} onChange={(e) => setNewItem({...newItem, name: e.target.value})} className="w-full bg-slate-50 border rounded-xl px-3 md:px-4 py-2.5 md:py-3 font-semibold text-slate-900" /></div>
                <div className="space-y-1"><label className="text-slate-400">想定効果</label><textarea value={newItem.effect} onChange={(e) => setNewItem({...newItem, effect: e.target.value})} className="w-full bg-slate-50 border rounded-xl px-3 md:px-4 py-2.5 md:py-3 h-16 resize-none font-semibold text-slate-900" /></div>
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
    </div>
  );
}