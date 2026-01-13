
import React, { useState, useEffect, useMemo, useRef, memo } from 'react';
import ReactDOM from 'react-dom/client';
import { 
    LayoutDashboard, Users, CalendarDays, FileText, Settings, 
    Trash2, Edit3, Check, X, FileUp, ChevronLeft, ChevronRight, 
    RefreshCw, Cloud, CloudUpload, CloudDownload, Save, 
    CheckCircle2, AlertTriangle, ShieldCheck, TrendingUp, BookOpen, Download, Upload,
    ClipboardCheck, Copy, Plus, FileSpreadsheet, UserPlus, Hash, Book, ChevronDown,
    AlertCircle, Info, Briefcase
} from 'lucide-react';

// --- CẤU HÌNH HỆ THỐNG ---
const STORAGE_KEY = 'thcs_mgmt_v4_strict_validation_v2';

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

const DEFAULT_ROLES = [
    { id: 'r1', name: 'Chủ nhiệm', reduction: 4 },
    { id: 'r2', name: 'Tổ trưởng', reduction: 3 },
    { id: 'r3', name: 'Tổ phó', reduction: 1 },
    { id: 'r4', name: 'Thư ký Hội đồng', reduction: 2 },
    { id: 'r5', name: 'Tổng phụ trách', reduction: 10 }
];

// --- HÀM TRỢ GIÚP ---
const validateClassFormat = (className: string) => {
    const cleanName = className.trim().toUpperCase();
    if (!cleanName) return null;
    const gradeMatch = cleanName.match(/^\d+/);
    if (!gradeMatch) return `Lớp "${cleanName}" sai định dạng (Thiếu khối 6-9)`;
    const grade = parseInt(gradeMatch[0]);
    if (grade < 6 || grade > 9) return `Lớp "${cleanName}" sai khối (Chỉ từ 6-9)`;
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
        const inputClasses = clsPart.split(',').map(c => c.trim().toUpperCase().replace(/\s+/g, '')).filter(c => c);
        currentTeachers.forEach(teacher => {
            if (excludeTeacherId && teacher.id === excludeTeacherId) return;
            const existingParts = teacher.assignments.split(';');
            existingParts.forEach(exPart => {
                const [exSub, exClsPart] = exPart.split(':');
                if (!exSub || !exClsPart) return;
                if (exSub.trim().toLowerCase() === subject) {
                    const exClasses = exClsPart.split(',').map(c => c.trim().toUpperCase().replace(/\s+/g, '')).filter(c => c);
                    inputClasses.forEach(c => {
                        if (exClasses.includes(c)) conflicts.push(`Lớp ${c} môn ${subPart.trim()} (GV: ${teacher.name})`);
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
            roles: DEFAULT_ROLES,
            subjectConfigs: DEFAULT_SUBJECT_CONFIGS,
            teachers: [], 
            weeklyData: {} 
        };
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }, [data]);

    const updateData = (newData: any) => setData((prev: any) => ({ ...prev, ...newData }));

    const getTeacherTKBPeriods = useMemo(() => {
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

    const getTeacherReduction = (teacherRoles: string[]) => {
        return teacherRoles.reduce((sum, roleName) => {
            const r = data.roles.find((x: any) => x.name === roleName);
            return sum + (r ? r.reduction : 0);
        }, 0);
    };

    // --- FORM NHẬP TAY ---
    const AddTeacherForm = ({ onAdd, subjects, allTeachers, rolesConfig }: any) => {
        const [name, setName] = useState('');
        const [sub, setSub] = useState('');
        const [cls, setCls] = useState('');
        const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
        const [errors, setErrors] = useState<{format: string[], conflicts: string[]}>({ format: [], conflicts: [] });

        useEffect(() => {
            const formatErrs: string[] = [];
            const conflictErrs: string[] = [];
            if (cls) {
                const classList = cls.split(',').map(c => c.trim()).filter(c => c);
                classList.forEach(c => {
                    const err = validateClassFormat(c);
                    if (err) formatErrs.push(err);
                });
                if (sub) {
                    const proposed = `${sub}: ${normalizeClassStr(cls)}`;
                    const conflicts = findConflicts(proposed, allTeachers);
                    conflictErrs.push(...conflicts);
                }
            }
            setErrors({ format: formatErrs, conflicts: conflictErrs });
        }, [sub, cls, allTeachers]);

        const handleSubmit = () => {
            if (!name || !sub || !cls) return alert("Vui lòng nhập đầy đủ thông tin!");
            if (errors.format.length > 0 || errors.conflicts.length > 0) return;
            const proposed = `${sub}: ${normalizeClassStr(cls)}`;
            onAdd({ id: Date.now().toString(), name, assignments: proposed, roles: selectedRoles });
            setName(''); setSub(''); setCls(''); setSelectedRoles([]);
        };

        const toggleRole = (rName: string) => {
            setSelectedRoles(prev => prev.includes(rName) ? prev.filter(x => x !== rName) : [...prev, rName]);
        };

        const hasError = errors.format.length > 0 || errors.conflicts.length > 0;

        return (
            <div className="mb-10 bg-slate-50 border-2 border-slate-200 p-10 rounded-[3.5rem] animate-fadeIn shadow-inner">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Họ tên giáo viên</label>
                        <input type="text" placeholder="Nguyễn Văn A" className="w-full p-6 bg-white rounded-3xl border-none shadow-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/20" value={name} onChange={e => setName(e.target.value)}/>
                    </div>
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Môn học</label>
                        <select className="w-full p-6 bg-white rounded-3xl border-none shadow-sm font-bold text-slate-700 outline-none focus:ring-4 appearance-none" value={sub} onChange={e => setSub(e.target.value)}>
                            <option value="">-- Chọn môn --</option>
                            {subjects.map((s: any) => <option key={s.name} value={s.name}>{s.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Lớp dạy (vd: 6A1, 7A2)</label>
                        <input type="text" placeholder="6A1, 7A2" className="w-full p-6 bg-white rounded-3xl border-none shadow-sm font-bold text-slate-700 outline-none focus:ring-4" value={cls} onChange={e => setCls(e.target.value)}/>
                    </div>
                </div>

                <div className="mb-8">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-4 block">Công việc kiêm nhiệm (Để tính giảm định mức)</label>
                    <div className="flex flex-wrap gap-3">
                        {rolesConfig.map((r: any) => (
                            <button key={r.id} onClick={() => toggleRole(r.name)} className={`px-5 py-3 rounded-2xl text-[11px] font-black border-2 transition-all flex items-center gap-2 ${selectedRoles.includes(r.name) ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-blue-200'}`}>
                                <Check size={14} className={selectedRoles.includes(r.name) ? 'opacity-100' : 'opacity-0'}/> {r.name} (-{r.reduction}t)
                            </button>
                        ))}
                    </div>
                </div>

                {hasError && (
                    <div className="mb-6 space-y-2">
                        {errors.format.map((e, i) => <div key={i} className="p-4 bg-orange-50 text-orange-700 text-[11px] font-bold uppercase rounded-xl border border-orange-100">{e}</div>)}
                        {errors.conflicts.map((e, i) => <div key={i} className="p-4 bg-red-50 text-red-700 text-[11px] font-bold uppercase rounded-xl border border-red-100">{e}</div>)}
                    </div>
                )}

                <div className="flex justify-between items-center mt-6">
                    <p className="text-[10px] font-bold text-slate-400 uppercase italic">Giảm trừ tiết dạy sẽ được tự động áp dụng vào báo cáo dôi dư.</p>
                    <button onClick={handleSubmit} disabled={hasError} className={`px-16 py-5 rounded-[2rem] font-black shadow-2xl transition-all ${hasError ? 'bg-slate-300 text-slate-500' : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'}`}>
                        {hasError ? 'DỮ LIỆU SAI' : 'XÁC NHẬN THÊM'}
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
            const templateData = [{ "Họ tên": "Nguyễn Văn A", "Phân công (Môn: Lớp1, Lớp2)": "Toán: 6A1, 6A2", "Kiêm nhiệm": "Chủ nhiệm, Tổ trưởng" }];
            const ws = (window as any).XLSX.utils.json_to_sheet(templateData);
            const wb = (window as any).XLSX.utils.book_new();
            (window as any).XLSX.utils.book_append_sheet(wb, ws, "Mau");
            (window as any).XLSX.writeFile(wb, "Mau_Phan_Cong.xlsx");
        };

        const handleImport = (e: any) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt: any) => {
                const wb = (window as any).XLSX.read(evt.target.result, {type:'binary'});
                const rows = (window as any).XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
                const validTeachers: any[] = [];
                rows.forEach((row: any, i: number) => {
                    const rolesRaw = row['Kiêm nhiệm'] || row['chucvu'] || '';
                    validTeachers.push({
                        id: (Date.now() + i).toString(),
                        name: row['Họ tên'] || 'GV mới',
                        assignments: row['Phân công (Môn: Lớp1, Lớp2)'] || '',
                        roles: rolesRaw.split(',').map((s: string) => s.trim()).filter((s: string) => s)
                    });
                });
                updateData({ teachers: [...data.teachers, ...validTeachers] });
            };
            reader.readAsBinaryString(file);
        };

        return (
            <div className="p-8 animate-fadeIn">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12">
                    <div>
                        <h2 className="text-4xl font-black text-slate-800 tracking-tighter">Quản lý GV & Kiêm nhiệm</h2>
                        <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-3 flex items-center gap-2">
                           <ShieldCheck size={14}/> Tự động tính định mức sau giảm trừ
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-4">
                        <button onClick={() => setIsAdding(!isAdding)} className="bg-blue-600 text-white px-10 py-5 rounded-[1.8rem] flex items-center gap-3 font-black shadow-2xl hover:bg-blue-700 transition-all">
                            <UserPlus size={24}/> {isAdding ? 'ĐÓNG' : 'THÊM GV'}
                        </button>
                        <button onClick={exportTemplate} className="bg-white border-2 border-slate-100 text-slate-600 px-8 py-5 rounded-[1.8rem] flex items-center gap-3 font-black hover:bg-slate-50 transition-all">
                            <Download size={24} className="text-blue-500"/> FILE MẪU
                        </button>
                        <input type="file" ref={fileRef} className="hidden" onChange={handleImport} accept=".xlsx, .xls"/>
                        <button onClick={() => fileRef.current?.click()} className="bg-emerald-600 text-white px-10 py-5 rounded-[1.8rem] flex items-center gap-3 font-black shadow-2xl hover:bg-emerald-700 transition-all">
                            <FileSpreadsheet size={24}/> NHẬP EXCEL
                        </button>
                    </div>
                </div>

                {isAdding && <AddTeacherForm onAdd={(gv: any) => { updateData({ teachers: [gv, ...data.teachers] }); setIsAdding(false); }} subjects={data.subjectConfigs} allTeachers={data.teachers} rolesConfig={data.roles} />}

                <div className="bg-white rounded-[4rem] border-2 border-slate-50 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b">
                            <tr className="text-[11px] font-black uppercase text-slate-400">
                                <th className="p-10">Giáo viên & Kiêm nhiệm</th>
                                <th className="p-10 text-center">Giảm trừ</th>
                                <th className="p-10 text-center">Định mức thực</th>
                                <th className="p-10 text-center">Tiết TKB</th>
                                <th className="p-10"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.teachers.map((t: any) => {
                                const reduction = getTeacherReduction(t.roles);
                                const actualQuota = Math.max(0, data.standardQuota - reduction);
                                return (
                                    <tr key={t.id} className="border-b group hover:bg-slate-50/50 transition-all">
                                        <td className="p-10">
                                            <div className="font-black text-slate-800 text-2xl mb-3">{t.name}</div>
                                            <div className="flex flex-wrap gap-2">
                                                {t.roles.map((r: string) => (
                                                    <span key={r} className="px-3 py-1 bg-blue-50 text-blue-600 text-[9px] font-black uppercase rounded-lg border border-blue-100">{r}</span>
                                                ))}
                                                {t.roles.length === 0 && <span className="text-[9px] font-black text-slate-300 uppercase italic tracking-widest">Không kiêm nhiệm</span>}
                                            </div>
                                        </td>
                                        <td className="p-10 text-center text-xl font-black text-blue-400">-{reduction}</td>
                                        <td className="p-10 text-center text-2xl font-black text-slate-800">{actualQuota}</td>
                                        <td className="p-10 text-center">
                                            <div className="inline-block px-8 py-4 bg-slate-50 text-slate-700 rounded-2xl font-black text-3xl">
                                                {getTeacherTKBPeriods(t.assignments)}
                                            </div>
                                        </td>
                                        <td className="p-10 text-right">
                                            <button onClick={() => updateData({ teachers: data.teachers.filter((x: any) => x.id !== t.id) })} className="text-slate-200 hover:text-red-500 p-4"><Trash2 size={24}/></button>
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

    // --- TAB CẤU HÌNH ---
    const ConfigTab = () => (
        <div className="p-10 animate-fadeIn">
            <h2 className="text-3xl font-black mb-12 text-slate-800 tracking-tighter">Cài đặt Hệ thống</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="space-y-12">
                    <div className="bg-white p-10 rounded-[3.5rem] border-2 border-slate-100 shadow-sm">
                        <label className="block text-[11px] font-black text-slate-400 uppercase mb-5 tracking-widest">Định mức chuẩn THCS (Tiết/Tuần)</label>
                        <input type="number" value={data.standardQuota} onChange={e => updateData({standardQuota: parseFloat(e.target.value)})} className="text-8xl font-black text-blue-600 outline-none w-full bg-transparent tracking-tighter"/>
                    </div>
                    <div className="bg-white p-10 rounded-[3.5rem] border-2 border-slate-100 shadow-sm">
                        <h3 className="font-black text-slate-700 uppercase text-xs tracking-widest mb-8 flex items-center gap-3"><Briefcase className="text-blue-500"/> Danh sách Kiêm nhiệm</h3>
                        <div className="space-y-4">
                            {data.roles.map((r: any, i: number) => (
                                <div key={r.id} className="flex justify-between items-center py-4 border-b border-slate-50">
                                    <span className="font-black text-slate-600 uppercase text-[11px]">{r.name}</span>
                                    <div className="flex items-center gap-4">
                                        <span className="text-[10px] font-black text-slate-300">GIẢM</span>
                                        <input type="number" className="w-16 p-2 bg-slate-50 rounded-xl text-center font-black text-blue-600" value={r.reduction} onChange={e => {
                                            const nr = [...data.roles]; nr[i].reduction = parseFloat(e.target.value); updateData({roles: nr});
                                        }}/>
                                        <button onClick={() => updateData({roles: data.roles.filter((x: any) => x.id !== r.id)})} className="text-slate-200 hover:text-red-400"><X size={16}/></button>
                                    </div>
                                </div>
                            ))}
                            <button onClick={() => updateData({roles: [...data.roles, {id: Date.now().toString(), name: 'Việc mới', reduction: 0}]})} className="w-full p-4 border-2 border-dashed border-slate-100 rounded-2xl text-[10px] font-black text-slate-300 uppercase hover:border-blue-200 hover:text-blue-400 transition-all">+ Thêm loại kiêm nhiệm mới</button>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-10 rounded-[3.5rem] border-2 border-slate-100 shadow-sm flex flex-col">
                   <h3 className="font-black text-slate-700 uppercase text-xs tracking-widest mb-8 flex items-center gap-3"><Book className="text-blue-500"/> Định mức Môn học</h3>
                   <div className="space-y-4 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
                       {data.subjectConfigs.map((s: any, i: number) => (
                           <div key={i} className="flex justify-between items-center py-4 border-b border-slate-50 group hover:bg-slate-50 rounded-2xl px-4 transition-all">
                               <span className="font-black text-slate-600 uppercase text-[11px]">{s.name}</span>
                               <input type="number" step="0.5" className="w-20 p-3 bg-slate-100 rounded-xl text-center font-black text-blue-600 outline-none" value={s.periods} onChange={e => {
                                   const nc = [...data.subjectConfigs]; nc[i].periods = parseFloat(e.target.value); updateData({subjectConfigs: nc});
                               }}/>
                           </div>
                       ))}
                   </div>
                </div>
            </div>
        </div>
    );

    // --- TAB TIẾT DẠY ---
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
                    <button onClick={() => { updateData({ weeklyData: {...data.weeklyData, [currentWeek]: tempLogs} }); setSyncStatus({loading: false, message: 'Đã lưu tuần '+currentWeek, type: 'success'}); setTimeout(()=>setSyncStatus({loading:false,message:'',type:''}),2000); }} className="bg-blue-600 text-white px-16 py-6 rounded-[2.5rem] font-black text-xl shadow-2xl hover:bg-blue-700 transition-all">LƯU DỮ LIỆU</button>
                </div>
                <div className="bg-white rounded-[4.5rem] border-2 border-slate-50 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b-2 border-slate-100 text-[11px] font-black uppercase text-slate-400">
                            <tr><th className="p-10">Giáo viên</th><th className="p-10 text-center">Thực dạy tuần {currentWeek}</th></tr>
                        </thead>
                        <tbody>
                            {data.teachers.map((t: any) => (
                                <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-all">
                                    <td className="p-10">
                                        <div className="font-black text-slate-700 text-2xl">{t.name}</div>
                                        <div className="text-[10px] font-black text-slate-300 uppercase mt-2">ĐỊNH MỨC THỰC: {data.standardQuota - getTeacherReduction(t.roles)} TIẾT</div>
                                    </td>
                                    <td className="p-10">
                                        <input type="number" step="0.5" className="w-40 mx-auto block text-center p-8 bg-emerald-50 rounded-[2.5rem] font-black text-6xl text-emerald-700 outline-none shadow-inner" value={tempLogs[t.id] || 0} onChange={e => setTempLogs({...tempLogs, [t.id]: parseFloat(e.target.value) || 0})}/>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    // --- TAB BÁO CÁO LŨY TIẾN ---
    const ReportTab = () => {
        const [weeks, setWeeks] = useState(4); // Mặc định báo cáo theo tháng (4 tuần)
        const stats = useMemo(() => {
            return data.teachers.map((t: any) => {
                const reduction = getTeacherReduction(t.roles);
                const actualQuotaPerWeek = Math.max(0, data.standardQuota - reduction);
                const totalQuota = actualQuotaPerWeek * weeks;
                let totalActual = 0;
                for(let i=1; i<=weeks; i++) {
                    totalActual += (data.weeklyData[i]?.[t.id] || 0);
                }
                return { 
                    name: t.name, 
                    reduction, 
                    actualQuotaPerWeek, 
                    totalQuota, 
                    totalActual, 
                    balance: totalActual - totalQuota 
                };
            });
        }, [data, weeks]);

        return (
            <div className="p-10 animate-fadeIn">
                <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
                    <div>
                        <h2 className="text-4xl font-black text-slate-800 tracking-tighter mb-4">Báo cáo Quyết toán Dôi dư</h2>
                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Tính toán dựa trên định mức chuẩn {data.standardQuota} tiết và kiêm nhiệm</p>
                    </div>
                    <div className="bg-slate-100 p-3 rounded-[2.5rem] flex items-center gap-4">
                        <span className="text-[10px] font-black text-slate-400 ml-4 uppercase">Tổng hợp trong:</span>
                        <input type="number" value={weeks} onChange={e => setWeeks(parseInt(e.target.value) || 1)} className="w-20 p-4 bg-white rounded-3xl text-center font-black text-blue-600 outline-none shadow-sm"/>
                        <span className="text-[10px] font-black text-slate-400 mr-4 uppercase">TUẦN</span>
                    </div>
                </div>

                <div className="bg-white rounded-[4.5rem] border-2 border-slate-50 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400">
                            <tr>
                                <th className="p-10">Giáo viên</th>
                                <th className="p-10 text-center">Giảm trừ/Tuần</th>
                                <th className="p-10 text-center">Định mức/Tuần</th>
                                <th className="p-10 text-center">Tổng định mức ({weeks}t)</th>
                                <th className="p-10 text-center">Tổng thực dạy</th>
                                <th className="p-10 text-center bg-blue-50/50">Dôi dư/Thiếu</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.map((s: any, i: number) => (
                                <tr key={i} className="border-b hover:bg-slate-50/50 transition-all">
                                    <td className="p-10 font-black text-slate-700 text-xl">{s.name}</td>
                                    <td className="p-10 text-center text-blue-400 font-black">-{s.reduction}</td>
                                    <td className="p-10 text-center font-black">{s.actualQuotaPerWeek}</td>
                                    <td className="p-10 text-center font-black text-slate-400">{s.totalQuota.toFixed(1)}</td>
                                    <td className="p-10 text-center font-black text-2xl text-slate-800">{s.totalActual.toFixed(1)}</td>
                                    <td className={`p-10 text-center text-3xl font-black ${s.balance >= 0 ? 'text-emerald-600 bg-emerald-50/20' : 'text-red-500 bg-red-50/20'}`}>
                                        {s.balance > 0 ? `+${s.balance.toFixed(1)}` : s.balance.toFixed(1)}
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
        <div className="p-10 text-center py-32 animate-fadeIn">
            <h2 className="text-4xl font-black text-slate-800 mb-12 tracking-tighter">Quản lý Dữ liệu</h2>
            <div className="flex flex-col md:flex-row gap-6 justify-center max-w-2xl mx-auto">
                <button onClick={() => {
                    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url; a.download = `THCS_PRO_BACKUP.json`; a.click();
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
                        <h1 className="font-black text-3xl tracking-tighter text-slate-800 uppercase">THCS PRO <span className="text-blue-600 text-sm align-top">v4.2</span></h1>
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
