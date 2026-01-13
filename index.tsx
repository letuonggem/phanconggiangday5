
import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { 
    LayoutDashboard, Users, CalendarDays, FileText, Settings, 
    Trash2, Edit3, Check, X, FileUp, ChevronLeft, ChevronRight, 
    RefreshCw, Cloud, CloudUpload, CloudDownload, Save, 
    CheckCircle2, AlertTriangle, ShieldCheck, TrendingUp, BookOpen, Download, Upload,
    ClipboardCheck, Copy
} from 'lucide-react';

// --- CẤU HÌNH HỆ THỐNG ---
const STORAGE_KEY = 'thcs_mgmt_final_v1';

const App = () => {
    const [activeTab, setActiveTab] = useState('teachers');
    const [syncStatus, setSyncStatus] = useState({ loading: false, message: '', type: '' });
    const [currentWeek, setCurrentWeek] = useState(1);

    const [data, setData] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : { 
            standardQuota: 19, 
            cloudUrl: '',
            roles: [
                { id: '1', name: 'Tổ trưởng', reduction: 3 },
                { id: '2', name: 'Chủ nhiệm', reduction: 4 },
                { id: '3', name: 'Thư ký hội đồng', reduction: 2 }
            ], 
            teachers: [], 
            weeklyData: {} 
        };
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }, [data]);

    const updateData = (newData: any) => setData(prev => ({ ...prev, ...newData }));

    const pushToCloud = async () => {
        if (!data.cloudUrl) return alert("Chưa có link Google Script!");
        setSyncStatus({ loading: true, message: 'Đang lưu lên Cloud...', type: 'info' });
        try {
            await fetch(data.cloudUrl, { method: 'POST', mode: 'no-cors', body: JSON.stringify(data) });
            setSyncStatus({ loading: false, message: 'Đã lưu thành công!', type: 'success' });
            setTimeout(() => setSyncStatus({ loading: false, message: '', type: '' }), 3000);
        } catch (e) { setSyncStatus({ loading: false, message: 'Lỗi kết nối!', type: 'error' }); }
    };

    const fetchFromCloud = async () => {
        if (!data.cloudUrl) return alert("Chưa có link Google Script!");
        setSyncStatus({ loading: true, message: 'Đang tải từ Cloud...', type: 'info' });
        try {
            const res = await fetch(data.cloudUrl);
            const cloudData = await res.json();
            if (cloudData && confirm("Ghi đè dữ liệu máy này bằng dữ liệu từ Cloud?")) {
                setData(cloudData);
                setSyncStatus({ loading: false, message: 'Đã tải xong!', type: 'success' });
            }
        } catch (e) { setSyncStatus({ loading: false, message: 'Lỗi tải dữ liệu!', type: 'error' }); }
    };

    const teacherStats = useMemo(() => {
        return data.teachers.map((t: any) => {
            const reduction = t.roles.reduce((s: number, rN: string) => s + (data.roles.find((r: any) => r.name === rN)?.reduction || 0), 0);
            const quotaPerWeek = Math.max(0, data.standardQuota - reduction);
            const actual = data.weeklyData[currentWeek]?.[t.id] || 0;
            return { ...t, quotaPerWeek, actual, diff: actual - quotaPerWeek };
        });
    }, [data, currentWeek]);

    const ConfigTab = () => (
        <div className="p-8 animate-fadeIn">
            <h2 className="text-2xl font-black mb-6">Cài đặt & Đồng bộ Cloud</h2>
            <div className="bg-indigo-900 text-white p-8 rounded-[2.5rem] mb-8 shadow-2xl">
                <div className="flex items-center gap-3 mb-4"><Cloud className="text-indigo-300" /><h3 className="font-bold uppercase text-xs tracking-widest">Máy chủ Google Sheets</h3></div>
                <input type="text" placeholder="Dán link App Script tại đây..." className="w-full p-5 bg-white/10 border border-white/20 rounded-2xl text-sm mb-6 outline-none focus:bg-white/20" value={data.cloudUrl} onChange={e => updateData({cloudUrl: e.target.value})}/>
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={pushToCloud} className="bg-indigo-500 hover:bg-indigo-400 p-4 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg"><CloudUpload /> Đẩy lên mây</button>
                    <button onClick={fetchFromCloud} className="bg-white/10 hover:bg-white/20 p-4 rounded-2xl font-bold flex items-center justify-center gap-3"><CloudDownload /> Tải từ mây</button>
                </div>
            </div>
            <div className="bg-white p-8 rounded-[2rem] border-2 border-slate-100 shadow-sm">
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Định mức chuẩn (tiết/tuần)</label>
                <input type="number" value={data.standardQuota} onChange={e => updateData({standardQuota: parseInt(e.target.value)})} className="text-5xl font-black text-blue-600 outline-none w-full"/>
            </div>
        </div>
    );

    const TeacherTab = () => {
        const fileRef = useRef<HTMLInputElement>(null);
        const handleImport = (e: any) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (evt: any) => {
                const wb = (window as any).XLSX.read(evt.target.result, {type:'binary'});
                const rows = (window as any).XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
                const news = rows.map((row: any, i: number) => ({
                    id: (Date.now()+i).toString(),
                    name: row['Họ tên'] || row['tengv'] || 'Giáo viên mới',
                    subjects: row['Môn dạy'] || '',
                    assignedPeriods: parseFloat(row['Số tiết'] || row['tiết TKB']) || 0,
                    roles: []
                }));
                updateData({ teachers: [...data.teachers, ...news] });
            };
            reader.readAsBinaryString(file);
        };
        return (
            <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-black">Danh sách Phân công</h2>
                    <input type="file" ref={fileRef} className="hidden" onChange={handleImport}/>
                    <button onClick={() => fileRef.current?.click()} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl flex gap-2 font-bold shadow-xl"><FileUp size={20}/> Nhập từ Excel</button>
                </div>
                <div className="bg-white rounded-[2rem] border-2 border-slate-50 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b">
                            <tr><th className="p-5 text-[10px] font-black uppercase text-slate-400">Giáo viên</th><th className="p-5 text-center text-[10px] font-black uppercase text-slate-400">Tiết TKB</th><th className="p-5"></th></tr>
                        </thead>
                        <tbody>
                            {data.teachers.map((t: any) => (
                                <tr key={t.id} className="border-b group hover:bg-slate-50">
                                    <td className="p-5"><div className="font-bold text-slate-800">{t.name}</div><div className="text-[10px] font-black text-slate-400 uppercase">{t.subjects}</div></td>
                                    <td className="p-5"><input type="number" className="w-20 mx-auto block text-center p-3 bg-blue-50 border-2 border-blue-100 rounded-2xl font-black text-blue-600 outline-none" value={t.assignedPeriods} onChange={e => updateData({teachers: data.teachers.map((x: any) => x.id === t.id ? {...x, assignedPeriods: parseFloat(e.target.value)} : x)})}/></td>
                                    <td className="p-5 text-right"><button onClick={() => updateData({teachers: data.teachers.filter((x: any) => x.id !== t.id)})} className="text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={20}/></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const WeeklyTab = () => {
        const [tempLogs, setTempLogs] = useState(data.weeklyData[currentWeek] || {});
        const save = () => {
            updateData({ weeklyData: { ...data.weeklyData, [currentWeek]: tempLogs } });
            setSyncStatus({ loading: false, message: 'Đã lưu tuần ' + currentWeek, type: 'success' });
            setTimeout(() => setSyncStatus({ loading: false, message: '', type: '' }), 2000);
        };
        return (
            <div className="p-8">
                <div className="flex justify-between items-center gap-6 mb-8">
                    <div className="flex items-center gap-4 bg-white border-2 border-slate-100 p-2 rounded-3xl">
                        <button onClick={() => setCurrentWeek(Math.max(1, currentWeek-1))} className="p-3 hover:bg-slate-100 rounded-2xl"><ChevronLeft/></button>
                        <div className="px-6 text-center"><div className="text-2xl font-black">Tuần {currentWeek}</div></div>
                        <button onClick={() => setCurrentWeek(currentWeek+1)} className="p-3 hover:bg-slate-100 rounded-2xl"><ChevronRight/></button>
                    </div>
                    <button onClick={save} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold flex gap-2 items-center shadow-lg"><Save size={18}/> Lưu dữ liệu</button>
                </div>
                <div className="bg-white rounded-[2rem] border-2 border-slate-50 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b">
                            <tr><th className="p-5 text-[10px] font-black uppercase text-slate-400">Giáo viên</th><th className="p-5 text-center text-[10px] font-black uppercase text-slate-400">Thực dạy</th></tr>
                        </thead>
                        <tbody>
                            {data.teachers.map((t: any) => (
                                <tr key={t.id} className="border-b">
                                    <td className="p-5"><div className="font-bold">{t.name}</div><div className="text-[10px] text-slate-300">TKB: {t.assignedPeriods}</div></td>
                                    <td className="p-5"><input type="number" className="w-24 mx-auto block text-center p-4 bg-emerald-50 border-2 border-emerald-100 rounded-2xl font-black text-emerald-700 outline-none" value={tempLogs[t.id] || 0} onChange={e => setTempLogs({...tempLogs, [t.id]: parseFloat(e.target.value)})}/></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const ReportTab = () => (
        <div className="p-8">
            <h2 className="text-2xl font-black mb-6">Báo cáo (Tuần {currentWeek})</h2>
            <div className="bg-white rounded-[2rem] border-2 border-slate-50 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b">
                        <tr><th className="p-5">Họ tên</th><th className="p-5 text-center">Định mức</th><th className="p-5 text-center">Thực dạy</th><th className="p-5 text-center">Chênh lệch</th></tr>
                    </thead>
                    <tbody>
                        {teacherStats.map((s: any) => (
                            <tr key={s.id} className="border-b">
                                <td className="p-5 font-bold">{s.name}</td>
                                <td className="p-5 text-center text-slate-400">{s.quotaPerWeek}</td>
                                <td className="p-5 text-center font-black text-blue-600">{s.actual}</td>
                                <td className="p-5 text-center">
                                    <span className={`px-4 py-1.5 rounded-full font-black text-xs ${s.diff >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                        {s.diff >= 0 ? `+${s.diff}` : s.diff}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const BackupTab = () => (
        <div className="p-8 text-center py-20">
            <ShieldCheck size={48} className="mx-auto text-blue-500 mb-6 opacity-20"/>
            <h2 className="text-2xl font-black mb-4">Bảo mật & Sao lưu</h2>
            <button onClick={() => {
                const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = 'backup.json'; a.click();
            }} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold shadow-lg">Tải file sao lưu (.json)</button>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <header className="bg-white border-b-2 border-slate-100 p-4 sticky top-0 z-50">
                <div className="container mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg"><LayoutDashboard size={20}/></div>
                        <h1 className="font-black text-lg tracking-tight">THCS PRO</h1>
                    </div>
                    <nav className="flex gap-1 bg-slate-100 p-1 rounded-2xl">
                        {[
                            {id: 'config', icon: Settings, label: 'CẤI ĐẶT'},
                            {id: 'teachers', icon: Users, label: 'PHÂN CÔNG'},
                            {id: 'weekly', icon: CalendarDays, label: 'TIẾT DẠY'},
                            {id: 'reports', icon: FileText, label: 'BÁO CÁO'},
                            {id: 'backup', icon: Save, label: 'SAO LƯU'}
                        ].map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black transition-all ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                                <tab.icon size={14}/> <span className="hidden md:inline">{tab.label}</span>
                            </button>
                        ))}
                    </nav>
                </div>
            </header>
            <main className="container mx-auto p-4 flex-1">
                <div className="bg-white rounded-[2.5rem] shadow-2xl border-2 border-slate-100 min-h-[500px] overflow-hidden">
                    {activeTab === 'config' && <ConfigTab />}
                    {activeTab === 'teachers' && <TeacherTab />}
                    {activeTab === 'weekly' && <WeeklyTab />}
                    {activeTab === 'reports' && <ReportTab />}
                    {activeTab === 'backup' && <BackupTab />}
                </div>
            </main>
            {syncStatus.message && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-bold text-sm animate-fadeIn">
                    {syncStatus.loading ? <RefreshCw size={20} className="animate-spin text-blue-400" /> : <CheckCircle2 size={20} className="text-emerald-400" />}
                    {syncStatus.message}
                </div>
            )}
        </div>
    );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
