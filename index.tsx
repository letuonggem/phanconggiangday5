
import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { 
    LayoutDashboard, Users, CalendarDays, FileText, Settings, 
    Trash2, X, ChevronLeft, ChevronRight, 
    Plus, FileSpreadsheet, UserPlus, Book, ChevronDown,
    AlertCircle, Briefcase, CopyCheck, Square, CheckSquare,
    CheckCircle2, AlertTriangle, Download, FileUp, Edit3, Check,
    Info, PlusCircle, Calculator, Copy, RefreshCcw, FileDown
} from 'lucide-react';

// --- CẤU HÌNH HỆ THỐNG ---
const STORAGE_KEY = 'thcs_teaching_mgmt_v6_7_final';

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
    
    // Range cho Tab Thực dạy
    const [startRange, setStartRange] = useState(1);
    const [endRange, setEndRange] = useState(1);

    const [data, setData] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) return JSON.parse(saved);
        return { 
            standardQuota: 19, 
            roles: DEFAULT_ROLES,
            subjectConfigs: DEFAULT_SUBJECT_CONFIGS,
            weeklyRecords: {} // { [week]: { teachers: [], assignments: {}, logs: {} } }
        };
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }, [data]);

    const updateData = (newData: any) => setData((prev: any) => ({ ...prev, ...newData }));

    const getWeekData = (week: number) => {
        return data.weeklyRecords[week] || { teachers: [], assignments: {}, logs: {} };
    };

    const updateWeekData = (week: number, weekContent: any) => {
        updateData({
            weeklyRecords: {
                ...data.weeklyRecords,
                [week]: { ...getWeekData(week), ...weekContent }
            }
        });
    };

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

    // --- TAB PHÂN CÔNG ---
    const TeacherTab = () => {
        const [isAdding, setIsAdding] = useState(false);
        const [editingId, setEditingId] = useState<string | null>(null);
        const [editState, setEditState] = useState<{name: string, roles: string[]}>({ name: '', roles: [] });
        const [newTeacherRoles, setNewTeacherRoles] = useState<string[]>([]);
        const [showRoleDropdown, setShowRoleDropdown] = useState<string | null>(null); // 'adding' or 'editing-ID'
        const fileRef = useRef<HTMLInputElement>(null);
        
        const weekData = getWeekData(currentWeek);
        const { teachers, assignments, logs = {} } = weekData;

        // Logic kiểm tra trùng lớp để hiển thị cảnh báo
        const classConflicts = useMemo(() => {
            const classToTeachers: Record<string, string[]> = {};
            Object.entries(assignments).forEach(([tId, assignStr]) => {
                if (!assignStr) return;
                const teacher = teachers.find(tx => tx.id === tId);
                if (!teacher) return;
                
                (assignStr as string).split(';').forEach(part => {
                    const colonIdx = part.indexOf(':');
                    if (colonIdx === -1) return;
                    const classesPart = part.substring(colonIdx + 1);
                    const classes = classesPart.split(',').map(c => c.trim().toUpperCase()).filter(c => c);
                    
                    classes.forEach(cls => {
                        if (!classToTeachers[cls]) classToTeachers[cls] = [];
                        if (!classToTeachers[cls].includes(teacher.name)) {
                            classToTeachers[cls].push(teacher.name);
                        }
                    });
                });
            });
            
            const conflicts: Record<string, string[]> = {};
            Object.entries(classToTeachers).forEach(([cls, names]) => {
                if (names.length > 1) conflicts[cls] = names;
            });
            return conflicts;
        }, [assignments, teachers]);

        // Hàm kiểm tra trùng khi nhập liệu (để chặn nhập)
        const checkConflictBeforeInput = (newVal: string, currentTeacherId: string) => {
            const assignedClassesByOthers = new Set<string>();
            Object.entries(assignments).forEach(([tId, assignStr]) => {
                if (tId === currentTeacherId || !assignStr) return;
                (assignStr as string).split(';').forEach(part => {
                    const cIdx = part.indexOf(':');
                    if (cIdx === -1) return;
                    part.substring(cIdx + 1).split(',').forEach(c => {
                        const name = c.trim().toUpperCase();
                        if (name) assignedClassesByOthers.add(name);
                    });
                });
            });

            const newClasses = newVal.split(';').flatMap(p => {
                const cIdx = p.indexOf(':');
                if (cIdx === -1) return [];
                return p.substring(cIdx + 1).split(',').map(c => c.trim().toUpperCase()).filter(c => c);
            });

            for (const cls of newClasses) {
                if (assignedClassesByOthers.has(cls)) return cls;
            }
            return null;
        };

        const startEditing = (teacher: any) => {
            setEditingId(teacher.id);
            setEditState({ name: teacher.name, roles: teacher.roles || [] });
            setShowRoleDropdown(null);
        };

        const toggleEditRole = (roleName: string) => {
            setEditState(prev => ({
                ...prev,
                roles: prev.roles.includes(roleName) ? prev.roles.filter(r => r !== roleName) : [...prev.roles, roleName]
            }));
        };

        const toggleNewRole = (roleName: string) => {
            setNewTeacherRoles(prev => prev.includes(roleName) ? prev.filter(r => r !== roleName) : [...prev, roleName]);
        };

        const saveEdit = () => {
            if (!editState.name.trim()) return alert("Họ tên không được để trống!");
            const newTeachers = teachers.map((t: any) => 
                t.id === editingId ? { ...t, name: editState.name, roles: editState.roles } : t
            );
            updateWeekData(currentWeek, { teachers: newTeachers });
            setEditingId(null);
            setShowRoleDropdown(null);
            setSyncStatus({ message: 'Đã cập nhật GV tại tuần ' + currentWeek, type: 'success' });
            setTimeout(() => setSyncStatus({ message: '', type: '' }), 2000);
        };

        const copyFromPrevious = () => {
            if (currentWeek <= 1) return alert("Đây là tuần đầu tiên!");
            const prev = data.weeklyRecords[currentWeek - 1];
            if (!prev || !prev.teachers.length) return alert("Tuần trước chưa có dữ liệu!");
            
            if(confirm(`Sao chép toàn bộ danh sách GV, phân công và tiết bù/tăng của Tuần ${currentWeek-1} sang Tuần ${currentWeek}?`)) {
                updateWeekData(currentWeek, { 
                    teachers: JSON.parse(JSON.stringify(prev.teachers)), 
                    assignments: JSON.parse(JSON.stringify(prev.assignments)),
                    logs: JSON.parse(JSON.stringify(prev.logs || {}))
                });
                setSyncStatus({ message: `Đã sao chép dữ liệu từ Tuần ${currentWeek - 1}`, type: 'success' });
                setTimeout(() => setSyncStatus({ message: '', type: '' }), 3000);
            }
        };

        const handleExportTemplate = () => {
            const header = "Họ tên,Môn dạy,Lớp dạy,Chức vụ (Cách nhau dấu phẩy),Tiết TKB,Dạy bù,Tăng tiết\n";
            const example = "Nguyễn Văn A,Toán,\"6A1, 6A2\",\"Chủ nhiệm, Tổ trưởng\",8,1,0";
            const blob = new Blob(["\uFEFF" + header + example], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = "Mau_Phan_Cong.csv";
            link.click();
        };

        const handleImportExcel = (e: any) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt: any) => {
                // @ts-ignore
                const wb = XLSX.read(evt.target.result, {type:'binary'});
                // @ts-ignore
                const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
                const newTeachers = [...teachers];
                const newAssignments = { ...assignments };
                const newLogs = { ...logs };

                rows.forEach((row: any, i: number) => {
                    const name = row['Họ tên'] || row['GV'] || row['Tên'] || 'GV Mới';
                    const sub = row['Môn dạy'] || row['Môn'] || '';
                    const cls = row['Lớp dạy'] || row['Lớp'] || '';
                    const rolesRaw = row['Chức vụ'] || row['Kiêm nhiệm'] || '';
                    const tkbPeriods = parseFloat(row['Tiết TKB'] || row['Số tiết']) || 0;
                    const bu = parseFloat(row['Dạy bù'] || 0);
                    const tang = parseFloat(row['Tăng tiết'] || 0);

                    const teacherId = (Date.now() + i).toString();
                    const teacher = { 
                        id: teacherId, 
                        name, 
                        roles: rolesRaw.toString().split(',').map((s: string) => s.trim()).filter((s: string) => s) 
                    };
                    
                    newTeachers.push(teacher);
                    newAssignments[teacherId] = `${sub}: ${normalizeClassStr(cls)}`;
                    newLogs[teacherId] = { actual: tkbPeriods, extra: bu + tang, bu, tang };
                });

                updateWeekData(currentWeek, { teachers: newTeachers, assignments: newAssignments, logs: newLogs });
                setSyncStatus({ message: `Đã nhập dữ liệu thành công vào tuần ${currentWeek}`, type: 'success' });
            };
            reader.readAsBinaryString(file);
        };

        const updateLog = (teacherId: string, field: 'bu' | 'tang', value: number) => {
            const currentLog = logs[teacherId] || { actual: getTKBPeriods(assignments[teacherId] || ""), bu: 0, tang: 0, extra: 0 };
            const newLog = { ...currentLog, [field]: value };
            newLog.extra = (newLog.bu || 0) + (newLog.tang || 0);
            updateWeekData(currentWeek, { logs: { ...logs, [teacherId]: newLog } });
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
                        <button onClick={handleExportTemplate} className="bg-slate-100 text-slate-600 px-6 py-4 rounded-2xl flex items-center gap-2 font-bold hover:bg-slate-200 transition-all shadow-sm"><FileDown size={20}/> Tải file mẫu</button>
                        <input type="file" ref={fileRef} className="hidden" onChange={handleImportExcel} accept=".xlsx, .xls, .csv"/>
                        <button onClick={() => fileRef.current?.click()} className="bg-emerald-600 text-white px-6 py-4 rounded-2xl flex items-center gap-2 font-bold shadow-lg hover:bg-emerald-700 transition-all"><FileUp size={20}/> Nhập Excel</button>
                        {currentWeek > 1 && (
                            <button onClick={copyFromPrevious} className="bg-indigo-50 text-indigo-600 px-6 py-4 rounded-2xl flex items-center gap-2 font-bold border border-indigo-100 hover:bg-indigo-100 transition-all shadow-sm"><Copy size={20}/> Sao chép tuần {currentWeek-1}</button>
                        )}
                        <button onClick={() => setIsAdding(!isAdding)} className="bg-blue-600 text-white px-6 py-4 rounded-2xl flex items-center gap-2 font-bold shadow-xl hover:bg-blue-700 transition-all">{isAdding ? 'Đóng Form' : 'Thêm GV'}</button>
                    </div>
                </div>

                {isAdding && (
                    <div className="mb-10 bg-blue-50/50 border-2 border-blue-100 p-8 rounded-[3.5rem] animate-fadeIn shadow-sm">
                        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-start">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-blue-500 uppercase ml-2 tracking-widest">Họ tên GV</label>
                                <input type="text" placeholder="Nguyễn Văn A" className="w-full p-4 rounded-2xl border-none shadow-sm font-bold focus:ring-2 focus:ring-blue-500" id="new-name"/>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-blue-500 uppercase ml-2 tracking-widest">Môn dạy</label>
                                <select className="w-full p-4 rounded-2xl border-none shadow-sm font-bold appearance-none bg-white cursor-pointer" id="new-sub">
                                    <option value="">Chọn môn</option>
                                    {data.subjectConfigs.map((s: any) => <option key={s.name} value={s.name}>{s.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-blue-500 uppercase ml-2 tracking-widest">Lớp dạy</label>
                                <input type="text" placeholder="6A1, 7B2..." className="w-full p-4 rounded-2xl border-none shadow-sm font-bold focus:ring-2 focus:ring-blue-500" id="new-cls"/>
                            </div>
                            <div className="space-y-1 relative">
                                <label className="text-[10px] font-black text-blue-500 uppercase ml-2 tracking-widest">Công việc kiêm nhiệm</label>
                                <div 
                                    onClick={() => setShowRoleDropdown(showRoleDropdown === 'adding' ? null : 'adding')}
                                    className="w-full p-4 bg-white rounded-2xl shadow-sm border border-slate-100 font-bold text-slate-400 text-sm flex justify-between items-center cursor-pointer"
                                >
                                    <span className="truncate">{newTeacherRoles.length > 0 ? newTeacherRoles.join(', ') : 'Chọn chức vụ...'}</span>
                                    <ChevronDown size={18} className={`transition-transform ${showRoleDropdown === 'adding' ? 'rotate-180' : ''}`} />
                                </div>
                                {showRoleDropdown === 'adding' && (
                                    <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 p-2 max-h-60 overflow-y-auto">
                                        {data.roles.map((r: any) => (
                                            <div 
                                                key={r.id} 
                                                onClick={() => toggleNewRole(r.name)}
                                                className={`p-3 rounded-xl mb-1 cursor-pointer flex items-center justify-between transition-colors ${newTeacherRoles.includes(r.name) ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-50 text-slate-600'}`}
                                            >
                                                <span className="font-bold text-sm">{r.name}</span>
                                                {newTeacherRoles.includes(r.name) && <Check size={16} />}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="pt-5">
                                <button onClick={() => {
                                    const name = (document.getElementById('new-name') as HTMLInputElement).value;
                                    const sub = (document.getElementById('new-sub') as HTMLSelectElement).value;
                                    const clsStr = (document.getElementById('new-cls') as HTMLInputElement).value;
                                    if (!name || !sub || !clsStr) return alert("Vui lòng nhập đủ thông tin!");
                                    
                                    const fullVal = `${sub}: ${normalizeClassStr(clsStr)}`;
                                    const conflict = checkConflictBeforeInput(fullVal, "adding");
                                    if (conflict) return alert(`Lớp ${conflict} đã được phân công cho giáo viên khác!`);

                                    const tId = Date.now().toString();
                                    updateWeekData(currentWeek, {
                                        teachers: [{ id: tId, name, roles: newTeacherRoles }, ...teachers],
                                        assignments: { ...assignments, [tId]: fullVal }
                                    });
                                    setIsAdding(false);
                                    setNewTeacherRoles([]);
                                    setShowRoleDropdown(null);
                                }} className="w-full bg-blue-600 text-white p-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg hover:bg-blue-700 transition-all"><Plus size={20}/> THÊM MỚI</button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-[3.5rem] border-2 border-slate-50 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400">
                            <tr>
                                <th className="p-8">Giáo viên & Chức vụ</th>
                                <th className="p-8">Phân công TKB</th>
                                <th className="p-8 text-center">Tiết TKB</th>
                                <th className="p-8 text-center text-orange-600">Dạy bù</th>
                                <th className="p-8 text-center text-orange-600">Tăng tiết</th>
                                <th className="p-8 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {teachers.map((t: any) => {
                                const assignment = assignments[t.id] || "";
                                const tkbCount = getTKBPeriods(assignment);
                                const log = logs[t.id] || { bu: 0, tang: 0 };
                                const isEditing = editingId === t.id;

                                // Phân tích các lớp của giáo viên này để kiểm tra trùng (cho hiển thị)
                                const teacherClasses = assignment.split(';').flatMap((p: string) => {
                                    const cIdx = p.indexOf(':');
                                    if (cIdx === -1) return [];
                                    return p.substring(cIdx+1).split(',').map(c => c.trim().toUpperCase()).filter(c => c);
                                });
                                const teacherConflictingClasses = teacherClasses.filter(c => !!classConflicts[c]);
                                const hasConflict = teacherConflictingClasses.length > 0;

                                return (
                                    <tr key={t.id} className="border-b hover:bg-slate-50/50 transition-all">
                                        <td className="p-8">
                                            {isEditing ? (
                                                <div className="space-y-3">
                                                    <input className="font-bold border-2 border-blue-100 rounded-xl p-3 w-full outline-none focus:border-blue-500 shadow-sm" value={editState.name} onChange={e => setEditState({...editState, name: e.target.value})}/>
                                                    <div className="relative">
                                                        <div 
                                                            onClick={() => setShowRoleDropdown(showRoleDropdown === `editing-${t.id}` ? null : `editing-${t.id}`)}
                                                            className="w-full p-2 bg-white rounded-xl shadow-inner border border-slate-100 font-bold text-slate-600 text-[10px] flex justify-between items-center cursor-pointer"
                                                        >
                                                            <span className="truncate">{editState.roles.length > 0 ? editState.roles.join(', ') : 'Chọn chức vụ...'}</span>
                                                            <ChevronDown size={14} className={`transition-transform ${showRoleDropdown === `editing-${t.id}` ? 'rotate-180' : ''}`} />
                                                        </div>
                                                        {showRoleDropdown === `editing-${t.id}` && (
                                                            <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 p-2 max-h-48 overflow-y-auto">
                                                                {data.roles.map((r: any) => (
                                                                    <div 
                                                                        key={r.id} 
                                                                        onClick={() => toggleEditRole(r.name)}
                                                                        className={`p-2 rounded-lg mb-1 cursor-pointer flex items-center justify-between transition-colors ${editState.roles.includes(r.name) ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-50 text-slate-600'}`}
                                                                    >
                                                                        <span className="font-bold text-[10px]">{r.name}</span>
                                                                        {editState.roles.includes(r.name) && <Check size={12} />}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-1">
                                                    <div className="font-black text-slate-800 text-xl">{t.name}</div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {(t.roles || []).map((r: string) => (
                                                            <span key={r} className="text-[9px] font-black uppercase bg-blue-50 text-blue-500 px-2 py-0.5 rounded-lg border border-blue-100">
                                                                {r}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-8 relative">
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="text" 
                                                    className={`w-full p-3 rounded-xl border-none font-bold text-sm shadow-inner focus:ring-2 ${hasConflict ? 'bg-red-50 text-red-700 ring-red-100 focus:ring-red-200' : 'bg-slate-50 text-slate-600 focus:ring-blue-100'}`} 
                                                    value={assignment} 
                                                    onChange={e => {
                                                        const newVal = e.target.value;
                                                        const conflictClass = checkConflictBeforeInput(newVal, t.id);
                                                        if (conflictClass) {
                                                            alert(`Lớp ${conflictClass} đã được phân công cho giáo viên khác! Không thể nhập trùng.`);
                                                            return; // Chặn nhập liệu
                                                        }
                                                        updateWeekData(currentWeek, { assignments: { ...assignments, [t.id]: newVal } });
                                                    }}
                                                />
                                                {hasConflict && (
                                                    <div className="group relative">
                                                        <AlertTriangle className="text-red-500 shrink-0 animate-pulse cursor-help" size={20} />
                                                        <div className="absolute bottom-full right-0 mb-2 w-64 bg-slate-900 text-white p-3 rounded-2xl text-[10px] font-bold shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity z-[60] pointer-events-none border border-white/10">
                                                            <div className="text-red-400 uppercase mb-1">Cảnh báo trùng lớp:</div>
                                                            {teacherConflictingClasses.map(cls => (
                                                                <div key={cls} className="mb-1 last:mb-0">
                                                                    Lớp <span className="text-blue-400">{cls}</span> đang được dạy bởi: {classConflicts[cls].join(', ')}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            {hasConflict && (
                                                <div className="text-[9px] font-black text-red-500 mt-1 uppercase tracking-tighter">
                                                    Trùng lớp: {teacherConflictingClasses.join(', ')}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-8 text-center font-black text-slate-800 text-2xl">{tkbCount}</td>
                                        <td className="p-8">
                                            <input type="number" step="0.5" className="w-20 mx-auto block text-center p-3 bg-orange-50 border-2 border-orange-100 rounded-2xl font-black text-orange-700 outline-none hover:border-orange-300 transition-all" value={log.bu || 0} onChange={e => updateLog(t.id, 'bu', parseFloat(e.target.value) || 0)}/>
                                        </td>
                                        <td className="p-8">
                                            <input type="number" step="0.5" className="w-20 mx-auto block text-center p-3 bg-orange-50 border-2 border-orange-100 rounded-2xl font-black text-orange-700 outline-none hover:border-orange-300 transition-all" value={log.tang || 0} onChange={e => updateLog(t.id, 'tang', parseFloat(e.target.value) || 0)}/>
                                        </td>
                                        <td className="p-8 text-right">
                                            <div className="flex justify-end gap-2">
                                                {isEditing ? (
                                                    <button onClick={saveEdit} className="text-emerald-500 p-3 hover:bg-emerald-50 rounded-2xl transition-all shadow-sm border border-emerald-100"><Check size={20}/></button>
                                                ) : (
                                                    <>
                                                        <button onClick={() => startEditing(t)} className="text-slate-300 hover:text-blue-500 p-3 hover:bg-blue-50 rounded-2xl transition-all"><Edit3 size={20}/></button>
                                                        <button onClick={() => {
                                                            if(confirm("Xóa GV khỏi tuần " + currentWeek + "?")) {
                                                                updateWeekData(currentWeek, { 
                                                                    teachers: teachers.filter((x: any) => x.id !== t.id),
                                                                    assignments: { ...assignments, [t.id]: undefined },
                                                                    logs: { ...logs, [t.id]: undefined }
                                                                });
                                                            }
                                                        }} className="text-slate-300 hover:text-red-500 p-3 hover:bg-red-50 rounded-2xl transition-all"><Trash2 size={20}/></button>
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

    // --- TAB THỰC DẠY (LŨY KẾ TUYỆT ĐỐI THEO DẢI TUẦN) ---
    const WeeklyTab = () => {
        const stats = useMemo(() => {
            const teacherAggregates: Record<string, { name: string, tkb: number, bu: number, tang: number }> = {};
            
            for (let w = startRange; w <= endRange; w++) {
                const record = data.weeklyRecords[w];
                if (!record) continue;

                record.teachers.forEach((t: any) => {
                    const key = t.name.trim();
                    if (!teacherAggregates[key]) {
                        teacherAggregates[key] = { name: t.name, tkb: 0, bu: 0, tang: 0 };
                    }
                    
                    const log = record.logs?.[t.id] || { bu: 0, tang: 0 };
                    const currentTkb = (log.actual !== undefined && log.actual !== null) ? log.actual : getTKBPeriods(record.assignments[t.id] || "");
                    
                    teacherAggregates[key].tkb += currentTkb;
                    teacherAggregates[key].bu += (log.bu || 0);
                    teacherAggregates[key].tang += (log.tang || 0);
                });
            }

            return Object.values(teacherAggregates).sort((a, b) => a.name.localeCompare(b.name));
        }, [data, startRange, endRange]);

        return (
            <div className="p-8 animate-fadeIn">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-12 gap-8">
                    <div className="flex items-center gap-6 bg-white border-2 border-slate-100 p-6 rounded-[3rem] shadow-sm">
                        <div className="flex items-center gap-4">
                            <label className="text-[10px] font-black uppercase text-blue-500 tracking-widest">Từ tuần</label>
                            <input type="number" min="1" value={startRange} onChange={e => setStartRange(Math.max(1, parseInt(e.target.value) || 1))} className="w-20 p-4 bg-slate-50 rounded-2xl font-black text-center text-2xl outline-none focus:ring-4 focus:ring-blue-500/10 border-none"/>
                        </div>
                        <ChevronRight className="text-slate-200" size={32} />
                        <div className="flex items-center gap-4">
                            <label className="text-[10px] font-black uppercase text-blue-500 tracking-widest">Đến tuần</label>
                            <input type="number" min={startRange} value={endRange} onChange={e => setEndRange(Math.max(startRange, parseInt(e.target.value) || 1))} className="w-20 p-4 bg-slate-50 rounded-2xl font-black text-center text-2xl outline-none focus:ring-4 focus:ring-blue-500/10 border-none"/>
                        </div>
                        <div className="ml-6 px-8 py-3 bg-blue-600 text-white rounded-[1.5rem] font-black text-sm uppercase shadow-xl shadow-blue-500/20">
                            Tổng {endRange - startRange + 1} tuần
                        </div>
                    </div>
                    <div className="text-right">
                        <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic">Tổng hợp Thực dạy</h2>
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Dữ liệu lũy kế 1 dòng / 1 người</p>
                    </div>
                </div>

                <div className="bg-white rounded-[4rem] border-2 border-slate-50 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400">
                            <tr>
                                <th className="p-10 w-1/4">Giáo viên</th>
                                <th className="p-10 text-center">Tổng Tiết TKB</th>
                                <th className="p-10 text-center text-orange-600">Tổng Dạy Bù</th>
                                <th className="p-10 text-center text-orange-600">Tổng Tăng tiết</th>
                                <th className="p-10 text-center bg-blue-50/50 text-blue-700">Tổng Thực dạy (Lũy kế)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.map((s: any, i: number) => {
                                const totalAll = s.tkb + s.bu + s.tang;
                                return (
                                    <tr key={i} className="border-b hover:bg-slate-50/50 transition-all">
                                        <td className="p-10">
                                            <div className="font-black text-slate-700 text-2xl">{s.name}</div>
                                            <div className="text-[10px] font-bold text-slate-300 uppercase mt-1 tracking-widest">Gộp dữ liệu dải tuần</div>
                                        </td>
                                        <td className="p-10 text-center font-black text-slate-400 text-3xl">
                                            {s.tkb % 1 === 0 ? s.tkb : s.tkb.toFixed(1)}
                                        </td>
                                        <td className="p-10 text-center font-black text-orange-600 text-3xl">
                                            {s.bu % 1 === 0 ? s.bu : s.bu.toFixed(1)}
                                        </td>
                                        <td className="p-10 text-center font-black text-orange-600 text-3xl">
                                            {s.tang % 1 === 0 ? s.tang : s.tang.toFixed(1)}
                                        </td>
                                        <td className="p-10 text-center bg-blue-50/20">
                                            <div className="text-6xl font-black text-blue-700 tracking-tighter">
                                                {totalAll % 1 === 0 ? totalAll : totalAll.toFixed(1)}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {stats.length === 0 && (
                        <div className="p-32 text-center">
                            <RefreshCcw size={64} className="mx-auto text-slate-100 mb-6 animate-spin-slow" />
                            <p className="font-black text-slate-300 uppercase tracking-widest text-sm italic">Không có dữ liệu trong dải tuần đã chọn</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // --- TAB BÁO CÁO (TÍNH THEO TÊN) ---
    const ReportTab = () => {
        const [reportWeeks, setReportWeeks] = useState(4);
        
        const stats = useMemo(() => {
            const teacherStatsMap: Record<string, any> = {};
            
            for (let i = 1; i <= reportWeeks; i++) {
                const w = data.weeklyRecords[i];
                if (!w) continue;
                
                w.teachers.forEach((t: any) => {
                    const key = t.name.trim();
                    if (!teacherStatsMap[key]) {
                        teacherStatsMap[key] = { 
                            name: t.name, 
                            totalQuota: 0, 
                            totalActual: 0, 
                            totalExtra: 0, 
                            lastQ: 0 
                        };
                    }
                    
                    const q = Math.max(0, data.standardQuota - getTeacherReduction(t.roles));
                    teacherStatsMap[key].totalQuota += q;
                    teacherStatsMap[key].lastQ = q; 

                    const log = (w.logs || {})[t.id];
                    if (log) {
                        teacherStatsMap[key].totalActual += (log.actual ?? getTKBPeriods(w.assignments[t.id] || ""));
                        teacherStatsMap[key].totalExtra += (log.bu || 0) + (log.tang || 0);
                    } else {
                        teacherStatsMap[key].totalActual += getTKBPeriods(w.assignments[t.id] || "");
                    }
                });
            }

            return Object.values(teacherStatsMap).map((s: any) => {
                const total = s.totalActual + s.totalExtra;
                return { ...s, total, balance: total - s.totalQuota };
            }).sort((a, b) => a.name.localeCompare(b.name));
        }, [data, reportWeeks]);

        return (
            <div className="p-8 animate-fadeIn">
                <div className="flex justify-between items-end mb-12">
                    <div>
                        <h2 className="text-4xl font-black text-slate-800 tracking-tighter uppercase italic">Quyết toán Tiết dạy</h2>
                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest flex items-center gap-2 mt-1">
                            <Info size={14} className="text-blue-500"/> Lũy kế từ Tuần 1 đến Tuần {reportWeeks} (Gộp theo tên giáo viên)
                        </p>
                    </div>
                    <div className="bg-slate-100 p-4 rounded-[2.5rem] flex items-center gap-4 shadow-inner border border-slate-200">
                        <span className="text-[10px] font-black text-slate-400 ml-4 uppercase tracking-widest">Xem đến tuần:</span>
                        <input type="number" value={reportWeeks} onChange={e => setReportWeeks(parseInt(e.target.value) || 1)} className="w-20 p-3 bg-white rounded-2xl text-center font-black text-blue-600 outline-none shadow-sm border-none focus:ring-4 focus:ring-blue-100"/>
                    </div>
                </div>
                <div className="bg-white rounded-[3.5rem] border-2 border-slate-50 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400">
                            <tr>
                                <th className="p-8">Giáo viên</th>
                                <th className="p-8 text-center">Tổng Định mức</th>
                                <th className="p-8 text-center">Tổng Thực dạy</th>
                                <th className="p-8 text-center text-orange-600">Tổng Bù/Tăng</th>
                                <th className="p-8 text-center bg-blue-50/30 text-blue-700">Tổng Lũy kế</th>
                                <th className="p-8 text-center bg-slate-100">Chênh lệch</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.map((s: any, i: number) => (
                                <tr key={i} className="border-b hover:bg-slate-50/50 transition-all">
                                    <td className="p-8">
                                        <div className="font-black text-slate-700 text-xl">{s.name}</div>
                                        <div className="text-[9px] font-bold text-slate-300 uppercase mt-1">Định mức gần nhất: {s.lastQ}t/tuần</div>
                                    </td>
                                    <td className="p-8 text-center font-black text-slate-400 text-xl">{s.totalQuota.toFixed(1)}</td>
                                    <td className="p-8 text-center font-black text-slate-800 text-2xl">{s.totalActual.toFixed(1)}</td>
                                    <td className="p-8 text-center font-black text-orange-600 text-2xl">+{s.totalExtra.toFixed(1)}</td>
                                    <td className="p-8 text-center font-black text-4xl text-blue-700 bg-blue-50/10 tracking-tighter">{s.total.toFixed(1)}</td>
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

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
            <header className="bg-white border-b-2 border-slate-100 p-6 sticky top-0 z-50 shadow-sm">
                <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-5">
                        <div className="bg-blue-600 p-4 rounded-[1.5rem] text-white shadow-2xl rotate-3"><LayoutDashboard size={32}/></div>
                        <h1 className="font-black text-3xl tracking-tighter text-slate-800 uppercase italic">THCS PRO <span className="text-blue-600 text-sm align-top italic font-black">v6.7</span></h1>
                    </div>
                    <nav className="flex gap-2 bg-slate-100 p-2 rounded-[2.5rem] overflow-x-auto no-scrollbar">
                        {[
                            {id: 'config', icon: Settings, label: 'Cài đặt'},
                            {id: 'teachers', icon: Users, label: 'Phân công'},
                            {id: 'weekly', icon: CalendarDays, label: 'Thực dạy'},
                            {id: 'reports', icon: FileText, label: 'Báo cáo'},
                        ].map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-3 px-8 py-4.5 rounded-[2.2rem] text-[11px] font-black transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-xl scale-105 border border-slate-50' : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'}`}>
                                <tab.icon size={20}/> {tab.label.toUpperCase()}
                            </button>
                        ))}
                    </nav>
                </div>
            </header>
            <main className="container mx-auto p-4 md:p-10 flex-1">
                <div className="bg-white rounded-[5rem] shadow-2xl border-4 border-white min-h-[800px] overflow-hidden">
                    {activeTab === 'config' && (
                        <div className="p-10 animate-fadeIn">
                            <h2 className="text-3xl font-black mb-10 text-slate-800 uppercase italic">Cấu hình Hệ thống</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100 shadow-inner">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Định mức THCS chuẩn (Tiết/Tuần)</label>
                                    <input type="number" value={data.standardQuota} onChange={e => updateData({standardQuota: parseFloat(e.target.value) || 0})} className="text-8xl font-black text-blue-600 bg-transparent outline-none w-full tracking-tighter"/>
                                </div>
                                <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100 max-h-[600px] overflow-y-auto shadow-inner no-scrollbar">
                                    <h3 className="font-black text-slate-700 uppercase text-xs mb-8 tracking-widest flex items-center gap-3"><Book size={18} className="text-blue-500"/> Định mức môn học</h3>
                                    {data.subjectConfigs.map((s: any, i: number) => (
                                        <div key={i} className="flex justify-between items-center py-4 border-b border-slate-100 last:border-0 hover:bg-white/50 px-4 rounded-xl transition-all">
                                            <span className="font-black text-slate-600 uppercase text-[11px]">{s.name}</span>
                                            <input type="number" step="0.5" className="w-24 p-3 bg-white rounded-2xl text-center font-black text-blue-600 border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10" value={s.periods} onChange={e => {
                                                const nc = [...data.subjectConfigs]; nc[i].periods = parseFloat(e.target.value) || 0; updateData({subjectConfigs: nc});
                                            }}/>
                                        </div>
                                    ))}
                                    <h3 className="font-black text-slate-700 uppercase text-xs mt-12 mb-8 tracking-widest flex items-center gap-3"><Users size={18} className="text-emerald-500"/> Chức vụ kiêm nhiệm</h3>
                                    {data.roles.map((r: any, i: number) => (
                                        <div key={r.id} className="flex justify-between items-center py-4 border-b border-slate-100 last:border-0 hover:bg-white/50 px-4 rounded-xl transition-all">
                                            <span className="font-black text-slate-600 uppercase text-[11px]">{r.name}</span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] font-bold text-slate-300">GIẢM</span>
                                                <input type="number" className="w-24 p-3 bg-white rounded-2xl text-center font-black text-emerald-600 border border-slate-200 outline-none focus:ring-4 focus:ring-emerald-500/10" value={r.reduction} onChange={e => {
                                                    const nr = [...data.roles]; nr[i].reduction = parseInt(e.target.value) || 0; updateData({roles: nr});
                                                }}/>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'teachers' && <TeacherTab />}
                    {activeTab === 'weekly' && <WeeklyTab />}
                    {activeTab === 'reports' && <ReportTab />}
                </div>
            </main>
            {syncStatus.message && (
                <div className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-12 py-6 rounded-[3rem] shadow-2xl flex items-center gap-4 animate-fadeIn font-black text-sm z-[100] border-2 border-white/10 shadow-blue-500/30">
                    <div className="p-2 bg-blue-500 rounded-full"><CheckCircle2 size={18} className="text-white" /></div>
                    {syncStatus.message}
                </div>
            )}
        </div>
    );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
