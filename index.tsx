
import React, { useState, useEffect, useMemo, useRef, memo } from 'react';
import ReactDOM from 'react-dom/client';
import { 
    LayoutDashboard, Users, CalendarDays, FileText, Settings, 
    Trash2, Edit3, Check, X, FileUp, ChevronLeft, ChevronRight, 
    RefreshCw, Cloud, CloudUpload, CloudDownload, Save, 
    CheckCircle2, AlertTriangle, ShieldCheck, TrendingUp, BookOpen, Download, Upload,
    ClipboardCheck, Copy, Plus, FileSpreadsheet, UserPlus, Hash, Book, ChevronDown
} from 'lucide-react';

// --- CẤU HÌNH HỆ THỐNG ---
const STORAGE_KEY = 'thcs_mgmt_v4_perf';

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

// --- HÀM TRỢ GIÚP ---
const normalizeClassStr = (str: string) => {
    if (!str) return '';
    return str.split(',')
              .map(s => s.trim().replace(/\s+/g, '').toUpperCase())
              .filter(s => s)
              .join(', ');
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

    // --- LOGIC TÍNH TIẾT (Memoized để tránh lag) ---
    const getTeacherPeriods = useMemo(() => {
        // Fix TS2362: Explicitly type configMap and ensure periods are numbers to avoid errors on arithmetic operations
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
                    // Ensure arithmetic operands are of numeric types
                    total += (periods * classCount);
                }
            });
            return total;
        };
    }, [data.subjectConfigs]);

    // --- CLOUD SYNC ---
    const pushToCloud = async () => {
        if (!data.cloudUrl) return alert("Vui lòng nhập Link App Script trong mục Cài đặt");
        setSyncStatus({ loading: true, message: 'Đang gửi dữ liệu...', type: '' });
        try {
            await fetch(data.cloudUrl, { method: 'POST', mode: 'no-cors', body: JSON.stringify(data) });
            setSyncStatus({ loading: false, message: 'Gửi thành công!', type: 'success' });
        } catch (e) { setSyncStatus({ loading: false, message: 'Lỗi kết nối Cloud', type: 'error' }); }
        setTimeout(() => setSyncStatus({ loading: false, message: '', type: '' }), 3000);
    };

    const fetchFromCloud = async () => {
        if (!data.cloudUrl) return alert("Vui lòng nhập Link App Script");
        setSyncStatus({ loading: true, message: 'Đang tải dữ liệu...', type: '' });
        try {
            const res = await fetch(data.cloudUrl);
            const cloudData = await res.json();
            if (cloudData) { setData(cloudData); setSyncStatus({ loading: false, message: 'Đồng bộ thành công!', type: 'success' }); }
        } catch (e) { setSyncStatus({ loading: false, message: 'Lỗi tải dữ liệu', type: 'error' }); }
        setTimeout(() => setSyncStatus({ loading: false, message: '', type: '' }), 3000);
    };

    // --- COMPONENT NHẬP LIỆU (Cô lập để fix lag) ---
    const AddTeacherForm = ({ onAdd, subjects }: any) => {
        const [name, setName] = useState('');
        const [sub, setSub] = useState('');
        const [cls, setCls] = useState('');

        const handleSubmit = () => {
            if (!name || !sub || !cls) return alert("Vui lòng điền đủ thông tin!");
            const assignment = `${sub}: ${normalizeClassStr(cls)}`;
            onAdd({ name, assignments: assignment });
            setName(''); setSub(''); setCls('');
        };

        return (
            <div className="mb-10 bg-blue-50 border-2 border-blue-100 p-8 rounded-[3rem] animate-fadeIn">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-blue-400 uppercase ml-2">Họ tên giáo viên</label>
                        <input type="text" placeholder="Nguyễn Văn A" className="w-full p-5 bg-white rounded-2xl border-none shadow-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500" value={name} onChange={e => setName(e.target.value)}/>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-blue-400 uppercase ml-2">Chọn môn học chính</label>
                        <div className="relative">
                            <select className="w-full p-5 bg-white rounded-2xl border-none shadow-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 appearance-none" value={sub} onChange={e => setSub(e.target.value)}>
                                <option value="">-- Chọn môn --</option>
                                {subjects.map((s: any) => <option key={s.name} value={s.name}>{s.name} ({s.periods}t)</option>)}
                            </select>
                            <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={20}/>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-blue-400 uppercase ml-2">Danh sách lớp dạy (Cách nhau dấu phẩy)</label>
                        <input type="text" placeholder="6a1, 7a2, 8a3" className="w-full p-5 bg-white rounded-2xl border-none shadow-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500" value={cls} onChange={e => setCls(e.target.value)}/>
                    </div>
                </div>
                <div className="flex justify-end">
                    <button onClick={handleSubmit} className="bg-blue-600 text-white px-12 py-4 rounded-2xl font-black shadow-xl hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2">
                        <Plus size={20}/> XÁC NHẬN THÊM
                    </button>
                </div>
            </div>
        );
    };

    // --- TAB PHÂN CÔNG ---
    const TeacherTab = () => {
        const [isAdding, setIsAdding] = useState(false);
        const fileRef = useRef<HTMLInputElement>(null);

        const handleAdd = (gv: any) => {
            updateData({ teachers: [{ id: Date.now().toString(), ...gv, roles: [] }, ...data.teachers] });
            setIsAdding(false);
        };

        const exportTemplate = () => {
            const templateData = [
                { "Họ tên": "Nguyễn Văn A", "Phân công (Môn: Lớp1, Lớp2)": "Toán: 6A1, 6A2; Tin: 7A3" },
                { "Họ tên": "Trần Thị B", "Phân công (Môn: Lớp1, Lớp2)": "Ngữ văn: 8A1, 9A2" }
            ];
            const ws = (window as any).XLSX.utils.json_to_sheet(templateData);
            const wb = (window as any).XLSX.utils.book_new();
            (window as any).XLSX.utils.book_append_sheet(wb, ws, "Mau_Phan_Cong");
            (window as any).XLSX.writeFile(wb, "Mau_Phan_Cong_Giang_Day.xlsx");
        };

        const handleImport = (e: any) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt: any) => {
                const wb = (window as any).XLSX.read(evt.target.result, {type:'binary'});
                const rows = (window as any).XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
                const news = rows.map((row: any, i: number) => ({
                    id: (Date.now()+i).toString(),
                    name: row['Họ tên'] || row['tengv'] || 'Giáo viên mới',
                    assignments: row['Phân công (Môn: Lớp1, Lớp2)'] || row['Phân công lớp'] || '',
                    roles: []
                }));
                updateData({ teachers: [...data.teachers, ...news] });
                setSyncStatus({ loading: false, message: `Đã nhập ${news.length} GV`, type: 'success' });
                setTimeout(() => setSyncStatus({ loading: false, message: '', type: '' }), 3000);
            };
            reader.readAsBinaryString(file);
        };

        return (
            <div className="p-8 animate-fadeIn">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
                    <div>
                        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Danh sách Phân công</h2>
                        <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-2 flex items-center gap-2">
                            <Hash size={14}/> Chuẩn hóa tên lớp tự động • Hiệu năng cao
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button onClick={() => setIsAdding(!isAdding)} className="bg-blue-600 text-white px-8 py-4 rounded-2xl flex items-center gap-3 font-bold shadow-xl hover:bg-blue-700 transition-all active:scale-95">
                            <UserPlus size={20}/> {isAdding ? 'Đóng form' : 'Thêm GV'}
                        </button>
                        <button onClick={exportTemplate} className="bg-white border-2 border-slate-100 text-slate-600 px-6 py-4 rounded-2xl flex items-center gap-3 font-bold hover:bg-slate-50 transition-all">
                            <Download size={20} className="text-blue-500"/> Mẫu Excel
                        </button>
                        <input type="file" ref={fileRef} className="hidden" onChange={handleImport} accept=".xlsx, .xls"/>
                        <button onClick={() => fileRef.current?.click()} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl flex items-center gap-3 font-bold shadow-xl hover:bg-emerald-700 transition-all">
                            <FileSpreadsheet size={20}/> Nhập Excel
                        </button>
                    </div>
                </div>

                {isAdding && <AddTeacherForm onAdd={handleAdd} subjects={data.subjectConfigs} />}

                <div className="bg-white rounded-[3rem] border-2 border-slate-50 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b">
                            <tr>
                                <th className="p-8 text-[10px] font-black uppercase text-slate-400">Giáo viên & Chi tiết Lớp</th>
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
                                                        <span className="text-blue-600 uppercase tracking-tighter">{m.trim()}</span>
                                                        <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                                                        <span className="text-slate-800">{normalizeClassStr(l)}</span>
                                                    </span>
                                                );
                                            })}
                                            <button onClick={() => {
                                                const news = prompt("Chỉnh sửa phân công (Môn: Lớp1, Lớp2; ...)", t.assignments);
                                                if (news !== null) updateData({ teachers: data.teachers.map((x: any) => x.id === t.id ? {...x, assignments: news} : x) });
                                            }} className="p-2 text-blue-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all"><Edit3 size={16}/></button>
                                        </div>
                                    </td>
                                    <td className="p-8 text-center">
                                        <div className="inline-block px-8 py-4 bg-blue-50 text-blue-700 rounded-2xl font-black text-3xl shadow-inner">
                                            {getTeacherPeriods(t.assignments)}
                                        </div>
                                    </td>
                                    <td className="p-8 text-right">
                                        <button onClick={() => updateData({ teachers: data.teachers.filter((x: any) => x.id !== t.id) })} className="text-slate-200 hover:text-red-500 p-4"><Trash2 size={24}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {data.teachers.length === 0 && (
                        <div className="p-32 text-center text-slate-300 font-bold uppercase text-xs tracking-[0.3em] italic">Dữ liệu phân công đang trống</div>
                    )}
                </div>
            </div>
        );
    };

    // --- TAB CÀI ĐẶT ---
    const ConfigTab = () => (
        <div className="p-8 animate-fadeIn">
            <h2 className="text-2xl font-black mb-8 text-slate-800">Cài đặt Hệ thống</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div className="space-y-6">
                    <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl">
                        <div className="flex items-center gap-3 mb-6"><Cloud className="text-blue-400" /><h3 className="font-bold uppercase text-xs tracking-widest">Đồng bộ máy chủ</h3></div>
                        <input type="text" placeholder="Link App Script..." className="w-full p-5 bg-white/10 border border-white/20 rounded-2xl text-sm mb-6 outline-none focus:bg-white/20" value={data.cloudUrl} onChange={e => updateData({cloudUrl: e.target.value})}/>
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={pushToCloud} className="bg-blue-600 hover:bg-blue-500 p-5 rounded-2xl font-black flex items-center justify-center gap-3 transition-all"><CloudUpload size={20}/> ĐẨY LÊN</button>
                            <button onClick={fetchFromCloud} className="bg-white/10 hover:bg-white/20 p-5 rounded-2xl font-black flex items-center justify-center gap-3 transition-all"><CloudDownload size={20}/> TẢI VỀ</button>
                        </div>
                    </div>
                    <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm">
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-3">Định mức GV chuẩn (Tiết/Tuần)</label>
                        <input type="number" value={data.standardQuota} onChange={e => updateData({standardQuota: parseFloat(e.target.value)})} className="text-6xl font-black text-blue-600 outline-none w-full bg-transparent"/>
                    </div>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm flex flex-col">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="bg-emerald-100 text-emerald-600 p-3 rounded-2xl"><Book size={20}/></div>
                        <h3 className="font-black text-slate-700 uppercase text-xs tracking-widest">Định mức Tiết/Môn học</h3>
                    </div>
                    <div className="overflow-y-auto max-h-[450px] pr-4 custom-scrollbar">
                        {data.subjectConfigs.map((s: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between py-4 border-b border-slate-50 group hover:bg-slate-50/50 px-2 rounded-xl transition-all">
                                <span className="font-black text-slate-600">{s.name}</span>
                                <div className="flex items-center gap-4">
                                    <input type="number" step="0.5" className="w-20 p-3 text-center bg-slate-50 rounded-2xl font-black text-blue-600 border-2 border-transparent focus:border-blue-200 outline-none transition-all" value={s.periods} onChange={e => {
                                        const newConfigs = [...data.subjectConfigs];
                                        newConfigs[idx].periods = parseFloat(e.target.value) || 0;
                                        updateData({ subjectConfigs: newConfigs });
                                    }}/>
                                    <button onClick={() => updateData({ subjectConfigs: data.subjectConfigs.filter((_:any, i:number) => i !== idx) })} className="text-slate-200 hover:text-red-500 transition-all"><X size={16}/></button>
                                </div>
                            </div>
                        ))}
                        <button onClick={() => updateData({ subjectConfigs: [...data.subjectConfigs, {name: 'Môn mới', periods: 1}] })} className="w-full mt-6 py-5 border-2 border-dashed border-slate-200 rounded-[2rem] text-slate-400 font-black text-xs hover:border-blue-400 hover:text-blue-600 transition-all uppercase tracking-widest">+ Thêm môn học</button>
                    </div>
                </div>
            </div>
        </div>
    );

    // --- CÁC TAB BÁO CÁO & TIẾT DẠY (Tương tự bản trước nhưng Memoized) ---
    const WeeklyTab = () => {
        const [tempLogs, setTempLogs] = useState(data.weeklyData[currentWeek] || {});
        const save = () => {
            updateData({ weeklyData: { ...data.weeklyData, [currentWeek]: tempLogs } });
            setSyncStatus({ loading: false, message: 'Đã lưu tuần ' + currentWeek, type: 'success' });
            setTimeout(() => setSyncStatus({ loading: false, message: '', type: '' }), 2000);
        };
        const fillFromTKB = () => {
            const filled: any = {};
            data.teachers.forEach((t: any) => filled[t.id] = getTeacherPeriods(t.assignments));
            setTempLogs(filled);
        };
        return (
            <div className="p-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
                    <div className="flex items-center gap-4 bg-white border-2 border-slate-100 p-3 rounded-[2.5rem] shadow-sm">
                        <button onClick={() => setCurrentWeek(Math.max(1, currentWeek-1))} className="p-5 hover:bg-slate-100 rounded-3xl transition-all"><ChevronLeft/></button>
                        <div className="px-12 text-center"><div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">Ghi nhận tiết</div><div className="text-4xl font-black tracking-tight">Tuần {currentWeek}</div></div>
                        <button onClick={() => setCurrentWeek(currentWeek+1)} className="p-5 hover:bg-slate-100 rounded-3xl transition-all"><ChevronRight/></button>
                    </div>
                    <div className="flex gap-4 w-full md:w-auto">
                        <button onClick={fillFromTKB} className="flex-1 md:flex-none bg-slate-100 text-slate-600 px-10 py-5 rounded-3xl font-black flex gap-3 items-center justify-center hover:bg-slate-200 transition-all">Lấy dữ liệu TKB</button>
                        <button onClick={save} className="flex-1 md:flex-none bg-blue-600 text-white px-12 py-5 rounded-3xl font-black flex gap-3 items-center justify-center shadow-2xl shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all">LƯU DỮ LIỆU</button>
                    </div>
                </div>
                <div className="bg-white rounded-[3.5rem] border-2 border-slate-50 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b">
                            <tr><th className="p-8 text-[10px] font-black uppercase text-slate-400">Giáo viên</th><th className="p-8 text-center text-[10px] font-black uppercase text-slate-400">Thực dạy tuần này</th></tr>
                        </thead>
                        <tbody>
                            {data.teachers.map((t: any) => (
                                <tr key={t.id} className="border-b hover:bg-slate-50/50 transition-all">
                                    <td className="p-8"><div className="font-black text-slate-700 text-xl">{t.name}</div><div className="text-[10px] font-black text-slate-300 uppercase mt-2">DỰ TÍNH TỪ TKB: {getTeacherPeriods(t.assignments)} TIẾT</div></td>
                                    <td className="p-8"><input type="number" step="0.5" className="w-32 mx-auto block text-center p-6 bg-emerald-50 border-3 border-emerald-100 rounded-[2.5rem] font-black text-4xl text-emerald-700 outline-none focus:bg-white focus:border-emerald-500 transition-all shadow-inner" value={tempLogs[t.id] || 0} onChange={e => setTempLogs({...tempLogs, [t.id]: parseFloat(e.target.value) || 0})}/></td>
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
                const tkb = getTeacherPeriods(t.assignments);
                const actual = data.weeklyData[currentWeek]?.[t.id] || 0;
                return { ...t, tkb, actual, diff: actual - tkb };
            });
        }, [data, currentWeek, getTeacherPeriods]);

        return (
            <div className="p-8 animate-fadeIn">
                <div className="bg-white rounded-[3.5rem] border-2 border-slate-50 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b">
                            <tr><th className="p-8 text-[10px] font-black uppercase text-slate-400">Họ tên giáo viên</th><th className="p-8 text-center text-[10px] font-black uppercase text-slate-400">TKB</th><th className="p-8 text-center text-[10px] font-black uppercase text-slate-400 text-blue-600">Thực dạy</th><th className="p-8 text-center text-[10px] font-black uppercase text-slate-400">Chênh lệch</th></tr>
                        </thead>
                        <tbody>
                            {stats.map((s: any) => (
                                <tr key={s.id} className="border-b hover:bg-slate-50 transition-all">
                                    <td className="p-8 font-black text-slate-700 text-xl">{s.name}</td>
                                    <td className="p-8 text-center text-slate-400 font-bold text-xl">{s.tkb}</td>
                                    <td className="p-8 text-center font-black text-4xl text-blue-600">{s.actual}</td>
                                    <td className="p-8 text-center">
                                        <span className={`px-8 py-3 rounded-full font-black text-sm shadow-sm ${s.diff >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
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
        <div className="p-8 text-center py-32 animate-fadeIn">
            <div className="max-w-xl mx-auto">
                <div className="w-28 h-28 bg-blue-100 text-blue-600 rounded-[3rem] flex items-center justify-center mx-auto mb-10 shadow-inner"><ShieldCheck size={56}/></div>
                <h2 className="text-4xl font-black text-slate-800 mb-6 tracking-tight">An toàn & Bảo mật</h2>
                <p className="text-slate-400 text-sm mb-16 leading-relaxed px-10">Dữ liệu được mã hóa và lưu trữ tại trình duyệt của bạn. Hãy tải bản sao lưu hàng tuần để đảm bảo an toàn tuyệt đối.</p>
                <div className="flex flex-col sm:flex-row gap-6 justify-center">
                    <button onClick={() => {
                        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a'); a.href = url; a.download = `THCS_PRO_BACKUP_${new Date().toLocaleDateString()}.json`; a.click();
                    }} className="bg-blue-600 text-white px-12 py-6 rounded-[2rem] font-black shadow-2xl shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-4"><Download size={28}/> TẢI SAO LƯU</button>
                    <button onClick={() => { if(confirm("CẢNH BÁO: Hành động này sẽ xóa sạch toàn bộ dữ liệu. Tiếp tục?")) { localStorage.clear(); window.location.reload(); } }} className="text-red-500 font-black px-12 py-6 rounded-[2rem] border-2 border-red-50 hover:bg-red-50 transition-all">XÓA TRẮNG BỘ NHỚ</button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            <header className="bg-white border-b-2 border-slate-100 p-5 sticky top-0 z-50">
                <div className="container mx-auto flex flex-col lg:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-5">
                        <div className="bg-blue-600 p-4 rounded-[1.5rem] text-white shadow-2xl rotate-3"><LayoutDashboard size={32}/></div>
                        <div>
                            <h1 className="font-black text-3xl leading-none tracking-tighter">THCS PRO <span className="text-blue-600 text-sm align-top">v4.0</span></h1>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-2 block">Teaching Management System</span>
                        </div>
                    </div>
                    <nav className="flex gap-2 bg-slate-100 p-2 rounded-[2.5rem] overflow-x-auto no-scrollbar w-full lg:w-auto">
                        {[
                            {id: 'config', icon: Settings, label: 'CÀI ĐẶT'},
                            {id: 'teachers', icon: Users, label: 'PHÂN CÔNG'},
                            {id: 'weekly', icon: CalendarDays, label: 'TIẾT DẠY'},
                            {id: 'reports', icon: FileText, label: 'BÁO CÁO'},
                            {id: 'backup', icon: Save, label: 'SAO LƯU'}
                        ].map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-3 px-10 py-5 rounded-[2.2rem] text-[10px] font-black transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-xl scale-105' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'}`}>
                                <tab.icon size={18}/> {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>
            </header>

            <main className="container mx-auto p-4 md:p-10 flex-1">
                <div className="bg-white rounded-[4.5rem] shadow-2xl border-4 border-white min-h-[750px] overflow-hidden">
                    {activeTab === 'config' && <ConfigTab />}
                    {activeTab === 'teachers' && <TeacherTab />}
                    {activeTab === 'weekly' && <WeeklyTab />}
                    {activeTab === 'reports' && <ReportTab />}
                    {activeTab === 'backup' && <BackupTab />}
                </div>
            </main>

            {syncStatus.message && (
                <div className="fixed bottom-16 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-12 py-6 rounded-[3rem] shadow-2xl flex items-center gap-5 animate-fadeIn font-black text-sm z-[100] border border-white/10">
                    {syncStatus.loading ? <RefreshCw size={24} className="animate-spin text-blue-400" /> : <CheckCircle2 size={24} className="text-emerald-400" />}
                    {syncStatus.message}
                </div>
            )}
        </div>
    );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
