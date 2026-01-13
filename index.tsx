
import React, { useState, useEffect, useMemo, useRef, memo } from 'react';
import ReactDOM from 'react-dom/client';
import { 
    LayoutDashboard, Users, CalendarDays, FileText, Settings, 
    Trash2, Edit3, Check, X, FileUp, ChevronLeft, ChevronRight, 
    RefreshCw, Cloud, CloudUpload, CloudDownload, Save, 
    CheckCircle2, AlertTriangle, ShieldCheck, TrendingUp, BookOpen, Download, Upload,
    ClipboardCheck, Copy, Plus, FileSpreadsheet, UserPlus, Hash, Book, ChevronDown,
    AlertCircle
} from 'lucide-react';

// --- CẤU HÌNH HỆ THỐNG ---
const STORAGE_KEY = 'thcs_mgmt_v4_final_stable';

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

// --- HÀM TRỢ GIÚP CHUẨN HÓA & KIỂM TRA ---
const normalizeClassStr = (str: string) => {
    if (!str) return '';
    return str.split(',')
              .map(s => s.trim().replace(/\s+/g, '').toUpperCase())
              .filter(s => s)
              .join(', ');
};

const findConflicts = (proposedAssignments: string, currentTeachers: any[], excludeTeacherId?: string) => {
    const conflicts: string[] = [];
    if (!proposedAssignments) return conflicts;

    const newParts = proposedAssignments.split(';');

    newParts.forEach(part => {
        const [subPart, clsPart] = part.split(':');
        if (!subPart || !clsPart) return;

        const subject = subPart.trim().toLowerCase();
        const inputClasses = clsPart.split(',')
            .map(c => c.trim().toUpperCase().replace(/\s+/g, ''))
            .filter(c => c);

        currentTeachers.forEach(teacher => {
            if (excludeTeacherId && teacher.id === excludeTeacherId) return;

            const existingParts = teacher.assignments.split(';');
            existingParts.forEach(exPart => {
                const [exSub, exClsPart] = exPart.split(':');
                if (!exSub || !exClsPart) return;

                if (exSub.trim().toLowerCase() === subject) {
                    const exClasses = exClsPart.split(',')
                        .map(c => c.trim().toUpperCase().replace(/\s+/g, ''))
                        .filter(c => c);

                    inputClasses.forEach(c => {
                        if (exClasses.includes(c)) {
                            conflicts.push(`Lớp ${c} môn ${subPart.trim()} (GV: ${teacher.name})`);
                        }
                    });
                }
            });
        });
    });
    return conflicts;
};

const App = () => {
    const [activeTab, setActiveTab] = useState('teachers');
    const [syncStatus, setSyncStatus] = useState({ loading: false, message: '', type: '' });
    const [currentWeek, setCurrentWeek] = useState(1);

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

    const updateData = (newData: any) => setData((prev: any) => ({ ...prev, ...newData }));

    const getTeacherPeriods = useMemo(() => {
        const configMap = new Map<string, number>(
            (data.subjectConfigs || []).map((s: any) => [String(s.name).toLowerCase(), Number(s.periods)])
        );
        
        return (assignmentStr: string) => {
            if (!assignmentStr) return 0;
            let total = 0;
            assignmentStr.split(';').forEach(part => {
                const [sub, cls] = part.split(':');
                if (sub && cls) {
                    const periods = Number(configMap.get(sub.trim().toLowerCase()) || 0);
                    const classCount = cls.split(',').filter(c => c.trim()).length;
                    total += (periods * classCount);
                }
            });
            return total;
        };
    }, [data.subjectConfigs]);

    // --- FORM NHẬP TAY (REAL-TIME) ---
    const AddTeacherForm = ({ onAdd, subjects, allTeachers }: any) => {
        const [name, setName] = useState('');
        const [sub, setSub] = useState('');
        const [cls, setCls] = useState('');
        const [liveConflicts, setLiveConflicts] = useState<string[]>([]);

        useEffect(() => {
            if (sub && cls) {
                const proposed = `${sub}: ${normalizeClassStr(cls)}`;
                const conflicts = findConflicts(proposed, allTeachers);
                setLiveConflicts(conflicts);
            } else { setLiveConflicts([]); }
        }, [sub, cls, allTeachers]);

        const handleSubmit = () => {
            if (!name || !sub || !cls) return alert("Vui lòng điền đủ thông tin!");
            if (liveConflicts.length > 0) return;

            const proposed = `${sub}: ${normalizeClassStr(cls)}`;
            onAdd({ name, assignments: proposed });
            setName(''); setSub(''); setCls('');
        };

        return (
            <div className="mb-10 bg-blue-50 border-2 border-blue-100 p-8 rounded-[3rem] animate-fadeIn shadow-inner">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-blue-400 uppercase ml-2">Họ tên giáo viên</label>
                        <input type="text" placeholder="Nguyễn Văn A" className="w-full p-5 bg-white rounded-2xl border-none shadow-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500" value={name} onChange={e => setName(e.target.value)}/>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-blue-400 uppercase ml-2">Môn học</label>
                        <div className="relative">
                            <select className={`w-full p-5 bg-white rounded-2xl border-none shadow-sm font-bold text-slate-700 outline-none focus:ring-2 ${liveConflicts.length > 0 ? 'ring-2 ring-red-400' : 'focus:ring-blue-500'} appearance-none`} value={sub} onChange={e => setSub(e.target.value)}>
                                <option value="">-- Chọn môn --</option>
                                {subjects.map((s: any) => <option key={s.name} value={s.name}>{s.name}</option>)}
                            </select>
                            <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={20}/>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-blue-400 uppercase ml-2">Danh sách lớp (vd: 6a1, 7a2)</label>
                        <input type="text" placeholder="6a1, 7a2" className={`w-full p-5 bg-white rounded-2xl border-none shadow-sm font-bold text-slate-700 outline-none focus:ring-2 ${liveConflicts.length > 0 ? 'ring-2 ring-red-400' : 'focus:ring-blue-500'}`} value={cls} onChange={e => setCls(e.target.value)}/>
                    </div>
                </div>

                {liveConflicts.length > 0 && (
                    <div className="mb-6 bg-red-100 border-2 border-red-200 p-4 rounded-2xl flex items-center gap-4 animate-fadeIn">
                        <AlertCircle className="text-red-500" size={20}/>
                        <div className="text-[11px] font-bold text-red-600 uppercase">BỊ TRÙNG: {liveConflicts.join(' | ')}</div>
                    </div>
                )}

                <div className="flex justify-between items-center">
                    <p className="text-[10px] font-bold text-blue-400/60 uppercase italic">Hệ thống phản hồi tức thì để bạn chỉnh sửa ngay lập tức.</p>
                    <button onClick={handleSubmit} disabled={liveConflicts.length > 0} className={`px-12 py-4 rounded-2xl font-black shadow-xl transition-all flex items-center gap-2 ${liveConflicts.length > 0 ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'}`}>
                        {liveConflicts.length > 0 ? <X size={20}/> : <Plus size={20}/>} XÁC NHẬN THÊM
                    </button>
                </div>
            </div>
        );
    };

    // --- TAB PHÂN CÔNG ---
    const TeacherTab = () => {
        const [isAdding, setIsAdding] = useState(false);
        const fileRef = useRef<HTMLInputElement>(null);

        const exportTemplate = () => {
            const templateData = [
                { "Họ tên": "Nguyễn Văn A", "Phân công (Môn: Lớp1, Lớp2)": "Toán: 6A1, 6A2; Tin: 7A3" },
                { "Họ tên": "Trần Thị B", "Phân công (Môn: Lớp1, Lớp2)": "Ngữ văn: 8A1, 9A2" }
            ];
            const ws = (window as any).XLSX.utils.json_to_sheet(templateData);
            const wb = (window as any).XLSX.utils.book_new();
            (window as any).XLSX.utils.book_append_sheet(wb, ws, "Mau_Phan_Cong");
            (window as any).XLSX.writeFile(wb, "Mau_Phan_Cong_THCS.xlsx");
        };

        const handleImport = (e: any) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt: any) => {
                const wb = (window as any).XLSX.read(evt.target.result, {type:'binary'});
                const rows = (window as any).XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
                const errors: string[] = [];
                const validTeachers: any[] = [];
                let currentContext = [...data.teachers];

                rows.forEach((row: any, idx: number) => {
                    const name = row['Họ tên'] || row['tengv'] || 'GV mới';
                    const assignments = row['Phân công (Môn: Lớp1, Lớp2)'] || row['Phân công lớp'] || '';
                    const rowConflicts = findConflicts(assignments, currentContext);
                    if (rowConflicts.length > 0) errors.push(`Dòng ${idx + 2} (${name}): ${rowConflicts.join(', ')}`);
                    else {
                        const newGv = { id: (Date.now() + idx).toString(), name, assignments, roles: [] };
                        validTeachers.push(newGv);
                        currentContext.push(newGv);
                    }
                });

                if (errors.length > 0) {
                    alert(`LỖI TRÙNG LẤN:\n\n${errors.join('\n')}\n\nVui lòng sửa file mẫu và nhập lại!`);
                    if (fileRef.current) fileRef.current.value = '';
                    return;
                }

                updateData({ teachers: [...data.teachers, ...validTeachers] });
                setSyncStatus({ loading: false, message: `Đã nhập ${validTeachers.length} GV`, type: 'success' });
                setTimeout(() => setSyncStatus({ loading: false, message: '', type: '' }), 3000);
            };
            reader.readAsBinaryString(file);
        };

        return (
            <div className="p-8 animate-fadeIn">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
                    <div>
                        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Danh sách Phân công</h2>
                        <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-2">Dữ liệu chuẩn • Kiểm tra trùng lấn tức thì</div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button onClick={() => setIsAdding(!isAdding)} className="bg-blue-600 text-white px-8 py-4 rounded-2xl flex items-center gap-3 font-bold shadow-xl hover:bg-blue-700 transition-all">
                            <UserPlus size={20}/> {isAdding ? 'Đóng' : 'Thêm GV'}
                        </button>
                        <button onClick={exportTemplate} className="bg-white border-2 border-slate-100 text-slate-600 px-6 py-4 rounded-2xl flex items-center gap-3 font-bold hover:bg-slate-50 transition-all">
                            <Download size={20} className="text-blue-500"/> Tải file mẫu
                        </button>
                        <input type="file" ref={fileRef} className="hidden" onChange={handleImport} accept=".xlsx, .xls"/>
                        <button onClick={() => fileRef.current?.click()} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl flex items-center gap-3 font-bold shadow-xl hover:bg-emerald-700 transition-all">
                            <FileSpreadsheet size={20}/> Nhập Excel
                        </button>
                    </div>
                </div>

                {isAdding && <AddTeacherForm onAdd={(gv: any) => { updateData({ teachers: [gv, ...data.teachers] }); setIsAdding(false); }} subjects={data.subjectConfigs} allTeachers={data.teachers} />}

                <div className="bg-white rounded-[3rem] border-2 border-slate-50 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b">
                            <tr>
                                <th className="p-8 text-[10px] font-black uppercase text-slate-400">Giáo viên & Phân công</th>
                                <th className="p-8 text-center text-[10px] font-black uppercase text-slate-400">Tiết TKB</th>
                                <th className="p-8"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.teachers.map((t: any) => (
                                <tr key={t.id} className="border-b group hover:bg-slate-50/50 transition-all">
                                    <td className="p-8">
                                        <div className="font-black text-slate-800 text-xl mb-3">{t.name}</div>
                                        <div className="flex flex-wrap gap-2">
                                            {t.assignments.split(';').map((part: string, i: number) => {
                                                const [m, l] = part.split(':');
                                                if (!m || !l) return null;
                                                return (
                                                    <span key={i} className="bg-white border border-slate-100 px-4 py-2 rounded-xl text-[10px] font-black text-slate-500 shadow-sm flex items-center gap-2">
                                                        <span className="text-blue-600 uppercase font-black">{m.trim()}</span>
                                                        <span className="text-slate-800 font-bold">{normalizeClassStr(l)}</span>
                                                    </span>
                                                );
                                            })}
                                            <button onClick={() => {
                                                const news = prompt("Sửa phân công (vd: Toán: 6A1, 6A2):", t.assignments);
                                                if (news) {
                                                    const confs = findConflicts(news, data.teachers, t.id);
                                                    if (confs.length > 0) alert(`Lỗi: ${confs[0]}`);
                                                    else updateData({ teachers: data.teachers.map((x: any) => x.id === t.id ? {...x, assignments: news} : x) });
                                                }
                                            }} className="p-2 text-blue-400 opacity-0 group-hover:opacity-100 transition-all"><Edit3 size={16}/></button>
                                        </div>
                                    </td>
                                    <td className="p-8 text-center">
                                        <div className="inline-block px-8 py-4 bg-blue-50 text-blue-700 rounded-2xl font-black text-3xl">
                                            {getTeacherPeriods(t.assignments)}
                                        </div>
                                    </td>
                                    <td className="p-8 text-right">
                                        <button onClick={() => updateData({ teachers: data.teachers.filter((x: any) => x.id !== t.id) })} className="text-slate-200 hover:text-red-500 p-4 transition-all"><Trash2 size={24}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {data.teachers.length === 0 && <div className="p-32 text-center text-slate-300 font-bold uppercase text-xs tracking-widest italic">Dữ liệu phân công trống</div>}
                </div>
            </div>
        );
    };

    // --- CÁC TAB CƠ BẢN ---
    const ConfigTab = () => (
        <div className="p-8 animate-fadeIn">
            <h2 className="text-2xl font-black mb-8 text-slate-800">Cài đặt Hệ thống</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm">
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">Định mức GV chuẩn (Tiết/Tuần)</label>
                    <input type="number" value={data.standardQuota} onChange={e => updateData({standardQuota: parseFloat(e.target.value)})} className="text-6xl font-black text-blue-600 outline-none w-full bg-transparent"/>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm overflow-hidden">
                   <h3 className="font-black text-slate-700 uppercase text-xs tracking-widest mb-6">Môn học & Định mức</h3>
                   <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                       {data.subjectConfigs.map((s: any, i: number) => (
                           <div key={i} className="flex justify-between items-center py-2 border-b border-slate-50">
                               <span className="font-bold text-slate-600 uppercase text-xs">{s.name}</span>
                               <input type="number" step="0.5" className="w-16 p-2 bg-slate-50 rounded-xl text-center font-bold text-blue-600" value={s.periods} onChange={e => {
                                   const nc = [...data.subjectConfigs]; nc[i].periods = parseFloat(e.target.value); updateData({subjectConfigs: nc});
                               }}/>
                           </div>
                       ))}
                   </div>
                </div>
            </div>
        </div>
    );

    const WeeklyTab = () => {
        const [tempLogs, setTempLogs] = useState(data.weeklyData[currentWeek] || {});
        return (
            <div className="p-8">
                <div className="flex justify-between items-center mb-12">
                    <div className="flex items-center gap-4 bg-white border-2 border-slate-100 p-3 rounded-[2.5rem]">
                        <button onClick={() => setCurrentWeek(Math.max(1, currentWeek-1))} className="p-5 hover:bg-slate-100 rounded-3xl transition-all"><ChevronLeft/></button>
                        <div className="px-12 text-center text-3xl font-black tracking-tighter">Tuần {currentWeek}</div>
                        <button onClick={() => setCurrentWeek(currentWeek+1)} className="p-5 hover:bg-slate-100 rounded-3xl transition-all"><ChevronRight/></button>
                    </div>
                    <button onClick={() => { updateData({ weeklyData: {...data.weeklyData, [currentWeek]: tempLogs} }); alert("Đã lưu!"); }} className="bg-blue-600 text-white px-12 py-5 rounded-3xl font-black shadow-xl hover:bg-blue-700 transition-all">LƯU DỮ LIỆU</button>
                </div>
                <div className="bg-white rounded-[3.5rem] border-2 border-slate-50 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b">
                            <tr><th className="p-8 text-[10px] font-black uppercase text-slate-400">Giáo viên</th><th className="p-8 text-center text-[10px] font-black uppercase text-slate-400">Thực dạy tuần này</th></tr>
                        </thead>
                        <tbody>
                            {data.teachers.map((t: any) => (
                                <tr key={t.id} className="border-b hover:bg-slate-50/50 transition-all">
                                    <td className="p-8"><div className="font-black text-slate-700 text-xl">{t.name}</div></td>
                                    <td className="p-8"><input type="number" step="0.5" className="w-32 mx-auto block text-center p-6 bg-emerald-50 rounded-[2.5rem] font-black text-4xl text-emerald-700 outline-none focus:bg-white focus:border-emerald-500 transition-all shadow-inner" value={tempLogs[t.id] || 0} onChange={e => setTempLogs({...tempLogs, [t.id]: parseFloat(e.target.value) || 0})}/></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const ReportTab = () => (
        <div className="p-8 text-center py-32 animate-fadeIn">
            <div className="max-w-md mx-auto">
                <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8"><FileText size={40}/></div>
                <h2 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">Báo cáo Tổng hợp</h2>
                <p className="text-slate-400 text-sm leading-relaxed">Tính năng báo cáo lũy tiến đang được đồng bộ dữ liệu. Bạn có thể xem bảng thực dạy tại tab "Tiết dạy" để đối chiếu.</p>
            </div>
        </div>
    );

    const BackupTab = () => (
        <div className="p-8 text-center py-24 animate-fadeIn">
            <h2 className="text-3xl font-black text-slate-800 mb-8 tracking-tight">Sao lưu An toàn</h2>
            <button onClick={() => {
                const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = `backup_thcs_${new Date().toLocaleDateString()}.json`; a.click();
            }} className="bg-blue-600 text-white px-12 py-6 rounded-[2rem] font-black shadow-xl hover:bg-blue-700 transition-all flex items-center gap-3 mx-auto"><Download size={24}/> Tải về bản sao lưu (.json)</button>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            <header className="bg-white border-b-2 border-slate-100 p-5 sticky top-0 z-50 shadow-sm">
                <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg rotate-3"><LayoutDashboard size={24}/></div>
                        <h1 className="font-black text-2xl tracking-tighter text-slate-800">THCS PRO <span className="text-blue-600 text-sm align-top">v4.0</span></h1>
                    </div>
                    <nav className="flex gap-1 bg-slate-100 p-1.5 rounded-[2.2rem] overflow-x-auto no-scrollbar max-w-full">
                        {[
                            {id: 'config', icon: Settings, label: 'Cài đặt'},
                            {id: 'teachers', icon: Users, label: 'Phân công'},
                            {id: 'weekly', icon: CalendarDays, label: 'Tiết dạy'},
                            {id: 'reports', icon: FileText, label: 'Báo cáo'},
                            {id: 'backup', icon: Save, label: 'Sao lưu'}
                        ].map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-6 py-3.5 rounded-[1.8rem] text-[11px] font-black transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-md scale-105' : 'text-slate-400 hover:text-slate-600'}`}>
                                <tab.icon size={16}/> {tab.label.toUpperCase()}
                            </button>
                        ))}
                    </nav>
                </div>
            </header>

            <main className="container mx-auto p-4 md:p-10 flex-1">
                <div className="bg-white rounded-[4rem] shadow-2xl border-4 border-white min-h-[700px] overflow-hidden">
                    {activeTab === 'config' && <ConfigTab />}
                    {activeTab === 'teachers' && <TeacherTab />}
                    {activeTab === 'weekly' && <WeeklyTab />}
                    {activeTab === 'reports' && <ReportTab />}
                    {activeTab === 'backup' && <BackupTab />}
                </div>
            </main>
        </div>
    );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
