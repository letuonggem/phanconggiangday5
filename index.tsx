
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
const STORAGE_KEY = 'thcs_teaching_mgmt_v6_8_pro';

const DEFAULT_SUBJECT_CONFIGS = [
    { name: 'Toán', p6: 4, p7: 4, p8: 4, p9: 4 },
    { name: 'Ngữ văn', p6: 4, p7: 4, p8: 4, p9: 4 },
    { name: 'Tiếng Anh', p6: 3, p7: 3, p8: 3, p9: 3 },
    { name: 'Vật lý', p6: 1, p7: 1, p8: 1, p9: 1 },
    { name: 'Hóa học', p6: 0, p7: 0, p8: 2, p9: 2 },
    { name: 'Sinh học', p6: 2, p7: 2, p8: 2, p9: 2 },
    { name: 'Lịch sử', p6: 1.5, p7: 1.5, p8: 1.5, p9: 1.5 },
    { name: 'Địa lý', p6: 1.5, p7: 1.5, p8: 1.5, p9: 1.5 },
    { name: 'GDCD', p6: 1, p7: 1, p8: 1, p9: 1 },
    { name: 'Tin học', p6: 1, p7: 1, p8: 1, p9: 1 },
    { name: 'Công nghệ', p6: 1, p7: 1, p8: 1, p9: 1 },
    { name: 'Thể dục', p6: 2, p7: 2, p8: 2, p9: 2 },
    { name: 'Nhạc - Họa', p6: 1, p7: 1, p8: 1, p9: 1 },
    { name: 'HĐTN - HN', p6: 3, p7: 3, p8: 3, p9: 3 }
];

const DEFAULT_ROLES = [
    { id: 'r1', name: 'Chủ nhiệm', reduction: 4 },
    { id: 'r2', name: 'Tổ trưởng', reduction: 3 },
    { id: 'r3', name: 'Tổ phó', reduction: 1 },
    { id: 'r4', name: 'Thư ký', reduction: 2 },
    { id: 'r5', name: 'TPT Đội', reduction: 10 }
];

// Hàm kiểm tra định dạng lớp (Ví dụ: 6A1, 7B2, 9.1...)
const isValidClassName = (cls: string) => {
    // Lớp phải bắt đầu bằng 6-9, sau đó là chữ hoặc số
    return /^[6-9][A-Z0-9.\-_]+$/.test(cls);
};

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
    const [startRange, setStartRange] = useState(1);
    const [endRange, setEndRange] = useState(1);

    const [data, setData] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) return JSON.parse(saved);
        return { 
            standardQuota: 19, 
            roles: DEFAULT_ROLES,
            subjectConfigs: DEFAULT_SUBJECT_CONFIGS,
            weeklyRecords: {} 
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

    // Hàm lấy số tiết TKB dựa trên Khối lớp và Môn học
    const getTKBPeriods = useMemo(() => {
        const configMap = new Map<string, any>();
        data.subjectConfigs.forEach((s: any) => {
            configMap.set(String(s.name).toLowerCase(), s);
        });

        return (assignmentStr: string) => {
            if (!assignmentStr) return 0;
            let total = 0;
            // Parse "Toán: 6A1, 6A2; Văn: 7B1"
            assignmentStr.split(';').forEach(part => {
                const [subName, clsPart] = part.split(':');
                if (subName && clsPart) {
                    const subConfig = configMap.get(subName.trim().toLowerCase());
                    if (subConfig) {
                        const classes = clsPart.split(',').map(c => c.trim()).filter(c => c);
                        classes.forEach(cls => {
                            // Nhận diện khối: lấy số đầu tiên
                            const gradeMatch = cls.match(/^[6-9]/);
                            if (gradeMatch) {
                                const grade = gradeMatch[0];
                                const periods = Number(subConfig[`p${grade}`] || 0);
                                total += periods;
                            }
                        });
                    }
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
        const [showRoleDropdown, setShowRoleDropdown] = useState<string | null>(null);
        const fileRef = useRef<HTMLInputElement>(null);
        
        const weekData = getWeekData(currentWeek);
        const { teachers, assignments, logs = {} } = weekData;

        // Chặn trùng lớp
        const classConflicts = useMemo(() => {
            const classToTeachers: Record<string, string[]> = {};
            Object.entries(assignments).forEach(([tId, assignStr]) => {
                if (!assignStr) return;
                const teacher = teachers.find(tx => tx.id === tId);
                if (!teacher) return;
                (assignStr as string).split(';').forEach(part => {
                    const cIdx = part.indexOf(':');
                    if (cIdx === -1) return;
                    part.substring(cIdx + 1).split(',').map(c => c.trim().toUpperCase()).filter(c => c).forEach(cls => {
                        if (!classToTeachers[cls]) classToTeachers[cls] = [];
                        if (!classToTeachers[cls].includes(teacher.name)) classToTeachers[cls].push(teacher.name);
                    });
                });
            });
            const conflicts: Record<string, string[]> = {};
            Object.entries(classToTeachers).forEach(([cls, names]) => { if (names.length > 1) conflicts[cls] = names; });
            return conflicts;
        }, [assignments, teachers]);

        // Kiểm định và Chặn nhập liệu
        const handleAssignmentChange = (tId: string, rawVal: string) => {
            // Tự động chuẩn hóa
            let val = rawVal.toUpperCase().replace(/\s{2,}/g, ' '); 
            
            // Tách các phần để kiểm tra định dạng
            const parts = val.split(';');
            for (let part of parts) {
                const colonIdx = part.indexOf(':');
                if (colonIdx !== -1) {
                    const classes = part.substring(colonIdx + 1).split(',').map(c => c.trim()).filter(c => c);
                    for (let cls of classes) {
                        if (!isValidClassName(cls)) {
                            alert(`Định dạng lớp "${cls}" không hợp lệ! Lớp phải bắt đầu bằng khối (6-9). Ví dụ: 6A1, 7B2...`);
                            return; // Chặn nhập
                        }
                    }
                }
            }

            // Kiểm tra trùng lớp
            const assignedByOthers = new Set<string>();
            Object.entries(assignments).forEach(([id, str]) => {
                if (id === tId || !str) return;
                (str as string).split(';').forEach(p => {
                    const cIdx = p.indexOf(':');
                    if (cIdx !== -1) p.substring(cIdx + 1).split(',').forEach(c => {
                        const n = c.trim().toUpperCase(); if (n) assignedByOthers.add(n);
                    });
                });
            });

            const currentClasses = val.split(';').flatMap(p => {
                const cIdx = p.indexOf(':');
                if (cIdx === -1) return [];
                return p.substring(cIdx + 1).split(',').map(c => c.trim().toUpperCase()).filter(c => c);
            });

            for (const cls of currentClasses) {
                if (assignedByOthers.has(cls)) {
                    alert(`Lớp ${cls} đã được phân công cho giáo viên khác!`);
                    return; // Chặn nhập
                }
            }

            updateWeekData(currentWeek, { assignments: { ...assignments, [tId]: val } });
        };

        const startEditing = (teacher: any) => {
            setEditingId(teacher.id);
            setEditState({ name: teacher.name, roles: teacher.roles || [] });
            setShowRoleDropdown(null);
        };

        const saveEdit = () => {
            if (!editState.name.trim()) return alert("Họ tên không được để trống!");
            updateWeekData(currentWeek, { 
                teachers: teachers.map((t: any) => t.id === editingId ? { ...t, name: editState.name, roles: editState.roles } : t)
            });
            setEditingId(null);
            setShowRoleDropdown(null);
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
                        <button onClick={() => setIsAdding(!isAdding)} className="bg-blue-600 text-white px-8 py-5 rounded-2xl flex items-center gap-2 font-black shadow-xl hover:bg-blue-700 transition-all uppercase tracking-widest text-xs">
                            {isAdding ? 'Đóng Form' : 'Thêm Giáo viên mới'}
                        </button>
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
                                <label className="text-[10px] font-black text-blue-500 uppercase ml-2 tracking-widest">Lớp dạy (Cách dấu phẩy)</label>
                                <input type="text" placeholder="6A1, 7B2..." className="w-full p-4 rounded-2xl border-none shadow-sm font-bold focus:ring-2 focus:ring-blue-500" id="new-cls"/>
                            </div>
                            <div className="space-y-1 relative">
                                <label className="text-[10px] font-black text-blue-500 uppercase ml-2 tracking-widest">Kiêm nhiệm</label>
                                <div onClick={() => setShowRoleDropdown(showRoleDropdown === 'adding' ? null : 'adding')} className="w-full p-4 bg-white rounded-2xl shadow-sm border border-slate-100 font-bold text-slate-400 text-sm flex justify-between items-center cursor-pointer">
                                    <span className="truncate">{newTeacherRoles.length > 0 ? newTeacherRoles.join(', ') : 'Chọn chức vụ...'}</span>
                                    <ChevronDown size={18} />
                                </div>
                                {showRoleDropdown === 'adding' && (
                                    <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 p-2 max-h-60 overflow-y-auto">
                                        {data.roles.map((r: any) => (
                                            <div key={r.id} onClick={() => setNewTeacherRoles(prev => prev.includes(r.name) ? prev.filter(x => x !== r.name) : [...prev, r.name])} className={`p-3 rounded-xl mb-1 cursor-pointer flex items-center justify-between ${newTeacherRoles.includes(r.name) ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-50 text-slate-600'}`}>
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
                                    handleAssignmentChange(Date.now().toString() + "_temp", `${sub}: ${clsStr}`); // Test validation
                                    const tId = Date.now().toString();
                                    updateWeekData(currentWeek, {
                                        teachers: [{ id: tId, name, roles: newTeacherRoles }, ...teachers],
                                        assignments: { ...assignments, [tId]: `${sub}: ${normalizeClassStr(clsStr)}` }
                                    });
                                    setIsAdding(false);
                                    setNewTeacherRoles([]);
                                }} className="w-full bg-blue-600 text-white p-4 rounded-2xl font-black shadow-lg hover:bg-blue-700 transition-all">XÁC NHẬN THÊM</button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-[3.5rem] border-2 border-slate-50 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400">
                            <tr>
                                <th className="p-8">Giáo viên & Chức vụ</th>
                                <th className="p-8">Phân công TKB (Môn: Lớp)</th>
                                <th className="p-8 text-center">Tiết TKB</th>
                                <th className="p-8 text-center text-orange-600">Dạy bù</th>
                                <th className="p-8 text-center text-orange-600">Tăng tiết và Bồi dưỡng</th>
                                <th className="p-8 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {teachers.map((t: any) => {
                                const assignment = assignments[t.id] || "";
                                const tkbCount = getTKBPeriods(assignment);
                                const log = logs[t.id] || { bu: 0, tang: 0 };
                                const isEditing = editingId === t.id;
                                const teacherClasses = assignment.split(';').flatMap((p: string) => {
                                    const cIdx = p.indexOf(':'); return cIdx === -1 ? [] : p.substring(cIdx+1).split(',').map(c => c.trim().toUpperCase()).filter(c => c);
                                });
                                const hasConflict = teacherClasses.some(c => !!classConflicts[c]);

                                return (
                                    <tr key={t.id} className="border-b hover:bg-slate-50/50 transition-all">
                                        <td className="p-8">
                                            {isEditing ? (
                                                <input className="font-bold border-2 border-blue-100 rounded-xl p-3 w-full outline-none focus:border-blue-500 shadow-sm" value={editState.name} onChange={e => setEditState({...editState, name: e.target.value})}/>
                                            ) : (
                                                <div className="space-y-1">
                                                    <div className="font-black text-slate-800 text-xl">{t.name}</div>
                                                    <div className="flex flex-wrap gap-1">{(t.roles || []).map((r: string) => <span key={r} className="text-[9px] font-black uppercase bg-blue-50 text-blue-500 px-2 py-0.5 rounded-lg border border-blue-100">{r}</span>)}</div>
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-8 relative">
                                            <input type="text" className={`w-full p-4 rounded-xl border-none font-bold text-sm shadow-inner focus:ring-2 ${hasConflict ? 'bg-red-50 text-red-700 ring-red-100' : 'bg-slate-50 text-slate-600 focus:ring-blue-100'}`} 
                                                value={assignment} onChange={e => handleAssignmentChange(t.id, e.target.value)}
                                            />
                                            {hasConflict && <div className="text-[9px] font-black text-red-500 mt-1 uppercase">Cảnh báo trùng lớp!</div>}
                                        </td>
                                        <td className="p-8 text-center font-black text-slate-800 text-2xl">{tkbCount % 1 === 0 ? tkbCount : tkbCount.toFixed(1)}</td>
                                        <td className="p-8"><input type="number" step="0.5" className="w-20 mx-auto block text-center p-3 bg-orange-50 border-2 border-orange-100 rounded-2xl font-black text-orange-700" value={log.bu || 0} onChange={e => updateWeekData(currentWeek, { logs: { ...logs, [t.id]: { ...log, bu: parseFloat(e.target.value) || 0 } } })}/></td>
                                        <td className="p-8"><input type="number" step="0.5" className="w-20 mx-auto block text-center p-3 bg-orange-50 border-2 border-orange-100 rounded-2xl font-black text-orange-700" value={log.tang || 0} onChange={e => updateWeekData(currentWeek, { logs: { ...logs, [t.id]: { ...log, tang: parseFloat(e.target.value) || 0 } } })}/></td>
                                        <td className="p-8 text-right">
                                            <div className="flex justify-end gap-2">
                                                {isEditing ? (
                                                    <button onClick={saveEdit} className="text-emerald-500 p-3 hover:bg-emerald-50 rounded-2xl border border-emerald-100"><Check/></button>
                                                ) : (
                                                    <>
                                                        <button onClick={() => startEditing(t)} className="text-slate-300 hover:text-blue-500 p-3 hover:bg-blue-50 rounded-2xl"><Edit3 size={20}/></button>
                                                        <button onClick={() => { if(confirm("Xóa GV khỏi tuần " + currentWeek + "?")) updateWeekData(currentWeek, { teachers: teachers.filter((x: any) => x.id !== t.id) }); }} className="text-slate-300 hover:text-red-500 p-3 hover:bg-red-50 rounded-2xl"><Trash2 size={20}/></button>
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

    // --- TAB THỰC DẠY ---
    const WeeklyTab = () => {
        const stats = useMemo(() => {
            const aggregates: Record<string, any> = {};
            for (let w = startRange; w <= endRange; w++) {
                const record = data.weeklyRecords[w]; if (!record) continue;
                record.teachers.forEach((t: any) => {
                    const key = t.name.trim();
                    if (!aggregates[key]) aggregates[key] = { name: t.name, tkb: 0, bu: 0, tang: 0 };
                    const log = record.logs?.[t.id] || { bu: 0, tang: 0 };
                    aggregates[key].tkb += (log.actual !== undefined ? log.actual : getTKBPeriods(record.assignments[t.id] || ""));
                    aggregates[key].bu += (log.bu || 0);
                    aggregates[key].tang += (log.tang || 0);
                });
            }
            return Object.values(aggregates).sort((a: any, b: any) => a.name.localeCompare(b.name));
        }, [data, startRange, endRange]);

        return (
            <div className="p-8 animate-fadeIn">
                <div className="flex flex-col lg:flex-row justify-between items-center mb-12 gap-8">
                    <div className="flex items-center gap-4 bg-white p-6 rounded-[3rem] border-2 border-slate-100 shadow-sm">
                        <div className="flex items-center gap-3">
                            <label className="text-[10px] font-black uppercase text-blue-500">Từ tuần</label>
                            <input type="number" min="1" value={startRange} onChange={e => setStartRange(parseInt(e.target.value) || 1)} className="w-20 p-4 bg-slate-50 rounded-2xl font-black text-center text-2xl border-none outline-none"/>
                        </div>
                        <ChevronRight className="text-slate-200" size={32} />
                        <div className="flex items-center gap-3">
                            <label className="text-[10px] font-black uppercase text-blue-500">Đến tuần</label>
                            <input type="number" min={startRange} value={endRange} onChange={e => setEndRange(parseInt(e.target.value) || 1)} className="w-20 p-4 bg-slate-50 rounded-2xl font-black text-center text-2xl border-none outline-none"/>
                        </div>
                    </div>
                    <div className="text-right">
                        <h2 className="text-3xl font-black text-slate-800 uppercase italic tracking-tighter">Tổng hợp Thực dạy</h2>
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Lũy kế tuyệt đối theo dải tuần</p>
                    </div>
                </div>
                <div className="bg-white rounded-[4rem] border-2 border-slate-50 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400">
                            <tr>
                                <th className="p-10">Giáo viên</th>
                                <th className="p-10 text-center">Tiết TKB</th>
                                <th className="p-10 text-center text-orange-600">Dạy bù</th>
                                <th className="p-10 text-center text-orange-600">Tăng tiết/Bồi dưỡng</th>
                                <th className="p-10 text-center bg-blue-50/50 text-blue-700">Tổng Thực dạy</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.map((s: any, i: number) => {
                                const total = s.tkb + s.bu + s.tang;
                                return (
                                    <tr key={i} className="border-b hover:bg-slate-50/50">
                                        <td className="p-10"><div className="font-black text-slate-700 text-2xl">{s.name}</div></td>
                                        <td className="p-10 text-center font-black text-slate-400 text-3xl">{s.tkb.toFixed(1)}</td>
                                        <td className="p-10 text-center font-black text-orange-600 text-3xl">{s.bu.toFixed(1)}</td>
                                        <td className="p-10 text-center font-black text-orange-600 text-3xl">{s.tang.toFixed(1)}</td>
                                        <td className="p-10 text-center bg-blue-50/20"><div className="text-6xl font-black text-blue-700 tracking-tighter">{total.toFixed(1)}</div></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    // --- TAB CÀI ĐẶT (ĐỊNH MỨC CHI TIẾT THEO KHỐI) ---
    const ConfigTab = () => {
        return (
            <div className="p-10 animate-fadeIn">
                <h2 className="text-3xl font-black mb-10 text-slate-800 uppercase italic">Cấu hình Hệ thống PRO</h2>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
                    <div className="bg-slate-50 p-10 rounded-[4rem] border border-slate-100 shadow-inner">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Định mức THCS chuẩn (Tiết/Tuần)</label>
                        <input type="number" value={data.standardQuota} onChange={e => updateData({standardQuota: parseFloat(e.target.value) || 0})} className="text-9xl font-black text-blue-600 bg-transparent outline-none w-full tracking-tighter"/>
                    </div>
                    <div className="bg-slate-50 p-10 rounded-[4rem] border border-slate-100 shadow-inner max-h-[700px] overflow-y-auto no-scrollbar">
                        <h3 className="font-black text-slate-700 uppercase text-xs mb-8 tracking-widest flex items-center gap-3"><Book size={18} className="text-blue-500"/> Định mức Môn học theo Khối</h3>
                        <div className="space-y-6">
                            {data.subjectConfigs.map((s: any, i: number) => (
                                <div key={i} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                                    <div className="font-black text-slate-800 uppercase text-sm mb-4 border-b pb-2">{s.name}</div>
                                    <div className="grid grid-cols-4 gap-4">
                                        {['6', '7', '8', '9'].map(grade => (
                                            <div key={grade} className="text-center">
                                                <label className="block text-[9px] font-black text-slate-300 uppercase mb-1">Khối {grade}</label>
                                                <input type="number" step="0.5" value={s[`p${grade}`]} onChange={e => {
                                                    const nc = [...data.subjectConfigs]; nc[i][`p${grade}`] = parseFloat(e.target.value) || 0; updateData({subjectConfigs: nc});
                                                }} className="w-full p-2 bg-slate-50 rounded-xl text-center font-black text-blue-500 border border-slate-100 focus:ring-2 focus:ring-blue-200 outline-none"/>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="mt-12 bg-emerald-50 p-10 rounded-[4rem] border border-emerald-100">
                    <h3 className="font-black text-emerald-800 uppercase text-xs mb-8 tracking-widest">Chức vụ kiêm nhiệm (Giảm trừ)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                        {data.roles.map((r: any, i: number) => (
                            <div key={r.id} className="bg-white p-6 rounded-3xl shadow-sm border border-emerald-100 flex flex-col items-center">
                                <span className="font-black text-slate-600 text-[10px] uppercase mb-3">{r.name}</span>
                                <input type="number" value={r.reduction} onChange={e => {
                                    const nr = [...data.roles]; nr[i].reduction = parseInt(e.target.value) || 0; updateData({roles: nr});
                                }} className="w-full p-3 bg-emerald-50 rounded-2xl text-center font-black text-emerald-600 outline-none border-none"/>
                            </div>
                        ))}
                    </div>
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
                        <h1 className="font-black text-3xl tracking-tighter text-slate-800 uppercase italic">THCS PRO <span className="text-blue-600 text-sm align-top italic font-black">v6.8</span></h1>
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
                    {activeTab === 'config' && <ConfigTab />}
                    {activeTab === 'teachers' && <TeacherTab />}
                    {activeTab === 'weekly' && <WeeklyTab />}
                    {activeTab === 'reports' && (
                        <div className="p-32 text-center text-slate-300 font-black uppercase italic tracking-widest animate-pulse">
                            Tab Báo cáo đang được đồng bộ hóa dữ liệu...
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
