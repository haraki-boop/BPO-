// @ts-nocheck
'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { MapPin, Navigation, ChevronRight, DoorOpen, AlertTriangle, Wind, Thermometer, CloudRain, Loader2, Bot, MessageCircle } from 'lucide-react';

// 💡 WMO（世界気象機関）の天気コードを人間用に変換し、アラート基準を判定する関数
const getWeatherInfo = (code: number) => {
  const map: { [key: number]: { text: string, alert: boolean, icon: string } } = {
    0: { text: '快晴', alert: false, icon: '☀️' },
    1: { text: '晴れ', alert: false, icon: '☀️' },
    2: { text: '一部曇り', alert: false, icon: '⛅' },
    3: { text: '曇り', alert: false, icon: '☁️' },
    45: { text: '霧', alert: true, icon: '🌫️' },
    48: { text: '霧氷', alert: true, icon: '🌫️' },
    51: { text: '軽い霧雨', alert: false, icon: '🌧️' },
    53: { text: '霧雨', alert: false, icon: '🌧️' },
    55: { text: '強い霧雨', alert: true, icon: '🌧️' },
    61: { text: '小雨', alert: false, icon: '☔' },
    63: { text: '雨', alert: true, icon: '☔' },
    65: { text: '大雨', alert: true, icon: '🌊' },
    71: { text: '小雪', alert: false, icon: '⛄' },
    73: { text: '雪', alert: true, icon: '⛄' },
    75: { text: '大雪', alert: true, icon: '❄️' },
    80: { text: '俄か雨', alert: false, icon: '🌧️' },
    81: { text: '強い俄か雨', alert: true, icon: '🌧️' },
    82: { text: '猛烈な俄か雨', alert: true, icon: '🌊' },
    95: { text: '雷雨', alert: true, icon: '⛈️' },
    96: { text: '雷雨（霰伴う）', alert: true, icon: '⛈️' },
    99: { text: '激しい雷雨', alert: true, icon: '⛈️' }
  };
  return map[code] || { text: '不明', alert: false, icon: '☁️' };
};

export default function MapPortalPage() {
  const [map, setMap] = useState<any>(null);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  
  // 🚨 緊急モードのステート
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);

  // 📡 リアルタイム気象データ用のState
  const [weatherData, setWeatherData] = useState<{ [key: string]: { code: number, windspeed: number, temp: number } }>({});
  const [isFetchingWeather, setIsFetchingWeather] = useState(true);

  const markersRef = useRef<{ [key: string]: any }>({});
  const layersRef = useRef<any>({ light: null, dark: null, emergencyGroup: null });

  // 📍 拠点リストの定義（AIアシスタントのURLを追加）
  const locations = [
    { id: 'showa-reizo', name: '昭和冷蔵 厚木配送センター', address: '神奈川県厚木市上依知3007-9', lat: 35.517879, lng: 139.354149, type: 'hub', desc: '',
      aiManagerUrl: 'https://notebooklm.google.com/notebook/4b1f7092-ebd6-4984-ac18-4ab97b29ba76',
      aiConciergeUrl: 'https://notebooklm.google.com/notebook/07f314ce-cc45-45b4-9453-bc15fdf2314c' },
    { id: 'afs-minamikanto', name: 'AFS南関東センター', address: '千葉県船橋市高瀬町24番12号', lat: 35.6717, lng: 139.9924, type: 'center', desc: '',
      aiManagerUrl: 'https://notebooklm.google.com/notebook/2fb5edba-e288-4d90-9fa6-c416442bab73',
      aiConciergeUrl: 'https://notebooklm.google.com/notebook/e06a5a44-db1a-41ac-a16f-db0d0823a4bc' },
    { id: 'craft-delica', name: 'クラフトデリカ', address: '千葉県船橋市高瀬町24-6', lat: 35.6715, lng: 139.9930, type: 'center', desc: '',
      aiManagerUrl: 'https://notebooklm.google.com/notebook/73807b18-47ed-4191-a90c-07d50b5b4f83',
      aiConciergeUrl: 'https://notebooklm.google.com/notebook/2e056f93-d3bf-4e1d-8f8b-664132036252' },
    
    // 👇 ランドポート習志野：AIコンシェルジュにダミーURL ('#') を追加
    { id: 'landport-narashino', name: 'ランドポート習志野', address: '千葉県習志野市茜浜3丁目7-2', lat: 35.6586, lng: 139.9920, type: 'center', desc: '',
      aiManagerUrl: 'https://notebooklm.google.com/notebook/943f2704-4c7b-41dc-b307-b9571adfc448',
      aiConciergeUrl: '#' },
    
    // 👇 東急ストア：AIセンター長にダミーURL ('#') を追加
    { id: 'tokyu-store', name: '東急ストア 流通センター', address: '神奈川県川崎市川崎区東扇島23-4', lat: 35.4998, lng: 139.7702, type: 'center', desc: '',
      aiManagerUrl: '#',
      aiConciergeUrl: 'https://notebooklm.google.com/notebook/df86f541-6ddf-4a6a-87bf-a374d7d5ce84' },
      
    { id: 'afs-bisai', name: 'AFS尾西_流通', address: '愛知県一宮市明地南茱之木25-1', lat: 35.2869, lng: 136.7391, type: 'center', desc: '',
      aiManagerUrl: 'https://notebooklm.google.com/notebook/8e2c7e81-16e7-4aa5-a7a9-ce44c83db68a',
      aiConciergeUrl: 'https://notebooklm.google.com/notebook/1964f2d6-7663-4cb6-982b-65e9a462408d' },
    { id: 'yamanaka-shionagi', name: 'ヤマナカ しおなぎ生鮮センター', address: '愛知県名古屋市港区潮凪町1-3', lat: 35.0797, lng: 136.8618, type: 'center', desc: '',
      aiManagerUrl: 'https://notebooklm.google.com/notebook/0db774bd-abcc-49db-88a2-2faa506d4895',
      aiConciergeUrl: 'https://notebooklm.google.com/notebook/7c5f28b1-e601-48ab-80ad-551a2efc8f38' },
    { id: 'mitsui-chubu', name: '三井食品 中部物流センター', address: '愛知県名古屋市緑区高根山2丁目108', lat: 35.0461, lng: 136.9485, type: 'center', desc: '',
      aiManagerUrl: 'https://notebooklm.google.com/notebook/3dcab155-2717-4255-b047-9073b74f6345',
      aiConciergeUrl: 'https://notebooklm.google.com/notebook/f39a5d98-27e9-4e9c-a3f0-5340c57748fb' },
    { id: 'oie-hannan', name: '尾家産業 阪南支店', address: '大阪府貝塚市二色中町5-1', lat: 34.454641, lng: 135.344908, type: 'center', desc: '',
      aiManagerUrl: 'https://notebooklm.google.com/notebook/efa68d30-337b-4787-8e79-73e017dc64bd',
      aiConciergeUrl: 'https://notebooklm.google.com/notebook/d52ab5bb-68fc-4d40-96af-6c31165239d2' },
    { id: 'medi-entrance', name: 'メディエントランス', address: '大阪府箕面市森町西2丁目4-1', lat: 34.885, lng: 135.443, type: 'center', desc: '',
      aiManagerUrl: 'https://notebooklm.google.com/notebook/8ba4dddf-60b2-4460-9a69-e80f4aa3452f',
      aiConciergeUrl: 'https://notebooklm.google.com/notebook/acdbc2e1-951b-4351-ba10-575d6903fe05' },
    { id: 'cainz-kobe', name: 'カインズ 神戸流通センター', address: '兵庫県神戸市須磨区弥栄台', lat: 34.6860, lng: 135.0750, type: 'center', desc: '',
      aiManagerUrl: 'https://notebooklm.google.com/notebook/1599f84d-3251-496d-9081-69931f77e0de',
      aiConciergeUrl: 'https://notebooklm.google.com/notebook/18c3a4a6-a066-4e21-8468-97cb0c7d88f1' },
    { id: 'cainz-fukuoka', name: 'カインズ 福岡流通センター', address: '福岡県糟屋郡久山町久原2940', lat: 33.6420, lng: 130.5050, type: 'center', desc: '',
      aiManagerUrl: 'https://notebooklm.google.com/notebook/f3932ccb-a57a-4ec0-a628-25d04bb385d1',
      aiConciergeUrl: 'https://notebooklm.google.com/notebook/7b8954b7-5078-4796-964e-15727c89c7a0' },
    { id: 'afs-bisai-seiso', name: 'AFS尾西_清掃', address: '愛知県一宮市明地南茱之木25-1', lat: 35.286934, lng: 136.739061, type: 'center', desc: '', isPink: true },
    { id: 'himeji-afs-seiso', name: '兵庫姫路_AFS_清掃', address: '兵庫県姫路市白浜町甲841-51', lat: 34.778469, lng: 134.703810, type: 'center', desc: '', isPink: true },
    { id: 'mandai-saito', name: '万代彩都', address: '大阪府茨木市彩都あかね3-1', lat: 34.861370, lng: 135.534495, type: 'center', desc: '万代 彩都物流センター', isPink: true },
    { id: 'mandai-sibukawa', name: '万代渋川', address: '大阪府東大阪市渋川町3丁目12-25', lat: 34.644177, lng: 135.561439, type: 'center', desc: '', isPink: true },
    { id: 'dts-division', name: 'DTS事業部', address: '千葉県船橋市高瀬町24番12号', lat: 35.6717, lng: 139.9924, type: 'center', desc: '', isLightGreen: true },
    { id: 'hr-solution', name: '人材ソリューション', address: '大阪府大阪市中央区', lat: 34.676527, lng: 135.497279, type: 'center', desc: '', isPurple: true, customUrl: 'https://app-eight-taupe-96.vercel.app/' }
  ];

  // 📡 Open-Meteo APIからリアルタイム気象データを取得 ＆ 完全自動化ロジック
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const latList = locations.map(l => l.lat).join(',');
        const lngList = locations.map(l => l.lng).join(',');
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latList}&longitude=${lngList}&current_weather=true&timezone=Asia%2FTokyo`);
        const data = await res.json();
        
        const newWeather: any = {};
        let systemHasAlert = false;

        if (Array.isArray(data)) {
          data.forEach((d, i) => {
            const code = d.current_weather.weathercode;
            const windspeed = d.current_weather.windspeed;
            const temp = d.current_weather.temperature;
            
            const isAlert = getWeatherInfo(code).alert || windspeed >= 25;
            if (isAlert) {
              systemHasAlert = true;
            }

            newWeather[locations[i].id] = { code, windspeed, temp };
          });
        }
        setWeatherData(newWeather);

        if (systemHasAlert) {
          setIsEmergencyMode(true);
        }

      } catch (error) {
        console.error("Weather fetch failed", error);
      } finally {
        setIsFetchingWeather(false);
      }
    };
    fetchWeather();
  }, []);

  const getNormalIcon = (L: any, loc: any) => {
    let className = '';
    if (loc.isPink) className = 'pink-map-pin';
    if (loc.isLightGreen) className = 'light-green-map-pin';
    if (loc.isPurple) className = 'purple-map-pin';
    return new L.Icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41], className: className
    });
  };

  const getEmergencyIcon = (L: any) => {
    return new L.Icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41], className: 'red-emergency-pin'
    });
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && !map) {
      const link = document.createElement('link');
      link.rel = 'stylesheet'; link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => {
        const L = window.L;
        const leafMap = L.map('leaflet-map-container', { zoomControl: true, attributionControl: true }).setView([35.2, 137.5], 6);

        layersRef.current.light = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png');
        layersRef.current.dark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png');
        layersRef.current.emergencyGroup = L.featureGroup();

        layersRef.current.light.addTo(leafMap);

        locations.forEach(loc => {
          const marker = L.marker([loc.lat, loc.lng], { icon: getNormalIcon(L, loc) }).addTo(leafMap);
          markersRef.current[loc.id] = marker;
          marker.on('click', () => {
            setSelectedLocation(loc);
            leafMap.panTo([loc.lat, loc.lng]);
            Object.values(markersRef.current).forEach((m: any) => m.setZIndexOffset(0));
            marker.setZIndexOffset(1000);
          });
        });
        setMap(leafMap);
      };
      document.head.appendChild(script);
    }
  }, [map]);

  useEffect(() => {
    if (!map || !window.L || isFetchingWeather) return;
    const L = window.L;

    layersRef.current.emergencyGroup.clearLayers();

    if (isEmergencyMode) {
      map.removeLayer(layersRef.current.light);
      layersRef.current.dark.addTo(map);
      layersRef.current.emergencyGroup.addTo(map);

      locations.forEach(loc => {
        const w = weatherData[loc.id];
        const isAlert = w ? (getWeatherInfo(w.code).alert || w.windspeed >= 25) : false;

        if (isAlert) {
          markersRef.current[loc.id].setIcon(getEmergencyIcon(L));
          L.circle([loc.lat, loc.lng], {
            color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.2, radius: 25000, className: 'radar-pulse-anim'
          }).addTo(layersRef.current.emergencyGroup);
        } else {
          markersRef.current[loc.id].setIcon(getNormalIcon(L, loc));
        }
      });
    } else {
      map.removeLayer(layersRef.current.dark);
      map.removeLayer(layersRef.current.emergencyGroup);
      layersRef.current.light.addTo(map);
      locations.forEach(loc => markersRef.current[loc.id].setIcon(getNormalIcon(L, loc)) );
    }
  }, [isEmergencyMode, map, weatherData, isFetchingWeather]);

  const handleLocationClick = (loc: any) => {
    setSelectedLocation(loc);
    if (map && window.L) {
      map.setView([loc.lat, loc.lng], 11, { animate: true, duration: 1 });
      
      if (markersRef.current) {
        Object.values(markersRef.current).forEach((m: any) => m.setZIndexOffset(0));
        if (markersRef.current[loc.id]) {
          markersRef.current[loc.id].setZIndexOffset(1000);
        }
      }
    }
  };

  return (
    <div className={`h-[100dvh] w-screen flex flex-col md:flex-row overflow-hidden font-sans transition-colors duration-500 ${isEmergencyMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      <style dangerouslySetInnerHTML={{__html: `
        .pink-map-pin { filter: hue-rotate(140deg) saturate(200%) brightness(110%); }
        .light-green-map-pin { filter: hue-rotate(-120deg) saturate(200%) brightness(120%); }
        .purple-map-pin { filter: hue-rotate(70deg) saturate(200%) brightness(110%); }
        
        .red-emergency-pin { filter: hue-rotate(180deg) saturate(300%) brightness(90%); }

        @keyframes radarPulse {
          0% { stroke-width: 1; fill-opacity: 0.1; }
          50% { stroke-width: 3; fill-opacity: 0.35; }
          100% { stroke-width: 1; fill-opacity: 0.1; }
        }
        .radar-pulse-anim {
          animation: radarPulse 2.5s infinite ease-in-out;
        }
      `}} />

      <div className={`w-full md:w-[400px] h-[40vh] md:h-full border-b md:border-b-0 md:border-r flex flex-col justify-between z-20 shadow-lg shrink-0 transition-colors duration-500 ${isEmergencyMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="p-4 md:p-6 space-y-4 md:space-y-6 overflow-y-auto flex-1">
          <div className={`border-b pb-3 md:pb-4 ${isEmergencyMode ? 'border-slate-800' : 'border-slate-100'}`}>
            <h1 className="text-[10px] md:text-xs font-black tracking-[0.2em] text-slate-400 uppercase">株式会社PAL</h1>
            <p className="text-sm md:text-base font-black tracking-tighter uppercase flex items-center mt-1">
              <img 
                src="/pal-logo.png" 
                alt="株式会社PAL Logo" 
                className="h-5 md:h-7 w-auto object-contain inline-block mr-1.5 align-middle"
              />
              <span className={`align-middle ${isEmergencyMode ? 'text-slate-100' : 'text-slate-800'}`}>拠点統括ロジスティクスマップ</span>
            </p>
          </div>

          <div className={`p-3 md:p-4 rounded-2xl border flex items-center justify-between transition-all ${isEmergencyMode ? 'bg-rose-950/40 border-rose-800 text-rose-200 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
            <div className="flex items-center gap-2">
              <AlertTriangle className={`w-4 h-4 ${isEmergencyMode ? 'text-rose-500 animate-bounce' : 'text-slate-400'}`} />
              <div>
                <p className="text-xs font-black tracking-wider uppercase">緊急災害モード</p>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                  {isFetchingWeather ? '気象データ取得中...' : (isEmergencyMode ? '⚠️ 警報級の悪天候を検知' : '全拠点 平時モード運用中')}
                </p>
              </div>
            </div>
            <button 
              onClick={() => { setIsEmergencyMode(!isEmergencyMode); setSelectedLocation(null); }}
              className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 focus:outline-none ${isEmergencyMode ? 'bg-rose-600' : 'bg-slate-300'}`}
            >
              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${isEmergencyMode ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">拠点一覧 ({locations.length})</p>
              <div className="flex items-center gap-1">
                <Link 
                  href="https://palproductivity-dashboard.vercel.app/dashboard/compare" 
                  title="15現場 業績比較ダッシュボードを開く" 
                  className="text-slate-400 hover:text-blue-600 transition-all p-1 rounded-lg hover:bg-slate-50 duration-200 flex items-center justify-center"
                >
                  <DoorOpen size={18} />
                </Link>
                
                <Link 
                  href="https://matehan-system.vercel.app/" 
                  title="マテハンシステムを開く" 
                  className="text-slate-400 hover:text-cyan-600 transition-all p-1 rounded-lg hover:bg-slate-50 duration-200 flex items-center justify-center"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 22h10" />
                    <path d="M6 22v-2a3 3 0 0 1 6 0v2" />
                    <circle cx="9" cy="16" r="2" />
                    <path d="M10 14l3-4" />
                    <circle cx="14" cy="9" r="2" />
                    <path d="M15 10l2 3" />
                    <path d="M16 14l-2 2" />
                    <path d="M18 12l2 -2" />
                  </svg>
                </Link>
              </div>
            </div>
            
            <div className="space-y-2 max-h-[30vh] md:max-h-full overflow-y-auto pr-1">
              {locations.map((loc) => {
                const w = weatherData[loc.id];
                const wInfo = w ? getWeatherInfo(w.code) : null;
                const isAlert = w ? (wInfo?.alert || w.windspeed >= 25) : false;
                const showEmergencyUI = isEmergencyMode && isAlert;

                return (
                  <button
                    key={loc.id}
                    onClick={() => handleLocationClick(loc)}
                    className={`w-full text-left p-3 md:p-4 rounded-2xl border transition-all flex justify-between items-center ${
                      selectedLocation?.id === loc.id
                        ? (showEmergencyUI ? 'bg-rose-950 border-rose-700 text-white shadow-md' : 'bg-slate-900 border-slate-900 text-white shadow-md')
                        : (isEmergencyMode 
                            ? (showEmergencyUI ? 'bg-rose-950/40 border-rose-900/50 hover:bg-rose-900/60' : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800') 
                            : 'bg-white border-slate-100 hover:bg-slate-50')
                    }`}
                  >
                    <div className="space-y-1 flex-1 pr-2">
                      <div className="flex items-center gap-2">
                        <h3 className={`text-sm md:text-base font-black tracking-tighter leading-snug ${selectedLocation?.id === loc.id ? 'text-white' : (isEmergencyMode ? 'text-slate-200' : 'text-slate-900')}`}>
                          {loc.name}
                        </h3>
                        {showEmergencyUI && (
                          <span className="px-1.5 py-0.5 bg-rose-600 text-white text-[8px] font-black rounded uppercase animate-pulse flex items-center gap-0.5">
                            <AlertTriangle size={8}/> 警戒
                          </span>
                        )}
                      </div>

                      {wInfo ? (
                        <div className={`flex items-center gap-3 text-[10px] md:text-[11px] font-bold ${showEmergencyUI ? 'text-rose-300' : (isEmergencyMode ? 'text-slate-400' : 'text-slate-500')}`}>
                          <span className="flex items-center gap-1" title={wInfo.text}>
                            {wInfo.icon} {w.temp}°C
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Wind size={11}/> {w.windspeed} km/h
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                          <Loader2 size={10} className="animate-spin" /> データ取得中...
                        </div>
                      )}

                    </div>
                    <ChevronRight size={14} className={selectedLocation?.id === loc.id ? 'text-white' : 'text-slate-400'} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className={`p-3 border-t text-[9px] md:text-[10px] text-slate-400 font-bold text-center ${isEmergencyMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
          PRODUCTIVITY SYSTEM
        </div>
      </div>

      <div className="flex-1 w-full h-[60vh] md:h-full bg-slate-100 relative overflow-hidden">
        <div id="leaflet-map-container" className="w-full h-full z-10"></div>

        {selectedLocation && (() => {
          const w = weatherData[selectedLocation.id];
          const wInfo = w ? getWeatherInfo(w.code) : null;
          const isAlert = w ? (wInfo?.alert || w.windspeed >= 25) : false;
          const showEmergencyUI = isEmergencyMode && isAlert;

          return (
            <div className={`absolute bottom-4 left-4 right-4 md:bottom-8 md:right-8 md:left-auto md:w-[360px] border p-4 md:p-5 rounded-[2rem] shadow-2xl animate-in slide-in-from-bottom-2 duration-150 z-30 space-y-4 backdrop-blur-md ${isEmergencyMode ? 'bg-slate-900/95 border-slate-700' : 'bg-white/95 border-slate-200'}`}>
              <div className={`flex justify-between items-start border-b pb-2 ${isEmergencyMode ? 'border-slate-800' : 'border-slate-100'}`}>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h2 className={`text-base md:text-lg font-black tracking-tighter leading-tight ${isEmergencyMode ? 'text-slate-100' : 'text-slate-900'}`}>
                      {selectedLocation.name}
                    </h2>
                  </div>
                  <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Navigation size={10} /> LAT: {selectedLocation.lat.toFixed(4)} / LNG: {selectedLocation.lng.toFixed(4)}
                  </p>
                </div>
                <button onClick={() => setSelectedLocation(null)} className={`text-xs p-1 font-mono rounded-full w-6 h-6 flex items-center justify-center ${isEmergencyMode ? 'bg-slate-800 text-slate-400 hover:text-slate-200' : 'bg-slate-100 text-slate-400 hover:text-slate-900'}`}>✕</button>
              </div>

              <div className="space-y-3">
                <div className={`flex items-center gap-3 p-3 rounded-xl border ${showEmergencyUI ? 'bg-rose-950/50 border-rose-800' : (isEmergencyMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100')}`}>
                  {wInfo ? (
                    <>
                      <div className="text-2xl">{wInfo.icon}</div>
                      <div className="flex flex-col">
                        <span className={`text-xs font-black ${showEmergencyUI ? 'text-rose-400' : (isEmergencyMode ? 'text-slate-200' : 'text-slate-700')}`}>
                          現在地の気象状況: {wInfo.text}
                        </span>
                        <div className={`flex items-center gap-3 text-[11px] font-bold mt-0.5 ${showEmergencyUI ? 'text-rose-200' : (isEmergencyMode ? 'text-slate-400' : 'text-slate-500')}`}>
                          <span className="flex items-center gap-1"><Thermometer size={12}/> {w.temp}°C</span>
                          <span className="flex items-center gap-1"><Wind size={12}/> {w.windspeed} km/h</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-bold p-1">
                      <Loader2 size={14} className="animate-spin" /> 気象データを取得中...
                    </div>
                  )}
                </div>

                {showEmergencyUI && (
                  <div className="bg-rose-950/80 border border-rose-800 p-3 rounded-xl text-[10px] md:text-[11px] text-rose-200 font-bold space-y-1">
                    <p className="flex items-center gap-1 text-rose-400 font-black text-xs"><AlertTriangle size={12}/> 悪天候・強風アラート</p>
                    <p className="font-medium leading-relaxed">
                      現在、対象エリアで安全基準を超える気象状況を検知しています。近隣道路の渋滞および配送網の遅延リスクに警戒し、人員の安全確保を優先してください。
                    </p>
                  </div>
                )}
                
                <div className={`text-[10px] md:text-[11px] font-medium flex items-start gap-1 ${isEmergencyMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  <MapPin 
                    size={12} 
                    className="mt-0.5 shrink-0" 
                    style={{ 
                      color: showEmergencyUI
                        ? '#ef4444'
                        : (selectedLocation.isPink ? '#ec4899' : (selectedLocation.isLightGreen ? '#84cc16' : (selectedLocation.isPurple ? '#a855f7' : '#3b82f6'))) 
                    }} 
                  /> 
                  <span>{selectedLocation.address}</span>
                </div>
              </div>

              {/* AIアシスタントエリア（データが存在する場合のみ表示） */}
              {(selectedLocation.aiManagerUrl || selectedLocation.aiConciergeUrl) && (
                <div className={`flex gap-2 w-full pt-3 mt-3 border-t ${isEmergencyMode ? 'border-slate-800' : 'border-slate-100'}`}>
                  {selectedLocation.aiManagerUrl && (
                    <a 
                      href={selectedLocation.aiManagerUrl} 
                      target={selectedLocation.aiManagerUrl === '#' ? undefined : "_blank"}
                      rel={selectedLocation.aiManagerUrl === '#' ? undefined : "noopener noreferrer"}
                      onClick={(e) => {
                        if (selectedLocation.aiManagerUrl === '#') {
                          e.preventDefault();
                          alert('AIセンター長は現在準備中です。');
                        }
                      }}
                      className={`flex-1 rounded-lg py-2.5 text-[10px] font-black tracking-wider flex items-center justify-center gap-1.5 transition-colors border ${
                        isEmergencyMode 
                          ? 'bg-indigo-900/30 text-indigo-300 border-indigo-800 hover:bg-indigo-900/50' 
                          : 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100'
                      }`}
                    >
                      <Bot size={13} /> AIセンター長
                    </a>
                  )}

                  {selectedLocation.aiConciergeUrl && (
                    <a 
                      href={selectedLocation.aiConciergeUrl} 
                      target={selectedLocation.aiConciergeUrl === '#' ? undefined : "_blank"}
                      rel={selectedLocation.aiConciergeUrl === '#' ? undefined : "noopener noreferrer"}
                      onClick={(e) => {
                        if (selectedLocation.aiConciergeUrl === '#') {
                          e.preventDefault();
                          alert('AIコンシェルジュは現在準備中です。');
                        }
                      }}
                      className={`flex-1 rounded-lg py-2.5 text-[10px] font-black tracking-wider flex items-center justify-center gap-1.5 transition-colors border ${
                        isEmergencyMode 
                          ? 'bg-emerald-900/30 text-emerald-300 border-emerald-800 hover:bg-emerald-900/50' 
                          : 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100'
                      }`}
                    >
                      <MessageCircle size={13} /> AIコンシェルジュ
                    </a>
                  )}
                </div>
              )}

              <Link
                href={selectedLocation.customUrl || `/dashboard/${selectedLocation.id}`}
                target={selectedLocation.customUrl ? "_blank" : undefined}
                rel={selectedLocation.customUrl ? "noopener noreferrer" : undefined}
                className={`w-full py-3 md:py-3.5 rounded-xl text-xs font-black tracking-widest text-center shadow-md transition-all flex items-center justify-center gap-1 uppercase no-underline border-t ${showEmergencyUI ? 'bg-rose-600 hover:bg-rose-500 text-white border-white/10' : 'bg-slate-900 hover:bg-slate-800 text-white border-white/10'}`}
              >
                ダッシュボードを開く <ChevronRight size={13} />
              </Link>
            </div>
          );
        })()}
      </div>
    </div>
  );
}