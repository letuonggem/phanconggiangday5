
import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { 
    LayoutDashboard, Users, CalendarDays, FileText, Settings, 
    Trash2, X, ChevronLeft, ChevronRight, 
    Plus, FileSpreadsheet, UserPlus, Book, ChevronDown,
    AlertCircle, Briefcase, CopyCheck, Square, CheckSquare,
    CheckCircle2, AlertTriangle, Download, FileUp, Edit3, Check
} from 'lucide-react';

// --- CẤU HÌNH HỆ THỐNG ---
const STORAGE_KEY = 'thcs_teaching_mgmt_v5_final_pro';

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
const validateClassFormat = (className: string) => {
    const cleanName = className.trim().toUpperCase();
    if (!cleanName) return null;
    const gradeMatch = cleanName.match(/^\d+/);
    if (!gradeMatch) return `Lớp "${cleanName}" thiếu khối (6-9)`;
    const grade = parseInt(gradeMatch[0]);
    if (grade < 6 || grade > 9) return `Lớp "${cleanName}" sai khối (6-9)`;
    return null;
};

const normalizeClassStr = (str: string) => {
    if (!str) return '';
    return str.split(',')
              .map(s => s.trim().replace(/\s+/g, '').toUpperCase())
              .filter(s => s)
              .join(', ');
};

const findConflicts = (proposedAssignments: string, currentAssignments: Record<string, string>, teachers: any[], excludeTeacherId?: string) => {
    const conflicts: string[] = [];
    if (!proposedAssignments) return conflicts;
    const newParts = proposedAssignments.split(';');
    newParts.forEach(part => {
        const [subPart, clsPart] = part.split(':');
        if (!subPart || !clsPart) return;
        const subject = subPart.trim().toLowerCase();
        const inputClasses = clsPart.split(',').map(c => c.trim().toUpperCase().replace(/\s+/g, '')).filter(c => c);
        Object.entries(currentAssignments).forEach(([teacherId, existingAssignmentStr]) => {
            if (excludeTeacherId && teacherId === excludeTeacherId) return;
            const teacher = teachers.find(t => t.id === teacherId);
            if (!teacher) return;
            const existingParts = existingAssignmentStr.split(';');
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
            weeklyData: {} 
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
                    const conflicts = findConflicts(proposed, data.weeklyAssignments[currentWeek] || {}, data.teachers);
                    conflictErrs.push(...conflicts);
                }
            }
            setErrors({ format: formatErrs, conflicts: conflictErrs });
        }, [sub, cls]);

        const toggleRole = (rName: string) => {
            if (!rName) return;
            setSelectedRoles(prev => prev.includes(rName) ? prev.filter(x => x !== rName) : [...prev, rName]);
        };

        const handleSubmit = () => {
            if (!name || !sub || !cls) return alert("Vui lòng điền đủ: Họ tên, Môn chính và Lớp!");
            if (errors.format.length > 0 || errors.conflicts.length > 0) return;
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
                {(errors.format.length > 0 || errors.conflicts.length > 0) && (
                    <div className="mt-4 p-4 bg-orange-50 border border-orange-100 rounded-2xl space-y-1">
                        {errors.format.map((e, i) => <div key={i} className="text-[10px] font-bold text-orange-600 flex items-center gap-2 uppercase tracking-wide"><AlertTriangle size={14}/> {e}</div>)}
                        {errors.conflicts.map((e, i) => <div key={i} className="text-[10px] font-bold text-red-600 flex items-center gap-2 uppercase tracking-wide"><AlertCircle size={14}/> {e}</div>)}
                    </div>
                )}
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
            if (!editState.name.trim()) return alert("Tên không được để trống!");
            const newTeachers = data.teachers.map((t: any) => 
                t.id === editingId ? { ...t, name: editState.name, roles: editState.roles } : t
            );
            updateData({ teachers: newTeachers });
            setEditingId(null);
            setSyncStatus({ message: 'Đã cập nhật thông tin giáo viên', type: 'success' });
            setTimeout(() => setSyncStatus({ message: '', type: '' }), 2000);
        };

        const toggleEditRole = (roleName: string) => {
            setEditState(prev => ({
                ...prev,
                roles: prev.roles.includes(roleName) 
                    ? prev.roles.filter(r => r !== roleName) 
                    : [...prev.roles, roleName]
            }));
        };

        const copySelective = () => {
            if (currentWeek <= 1) return alert("Đây là tuần đầu tiên, không có dữ liệu tuần trước!");
            const prev = data.weeklyAssignments[currentWeek - 1];
            if (!prev || Object.keys(prev).length === 0) return alert("Dữ liệu tuần trước trống!");
            if (selectedIds.length === 0) return alert("Vui lòng tích chọn giáo viên cần sao chép!");

            const newCurrent = { ...currentAssignments };
            let count = 0;
            selectedIds.forEach(id => {
                if (prev[id]) {
                    newCurrent[id] = prev[id];
                    count++;
                }
            });

            updateData({ weeklyAssignments: { ...data.weeklyAssignments, [currentWeek]: newCurrent } });
            setSyncStatus({ message: `Đã sao chép phân công tuần ${currentWeek-1} cho ${count} giáo viên`, type: 'success' });
            setTimeout(() => setSyncStatus({ message: '', type: '' }), 3000);
            setSelectedIds([]);
        };

        const exportTemplate = () => {
            const headers = ["Họ tên", "Kiêm nhiệm (Cách nhau dấu phẩy)", "Phân công (Môn: Lớp1, Lớp2)"];
            const csvContent = "\uFEFF" + headers.join(",") + "\n" + "Nguyễn Văn A,Chủ nhiệm,Toán: 6A1, 6A2\nTrần Thị B,Tổ trưởng,Tiếng Anh: 7A1, 8A2";
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "Mau_Nhap_Lieu_THCS_PRO.csv";
            link.click();
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
                        teacher = { 
                            id: (Date.now() + i).toString(), 
                            name, 
                            roles: rolesRaw.toString().split(',').map((s: string) => s.trim()).filter((s: string) => s) 
                        };
                        newTeachers.push(teacher);
                    }
                    newWeekAssignments[teacher.id] = assignments;
                });

                updateData({ 
                    teachers: newTeachers, 
                    weeklyAssignments: { ...data.weeklyAssignments, [currentWeek]: newWeekAssignments } 
                });
                setSyncStatus({ message: `Đã nạp dữ liệu Excel cho tuần ${currentWeek}`, type: 'success' });
                setTimeout(() => setSyncStatus({ message: '', type: '' }), 3000);
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
                        <button onClick={exportTemplate} className="bg-slate-100 text-slate-600 px-6 py-4 rounded-2xl flex items-center gap-2 font-bold hover:bg-slate-200 transition-all">
                            <Download size={20}/> Tải file mẫu
                        </button>
                        <input type="file" ref={fileRef} className="hidden" onChange={handleImport} accept=".xlsx, .xls, .csv"/>
                        <button onClick={() => fileRef.current?.click()} className="bg-emerald-600 text-white px-6 py-4 rounded-2xl flex items-center gap-2 font-bold shadow-lg hover:bg-emerald-700 transition-all">
                            <FileUp size={20}/> Nhập Excel
                        </button>
                        <button onClick={() => setIsAdding(!isAdding)} className="bg-blue-600 text-white px-6 py-4 rounded-2xl flex items-center gap-2 font-bold shadow-xl hover:bg-blue-700 transition-all">
                            {isAdding ? <X size={20}/> : <UserPlus size={20}/>} {isAdding ? 'Đóng Form' : 'Thêm giáo viên'}
                        </button>
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
                                {selectedIds.length === data.teachers.length ? 'Hủy chọn tất cả' : 'Chọn tất cả'}
                            </button>
                            {selectedIds.length > 0 && (
                                <button onClick={copySelective} className="bg-emerald-50 text-emerald-600 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 animate-fadeIn border border-emerald-100">
                                    <CopyCheck size={16}/> Sao chép tuần trước ({selectedIds.length})
                                </button>
                            )}
                        </div>
                        <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Tích chọn để thao tác nhanh | Bấm cây bút để sửa thông tin gốc</div>
                    </div>
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400">
                            <tr>
                                <th className="p-8 w-16"></th>
                                <th className="p-8">Giáo viên & Chức vụ</th>
                                <th className="p-8">Chi tiết phân công (Tuần {currentWeek})</th>
                                <th className="p-8 text-center">Số tiết</th>
                                <th className="p-8"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.teachers.map((t: any) => {
                                const assignment = currentAssignments[t.id] || "";
                                const tkbPeriods = getTKBPeriods(assignment);
                                const isSelected = selectedIds.includes(t.id);
                                const isEditing = editingId === t.id;

                                return (
                                    <tr key={t.id} className={`border-b group transition-all ${isSelected ? 'bg-blue-50/40' : 'hover:bg-slate-50/50'}`}>
                                        <td className="p-8 text-center">
                                            <button onClick={() => toggleSelect(t.id)} className="text-slate-300 hover:text-blue-500 transition-colors">
                                                {isSelected ? <CheckSquare size={24} className="text-blue-600"/> : <Square size={24}/>}
                                            </button>
                                        </td>
                                        <td className="p-8">
                                            {isEditing ? (
                                                <div className="space-y-2">
                                                    <input 
                                                        type="text" 
                                                        className="w-full p-2 bg-white border border-blue-200 rounded-lg font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                                                        value={editState.name}
                                                        onChange={e => setEditState({ ...editState, name: e.target.value })}
                                                    />
                                                    <div className="flex flex-wrap gap-1">
                                                        {data.roles.map((r: any) => (
                                                            <button 
                                                                key={r.id} 
                                                                onClick={() => toggleEditRole(r.name)}
                                                                className={`text-[8px] font-black px-2 py-0.5 rounded border transition-all uppercase ${editState.roles.includes(r.name) ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-100 text-slate-400 border-slate-200'}`}
                                                            >
                                                                {r.name}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="font-black text-slate-800 text-xl mb-1">{t.name}</div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {(t.roles || []).map((r: string) => (
                                                            <span key={r} className="bg-white/80 text-blue-600 text-[8px] font-black px-2 py-0.5 rounded border border-blue-100 uppercase shadow-sm">{r}</span>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </td>
                                        <td className="p-8">
                                            <input 
                                                type="text" 
                                                placeholder="VD: Toán: 6A1, 6A2; Lý: 7A1"
                                                className="w-full p-4 bg-white/50 rounded-2xl border-none font-bold text-slate-600 focus:ring-2 focus:ring-blue-500 transition-all shadow-inner"
                                                value={assignment}
                                                onChange={e => updateData({
                                                    weeklyAssignments: {
                                                        ...data.weeklyAssignments,
                                                        [currentWeek]: { ...currentAssignments, [t.id]: e.target.value }
                                                    }
                                                })}
                                            />
                                        </td>
                                        <td className="p-8 text-center font-black text-slate-800 text-2xl">{tkbPeriods}</td>
                                        <td className="p-8 text-right">
                                            <div className="flex justify-end items-center gap-2">
                                                {isEditing ? (
                                                    <>
                                                        <button onClick={saveEdit} className="text-emerald-500 hover:bg-emerald-50 p-2 rounded-xl transition-all" title="Lưu"><Check size={20}/></button>
                                                        <button onClick={() => setEditingId(null)} className="text-slate-400 hover:bg-slate-50 p-2 rounded-xl transition-all" title="Hủy"><X size={20}/></button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button onClick={() => startEditing(t)} className="text-slate-200 hover:text-blue-500 p-2 transition-colors" title="Sửa thông tin"><Edit3 size={20}/></button>
                                                        <button onClick={() => updateData({ teachers: data.teachers.filter((x: any) => x.id !== t.id) })} className="text-slate-200 hover:text-red-500 p-2 transition-colors" title="Xóa giáo viên"><Trash2 size={20}/></button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {data.teachers.length === 0 && <div className="p-32 text-center text-slate-300 font-black italic uppercase tracking-widest">Chưa có giáo viên. Vui lòng nạp Excel hoặc thêm mới.</div>}
                </div>
            </div>
        );
    };

    // --- TAB TIẾT DẠY ---
    const WeeklyTab = () => {
        const [tempLogs, setTempLogs] = useState(data.weeklyData[currentWeek] || {});
        useEffect(() => { setTempLogs(data.weeklyData[currentWeek] || {}); }, [currentWeek, data.weeklyData]);

        return (
            <div className="p-8">
                <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
                    <div className="flex items-center gap-6 bg-white border-2 border-slate-100 p-4 rounded-[2.5rem] shadow-sm">
                        <button onClick={() => setCurrentWeek(Math.max(1, currentWeek-1))} className="p-4 hover:bg-slate-100 rounded-2xl transition-colors"><ChevronLeft/></button>
                        <div className="px-10 text-center">
                            <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">GHI NHẬN THỰC DẠY</div>
                            <div className="text-4xl font-black tracking-tighter">Tuần {currentWeek}</div>
                        </div>
                        <button onClick={() => setCurrentWeek(currentWeek+1)} className="p-4 hover:bg-slate-100 rounded-2xl transition-colors"><ChevronRight/></button>
                    </div>
                    <button onClick={() => { 
                        updateData({ weeklyData: {...data.weeklyData, [currentWeek]: tempLogs} }); 
                        setSyncStatus({message: 'Đã lưu dữ liệu thực dạy tuần '+currentWeek, type: 'success'}); 
                        setTimeout(()=>setSyncStatus({message:'',type:''}),2000); 
                    }} className="bg-blue-600 text-white px-12 py-5 rounded-[2rem] font-black shadow-xl hover:bg-blue-700 transition-all active:scale-95">LƯU THỰC DẠY</button>
                </div>
                <div className="bg-white rounded-[4rem] border-2 border-slate-50 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400">
                            <tr><th className="p-10">Giáo viên</th><th className="p-10">TKB Dự kiến (Tuần {currentWeek})</th><th className="p-10 text-center">Thực dạy ghi nhận</th></tr>
                        </thead>
                        <tbody>
                            {data.teachers.map((t: any) => (
                                <tr key={t.id} className="border-b hover:bg-slate-50/50 transition-all">
                                    <td className="p-10"><div className="font-black text-slate-700 text-2xl">{t.name}</div></td>
                                    <td className="p-10 text-slate-400 font-bold italic">{data.weeklyAssignments[currentWeek]?.[t.id] || "Không dạy / Nghỉ"}</td>
                                    <td className="p-10">
                                        <input type="number" step="0.5" className="w-40 mx-auto block text-center p-8 bg-emerald-50 rounded-[2.5rem] font-black text-5xl text-emerald-700 outline-none shadow-inner border-2 border-transparent focus:border-emerald-200 transition-all" value={tempLogs[t.id] || 0} onChange={e => setTempLogs({...tempLogs, [t.id]: parseFloat(e.target.value) || 0})}/>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    // --- TAB BÁO CÁO ---
    const ReportTab = () => {
        const [weeks, setWeeks] = useState(4);
        const stats = useMemo(() => {
            return data.teachers.map((t: any) => {
                const reduction = getTeacherReduction(t.roles);
                const actualQuotaPerWeek = Math.max(0, data.standardQuota - reduction);
                let totalQuota = 0;
                let totalActual = 0;
                for (let i = 1; i <= weeks; i++) {
                    totalQuota += actualQuotaPerWeek;
                    totalActual += (data.weeklyData[i]?.[t.id] || 0);
                }
                return { name: t.name, reduction, actualQuotaPerWeek, totalQuota, totalActual, balance: totalActual - totalQuota };
            });
        }, [data, weeks]);

        return (
            <div className="p-8 animate-fadeIn">
                <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-8">
                    <div>
                        <h2 className="text-3xl font-black text-slate-800 tracking-tighter mb-4 uppercase">Quyết toán Tiết dạy & Dôi dư</h2>
                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest flex items-center gap-2"><CheckCircle2 size={14} className="text-blue-500"/> Tổng hợp dữ liệu lũy kế từ tuần 1</p>
                    </div>
                    <div className="bg-slate-100 p-3 rounded-[2rem] flex items-center gap-4 border border-slate-200">
                        <span className="text-[10px] font-black text-slate-400 ml-4 uppercase">Đến tuần:</span>
                        <input type="number" value={weeks} onChange={e => setWeeks(parseInt(e.target.value) || 1)} className="w-16 p-3 bg-white rounded-xl text-center font-black text-blue-600 outline-none shadow-sm"/>
                    </div>
                </div>
                <div className="bg-white rounded-[3.5rem] border-2 border-slate-50 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400">
                            <tr>
                                <th className="p-8">Giáo viên</th>
                                <th className="p-8 text-center">Định mức/Tuần</th>
                                <th className="p-8 text-center">Tổng định mức ({weeks}t)</th>
                                <th className="p-8 text-center text-blue-600">Tổng thực dạy</th>
                                <th className="p-8 text-center bg-blue-50/50">Dôi dư</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.map((s: any, i: number) => (
                                <tr key={i} className="border-b hover:bg-slate-50/50 transition-all">
                                    <td className="p-8 font-black text-slate-700 text-xl">{s.name}</td>
                                    <td className="p-8 text-center font-black text-slate-500">{s.actualQuotaPerWeek}</td>
                                    <td className="p-8 text-center font-black text-slate-300">{s.totalQuota.toFixed(1)}</td>
                                    <td className="p-8 text-center font-black text-2xl text-slate-800">{s.totalActual.toFixed(1)}</td>
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
                    <div className="bg-white p-10 rounded-[3.5rem] border-2 border-slate-100 shadow-sm">
                        <h3 className="font-black text-slate-700 uppercase text-xs tracking-widest mb-8 flex items-center gap-3"><Briefcase className="text-blue-500"/> Quy chuẩn giảm tiết</h3>
                        <div className="space-y-4">
                            {data.roles.map((r: any, i: number) => (
                                <div key={r.id} className="flex justify-between items-center py-4 border-b border-slate-50">
                                    <span className="font-black text-slate-600 uppercase text-[11px]">{r.name}</span>
                                    <div className="flex items-center gap-4">
                                        <span className="text-[10px] font-black text-slate-300">GIẢM</span>
                                        <input type="number" className="w-16 p-2 bg-slate-50 rounded-xl text-center font-black text-blue-600" value={r.reduction} onChange={e => {
                                            const nr = [...data.roles]; nr[i].reduction = parseFloat(e.target.value); updateData({roles: nr});
                                        }}/>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="bg-white p-10 rounded-[3.5rem] border-2 border-slate-100 shadow-sm flex flex-col">
                   <h3 className="font-black text-slate-700 uppercase text-xs tracking-widest mb-8 flex items-center gap-3"><Book className="text-blue-500"/> Định mức môn học</h3>
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
                        <h1 className="font-black text-3xl tracking-tighter text-slate-800 uppercase italic">THCS PRO <span className="text-blue-600 text-sm align-top italic font-black">v5.4</span></h1>
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
