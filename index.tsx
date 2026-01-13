
import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { 
    LayoutDashboard, Users, CalendarDays, FileText, Settings, 
    Trash2, Edit3, Check, X, FileUp, ChevronLeft, ChevronRight, 
    RefreshCw, Cloud, CloudUpload, CloudDownload, Save, 
    CheckCircle2, AlertTriangle, ShieldCheck, TrendingUp, BookOpen, Download, Upload,
    ClipboardCheck, Copy, Plus, FileSpreadsheet, UserPlus, Hash, Book
} from 'lucide-react';

// --- CẤU HÌNH HỆ THỐNG ---
const STORAGE_KEY = 'thcs_mgmt_v3_auto_calc';

// Định mức môn học mặc định (THCS VN)
const DEFAULT_SUBJECT_CONFIGS = [
    { name: 'Toán', periods: 4 },
    { name: 'Ngữ văn', periods: 4 },
    { name: 'Tiếng Anh', periods: 3 },
    { name: 'Vật lý', periods: 1 },
    { name: 'Hóa học', periods: 2 },
    { name: 'Sinh học', periods: 2 },
    { name: 'Lịch sử', periods: 1.5 },
    { name: 'Địa lý', periods: 1.5 },
    { name: 'GDCD', periods: 1 },
    { name: 'Tin học', periods: 1 },
    { name: 'Công nghệ', periods: 1 },
    { name: 'Thể dục', periods: 2 },
    { name: 'Nhạc - Họa', periods: 1 },
    { name: 'HĐTN - HN', periods: 3 }
];

const App = () => {
    const [activeTab, setActiveTab] = useState('teachers');
    const [syncStatus, setSyncStatus] = useState({ loading: false, message: '', type: '' });
    const [currentWeek, setCurrentWeek] = useState(1);
    const [isAddingDirect, setIsAddingDirect] = useState(false);
    const [newTeacher, setNewTeacher] = useState({ name: '', assignments: '' });

    const [data, setData] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : { 
            standardQuota: 19, 
            cloudUrl: '',
            subjectConfigs: DEFAULT_SUBJECT_CONFIGS,
            teachers: [], 
            weeklyData: {} 
        };
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }, [data]);

    const updateData = (newData: any) => setData(prev => ({ ...prev, ...newData }));

    // --- LOGIC TÍNH TIẾT TỰ ĐỘNG ---
    // Cấu trúc chuỗi nhập: "Toán: 6A1, 6A2; Tin: 7A3"
    const calculatePeriods = (assignmentStr: string) => {
        if (!assignmentStr) return 0;
        let total = 0;
        const parts = assignmentStr.split(';');
        
        parts.forEach(part => {
            const [subjectPart, classesPart] = part.split(':');
            if (subjectPart && classesPart) {
                const subjectName = subjectPart.trim();
                const classCount = classesPart.split(',').filter(c => c.trim()).length;
                
                const config = data.subjectConfigs.find((s: any) => 
                    s.name.toLowerCase() === subjectName.toLowerCase()
                );
                
                const periodsPerClass = config ? config.periods : 0;
                total += (classCount * periodsPerClass);
            }
        });
        return total;
    };

    const pushToCloud = async () => {
        if (!data.cloudUrl) return alert("Vui lòng nhập Link App Script trong mục Cài đặt");
        setSyncStatus({ loading: true, message: 'Đang đẩy dữ liệu lên Cloud...', type: '' });
        try {
            await fetch(data.cloudUrl, { method: 'POST', mode: 'no-cors', body: JSON.stringify(data) });
            setSyncStatus({ loading: false, message: 'Đã hoàn tất lệnh gửi dữ liệu', type: 'success' });
        } catch (e) { setSyncStatus({ loading: false, message: 'Lỗi kết nối Cloud', type: 'error' }); }
        setTimeout(() => setSyncStatus({ loading: false, message: '', type: '' }), 3000);
    };

    const fetchFromCloud = async () => {
        if (!data.cloudUrl) return alert("Vui lòng nhập Link App Script");
        setSyncStatus({ loading: true, message: 'Đang tải từ Cloud...', type: '' });
        try {
            const res = await fetch(data.cloudUrl);
            const cloudData = await res.json();
            if (cloudData) { setData(cloudData); setSyncStatus({ loading: false, message: 'Đồng bộ thành công', type: 'success' }); }
        } catch (e) { setSyncStatus({ loading: false, message: 'Lỗi tải dữ liệu', type: 'error' }); }
        setTimeout(() => setSyncStatus({ loading: false, message: '', type: '' }), 3000);
    };

    // --- TAB CÀI ĐẶT (NÂNG CẤP) ---
    const ConfigTab = () => (
        <div className="p-8 animate-fadeIn">
            <h2 className="text-2xl font-black mb-8 text-slate-800">Cấu hình Hệ thống</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Phần 1: Cloud & Quota */}
                <div className="space-y-6">
                    <div className="bg-indigo-900 text-white p-8 rounded-[2.5rem] shadow-2xl">
                        <div className="flex items-center gap-3 mb-4"><Cloud className="text-indigo-300" /><h3 className="font-bold uppercase text-xs tracking-widest">Đồng bộ Cloud</h3></div>
                        <input type="text" placeholder="Dán link App Script..." className="w-full p-5 bg-white/10 border border-white/20 rounded-2xl text-sm mb-6 outline-none focus:bg-white/20" value={data.cloudUrl} onChange={e => updateData({cloudUrl: e.target.value})}/>
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={pushToCloud} className="bg-indigo-500 hover:bg-indigo-400 p-4 rounded-2xl font-bold flex items-center justify-center gap-3"><CloudUpload size={20}/> Gửi lên</button>
                            <button onClick={fetchFromCloud} className="bg-white/10 hover:bg-white/20 p-4 rounded-2xl font-bold flex items-center justify-center gap-3"><CloudDownload size={20}/> Tải về</button>
                        </div>
                    </div>
                    
                    <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm">
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Định mức giáo viên (Tiết/Tuần)</label>
                        <input type="number" value={data.standardQuota} onChange={e => updateData({standardQuota: parseFloat(e.target.value)})} className="text-5xl font-black text-blue-600 outline-none w-full bg-transparent"/>
                    </div>
                </div>

                {/* Phần 2: Định mức Môn học */}
                <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-emerald-100 text-emerald-600 p-2 rounded-xl"><Book size={18}/></div>
                        <h3 className="font-black text-slate-700 uppercase text-xs tracking-widest">Định mức Tiết/Môn</h3>
                    </div>
                    <div className="overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                        {data.subjectConfigs.map((s: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between py-3 border-b border-slate-50 group">
                                <span className="font-bold text-slate-600">{s.name}</span>
                                <div className="flex items-center gap-3">
                                    <input type="number" step="0.5" className="w-16 p-2 text-center bg-slate-50 rounded-xl font-black text-blue-600 border-2 border-transparent focus:border-blue-200 outline-none transition-all" value={s.periods} 
                                        onChange={e => {
                                            const newConfigs = [...data.subjectConfigs];
                                            newConfigs[idx].periods = parseFloat(e.target.value) || 0;
                                            updateData({ subjectConfigs: newConfigs });
                                        }}
                                    />
                                    <span className="text-[10px] font-black text-slate-300 uppercase">tiết/lớp</span>
                                </div>
                            </div>
                        ))}
                        <button onClick={() => updateData({ subjectConfigs: [...data.subjectConfigs, {name: 'Môn mới', periods: 1}] })} className="w-full mt-4 py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold text-xs hover:border-blue-300 hover:text-blue-500 transition-all">+ THÊM MÔN HỌC</button>
                    </div>
                </div>
            </div>
        </div>
    );

    // --- TAB PHÂN CÔNG (GIAO DIỆN MỚI) ---
    const TeacherTab = () => {
        const fileRef = useRef<HTMLInputElement>(null);
        
        const addTeacherDirectly = () => {
            if (!newTeacher.name) return alert("Nhập tên giáo viên");
            const teacher = {
                id: Date.now().toString(),
                name: newTeacher.name,
                assignments: newTeacher.assignments,
                roles: []
            };
            updateData({ teachers: [teacher, ...data.teachers] });
            setNewTeacher({ name: '', assignments: '' });
            setIsAddingDirect(false);
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
                    assignments: row['Phân công lớp'] || row['Lớp dạy'] || '',
                    roles: []
                }));
                updateData({ teachers: [...data.teachers, ...news] });
                setSyncStatus({ loading: false, message: `Đã nhập ${news.length} GV`, type: 'success' });
            };
            reader.readAsBinaryString(file);
        };

        return (
            <div className="p-8 animate-fadeIn">
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-10">
                    <div>
                        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Quản lý Phân công</h2>
                        <p className="text-xs font-bold text-blue-500 uppercase tracking-widest mt-2 flex items-center gap-2">
                            <Hash size={14}/> Hệ thống tự động tính tiết dạy từ danh sách lớp
                        </p>
                    </div>
                    
                    <div className="flex flex-wrap gap-3">
                        <button onClick={() => setIsAddingDirect(!isAddingDirect)} className="bg-blue-600 text-white px-8 py-4 rounded-[1.5rem] flex items-center gap-3 font-bold shadow-xl hover:bg-blue-700 transition-all active:scale-95">
                            <UserPlus size={20}/> {isAddingDirect ? 'Đóng form' : 'Thêm giáo viên'}
                        </button>
                        <div className="w-[2px] bg-slate-100 hidden md:block"></div>
                        <input type="file" ref={fileRef} className="hidden" onChange={handleImportExcel} accept=".xlsx, .xls"/>
                        <button onClick={() => fileRef.current?.click()} className="bg-white border-2 border-slate-100 text-slate-600 px-8 py-4 rounded-[1.5rem] flex items-center gap-3 font-bold hover:bg-slate-50 transition-all">
                            <FileSpreadsheet size={20} className="text-emerald-500"/> Nhập Excel
                        </button>
                    </div>
                </div>

                {isAddingDirect && (
                    <div className="mb-10 bg-indigo-50 border-2 border-indigo-100 p-8 rounded-[3rem] animate-fadeIn">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <label className="block text-[10px] font-black text-indigo-400 uppercase mb-2 ml-1">Họ và tên giáo viên</label>
                                <input type="text" placeholder="VD: Nguyễn Văn A" className="w-full p-5 bg-white rounded-2xl border-none shadow-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none" value={newTeacher.name} onChange={e => setNewTeacher({...newTeacher, name: e.target.value})}/>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-indigo-400 uppercase mb-2 ml-1">Phân công (Cú pháp: Môn: Lớp1, Lớp2; ...)</label>
                                <input type="text" placeholder="VD: Toán: 6A1, 6A2; Tin: 7A3" className="w-full p-5 bg-white rounded-2xl border-none shadow-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none" value={newTeacher.assignments} onChange={e => setNewTeacher({...newTeacher, assignments: e.target.value})}/>
                            </div>
                        </div>
                        <div className="flex justify-between items-center bg-white/50 p-4 rounded-2xl">
                            <div className="text-sm font-bold text-indigo-600">
                                <span className="opacity-50">Dự kiến:</span> {calculatePeriods(newTeacher.assignments)} tiết/tuần
                            </div>
                            <button onClick={addTeacherDirectly} className="bg-indigo-600 text-white px-10 py-3 rounded-xl font-black shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2"><Check size={18}/> XÁC NHẬN</button>
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-[3rem] border-2 border-slate-50 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b">
                            <tr>
                                <th className="p-8 text-[10px] font-black uppercase text-slate-400">Giáo viên & Chi tiết Lớp dạy</th>
                                <th className="p-8 text-center text-[10px] font-black uppercase text-slate-400">Tự động tính</th>
                                <th className="p-8"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.teachers.map((t: any) => {
                                const total = calculatePeriods(t.assignments);
                                return (
                                    <tr key={t.id} className="border-b group hover:bg-slate-50/50 transition-all">
                                        <td className="p-8">
                                            <div className="font-black text-slate-800 text-xl mb-2">{t.name}</div>
                                            <div className="flex flex-wrap gap-2">
                                                {t.assignments.split(';').map((part: string, i: number) => {
                                                    const [m, l] = part.split(':');
                                                    if (!m || !l) return null;
                                                    return (
                                                        <span key={i} className="bg-white border border-slate-100 px-3 py-1 rounded-lg text-[10px] font-bold text-slate-500 shadow-sm">
                                                            <b className="text-blue-600">{m.trim()}</b>: {l.trim()}
                                                        </span>
                                                    );
                                                })}
                                                <button onClick={() => {
                                                    const newStr = prompt("Sửa phân công cho " + t.name, t.assignments);
                                                    if (newStr !== null) updateData({teachers: data.teachers.map((x: any) => x.id === t.id ? {...x, assignments: newStr} : x)});
                                                }} className="text-blue-400 hover:text-blue-600 p-1 opacity-0 group-hover:opacity-100 transition-all"><Edit3 size={14}/></button>
                                            </div>
                                        </td>
                                        <td className="p-8 text-center">
                                            <div className="inline-block px-6 py-3 bg-blue-50 text-blue-700 rounded-2xl font-black text-2xl shadow-inner">
                                                {total} <span className="text-[10px] uppercase opacity-40 ml-1">tiết</span>
                                            </div>
                                        </td>
                                        <td className="p-8 text-right">
                                            <button onClick={() => updateData({teachers: data.teachers.filter((x: any) => x.id !== t.id)})} className="text-slate-200 hover:text-red-500 p-3"><Trash2 size={24}/></button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    // --- CÁC TAB KHÁC (TƯƠNG TỰ BẢN TRƯỚC) ---
    const WeeklyTab = () => {
        const [tempLogs, setTempLogs] = useState(data.weeklyData[currentWeek] || {});
        const save = () => {
            updateData({ weeklyData: { ...data.weeklyData, [currentWeek]: tempLogs } });
            setSyncStatus({ loading: false, message: 'Đã lưu tuần ' + currentWeek, type: 'success' });
            setTimeout(() => setSyncStatus({ loading: false, message: '', type: '' }), 2000);
        };
        const fillFromTKB = () => {
            const filled: any = {};
            data.teachers.forEach((t: any) => filled[t.id] = calculatePeriods(t.assignments));
            setTempLogs(filled);
        };
        return (
            <div className="p-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-10">
                    <div className="flex items-center gap-4 bg-white border-2 border-slate-100 p-2 rounded-3xl">
                        <button onClick={() => setCurrentWeek(Math.max(1, currentWeek-1))} className="p-4 hover:bg-slate-100 rounded-2xl transition-all"><ChevronLeft/></button>
                        <div className="px-10 text-center"><div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Ghi nhận</div><div className="text-3xl font-black">Tuần {currentWeek}</div></div>
                        <button onClick={() => setCurrentWeek(currentWeek+1)} className="p-4 hover:bg-slate-100 rounded-2xl transition-all"><ChevronRight/></button>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <button onClick={fillFromTKB} className="flex-1 md:flex-none bg-slate-100 text-slate-600 px-8 py-4 rounded-2xl font-bold flex gap-3 items-center justify-center hover:bg-slate-200 transition-all"><ClipboardCheck size={20}/> Tự động điền</button>
                        <button onClick={save} className="flex-1 md:flex-none bg-blue-600 text-white px-10 py-4 rounded-2xl font-black flex gap-3 items-center justify-center shadow-xl hover:bg-blue-700 active:scale-95 transition-all"><Save size={20}/> LƯU TIẾT DẠY</button>
                    </div>
                </div>
                <div className="bg-white rounded-[3rem] border-2 border-slate-50 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b">
                            <tr><th className="p-8 text-[10px] font-black uppercase text-slate-400">Giáo viên</th><th className="p-8 text-center text-[10px] font-black uppercase text-slate-400">Số tiết thực dạy</th></tr>
                        </thead>
                        <tbody>
                            {data.teachers.map((t: any) => {
                                const tkb = calculatePeriods(t.assignments);
                                return (
                                    <tr key={t.id} className="border-b hover:bg-slate-50/50 transition-all">
                                        <td className="p-8"><div className="font-bold text-slate-700 text-lg">{t.name}</div><div className="text-[10px] font-black text-slate-300 uppercase mt-1">Hệ thống tính: {tkb} tiết</div></td>
                                        <td className="p-8"><input type="number" step="0.5" className="w-28 mx-auto block text-center p-5 bg-emerald-50 border-2 border-emerald-100 rounded-3xl font-black text-3xl text-emerald-700 outline-none focus:bg-white focus:border-emerald-500 transition-all" value={tempLogs[t.id] || 0} onChange={e => setTempLogs({...tempLogs, [t.id]: parseFloat(e.target.value) || 0})}/></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const ReportTab = () => {
        const stats = useMemo(() => {
            return data.teachers.map((t: any) => {
                const tkb = calculatePeriods(t.assignments);
                const actual = data.weeklyData[currentWeek]?.[t.id] || 0;
                const diff = actual - tkb;
                return { ...t, tkb, actual, diff };
            });
        }, [data, currentWeek]);
        return (
            <div className="p-8">
                <div className="bg-white rounded-[3rem] border-2 border-slate-50 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b">
                            <tr><th className="p-8">Họ tên giáo viên</th><th className="p-8 text-center">Tiết tính toán</th><th className="p-8 text-center text-blue-600">Thực dạy</th><th className="p-8 text-center">Chênh lệch</th></tr>
                        </thead>
                        <tbody>
                            {stats.map((s: any) => (
                                <tr key={s.id} className="border-b hover:bg-slate-50 transition-all">
                                    <td className="p-8 font-black text-slate-700 text-lg">{s.name}</td>
                                    <td className="p-8 text-center text-slate-400 font-bold">{s.tkb}</td>
                                    <td className="p-8 text-center font-black text-3xl text-blue-600">{s.actual}</td>
                                    <td className="p-8 text-center">
                                        <span className={`px-6 py-2 rounded-full font-black text-sm shadow-sm ${s.diff >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                            {s.diff >= 0 ? `+${s.diff}` : s.diff} tiết
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
        <div className="p-8 text-center py-24 animate-fadeIn">
            <div className="max-w-xl mx-auto">
                <div className="w-24 h-24 bg-blue-100 text-blue-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner"><ShieldCheck size={48}/></div>
                <h2 className="text-4xl font-black text-slate-800 mb-4 tracking-tight">An toàn Dữ liệu</h2>
                <p className="text-slate-400 text-sm mb-12 leading-relaxed">Dữ liệu được lưu cục bộ trên trình duyệt. Bạn nên tải file sao lưu định kỳ để không bị mất dữ liệu khi dọn dẹp máy tính.</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button onClick={() => {
                        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a'); a.href = url; a.download = `THCS_PRO_BACKUP_${new Date().toISOString().split('T')[0]}.json`; a.click();
                    }} className="bg-blue-600 text-white px-10 py-5 rounded-[1.5rem] font-black shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-3"><Download size={24}/> Tải file Sao lưu</button>
                    <button onClick={() => { if(confirm("Xóa sạch toàn bộ dữ liệu?")) { localStorage.clear(); window.location.reload(); } }} className="text-red-500 font-bold px-10 py-5 rounded-[1.5rem] border-2 border-red-50 hover:bg-red-50 transition-all">Xóa trắng bộ nhớ</button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-blue-100">
            <header className="bg-white border-b-2 border-slate-100 p-4 sticky top-0 z-50">
                <div className="container mx-auto flex flex-col lg:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-xl rotate-3"><LayoutDashboard size={28}/></div>
                        <div>
                            <h1 className="font-black text-2xl leading-none tracking-tighter">THCS PRO <span className="text-blue-600 text-xs align-top">v3.0</span></h1>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1 block">Hệ thống Quản lý Chuyên môn</span>
                        </div>
                    </div>
                    <nav className="flex gap-1 bg-slate-100 p-1.5 rounded-[2rem] overflow-x-auto no-scrollbar w-full lg:w-auto">
                        {[
                            {id: 'config', icon: Settings, label: 'CÀI ĐẶT'},
                            {id: 'teachers', icon: Users, label: 'PHÂN CÔNG'},
                            {id: 'weekly', icon: CalendarDays, label: 'TIẾT DẠY'},
                            {id: 'reports', icon: FileText, label: 'BÁO CÁO'},
                            {id: 'backup', icon: Save, label: 'SAO LƯU'}
                        ].map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-8 py-4 rounded-[1.8rem] text-[10px] font-black transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-lg scale-105' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'}`}>
                                <tab.icon size={16}/> {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>
            </header>

            <main className="container mx-auto p-4 md:p-8 flex-1">
                <div className="bg-white rounded-[4rem] shadow-2xl border-4 border-white min-h-[700px] overflow-hidden">
                    {activeTab === 'config' && <ConfigTab />}
                    {activeTab === 'teachers' && <TeacherTab />}
                    {activeTab === 'weekly' && <WeeklyTab />}
                    {activeTab === 'reports' && <ReportTab />}
                    {activeTab === 'backup' && <BackupTab />}
                </div>
            </main>

            {syncStatus.message && (
                <div className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-10 py-5 rounded-[2.5rem] shadow-2xl flex items-center gap-4 animate-fadeIn font-black text-sm z-[100] border border-white/10">
                    {syncStatus.loading ? <RefreshCw size={24} className="animate-spin text-blue-400" /> : <CheckCircle2 size={24} className="text-emerald-400" />}
                    {syncStatus.message}
                </div>
            )}
        </div>
    );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
