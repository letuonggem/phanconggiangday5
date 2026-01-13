
import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { 
    LayoutDashboard, Users, CalendarDays, FileText, Settings, 
    Trash2, X, ChevronLeft, ChevronRight, 
    Plus, FileSpreadsheet, UserPlus, Book, ChevronDown,
    AlertCircle, Briefcase, CopyCheck, Square, CheckSquare,
    CheckCircle2, AlertTriangle, Download, FileUp, Edit3, Check,
    Info, PlusCircle, Calculator
} from 'lucide-react';

// --- CẤU HÌNH HỆ THỐNG ---
const STORAGE_KEY = 'thcs_teaching_mgmt_v5_6_final';

const DEFAULT_SUBJECT_CONFIGS = [
    { name: 'Toán', periods: 4 }, { name: 'Ngữ văn', periods: 4 },
    { name: 'Tiếng Anh', periods: 3 }, { name: 'Vật lý', periods: 1 },
    { name: 'Hóa học', periods: 2 }, { name: 'Sinh học', periods: 2 },
    { name: 'Lịch sử', periods: 1.5 }, { name: 'Địa lý', periods: 1.5 },
    { name: 'GDCD', periods: 1 }, { name: 'Tin học', periods: 1 },
    { name: 'Công nghệ', periods: 1 }, { name: 'Thể dục', periods: 2 },
    { name: 'Nhạc - Họa', periods: 1 }, { name: 'HĐTN - HN', periods: 3 }
];

const DEFAULT_ROLES = [
    { id: 'r1', name: 'Chủ nhiệm', reduction: 4 },
    { id: 'r2', name: 'Tổ trưởng', reduction: 3 },
    { id: 'r3', name: 'Tổ phó', reduction: 1 },
    { id: 'r4', name: 'Thư ký', reduction: 2 },
    { id: 'r5', name: 'TPT Đội', reduction: 10 }
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
    const [syncStatus, setSyncStatus] = useState({ message: '', type: '' });
    const [currentWeek, setCurrentWeek] = useState(1);

    const [data, setData] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) return JSON.parse(saved);
        return { 
            standardQuota: 19, 
            roles: DEFAULT_ROLES,
            subjectConfigs: DEFAULT_SUBJECT_CONFIGS,
            teachers: [], 
            weeklyAssignments: {}, 
            weeklyData: {} // Cấu trúc mới: { [week]: { [teacherId]: { actual: number, extra: number } } }
        };
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }, [data]);

    const updateData = (newData: any) => setData((prev: any) => ({ ...prev, ...newData }));

    const getTKBPeriods = useMemo(() => {
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
        return (teacherRoles || []).reduce((sum, roleName) => {
            const r = data.roles.find((x: any) => x.name === roleName);
            return sum + (r ? r.reduction : 0);
        }, 0);
    };

    // --- FORM THÊM GIÁO VIÊN ---
    const AddTeacherForm = ({ onAdd }: any) => {
        const [name, setName] = useState('');
        const [sub, setSub] = useState('');
        const [cls, setCls] = useState('');
        const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

        const toggleRole = (rName: string) => {
            setSelectedRoles(prev => prev.includes(rName) ? prev.filter(x => x !== rName) : [...prev, rName]);
        };

        const handleSubmit = () => {
            if (!name || !sub || !cls) return alert("Vui lòng điền đủ: Họ tên, Môn chính và Lớp!");
            const teacherId = Date.now().toString();
            const teacher = { id: teacherId, name, roles: selectedRoles };
            const assignment = `${sub}: ${normalizeClassStr(cls)}`;
            onAdd(teacher, assignment);
            setName(''); setSub(''); setCls(''); setSelectedRoles([]);
        };

        return (
            <div className="mb-10 bg-blue-50/50 border-2 border-blue-100 p-8 rounded-[3.5rem] animate-fadeIn shadow-sm">
                <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-start">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-blue-500 uppercase ml-2 tracking-widest">Họ tên GV mới</label>
                        <input type="text" placeholder="Nguyễn Văn A" className="w-full p-4 bg-white rounded-2xl border-none shadow-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all" value={name} onChange={e => setName(e.target.value)}/>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-blue-500 uppercase ml-2 tracking-widest">Môn chính</label>
                        <div className="relative">
                            <select className="w-full p-4 bg-white rounded-2xl border-none shadow-sm font-bold text-slate-700 outline-none focus:ring-2 appearance-none cursor-pointer" value={sub} onChange={e => setSub(e.target.value)}>
                                <option value="">-- Chọn môn --</option>
                                {data.subjectConfigs.map((s: any) => <option key={s.name} value={s.name}>{s.name}</option>)}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={16}/>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-blue-500 uppercase ml-2 tracking-widest">Lớp giảng dạy</label>
                        <input type="text" placeholder="6A1, 7B2" className="w-full p-4 bg-white rounded-2xl border-none shadow-sm font-bold text-slate-700 outline-none focus:ring-2 transition-all" value={cls} onChange={e => setCls(e.target.value)}/>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-blue-500 uppercase ml-2 tracking-widest">Chức vụ kiêm nhiệm</label>
                        <div className="relative">
                            <select className="w-full p-4 bg-white rounded-2xl border-none shadow-sm font-bold text-slate-700 outline-none focus:ring-2 appearance-none cursor-pointer" value="" onChange={e => toggleRole(e.target.value)}>
                                <option value="">+ Thêm chức vụ</option>
                                {data.roles.map((r: any) => <option key={r.id} value={r.name}>{r.name} (-{r.reduction}t)</option>)}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={16}/>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                            {selectedRoles.map(r => (
                                <span key={r} className="bg-blue-600 text-white text-[9px] px-2 py-1 rounded-lg flex items-center gap-1 font-black">
                                    {r} <X size={10} className="cursor-pointer" onClick={() => toggleRole(r)}/>
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="pt-6">
                        <button onClick={handleSubmit} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                            <Plus size={18}/> THÊM GIÁO VIÊN
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // --- TAB PHÂN CÔNG ---
    const TeacherTab = () => {
        const [isAdding, setIsAdding] = useState(false);
        const [selectedIds, setSelectedIds] = useState<string[]>([]);
        const [editingId, setEditingId] = useState<string | null>(null);
        const [editState, setEditState] = useState<{name: string, roles: string[]}>({ name: '', roles: [] });
        const fileRef = useRef<HTMLInputElement>(null);
        const currentAssignments = data.weeklyAssignments[currentWeek] || {};

        const toggleSelectAll = () => {
            if (selectedIds.length === data.teachers.length) setSelectedIds([]);
            else setSelectedIds(data.teachers.map((t: any) => t.id));
        };

        const toggleSelect = (id: string) => {
            setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
        };

        const startEditing = (teacher: any) => {
            setEditingId(teacher.id);
            setEditState({ name: teacher.name, roles: teacher.roles || [] });
        };

        const saveEdit = () => {
            if (!editState.name.trim()) return alert("Họ tên không được để trống!");
            const newTeachers = data.teachers.map((t: any) => 
                t.id === editingId ? { ...t, name: editState.name, roles: editState.roles } : t
            );
            updateData({ teachers: newTeachers });
            setEditingId(null);
            setSyncStatus({ message: 'Đã cập nhật thông tin thành công', type: 'success' });
            setTimeout(() => setSyncStatus({ message: '', type: '' }), 2000);
        };

        const toggleEditRole = (roleName: string) => {
            setEditState(prev => ({
                ...prev,
                roles: prev.roles.includes(roleName) ? prev.roles.filter(r => r !== roleName) : [...prev.roles, roleName]
            }));
        };

        const copySelective = () => {
            if (currentWeek <= 1) return alert("Không có dữ liệu tuần trước!");
            const prev = data.weeklyAssignments[currentWeek - 1];
            if (!prev) return alert("Dữ liệu tuần trước trống!");
            const newCurrent = { ...currentAssignments };
            selectedIds.forEach(id => { if (prev[id]) newCurrent[id] = prev[id]; });
            updateData({ weeklyAssignments: { ...data.weeklyAssignments, [currentWeek]: newCurrent } });
            setSyncStatus({ message: `Đã sao chép phân công cho ${selectedIds.length} giáo viên`, type: 'success' });
            setTimeout(() => setSyncStatus({ message: '', type: '' }), 3000);
            setSelectedIds([]); 
        };

        const handleImport = (e: any) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt: any) => {
                // @ts-ignore
                const wb = XLSX.read(evt.target.result, {type:'binary'});
                // @ts-ignore
                const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
                const newTeachers = [...data.teachers];
                const newWeekAssignments = { ...currentAssignments };
                rows.forEach((row: any, i: number) => {
                    const name = row['Họ tên'] || row['GV'] || 'GV Mới';
                    const assignments = row['Phân công (Môn: Lớp1, Lớp2)'] || '';
                    const rolesRaw = row['Kiêm nhiệm'] || '';
                    let teacher = newTeachers.find(t => t.name.toLowerCase() === name.toLowerCase());
                    if (!teacher) {
                        teacher = { id: (Date.now() + i).toString(), name, roles: rolesRaw.toString().split(',').map((s: string) => s.trim()).filter((s: string) => s) };
                        newTeachers.push(teacher);
                    }
                    newWeekAssignments[teacher.id] = assignments;
                });
                updateData({ teachers: newTeachers, weeklyAssignments: { ...data.weeklyAssignments, [currentWeek]: newWeekAssignments } });
                setSyncStatus({ message: `Đã nạp dữ liệu Excel thành công`, type: 'success' });
            };
            reader.readAsBinaryString(file);
        };

        return (
            <div className="p-8 animate-fadeIn">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-12">
                    <div className="flex items-center gap-6 bg-white border-2 border-slate-100 p-4 rounded-[2.5rem] shadow-sm">
                        <button onClick={() => setCurrentWeek(Math.max(1, currentWeek-1))} className="p-4 hover:bg-slate-100 rounded-2xl transition-colors"><ChevronLeft/></button>
                        <div className="px-10 text-center">
                            <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">PHÂN CÔNG TUẦN</div>
                            <div className="text-4xl font-black tracking-tighter">{currentWeek}</div>
                        </div>
                        <button onClick={() => setCurrentWeek(currentWeek+1)} className="p-4 hover:bg-slate-100 rounded-2xl transition-colors"><ChevronRight/></button>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <input type="file" ref={fileRef} className="hidden" onChange={handleImport} accept=".xlsx, .xls, .csv"/>
                        <button onClick={() => fileRef.current?.click()} className="bg-emerald-600 text-white px-6 py-4 rounded-2xl flex items-center gap-2 font-bold shadow-lg hover:bg-emerald-700 transition-all"><FileUp size={20}/> Nhập Excel</button>
                        <button onClick={() => setIsAdding(!isAdding)} className="bg-blue-600 text-white px-6 py-4 rounded-2xl flex items-center gap-2 font-bold shadow-xl hover:bg-blue-700 transition-all">{isAdding ? 'Đóng Form' : 'Thêm giáo viên'}</button>
                    </div>
                </div>

                {isAdding && (
                    <AddTeacherForm onAdd={(teacher: any, assignment: string) => {
                        updateData({ 
                            teachers: [teacher, ...data.teachers],
                            weeklyAssignments: { ...data.weeklyAssignments, [currentWeek]: { ...currentAssignments, [teacher.id]: assignment } }
                        });
                        setIsAdding(false);
                    }}/>
                )}

                <div className="bg-white rounded-[3.5rem] border-2 border-slate-50 overflow-hidden shadow-sm">
                    <div className="p-6 bg-slate-50 border-b flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button onClick={toggleSelectAll} className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 hover:text-blue-600 transition-colors">
                                {selectedIds.length === data.teachers.length && data.teachers.length > 0 ? <CheckSquare size={20} className="text-blue-600"/> : <Square size={20}/>}
                                Chọn tất cả
                            </button>
                            {selectedIds.length > 0 && (
                                <button onClick={copySelective} className="bg-emerald-50 text-emerald-600 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-emerald-100 animate-fadeIn"><CopyCheck size={16}/> Sao chép tuần trước ({selectedIds.length})</button>
                            )}
                        </div>
                    </div>
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400">
                            <tr>
                                <th className="p-8 w-16"></th>
                                <th className="p-8">Giáo viên & Chức vụ</th>
                                <th className="p-8">Phân công TKB (Tuần {currentWeek})</th>
                                <th className="p-8 text-center">Tiết</th>
                                <th className="p-8">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.teachers.map((t: any) => {
                                const assignment = currentAssignments[t.id] || "";
                                const isSelected = selectedIds.includes(t.id);
                                const isEditing = editingId === t.id;
                                return (
                                    <tr key={t.id} className={`border-b transition-all ${isSelected ? 'bg-blue-50/40' : 'hover:bg-slate-50/50'}`}>
                                        <td className="p-8 text-center">
                                            <button onClick={() => toggleSelect(t.id)} className="text-slate-300 hover:text-blue-500">
                                                {isSelected ? <CheckSquare size={24} className="text-blue-600"/> : <Square size={24}/>}
                                            </button>
                                        </td>
                                        <td className="p-8">
                                            {isEditing ? (
                                                <div className="space-y-2">
                                                    <input type="text" className="w-full p-2 border rounded-xl font-bold" value={editState.name} onChange={e => setEditState({ ...editState, name: e.target.value })}/>
                                                    <div className="flex flex-wrap gap-1">
                                                        {data.roles.map((r: any) => (
                                                            <button key={r.id} onClick={() => toggleEditRole(r.name)} className={`text-[8px] px-2 py-0.5 rounded border ${editState.roles.includes(r.name) ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}>{r.name}</button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="font-black text-slate-800 text-xl">{t.name}</div>
                                                    <div className="flex gap-1">{(t.roles || []).map((r: string) => <span key={r} className="text-[8px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded uppercase font-black">{r}</span>)}</div>
                                                </>
                                            )}
                                        </td>
                                        <td className="p-8">
                                            <input type="text" className="w-full p-4 bg-white/50 rounded-2xl border-none font-bold text-slate-600 focus:ring-2 shadow-inner" value={assignment} onChange={e => updateData({ weeklyAssignments: { ...data.weeklyAssignments, [currentWeek]: { ...currentAssignments, [t.id]: e.target.value } } })}/>
                                        </td>
                                        <td className="p-8 text-center font-black text-slate-800 text-2xl">{getTKBPeriods(assignment)}</td>
                                        <td className="p-8 text-right">
                                            <div className="flex justify-end gap-2">
                                                {isEditing ? (
                                                    <button onClick={saveEdit} className="text-emerald-500 p-2"><Check/></button>
                                                ) : (
                                                    <>
                                                        <button onClick={() => startEditing(t)} className="text-slate-200 hover:text-blue-500 p-2"><Edit3 size={20}/></button>
                                                        <button onClick={() => updateData({ teachers: data.teachers.filter((x: any) => x.id !== t.id) })} className="text-slate-200 hover:text-red-500 p-2"><Trash2 size={20}/></button>
                                                    </>
                                                )}
                                            </div>
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

    // --- TAB THỰC DẠY (GHI NHẬN BIẾN ĐỘNG) ---
    const WeeklyTab = () => {
        const [tempLogs, setTempLogs] = useState<Record<string, {actual: number, extra: number}>>({});

        useEffect(() => {
            const recorded = data.weeklyData[currentWeek] || {};
            const assignments = data.weeklyAssignments[currentWeek] || {};
            const initial: Record<string, {actual: number, extra: number}> = {};
            
            data.teachers.forEach((t: any) => {
                const tkb = getTKBPeriods(assignments[t.id] || "");
                if (recorded[t.id]) {
                    initial[t.id] = { 
                        actual: recorded[t.id].actual ?? tkb, 
                        extra: recorded[t.id].extra ?? 0 
                    };
                } else {
                    initial[t.id] = { actual: tkb, extra: 0 };
                }
            });
            setTempLogs(initial);
        }, [currentWeek, data.weeklyData, data.weeklyAssignments, data.teachers]);

        const handleSave = () => {
            updateData({ weeklyData: { ...data.weeklyData, [currentWeek]: tempLogs } });
            setSyncStatus({ message: `Đã lưu thực dạy tuần ${currentWeek}`, type: 'success' });
            setTimeout(() => setSyncStatus({ message: '', type: '' }), 2000);
        };

        return (
            <div className="p-8">
                <div className="flex justify-between items-center mb-12">
                    <div className="flex items-center gap-6 bg-white border-2 border-slate-100 p-4 rounded-[2.5rem] shadow-sm">
                        <button onClick={() => setCurrentWeek(Math.max(1, currentWeek-1))} className="p-4 hover:bg-slate-100 rounded-2xl transition-colors"><ChevronLeft/></button>
                        <div className="px-10 text-center">
                            <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">GHI NHẬN THỰC DẠY</div>
                            <div className="text-4xl font-black tracking-tighter">Tuần {currentWeek}</div>
                        </div>
                        <button onClick={() => setCurrentWeek(currentWeek+1)} className="p-4 hover:bg-slate-100 rounded-2xl transition-colors"><ChevronRight/></button>
                    </div>
                    <button onClick={handleSave} className="bg-blue-600 text-white px-12 py-5 rounded-[2rem] font-black shadow-xl hover:bg-blue-700 transition-all uppercase flex items-center gap-3">
                        <Calculator size={20}/> CHỐT TIẾT TUẦN
                    </button>
                </div>

                <div className="bg-white rounded-[4rem] border-2 border-slate-50 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400">
                            <tr>
                                <th className="p-10 w-1/4">Giáo viên</th>
                                <th className="p-10 text-center">Thực dạy (Theo TKB)</th>
                                <th className="p-10 text-center">Bù / Tăng tiết</th>
                                <th className="p-10 text-center bg-blue-50/50">Tổng cộng tuần</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.teachers.map((t: any) => {
                                const log = tempLogs[t.id] || { actual: 0, extra: 0 };
                                const total = log.actual + log.extra;
                                return (
                                    <tr key={t.id} className="border-b hover:bg-slate-50/50 transition-all">
                                        <td className="p-10">
                                            <div className="font-black text-slate-700 text-2xl">{t.name}</div>
                                            <div className="text-[10px] font-bold text-slate-300 uppercase mt-1">
                                                Gốc TKB: {getTKBPeriods(data.weeklyAssignments[currentWeek]?.[t.id] || "")}t
                                            </div>
                                        </td>
                                        <td className="p-10">
                                            <div className="flex flex-col items-center gap-2">
                                                <input 
                                                    type="number" step="0.5" 
                                                    className="w-32 text-center p-4 bg-emerald-50 rounded-2xl font-black text-3xl text-emerald-700 outline-none border-2 border-transparent focus:border-emerald-200 transition-all" 
                                                    value={log.actual} 
                                                    onChange={e => setTempLogs({...tempLogs, [t.id]: { ...log, actual: parseFloat(e.target.value) || 0 }})}
                                                />
                                                <span className="text-[8px] font-black text-emerald-600/50 uppercase">Tiết TKB</span>
                                            </div>
                                        </td>
                                        <td className="p-10">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="relative">
                                                    <input 
                                                        type="number" step="0.5" 
                                                        className="w-32 text-center p-4 bg-orange-50 rounded-2xl font-black text-3xl text-orange-700 outline-none border-2 border-transparent focus:border-orange-200 transition-all pl-10" 
                                                        value={log.extra} 
                                                        onChange={e => setTempLogs({...tempLogs, [t.id]: { ...log, extra: parseFloat(e.target.value) || 0 }})}
                                                    />
                                                    <PlusCircle size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-300" />
                                                </div>
                                                <span className="text-[8px] font-black text-orange-600/50 uppercase">Dạy bù / Tăng</span>
                                            </div>
                                        </td>
                                        <td className="p-10 text-center bg-blue-50/20">
                                            <div className="text-5xl font-black text-blue-600 tracking-tighter">
                                                {total % 1 === 0 ? total : total.toFixed(1)}
                                            </div>
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

    // --- TAB BÁO CÁO (LŨY KẾ THÔNG MINH) ---
    const ReportTab = () => {
        const [weeks, setWeeks] = useState(4);
        
        const stats = useMemo(() => {
            return data.teachers.map((t: any) => {
                const reduction = getTeacherReduction(t.roles);
                const actualQuotaPerWeek = Math.max(0, data.standardQuota - reduction);
                let totalQuota = 0;
                let totalActual = 0;
                let totalExtra = 0;

                for (let i = 1; i <= weeks; i++) {
                    totalQuota += actualQuotaPerWeek;
                    const weekEntry = data.weeklyData[i]?.[t.id];
                    
                    if (weekEntry) {
                        // Nếu đã ghi nhận tuần đó: Lấy con số cụ thể
                        totalActual += (weekEntry.actual || 0);
                        totalExtra += (weekEntry.extra || 0);
                    } else {
                        // Nếu chưa ghi nhận: Tự động tính theo TKB của tuần đó
                        const planned = getTKBPeriods(data.weeklyAssignments[i]?.[t.id] || "");
                        totalActual += planned;
                    }
                }
                const totalTeaching = totalActual + totalExtra;
                return { 
                    name: t.name, 
                    actualQuotaPerWeek, 
                    totalQuota, 
                    totalActual, 
                    totalExtra, 
                    totalTeaching,
                    balance: totalTeaching - totalQuota 
                };
            });
        }, [data, weeks]);

        return (
            <div className="p-8 animate-fadeIn">
                <div className="flex justify-between items-end mb-12">
                    <div>
                        <h2 className="text-3xl font-black text-slate-800 tracking-tighter mb-2 uppercase">Quyết toán Tiết dạy & Dôi dư</h2>
                        <div className="flex items-center gap-4">
                            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest flex items-center gap-2">
                                <Info size={14} className="text-blue-500"/> Dữ liệu lũy kế từ tuần 1 đến tuần {weeks}
                            </p>
                        </div>
                    </div>
                    <div className="bg-slate-100 p-3 rounded-[2rem] flex items-center gap-4 shadow-sm border border-slate-200">
                        <span className="text-[10px] font-black text-slate-400 ml-4 uppercase">Xem đến tuần:</span>
                        <input type="number" value={weeks} onChange={e => setWeeks(parseInt(e.target.value) || 1)} className="w-20 p-3 bg-white rounded-xl text-center font-black text-blue-600 outline-none shadow-sm border-none"/>
                    </div>
                </div>

                <div className="bg-white rounded-[3.5rem] border-2 border-slate-50 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400">
                            <tr>
                                <th className="p-8">Giáo viên</th>
                                <th className="p-8 text-center">Định mức ({weeks}t)</th>
                                <th className="p-8 text-center">Tổng Thực dạy</th>
                                <th className="p-8 text-center text-orange-600">Tổng Bù/Tăng</th>
                                <th className="p-8 text-center text-blue-600 bg-blue-50/30">Tổng Lũy kế</th>
                                <th className="p-8 text-center bg-slate-100">Dôi dư</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.map((s: any, i: number) => (
                                <tr key={i} className="border-b hover:bg-slate-50/50 transition-all">
                                    <td className="p-8">
                                        <div className="font-black text-slate-700 text-xl">{s.name}</div>
                                        <div className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter">Định mức: {s.actualQuotaPerWeek}t/tuần</div>
                                    </td>
                                    <td className="p-8 text-center font-black text-slate-400">{s.totalQuota.toFixed(1)}</td>
                                    <td className="p-8 text-center font-black text-slate-800 text-xl">{s.totalActual.toFixed(1)}</td>
                                    <td className="p-8 text-center font-black text-orange-600 text-xl">+{s.totalExtra.toFixed(1)}</td>
                                    <td className="p-8 text-center font-black text-3xl text-blue-700 bg-blue-50/10 tracking-tighter">{s.totalTeaching.toFixed(1)}</td>
                                    <td className={`p-8 text-center text-3xl font-black ${s.balance >= 0 ? 'text-emerald-600 bg-emerald-50/25' : 'text-red-500 bg-red-50/25'}`}>
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

    // --- TAB CẤU HÌNH ---
    const ConfigTab = () => (
        <div className="p-8 animate-fadeIn">
            <h2 className="text-3xl font-black mb-10 text-slate-800 tracking-tighter uppercase">Cấu hình Cơ bản</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-10">
                    <div className="bg-white p-10 rounded-[3.5rem] border-2 border-slate-100 shadow-sm">
                        <label className="block text-[11px] font-black text-slate-400 uppercase mb-5 tracking-widest">Định mức chuẩn THCS (Tiết/Tuần)</label>
                        <input type="number" value={data.standardQuota} onChange={e => updateData({standardQuota: parseFloat(e.target.value)})} className="text-8xl font-black text-blue-600 outline-none w-full bg-transparent tracking-tighter"/>
                    </div>
                </div>
                <div className="bg-white p-10 rounded-[3.5rem] border-2 border-slate-100 shadow-sm flex flex-col">
                   <h3 className="font-black text-slate-700 uppercase text-xs tracking-widest mb-8 flex items-center gap-3"><Book size={18} className="text-blue-500"/> Định mức môn học</h3>
                   <div className="space-y-4 max-h-[600px] overflow-y-auto pr-4">
                       {data.subjectConfigs.map((s: any, i: number) => (
                           <div key={i} className="flex justify-between items-center py-4 border-b border-slate-50">
                               <span className="font-black text-slate-600 uppercase text-[11px]">{s.name}</span>
                               <input type="number" step="0.5" className="w-20 p-3 bg-slate-100 rounded-xl text-center font-black text-blue-600" value={s.periods} onChange={e => {
                                   const nc = [...data.subjectConfigs]; nc[i].periods = parseFloat(e.target.value); updateData({subjectConfigs: nc});
                               }}/>
                           </div>
                       ))}
                   </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
            <header className="bg-white border-b-2 border-slate-100 p-6 sticky top-0 z-50 shadow-sm">
                <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-5">
                        <div className="bg-blue-600 p-4 rounded-[1.5rem] text-white shadow-2xl rotate-3"><LayoutDashboard size={32}/></div>
                        <h1 className="font-black text-3xl tracking-tighter text-slate-800 uppercase italic">THCS PRO <span className="text-blue-600 text-sm align-top italic font-black">v5.6</span></h1>
                    </div>
                    <nav className="flex gap-2 bg-slate-100 p-2 rounded-[2.5rem] overflow-x-auto no-scrollbar max-w-full">
                        {[
                            {id: 'config', icon: Settings, label: 'Cài đặt'},
                            {id: 'teachers', icon: Users, label: 'Phân công'},
                            {id: 'weekly', icon: CalendarDays, label: 'Thực dạy'},
                            {id: 'reports', icon: FileText, label: 'Báo cáo'},
                        ].map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-3 px-8 py-4.5 rounded-[2.2rem] text-[11px] font-black transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-xl scale-105' : 'text-slate-400 hover:text-slate-600'}`}>
                                <tab.icon size={20}/> {tab.label.toUpperCase()}
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
                </div>
            </main>
            {syncStatus.message && (
                <div className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-12 py-6 rounded-[3rem] shadow-2xl flex items-center gap-4 animate-fadeIn font-black text-sm z-[100] border-2 border-white/10 shadow-blue-500/20">
                    <CheckCircle2 size={24} className="text-emerald-400" />
                    {syncStatus.message}
                </div>
            )}
        </div>
    );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
