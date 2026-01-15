
import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { 
    LayoutDashboard, Users, CalendarDays, FileText, Settings, 
    Trash2, ChevronLeft, ChevronRight, ChevronDown,
    Plus, Edit3, Check,
    AlertTriangle, Copy, RefreshCcw, FileDown, PlusCircle, Book, Info, CheckCircle2, X, Square, CheckSquare, Search, FileSpreadsheet,
    Download, Upload, Database, Save, TableProperties, FileJson, FileType, Layers, TrendingUp, BookOpen
} from 'lucide-react';

// --- CẤU HÌNH HỆ THỐNG ---
const STORAGE_KEY = 'thcs_teaching_mgmt_v8_7_pro';

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

// --- COMPONENTS TỐI ƯU ---
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
        const normalized = local.replace(/\s+/g, ' ').trim();
        if (!normalized) { onSave(""); return; }
        
        const parts = normalized.split(';');
        for (let part of parts) {
            const colonIdx = part.indexOf(':');
            if (colonIdx !== -1) {
                const subName = part.substring(0, colonIdx).trim();
                const clsPart = part.substring(colonIdx + 1);
                const classes = clsPart.split(',').map(c => c.trim().replace(/\s/g, '')).filter(c => c);
                for (let cls of classes) {
                    if (!isValidClassName(cls)) {
                        alert(`Lỗi: Lớp "${cls}" sai định dạng khối 6-9.`);
                        setLocal(value); return;
                    }
                    const assignmentKey = `${subName}:${cls}`;
                    if (existingAssignments[assignmentKey]) {
                        alert(`Lỗi: Môn ${subName} tại lớp ${cls} đã được phân công cho ${existingAssignments[assignmentKey]}.`);
                        setLocal(value); return;
                    }
                }
            }
        }
        onSave(normalized);
    };

    return (
        <input 
            type="text" 
            className="w-full p-2.5 rounded-xl border-none font-medium text-sm shadow-inner bg-slate-50 text-slate-700 focus:ring-2 focus:ring-blue-100 transition-all"
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
                        clsPart.split(',').map(c => c.trim().replace(/\s/g, '')).filter(c => c).forEach(cls => {
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
        const [isCopying, setIsCopying] = useState(false);
        const [newTeacherRoles, setNewTeacherRoles] = useState<string[]>([]);
        const [showRoleDropdown, setShowRoleDropdown] = useState<boolean>(false);
        const [selectedIds, setSelectedIds] = useState<string[]>([]);
        
        const weekData = getWeekData(currentWeek);
        const prevWeekData = getWeekData(currentWeek - 1);
        const { teachers, assignments, logs = {} } = weekData;

        const fullAssignmentMap = useMemo(() => {
            const map: Record<string, string> = {};
            Object.entries(assignments).forEach(([tId, str]) => {
                if (!str) return;
                const t = teachers.find(x => x.id === tId);
                const name = t ? t.name : "GV khác";
                (str as string).split(';').forEach(p => {
                    const cIdx = p.indexOf(':');
                    if (cIdx !== -1) {
                        const sub = p.substring(0, cIdx).trim();
                        p.substring(cIdx + 1).split(',').map(c => c.trim().replace(/\s/g, '')).filter(c => c).forEach(cls => {
                            map[`${sub}:${cls}`] = name;
                        });
                    }
                });
            });
            return map;
        }, [assignments, teachers]);

        const saveAssignment = (tId: string, val: string) => {
            updateWeekData(currentWeek, { assignments: { ...assignments, [tId]: val } });
        };

        const copySelectedFromPrevious = () => {
            if (selectedIds.length === 0) return alert("Vui lòng chọn giáo viên!");
            const newTeachers = [...teachers];
            const newAssignments = { ...assignments };
            const newLogs = { ...logs };
            selectedIds.forEach(id => {
                const prevT = prevWeekData.teachers.find((x:any) => x.id === id);
                if (prevT && !teachers.some(t => t.id === id)) {
                    newTeachers.push({ ...prevT });
                    newAssignments[id] = prevWeekData.assignments[id] || "";
                    if (prevWeekData.logs?.[id]) newLogs[id] = { ...prevWeekData.logs[id] };
                }
            });
            updateWeekData(currentWeek, { teachers: newTeachers, assignments: newAssignments, logs: newLogs });
            setSelectedIds([]);
            setIsCopying(false);
        };

        const handleExportAllWeeks = () => {
            // @ts-ignore
            const wb = XLSX.utils.book_new();
            let hasData = false;
            for (let w = 1; w <= currentWeek; w++) {
                const wData = data.weeklyRecords[w];
                if (wData && wData.teachers && wData.teachers.length > 0) {
                    hasData = true;
                    const headers = ["Họ tên Giáo viên", "Phân công (Môn: Lớp)", "Số tiết TKB", "Dạy bù", "Tăng tiết", "Tổng cộng", "Chức vụ"];
                    const rows = wData.teachers.map((t: any) => {
                        const tkb = getTKBPeriods(wData.assignments[t.id] || "");
                        const log = wData.logs?.[t.id] || { bu: 0, tang: 0 };
                        const total = tkb + (log.bu || 0) + (log.tang || 0);
                        return [
                            t.name,
                            wData.assignments[t.id] || "",
                            tkb,
                            log.bu || 0,
                            log.tang || 0,
                            total,
                            (t.roles || []).join(', ')
                        ];
                    });
                    // @ts-ignore
                    const ws = XLSX.utils.aoa_to_sheet([[`BẢNG PHÂN CÔNG TUẦN ${w}`], [], headers, ...rows]);
                    // @ts-ignore
                    XLSX.utils.book_append_sheet(wb, ws, `Tuan ${w}`);
                }
            }
            if (!hasData) return alert("Chưa có dữ liệu phân công để xuất!");
            // @ts-ignore
            XLSX.writeFile(wb, `Phan_Cong_Chi_Tiet_Cac_Tuan_Den_Tuan_${currentWeek}.xlsx`);
        };

        const toggleRole = (e: React.MouseEvent, roleName: string) => {
            e.stopPropagation();
            setNewTeacherRoles(prev => prev.includes(roleName) ? prev.filter(r => r !== roleName) : [...prev, roleName]);
            setShowRoleDropdown(false);
        };

        return (
            <div className="p-8 animate-fadeIn">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-10">
                    <div className="flex items-center gap-3 bg-white border border-slate-200 p-2.5 rounded-2xl shadow-sm">
                        <button onClick={() => { setCurrentWeek(Math.max(1, currentWeek-1)); setSelectedIds([]); setIsCopying(false); }} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"><ChevronLeft size={20}/></button>
                        <div className="px-6 text-center border-x border-slate-100">
                            <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest leading-none mb-1">Tuần học</div>
                            <div className="text-2xl font-black text-slate-800 tracking-tighter">{currentWeek}</div>
                        </div>
                        <button onClick={() => { setCurrentWeek(currentWeek+1); setSelectedIds([]); setIsCopying(false); }} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"><ChevronRight size={20}/></button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button onClick={handleExportAllWeeks} className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 font-black shadow-lg hover:bg-indigo-700 transition-all text-[11px] uppercase tracking-widest"><Layers size={16}/> Xuất tất cả các tuần</button>
                        <button onClick={() => { setIsCopying(!isCopying); setIsAdding(false); }} className={`px-4 py-2.5 rounded-xl flex items-center gap-2 font-black transition-all text-[11px] uppercase tracking-widest border ${isCopying ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-slate-50 text-slate-500 border-slate-200'}`}><Copy size={16}/> Copy tuần cũ</button>
                        <button onClick={() => { setIsAdding(!isAdding); setIsCopying(false); setNewTeacherRoles([]); }} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 font-black shadow-lg hover:bg-blue-700 transition-all text-[11px] uppercase tracking-widest">{isAdding ? 'Đóng' : 'Thêm GV mới'}</button>
                    </div>
                </div>

                {isAdding && (
                    <div className="mb-10 bg-white border-4 border-blue-50 p-8 rounded-[2rem] animate-fadeIn shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-2 h-full bg-blue-600"></div>
                        <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-6 flex items-center gap-2 italic"><PlusCircle size={18} className="text-blue-600"/> Nhập thông tin GV tuần {currentWeek}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 ml-1 uppercase">Họ tên giáo viên</label>
                                <input type="text" placeholder="Nguyễn Văn A" className="w-full p-3.5 rounded-xl bg-slate-50 border-none outline-none font-medium shadow-inner text-base" id="new-name"/>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 ml-1 uppercase">Môn giảng dạy</label>
                                <select className="w-full p-3.5 rounded-xl bg-slate-50 border-none outline-none font-black shadow-inner text-base" id="new-sub">
                                    <option value="">Chọn môn...</option>
                                    {data.subjectConfigs.map((s: any) => <option key={s.name} value={s.name}>{s.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 ml-1 uppercase">Lớp dạy</label>
                                <input type="text" placeholder="6A1, 6A2..." className="w-full p-3.5 rounded-xl bg-slate-50 border-none outline-none font-medium shadow-inner text-base" id="new-cls"/>
                            </div>
                            <div className="space-y-2 relative">
                                <label className="text-[10px] font-black text-slate-400 ml-1 uppercase">Kiêm nhiệm</label>
                                <div onClick={() => setShowRoleDropdown(!showRoleDropdown)} className="w-full p-3.5 bg-slate-50 rounded-xl font-black text-slate-600 text-xs flex justify-between items-center cursor-pointer shadow-inner">
                                    <span className="truncate">{newTeacherRoles.length > 0 ? newTeacherRoles.join(', ') : 'Chưa chọn...'}</span>
                                    <ChevronDown size={18} className="text-blue-500" />
                                </div>
                                {showRoleDropdown && (
                                    <div className="absolute top-[105%] left-0 w-full mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 z-50 p-3 max-h-60 overflow-y-auto">
                                        {data.roles.map((r: any) => (
                                            <div key={r.id} onClick={(e) => toggleRole(e, r.name)} className="p-2.5 rounded-lg mb-1 cursor-pointer flex items-center justify-between hover:bg-blue-50 transition-colors">
                                                <span className="font-black text-[11px]">{r.name}</span>
                                                {newTeacherRoles.includes(r.name) && <Check size={16} className="text-blue-600" />}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-end mt-8">
                            <button onClick={() => {
                                const nV = (document.getElementById('new-name') as HTMLInputElement).value.trim();
                                const sV = (document.getElementById('new-sub') as HTMLSelectElement).value;
                                const cV = (document.getElementById('new-cls') as HTMLInputElement).value.trim();
                                if (!nV || !sV || !cV) return alert("Vui lòng nhập đủ thông tin!");
                                const clsList = cV.split(',').map(c => c.trim().toUpperCase()).filter(c => c);
                                for (let c of clsList) {
                                    if(!isValidClassName(c)) return alert(`Lớp ${c} sai định dạng.`);
                                    const key = `${sV}:${c}`;
                                    if(fullAssignmentMap[key]) return alert(`Môn ${sV} tại lớp ${c} đã được giao cho ${fullAssignmentMap[key]}!`);
                                }
                                const tId = Date.now().toString();
                                updateWeekData(currentWeek, {
                                    teachers: [{ id: tId, name: nV, roles: [...newTeacherRoles] }, ...teachers],
                                    assignments: { ...assignments, [tId]: `${sV}: ${clsList.join(', ')}` }
                                });
                                setIsAdding(false);
                            }} className="bg-blue-600 text-white px-10 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg hover:bg-blue-700 transition-all">Lưu phân công</button>
                        </div>
                    </div>
                )}

                {isCopying && prevWeekData.teachers.length > 0 && (
                    <div className="mb-10 bg-indigo-50 border-2 border-indigo-100 p-8 rounded-[2rem] animate-fadeIn shadow-lg">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
                            <h4 className="font-black text-indigo-800 text-[11px] flex items-center gap-2 uppercase tracking-wider"><Info size={18}/> Chọn giáo viên từ tuần {currentWeek-1}:</h4>
                            <div className="flex gap-2">
                                <button onClick={() => setSelectedIds(prevWeekData.teachers.filter((t:any) => !teachers.some((ct:any) => ct.id === t.id)).map((x:any)=>x.id))} className="px-4 py-2 bg-white text-indigo-600 rounded-lg text-[10px] font-black uppercase border border-indigo-200">Tất cả</button>
                                <button onClick={copySelectedFromPrevious} disabled={selectedIds.length === 0} className={`px-6 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${selectedIds.length > 0 ? 'bg-blue-600 text-white shadow-md scale-105' : 'bg-slate-200 text-slate-400'}`}>Sao chép {selectedIds.length > 0 ? selectedIds.length : ''} GV</button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                            {prevWeekData.teachers.map((t:any) => {
                                const exists = teachers.some((ct:any) => ct.id === t.id);
                                return (
                                    <div key={t.id} onClick={() => !exists && setSelectedIds(prev => prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id])} className={`px-4 py-3 rounded-xl cursor-pointer border-2 text-[10px] font-black transition-all flex items-center gap-2 ${exists ? 'bg-slate-100 border-slate-100 text-slate-300 cursor-not-allowed' : selectedIds.includes(t.id) ? 'bg-white border-blue-500 text-blue-600 shadow-md scale-[1.03]' : 'bg-white/50 border-transparent opacity-70 hover:opacity-100'}`}>
                                        {exists ? <CheckCircle2 size={16}/> : selectedIds.includes(t.id) ? <CheckSquare size={16}/> : <Square size={16}/>} 
                                        <span className="truncate">{t.name}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-xl overflow-hidden overflow-x-auto">
                    <table className="w-full text-left min-w-[1000px]">
                        <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400 tracking-widest">
                            <tr>
                                <th className="p-5">Giáo viên & Chức vụ</th>
                                <th className="p-5 w-1/3">Phân công (Môn: Lớp)</th>
                                <th className="p-5 text-center">Tiết TKB</th>
                                <th className="p-5 text-center text-orange-600">Dạy bù</th>
                                <th className="p-5 text-center text-orange-600">Tăng tiết</th>
                                <th className="p-5 text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {teachers.map((t: any) => {
                                const assignment = assignments[t.id] || "";
                                const tkb = getTKBPeriods(assignment);
                                const log = logs[t.id] || { bu: 0, tang: 0 };
                                const others: Record<string, string> = {};
                                Object.entries(assignments).forEach(([id, s]) => {
                                    if (id === t.id || !s) return;
                                    (s as string).split(';').forEach(p => {
                                        const cIdx = p.indexOf(':');
                                        if (cIdx !== -1) {
                                            const sub = p.substring(0, cIdx).trim();
                                            p.substring(cIdx+1).split(',').map(c => c.trim().replace(/\s/g, '')).filter(c => c).forEach(cls => {
                                                const otherT = teachers.find(x => x.id === id);
                                                others[`${sub}:${cls}`] = otherT ? otherT.name : "GV khác";
                                            });
                                        }
                                    });
                                });

                                return (
                                    <tr key={t.id} className="hover:bg-slate-50/40 transition-all group">
                                        <td className="p-5">
                                            <div className="font-black text-slate-800 text-base leading-none mb-1.5">{t.name}</div>
                                            <div className="flex flex-wrap gap-1.5">{(t.roles || []).map((r: string) => <span key={r} className="text-[9px] font-black bg-blue-50 text-blue-500 px-2 py-1 rounded-md border border-blue-100 uppercase tracking-tighter">{r}</span>)}</div>
                                        </td>
                                        <td className="p-5">
                                            <LocalAssignmentInput value={assignment} onSave={(v: string) => saveAssignment(t.id, v)} existingAssignments={others} />
                                        </td>
                                        <td className="p-5 text-center font-black text-slate-800 text-xl tracking-tighter">{tkb.toFixed(1)}</td>
                                        <td className="p-5">
                                            <LocalNumericInput value={log.bu} onChange={(val: number) => updateWeekData(currentWeek, { logs: { ...logs, [t.id]: { ...log, bu: val } } })} className="w-16 mx-auto block text-center p-2.5 bg-orange-50 border-2 border-orange-100 rounded-xl font-black text-orange-700 outline-none text-sm shadow-inner"/>
                                        </td>
                                        <td className="p-5">
                                            <LocalNumericInput value={log.tang} onChange={(val: number) => updateWeekData(currentWeek, { logs: { ...logs, [t.id]: { ...log, tang: val } } })} className="w-16 mx-auto block text-center p-2.5 bg-orange-50 border-2 border-orange-100 rounded-xl font-black text-orange-700 outline-none text-sm shadow-inner"/>
                                        </td>
                                        <td className="p-5 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => { if(confirm(`Xóa ${t.name}?`)) updateWeekData(currentWeek, { teachers: teachers.filter((x: any) => x.id !== t.id) }); }} className="text-slate-200 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={20}/></button>
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
                    <div className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-3 px-3">
                            <label className="text-[10px] font-black uppercase text-slate-400 italic tracking-widest">Từ tuần</label>
                            <input type="number" min="1" value={startRange} onChange={e => setStartRange(parseInt(e.target.value) || 1)} className="w-14 p-2 bg-slate-50 rounded-xl font-black text-center text-sm text-blue-600 border-none outline-none"/>
                        </div>
                        <ChevronRight className="text-slate-200" size={20} />
                        <div className="flex items-center gap-3 px-3">
                            <label className="text-[10px] font-black uppercase text-slate-400 italic tracking-widest">Đến tuần</label>
                            <input type="number" min={startRange} value={endRange || 1} onChange={e => setEndRange(parseInt(e.target.value) || 1)} className="w-14 p-2 bg-slate-50 rounded-xl font-black text-center text-sm text-blue-600 border-none outline-none"/>
                        </div>
                    </div>
                    <div className="text-right">
                        <h2 className="text-xl font-black text-slate-700 uppercase italic tracking-tight mb-1">Thống kê lũy kế thực dạy</h2>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none">Dữ liệu tổng hợp từ các tuần đã chọn</p>
                    </div>
                </div>
                <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-xl overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400 tracking-widest">
                            <tr>
                                <th className="p-6">Họ tên giáo viên</th>
                                <th className="p-6 text-center">Tổng Tiết TKB</th>
                                <th className="p-6 text-center text-orange-600">Tổng dạy bù</th>
                                <th className="p-6 text-center text-orange-600">Tổng tăng tiết</th>
                                <th className="p-6 text-center bg-blue-50/50 text-blue-700">Thực dạy</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {stats.map((s: any, i: number) => (
                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-5 font-black text-slate-700 text-base">{s.name}</td>
                                    <td className="p-5 text-center font-black text-slate-400 text-lg tracking-tight">{s.tkb.toFixed(1)}</td>
                                    <td className="p-5 text-center font-black text-orange-600 text-lg tracking-tight">{s.bu.toFixed(1)}</td>
                                    <td className="p-5 text-center font-black text-orange-600 text-lg tracking-tight">{s.tang.toFixed(1)}</td>
                                    <td className="p-5 text-center bg-blue-50/20 font-black text-blue-700 text-3xl tracking-tighter">{(s.tkb + s.bu + s.tang).toFixed(1)}</td>
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
        const [repRange, setRepRange] = useState({ s: startRange, e: endRange });
        const backupFileRef = useRef<HTMLInputElement>(null);
        useEffect(() => { setRepRange({ s: startRange, e: endRange }); }, [startRange, endRange]);

        const GRADES = ['Khối 6', 'Khối 7', 'Khối 8', 'Khối 9', 'Khác'];

        const teacherStats = useMemo(() => {
            const map: Record<string, any> = {};
            const numWeeks = (repRange.e - repRange.s + 1);
            if (numWeeks <= 0) return [];
            for (let w = repRange.s; w <= repRange.e; w++) {
                const rec = data.weeklyRecords[w]; if (!rec) continue;
                rec.teachers.forEach((t: any) => {
                    const k = t.name.trim().toUpperCase();
                    if (!map[k]) map[k] = { name: t.name, quotaPerW: 0, actual: 0, extra: 0, roles: t.roles };
                    map[k].quotaPerW = Math.max(0, data.standardQuota - getTeacherReduction(t.roles));
                    const log = rec.logs?.[t.id] || { bu: 0, tang: 0 };
                    map[k].actual += (log.actual !== undefined ? log.actual : getTKBPeriods(rec.assignments[t.id] || ""));
                    map[k].extra += (log.bu || 0) + (log.tang || 0);
                });
            }
            return Object.values(map).map((s: any) => ({
                ...s,
                progQuota: s.quotaPerW * numWeeks,
                total: s.actual + s.extra,
                bal: (s.actual + s.extra) - (s.quotaPerW * numWeeks)
            })).sort((a,b) => a.name.localeCompare(b.name));
        }, [data, repRange]);

        const subjectGradeMatrix = useMemo(() => {
            const matrix: Record<string, Record<string, number>> = {};
            data.subjectConfigs.forEach(s => {
                matrix[s.name] = {};
                GRADES.forEach(g => matrix[s.name][g] = 0);
            });

            for (let w = repRange.s; w <= repRange.e; w++) {
                const rec = data.weeklyRecords[w]; if (!rec) continue;
                Object.entries(rec.assignments).forEach(([tid, str]: any) => {
                    (str || "").split(';').forEach((p:any) => {
                        const [sub, clsPart] = p.split(':');
                        if (sub && clsPart && matrix[sub.trim()]) {
                            const clsList = clsPart.split(',').map((c:any) => c.trim().toUpperCase()).filter((c:any) => c);
                            clsList.forEach((c:any) => {
                                const gMatch = c.match(/^[6-9]/);
                                const gKey = gMatch ? `Khối ${gMatch[0]}` : 'Khác';
                                const conf = data.subjectConfigs.find(x => x.name === sub.trim());
                                if (conf) {
                                    const gradeVal = gMatch ? Number(conf[`p${gMatch[0]}`] || 0) : 0;
                                    matrix[sub.trim()][gKey] += gradeVal;
                                }
                            });
                        }
                    });
                });
            }
            return Object.entries(matrix).map(([name, gradeData]) => ({
                name, gradeData, rowTotal: Object.values(gradeData).reduce((a, b) => a + b, 0)
            })).filter(x => x.rowTotal > 0).sort((a, b) => b.rowTotal - a.rowTotal);
        }, [data, repRange]);

        const colTotals = useMemo(() => {
            const totals: Record<string, number> = {};
            GRADES.forEach(g => totals[g] = 0);
            subjectGradeMatrix.forEach(row => GRADES.forEach(g => totals[g] += row.gradeData[g]));
            return { grades: totals, grandTotal: Object.values(totals).reduce((a, b) => a + b, 0) };
        }, [subjectGradeMatrix]);

        const kpis = useMemo(() => {
            return teacherStats.reduce((acc, t) => ({
                actual: acc.actual + t.total,
                surplus: acc.surplus + (t.bal > 0 ? t.bal : 0),
                deficit: acc.deficit + (t.bal < 0 ? Math.abs(t.bal) : 0)
            }), { actual: 0, surplus: 0, deficit: 0 });
        }, [teacherStats]);

        const subjStats = useMemo(() => {
            const map: Record<string, { total: number; grades: Record<string, number> }> = {};
            data.subjectConfigs.forEach(s => map[s.name] = { total: 0, grades: {'6':0,'7':0,'8':0,'9':0} });
            const lastData = data.weeklyRecords[repRange.e] || { assignments: {} };
            Object.values(lastData.assignments).forEach((str: any) => {
                str.split(';').forEach((p:any) => {
                    const [sub, clsPart] = p.split(':');
                    if (sub && clsPart && map[sub.trim()]) {
                        clsPart.split(',').forEach((c:any) => {
                            const g = c.trim().match(/^[6-9]/)?.[0];
                            if (g) map[sub.trim()].grades[g]++;
                        });
                    }
                });
            });
            for (let w = repRange.s; w <= repRange.e; w++) {
                const rec = data.weeklyRecords[w]; if (!rec) continue;
                Object.entries(rec.assignments).forEach(([tid, str]: any) => {
                    str.split(';').forEach((p:any) => {
                        const [sub, cls] = p.split(':');
                        if (sub && cls && map[sub.trim()]) {
                            cls.split(',').forEach((c:any) => {
                                const g = c.trim().match(/^[6-9]/)?.[0];
                                const conf = data.subjectConfigs.find(x => x.name === sub.trim());
                                if (g && conf) map[sub.trim()].total += conf[`p${g}`];
                            });
                        }
                    });
                });
            }
            return data.subjectConfigs.map(s => {
                const m = map[s.name];
                let yrQ = 0; Object.entries(m.grades).forEach(([g, count]) => yrQ += count * s[`p${g}`] * 35);
                return { name: s.name, yrQ, total: m.total, pct: yrQ > 0 ? (m.total / yrQ) * 100 : 0 };
            }).filter(x => x.yrQ > 0);
        }, [data, repRange]);

        const handleExportDetailedReport = () => {
            // @ts-ignore
            const wb = XLSX.utils.book_new();
            
            // Sheet 1: Ma trận môn học
            const matrixHeaders = ["Môn học", ...GRADES, "Tổng cộng"];
            const matrixRows = subjectGradeMatrix.map(row => [
                row.name,
                ...GRADES.map(g => row.gradeData[g]),
                row.rowTotal
            ]);
            matrixRows.push(["TỔNG CỘNG", ...GRADES.map(g => colTotals.grades[g]), colTotals.grandTotal]);
            // @ts-ignore
            const wsMatrix = XLSX.utils.aoa_to_sheet([[`BÁO CÁO THỐNG KÊ MÔN HỌC - KHỐI LỚP (TUẦN ${repRange.s} - ${repRange.e})`], [], matrixHeaders, ...matrixRows]);
            // @ts-ignore
            XLSX.utils.book_append_sheet(wb, wsMatrix, "Thong_Ke_Mon_Hoc");

            // Sheet 2: Chi tiết giáo viên
            const teacherHeaders = ["Họ tên Giáo viên", "Định mức tích lũy", "Thực dạy tích lũy", "Chênh lệch (Thừa/Thiếu)", "Ghi chú"];
            const tRows = teacherStats.map(s => [
                s.name,
                s.progQuota,
                s.total,
                s.bal,
                s.bal > 0 ? "Thừa tiết" : s.bal < 0 ? "Thiếu tiết" : "Đủ định mức"
            ]);
            // @ts-ignore
            const wsTeachers = XLSX.utils.aoa_to_sheet([[`CHI TIẾT ĐỊNH MỨC GIÁO VIÊN (TUẦN ${repRange.s} - ${repRange.e})`], [], teacherHeaders, ...tRows]);
            // @ts-ignore
            XLSX.utils.book_append_sheet(wb, wsTeachers, "Chi_Tiet_Giao_Vien");

            // @ts-ignore
            XLSX.writeFile(wb, `Bao_Cao_Giang_Day_Tuan_${repRange.s}_den_${repRange.e}.xlsx`);
        };

        return (
            <div className="p-8 animate-fadeIn space-y-8">
                <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3 bg-white p-2.5 rounded-2xl border border-slate-100 shadow-sm">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 italic">Khoảng báo cáo:</span>
                        <input type="number" value={repRange.s} onChange={e => setRepRange({...repRange, s: parseInt(e.target.value)||1})} className="w-14 p-2 bg-slate-50 rounded-xl text-center font-black text-blue-600 border-none text-sm"/>
                        <span className="text-slate-300">→</span>
                        <input type="number" value={repRange.e} onChange={e => setRepRange({...repRange, e: parseInt(e.target.value)||1})} className="w-14 p-2 bg-slate-50 rounded-xl text-center font-black text-blue-600 border-none text-sm"/>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center lg:justify-end">
                        <button onClick={handleExportDetailedReport} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-black hover:bg-blue-700 transition-all text-[11px] uppercase tracking-widest shadow-lg"><FileDown size={18}/> Xuất Báo cáo chi tiết</button>
                        <button onClick={() => {
                            const masterH = ["TUẦN", "Tên GV", "Chức vụ", "Phân công", "Dạy bù", "Tăng tiết"];
                            const masterR: any[] = [];
                            Object.entries(data.weeklyRecords).forEach(([week, rec]: any) => {
                                rec.teachers.forEach((t: any) => {
                                    masterR.push([ week, t.name, (t.roles || []).join(', '), rec.assignments[t.id] || "", rec.logs?.[t.id]?.bu || 0, rec.logs?.[t.id]?.tang || 0 ]);
                                });
                            });
                            // @ts-ignore
                            const wsMaster = XLSX.utils.aoa_to_sheet([["MASTER_DATA_THCS_PRO_v8.7"], masterH, ...masterR]);
                            const confH = [["CẤU HÌNH HỆ THỐNG"], ["Định mức chuẩn", data.standardQuota], [], ["Môn học", "Khối 6", "Khối 7", "Khối 8", "Khối 9"]];
                            const subjR = data.subjectConfigs.map((s:any) => [s.name, s.p6, s.p7, s.p8, s.p9]);
                            // @ts-ignore
                            const wsConf = XLSX.utils.aoa_to_sheet([...confH, ...subjR]);
                            // @ts-ignore
                            const wb = XLSX.utils.book_new(); 
                            // @ts-ignore
                            XLSX.utils.book_append_sheet(wb, wsConf, "Cau_Hinh"); 
                            // @ts-ignore
                            XLSX.utils.book_append_sheet(wb, wsMaster, "DATA_MASTER_RECOVER");
                            // @ts-ignore
                            XLSX.writeFile(wb, `Sao_Luu_HT_THCS_v8.7.xlsx`);
                        }} className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 font-black hover:bg-emerald-700 transition-all text-[11px] uppercase tracking-widest shadow-lg"><TableProperties size={16}/> Sao lưu Hệ thống</button>
                        <button onClick={() => backupFileRef.current?.click()} className="bg-slate-50 text-slate-500 px-4 py-2.5 rounded-xl flex items-center gap-2 font-black hover:bg-slate-100 transition-all text-[11px] uppercase tracking-widest border border-slate-200"><Upload size={16}/> Khôi phục</button>
                        <input type="file" ref={backupFileRef} className="hidden" accept=".json,.xlsx,.xls" onChange={(e) => {
                            const file = e.target.files?.[0]; if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (evt) => {
                                try {
                                    // @ts-ignore
                                    const wb = XLSX.read(evt.target?.result, {type: 'binary'});
                                    const wsMaster = wb.Sheets["DATA_MASTER_RECOVER"];
                                    const wsConf = wb.Sheets["Cau_Hinh"];
                                    if (!wsMaster) return alert("File Excel này không chứa dữ liệu khôi phục hợp lệ.");
                                    // @ts-ignore
                                    const masterRows = XLSX.utils.sheet_to_json(wsMaster, {range: 1});
                                    // @ts-ignore
                                    const confRows = XLSX.utils.sheet_to_json(wsConf, {range: 3, header: ["name", "p6", "p7", "p8", "p9"]});
                                    // @ts-ignore
                                    const stdQuota = wsConf["B2"]?.v || 19;
                                    const newWeekly: Record<number, any> = {};
                                    masterRows.forEach((row: any) => {
                                        const w = parseInt(row["TUẦN"]);
                                        if (!newWeekly[w]) newWeekly[w] = { teachers: [], assignments: {}, logs: {} };
                                        const tId = Date.now().toString() + Math.random();
                                        newWeekly[w].teachers.push({ id: tId, name: row["Tên GV"], roles: (row["Chức vụ"] || "").split(",").map((s:any)=>s.trim()).filter((s:any)=>s) });
                                        newWeekly[w].assignments[tId] = row["Phân công"] || "";
                                        newWeekly[w].logs[tId] = { bu: row["Dạy bù"] || 0, tang: row["Tăng tiết"] || 0 };
                                    });
                                    if (confirm(`Khôi phục dữ liệu từ ${Object.keys(newWeekly).length} tuần?`)) {
                                        setData({ standardQuota: stdQuota, roles: DEFAULT_ROLES, subjectConfigs: confRows.filter((r:any) => r.name), weeklyRecords: newWeekly });
                                        alert("Khôi phục thành công!");
                                    }
                                } catch (err) { alert("Lỗi xử lý file."); }
                            };
                            reader.readAsBinaryString(file);
                        }}/>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm border-l-8 border-l-blue-600">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl w-fit mb-4"><TrendingUp className="w-6 h-6" /></div>
                        <div className="text-3xl font-black text-slate-800 tracking-tighter">{kpis.actual.toFixed(1)}</div>
                        <div className="text-[10px] text-slate-400 font-black uppercase mt-1 tracking-widest">Tiết thực dạy</div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm border-l-8 border-l-emerald-500">
                        <div className="p-3 bg-emerald-50 text-emerald-500 rounded-2xl w-fit mb-4"><CheckCircle2 className="w-6 h-6" /></div>
                        <div className="text-3xl font-black text-emerald-600 tracking-tighter">+{kpis.surplus.toFixed(1)}</div>
                        <div className="text-[10px] text-slate-400 font-black uppercase mt-1 tracking-widest">Dôi dư (Thừa)</div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm border-l-8 border-l-red-500">
                        <div className="p-3 bg-red-50 text-red-600 rounded-2xl w-fit mb-4"><AlertTriangle className="w-6 h-6" /></div>
                        <div className="text-3xl font-black text-red-600 tracking-tighter">-{kpis.deficit.toFixed(1)}</div>
                        <div className="text-[10px] text-slate-400 font-black uppercase mt-1 tracking-widest">Thiếu hụt</div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm border-l-8 border-l-indigo-600">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl w-fit mb-4"><Users className="w-6 h-6" /></div>
                        <div className="text-3xl font-black text-slate-800 tracking-tighter">{teacherStats.length}</div>
                        <div className="text-[10px] text-slate-400 font-black uppercase mt-1 tracking-widest">Giáo viên</div>
                    </div>
                </div>

                <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-xl overflow-hidden">
                    <div className="p-6 border-b flex items-center gap-3 bg-slate-50/50">
                        <BookOpen className="w-6 h-6 text-blue-600" />
                        <h3 className="font-black text-slate-700 uppercase text-xs tracking-widest italic">Ma trận Thống kê Môn học x Khối lớp</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                <tr>
                                    <th className="p-5 border-r border-slate-100">Môn học</th>
                                    {GRADES.map(g => <th key={g} className="p-5 text-center">{g}</th>)}
                                    <th className="p-5 text-center bg-blue-600 text-white">Tổng cộng</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {subjectGradeMatrix.map((row, i) => (
                                    <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                                        <td className="p-4 font-black text-slate-700 border-r border-slate-100">{row.name}</td>
                                        {GRADES.map(g => (
                                            <td key={g} className="p-4 text-center text-slate-600 font-black">
                                                {row.gradeData[g] > 0 ? row.gradeData[g].toFixed(1) : '-'}
                                            </td>
                                        ))}
                                        <td className="p-4 text-center font-black text-blue-800 bg-blue-50/50">{row.rowTotal.toFixed(1)}</td>
                                    </tr>
                                ))}
                                <tr className="bg-slate-800 text-white font-black uppercase text-[11px]">
                                    <td className="p-6 tracking-widest border-r border-white/10">Tổng toàn trường</td>
                                    {GRADES.map(g => <td key={g} className="p-6 text-center text-blue-300">{colTotals.grades[g].toFixed(1)}</td>)}
                                    <td className="p-6 text-center bg-blue-600 text-2xl font-black tracking-tighter">
                                        {colTotals.grandTotal.toFixed(1)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    <div className="xl:col-span-2 space-y-8">
                        <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-xl overflow-hidden overflow-x-auto">
                            <table className="w-full text-left min-w-[800px]">
                                <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                    <tr>
                                        <th className="p-5 w-10 text-center">STT</th>
                                        <th className="p-5">Họ tên Giáo viên</th>
                                        <th className="p-5 text-center">Định mức TL</th>
                                        <th className="p-5 text-center">Tích lũy</th>
                                        <th className="p-5 text-center text-blue-600">Thừa/Thiếu</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {teacherStats.map((s: any, i: number) => (
                                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="p-4 text-center text-slate-300 font-black text-sm">{i+1}</td>
                                            <td className="p-4 font-black text-slate-700 text-base">{s.name}</td>
                                            <td className="p-4 text-center text-slate-400 font-black text-base">{s.progQuota.toFixed(1)}</td>
                                            <td className="p-4 text-center text-slate-800 font-black text-base">{s.total.toFixed(1)}</td>
                                            <td className={`p-4 text-center text-xl font-black tracking-tighter ${s.bal >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                {s.bal > 0 ? `+${s.bal.toFixed(1)}` : s.bal.toFixed(1)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-xl p-6 space-y-6">
                        <h3 className="font-black text-slate-400 uppercase text-[10px] tracking-widest border-b pb-4 italic">Tiến độ 35 Tuần (Năm học)</h3>
                        <div className="space-y-4">
                            {subjStats.map((s: any, i: number) => (
                                <div key={i} className="space-y-1.5">
                                    <div className="flex justify-between items-end">
                                        <div className="font-black text-slate-700 text-xs">{s.name}</div>
                                        <div className="text-[10px] font-black text-blue-500">{s.total.toFixed(1)} / {s.yrQ.toFixed(0)} tiết</div>
                                    </div>
                                    <div className="h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100 shadow-inner">
                                        <div className="h-full bg-blue-500 transition-all duration-1000 ease-out" style={{ width: `${Math.min(100, s.pct)}%` }}></div>
                                    </div>
                                    <div className="text-[9px] font-black text-slate-300 uppercase text-right leading-none tracking-tighter">Hoàn thành {s.pct.toFixed(1)}%</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const ConfigTab = () => {
        const [newS, setNewS] = useState('');
        return (
            <div className="p-8 animate-fadeIn">
                <h2 className="text-lg font-black mb-8 text-slate-700 uppercase italic tracking-tight">Cài đặt quy chuẩn định mức chuyên môn</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="space-y-8">
                        <div className="bg-slate-50 p-10 rounded-[2rem] border border-slate-100 shadow-inner">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 italic">Định mức chuẩn (19 tiết)</label>
                            <input type="number" value={data.standardQuota} onChange={e => updateData({standardQuota: parseFloat(e.target.value) || 0})} className="text-8xl font-black text-blue-600 bg-transparent outline-none w-full tracking-tighter"/>
                        </div>
                        <div className="bg-blue-600 p-8 rounded-[2rem] text-white shadow-2xl relative overflow-hidden group">
                            <h3 className="font-black uppercase text-[10px] mb-6 tracking-widest leading-none">Thêm môn học mới</h3>
                            <div className="flex gap-4">
                                <input type="text" placeholder="Tên môn..." value={newS} onChange={e => setNewS(e.target.value)} className="flex-1 p-4 rounded-xl bg-white/10 border-none text-white font-black outline-none text-base placeholder-white/30"/>
                                <button onClick={() => { if(!newS.trim()) return; updateData({ subjectConfigs: [...data.subjectConfigs, { name: newS.trim(), p6: 1, p7: 1, p8: 1, p9: 1 }] }); setNewS(''); }} className="bg-white text-blue-600 px-8 py-4 rounded-xl font-black uppercase text-[11px] hover:bg-blue-50 transition-all shadow-xl">Thêm</button>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 max-h-[550px] overflow-y-auto no-scrollbar shadow-inner">
                        <h3 className="font-black text-slate-400 uppercase text-[10px] mb-6 tracking-widest italic">Số tiết môn theo khối</h3>
                        <div className="space-y-4">
                            {data.subjectConfigs.map((s: any, i: number) => (
                                <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 group transition-all hover:border-blue-100 hover:shadow-md">
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="font-black text-slate-700 text-sm italic">{s.name}</div>
                                        <button onClick={() => updateData({ subjectConfigs: data.subjectConfigs.filter((x:any)=>x.name !== s.name) })} className="text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><X size={18}/></button>
                                    </div>
                                    <div className="grid grid-cols-4 gap-3">
                                        {['6', '7', '8', '9'].map(g => (
                                            <div key={g} className="text-center">
                                                <label className="text-[9px] font-black text-slate-300 uppercase mb-1 block">Khối {g}</label>
                                                <input type="number" step="0.5" value={s[`p${g}`]} onChange={e => { const nc = [...data.subjectConfigs]; nc[i][`p${g}`] = parseFloat(e.target.value) || 0; updateData({subjectConfigs: nc}); }} className="w-full p-2 bg-slate-50 rounded-lg text-center font-black text-blue-500 text-xs border-none outline-none focus:ring-2 focus:ring-blue-100 transition-all shadow-inner"/>
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
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 overflow-x-hidden selection:bg-blue-100 selection:text-blue-800">
            <header className="bg-white border-b border-slate-100 p-3 sticky top-0 z-50 shadow-sm">
                <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-3">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 p-2 rounded-lg text-white shadow-lg rotate-2"><LayoutDashboard size={20}/></div>
                        <div>
                            <h1 className="font-black text-lg tracking-tighter text-slate-800 uppercase italic leading-none">THCS GIẢNG DẠY <span className="text-blue-600 text-[10px] align-top font-black italic">PRO v8.7</span></h1>
                            <p className="text-[9px] font-bold uppercase text-slate-400 tracking-[0.2em] mt-1 italic leading-none">Professional System</p>
                        </div>
                    </div>
                    <nav className="flex gap-1 bg-slate-100 p-1 rounded-xl shadow-inner">
                        {[
                            {id: 'config', icon: Settings, label: 'Cài đặt'},
                            {id: 'teachers', icon: Users, label: 'Phân công'},
                            {id: 'weekly', icon: CalendarDays, label: 'Thực dạy'},
                            {id: 'reports', icon: FileText, label: 'Báo cáo'},
                        ].map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black transition-all whitespace-nowrap uppercase tracking-widest ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-sm scale-105' : 'text-slate-400 hover:text-slate-600'}`}>
                                <tab.icon size={16}/> {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>
            </header>
            <main className="container mx-auto p-4 md:p-8 flex-1">
                <div className="bg-white rounded-[2.5rem] shadow-2xl border border-white min-h-[700px] overflow-hidden relative">
                    {activeTab === 'config' && <ConfigTab />}
                    {activeTab === 'teachers' && <TeacherTab />}
                    {activeTab === 'weekly' && <WeeklyTab />}
                    {activeTab === 'reports' && <ReportTab />}
                </div>
            </main>
            <footer className="p-6 text-center text-[10px] font-black uppercase text-slate-300 tracking-[0.5em] italic flex items-center justify-center gap-3">
                <CheckCircle2 size={14}/> Professional • v8.7
            </footer>
        </div>
    );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
