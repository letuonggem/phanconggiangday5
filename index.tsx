
import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { 
    LayoutDashboard, Users, CalendarDays, FileText, Settings, 
    Trash2, Edit3, Check, X, FileUp, ChevronLeft, ChevronRight, 
    RefreshCw, Cloud, CloudUpload, CloudDownload, Save, 
    CheckCircle2, AlertTriangle, ShieldCheck, TrendingUp, BookOpen, Download, Upload,
    ClipboardCheck, Copy, Plus, FileSpreadsheet, UserPlus
} from 'lucide-react';

// --- CẤU HÌNH HỆ THỐNG ---
const STORAGE_KEY = 'thcs_mgmt_final_v1';

const App = () => {
    const [activeTab, setActiveTab] = useState('teachers');
    const [syncStatus, setSyncStatus] = useState({ loading: false, message: '', type: '' });
    const [currentWeek, setCurrentWeek] = useState(1);
    const [isAddingDirect, setIsAddingDirect] = useState(false);
    const [newTeacher, setNewTeacher] = useState({ name: '', subjects: '', assignedPeriods: 0 });

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

    // --- LOGIC EXCEL NÂNG CAO ---
    const exportTemplate = () => {
        const templateData = [
            { "Họ tên": "Nguyễn Văn A", "Môn dạy": "Toán, Tin", "Số tiết": 15 },
            { "Họ tên": "Trần Thị B", "Môn dạy": "Ngữ văn", "Số tiết": 17 }
        ];
        const ws = (window as any).XLSX.utils.json_to_sheet(templateData);
        const wb = (window as any).XLSX.utils.book_new();
        (window as any).XLSX.utils.book_append_sheet(wb, ws, "Mau_Phan_Cong");
        (window as any).XLSX.writeFile(wb, "Mau_Phan_Cong_Giang_Day.xlsx");
    };

    const handleImportExcel = (e: any) => {
        const file = e.target.files[0];
        if (!file) return;
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
            setSyncStatus({ loading: false, message: `Đã nhập ${news.length} giáo viên`, type: 'success' });
            setTimeout(() => setSyncStatus({ loading: false, message: '', type: '' }), 3000);
        };
        reader.readAsBinaryString(file);
    };

    const addTeacherDirectly = () => {
        if (!newTeacher.name) return alert("Vui lòng nhập tên giáo viên");
        const teacher = {
            id: Date.now().toString(),
            ...newTeacher,
            roles: []
        };
        updateData({ teachers: [teacher, ...data.teachers] });
        setNewTeacher({ name: '', subjects: '', assignedPeriods: 0 });
        setIsAddingDirect(false);
    };

    // --- LOGIC CLOUD SYNC ---
    // Fix: Added missing pushToCloud function for remote synchronization
    const pushToCloud = async () => {
        if (!data.cloudUrl) return alert("Vui lòng nhập Link App Script trong mục Cài đặt");
        setSyncStatus({ loading: true, message: 'Đang đẩy dữ liệu lên Cloud...', type: '' });
        try {
            await fetch(data.cloudUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            setSyncStatus({ loading: false, message: 'Đã hoàn tất lệnh gửi dữ liệu', type: 'success' });
        } catch (e) {
            setSyncStatus({ loading: false, message: 'Lỗi kết nối máy chủ Cloud', type: 'error' });
        }
        setTimeout(() => setSyncStatus({ loading: false, message: '', type: '' }), 3000);
    };

    // Fix: Added missing fetchFromCloud function for remote synchronization
    const fetchFromCloud = async () => {
        if (!data.cloudUrl) return alert("Vui lòng nhập Link App Script trong mục Cài đặt");
        setSyncStatus({ loading: true, message: 'Đang tải dữ liệu từ Cloud...', type: '' });
        try {
            const response = await fetch(data.cloudUrl);
            const cloudData = await response.json();
            if (cloudData) {
                setData(cloudData);
                setSyncStatus({ loading: false, message: 'Đồng bộ Cloud thành công', type: 'success' });
            }
        } catch (e) {
            setSyncStatus({ loading: false, message: 'Lỗi khi tải dữ liệu từ Cloud', type: 'error' });
        }
        setTimeout(() => setSyncStatus({ loading: false, message: '', type: '' }), 3000);
    };

    // --- TAB PHÂN CÔNG (GIAO DIỆN MỚI) ---
    const TeacherTab = () => {
        const fileRef = useRef<HTMLInputElement>(null);
        return (
            <div className="p-8 animate-fadeIn">
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-8">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800">Quản lý Phân công</h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Chọn hình thức nhập liệu phù hợp</p>
                    </div>
                    
                    <div className="flex flex-wrap gap-3">
                        <button onClick={() => setIsAddingDirect(!isAddingDirect)} className="bg-blue-600 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-bold shadow-lg hover:bg-blue-700 transition-all active:scale-95">
                            <UserPlus size={18}/> {isAddingDirect ? 'Đóng lại' : 'Thêm trực tiếp'}
                        </button>
                        <div className="h-10 w-[2px] bg-slate-100 hidden md:block self-center"></div>
                        <button onClick={exportTemplate} className="bg-white border-2 border-slate-100 text-slate-600 px-6 py-3 rounded-2xl flex items-center gap-2 font-bold hover:bg-slate-50 transition-all">
                            <Download size={18}/> Tải file mẫu
                        </button>
                        <input type="file" ref={fileRef} className="hidden" onChange={handleImportExcel} accept=".xlsx, .xls"/>
                        <button onClick={() => fileRef.current?.click()} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-bold shadow-lg hover:bg-emerald-700 transition-all active:scale-95">
                            <FileSpreadsheet size={18}/> Nhập Excel
                        </button>
                    </div>
                </div>

                {/* Form nhập trực tiếp (Hiển thị khi bấm nút) */}
                {isAddingDirect && (
                    <div className="mb-8 bg-blue-50 border-2 border-blue-100 p-6 rounded-[2rem] animate-fadeIn grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="md:col-span-1">
                            <label className="block text-[10px] font-black text-blue-400 uppercase mb-2 ml-1">Họ và tên</label>
                            <input type="text" placeholder="VD: Nguyễn Văn An" className="w-full p-4 bg-white rounded-2xl border-none shadow-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold" value={newTeacher.name} onChange={e => setNewTeacher({...newTeacher, name: e.target.value})}/>
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-[10px] font-black text-blue-400 uppercase mb-2 ml-1">Môn giảng dạy</label>
                            <input type="text" placeholder="VD: Toán, Lý" className="w-full p-4 bg-white rounded-2xl border-none shadow-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold" value={newTeacher.subjects} onChange={e => setNewTeacher({...newTeacher, subjects: e.target.value})}/>
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-[10px] font-black text-blue-400 uppercase mb-2 ml-1">Số tiết TKB</label>
                            <input type="number" className="w-full p-4 bg-white rounded-2xl border-none shadow-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold" value={newTeacher.assignedPeriods} onChange={e => setNewTeacher({...newTeacher, assignedPeriods: parseFloat(e.target.value) || 0})}/>
                        </div>
                        <button onClick={addTeacherDirectly} className="bg-blue-600 text-white p-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-blue-200 shadow-xl"><Check/> XÁC NHẬN</button>
                    </div>
                )}

                <div className="bg-white rounded-[2.5rem] border-2 border-slate-50 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b">
                            <tr>
                                <th className="p-6 text-[10px] font-black uppercase text-slate-400">Giáo viên & Chuyên môn</th>
                                <th className="p-6 text-center text-[10px] font-black uppercase text-slate-400">Số tiết TKB</th>
                                <th className="p-6"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.teachers.map((t: any) => (
                                <tr key={t.id} className="border-b group hover:bg-slate-50 transition-all">
                                    <td className="p-6">
                                        <div className="font-bold text-slate-800 text-lg">{t.name}</div>
                                        <div className="text-[10px] font-black text-blue-400 uppercase tracking-tighter">{t.subjects || 'Chưa phân môn'}</div>
                                    </td>
                                    <td className="p-6">
                                        <input type="number" className="w-24 mx-auto block text-center p-3 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl font-black text-slate-700 outline-none transition-all" value={t.assignedPeriods} onChange={e => updateData({teachers: data.teachers.map((x: any) => x.id === t.id ? {...x, assignedPeriods: parseFloat(e.target.value)} : x)})}/>
                                    </td>
                                    <td className="p-6 text-right">
                                        <button onClick={() => updateData({teachers: data.teachers.filter((x: any) => x.id !== t.id)})} className="text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-2"><Trash2 size={20}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {data.teachers.length === 0 && (
                        <div className="py-32 text-center">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200"><Users size={40}/></div>
                            <p className="text-slate-300 font-bold uppercase text-xs tracking-widest">Danh sách đang trống</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // --- CÁC TAB KHÁC GIỮ NGUYÊN ---
    const ConfigTab = () => (
        <div className="p-8 animate-fadeIn">
            <h2 className="text-2xl font-black mb-6">Cài đặt & Cloud</h2>
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

    const WeeklyTab = () => {
        const [tempLogs, setTempLogs] = useState(data.weeklyData[currentWeek] || {});
        const teacherStats = useMemo(() => {
            return data.teachers.map((t: any) => ({ ...t, actual: tempLogs[t.id] || 0 }));
        }, [data.teachers, tempLogs]);

        const save = () => {
            updateData({ weeklyData: { ...data.weeklyData, [currentWeek]: tempLogs } });
            setSyncStatus({ loading: false, message: 'Đã lưu tuần ' + currentWeek, type: 'success' });
            setTimeout(() => setSyncStatus({ loading: false, message: '', type: '' }), 2000);
        };

        const fillFromTKB = () => {
            const filled: any = {};
            data.teachers.forEach((t: any) => filled[t.id] = t.assignedPeriods);
            setTempLogs(filled);
        };

        return (
            <div className="p-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
                    <div className="flex items-center gap-4 bg-white border-2 border-slate-100 p-2 rounded-3xl">
                        <button onClick={() => setCurrentWeek(Math.max(1, currentWeek-1))} className="p-3 hover:bg-slate-100 rounded-2xl transition-all"><ChevronLeft/></button>
                        <div className="px-6 text-center"><div className="text-[10px] font-black text-blue-500 uppercase">Đang chọn</div><div className="text-2xl font-black">Tuần {currentWeek}</div></div>
                        <button onClick={() => setCurrentWeek(currentWeek+1)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all"><ChevronRight/></button>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <button onClick={fillFromTKB} className="flex-1 md:flex-none bg-slate-100 text-slate-600 px-6 py-4 rounded-2xl font-bold flex gap-2 items-center justify-center hover:bg-slate-200 transition-all"><ClipboardCheck size={18}/> Lấy từ TKB</button>
                        <button onClick={save} className="flex-1 md:flex-none bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold flex gap-2 items-center justify-center shadow-lg hover:bg-blue-700 transition-all active:scale-95"><Save size={18}/> Lưu dữ liệu</button>
                    </div>
                </div>
                <div className="bg-white rounded-[2rem] border-2 border-slate-50 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b">
                            <tr><th className="p-6 text-[10px] font-black uppercase text-slate-400">Giáo viên</th><th className="p-6 text-center text-[10px] font-black uppercase text-slate-400">Thực dạy tuần {currentWeek}</th></tr>
                        </thead>
                        <tbody>
                            {data.teachers.map((t: any) => (
                                <tr key={t.id} className="border-b">
                                    <td className="p-6"><div className="font-bold text-slate-700">{t.name}</div><div className="text-[10px] font-black text-slate-300">ĐỊNH MỨC: {t.assignedPeriods} TIẾT</div></td>
                                    <td className="p-6"><input type="number" className="w-24 mx-auto block text-center p-4 bg-emerald-50 border-2 border-emerald-100 rounded-2xl font-black text-emerald-700 outline-none focus:border-emerald-500 transition-all" value={tempLogs[t.id] || 0} onChange={e => setTempLogs({...tempLogs, [t.id]: parseFloat(e.target.value) || 0})}/></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const ReportTab = () => {
        const stats = useMemo(() => {
            return data.teachers.map((t: any) => {
                const actual = data.weeklyData[currentWeek]?.[t.id] || 0;
                const diff = actual - t.assignedPeriods;
                return { ...t, actual, diff };
            });
        }, [data, currentWeek]);

        return (
            <div className="p-8">
                <h2 className="text-2xl font-black mb-6">Báo cáo nhanh Tuần {currentWeek}</h2>
                <div className="bg-white rounded-[2rem] border-2 border-slate-50 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b">
                            <tr><th className="p-6">Họ tên</th><th className="p-6 text-center">TKB</th><th className="p-6 text-center">Thực dạy</th><th className="p-6 text-center">Chênh lệch</th></tr>
                        </thead>
                        <tbody>
                            {stats.map((s: any) => (
                                <tr key={s.id} className="border-b hover:bg-slate-50">
                                    <td className="p-6 font-bold text-slate-700">{s.name}</td>
                                    <td className="p-6 text-center text-slate-400 font-bold">{s.assignedPeriods}</td>
                                    <td className="p-6 text-center font-black text-blue-600">{s.actual}</td>
                                    <td className="p-6 text-center">
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
    };

    const BackupTab = () => (
        <div className="p-8 text-center py-24">
            <div className="max-w-md mx-auto">
                <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner"><ShieldCheck size={40}/></div>
                <h2 className="text-3xl font-black mb-4">An toàn & Bảo mật</h2>
                <p className="text-slate-400 text-sm mb-10 leading-relaxed">Dữ liệu của bạn được lưu trữ tại trình duyệt máy tính này. Chúng tôi khuyến nghị bạn tải file sao lưu về máy định kỳ để phòng ngừa rủi ro.</p>
                <div className="flex flex-col gap-3">
                    <button onClick={() => {
                        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a'); a.href = url; a.download = `THCS_PRO_BACKUP_${new Date().toLocaleDateString()}.json`; a.click();
                    }} className="bg-blue-600 text-white p-6 rounded-2xl font-black shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-3"><Download size={24}/> Tải file Sao lưu (.json)</button>
                    <button onClick={() => { if(confirm("CẢNH BÁO: Hành động này sẽ xóa sạch toàn bộ dữ liệu hiện tại. Bạn có chắc chắn?")) { localStorage.clear(); window.location.reload(); } }} className="text-red-500 font-bold p-6 rounded-2xl border-2 border-red-50 hover:bg-red-50 transition-all">Thiết lập lại từ đầu (Xóa sạch)</button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            <header className="bg-white border-b-2 border-slate-100 p-4 sticky top-0 z-50">
                <div className="container mx-auto flex flex-col lg:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 p-2.5 rounded-2xl text-white shadow-xl"><LayoutDashboard size={24}/></div>
                        <div>
                            <h1 className="font-black text-xl leading-none tracking-tight">THCS PRO</h1>
                            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1 block">Quản lý Chuyên môn 4.0</span>
                        </div>
                    </div>
                    <nav className="flex gap-1 bg-slate-100 p-1 rounded-[1.8rem] overflow-x-auto no-scrollbar w-full lg:w-auto">
                        {[
                            {id: 'config', icon: Settings, label: 'CÀI ĐẶT'},
                            {id: 'teachers', icon: Users, label: 'PHÂN CÔNG'},
                            {id: 'weekly', icon: CalendarDays, label: 'TIẾT DẠY'},
                            {id: 'reports', icon: FileText, label: 'BÁO CÁO'},
                            {id: 'backup', icon: Save, label: 'SAO LƯU'}
                        ].map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-6 py-3 rounded-[1.5rem] text-[10px] font-black transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-md scale-105' : 'text-slate-400 hover:text-slate-600'}`}>
                                <tab.icon size={16}/> {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>
            </header>

            <main className="container mx-auto p-4 flex-1">
                <div className="bg-white rounded-[3.5rem] shadow-2xl border-2 border-slate-100 min-h-[650px] overflow-hidden">
                    {activeTab === 'config' && <ConfigTab />}
                    {activeTab === 'teachers' && <TeacherTab />}
                    {activeTab === 'weekly' && <WeeklyTab />}
                    {activeTab === 'reports' && <ReportTab />}
                    {activeTab === 'backup' && <BackupTab />}
                </div>
            </main>

            {syncStatus.message && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-8 py-4 rounded-[2rem] shadow-2xl flex items-center gap-4 animate-fadeIn font-bold text-sm z-[100]">
                    {syncStatus.loading ? <RefreshCw size={20} className="animate-spin text-blue-400" /> : <CheckCircle2 size={20} className="text-emerald-400" />}
                    {syncStatus.message}
                </div>
            )}
        </div>
    );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
