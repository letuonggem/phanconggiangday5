
import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { 
    LayoutDashboard, Users, CalendarDays, FileText, Settings, 
    Trash2, ChevronLeft, ChevronRight, ChevronDown,
    Plus, FileUp, Edit3, Check,
    AlertTriangle, Copy, RefreshCcw, FileDown, PlusCircle, Book, Info, CheckCircle2, X, Square, CheckSquare, Search, FileSpreadsheet
} from 'lucide-react';

// --- CẤU HÌNH HỆ THỐNG ---
const STORAGE_KEY = 'thcs_teaching_mgmt_v7_7_pro';

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

// --- TIỆN ÍCH ---

const isValidClassName = (cls: string) => /^[6-9][A-Z0-9.\-_]*$/i.test(cls);

// --- COMPONENTS ---

const LocalNumericInput = ({ value, onChange, className, step = 0.5 }: any) => {
    const [local, setLocal] = useState(value);
    useEffect(() => { setLocal(value); }, [value]);
    return (
        <input 
            type="number" step={step} className={className} 
            value={local} 
            onChange={(e) => setLocal(e.target.value)}
            onBlur={() => onChange(parseFloat(local) || 0)}
            onKeyDown={(e) => { if(e.key === 'Enter') onChange(parseFloat(local) || 0); }}
        />
    );
};

const LocalAssignmentInput = ({ value, onSave, existingAssignments }: any) => {
    const [local, setLocal] = useState(value);
    useEffect(() => { setLocal(value); }, [value]);

    const handleCommit = () => {
        if (local === value) return;
        const normalized = local.replace(/\s+/g, ' ').toUpperCase().trim();
        if (!normalized) { onSave(""); return; }
        const parts = normalized.split(';');
        const allNewClasses: string[] = [];
        for (let part of parts) {
            const colonIdx = part.indexOf(':');
            if (colonIdx !== -1) {
                const clsPart = part.substring(colonIdx + 1);
                const classes = clsPart.split(',').map(c => c.trim()).filter(c => c);
                for (let cls of classes) {
                    if (!isValidClassName(cls)) {
                        alert(`Lỗi: Lớp "${cls}" không đúng định dạng THCS (Khối 6-9).`);
                        setLocal(value); return;
                    }
                    allNewClasses.push(cls);
                }
            }
        }
        for (const cls of allNewClasses) {
            if (existingAssignments[cls]) {
                alert(`Lỗi: Lớp ${cls} đã được phân công cho ${existingAssignments[cls]}.`);
                setLocal(value); return;
            }
        }
        onSave(normalized);
    };

    return (
        <input 
            type="text" 
            className="w-full p-3 rounded-lg border-none font-bold text-sm shadow-inner bg-slate-50 text-slate-600 focus:ring-2 focus:ring-blue-100 transition-all"
            value={local} onChange={(e) => setLocal(e.target.value)} onBlur={handleCommit}
            onKeyDown={(e) => { if(e.key === 'Enter') handleCommit(); }}
            placeholder="Môn: Lớp1, Lớp2..."
        />
    );
};

// --- APP CHÍNH ---

const App = () => {
    const [activeTab, setActiveTab] = useState('teachers');
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

    useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }, [data]);

    const updateData = (newData: any) => setData((prev: any) => ({ ...prev, ...newData }));
    const getWeekData = (week: number) => data.weeklyRecords[week] || { teachers: [], assignments: {}, logs: {} };
    const updateWeekData = (week: number, weekContent: any) => {
        updateData({ weeklyRecords: { ...data.weeklyRecords, [week]: { ...getWeekData(week), ...weekContent } } });
    };

    const getTKBPeriods = useMemo(() => {
        const configMap = new Map<string, any>();
        data.subjectConfigs.forEach((s: any) => configMap.set(String(s.name).toLowerCase(), s));
        return (assignmentStr: string) => {
            if (!assignmentStr) return 0;
            let total = 0;
            assignmentStr.split(';').forEach(part => {
                const [subName, clsPart] = part.split(':');
                if (subName && clsPart) {
                    const subConfig = configMap.get(subName.trim().toLowerCase());
                    if (subConfig) {
                        clsPart.split(',').map(c => c.trim()).filter(c => c).forEach(cls => {
                            const gradeMatch = cls.match(/^[6-9]/);
                            if (gradeMatch) total += Number(subConfig[`p${gradeMatch[0]}`] || 0);
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
        const [newTeacherRoles, setNewTeacherRoles] = useState<string[]>([]);
        const [showRoleDropdown, setShowRoleDropdown] = useState<boolean>(false);
        const [selectedIds, setSelectedIds] = useState<string[]>([]);
        const fileRef = useRef<HTMLInputElement>(null);
        
        const weekData = getWeekData(currentWeek);
        const prevWeekData = getWeekData(currentWeek - 1);
        const { teachers, assignments, logs = {} } = weekData;

        const classToTeacherMap = useMemo(() => {
            const map: Record<string, string> = {};
            Object.entries(assignments).forEach(([tId, str]) => {
                if (!str) return;
                const t = teachers.find(x => x.id === tId);
                const name = t ? t.name : "GV khác";
                (str as string).split(';').forEach(p => {
                    const cIdx = p.indexOf(':');
                    if (cIdx !== -1) p.substring(cIdx + 1).split(',').map(c => c.trim()).filter(c => c).forEach(cls => {
                        map[cls] = name;
                    });
                });
            });
            return map;
        }, [assignments, teachers]);

        const saveAssignment = (tId: string, val: string) => {
            updateWeekData(currentWeek, { assignments: { ...assignments, [tId]: val } });
        };

        const copySelectedFromPrevious = () => {
            if (selectedIds.length === 0) return alert("Chọn giáo viên cần sao chép!");
            const newTeachers = [...teachers];
            const newAssignments = { ...assignments };
            const newLogs = { ...logs };
            selectedIds.forEach(id => {
                const prevT = prevWeekData.teachers.find((x:any) => x.id === id);
                if (prevT) {
                    if (!teachers.some(t => t.id === id)) newTeachers.push({ ...prevT });
                    newAssignments[id] = prevWeekData.assignments[id] || "";
                    if (prevWeekData.logs?.[id]) newLogs[id] = { ...prevWeekData.logs[id] };
                }
            });
            updateWeekData(currentWeek, { teachers: newTeachers, assignments: newAssignments, logs: newLogs });
            setSelectedIds([]);
        };

        const toggleRole = (e: React.MouseEvent, roleName: string) => {
            e.stopPropagation();
            setNewTeacherRoles(prev => prev.includes(roleName) ? prev.filter(r => r !== roleName) : [...prev, roleName]);
            setShowRoleDropdown(false);
        };

        return (
            <div className="p-8 animate-fadeIn">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-12">
                    <div className="flex items-center gap-4 bg-white border border-slate-200 p-3 rounded-2xl shadow-sm">
                        <button onClick={() => { setCurrentWeek(Math.max(1, currentWeek-1)); setSelectedIds([]); }} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400"><ChevronLeft size={20}/></button>
                        <div className="px-6 text-center border-x border-slate-100">
                            <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Tuần học</div>
                            <div className="text-2xl font-black text-slate-800 tracking-tighter">{currentWeek}</div>
                        </div>
                        <button onClick={() => { setCurrentWeek(currentWeek+1); setSelectedIds([]); }} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400"><ChevronRight size={20}/></button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button onClick={() => { setIsAdding(!isAdding); setNewTeacherRoles([]); }} className="bg-blue-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 font-bold shadow-md hover:bg-blue-700 transition-all text-xs uppercase tracking-wider">{isAdding ? 'Đóng Form' : 'Thêm GV mới'}</button>
                        <button onClick={() => fileRef.current?.click()} className="bg-emerald-50 text-emerald-700 px-5 py-3 rounded-xl flex items-center gap-2 font-bold hover:bg-emerald-100 transition-all text-xs uppercase tracking-wider"><FileUp size={16}/> Nhập Excel</button>
                        <input type="file" ref={fileRef} className="hidden" accept=".xlsx,.xls,.csv"/>
                    </div>
                </div>

                {isAdding && (
                    <div className="mb-10 bg-white border border-blue-100 p-8 rounded-3xl animate-fadeIn shadow-lg relative">
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6">Thông tin giáo viên</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">Họ tên GV</label>
                                <input type="text" placeholder="Nguyễn văn a" className="w-full p-4 rounded-xl bg-slate-50 border-none outline-none font-bold shadow-inner" id="new-name"/>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">Môn dạy</label>
                                <select className="w-full p-4 rounded-xl bg-slate-50 border-none outline-none font-bold shadow-inner" id="new-sub">
                                    <option value="">Chọn môn</option>
                                    {data.subjectConfigs.map((s: any) => <option key={s.name} value={s.name}>{s.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">Lớp dạy</label>
                                <input type="text" placeholder="6A1, 7B" className="w-full p-4 rounded-xl bg-slate-50 border-none outline-none font-bold shadow-inner" id="new-cls"/>
                            </div>
                            <div className="space-y-2 relative">
                                <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">Kiêm nhiệm</label>
                                <div onClick={() => setShowRoleDropdown(!showRoleDropdown)} className="w-full p-4 bg-slate-50 rounded-xl font-bold text-slate-600 text-sm flex justify-between items-center cursor-pointer shadow-inner">
                                    <span className="truncate">{newTeacherRoles.length > 0 ? newTeacherRoles.join(', ') : 'Chưa chọn...'}</span>
                                    <ChevronDown size={16} className="text-blue-500" />
                                </div>
                                {showRoleDropdown && (
                                    <div className="absolute top-[105%] left-0 w-full mt-1 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 p-2 max-h-48 overflow-y-auto">
                                        {data.roles.map((r: any) => (
                                            <div key={r.id} onClick={(e) => toggleRole(e, r.name)} className="p-3 rounded-xl mb-1 cursor-pointer flex items-center justify-between hover:bg-blue-50 transition-colors">
                                                <span className="font-bold text-xs">{r.name}</span>
                                                {newTeacherRoles.includes(r.name) && <Check size={14} className="text-blue-600" />}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-end mt-8 pt-6 border-t border-slate-50">
                            <button onClick={() => {
                                const nVal = (document.getElementById('new-name') as HTMLInputElement).value.trim().toUpperCase();
                                const sVal = (document.getElementById('new-sub') as HTMLSelectElement).value;
                                const cVal = (document.getElementById('new-cls') as HTMLInputElement).value.trim().toUpperCase();
                                if (!nVal || !sVal || !cVal) return alert("Nhập đủ Tên, Môn, Lớp!");
                                const tId = Date.now().toString();
                                updateWeekData(currentWeek, {
                                    teachers: [{ id: tId, name: nVal, roles: [...newTeacherRoles] }, ...teachers],
                                    assignments: { ...assignments, [tId]: `${sVal}: ${cVal}` }
                                });
                                setIsAdding(false);
                            }} className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg hover:bg-blue-700">Xác nhận thêm</button>
                        </div>
                    </div>
                )}

                {teachers.length === 0 && prevWeekData.teachers.length > 0 && (
                    <div className="mb-10 bg-slate-50 border border-slate-100 p-8 rounded-3xl animate-fadeIn">
                        <div className="flex items-center justify-between mb-6">
                            <h4 className="font-black text-slate-700 uppercase text-xs tracking-widest">Gợi ý từ tuần {currentWeek-1}</h4>
                            <button onClick={copySelectedFromPrevious} disabled={selectedIds.length === 0} className={`px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all ${selectedIds.length > 0 ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-200 text-slate-400'}`}>Sao chép {selectedIds.length > 0 ? selectedIds.length : ''} GV chọn lọc</button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {prevWeekData.teachers.map((t:any) => (
                                <div key={t.id} onClick={() => setSelectedIds(prev => prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id])} className={`px-4 py-2 rounded-lg cursor-pointer border text-[11px] font-bold transition-all flex items-center gap-2 ${selectedIds.includes(t.id) ? 'bg-white border-blue-500 text-blue-600 shadow-sm' : 'bg-white/50 border-transparent opacity-60'}`}>
                                    {selectedIds.includes(t.id) ? <CheckSquare size={14}/> : <Square size={14}/>} {t.name}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
                    <table className="w-full text-left min-w-[1000px]">
                        <thead className="bg-slate-50 border-b text-[10px] font-bold uppercase text-slate-400">
                            <tr>
                                <th className="p-6 tracking-widest">Giáo viên / Chức vụ</th>
                                <th className="p-6 w-1/3 tracking-widest">Phân công TKB (Môn: Lớp)</th>
                                <th className="p-6 text-center tracking-widest">Tiết TKB</th>
                                <th className="p-6 text-center text-orange-600 tracking-widest">Dạy bù</th>
                                <th className="p-6 text-center text-orange-600 tracking-widest">Tăng tiết/BD</th>
                                <th className="p-6 text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {teachers.map((t: any) => {
                                const assignment = assignments[t.id] || "";
                                const tkb = getTKBPeriods(assignment);
                                const log = logs[t.id] || { bu: 0, tang: 0 };
                                const otherAssignments: Record<string, string> = {};
                                Object.entries(assignments).forEach(([id, s]) => {
                                    if (id === t.id || !s) return;
                                    (s as string).split(';').forEach(p => {
                                        const cIdx = p.indexOf(':');
                                        if (cIdx !== -1) p.substring(cIdx+1).split(',').map(c => c.trim()).filter(c => c).forEach(cls => {
                                            const otherT = teachers.find(x => x.id === id);
                                            otherAssignments[cls] = otherT ? otherT.name : "GV khác";
                                        });
                                    });
                                });

                                return (
                                    <tr key={t.id} className="hover:bg-slate-50/30 transition-all group">
                                        <td className="p-6">
                                            <div className="font-bold text-slate-700 text-lg uppercase tracking-tight">{t.name}</div>
                                            <div className="flex flex-wrap gap-1 mt-1">{(t.roles || []).map((r: string) => <span key={r} className="text-[9px] font-bold bg-blue-50 text-blue-500 px-2 py-0.5 rounded border border-blue-100">{r}</span>)}</div>
                                        </td>
                                        <td className="p-6">
                                            <LocalAssignmentInput value={assignment} onSave={(v: string) => saveAssignment(t.id, v)} existingAssignments={otherAssignments} />
                                        </td>
                                        <td className="p-6 text-center font-black text-slate-800 text-xl tracking-tighter">{tkb.toFixed(1)}</td>
                                        <td className="p-6">
                                            <LocalNumericInput value={log.bu} onChange={(val: number) => updateWeekData(currentWeek, { logs: { ...logs, [t.id]: { ...log, bu: val } } })} className="w-16 mx-auto block text-center p-3 bg-orange-50 border border-orange-100 rounded-xl font-bold text-orange-700 outline-none hover:border-orange-200 transition-all"/>
                                        </td>
                                        <td className="p-6">
                                            <LocalNumericInput value={log.tang} onChange={(val: number) => updateWeekData(currentWeek, { logs: { ...logs, [t.id]: { ...log, tang: val } } })} className="w-16 mx-auto block text-center p-3 bg-orange-50 border border-orange-100 rounded-xl font-bold text-orange-700 outline-none hover:border-orange-200 transition-all"/>
                                        </td>
                                        <td className="p-6 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => { if(confirm("Xóa GV?")) updateWeekData(currentWeek, { teachers: teachers.filter((x: any) => x.id !== t.id) }); }} className="text-slate-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={18}/></button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {teachers.length === 0 && <div className="py-20 text-center text-slate-300 italic font-bold text-xs uppercase tracking-widest">Dữ liệu tuần hiện tại đang trống</div>}
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
                    const key = t.name.trim().toUpperCase();
                    if (!aggregates[key]) aggregates[key] = { name: t.name, tkb: 0, bu: 0, tang: 0 };
                    const log = record.logs?.[t.id] || { bu: 0, tang: 0 };
                    aggregates[key].tkb += (log.actual !== undefined ? log.actual : getTKBPeriods(record.assignments[t.id] || ""));
                    aggregates[key].bu += (log.bu || 0); aggregates[key].tang += (log.tang || 0);
                });
            }
            return Object.values(aggregates).sort((a: any, b: any) => a.name.localeCompare(b.name));
        }, [data, startRange, endRange]);

        return (
            <div className="p-8 animate-fadeIn">
                <div className="flex flex-col lg:flex-row justify-between items-center mb-10 gap-6">
                    <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-2">
                            <label className="text-[10px] font-bold uppercase text-blue-500 tracking-widest">Từ</label>
                            <input type="number" min="1" value={startRange} onChange={e => setStartRange(parseInt(e.target.value) || 1)} className="w-14 p-2 bg-slate-50 rounded-lg font-black text-center text-lg border-none outline-none focus:ring-2 focus:ring-blue-100"/>
                        </div>
                        <ChevronRight className="text-slate-200" size={24} />
                        <div className="flex items-center gap-2">
                            <label className="text-[10px] font-bold uppercase text-blue-500 tracking-widest">Đến</label>
                            <input type="number" min={startRange} value={endRange} onChange={e => setEndRange(parseInt(e.target.value) || 1)} className="w-14 p-2 bg-slate-50 rounded-lg font-black text-center text-lg border-none outline-none focus:ring-2 focus:ring-blue-100"/>
                        </div>
                    </div>
                    <div className="text-right">
                        <h2 className="text-xl font-black text-slate-800 uppercase italic tracking-tight">Thực dạy Lũy kế</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Thống kê tiết dạy theo khoảng thời gian</p>
                    </div>
                </div>
                <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b text-[10px] font-bold uppercase text-slate-400">
                            <tr>
                                <th className="p-6 tracking-widest">Giáo viên</th>
                                <th className="p-6 text-center tracking-widest">Tổng Tiết TKB</th>
                                <th className="p-6 text-center text-orange-600 tracking-widest">Dạy bù</th>
                                <th className="p-6 text-center text-orange-600 tracking-widest">Tăng tiết/BD</th>
                                <th className="p-6 text-center bg-blue-50/50 text-blue-700 tracking-widest">Tổng thực dạy</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {stats.map((s: any, i: number) => (
                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-6"><div className="font-bold text-slate-700 text-lg uppercase tracking-tight">{s.name}</div></td>
                                    <td className="p-6 text-center font-bold text-slate-400 text-xl tracking-tighter">{s.tkb.toFixed(1)}</td>
                                    <td className="p-6 text-center font-bold text-orange-600 text-xl tracking-tighter">{s.bu.toFixed(1)}</td>
                                    <td className="p-6 text-center font-bold text-orange-600 text-xl tracking-tighter">{s.tang.toFixed(1)}</td>
                                    <td className="p-6 text-center bg-blue-50/20"><div className="text-3xl font-black text-blue-700 tracking-tighter">{ (s.tkb + s.bu + s.tang).toFixed(1) }</div></td>
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
        const [reportRange, setReportRange] = useState({ s: 1, e: 1 });
        useEffect(() => { setReportRange({s: startRange, e: endRange}); }, [startRange, endRange]);

        const teacherStats = useMemo(() => {
            const teacherMap: Record<string, any> = {};
            const numWeeks = (reportRange.e - reportRange.s + 1);
            if (numWeeks <= 0) return [];
            
            for (let w = reportRange.s; w <= reportRange.e; w++) {
                const record = data.weeklyRecords[w]; if (!record) continue;
                record.teachers.forEach((t: any) => {
                    const key = t.name.trim().toUpperCase();
                    if (!teacherMap[key]) teacherMap[key] = { id: t.id, name: t.name, quotaPerWeek: 0, actual: 0, extra: 0 };
                    const q = Math.max(0, data.standardQuota - getTeacherReduction(t.roles));
                    teacherMap[key].quotaPerWeek = q; // Lấy giá trị định mức
                    const log = record.logs?.[t.id] || { bu: 0, tang: 0 };
                    teacherMap[key].actual += (log.actual !== undefined ? log.actual : getTKBPeriods(record.assignments[t.id] || ""));
                    teacherMap[key].extra += (log.bu || 0) + (log.tang || 0);
                });
            }
            return Object.values(teacherMap).map((s: any) => ({
                ...s,
                progressQuota: s.quotaPerWeek * numWeeks,
                total: s.actual + s.extra,
                balance: (s.actual + s.extra) - (s.quotaPerWeek * numWeeks)
            })).sort((a,b) => a.name.localeCompare(b.name));
        }, [data, reportRange]);

        const subjectStats = useMemo(() => {
            // Tính số lớp cho mỗi môn học dựa trên phân công (lấy trung bình hoặc tuần hiện tại)
            const subjMap: Record<string, { totalTaught: number; totalProgressQuota: number; classesByGrade: Record<string, number> }> = {};
            
            // Khởi tạo các môn học từ config
            data.subjectConfigs.forEach((s: any) => {
                subjMap[s.name] = { totalTaught: 0, totalProgressQuota: 0, classesByGrade: { '6': 0, '7': 0, '8': 0, '9': 0 } };
            });

            // Lấy dữ liệu phân công tuần mới nhất trong phạm vi để đếm lớp
            const latestWeek = reportRange.e;
            const weekData = data.weeklyRecords[latestWeek] || { assignments: {} };
            
            Object.entries(weekData.assignments).forEach(([tId, assignStr]) => {
                (assignStr as string).split(';').forEach(part => {
                    const [subName, clsPart] = part.split(':');
                    if (subName && clsPart) {
                        const sub = subName.trim();
                        if (subjMap[sub]) {
                            clsPart.split(',').forEach(cls => {
                                const match = cls.trim().match(/^[6-9]/);
                                if (match) subjMap[sub].classesByGrade[match[0]]++;
                            });
                        }
                    }
                });
            });

            // Tính toán tổng tiết đã dạy và định mức 35 tuần
            teacherStats.forEach(t => {
                // Giả sử mỗi GV chỉ dạy 1 môn chính, hoặc ta cần bóc tách kỹ hơn.
                // Ở bản này ta bóc tách từ assignments để chính xác hơn
            });
            
            // Tính lại chính xác Taught từ Logs
            for (let w = reportRange.s; w <= reportRange.e; w++) {
                const record = data.weeklyRecords[w]; if (!record) continue;
                Object.entries(record.assignments).forEach(([tId, assignStr]) => {
                    (assignStr as string).split(';').forEach(part => {
                        const [subName, clsPart] = part.split(':');
                        if (subName && clsPart) {
                            const sub = subName.trim();
                            if (subjMap[sub]) {
                                const clsList = clsPart.split(',').map(c=>c.trim()).filter(c=>isValidClassName(c));
                                clsList.forEach(cls => {
                                    const grade = cls.match(/^[6-9]/)?.[0];
                                    const subConfig = data.subjectConfigs.find((x:any)=>x.name === sub);
                                    if (grade && subConfig) {
                                        subjMap[sub].totalTaught += subConfig[`p${grade}`];
                                    }
                                });
                            }
                        }
                    });
                });
            }

            return data.subjectConfigs.map((s: any) => {
                const info = subjMap[s.name];
                let fullYearQuota = 0;
                Object.entries(info.classesByGrade).forEach(([grade, count]) => {
                    fullYearQuota += count * s[`p${grade}`] * 35;
                });
                return {
                    name: s.name,
                    fullYearQuota,
                    totalTaught: info.totalTaught,
                    percent: fullYearQuota > 0 ? (info.totalTaught / fullYearQuota) * 100 : 0
                };
            }).filter(x => x.fullYearQuota > 0);
        }, [data, reportRange, teacherStats]);

        const exportTeachersExcel = () => {
            const headers = ["STT", "Họ tên Giáo viên", "Định mức theo tuần chọn", "Tổng số thực dạy", "Tiết thừa/thiếu"];
            const rows = teacherStats.map((s, i) => [
                i + 1, s.name, s.progressQuota.toFixed(1), s.total.toFixed(1), s.balance.toFixed(1)
            ]);
            const csv = "\uFEFF" + [headers, ...rows].map(r => r.join(",")).join("\n");
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `Quyet_toan_GV_Tuan_${reportRange.s}_${reportRange.e}.csv`;
            link.click();
        };

        const exportSubjectsExcel = () => {
            const headers = ["STT", "Môn học", "Định mức cả năm (35 tuần)", "Tổng số tiết đã dạy", "Tỷ lệ (%)"];
            const rows = subjectStats.map((s, i) => [
                i + 1, s.name, s.fullYearQuota.toFixed(1), s.totalTaught.toFixed(1), s.percent.toFixed(1) + "%"
            ]);
            const csv = "\uFEFF" + [headers, ...rows].map(r => r.join(",")).join("\n");
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `Theo_doi_Mon_hoc_Tuan_${reportRange.s}_${reportRange.e}.csv`;
            link.click();
        };

        return (
            <div className="p-8 animate-fadeIn">
                <div className="flex flex-col lg:flex-row justify-between items-center mb-10 gap-6">
                    <div className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                        <span className="text-[10px] font-bold uppercase text-slate-400 ml-2 tracking-widest">Tiến độ tuần:</span>
                        <input type="number" value={reportRange.s} onChange={e => setReportRange({...reportRange, s: parseInt(e.target.value)||1})} className="w-12 p-2 bg-slate-50 rounded-lg text-center font-bold text-blue-600 border-none outline-none focus:ring-2 focus:ring-blue-100"/>
                        <span className="text-slate-300">→</span>
                        <input type="number" value={reportRange.e} onChange={e => setReportRange({...reportRange, e: parseInt(e.target.value)||1})} className="w-12 p-2 bg-slate-50 rounded-lg text-center font-bold text-blue-600 border-none outline-none focus:ring-2 focus:ring-blue-100"/>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={exportTeachersExcel} className="bg-blue-50 text-blue-600 px-5 py-3 rounded-xl flex items-center gap-2 font-bold hover:bg-blue-100 transition-all text-[10px] uppercase tracking-wider"><FileSpreadsheet size={16}/> Quyết toán GV</button>
                        <button onClick={exportSubjectsExcel} className="bg-indigo-50 text-indigo-600 px-5 py-3 rounded-xl flex items-center gap-2 font-bold hover:bg-indigo-100 transition-all text-[10px] uppercase tracking-wider"><FileSpreadsheet size={16}/> Theo dõi Môn</button>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    <div className="xl:col-span-2 space-y-8">
                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="p-5 bg-slate-50 border-b flex items-center justify-between">
                                <h3 className="font-black text-slate-700 uppercase text-[10px] tracking-widest">Chi tiết Quyết toán theo Tiến độ</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50/50 border-b text-[9px] font-bold uppercase text-slate-400">
                                        <tr>
                                            <th className="p-5 w-12 text-center">STT</th>
                                            <th className="p-5">Họ tên Giáo viên</th>
                                            <th className="p-5 text-center">Định mức tiến độ</th>
                                            <th className="p-5 text-center">Tổng thực dạy</th>
                                            <th className="p-5 text-center text-blue-600">Thừa/Thiếu</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {teacherStats.map((s: any, i: number) => (
                                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="p-5 text-center text-slate-300 font-bold">{i+1}</td>
                                                <td className="p-5 font-bold text-slate-700 text-sm">{s.name}</td>
                                                <td className="p-5 text-center text-slate-400 font-bold">{s.progressQuota.toFixed(1)}</td>
                                                <td className="p-5 text-center text-slate-800 font-black">{s.total.toFixed(1)}</td>
                                                <td className={`p-5 text-center text-lg font-black tracking-tighter ${s.balance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                    {s.balance > 0 ? `+${s.balance.toFixed(1)}` : s.balance.toFixed(1)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="p-5 bg-slate-50 border-b">
                                <h3 className="font-black text-slate-700 uppercase text-[10px] tracking-widest">Theo dõi Tiến độ Môn học</h3>
                            </div>
                            <div className="p-6 space-y-6">
                                {subjectStats.map((s: any, i: number) => (
                                    <div key={i} className="space-y-2">
                                        <div className="flex justify-between items-end">
                                            <div className="font-bold text-slate-700 text-sm tracking-tight">{s.name}</div>
                                            <div className="text-[10px] font-black text-blue-500">{s.totalTaught.toFixed(1)} / {s.fullYearQuota.toFixed(0)} tiết</div>
                                        </div>
                                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${Math.min(100, s.percent)}%` }}></div>
                                        </div>
                                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right">Hoàn thành {s.percent.toFixed(1)}% năm học</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const ConfigTab = () => {
        const [newSub, setNewSub] = useState('');
        return (
            <div className="p-8 animate-fadeIn">
                <h2 className="text-xl font-black mb-8 text-slate-800 uppercase italic">Cấu hình hệ thống</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="space-y-8">
                        <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Định mức dạy chuẩn (Tiết/Tuần)</label>
                            <input type="number" value={data.standardQuota} onChange={e => updateData({standardQuota: parseFloat(e.target.value) || 0})} className="text-7xl font-black text-blue-600 bg-transparent outline-none w-full tracking-tighter"/>
                        </div>
                        <div className="bg-blue-600 p-8 rounded-3xl text-white shadow-xl shadow-blue-200">
                            <h3 className="font-bold uppercase text-[10px] mb-4 tracking-widest">Thêm môn học mới</h3>
                            <div className="flex gap-2">
                                <input type="text" placeholder="Tên môn..." value={newSub} onChange={e => setNewSub(e.target.value)} className="flex-1 p-4 rounded-xl bg-white/10 border-none text-white placeholder-white/40 font-bold outline-none"/>
                                <button onClick={() => {
                                    if(!newSub.trim()) return;
                                    updateData({ subjectConfigs: [...data.subjectConfigs, { name: newSub.trim(), p6: 1, p7: 1, p8: 1, p9: 1 }] });
                                    setNewSub('');
                                }} className="bg-white text-blue-600 px-6 py-4 rounded-xl font-bold uppercase text-[10px]">Thêm</button>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 max-h-[600px] overflow-y-auto">
                        <h3 className="font-bold text-slate-700 uppercase text-[10px] mb-6 tracking-widest">Định mức tiết từng môn</h3>
                        <div className="space-y-4">
                            {data.subjectConfigs.map((s: any, i: number) => (
                                <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="font-bold text-slate-800 text-sm italic">{s.name}</div>
                                        <button onClick={() => updateData({ subjectConfigs: data.subjectConfigs.filter((x:any)=>x.name !== s.name) })} className="text-slate-200 hover:text-red-500"><X size={14}/></button>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2">
                                        {['6', '7', '8', '9'].map(g => (
                                            <div key={g}>
                                                <input type="number" step="0.5" value={s[`p${g}`]} onChange={e => {
                                                    const nc = [...data.subjectConfigs]; nc[i][`p${g}`] = parseFloat(e.target.value) || 0; updateData({subjectConfigs: nc});
                                                }} className="w-full p-2 bg-slate-50 rounded-lg text-center font-bold text-blue-500 text-xs border-none outline-none"/>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 overflow-x-hidden">
            <header className="bg-white border-b border-slate-100 p-6 sticky top-0 z-50 shadow-sm transition-all">
                <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-xl"><LayoutDashboard size={24}/></div>
                        <div>
                            <h1 className="font-black text-2xl tracking-tighter text-slate-800 uppercase italic">THCS PRO <span className="text-blue-600 text-xs align-top italic font-black">v7.7</span></h1>
                            <p className="text-[8px] font-bold uppercase text-slate-400 tracking-[0.2em] leading-none">Professional progress tracking</p>
                        </div>
                    </div>
                    <nav className="flex gap-1 bg-slate-100 p-1.5 rounded-2xl shadow-inner overflow-x-auto no-scrollbar">
                        {[
                            {id: 'config', icon: Settings, label: 'Cài đặt'},
                            {id: 'teachers', icon: Users, label: 'Phân công'},
                            {id: 'weekly', icon: CalendarDays, label: 'Thực dạy'},
                            {id: 'reports', icon: FileText, label: 'Báo cáo'},
                        ].map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-bold transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-sm scale-105' : 'text-slate-400 hover:text-slate-600'}`}>
                                <tab.icon size={16}/> {tab.label.toUpperCase()}
                            </button>
                        ))}
                    </nav>
                </div>
            </header>
            <main className="container mx-auto p-4 md:p-8 flex-1">
                <div className="bg-white rounded-[3rem] shadow-xl border border-white min-h-[700px] overflow-hidden relative">
                    {activeTab === 'config' && <ConfigTab />}
                    {activeTab === 'teachers' && <TeacherTab />}
                    {activeTab === 'weekly' && <WeeklyTab />}
                    {activeTab === 'reports' && <ReportTab />}
                </div>
            </main>
            <footer className="p-6 text-center text-[10px] font-bold uppercase text-slate-300 tracking-widest italic flex items-center justify-center gap-2">
                <CheckCircle2 size={12}/> Chuyên nghiệp • Chính xác • Thẩm mỹ
            </footer>
        </div>
    );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
