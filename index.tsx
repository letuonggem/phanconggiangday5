
import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { 
    LayoutDashboard, Users, CalendarDays, FileText, Settings, 
    Trash2, Edit3, Check, X, FileUp, ChevronLeft, ChevronRight, 
    RefreshCw, Cloud, CloudUpload, CloudDownload, Save, 
    CheckCircle2, AlertTriangle, ShieldCheck, TrendingUp, BookOpen, Download, Upload,
    ClipboardCheck, Copy, CalendarRange
} from 'lucide-react';

// --- CẤU HÌNH HỆ THỐNG ---
const STORAGE_KEY = 'thcs_mgmt_final_v1';

const App = () => {
    const [activeTab, setActiveTab] = useState('teachers');
    const [syncStatus, setSyncStatus] = useState({ loading: false, message: '', type: '' });
    const [currentWeek, setCurrentWeek] = useState(1);

    // --- QUẢN LÝ DỮ LIỆU TẬP TRUNG ---
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

    const updateData = (newData) => setData(prev => ({ ...prev, ...newData }));

    // --- LOGIC ĐỒNG BỘ ĐÁM MÂY (GOOGLE SHEETS) ---
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

    // --- TÍNH TOÁN BÁO CÁO ---
    const teacherStats = useMemo(() => {
        return data.teachers.map(t => {
            const reduction = t.roles.reduce((s, rN) => s + (data.roles.find(r => r.name === rN)?.reduction || 0), 0);
            const quotaPerWeek = Math.max(0, data.standardQuota - reduction);
            const actual = data.weeklyData[currentWeek]?.[t.id] || 0;
            return { ...t, quotaPerWeek, actual, diff: actual - quotaPerWeek };
        });
    }, [data, currentWeek]);

    // --- GIAO DIỆN TỪNG TAB ---

    // 1. TAB CÀI ĐẶT & CLOUD
    const ConfigTab = () => (
        <div className="p-8 animate-fadeIn">
            <h2 className="text-2xl font-black mb-6">Cài đặt & Đồng bộ Cloud</h2>
            <div className="bg-indigo-900 text-white p-8 rounded-[2.5rem] mb-8 shadow-2xl">
                <div className="flex items-center gap-3 mb-4"><Cloud className="text-indigo-300" /><h3 className="font-bold uppercase text-xs tracking-widest">Máy chủ Google Sheets</h3></div>
                <input type="text" placeholder="Dán link App Script tại đây..." className="w-full p-5 bg-white/10 border border-white/20 rounded-2xl text-sm mb-6 outline-none focus:bg-white/20 transition-all" value={data.cloudUrl} onChange={e => updateData({cloudUrl: e.target.value})}/>
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={pushToCloud} className="bg-indigo-500 hover:bg-indigo-400 p-4 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg transition-all active:scale-95"><CloudUpload /> Đẩy lên mây</button>
                    <button onClick={fetchFromCloud} className="bg-white/10 hover:bg-white/20 p-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all active:scale-95"><CloudDownload /> Tải từ mây</button>
                </div>
            </div>
            <div className="bg-white p-8 rounded-[2rem] border-2 border-slate-100 shadow-sm">
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Định mức chuẩn nhà nước (tiết/tuần)</label>
                <input type="number" value={data.standardQuota} onChange={e => updateData({standardQuota: parseInt(e.target.value)})} className="text-5xl font-black text-blue-600 outline-none w-full"/>
            </div>
        </div>
    );

    // 2. TAB PHÂN CÔNG (NHẬP EXCEL)
    const TeacherTab = () => {
        const fileRef = useRef(null);
        const handleImport = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (evt) => {
                const wb = (window as any).XLSX.read(evt.target.result, {type:'binary'});
                const rows = (window as any).XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
                const news = rows.map((row, i) => ({
                    id: (Date.now()+i).toString(),
                    name: row['Họ tên'] || row['tengv'] || 'Giáo viên mới',
                    subjects: row['Môn dạy'] || '',
                    classes: row['Lớp dạy'] || '',
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
                    <button onClick={() => fileRef.current.click()} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl flex gap-2 font-bold shadow-xl transition-all active:scale-95"><FileUp size={20}/> Nhập từ Excel</button>
                </div>
                <div className="bg-white rounded-[2rem] border-2 border-slate-50 overflow-hidden shadow-sm">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b">
                            <tr>
                                <th className="p-5 text-left text-[10px] font-black uppercase text-slate-400">Giáo viên / Môn</th>
                                <th className="p-5 text-center text-[10px] font-black uppercase text-slate-400">Số tiết TKB</th>
                                <th className="p-5"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.teachers.map(t => (
                                <tr key={t.id} className="border-b group hover:bg-slate-50/50 transition-colors">
                                    <td className="p-5"><div className="font-bold text-slate-800">{t.name}</div><div className="text-[10px] font-black text-slate-400 uppercase">{t.subjects}</div></td>
                                    <td className="p-5"><input type="number" className="w-20 mx-auto block text-center p-3 bg-blue-50 border-2 border-blue-100 rounded-2xl font-black text-blue-600 focus:border-blue-500 outline-none" value={t.assignedPeriods} onChange={e => updateData({teachers: data.teachers.map(x => x.id === t.id ? {...x, assignedPeriods: parseFloat(e.target.value)} : x)})}/></td>
                                    <td className="p-5 text-right"><button onClick={() => updateData({teachers: data.teachers.filter(x => x.id !== t.id)})} className="text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={20}/></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {data.teachers.length === 0 && <div className="p-20 text-center text-slate-300 font-bold">Trống. Hãy bấm nút Nhập Excel hoặc Tải từ Cloud.</div>}
                </div>
            </div>
        );
    };

    // 3. TAB NHẬP TIẾT DẠY TUẦN (WEEKLY)
    const WeeklyTab = () => {
        const [tempLogs, setTempLogs] = useState(data.weeklyData[currentWeek] || {});
        const save = () => {
            updateData({ weeklyData: { ...data.weeklyData, [currentWeek]: tempLogs } });
            setSyncStatus({ loading: false, message: 'Đã lưu tiết dạy tuần ' + currentWeek, type: 'success' });
            setTimeout(() => setSyncStatus({ loading: false, message: '', type: '' }), 2000);
        };
        const fillFromTKB = () => {
            const filled = {};
            data.teachers.forEach(t => filled[t.id] = t.assignedPeriods);
            setTempLogs(filled);
        };
        return (
            <div className="p-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
                    <div className="flex items-center gap-4 bg-white border-2 border-slate-100 p-2 rounded-3xl shadow-sm">
                        <button onClick={() => setCurrentWeek(Math.max(1, currentWeek-1))} className="p-3 hover:bg-slate-100 rounded-2xl text-slate-400 transition-all"><ChevronLeft/></button>
                        <div className="px-6 text-center"><div className="text-[10px] font-black text-blue-500 uppercase">Đang chọn</div><div className="text-2xl font-black">Tuần {currentWeek}</div></div>
                        <button onClick={() => setCurrentWeek(currentWeek+1)} className="p-3 hover:bg-slate-100 rounded-2xl text-slate-400 transition-all"><ChevronRight/></button>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={fillFromTKB} className="bg-slate-100 text-slate-600 px-6 py-3 rounded-2xl font-bold flex gap-2 items-center hover:bg-slate-200 transition-all"><ClipboardCheck size={18}/> Lấy từ TKB</button>
                        <button onClick={save} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold flex gap-2 items-center shadow-lg hover:bg-blue-700 transition-all active:scale-95"><Save size={18}/> Lưu tuần {currentWeek}</button>
                    </div>
                </div>
                <div className="bg-white rounded-[2rem] border-2 border-slate-50 overflow-hidden shadow-sm">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b">
                            <tr><th className="p-5 text-left text-[10px] font-black uppercase text-slate-400">Giáo viên</th><th className="p-5 text-center text-[10px] font-black uppercase text-slate-400">Số tiết thực dạy</th></tr>
                        </thead>
                        <tbody>
                            {data.teachers.map(t => (
                                <tr key={t.id} className="border-b hover:bg-slate-50/50">
                                    <td className="p-5"><div className="font-bold">{t.name}</div><div className="text-[10px] font-black text-slate-300">TKB: {t.assignedPeriods} tiết</div></td>
                                    <td className="p-5"><input type="number" className="w-24 mx-auto block text-center p-4 bg-emerald-50 border-2 border-emerald-100 rounded-2xl font-black text-emerald-700 outline-none focus:border-emerald-500 transition-all" value={tempLogs[t.id] || 0} onChange={e => setTempLogs({...tempLogs, [t.id]: parseFloat(e.target.value)})}/></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    // 4. TAB BÁO CÁO (REPORTS)
    const ReportTab = () => (
        <div className="p-8 animate-fadeIn">
            <h2 className="text-2xl font-black mb-6">Báo cáo Tổng hợp (Tuần {currentWeek})</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
                    <div className="text-3xl font-black text-blue-600">{data.teachers.length}</div>
                    <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Giáo viên</div>
                </div>
                <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
                    <div className="text-3xl font-black text-emerald-600">{teacherStats.reduce((s, x) => s + x.actual, 0)}</div>
                    <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Tổng tiết thực hiện</div>
                </div>
                <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100">
                    <div className="text-3xl font-black text-amber-600">{teacherStats.filter(x => x.diff > 0).length}</div>
                    <div className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">GV dạy quá định mức</div>
                </div>
            </div>
            <div className="bg-white rounded-[2rem] border-2 border-slate-50 overflow-hidden shadow-sm">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b">
                        <tr><th className="p-5 text-left">Họ tên</th><th className="p-5 text-center">Định mức</th><th className="p-5 text-center">Thực dạy</th><th className="p-5 text-center">Chênh lệch</th></tr>
                    </thead>
                    <tbody>
                        {teacherStats.map(s => (
                            <tr key={s.id} className="border-b">
                                <td className="p-5 font-bold text-slate-700">{s.name}</td>
                                <td className="p-5 text-center font-bold text-slate-400">{s.quotaPerWeek}</td>
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

    // 5. TAB SAO LƯU (BACKUP)
    const BackupTab = () => {
        const exportJSON = () => {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `backup_thcs_${new Date().toLocaleDateString()}.json`;
            a.click();
        };
        return (
            <div className="p-8 text-center">
                <div className="max-w-md mx-auto py-20">
                    <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6"><ShieldCheck size={40}/></div>
                    <h2 className="text-2xl font-black mb-2">Bảo mật Dữ liệu</h2>
                    <p className="text-slate-400 text-sm mb-8">Dữ liệu của bạn được lưu an toàn trên trình duyệt này. Hãy tải file dự phòng về máy định kỳ.</p>
                    <div className="flex flex-col gap-3">
                        <button onClick={exportJSON} className="bg-blue-600 text-white p-5 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg hover:bg-blue-700 transition-all"><Download size={20}/> Tải file dự phòng (.json)</button>
                        <button onClick={() => { if(confirm("XÓA SẠCH?")) { localStorage.clear(); window.location.reload(); } }} className="text-red-500 font-bold p-5 rounded-2xl border-2 border-red-50 hover:bg-red-50 transition-all">Xóa sạch toàn bộ dữ liệu</button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Thanh thông báo trạng thái */}
            {syncStatus.message && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-8 py-4 rounded-[2rem] shadow-2xl flex items-center gap-4 animate-fadeIn font-bold text-sm">
                    {syncStatus.loading ? <RefreshCw size={20} className="animate-spin text-blue-400" /> : <CheckCircle2 size={20} className="text-emerald-400" />}
                    {syncStatus.message}
                </div>
            )}

            <header className="bg-white border-b-2 border-slate-100 p-4 sticky top-0 z-50">
                <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 p-2.5 rounded-2xl text-white shadow-lg"><LayoutDashboard size={24}/></div>
                        <div><h1 className="font-black text-xl leading-none">THCS PRO</h1><span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Hệ thống Quản lý Giảng dạy</span></div>
                    </div>
                    <nav className="flex gap-1 bg-slate-100 p-1 rounded-[1.5rem] w-full md:w-auto overflow-x-auto no-scrollbar">
                        {[
                            {id: 'config', icon: Settings, label: 'CẤU HÌNH'},
                            {id: 'teachers', icon: Users, label: 'PHÂN CÔNG'},
                            {id: 'weekly', icon: CalendarDays, label: 'TIẾT DẠY'},
                            {id: 'reports', icon: FileText, label: 'BÁO CÁO'},
                            {id: 'backup', icon: Save, label: 'SAO LƯU'}
                        ].map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-sm scale-105' : 'text-slate-400 hover:text-slate-600'}`}>
                                <tab.icon size={16}/> {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>
            </header>

            <main className="container mx-auto p-4 flex-1">
                <div className="bg-white rounded-[3rem] shadow-2xl border-2 border-slate-100 min-h-[600px] overflow-hidden">
                    {activeTab === 'config' && <ConfigTab />}
                    {activeTab === 'teachers' && <TeacherTab />}
                    {activeTab === 'weekly' && <WeeklyTab />}
                    {activeTab === 'reports' && <ReportTab />}
                    {activeTab === 'backup' && <BackupTab />}
                </div>
            </main>

            <footer className="p-8 text-center text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">
                Dữ liệu được bảo mật cục bộ & Hỗ trợ Cloud Sync
            </footer>
        </div>
    );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
