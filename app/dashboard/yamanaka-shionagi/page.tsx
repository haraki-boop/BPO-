// @ts-nocheck
'use client';
import React, { useEffect, useState } from 'react';
import { ArrowLeft, Activity, Calculator, TrendingUp, Calendar, Rocket, Leaf, MessageSquare, Clock, Bot, ThumbsUp, ThumbsDown, Plus, X, Building2, ChevronDown, ShieldAlert as AccidentIcon, Zap, AlertTriangle, CheckCircle2, ShieldAlert, Edit2, Loader2, Search, BrainCircuit, BarChart3, PieChart as PieChartIcon, ActivitySquare, RefreshCw, Printer, FileText, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, AreaChart, Area, ComposedChart, Bar, ReferenceLine, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';

// =========================================================
// 🚀 共通ユーティリティ関数
// =========================================================
const n = (val: any) => {
  if (val === undefined || val === null || val === "") return 0;
  return parseFloat(val.toString().replace(/[^0-9.-]/g, '')) || 0;
};

const getAvailableMonths = (labels: string[]) => {
  const monthsSet = new Set<string>();
  labels.forEach(label => {
    if (typeof label === 'string' && label.includes('/')) {
      const month = label.split('/')[0];
      if (month) monthsSet.add(month);
    }
  });
  return Array.from(monthsSet).sort((a, b) => n(a) - n(b));
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

export default function YamanakaShionagiDashboardPage() {
  // 🚀 ヤマナカ しおなぎ生鮮センター専用の locationId に設定
  const locationId = 'yamanaka-shionagi';
  const [isMounted, setIsMounted] = useState(false);
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('logistics');
  const [displayMode, setDisplayMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedWeek, setSelectedWeek] = useState<number>(0);
  
  const [globalSelectedMonth, setGlobalSelectedMonth] = useState<string>('');
  const [contractSelectedMonth, setContractSelectedMonth] = useState<string>(''); 
  
  // 請負予実で0の項目を非表示にするトグルステート
  const [hideZeroContracts, setHideZeroContracts] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showHiddenItems, setShowHiddenItems] = useState(false);

  const [chappyAnalysis, setChappyAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [tabAiAnalysis, setTabAiAnalysis] = useState<{ [key: string]: string }>({});
  const [isTabAnalyzing, setIsTabAnalyzing] = useState<{ [key: string]: boolean }>({});

  const [dxItems, setDxItems] = useState<any[]>([]);
  const [envItems, setEnvItems] = useState<any[]>([]);
  const [historyItems, setHistoryItems] = useState<any[]>([]); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const [newItem, setNewItem] = useState({
    name: '', effect: '', startDate: '', endDate: '', customerRelated: false, ratio: 0, client: '', proposal: '', detail: '', result: '●'
  });

  const [toastInfo, setToastInfo] = useState<{show: boolean, msg: string, type: 'success'|'error'}>({show: false, msg: '', type: 'success'});

  const lowIsBetterMetrics = ["労務費", "タイミー", "外注費", "社会保険", "雇用保険", "有給", "交通費", "工数", "事故", "償却", "残業", "違反者", "総工数"];
  const totalMetricsKeywords = ["売上", "原価", "費", "工数", "物量", "タイミー", "有給", "交通費", "事故", "数", "ケース", "パレット", "卸量", "トン", "総工数"];

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
      const url = `https://ukhcalayaazwmufewsks.supabase.co/rest/v1/${table}`;
      const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVraGNhbGF5YWF6d211ZmV3c2tzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMDc5MTUsImV4cCI6MjA5NDY4MzkxNX0.I5A3_xeDUcBJvRogo_pYVa45_vJ_qL8Fur1qbuu3j4c`;
      const headers: any = { 'apikey': token, 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' };
      if (method === 'GET') {
        const res = await fetch(`${url}?location_id=eq.${locationId}&order=id.asc`, { method: 'GET', headers, cache: 'no-store' });
        if (!res.ok) throw new Error(`GET ${res.status}`); return await res.json();
      } else if (method === 'POST') {
        const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
        if (!res.ok) throw new Error(`POST ${res.status}`); return await res.json();
      } else if (method === 'PATCH') {
        const targetId = String(body.id); const { id, ...cleanBody } = body; 
        const res = await fetch(`${url}?id=eq.${targetId}`, { method: 'PATCH', headers, body: JSON.stringify(cleanBody) });
        if (!res.ok) throw new Error(`PATCH ${res.status}`); return await res.json();
      } else if (method === 'DELETE') {
        const res = await fetch(`${url}?id=eq.${body.id}`, { method: 'DELETE', headers });
        if (!res.ok) throw new Error(`DELETE ${res.status}`); return true;
      }
    } catch (e) { console.error("Supabase Operation Error:", e); }
    return null;
  };

  const fetchSupabaseData = async () => {
    const [dxData, envData, historyData] = await Promise.all([
      supabaseRequest('dx_actions', 'GET'), supabaseRequest('env_actions', 'GET'), supabaseRequest('sales_history', 'GET')
    ]);
    if (dxData) setDxItems(dxData); if (envData) setEnvItems(envData); if (historyData) setHistoryItems(historyData);
  };

  const fetchDashboardData = async (isReload = false) => {
    fetchSupabaseData();
    // 🚀 【ヤマナカ専用URLに設定完了】
    const gasUrl = "https://script.google.com/macros/s/AKfycbzoszHaplXZSf_ETIQxXA_3Fvy23mCs4ofLimmm6jnD2An9gf51aW9QV6aRBLy0cfPLPQ/exec";
    try {
      const res = await fetch(gasUrl);
      const json = await res.json();
      setData(json);
      if (!isReload && json && json.labels && json.labels.length > 0) {
        const months = getAvailableMonths(json.labels);
        const today = new Date(); const currentMonth = (today.getMonth() + 1).toString();
        if (months.includes(currentMonth)) setGlobalSelectedMonth(currentMonth);
        else setGlobalSelectedMonth(months[0]);
        
        if (json.contractYojitsuData && json.contractYojitsuData.length > 0) {
          const cLabels = json.contractYojitsuData[0].labels || [];
          const cleanCLabels = cLabels.map((l: any) => String(l).replace('月', ''));
          if (cleanCLabels.includes(currentMonth)) setContractSelectedMonth(currentMonth);
          else setContractSelectedMonth(cleanCLabels[0] || '4');
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
    setChappyAnalysis(null);
    setTabAiAnalysis({}); 
  }, [globalSelectedMonth]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setSearchQuery(''); 
    if (tabId === 'monthly') setDisplayMode('monthly');
    else if (!['dx', 'env', 'history', 'accidents', 'analysis', 'contract'].includes(tabId) && displayMode === 'monthly') setDisplayMode('daily');
  };

  const handleOpenAddModal = () => {
    setEditingIndex(null);
    setNewItem({ name: '', effect: '', startDate: '', endDate: '', customerRelated: false, ratio: 0, client: '', proposal: '', detail: '', result: '●' });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (index: number) => {
    setEditingIndex(index);
    if (activeTab === 'history') {
      const item = historyItems[index];
      setNewItem({ startDate: item.date ? item.date.replace(/\//g, '-') : '', client: item.client || '', proposal: item.proposal || '', detail: item.detail || '', result: item.result || '●' });
    } else {
      const targetList = activeTab === 'dx' ? dxItems : envItems; const item = targetList[index];
      setNewItem({ name: item.name || '', effect: item.effect === '未入力' ? '' : (item.effect || ''), startDate: item.start_date ? item.start_date.replace(/\//g, '-') : '', endDate: item.end_date ? item.end_date.replace(/\//g, '-') : '', customerRelated: item.customer_related === 'あり', ratio: item.ratio || 0 });
    }
    setIsModalOpen(true);
  };

  const handleSaveItem = async () => {
    if (activeTab === 'history') {
      if (!newItem.client || !newItem.proposal) return;
      const payload = { location_id: locationId, date: newItem.startDate ? newItem.startDate.replace(/-/g, '/') : '', client: newItem.client, proposal: newItem.proposal, detail: newItem.detail || '', result: newItem.result };
      if (editingIndex !== null) { payload.id = historyItems[editingIndex].id; await supabaseRequest('sales_history', 'PATCH', payload); } 
      else { await supabaseRequest('sales_history', 'POST', payload); }
    } else {
      if (!newItem.name) return;
      const payload = { location_id: locationId, name: newItem.name, effect: newItem.effect || '未入力', start_date: newItem.startDate ? newItem.startDate.replace(/-/g, '/') : '', end_date: newItem.endDate ? newItem.endDate.replace(/-/g, '/') : '', customer_related: newItem.customerRelated ? 'あり' : 'なし', ratio: Number(newItem.ratio) };
      const targetTable = activeTab === 'dx' ? 'dx_actions' : 'env_actions';
      if (editingIndex !== null) {
        const targetList = activeTab === 'dx' ? dxItems : envItems; payload.id = targetList[editingIndex].id; await supabaseRequest(targetTable, 'PATCH', payload);
      } else { await supabaseRequest(targetTable, 'POST', payload); }
    }
    await fetchDashboardData(); setIsModalOpen(false);
    showToast('データを保存しました', 'success');
  };

  const handleDeleteItem = async (indexToDelete: number) => {
    if (activeTab === 'history') await supabaseRequest('sales_history', 'DELETE', { id: historyItems[indexToDelete].id });
    else if (activeTab === 'dx') await supabaseRequest('dx_actions', 'DELETE', { id: dxItems[indexToDelete].id });
    else await supabaseRequest('env_actions', 'DELETE', { id: envItems[indexToDelete].id });
    await fetchDashboardData();
    showToast('データを削除しました', 'success');
  };

  const handleToggleHideItem = async (item: any, table: string) => {
    const payload = { id: item.id, is_hidden: !item.is_hidden };
    await supabaseRequest(table, 'PATCH', payload);
    await fetchDashboardData();
    showToast(item.is_hidden ? '項目を再表示しました' : '項目を非表示にしました', 'success');
  };

  const tabs = [
    { id: 'sales', label: '1. 売上・原価', icon: Calculator, color: '#2563eb' },
    { id: 'logistics', label: '2. 物量・工数', icon: Activity, color: '#059669' },
    { id: 'productivity', label: '3. 生産性', icon: TrendingUp, color: '#d97706' },
    { id: 'monthly', label: '4. 月次', icon: Calendar, color: '#ca8a04' },
    { id: 'dx', label: '5. DX推進', icon: Rocket, color: '#7c3aed' },
    { id: 'env', label: '6. 現場改善', icon: Leaf, color: '#10b981' }, 
    { id: 'history', label: '7. 営業履歴', icon: MessageSquare, color: '#e11d48' },
    { id: 'accidents', label: '8. 事故', icon: AccidentIcon, color: '#f59e0b' },
    { id: 'analysis', label: '9. 総合AI分析', icon: Bot, color: '#8b5cf6' },
    { id: 'contract', label: '10. 請負予実', icon: FileText, color: '#0ea5e9' },
  ];

  const currentTab = tabs.find(t => t.id === activeTab) || tabs[1];

  const baseLabelsFiltered = data ? (data.labels || []) : [];
  const availableMonths = getAvailableMonths(baseLabelsFiltered);
  const currentMonthIndices = baseLabelsFiltered.map((l, idx) => (typeof l === 'string' && l.split('/')[0] === globalSelectedMonth) ? idx : -1).filter(idx => idx !== -1);

  const contractAvailableMonths = (() => {
    if (!data || !data.contractYojitsuData || data.contractYojitsuData.length === 0) return [];
    const sets = new Set<string>();
    data.contractYojitsuData.forEach((item: any) => {
      if (item.labels) {
        item.labels.forEach((lbl: any) => {
          if (lbl) sets.add(String(lbl).replace('月', ''));
        });
      }
    });
    return Array.from(sets).sort((a, b) => {
      const getOrder = (mStr: string) => {
        const val = parseInt(mStr, 10) || 0;
        return val >= 4 ? val : val + 12;
      };
      return getOrder(a) - getOrder(b);
    });
  })();

  const weeklyGroups = (() => {
    const groups: { weekNum: number; label: string; indices: number[] }[] = [];
    if (!currentMonthIndices || currentMonthIndices.length === 0) return groups;
    let currentWeekIndices: number[] = []; let weekCount = 1; let startLabel = baseLabelsFiltered[currentMonthIndices[0]];
    currentMonthIndices.forEach((idx) => {
      const label = baseLabelsFiltered[idx];
      if (!label || typeof label !== 'string' || !label.includes('/')) { currentWeekIndices.push(idx); return; }
      const parts = label.split('/'); const date = new Date(2026, parseInt(parts[0], 10) - 1, parseInt(parts[1], 10));
      if (date.getDay() === 0 && currentWeekIndices.length > 0) {
        groups.push({ weekNum: weekCount, label: `${globalSelectedMonth}月度 ${weekCount}週目 (${startLabel} ～ ${baseLabelsFiltered[idx - 1]})`, indices: currentWeekIndices });
        weekCount++; startLabel = label; currentWeekIndices = [];
      }
      currentWeekIndices.push(idx);
    });
    if (currentWeekIndices.length > 0) {
      groups.push({ weekNum: weekCount, label: `${weekCount}週目 (${startLabel} ～ ${baseLabelsFiltered[currentMonthIndices[currentMonthIndices.length - 1]]})`, indices: currentWeekIndices });
    }
    return groups;
  })();

  const getCombinedMetrics = () => {
    if (!data) return [];
    const targetTabId = activeTab === 'monthly' ? 'sales' : (activeTab === 'accidents' ? 'logistics' : currentTab.id);
    let allItems = data[`${targetTabId}Data`] || [];
    if (activeTab === 'monthly' && data.monthlyData) allItems = [...allItems, ...data.monthlyData];
    if (activeTab === 'analysis') { 
      allItems = [...(data.salesData||[]), ...(data.logisticsData||[]), ...(data.productivityData||[]), ...(data.monthlyData||[])];
    }

    const combinedMap = new Map();
    allItems.forEach((item: any) => {
      if (!item || !item.title || !item.values || !Array.isArray(item.values)) return;
      const normalizedTitle = item.title.replace('＿', '_');
      let cleanTitle = normalizedTitle.replace('実績_', '').replace('予測_', '').replace('予算_', '').replace('目標_', '').replace('実績', '').replace('予測', '').replace('予算', '').replace('目標', '');
      if (cleanTitle.includes('社会保険')) cleanTitle = '社会保険';
      
      const isMonthlyFixed = item.labels && item.labels.length > 0 && !String(item.labels[0]).includes('/');

      if (!combinedMap.has(cleanTitle)) {
        combinedMap.set(cleanTitle, { 
           title: cleanTitle, 
           labels: item.labels || baseLabelsFiltered, 
           actual: new Array((item.labels || baseLabelsFiltered).length).fill(0), 
           forecast: new Array((item.labels || baseLabelsFiltered).length).fill(0), 
           forecastType: '予測', 
           isMonthlyFixed: isMonthlyFixed 
        });
      }
      const entry = combinedMap.get(cleanTitle);

      if (!entry.isMonthlyFixed && isMonthlyFixed) return; 
      if (entry.isMonthlyFixed && !isMonthlyFixed) {
         entry.isMonthlyFixed = false;
         entry.labels = item.labels || baseLabelsFiltered;
         entry.actual = new Array(baseLabelsFiltered.length).fill(0);
         entry.forecast = new Array(baseLabelsFiltered.length).fill(0);
      }

      if (normalizedTitle.includes('実績') || isMonthlyFixed) { 
        entry.actual = item.values; 
      } 
      if (!normalizedTitle.includes('実績') && !isMonthlyFixed) {
        entry.forecast = item.values;
        const detectedType = normalizedTitle.split('_')[0];
        if (detectedType && detectedType !== normalizedTitle) { entry.forecastType = detectedType; } 
        else if (normalizedTitle.includes('予算')) { entry.forecastType = '予算'; } 
        else if (normalizedTitle.includes('目標')) { entry.forecastType = '目標'; } 
        else { entry.forecastType = '予測'; }
      }
    });

    let result = Array.from(combinedMap.values());
    if (displayMode === 'daily' || displayMode === 'weekly') {
      const hiddenKeywords = ["本部費", "償却費", "社会保険", "雇用保険", "交通費", "有給"];
      result = result.filter(m => !hiddenKeywords.some(k => m.title.includes(k)));
    }
    
    if (searchQuery && activeTab !== 'analysis') {
      result = result.filter(m => m.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return result;
  };

  const allMetrics = getCombinedMetrics();

  const sortedMetrics = activeTab === 'monthly' ? (() => {
    const priority = ["売上", "労務費", "売上総利益"];
    const top = allMetrics.filter(m => priority.includes(m.title)).sort((a, b) => priority.indexOf(a.title) - priority.indexOf(b.title));
    const others = allMetrics.filter(m => !priority.includes(m.title));
    return { top, others };
  })() : { top: allMetrics, others: [] };

  const contractList = (() => {
    if (!data || !data.contractYojitsuData) return [];
    const cMap = new Map();
    data.contractYojitsuData.forEach((item: any) => {
      if (!item.title) return;
      const isYosan = item.title.startsWith('予算_');
      const isJisseki = item.title.startsWith('実績_');
      const cleanTitle = item.title.replace('予算_', '').replace('実績_', '');
      
      if (!cMap.has(cleanTitle)) {
        cMap.set(cleanTitle, {
          title: cleanTitle, labels: item.labels || [], actual: new Array((item.labels || []).length).fill(0), forecast: new Array((item.labels || []).length).fill(0)
        });
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
    if (count >= 3) return { cardBorder: 'border-rose-100', bg: 'bg-rose-50', text: 'text-rose-600', meterBorder: 'border-rose-400', icon: <ShieldAlert className="text-rose-500" size={22} /> };
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
        if (!isNaN(rowDate.getTime())) {
          if (!absoluteLastDateMap[name] || rowDate > new Date(absoluteLastDateMap[name])) { absoluteLastDateMap[name] = row.date; }
        }
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

    let result = allCategoryNames.map(name => {
      return { name: name, chaseOn: catMap[name]?.chaseOn || 0, chaseOff: catMap[name]?.chaseOff || 0, total: catMap[name]?.total || 0, lastDate: absoluteLastDateMap[name] || '履歴なし' };
    });
    
    if (searchQuery) result = result.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
    if (result.length === 0) return [{ name: "該当データなし", lastDate: "-", chaseOn: 0, chaseOff: 0, total: 0 }];
    return result;
  })();

  const filteredDxItems = dxItems.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.effect.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredEnvItems = envItems.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.effect.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredHistoryItems = historyItems.filter(item => 
    item.client?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.proposal?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.detail?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartTabAnalysis = async (tabId: string) => {
    setIsTabAnalyzing(prev => ({ ...prev, [tabId]: true }));
    try {
      let payloadItems = [];
      if (tabId === 'dx') payloadItems = filteredDxItems;
      if (tabId === 'env') payloadItems = filteredEnvItems;
      if (tabId === 'history') payloadItems = filteredHistoryItems;
      if (tabId === 'contract') {
        payloadItems = contractList.map(m => {
          const targetIdx = m.labels.findIndex(lbl => String(lbl).replace('月','') === String(contractSelectedMonth));
          return {
            項目: m.title,
            月度: `${contractSelectedMonth}月`,
            実績: targetIdx !== -1 ? m.actual[targetIdx] : 0,
            予算: targetIdx !== -1 ? m.forecast[targetIdx] : 0,
            差異: targetIdx !== -1 ? (n(m.actual[targetIdx]) - n(m.forecast[targetIdx])) : 0
          };
        });
      }

      const res = await fetch('/api/analyze-tab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tabId, items: payloadItems })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'API通信エラー');
      setTabAiAnalysis(prev => ({ ...prev, [tabId]: json.evaluation }));
    } catch (err: any) {
      setTabAiAnalysis(prev => ({ ...prev, [tabId]: `【エラー】${err.message}` }));
    } finally {
      setIsTabAnalyzing(prev => ({ ...prev, [tabId]: false }));
    }
  };

  const getAiCorporateEvaluation = (title: string, actual: number, forecast: number, mode: string, isTotal: boolean, currentRatio: number, rawForecastArray: any[]) => {
    const isLowBetter = lowIsBetterMetrics.some(keyword => title.includes(keyword));
    const ratio = currentRatio;
    const totalMonthForecast = currentMonthIndices.reduce((sum, idx) => sum + n(rawForecastArray[idx]), 0);
    const projectedEndResult = totalMonthForecast * (ratio / 100);
    const deviationAmount = Math.abs(projectedEndResult - totalMonthForecast);
    
    let color = 'text-slate-700 bg-slate-50 border-slate-200'; let icon = <Bot size={18} className="text-slate-500" />;
    let comment = ""; let shortComment = "";

    if (isLowBetter) {
      if (ratio < 99) {
        color = 'text-emerald-700 bg-emerald-50 border-emerald-200'; icon = <ThumbsUp size={18} className="text-emerald-600" />;
        comment = `【経営予測：利益上振れ】『${title}』は見事なコスト抑制に成功しています。この推移を維持できれば当月末枠よりも【${formatVal(deviationAmount, title)}】削減されます。`; 
      } else if (ratio > 101) {
        color = 'text-rose-700 bg-rose-50 border-rose-200'; icon = <ThumbsDown size={18} className="text-rose-600" />;
        comment = `【経営予測：緊急コスト警告】『${title}』が計画比超過推移に突入しています。最終着地が当初計画を【${formatVal(deviationAmount, title)}】オーバーするリスクがあります。`; 
      } else {
        color = 'text-slate-700 bg-slate-50 border-slate-200'; icon = <Bot size={18} className="text-slate-500" />;
        comment = `【経営予測：予算内着地想定】『${title}』は極めて適正かつ計画通りのコントロールが維持されています。`; 
      }
    } else {
      if (ratio > 101) {
        color = 'text-emerald-700 bg-emerald-50 border-emerald-200'; icon = <ThumbsUp size={18} className="text-emerald-600" />;
        comment = `【経営予測：収益ポテンシャル拡大】『${title}』は素晴らしい躍進を遂げています。最終実績は目標値を【${formatVal(deviationAmount, title)}】突破する見込みです。`; 
      } else if (ratio < 99) {
        color = 'text-rose-700 bg-rose-50 border-rose-200'; icon = <ThumbsDown size={18} className="text-rose-600" />;
        comment = `【経営予測：致命的失速アラート】『${title}』に急ブレーキがかかっています。当月最終実績が予算比で【${formatVal(deviationAmount, title)}】下振れ失速するリスクが試算されます。`; 
      } else {
        color = 'text-slate-700 bg-slate-50 border-slate-200'; icon = <Bot size={18} className="text-slate-500" />;
        comment = `【経営予測：計画達成維持】『${title}』は経営計画通りの手堅く堅実な推移を見せています。`; 
      }
    }
    return { color, icon, comment, shortComment, ratio: ratio.toFixed(1) };
  };

  const getAiTabAnalysisData = () => {
    if (!data) return { evaluated: [], goodList: [], badList: [], perfChartData: [], portfolioData: [], allTotalVal: 0 };
    const evaluated = allMetrics.map(m => {
      const isCost = lowIsBetterMetrics.some(k => m.title.includes(k));
      const isAvgMetric = m.title.includes("生産性") || m.title.includes("%") || m.title.includes("率") || m.title.includes("単価") || m.title.includes("時給");
      
      let finalAct = 0; let finalFct = 0;
      if (m.isMonthlyFixed) {
         const mIdx = m.labels.findIndex(l => l !== undefined && l !== null && (String(l) === String(globalSelectedMonth) || String(l) === `${globalSelectedMonth}月`));
         const prevMonthStr = (parseInt(globalSelectedMonth) - 1 || 12).toString();
         const pIdx = m.labels.findIndex(l => l !== undefined && l !== null && (String(l) === prevMonthStr || String(l) === `${prevMonthStr}月`));
         finalAct = mIdx !== -1 ? n(m.actual[mIdx]) : 0;
         finalFct = mIdx !== -1 && n(m.forecast[mIdx]) > 0 ? n(m.forecast[mIdx]) : (pIdx !== -1 ? n(m.actual[pIdx]) : 0);
      } else {
         const acts = currentMonthIndices.map(idx => n(m.actual[idx])); 
         const fcts = currentMonthIndices.map(idx => n(m.forecast[idx])); 
         if (isAvgMetric) {
           const calcAvg = (arr: number[]) => { const v = arr.filter(x => x > 0); return v.length > 0 ? v.reduce((a,b)=>a+b,0)/v.length : 0; };
           finalAct = calcAvg(acts); finalFct = calcAvg(fcts);
         } else {
           finalAct = acts.reduce((a,b)=>a+b,0); finalFct = fcts.reduce((a,b)=>a+b,0);
         }
      }
      
      const ratio = finalFct > 0 ? (finalAct / finalFct) * 100 : (finalAct === 0 ? 100 : 0);
      const score = isCost ? (100 - ratio) : (ratio - 100);
      return { title: m.title, act: finalAct, fct: finalFct, ratio, score, isCost };
    }).filter(m => m.fct > 0 || m.act > 0);

    const goodList = [...evaluated].sort((a,b) => b.score - a.score).filter(m => m.score > 2).slice(0, 3);
    const badList = [...evaluated].sort((a,b) => a.score - b.score).filter(m => m.score < -2).slice(0, 3);
    
    const radarTargets = [
      { keys: ["売上"], exclude: ["利益", "生産"], label: "売上" },
      { keys: ["利益"], exclude: [], label: "利益" },
      { keys: ["労務費"], exclude: [], label: "労務費" },
      { keys: ["生産性"], exclude: [], label: "生産性" }
    ];

    const perfChartData: any[] = [];
    for (const rt of radarTargets) {
      const foundList = evaluated.filter(m => rt.keys.every(k => m.title.includes(k)) && !rt.exclude.some(k => m.title.includes(k)));
      if (foundList.length > 0) {
        const found = foundList[0]; 
        let radarScore = found.isCost ? Math.max(0, 200 - found.ratio) : found.ratio;
        radarScore = Math.min(150, radarScore); 
        perfChartData.push({ name: rt.label, '達成率': Number(found.ratio.toFixed(1)) || 0, radarScore: Number(radarScore.toFixed(1)), isCost: found.isCost });
      } else {
        perfChartData.push({ name: rt.label, '達成率': 0, radarScore: 0, isCost: false });
      }
    }

    const lgData = data.logisticsData || [];
    const monthlyDataList = data.monthlyData || [];
    
    const totalManHourItem = monthlyDataList.find((item: any) => item && item.title && (item.title.includes("月間総工数") || item.title.includes("総工数")));
    let allTotalVal = 0;
    if (totalManHourItem && totalManHourItem.values && totalManHourItem.labels) {
       const mIdx = totalManHourItem.labels.findIndex((l: any) => l !== undefined && l !== null && (String(l) === String(globalSelectedMonth) || String(l) === `${globalSelectedMonth}月`));
       if (mIdx !== -1) allTotalVal = n(totalManHourItem.values[mIdx]);
    }

    const portfolioData: any[] = [];
    let directSumVal = 0;
    const colors = ["#f97316", "#06b6d4", "#8b5cf6", "#10b981", "#e11d48", "#f59e0b", "#3b82f6", "#ec4899"];
    let colorIdx = 0;

    lgData.forEach((item: any) => {
      if (!item || !item.title || !item.values) return;
      const t = item.title.replace('＿', '_');
      if (t.includes("工数") && (t.includes("実績") || (!t.includes("予測") && !t.includes("目標") && !t.includes("予算")))) {
        if (t.includes("総工数") || t.includes("残業") || t.includes("間接") || t.includes("社員")) return;
        
        const cleanName = t.replace("実績_", "").replace("工数", "");
        const val = currentMonthIndices.reduce((sum, idx) => sum + n(item.values[idx]), 0);
        
        if (val > 0) {
          portfolioData.push({
            name: cleanName,
            value: Math.round(val),
            fill: colors[colorIdx % colors.length]
          });
          directSumVal += val;
          colorIdx++;
        }
      }
    });

    let indirectVal = Math.max(0, allTotalVal - directSumVal);
    if (indirectVal > 0 || portfolioData.length === 0) {
      portfolioData.push({ name: '間接工数', value: Math.round(indirectVal), fill: "#64748b" });
    }

    return { evaluated, goodList, badList, perfChartData, portfolioData, allTotalVal: allTotalVal || 0 };
  };

  const handleStartAnalysis = async () => {
    const { evaluated, portfolioData } = getAiTabAnalysisData();
    setIsAnalyzing(true);
    setChappyAnalysis(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: globalSelectedMonth, allMetrics: evaluated, portfolioData })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.summaryMetrics || 'API通信エラー');
      setChappyAnalysis(json);
    } catch (err: any) {
      console.error("AIフェッチエラー:", err);
      setChappyAnalysis({
        summaryMetrics: `【通信エラー】${err.message}`,
        summaryManhours: "APIキーの設定や通信状況を確認してください。",
        summaryPerformance: "-",
        summaryOverall: "通信エラーが発生しました。"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };
// ========== 前半ロジック部分ここまで ==========
// ========== ここから後半（JSX描画部分） ==========
  if (!data || !isMounted) {
    return (
      <div className="h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden notranslate" translate="no">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse" />
        <div className="relative z-10 flex flex-col items-center">
          <div className="bg-white/95 px-6 py-3.5 rounded-2xl mb-8 shadow-[0_0_40px_rgba(59,130,246,0.3)] backdrop-blur-sm border border-white/20">
            <img src="/pal-logo.png" alt="PAL Logo" className="h-8 md:h-10 w-auto object-contain" />
          </div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-[0.3em] mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 text-center px-4">
            PAL Productivity Dashboard
          </h1>
          <div className="w-64 h-1.5 bg-slate-800 rounded-full overflow-hidden mb-6 shadow-inner relative">
            <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full w-1/2 animate-[ping_2s_ease-in-out_infinite]" style={{ animationName: 'loading-slide', animationDuration: '2s', animationIterationCount: 'infinite' }} />
          </div>
          <div className="flex items-center gap-3 text-slate-400">
            <Loader2 className="animate-spin text-blue-500" size={18} />
            <span className="text-[11px] font-bold tracking-widest uppercase">Connecting to Database...</span>
          </div>
        </div>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes loading-slide { 0% { transform: translateX(-100%); width: 50%; } 100% { transform: translateX(250%); width: 50%; } }
        `}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20 notranslate print:bg-white print:pb-0 print:block" translate="no">
      
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          main { zoom: 0.65; }
          .print-avoid-break { page-break-inside: avoid; }
        }
      `}} />

      {/* 🚀 ヘッダー */}
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
        
        {/* 🚀 ヤマナカ しおなぎ生鮮センター に変更 */}
        <div className="text-center w-full md:w-auto order-first md:order-none mb-1 md:mb-0">
          <h1 className="text-base md:text-lg font-black italic tracking-tighter uppercase text-slate-800">経営ダッシュボード : ヤマナカ しおなぎ生鮮センター</h1>
          <p className="text-[8px] md:text-[9px] font-bold text-blue-600 tracking-[0.2em] uppercase mt-0.5">
            {['dx', 'env', 'history', 'accidents', 'analysis', 'contract'].includes(activeTab) ? 'STRATEGIC MANAGEMENT LAYER' : `${displayMode.toUpperCase()} ANALYTICS MODE (${globalSelectedMonth}月)`}
          </p>
        </div>
        
        <div className="flex flex-wrap justify-center gap-2 md:gap-3 items-center w-full md:w-auto">
          <div className="hidden md:flex gap-1 md:gap-2 mr-1">
            <button onClick={handleReloadData} className="p-2 md:px-3 md:py-2 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-lg md:rounded-xl transition-all shadow-sm flex items-center gap-1.5 border border-slate-200">
              <RefreshCw size={13} />
              <span className="hidden md:inline text-[10px] font-black tracking-wider">データ更新</span>
            </button>
            <button onClick={() => window.print()} className="p-2 md:px-3 md:py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg md:rounded-xl transition-all shadow-md flex items-center gap-1.5">
              <Printer size={13} />
              <span className="hidden md:inline text-[10px] font-black tracking-wider">PDF出力</span>
            </button>
          </div>

          <div className="relative flex items-center group w-[48%] md:w-auto">
            <Calendar size={13} className="absolute left-3 text-slate-400 pointer-events-none group-hover:text-blue-500 transition-colors" />
            <select 
              value={globalSelectedMonth}
              onChange={(e) => { setGlobalSelectedMonth(e.target.value); setSelectedWeek(0); }}
              className="w-full md:w-auto appearance-none bg-white md:bg-slate-100 border border-slate-200 text-slate-700 text-[10px] md:text-[11px] font-black pl-8 pr-7 py-2.5 md:py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm md:shadow-none transition-all cursor-pointer"
            >
              {availableMonths.map((m, idx) => (
                <option key={idx} value={m}>{m}月度を表示</option>
              ))}
            </select>
            <ChevronDown size={11} className="absolute right-3 text-slate-400 pointer-events-none" />
          </div>

          {['sales', 'logistics', 'productivity'].includes(activeTab) && (
            <div className="flex bg-white md:bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1 shadow-sm md:shadow-none w-[48%] md:w-auto justify-between">
              <button onClick={() => setDisplayMode('daily')} className={`flex-1 md:flex-none px-2 md:px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${displayMode === 'daily' ? 'bg-slate-900 md:bg-white text-white md:text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>日次</button>
              <button onClick={() => setDisplayMode('weekly')} className={`flex-1 md:flex-none px-2 md:px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${displayMode === 'weekly' ? 'bg-slate-900 md:bg-white text-white md:text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>週次</button>
            </div>
          )}
          {activeTab === 'monthly' && (
            <div className="flex bg-white md:bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1 shadow-sm md:shadow-none w-[48%] md:w-auto justify-between">
              <button disabled className="w-full md:w-auto px-4 py-1.5 rounded-lg text-[10px] font-black transition-all bg-amber-500 text-white shadow-sm cursor-default tracking-widest">月次確定値</button>
            </div>
          )}

          {['dx', 'env', 'history'].includes(activeTab) && (
            <button onClick={handleOpenAddModal} className="hidden md:flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black tracking-wider transition-all shadow-md"><Plus size={14} /> 新規追加</button>
          )}
        </div>
      </header>

      <div className="hidden print:block text-center pt-8 pb-6 border-b-2 border-slate-900 mb-8">
        <h1 className="text-3xl font-black italic tracking-tighter uppercase text-slate-900">経営ダッシュボード : ヤマナカ しおなぎ生鮮センター</h1>
        <p className="text-base font-bold text-blue-600 tracking-[0.2em] uppercase mt-1">
          {['dx', 'env', 'history', 'accidents', 'analysis', 'contract'].includes(activeTab) ? 'STRATEGIC MANAGEMENT LAYER' : `${displayMode.toUpperCase()} ANALYTICS MODE (${globalSelectedMonth}月)`}
        </p>
      </div>
      
      {/* 🚀 メインコンテンツエリア */}
      <main className="p-4 md:p-10 max-w-[1800px] mx-auto space-y-4 md:space-y-6 print:p-0 print:space-y-8">
        
        {/* 上部コントロールパネル */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 print:hidden">
          <div className="flex flex-wrap gap-2">
            {tabs.map((t) => (
              <button key={t.id} onClick={() => handleTabChange(t.id)} className={`px-3 md:px-5 py-2.5 rounded-xl md:rounded-2xl transition-all font-black text-[10px] md:text-xs flex-grow md:flex-grow-0 text-center ${activeTab === t.id ? `bg-slate-900 text-white shadow-lg` : 'bg-white border text-slate-500 hover:bg-slate-50'}`}>{t.label}</button>
            ))}
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
            {['dx', 'env', 'history'].includes(activeTab) && (
              <button 
                onClick={() => setShowHiddenItems(!showHiddenItems)} 
                className={`w-full sm:w-auto whitespace-nowrap shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black border transition-all ${showHiddenItems ? 'bg-amber-50 border-amber-200 text-amber-700 shadow-inner' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                {showHiddenItems ? <EyeOff size={14} /> : <Eye size={14} />} <span>{showHiddenItems ? '非表示項目を隠す' : '非表示項目を表示'}</span>
              </button>
            )}
            <div className="relative w-full sm:w-72 shrink-0">
              <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="項目を絞り込み検索..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white border border-slate-200 text-xs font-bold text-slate-700 pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" />
            </div>
          </div>
        </div>

        {displayMode === 'weekly' && !['dx', 'env', 'history', 'analysis', 'contract'].includes(activeTab) && (
          <div className="bg-white border border-slate-200 p-3 md:p-4 rounded-2xl md:rounded-3xl shadow-sm flex flex-wrap gap-2 items-center print:hidden">
            <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-wider mr-1 md:mr-2 ml-1">月の週選択:</span>
            {weeklyGroups.map((g, idx) => (
              <button key={idx} onClick={() => setSelectedWeek(idx)} className={`px-4 md:px-5 py-2 md:py-2.5 rounded-lg md:rounded-xl font-black text-[10px] md:text-xs transition-all ${selectedWeek === idx ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>{g.label}</button>
            ))}
          </div>
        )}

        {/* 5,6,7,10タブ共通 AI Strategy Insight */}
        {['dx', 'env', 'history', 'contract'].includes(activeTab) && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm flex flex-col md:flex-row items-start gap-3 md:gap-4 mb-2 relative overflow-hidden print-avoid-break print:bg-white print:border-slate-300 print:shadow-none">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/40 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none print:hidden"></div>
            <div className="bg-white p-2.5 md:p-3 rounded-xl md:rounded-2xl shadow-sm shrink-0 relative z-10 hidden md:block print:border"><Bot size={24} className="text-blue-600" /></div>
            <div className="relative z-10 w-full">
              <div className="flex items-center gap-2 mb-3">
                <Bot size={18} className="text-blue-600 md:hidden print:hidden" />
                <h3 className="text-xs md:text-[13px] font-black text-blue-900 tracking-tight">AI Strategy Insight (chatGPT)</h3>
              </div>
              {!tabAiAnalysis[activeTab] && !isTabAnalyzing[activeTab] ? (
                <button onClick={() => handleStartTabAnalysis(activeTab)} className="w-full md:w-auto px-4 md:px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-[11px] md:text-xs shadow-md transition-all flex justify-center items-center gap-2 hover:scale-[1.02] print:hidden">
                  <Zap size={14}/> {currentTab.label} の登録データをAIに診断させる
                </button>
              ) : isTabAnalyzing[activeTab] ? (
                <div className="flex items-center justify-center md:justify-start gap-2 text-blue-600 text-[11px] md:text-xs font-bold animate-pulse py-2 print:hidden">
                  <BrainCircuit size={16} className="animate-spin" /> AIが現場のデータを深層分析中...
                </div>
              ) : (
                <div className="text-[11px] md:text-xs font-bold text-slate-700 leading-relaxed max-w-4xl whitespace-pre-wrap bg-white/60 p-3 md:p-4 rounded-xl border border-white/50 print:bg-white print:border-slate-200 print:text-sm">
                  {tabAiAnalysis[activeTab]}
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================
            【10】請負予実ダッシュボード (0非表示機能搭載)
        ========================================= */}
        {activeTab === 'contract' && (
          <div className="space-y-4 md:space-y-6">
            <div className="border-b border-slate-200 pb-3 md:pb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-3 print:border-slate-300">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 md:gap-3">
                  <FileText className="text-sky-500" size={24} /> 10. 請負予実ダッシュボード
                </h2>
                <p className="text-slate-400 text-xs md:text-sm font-bold mt-1 uppercase tracking-widest">Contract Performance vs Budget</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                <button
                  onClick={() => setHideZeroContracts(!hideZeroContracts)}
                  className={`px-3 py-1.5 md:px-4 md:py-2 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black border transition-all whitespace-nowrap shrink-0 shadow-sm print:hidden ${hideZeroContracts ? 'bg-sky-600 text-white border-sky-700 shadow-inner' : 'bg-white text-sky-600 border-sky-200 hover:bg-sky-50'}`}
                >
                  {hideZeroContracts ? '0の項目を隠す(ON)' : '0の項目も表示'}
                </button>
                
                <div className="flex items-center gap-2 bg-sky-50 border border-sky-100 px-3 py-1.5 md:px-4 md:py-2 rounded-xl md:rounded-2xl print:bg-transparent print:border-none print:p-0">
                  <span className="text-[10px] md:text-xs font-black text-sky-700 print:text-slate-500 whitespace-nowrap shrink-0">請負専用フィルター：</span>
                  <select 
                    value={contractSelectedMonth} 
                    onChange={(e) => setContractSelectedMonth(e.target.value)}
                    className="bg-white border border-sky-200 text-sky-800 text-[10px] md:text-xs font-black px-2 py-1 md:px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer print:appearance-none print:bg-transparent print:border-none print:p-0 print:text-slate-800 print:text-lg"
                  >
                    {contractAvailableMonths.map((m, idx) => (
                      <option key={idx} value={m}>{m}月度 データ</option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="text-sky-400 print:hidden" />
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 md:gap-3 print:grid-cols-8 print:gap-2">
              {contractList.length === 0 && <div className="col-span-full py-10 text-center text-slate-400 font-bold">データがありません。GAS側で「請負予実データを転写」を実行してください。</div>}
              {contractList.map((m, i) => {
                const targetIdx = m.labels.findIndex(lbl => String(lbl).replace('月', '') === String(contractSelectedMonth));
                const actVal = targetIdx !== -1 ? n(m.actual[targetIdx]) : 0;
                const fctVal = targetIdx !== -1 ? n(m.forecast[targetIdx]) : 0;
                
                if (hideZeroContracts && actVal === 0 && fctVal === 0) return null;

                const diffVal = actVal - fctVal;
                const ratioVal = fctVal > 0 ? (actVal / fctVal) * 100 : 0;

                return (
                  <div key={i} className="bg-white border border-slate-200 p-2.5 rounded-xl shadow-sm flex flex-col justify-between gap-1.5 transition-all hover:shadow-md border-t-4 print:break-inside-avoid print:shadow-none print:border-slate-300" style={{ borderTopColor: tabs[9].color }}>
                    <div className="border-b border-slate-100 pb-1">
                      <h4 className="text-[10px] md:text-xs font-black text-slate-800 tracking-tight leading-snug line-clamp-2 min-h-[2.5rem]" title={m.title}>{m.title}</h4>
                    </div>
                    <div className="space-y-1 mt-1">
                      <div className="flex justify-between items-end">
                        <span className="text-[8px] text-slate-400 font-bold">実績</span>
                        <span className="text-xs md:text-sm font-black text-slate-800">{formatVal(actVal, m.title)}</span>
                      </div>
                      <div className="flex justify-between items-end">
                        <span className="text-[8px] text-slate-400 font-bold">予算</span>
                        <span className="text-[9px] md:text-[10px] font-bold text-slate-500">{formatVal(fctVal, m.title)}</span>
                      </div>
                      <div className="flex justify-between items-end border-t border-dashed border-slate-200 pt-1">
                        <span className="text-[8px] text-slate-400 font-bold">差異</span>
                        <span className={`text-[10px] md:text-xs font-black ${diffVal > 0 ? 'text-emerald-600' : diffVal < 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                          {diffVal > 0 ? '+' : ''}{formatVal(diffVal, m.title)}
                        </span>
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-1.5 flex justify-between items-center border border-slate-100 mt-1 print:bg-white print:border-slate-200">
                      <span className="text-[7px] text-slate-400 font-black">達成率</span>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded flex items-center ${ratioVal >= 100 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        {ratioVal > 0 ? `${ratioVal.toFixed(1)}%` : '--%'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =========================================
            【1〜4】売上・物量・生産性・月次グラフ
        ========================================= */}
        {!['dx', 'env', 'history', 'accidents', 'analysis', 'contract'].includes(activeTab) && (
          <div className={`grid grid-cols-1 ${displayMode === 'daily' ? 'lg:grid-cols-2 xl:grid-cols-3' : 'lg:grid-cols-2'} gap-4 md:gap-8 print:grid-cols-2 print:gap-8`}>
            {sortedMetrics.top.length === 0 && <div className="col-span-full py-10 text-center text-slate-400 font-bold">検索条件に一致するグラフがありません。</div>}
            
            {sortedMetrics.top.map((m, i) => {
              const isCost = lowIsBetterMetrics.some(k => m.title.includes(k));
              const isAvgMetric = m.title.includes("生産性") || m.title.includes("%") || m.title.includes("率") || activeTab === 'productivity';
              const isTotalType = totalMetricsKeywords.some(k => m.title.includes(k)) && !isAvgMetric;
              
              const forceTotal = activeTab === 'logistics' && displayMode === 'weekly' && !isAvgMetric;
              const treatAsTotal = isTotalType || forceTotal;

              const weekIdx = weeklyGroups[selectedWeek]?.indices || [];
              let chartData = []; let dispAct = 0; let dispFct = 0;
              const calcAvg = (arr: number[]) => { const valid = arr.filter(v => v > 0); return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : 0; };
              
              if (displayMode === 'daily') {
                chartData = currentMonthIndices.map(idx => ({ name: m.labels[idx], "実績": n(m.actual[idx]), [m.forecastType]: n(m.forecast[idx]) }));
                const today = new Date(); const todayMonth = today.getMonth() + 1; const todayDate = today.getDate();
                const upToTodayIndices = currentMonthIndices.filter(idx => {
                  const label = m.labels[idx]; if (typeof label === 'string' && label.includes('/')) { const p = label.split('/'); const mNum = parseInt(p[0], 10); const dNum = parseInt(p[1], 10); if (mNum < todayMonth) return true; if (mNum === todayMonth && dNum <= todayDate) return true; } return false;
                });
                const targetIndices = upToTodayIndices.length > 0 ? upToTodayIndices : currentMonthIndices;
                const acts = targetIndices.map(idx => n(m.actual[idx])); const fcts = targetIndices.map(idx => n(m.forecast[idx]));
                if (isAvgMetric) { dispAct = calcAvg(acts); dispFct = calcAvg(fcts) || 1; } 
                else { dispAct = acts.reduce((a, b) => a + b, 0); dispFct = fcts.reduce((a, b) => a + b, 0) || 1; }
              } else if (displayMode === 'weekly') {
                chartData = weekIdx.map(idx => ({ name: m.labels[idx], "実績": n(m.actual[idx]), [m.forecastType]: n(m.forecast[idx]) }));
                const acts = weekIdx.map(idx => n(m.actual[idx])); const fcts = weekIdx.map(idx => n(m.forecast[idx]));
                if (isAvgMetric) { dispAct = calcAvg(acts); dispFct = calcAvg(fcts); } 
                else if (treatAsTotal) { dispAct = acts.reduce((a, b) => a + b, 0); dispFct = fcts.reduce((a, b) => a + b, 0); } 
                else { dispAct = calcAvg(acts); dispFct = calcAvg(fcts); }
              } else if (displayMode === 'monthly') {
                chartData = currentMonthIndices.map(idx => ({ name: m.labels[idx], "実績": n(m.actual[idx]), [m.forecastType]: n(m.forecast[idx]) }));
                const acts = currentMonthIndices.map(idx => n(m.actual[idx])); const fcts = currentMonthIndices.map(idx => n(m.forecast[idx]));
                if (isAvgMetric) { dispAct = calcAvg(acts); dispFct = calcAvg(fcts); } 
                else if (isTotalType) { dispAct = acts.reduce((a, b) => a + b, 0); dispFct = fcts.reduce((a, b) => a + b, 0); } 
                else { dispAct = calcAvg(acts); dispFct = calcAvg(fcts); }
              }
              const currentRatio = dispFct > 0 ? (dispAct / dispFct) * 100 : 0;
              const evalData = getAiCorporateEvaluation(m.title, dispAct, dispFct, displayMode, isTotalType, currentRatio, m.forecast);
              const isKousu = m.title.includes('工数');
              const primaryColor = isCost ? '#ef4444' : (isKousu ? '#f472b6' : currentTab.color); const secondaryColor = '#8b5cf6';
              
              return (
                <div key={i} className="print-avoid-break bg-white border border-slate-200 p-4 md:p-8 rounded-3xl shadow-sm flex flex-col gap-4 md:gap-6 min-w-0 overflow-hidden print:shadow-none print:border-slate-300">
                  <div className="flex justify-between items-start border-b border-slate-100 pb-3 md:pb-4 print:border-slate-200">
                    <div>
                      <h4 className="text-sm md:text-lg font-black text-slate-900 tracking-tighter uppercase">{m.title}</h4>
                      <p className="text-[9px] md:text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest">vs {m.forecastType} Matrix</p>
                    </div>
                    {displayMode === 'daily' && (
                      <div className="flex gap-4 md:gap-6 text-right items-center">
                        <div className="border-r pr-3 md:pr-4 border-slate-100 hidden sm:block print:border-slate-200">
                          <p className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase">{globalSelectedMonth}月 本日まで</p>
                          <p className="text-base md:text-xl font-black text-slate-800 tracking-tight">{formatVal(dispAct, m.title)}</p>
                        </div>
                        <div>
                          <p className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase">進捗率</p>
                          <p className={`text-base md:text-xl font-black ${currentRatio >= 101 ? (isCost ? 'text-rose-600' : 'text-emerald-600') : (currentRatio < 99 ? (isCost ? 'text-emerald-600' : 'text-rose-600') : 'text-slate-600')}`}>{currentRatio.toFixed(1)}%</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className={displayMode !== 'daily' ? 'flex flex-col xl:flex-row gap-4 items-stretch min-w-0 print:flex-col print:gap-4' : 'w-full min-w-0'}>
                    <div className="flex-1 h-[180px] md:h-[260px] bg-slate-50/50 p-2 md:p-4 rounded-2xl border border-slate-100 min-w-0 print:h-[220px] print:bg-white print:border-slate-200">
                      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id={`colorAct-${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={primaryColor} stopOpacity={0.4}/><stop offset="95%" stopColor={primaryColor} stopOpacity={0}/></linearGradient>
                            <linearGradient id={`colorFct-${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={secondaryColor} stopOpacity={0.15}/><stop offset="95%" stopColor={secondaryColor} stopOpacity={0}/></linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                          <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} axisLine={false} tickLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={9} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', fontSize: '11px' }} />
                          <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '9px', fontBold: true, paddingBottom: '10px' }} />
                          <Area type="monotone" name="実績" dataKey="実績" stroke={primaryColor} strokeWidth={3} fillOpacity={1} fill={`url(#colorAct-${i})`} activeDot={{ r: 5 }} />
                          <Area type="monotone" name={m.forecastType} dataKey={m.forecastType} stroke={secondaryColor} strokeWidth={2} strokeDasharray="5 5" fillOpacity={1} fill={`url(#colorFct-${i})`} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    
                    {displayMode !== 'daily' && (
                      <div className="w-full xl:w-[220px] 2xl:w-[260px] shrink-0 bg-slate-900 text-white p-4 md:p-5 rounded-2xl shadow-inner flex flex-col justify-between print:w-full print:bg-slate-50 print:border print:border-slate-200 print:text-slate-800 print:shadow-none">
                        <div className="border-b border-slate-800 print:border-slate-200 pb-2"><p className="text-[9px] md:text-[10px] font-black tracking-widest text-blue-400 print:text-blue-600 uppercase">当{displayMode === 'weekly' ? '週' : '月'}{treatAsTotal ? '合計' : '平均'}確認</p></div>
                        <div className="space-y-2 md:space-y-4 my-2 md:my-auto">
                          <div className="flex justify-between items-baseline"><span className="text-[10px] md:text-xs font-bold text-slate-400 print:text-slate-500">{treatAsTotal ? `${displayMode === 'weekly' ? '合計実績' : '当月合計実績'}` : '平均実績'}</span><span className="text-lg md:text-xl 2xl:text-2xl font-black text-white print:text-slate-900">{formatVal(dispAct, m.title)}</span></div>
                          <div className="flex justify-between items-baseline"><span className="text-[10px] md:text-xs font-bold text-slate-400 print:text-slate-500">{treatAsTotal ? `${displayMode === 'weekly' ? '合計' : '当月合計'}${m.forecastType}` : `平均${m.forecastType}`}</span><span className="text-base md:text-lg 2xl:text-xl font-bold text-slate-300 print:text-slate-600">{formatVal(dispFct, m.title)}</span></div>
                          <div className="flex justify-between items-baseline border-t border-slate-800 print:border-slate-200 pt-2"><span className="text-[10px] md:text-xs font-black text-blue-400 print:text-blue-600">達成率</span><span className={`text-xl md:text-2xl 2xl:text-3xl font-black ${currentRatio >= 101 ? (isCost ? 'text-rose-400 print:text-rose-600' : 'text-emerald-400 print:text-emerald-600') : (currentRatio < 99 ? (isCost ? 'text-emerald-400 print:text-emerald-600' : 'text-rose-400 print:text-rose-600') : 'text-slate-300 print:text-slate-700')}`}>{currentRatio.toFixed(1)}%</span></div>
                        </div>
                      </div>
                    )}
                  </div>
                  {(displayMode === 'weekly' || displayMode === 'monthly') && (
                    <div className={`p-3 md:p-4 rounded-xl border text-[9px] md:text-xs font-medium flex items-start gap-2 shadow-sm leading-relaxed ${evalData.color} print:bg-white print:border-slate-200 print:text-slate-700`}><div className="p-1.5 bg-white rounded-lg shadow-sm shrink-0 flex items-center justify-center print:border">{evalData.icon}</div><p className="mt-0.5">{evalData.comment}</p></div>
                  )}
                </div>
              );
            })}
            
            {/* 月次タブのその他項目（Compact View） */}
            {activeTab === 'monthly' && sortedMetrics.others.length > 0 && (
              <div className="col-span-full space-y-4 md:space-y-6 pt-6 md:pt-8 border-t-2 border-dashed border-slate-200 print:pt-6 print:mt-4 print:break-inside-avoid">
                <h3 className="text-lg md:text-xl font-black text-slate-400 border-l-4 border-slate-300 pl-3 md:pl-4 tracking-tighter">その他 運営指標 (Compact View)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 print:grid-cols-2">
                  {sortedMetrics.others.map((m, i) => {
                    const monthlyLowerIsBetter = ['事故件数（流通）', '事故金額', '労災件数', '社員残業工数', 'スタッフ残業工数', 'スタッフ使用工数', '社員工数', '一般スタッフ採用時給', 'タイミー使用工数', '36協定違反者数', '事故', '総工数', '工数'];
                    const monthlyDisplayOnly = ['社員人数', 'スタッフ在籍者数', '最低賃金'];
                    const isMonthlyFixed = m.labels && m.labels.length > 0 && !String(m.labels[0]).includes('/');
                    
                    const isCost = lowIsBetterMetrics.some(k => m.title.includes(k)) || monthlyLowerIsBetter.some(k => m.title.includes(k)) || m.title.includes("工数");

                    let dispAct = 0; let prevVal = 0; let dispFct = 0;
                    if (isMonthlyFixed) {
                      const mIdx = m.labels.findIndex(l => l !== undefined && l !== null && (String(l) === String(globalSelectedMonth) || String(l) === `${globalSelectedMonth}月`));
                      const prevMonthStr = (parseInt(globalSelectedMonth) - 1 || 12).toString();
                      const pIdx = m.labels.findIndex(l => l !== undefined && l !== null && (String(l) === prevMonthStr || String(l) === `${prevMonthStr}月`));
                      dispAct = mIdx !== -1 ? n(m.actual[mIdx]) : 0; prevVal = pIdx !== -1 ? n(m.actual[pIdx]) : 0; dispFct = prevVal; 
                    } else {
                      const acts = currentMonthIndices.map(idx => n(m.actual[idx])); const fcts = currentMonthIndices.map(idx => n(m.forecast[idx]));
                      const calcAvg = (arr: number[]) => { const valid = arr.filter(v => v > 0); return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : 0; };
                      if (m.title.includes("生産性") || m.title.includes("%") || m.title.includes("率")) { dispAct = calcAvg(acts); dispFct = calcAvg(fcts); } 
                      else { dispAct = acts.reduce((a, b) => a + b, 0); dispFct = fcts.reduce((a, b) => a + b, 0); }
                    }
                    const currentRatio = dispFct > 0 ? (dispAct / dispFct) * 100 : (dispAct === 0 ? 100 : 0);

                    const evalData = (() => {
                      let shortComment = "";
                      if (isMonthlyFixed) {
                        if (monthlyDisplayOnly.some(k => m.title.includes(k))) shortComment = "月次モニタリング指標として記録されています。";
                        else if (isCost) {
                            if (prevVal > 0 && dispAct < prevVal) shortComment = `前月（${formatVal(prevVal, m.title)}）から減少し、改善傾向にあります。`;
                            else if (prevVal > 0 && dispAct > prevVal) shortComment = `前月（${formatVal(prevVal, m.title)}）から増加・悪化しています。`;
                            else shortComment = prevVal > 0 ? `前月（${formatVal(prevVal, m.title)}）と同水準を維持しています。` : "当月データのみ登録されています。";
                        } else {
                            if (prevVal > 0 && dispAct > prevVal) shortComment = `前月（${formatVal(prevVal, m.title)}）から増加・良化しています。`;
                            else if (prevVal > 0 && dispAct < prevVal) shortComment = `前月（${formatVal(prevVal, m.title)}）から減少・悪化しています。`;
                            else shortComment = prevVal > 0 ? `前月（${formatVal(prevVal, m.title)}）と同水準を維持しています。` : "当月データのみ登録されています。";
                        }
                      } else {
                        if (isCost) {
                          if (currentRatio < 99) shortComment = "管理コスト・工数は想定以上に良好です。現体制の効率化を推奨。";
                          else if (currentRatio > 101) shortComment = "警告：予算超過ペース。直ちに配置構成の見直しが必要です。";
                          else shortComment = "計画通り順調な推移です。現状の管理を維持してください。";
                        } else {
                          if (currentRatio > 101) shortComment = "業績好調。数値が目標を突破し、限界利益の押し上げに貢献しています。";
                          else if (currentRatio < 99) shortComment = "失速アラート。目標値に対し下振れ傾向。早急な原因分析を求む。";
                          else shortComment = "手堅い計画達成ペース。着実なオペレーション管理が行われています。";
                        }
                      }
                      return { shortComment };
                    })();

                    let evalColor = 'bg-slate-50 border-slate-100 text-slate-500'; let evalIcon = <Bot size={14} className="text-blue-500 shrink-0" />;
                    let badgeColor = 'bg-slate-50 text-slate-500'; let badgeText = prevVal > 0 ? `${((dispAct / prevVal) * 100).toFixed(1)}%` : "前月比 --%";

                    if (isMonthlyFixed) {
                        const ratio = prevVal > 0 ? (dispAct / prevVal) * 100 : 0;
                        badgeText = prevVal > 0 ? `${ratio.toFixed(1)}%` : "前月データなし";
                        if (monthlyDisplayOnly.some(k => m.title.includes(k)) || prevVal === 0) {
                            badgeColor = 'bg-slate-100 text-slate-500';
                        } else if (isCost) {
                            if (dispAct < prevVal) { evalColor = 'bg-emerald-50/80 border-emerald-100 text-emerald-700'; evalIcon = <ThumbsUp size={14} className="text-emerald-500 shrink-0" />; badgeColor = 'bg-emerald-50 text-emerald-600'; } 
                            else { evalColor = 'bg-rose-50/80 border-rose-100 text-rose-700'; evalIcon = <ThumbsDown size={14} className="text-rose-500 shrink-0" />; badgeColor = 'bg-rose-50 text-rose-600'; } 
                        } else {
                            if (dispAct > prevVal) { evalColor = 'bg-emerald-50/80 border-emerald-100 text-emerald-700'; evalIcon = <ThumbsUp size={14} className="text-emerald-500 shrink-0" />; badgeColor = 'bg-emerald-50 text-emerald-600'; } 
                            else { evalColor = 'bg-rose-50/80 border-rose-100 text-rose-700'; evalIcon = <ThumbsDown size={14} className="text-rose-500 shrink-0" />; badgeColor = 'bg-rose-50 text-rose-600'; } 
                        }
                    } else {
                       const ratio = dispFct > 0 ? (dispAct/dispFct)*100 : 0;
                       badgeText = dispFct > 0 ? `${ratio.toFixed(1)}%` : "確定実績";
                    }

                    return (
                      <div key={i} className="bg-white border border-slate-200 p-4 md:p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-3 print:shadow-none print:border-slate-300 print:break-inside-avoid">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{m.title}</p>
                            <p className="text-base font-black text-slate-800 tracking-tighter mt-1">{formatVal(dispAct, m.title)}</p>
                          </div>
                          <div className="text-right">
                            {isMonthlyFixed ? (
                                <p className="text-[9px] md:text-[10px] font-bold text-slate-400">前月比</p>
                            ) : (
                                dispFct > 0 && <p className="text-[9px] md:text-[10px] font-bold text-slate-400">{m.forecastType}: {formatVal(dispFct, m.title)}</p>
                            )}
                            <div className={`mt-1 px-2 py-0.5 rounded text-[10px] font-black ${badgeColor}`}>{badgeText}</div>
                          </div>
                        </div>
                        <div className={`rounded-xl p-2.5 text-[9px] md:text-[10px] font-medium flex items-center gap-2 transition-colors ${evalColor}`}>
                          {evalIcon}
                          <p className="line-clamp-2 leading-relaxed">{evalData.shortComment}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 🚀 5,6. DX推進・現場改善タブ */}
        {['dx', 'env'].includes(activeTab) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8 print:grid-cols-2">
            {(() => {
              const currentItems = activeTab === 'dx' ? filteredDxItems : filteredEnvItems;
              const targetTable = activeTab === 'dx' ? 'dx_actions' : 'env_actions';
              const displayItems = showHiddenItems ? currentItems : currentItems.filter((item: any) => !item.is_hidden);
              
              if (displayItems.length === 0) return <div className="col-span-1 lg:col-span-2 bg-white border p-8 md:p-12 rounded-2xl md:rounded-[2.5rem] text-center text-slate-400 font-bold text-xs md:text-sm">💡 該当する項目がありません。</div>;
              
              return displayItems.map((item, index) => {
                const itemRatio = Math.min(100, Math.max(0, Math.round(n(item.ratio))));
                const chartPieData = [{ name: '完了', value: itemRatio }, { name: '未完了', value: 100 - itemRatio }];
                const themeColor = currentTab.color;
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
                      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
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

        {/* 🚀 7. 営業履歴タブ */}
        {activeTab === 'history' && (
          <div className="bg-white border border-slate-200 p-4 md:p-8 rounded-3xl shadow-sm space-y-4 md:space-y-6 print:shadow-none print:border-none print:p-0">
            <div className="border-b border-slate-100 pb-3 md:pb-4">
              <h2 className="text-base md:text-lg font-black text-slate-900 tracking-tighter flex items-center gap-2"><MessageSquare className="text-rose-600" size={18} /> 営業アプローチ履歴</h2>
            </div>
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

                if (displayHistory.length === 0) return <div className="col-span-1 lg:col-span-2 text-slate-400 text-[11px] md:text-sm font-bold pl-2 py-4">💡 該当する商談ログがありません。</div>;

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
                      <div className="bg-white border-2 border-rose-500 p-1 md:p-1.5 rounded-full text-rose-500 shrink-0"><Building2 size={10} className="md:w-3 md:h-3" /></div>
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

        {/* 🚀 8. 事故管理タブ */}
        {activeTab === 'accidents' && (
          <div className="space-y-6 md:space-y-8">
            <div className="border-b border-slate-200 pb-3 md:pb-4">
              <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 md:gap-3"><AccidentIcon className="text-amber-500" size={24} /> カテゴリ別 事故件数 ({globalSelectedMonth}月度)</h2>
              <p className="text-slate-400 text-xs md:text-sm font-bold mt-1 uppercase tracking-widest">Category-wise Safety Performance</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 print:grid-cols-2 print:gap-6">
              {accidentCategories.length === 0 && <div className="col-span-full py-10 text-center text-slate-400 font-bold">検索条件に一致するデータがありません。</div>}
              {accidentCategories.map((cat, i) => {
                const styles = getLevelStyles(cat.total); const daysSince = calculateDaysSince(cat.lastDate);
                return (
                  <div key={i} className={`print-avoid-break bg-white border-2 ${styles.cardBorder} p-5 md:p-6 rounded-3xl md:rounded-[2rem] shadow-sm relative transition-all flex flex-col justify-between print:shadow-none`}>
                    <div className="flex justify-between items-start mb-5 md:mb-6">
                      <div className="flex items-center gap-2">
                        {styles.icon} <h3 className="text-base md:text-xl font-black text-slate-800">{cat.name}</h3>
                      </div>
                      <div className="bg-slate-900 text-white px-3 md:px-4 py-1.5 rounded-xl md:rounded-2xl flex items-center gap-1.5 md:gap-2 shadow-md print:shadow-none print:border print:bg-white print:text-slate-800">
                        <span className="text-[8px] md:text-[10px] font-bold text-blue-400 tracking-wider print:text-blue-600">無事故</span>
                        <span className="text-lg md:text-2xl font-black italic tracking-tighter"><AnimatedNumber value={daysSince} /></span>
                        <span className="text-[8px] md:text-[10px] font-bold">DAYS</span>
                      </div>
                    </div>
                    <div className="flex justify-center mb-6 md:mb-8 relative">
                      <div className={`w-32 h-32 md:w-48 md:h-48 rounded-full border-8 md:border-[16px] flex flex-col items-center justify-center bg-white shadow-inner z-10 relative ${styles.meterBorder} ${styles.text}`}>
                        <span className="text-[9px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-[-2px] md:mb-[-5px]">当月事故</span>
                        <span className="text-5xl md:text-7xl font-black tracking-tighter"><AnimatedNumber value={cat.total} /></span>
                      </div>
                    </div>
                    <div className="flex justify-center gap-2 md:gap-4 text-[10px] md:text-sm font-bold">
                      <div className="flex-1 flex flex-col items-center justify-center p-2.5 md:p-4 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
                        <span className="text-[8px] md:text-[10px] uppercase tracking-wider mb-1">追走あり</span>
                        <div className="flex items-baseline gap-1"><span className="text-xl md:text-3xl font-black"><AnimatedNumber value={cat.chaseOn}/></span><span className="text-[10px] md:text-xs">件</span></div>
                      </div>
                      <div className="flex-1 flex flex-col items-center justify-center p-2.5 md:p-4 bg-slate-50 text-slate-500 rounded-xl border border-slate-200">
                        <span className="text-[8px] md:text-[10px] uppercase tracking-wider mb-1">追走なし</span>
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

        {/* 🚀 9. 総合AI分析タブ */}
        {activeTab === 'analysis' && (
          <div className="space-y-4 md:space-y-6 print:space-y-8">
            <div className="bg-slate-900 border border-slate-800 p-5 md:p-10 rounded-3xl md:rounded-[2.5rem] shadow-2xl relative overflow-hidden print:bg-white print:border-none print:shadow-none print:p-0">
              <div className="absolute top-0 right-0 w-64 h-64 md:w-96 md:h-96 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none print:hidden"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 md:w-96 md:h-96 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none print:hidden"></div>
              
              <div className="relative z-10 border-b border-slate-800 pb-4 md:pb-6 mb-6 md:mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 print:border-slate-300">
                <div>
                  <h2 className="text-xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2 md:gap-3 print:text-slate-900">
                    <BrainCircuit className="text-blue-400 print:text-blue-600" size={28} /> 
                    AI診断結果 (chatGPT)
                  </h2>
                  <p className="text-blue-300/60 text-[10px] md:text-sm font-bold mt-1 md:mt-2 uppercase tracking-widest print:text-slate-500">Executive AI Analysis & Predictive Insights</p>
                </div>
                <div className="text-left md:text-right w-full md:w-auto print:hidden">
                  <span className={`inline-block border px-3 md:px-4 py-1.5 rounded-full text-[10px] md:text-xs font-black tracking-wider w-full md:w-auto text-center ${isAnalyzing ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse' : (chappyAnalysis ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-blue-500/20 text-blue-300 border-blue-500/30')}`}>
                    {isAnalyzing ? 'CHAPPY THINKING...' : (chappyAnalysis ? 'OPENAI CONNECTED' : 'READY TO ANALYZE')}
                  </span>
                </div>
              </div>

              {(() => {
                const { goodList, badList, perfChartData, portfolioData, allTotalVal } = getAiTabAnalysisData();
                return (
                  <div className="space-y-6 md:space-y-10 relative z-10 min-w-0 print:space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 min-w-0 print:grid-cols-3">
                      <div className="lg:col-span-2 bg-slate-800/40 border border-slate-700 p-5 md:p-8 rounded-2xl md:rounded-3xl min-w-0 print:col-span-2 print:bg-slate-50 print:border-slate-200">
                        <div className="flex justify-between items-center mb-4 md:mb-6">
                          <h3 className="text-white font-black text-sm md:text-lg tracking-tight flex items-center gap-2 print:text-slate-800"><TrendingUp className="text-emerald-400 print:text-emerald-600" size={18}/> 主要指標 予測達成率 (%)</h3>
                          <span className="text-[9px] md:text-[10px] text-slate-500 font-bold uppercase tracking-widest">vs Goals</span>
                        </div>
                        <div className="h-[200px] md:h-[260px] min-w-0 print:h-[280px]">
                          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <ComposedChart data={perfChartData.slice(0, 5)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                              <XAxis dataKey="name" stroke="#64748b" fontSize={11} axisLine={false} tickLine={false} />
                              <YAxis stroke="#64748b" fontSize={11} axisLine={false} tickLine={false} domain={[0, 140]} unit="%"/>
                              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#1f2937', color: 'white', fontSize: '12px' }} cursor={{fill: '#2c3e50', opacity: 0.1}}/>
                              <Bar name="達成率 (%)" dataKey="達成率" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                 {perfChartData.slice(0, 5).map((entry, index) => {
                                    const val = entry['達成率'];
                                    let barFill = '#3b82f6';
                                    if (entry.isCost) { barFill = val <= 100 ? '#22c55e' : (val > 105 ? '#ef4444' : '#f59e0b'); } 
                                    else { barFill = val >= 100 ? '#22c55e' : (val < 95 ? '#ef4444' : '#f59e0b'); }
                                    return <Cell key={index} fill={barFill} />;
                                 })}
                              </Bar>
                              <ReferenceLine y={100} stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" label={{ value: '100%', fill: '#8b5cf6', fontSize: 10, position: 'insideTopLeft', fontWeight: 'bold' }} />
                            </ComposedChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="bg-slate-800/40 border border-slate-700 p-5 md:p-8 rounded-2xl md:rounded-3xl min-w-0 print:col-span-1 print:bg-slate-50 print:border-slate-200">
                        <div className="flex justify-between items-center mb-1">
                          <h3 className="text-white font-black text-sm md:text-lg tracking-tight flex items-center gap-2 print:text-slate-800"><Clock className="text-slate-400" size={18}/> 月間工数内訳</h3>
                        </div>
                        <div className="h-[180px] md:h-[240px] min-w-0 relative print:h-[260px]">
                          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <PieChart>
                              <Pie data={portfolioData} cx="50%" cy="50%" innerRadius="65%" outerRadius="85%" paddingAngle={3} dataKey="value" cornerRadius={6}>
                                {portfolioData.map((entry, index) => <Cell key={index} fill={entry.fill} stroke="none"/>)}
                              </Pie>
                              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#1f2937', color: 'white', fontSize: '12px' }} formatter={(value) => { const pct = allTotalVal > 0 ? ((value / allTotalVal) * 100).toFixed(1) : 0; return [`${value.toLocaleString()} H (${pct}%)`, '工数']; }} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-1">
                            <span className="text-xl md:text-3xl font-black text-white tracking-tighter print:text-slate-800"><AnimatedNumber value={allTotalVal} /></span>
                            <span className="text-[8px] md:text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 md:mt-1">Total Hours</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-x-1.5 gap-y-1.5 justify-center mt-2 relative z-10">
                           {portfolioData.map(d => {
                             const pct = allTotalVal > 0 ? ((d.value / allTotalVal) * 100).toFixed(1) : 0;
                             return (
                               <div key={d.name} className="flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 md:py-1 rounded-md md:rounded-lg border border-slate-700 shadow-sm print:bg-white print:border-slate-300">
                                 <div className="w-2 h-2 rounded-full" style={{backgroundColor: d.fill}}/>
                                 <span className="text-slate-300 text-[9px] md:text-[10px] font-bold print:text-slate-700">{d.name}</span>
                                 <span className="text-white text-[10px] md:text-[11px] font-black ml-0.5 md:ml-1 print:text-slate-900">{pct}%</span>
                               </div>
                             );
                           })}
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-800/50 border border-slate-700 p-5 md:p-8 rounded-2xl md:rounded-3xl relative overflow-hidden print:bg-white print:border-slate-300">
                       <div className="absolute top-0 right-0 bg-blue-500/10 px-3 md:px-4 py-1 text-[8px] md:text-[9px] font-black tracking-widest uppercase rounded-bl-xl md:rounded-bl-2xl text-blue-300 print:text-blue-600">OpenAI Completions</div>
                       <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
                         <div className="bg-white p-2 md:p-2.5 rounded-xl md:rounded-2xl shadow-xl shrink-0 print:border"><BrainCircuit size={20} className="text-blue-600" /></div>
                         <h3 className="text-base md:text-lg font-black text-white tracking-tight print:text-slate-800">AI診断結果 (chatGPT)</h3>
                       </div>

                       {!chappyAnalysis && !isAnalyzing ? (
                          <div className="flex flex-col items-center justify-center py-8 md:py-10 border-2 border-dashed border-slate-700 rounded-xl md:rounded-2xl bg-slate-900/50 px-4 print:hidden">
                            <Bot size={40} className="text-slate-600 mb-3 md:mb-4" />
                            <p className="text-slate-300 font-bold text-xs md:text-sm mb-4 md:mb-6 text-center leading-relaxed">最新の全指標データに基づくAI経営分析を生成します。</p>
                            <button onClick={handleStartAnalysis} className="w-full md:w-auto px-6 md:px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-black tracking-widest shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all flex justify-center items-center gap-2 hover:scale-105"><Zap size={16} />AI診断をスタート</button>
                          </div>
                       ) : isAnalyzing ? (
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 animate-pulse print:hidden">
                            {[1, 2, 3].map(i => (
                              <div key={i} className="bg-slate-900/30 border border-slate-800 p-4 md:p-5 rounded-xl md:rounded-2xl space-y-3">
                                <div className="h-3 md:h-4 bg-slate-700 rounded-md w-1/3"></div>
                                <div className="space-y-2"><div className="h-2.5 md:h-3 bg-slate-800 rounded-md w-full"></div><div className="h-2.5 md:h-3 bg-slate-800 rounded-md w-full"></div></div>
                              </div>
                            ))}
                          </div>
                       ) : (
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 print:grid-cols-3 print:gap-6">
                            <div className="bg-slate-900/50 border border-slate-700 p-4 md:p-6 rounded-xl md:rounded-2xl print:bg-slate-50 print:border-slate-200">
                              <h4 className="flex items-center gap-2 text-sm md:text-base font-black text-emerald-400 mb-2 md:mb-4 print:text-emerald-600"><BarChart3 size={16}/> 1. 主要・コスト指標 評価</h4>
                              <p className="text-slate-300 text-[11px] md:text-[13px] leading-loose font-medium print:text-slate-700">{chappyAnalysis.summaryMetrics}</p>
                            </div>
                            <div className="bg-slate-900/50 border border-slate-700 p-4 md:p-6 rounded-xl md:rounded-2xl print:bg-slate-50 print:border-slate-200">
                              <h4 className="flex items-center gap-2 text-sm md:text-base font-black text-amber-400 mb-2 md:mb-4 print:text-amber-600"><PieChartIcon size={16}/> 2. 工数内訳 評価</h4>
                              <p className="text-slate-300 text-[11px] md:text-[13px] leading-loose font-medium print:text-slate-700">{chappyAnalysis.summaryManhours}</p>
                            </div>
                            <div className="bg-slate-900/50 border border-slate-700 p-4 md:p-6 rounded-xl md:rounded-2xl print:bg-slate-50 print:border-slate-200">
                              <h4 className="flex items-center gap-2 text-sm md:text-base font-black text-purple-400 mb-2 md:mb-4 print:text-purple-600"><ActivitySquare size={16}/> 3. パフォーマンス 評価</h4>
                              <p className="text-slate-300 text-[11px] md:text-[13px] leading-loose font-medium print:text-slate-700">{chappyAnalysis.summaryPerformance}</p>
                            </div>
                          </div>
                       )}
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8 print:grid-cols-2 print:break-inside-avoid">
                      <div className="bg-emerald-950/20 border border-emerald-900/50 p-5 md:p-8 rounded-2xl md:rounded-[2rem] print:bg-emerald-50 print:border-emerald-200">
                        <h3 className="text-emerald-400 font-black text-sm md:text-lg flex items-center gap-2 mb-4 md:mb-6 print:text-emerald-600"><ThumbsUp size={20} /> 優秀パフォーマンス指標 (Goal Achieved)</h3>
                        <div className="space-y-3 md:space-y-4">
                          {goodList.length === 0 ? <p className="text-slate-500 text-xs md:text-sm font-bold">目立った上振れ指標は現在ありません。</p> : goodList.map((m, i) => (
                            <div key={i} className="bg-slate-900/50 border border-slate-800 p-4 md:p-5 rounded-xl md:rounded-2xl flex justify-between items-center group hover:border-emerald-800 transition-colors print:bg-white print:border-slate-200">
                              <div>
                                <p className="text-[10px] md:text-xs text-slate-400 font-bold mb-0.5 md:mb-1">{m.title}</p>
                                <p className="text-lg md:text-xl text-emerald-300 font-black tracking-tight print:text-emerald-600">{formatVal(m.act, m.title)}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[9px] md:text-[10px] text-slate-500 mb-1">目標: {formatVal(m.fct, m.title)}</p>
                                <span className="inline-block bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 md:px-3 py-0.5 md:py-1 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black print:bg-emerald-100 print:text-emerald-700">
                                  {m.isCost ? `コスト ${(100-m.ratio).toFixed(1)}% 削減` : `目標比 ${m.ratio.toFixed(1)}%`}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-rose-950/20 border border-rose-900/50 p-5 md:p-8 rounded-2xl md:rounded-[2rem] print:bg-rose-50 print:border-rose-200">
                        <h3 className="text-rose-400 font-black text-sm md:text-lg flex items-center gap-2 mb-4 md:mb-6 print:text-rose-600"><AlertTriangle size={20} /> リスク・悪化指標 (Underperformed)</h3>
                        <div className="space-y-3 md:space-y-4">
                          {badList.length === 0 ? <p className="text-slate-500 text-xs md:text-sm font-bold">現在警告を出すべき悪化指標はありません。</p> : badList.map((m, i) => (
                            <div key={i} className="bg-slate-900/50 border border-slate-800 p-4 md:p-5 rounded-xl md:rounded-2xl flex justify-between items-center group hover:border-rose-800 transition-colors print:bg-white print:border-slate-200">
                              <div>
                                <p className="text-[10px] md:text-xs text-slate-400 font-bold mb-0.5 md:mb-1">{m.title}</p>
                                <p className="text-lg md:text-xl text-rose-300 font-black tracking-tight print:text-rose-600">{formatVal(m.act, m.title)}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[9px] md:text-[10px] text-slate-500 mb-1">目標: {formatVal(m.fct, m.title)}</p>
                                <span className="inline-block bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 md:px-3 py-0.5 md:py-1 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black print:bg-rose-100 print:text-rose-700">
                                  {m.isCost ? `コスト ${(m.ratio - 100).toFixed(1)}% 超過` : `未達 ${(100 - m.ratio).toFixed(1)}%`}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 mt-6 md:mt-8 print:grid-cols-3 print:break-inside-avoid">
                        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-5 md:p-8 rounded-2xl md:rounded-[2rem] flex flex-col justify-center shadow-xl print:col-span-2 print:bg-slate-50 print:border-slate-200 print:shadow-none">
                            <h3 className="text-lg md:text-xl font-black text-white mb-3 md:mb-4 flex items-center gap-2 print:text-slate-800">
                                <Bot size={24} className="text-blue-400 print:text-blue-600" />
                                総合評価（エグゼクティブ・サマリー）
                            </h3>
                            <p className="text-slate-300 text-xs md:text-sm leading-loose font-medium whitespace-pre-wrap print:text-slate-700">
                                {isAnalyzing ? (
                                    <span className="animate-pulse">ダッシュボード全体の全指標をスキャンしてAI総合評価を生成中...</span>
                                ) : (
                                    chappyAnalysis?.summaryOverall || "AI診断をスタートすると、ここにダッシュボード全体の総括と次月の戦略案が表示されます。"
                                )}
                            </p>
                        </div>
                        <div className="bg-slate-800/40 border border-slate-700 p-5 md:p-6 rounded-2xl md:rounded-[2rem] flex flex-col items-center justify-center print:col-span-1 print:bg-white print:border-slate-200">
                            <h4 className="text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-widest mb-2 print:text-slate-500">Performance Radar</h4>
                            <div className="w-full h-[180px] md:h-[240px] print:h-[260px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="60%" data={perfChartData}>
                                        <PolarGrid stroke="#cbd5e1" />
                                        <PolarAngleAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 'bold' }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
                                        <Radar name="評価スコア" dataKey="radarScore" stroke="#8b5cf6" strokeWidth={2} fill="#8b5cf6" fillOpacity={0.4} />
                                        <Tooltip 
                                          contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#1f2937', color: 'white', fontSize: '12px' }} 
                                          formatter={(value, name, props) => {
                                            const originalTitle = props.payload.isCost ? "(コスト抑制スコア)" : "(vs目標達成率)";
                                            return [`${props.payload['達成率']}%`, originalTitle];
                                          }} 
                                        />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                  </div>
                );
              })()}
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
              <h3 className="text-sm md:text-base font-black text-slate-900">【{tabs.find(t=>t.id===activeTab)?.label}】データの{editingIndex !== null ? '編集上書き' : '新規追加'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-900 bg-slate-100 p-1.5 rounded-full"><X size={16} /></button>
            </div>
            {activeTab === 'history' ? (
              <div className="space-y-3 md:space-y-4 text-[11px] md:text-xs font-bold text-slate-700">
                <div className="space-y-1"><label className="text-slate-400">1. 日付 *必須</label><input type="date" value={newItem.startDate} onChange={(e) => setNewItem({...newItem, startDate: e.target.value})} className="w-full bg-slate-50 border rounded-xl px-3 md:px-4 py-2.5 md:py-3 font-semibold text-slate-900" /></div>
                <div className="space-y-1"><label className="text-slate-400">2. 誰に *必須</label><input type="text" value={newItem.client} onChange={(e) => setNewItem({...newItem, client: e.target.value})} className="w-full bg-slate-50 border rounded-xl px-3 md:px-4 py-2.5 md:py-3 font-semibold text-slate-900" /></div>
                <div className="space-y-1"><label className="text-slate-400">3. 何を *必須</label><input type="text" value={newItem.proposal} onChange={(e) => setNewItem({...newItem, proposal: e.target.value})} className="w-full bg-slate-50 border rounded-xl px-3 md:px-4 py-2.5 md:py-3 font-semibold text-slate-900" /></div>
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