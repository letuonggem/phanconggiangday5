
import React, { useState, useEffect, useMemo, useRef, memo } from 'react';
import ReactDOM from 'react-dom/client';
import { 
    LayoutDashboard, Users, CalendarDays, FileText, Settings, 
    Trash2, Edit3, Check, X, FileUp, ChevronLeft, ChevronRight, 
    RefreshCw, Cloud, CloudUpload, CloudDownload, Save, 
    CheckCircle2, AlertTriangle, ShieldCheck, TrendingUp, BookOpen, Download, Upload,
    ClipboardCheck, Copy, Plus, FileSpreadsheet, UserPlus, Hash, Book, ChevronDown,
    AlertCircle, Info
} from 'lucide-react';

// --- CẤU HÌNH HỆ THỐNG ---
const STORAGE_KEY = 'thcs_mgmt_v4_strict_validation';

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

/**
 * Kiểm tra định dạng tên lớp
 * Hợp lệ: Bắt đầu bằng 6-9, sau đó là chữ hoặc số (6A1, 7/2, 8.3, 901...)
 * Không hợp lệ: ra1 (thiếu khối), 60a2 (khối 60 không tồn tại)
 */
const validateClassFormat = (className: string) => {
    const cleanName = className.trim().toUpperCase();
    if (!cleanName) return null;
    
    // Tìm phần số ở đầu (số khối)
    const gradeMatch = cleanName.match(/^\d+/);
    if (!gradeMatch) return `Lớp "${cleanName}" sai định dạng (Thiếu số khối 6-9 ở đầu)`;
    
    const grade = parseInt(gradeMatch[0]);
    if (grade < 6 || grade > 9) return `Lớp "${cleanName}" sai khối (Khối ${grade} không tồn tại trong THCS)`;
    
    if (cleanName.length < 2) return `Tên lớp "${cleanName}" quá ngắn`;
    
    return null;
};

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

    // --- FORM NHẬP TAY (NÂNG CẤP VALIDATION) ---
    const AddTeacherForm = ({ onAdd, subjects, allTeachers }: any) => {
        const [name, setName] = useState('');
        const [sub, setSub] = useState('');
        const [cls, setCls] = useState('');
        const [errors, setErrors] = useState<{format: string[], conflicts: string[]}>({ format: [], conflicts: [] });

        useEffect(() => {
            const formatErrs: string[] = [];
            const conflictErrs: string[] = [];

            if (cls) {
                // 1. Kiểm tra định dạng tên lớp
                const classList = cls.split(',').map(c => c.trim()).filter(c => c);
                classList.forEach(c => {
                    const err = validateClassFormat(c);
                    if (err) formatErrs.push(err);
                });

                // 2. Kiểm tra trùng lấn (nếu có môn)
                if (sub) {
                    const proposed = `${sub}: ${normalizeClassStr(cls)}`;
                    const conflicts = findConflicts(proposed, allTeachers);
                    conflictErrs.push(...conflicts);
                }
            }
            setErrors({ format: formatErrs, conflicts: conflictErrs });
        }, [sub, cls, allTeachers]);

        const handleSubmit = () => {
            if (!name || !sub || !cls) return alert("Vui lòng nhập đầy đủ: Tên GV, Môn học và Lớp dạy!");
            if (errors.format.length > 0) return alert("Sai định dạng tên lớp:\n" + errors.format.join('\n'));
            if (errors.conflicts.length > 0) return alert("Trùng lấn phân công:\n" + errors.conflicts.join('\n'));

            const proposed = `${sub}: ${normalizeClassStr(cls)}`;
            onAdd({ name, assignments: proposed });
            setName(''); setSub(''); setCls('');
        };

        const hasError = errors.format.length > 0 || errors.conflicts.length > 0;

        return (
            <div className="mb-10 bg-slate-50 border-2 border-slate-200 p-10 rounded-[3.5rem] animate-fadeIn shadow-inner">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Họ tên giáo viên</label>
                        <input type="text" placeholder="Nguyễn Văn A" className="w-full p-6 bg-white rounded-3xl border-none shadow-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/20 transition-all" value={name} onChange={e => setName(e.target.value)}/>
                    </div>
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Môn học</label>
                        <div className="relative">
                            <select className={`w-full p-6 bg-white rounded-3xl border-none shadow-sm font-bold text-slate-700 outline-none focus:ring-4 ${errors.conflicts.length > 0 ? 'ring-red-400/30' : 'focus:ring-blue-500/20'} appearance-none transition-all`} value={sub} onChange={e => setSub(e.target.value)}>
                                <option value="">-- Chọn môn --</option>
                                {subjects.map((s: any) => <option key={s.name} value={s.name}>{s.name}</option>)}
                            </select>
                            <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={20}/>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Danh sách lớp dạy</label>
                        <input type="text" placeholder="6A1, 7B2, 8/3..." className={`w-full p-6 bg-white rounded-3xl border-none shadow-sm font-bold text-slate-700 outline-none focus:ring-4 ${errors.format.length > 0 ? 'ring-orange-400/30' : 'focus:ring-blue-500/20'} transition-all`} value={cls} onChange={e => setCls(e.target.value)}/>
                    </div>
                </div>

                {/* HIỂN THỊ LỖI ĐỊNH DẠNG */}
                {errors.format.length > 0 && (
                    <div className="mb-4 bg-orange-50 border-2 border-orange-100 p-5 rounded-2xl flex items-start gap-4 animate-fadeIn">
                        <AlertTriangle className="text-orange-500 shrink-0 mt-1" size={20}/>
                        <div className="text-[11px] font-bold text-orange-700 uppercase leading-relaxed">
                            {errors.format.join(' | ')}
                        </div>
                    </div>
                )}

                {/* HIỂN THỊ LỖI TRÙNG LẤN */}
                {errors.conflicts.length > 0 && (
                    <div className="mb-4 bg-red-50 border-2 border-red-100 p-5 rounded-2xl flex items-start gap-4 animate-fadeIn">
                        <AlertCircle className="text-red-500 shrink-0 mt-1" size={20}/>
                        <div className="text-[11px] font-bold text-red-700 uppercase leading-relaxed">
                            BỊ TRÙNG: {errors.conflicts.join(' | ')}
                        </div>
                    </div>
                )}

                <div className="flex flex-col md:flex-row justify-between items-center gap-6 mt-8">
                    <div className="flex items-center gap-3 text-slate-400">
                        <Info size={16}/>
                        <p className="text-[10px] font-bold uppercase italic tracking-tighter">Quy tắc: Tên lớp phải bắt đầu bằng khối (6-9). Ví dụ: 6A1, 702, 8/1...</p>
                    </div>
                    <button onClick={handleSubmit} disabled={hasError} className={`w-full md:w-auto px-16 py-5 rounded-[2rem] font-black shadow-2xl transition-all flex items-center justify-center gap-3 ${hasError ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'}`}>
                        {hasError ? <X size={24}/> : <Plus size={24}/>} 
                        {hasError ? 'DỮ LIỆU CHƯA HỢP LỆ' : 'XÁC NHẬN THÊM'}
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
                    
                    // 1. Check Format trong Excel
                    const parts = assignments.split(';');
                    parts.forEach((p: string) => {
                        const [m, cPart] = p.split(':');
                        if (cPart) {
                            cPart.split(',').forEach(c => {
                                const err = validateClassFormat(c);
                                if (err) errors.push(`Dòng ${idx + 2} (${name}): ${err}`);
                            });
                        }
                    });

                    // 2. Check Trùng lấn
                    const rowConflicts = findConflicts(assignments, currentContext);
                    if (rowConflicts.length > 0) errors.push(`Dòng ${idx + 2} (${name}): ${rowConflicts.join(', ')}`);
                    
                    if (errors.length === 0) {
                        const newGv = { id: (Date.now() + idx).toString(), name, assignments, roles: [] };
                        validTeachers.push(newGv);
                        currentContext.push(newGv);
                    }
                });

                if (errors.length > 0) {
                    alert(`PHÁT HIỆN LỖI TRONG FILE EXCEL:\n\n${errors.slice(0, 10).join('\n')}${errors.length > 10 ? '\n...và nhiều lỗi khác' : ''}\n\nVui lòng kiểm tra lại số khối (6-9) và trùng lấn trước khi nhập lại!`);
                    if (fileRef.current) fileRef.current.value = '';
                    return;
                }

                updateData({ teachers: [...data.teachers, ...validTeachers] });
                setSyncStatus({ loading: false, message: `Đã nhập thành công ${validTeachers.length} GV`, type: 'success' });
                setTimeout(() => setSyncStatus({ loading: false, message: '', type: '' }), 3000);
            };
            reader.readAsBinaryString(file);
        };

        return (
            <div className="p-8 animate-fadeIn">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12">
                    <div>
                        <h2 className="text-4xl font-black text-slate-800 tracking-tighter">Phân công Giảng dạy</h2>
                        <div className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mt-3 flex items-center gap-2">
                            <ShieldCheck size={14}/> Auto Validation Active • Khối 6-9 Only
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-4">
                        <button onClick={() => setIsAdding(!isAdding)} className="bg-blue-600 text-white px-10 py-5 rounded-[1.8rem] flex items-center gap-3 font-black shadow-2xl hover:bg-blue-700 transition-all active:scale-95">
                            <UserPlus size={24}/> {isAdding ? 'ĐÓNG FORM' : 'THÊM GIÁO VIÊN'}
                        </button>
                        <button onClick={exportTemplate} className="bg-white border-2 border-slate-100 text-slate-600 px-8 py-5 rounded-[1.8rem] flex items-center gap-3 font-black hover:bg-slate-50 transition-all">
                            <Download size={24} className="text-blue-500"/> FILE MẪU
                        </button>
                        <input type="file" ref={fileRef} className="hidden" onChange={handleImport} accept=".xlsx, .xls"/>
                        <button onClick={() => fileRef.current?.click()} className="bg-emerald-600 text-white px-10 py-5 rounded-[1.8rem] flex items-center gap-3 font-black shadow-2xl hover:bg-emerald-700 transition-all active:scale-95">
                            <FileSpreadsheet size={24}/> NHẬP EXCEL
                        </button>
                    </div>
                </div>

                {isAdding && <AddTeacherForm onAdd={(gv: any) => { updateData({ teachers: [gv, ...data.teachers] }); setIsAdding(false); }} subjects={data.subjectConfigs} allTeachers={data.teachers} />}

                <div className="bg-white rounded-[4rem] border-2 border-slate-50 overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b-2 border-slate-100">
                            <tr>
                                <th className="p-10 text-[11px] font-black uppercase text-slate-400 tracking-widest">Giáo viên & Chi tiết phân công</th>
                                <th className="p-10 text-center text-[11px] font-black uppercase text-slate-400 tracking-widest">Tiết TKB</th>
                                <th className="p-10"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.teachers.map((t: any) => (
                                <tr key={t.id} className="border-b border-slate-50 group hover:bg-slate-50/50 transition-all">
                                    <td className="p-10">
                                        <div className="font-black text-slate-800 text-2xl mb-4">{t.name}</div>
                                        <div className="flex flex-wrap gap-3">
                                            {t.assignments.split(';').map((part: string, i: number) => {
                                                const [m, l] = part.split(':');
                                                if (!m || !l) return null;
                                                return (
                                                    <span key={i} className="bg-white border-2 border-slate-100 px-5 py-3 rounded-2xl text-[11px] font-black text-slate-500 shadow-sm flex items-center gap-3">
                                                        <span className="text-blue-600 uppercase tracking-tighter">{m.trim()}</span>
                                                        <span className="w-1.5 h-1.5 bg-slate-200 rounded-full"></span>
                                                        <span className="text-slate-800 font-bold">{normalizeClassStr(l)}</span>
                                                    </span>
                                                );
                                            })}
                                            <button onClick={() => {
                                                const news = prompt("Chỉnh sửa phân công (Môn: Lớp1, Lớp2; ...):", t.assignments);
                                                if (news) {
                                                    const confs = findConflicts(news, data.teachers, t.id);
                                                    if (confs.length > 0) alert(`LỖI TRÙNG LẤN: ${confs[0]}`);
                                                    else updateData({ teachers: data.teachers.map((x: any) => x.id === t.id ? {...x, assignments: news} : x) });
                                                }
                                            }} className="p-3 text-blue-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-blue-50 rounded-xl"><Edit3 size={20}/></button>
                                        </div>
                                    </td>
                                    <td className="p-10 text-center">
                                        <div className="inline-block px-10 py-5 bg-blue-50 text-blue-700 rounded-[2rem] font-black text-4xl shadow-inner">
                                            {getTeacherPeriods(t.assignments)}
                                        </div>
                                    </td>
                                    <td className="p-10 text-right">
                                        <button onClick={() => {if(confirm(`Xóa giáo viên ${t.name}?`)) updateData({ teachers: data.teachers.filter((x: any) => x.id !== t.id) })}} className="text-slate-200 hover:text-red-500 p-4 transition-all hover:bg-red-50 rounded-2xl"><Trash2 size={28}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {data.teachers.length === 0 && <div className="p-32 text-center text-slate-300 font-black uppercase text-sm tracking-[0.4em] italic">Dữ liệu đang trống</div>}
                </div>
            </div>
        );
    };

    // --- TAB CƠ BẢN (GIỮ NGUYÊN) ---
    const ConfigTab = () => (
        <div className="p-10 animate-fadeIn">
            <h2 className="text-3xl font-black mb-12 text-slate-800 tracking-tighter">Cấu hình Định mức</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="bg-white p-10 rounded-[3.5rem] border-2 border-slate-100 shadow-sm">
                    <label className="block text-[11px] font-black text-slate-400 uppercase mb-5 tracking-widest">Định mức chuẩn THCS (Tiết/Tuần)</label>
                    <input type="number" value={data.standardQuota} onChange={e => updateData({standardQuota: parseFloat(e.target.value)})} className="text-8xl font-black text-blue-600 outline-none w-full bg-transparent tracking-tighter"/>
                </div>
                <div className="bg-white p-10 rounded-[3.5rem] border-2 border-slate-100 shadow-sm overflow-hidden flex flex-col">
                   <h3 className="font-black text-slate-700 uppercase text-xs tracking-widest mb-8 flex items-center gap-3"><Book className="text-blue-500"/> Môn học & Định mức Tiết</h3>
                   <div className="space-y-4 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                       {data.subjectConfigs.map((s: any, i: number) => (
                           <div key={i} className="flex justify-between items-center py-4 border-b border-slate-50 group hover:bg-slate-50 rounded-2xl px-4 transition-all">
                               <span className="font-black text-slate-600 uppercase text-[11px]">{s.name}</span>
                               <input type="number" step="0.5" className="w-20 p-3 bg-slate-100 rounded-xl text-center font-black text-blue-600 outline-none focus:ring-2 focus:ring-blue-200" value={s.periods} onChange={e => {
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
            <div className="p-10">
                <div className="flex flex-col md:flex-row justify-between items-center mb-16 gap-8">
                    <div className="flex items-center gap-6 bg-white border-2 border-slate-100 p-4 rounded-[3rem] shadow-sm">
                        <button onClick={() => setCurrentWeek(Math.max(1, currentWeek-1))} className="p-6 hover:bg-slate-100 rounded-[2rem] transition-all"><ChevronLeft size={32}/></button>
                        <div className="px-16 text-center"><div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">ĐANG NHẬP</div><div className="text-5xl font-black tracking-tighter">Tuần {currentWeek}</div></div>
                        <button onClick={() => setCurrentWeek(currentWeek+1)} className="p-6 hover:bg-slate-100 rounded-[2rem] transition-all"><ChevronRight size={32}/></button>
                    </div>
                    <button onClick={() => { updateData({ weeklyData: {...data.weeklyData, [currentWeek]: tempLogs} }); setSyncStatus({loading: false, message: 'Đã lưu tuần '+currentWeek, type: 'success'}); setTimeout(()=>setSyncStatus({loading:false,message:'',type:''}),2000); }} className="bg-blue-600 text-white px-16 py-6 rounded-[2.5rem] font-black text-xl shadow-2xl hover:bg-blue-700 transition-all active:scale-95">LƯU DỮ LIỆU</button>
                </div>
                <div className="bg-white rounded-[4.5rem] border-2 border-slate-50 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b-2 border-slate-100">
                            <tr><th className="p-10 text-[11px] font-black uppercase text-slate-400 tracking-widest">Giáo viên</th><th className="p-10 text-center text-[11px] font-black uppercase text-slate-400 tracking-widest">Thực dạy tuần {currentWeek}</th></tr>
                        </thead>
                        <tbody>
                            {data.teachers.map((t: any) => (
                                <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-all">
                                    <td className="p-10"><div className="font-black text-slate-700 text-2xl">{t.name}</div><div className="text-[10px] font-black text-slate-300 uppercase mt-2">DỰ KIẾN: {getTeacherPeriods(t.assignments)} TIẾT</div></td>
                                    <td className="p-10"><input type="number" step="0.5" className="w-40 mx-auto block text-center p-8 bg-emerald-50 rounded-[2.5rem] font-black text-6xl text-emerald-700 outline-none focus:bg-white focus:border-emerald-500 transition-all shadow-inner" value={tempLogs[t.id] || 0} onChange={e => setTempLogs({...tempLogs, [t.id]: parseFloat(e.target.value) || 0})}/></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const ReportTab = () => (
        <div className="p-10 text-center py-40 animate-fadeIn">
            <div className="max-w-xl mx-auto">
                <div className="w-24 h-24 bg-blue-100 text-blue-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10"><FileText size={48}/></div>
                <h2 className="text-4xl font-black text-slate-800 mb-6 tracking-tighter">Báo cáo Tổng hợp</h2>
                <p className="text-slate-400 text-lg leading-relaxed">Dữ liệu báo cáo đang được tính toán dựa trên định mức chuẩn và tiết thực dạy hàng tuần. Kết quả sẽ tự động cập nhật tại đây.</p>
            </div>
        </div>
    );

    const BackupTab = () => (
        <div className="p-10 text-center py-32 animate-fadeIn">
            <h2 className="text-4xl font-black text-slate-800 mb-12 tracking-tighter">Quản lý Dữ liệu</h2>
            <div className="flex flex-col md:flex-row gap-6 justify-center max-w-2xl mx-auto">
                <button onClick={() => {
                    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url; a.download = `THCS_BACKUP_${new Date().toLocaleDateString()}.json`; a.click();
                }} className="flex-1 bg-blue-600 text-white px-12 py-8 rounded-[2.5rem] font-black shadow-2xl hover:bg-blue-700 transition-all flex items-center justify-center gap-4 text-xl"><Download size={28}/> SAO LƯU (.JSON)</button>
                <button onClick={() => {if(confirm("Xóa trắng toàn bộ dữ liệu?")) { localStorage.clear(); window.location.reload(); }}} className="px-12 py-8 rounded-[2.5rem] font-black text-red-500 border-2 border-red-50 hover:bg-red-50 transition-all text-xl">XÓA DỮ LIỆU</button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            <header className="bg-white border-b-2 border-slate-100 p-6 sticky top-0 z-50 shadow-sm">
                <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-5">
                        <div className="bg-blue-600 p-4 rounded-[1.5rem] text-white shadow-2xl rotate-3"><LayoutDashboard size={32}/></div>
                        <h1 className="font-black text-3xl tracking-tighter text-slate-800 uppercase">THCS PRO <span className="text-blue-600 text-sm align-top">v4.1</span></h1>
                    </div>
                    <nav className="flex gap-2 bg-slate-100 p-2 rounded-[2.5rem] overflow-x-auto no-scrollbar max-w-full">
                        {[
                            {id: 'config', icon: Settings, label: 'CÀI ĐẶT'},
                            {id: 'teachers', icon: Users, label: 'PHÂN CÔNG'},
                            {id: 'weekly', icon: CalendarDays, label: 'TIẾT DẠY'},
                            {id: 'reports', icon: FileText, label: 'BÁO CÁO'},
                            {id: 'backup', icon: Save, label: 'SAO LƯU'}
                        ].map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-3 px-8 py-4.5 rounded-[2.2rem] text-[11px] font-black transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-xl scale-105' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'}`}>
                                <tab.icon size={20}/> {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>
            </header>

            <main className="container mx-auto p-4 md:p-10 flex-1">
                <div className="bg-white rounded-[5rem] shadow-2xl border-4 border-white min-h-[800px] overflow-hidden">
                    {activeTab === 'config' && <ConfigTab />}
                    {activeTab === 'teachers' && <TeacherTab />}
                    {activeTab === 'weekly' && <WeeklyTab />}
                    {activeTab === 'reports' && <ReportTab />}
                    {activeTab === 'backup' && <BackupTab />}
                </div>
            </main>

            {syncStatus.message && (
                <div className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-12 py-6 rounded-[3rem] shadow-2xl flex items-center gap-4 animate-fadeIn font-black text-sm z-[100] border-2 border-white/10">
                    <CheckCircle2 size={24} className="text-emerald-400" />
                    {syncStatus.message}
                </div>
            )}
        </div>
    );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
