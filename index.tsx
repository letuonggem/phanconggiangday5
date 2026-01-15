
import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { 
    LayoutDashboard, Users, CalendarDays, FileText, Settings, 
    Trash2, ChevronLeft, ChevronRight, ChevronDown,
    Plus, FileUp, Edit3, Check,
    AlertTriangle, Copy, RefreshCcw, FileDown, PlusCircle, Book, Info, CheckCircle2, X, Square, CheckSquare, Search, FileSpreadsheet,
    Download, Upload, Database, Save, TableProperties, FileJson, FileType
} from 'lucide-react';

// --- CẤU HÌNH HỆ THỐNG ---
const STORAGE_KEY = 'thcs_teaching_mgmt_v8_4_pro';

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
        const normalized = local.replace(/\s+/g, ' ').toUpperCase().trim();
        if (!normalized) { onSave(""); return; }
        
        const parts = normalized.split(';');
        const allNewClasses: string[] = [];
        for (let part of parts) {
            const colonIdx = part.indexOf(':');
            if (colonIdx !== -1) {
                const clsPart = part.substring(colonIdx + 1);
                const classes = clsPart.split(',').map(c => c.trim().replace(/\s/g, '')).filter(c => c);
                for (let cls of classes) {
                    if (!isValidClassName(cls)) {
                        alert(`Lỗi: Lớp "${cls}" sai định dạng khối 6-9.`);
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
            className="w-full p-4 rounded-2xl border-none font-bold text-base shadow-inner bg-slate-50 text-slate-700 focus:ring-2 focus:ring-blue-100 transition-all"
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
                    if (cIdx !== -1) p.substring(cIdx + 1).split(',').map(c => c.trim().replace(/\s/g, '')).filter(c => c).forEach(cls => {
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

        const toggleRole = (e: React.MouseEvent, roleName: string) => {
            e.stopPropagation();
            setNewTeacherRoles(prev => prev.includes(roleName) ? prev.filter(r => r !== roleName) : [...prev, roleName]);
            setShowRoleDropdown(false);
        };

        return (
            <div className="p-10 animate-fadeIn">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-14">
                    <div className="flex items-center gap-4 bg-white border border-slate-200 p-4 rounded-3xl shadow-sm">
                        <button onClick={() => { setCurrentWeek(Math.max(1, currentWeek-1)); setSelectedIds([]); setIsCopying(false); }} className="p-3 hover:bg-slate-100 rounded-2xl transition-colors text-slate-400"><ChevronLeft size={28}/></button>
                        <div className="px-10 text-center border-x border-slate-100">
                            <div className="text-sm font-black text-blue-500 uppercase tracking-[0.2em] leading-none mb-2">Tuần học</div>
                            <div className="text-4xl font-black text-slate-800 tracking-tighter">{currentWeek}</div>
                        </div>
                        <button onClick={() => { setCurrentWeek(currentWeek+1); setSelectedIds([]); setIsCopying(false); }} className="p-3 hover:bg-slate-100 rounded-2xl transition-colors text-slate-400"><ChevronRight size={28}/></button>
                    </div>
                    <div className="flex flex-wrap gap-4">
                        <button onClick={() => { setIsCopying(!isCopying); setIsAdding(false); }} className={`px-6 py-4 rounded-2xl flex items-center gap-2.5 font-black transition-all text-xs uppercase tracking-widest border-2 ${isCopying ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl' : 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100'}`}><Copy size={20}/> Copy tuần cũ</button>
                        <button onClick={() => { setIsAdding(!isAdding); setIsCopying(false); setNewTeacherRoles([]); }} className="bg-blue-600 text-white px-8 py-4 rounded-2xl flex items-center gap-2.5 font-black shadow-2xl hover:bg-blue-700 transition-all text-xs uppercase tracking-widest hover:scale-105">{isAdding ? 'Đóng bảng thêm' : 'Thêm giáo viên'}</button>
                    </div>
                </div>

                {isAdding && (
                    <div className="mb-14 bg-white border-4 border-blue-50 p-12 rounded-[3rem] animate-fadeIn shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-3 h-full bg-blue-600"></div>
                        <h3 className="text-lg font-black text-slate-700 uppercase tracking-widest mb-10 flex items-center gap-4 italic"><PlusCircle size={24} className="text-blue-600"/> Nhập thông tin phân công</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
                            <div className="space-y-3">
                                <label className="text-xs font-black text-slate-400 ml-1 uppercase">Họ tên giáo viên</label>
                                <input type="text" placeholder="VÍ DỤ: NGUYỄN VĂN A" className="w-full p-5 rounded-2xl bg-slate-50 border-none outline-none font-black shadow-inner text-xl uppercase" id="new-name"/>
                            </div>
                            <div className="space-y-3">
                                <label className="text-xs font-black text-slate-400 ml-1 uppercase">Môn giảng dạy</label>
                                <select className="w-full p-5 rounded-2xl bg-slate-50 border-none outline-none font-black shadow-inner text-xl" id="new-sub">
                                    <option value="">Chọn môn...</option>
                                    {data.subjectConfigs.map((s: any) => <option key={s.name} value={s.name}>{s.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-3">
                                <label className="text-xs font-black text-slate-400 ml-1 uppercase">Lớp dạy (vd: 6A, 7B)</label>
                                <input type="text" placeholder="CÁCH NHAU DẤU PHẨY" className="w-full p-5 rounded-2xl bg-slate-50 border-none outline-none font-black shadow-inner text-xl uppercase" id="new-cls"/>
                            </div>
                            <div className="space-y-3 relative">
                                <label className="text-xs font-black text-slate-400 ml-1 uppercase">Kiêm nhiệm</label>
                                <div onClick={() => setShowRoleDropdown(!showRoleDropdown)} className="w-full p-5 bg-slate-50 rounded-2xl font-black text-slate-600 text-sm flex justify-between items-center cursor-pointer shadow-inner">
                                    <span className="truncate">{newTeacherRoles.length > 0 ? newTeacherRoles.join(', ') : 'Chưa chọn...'}</span>
                                    <ChevronDown size={24} className="text-blue-500" />
                                </div>
                                {showRoleDropdown && (
                                    <div className="absolute top-[105%] left-0 w-full mt-3 bg-white rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.2)] border border-slate-100 z-50 p-5 max-h-80 overflow-y-auto">
                                        {data.roles.map((r: any) => (
                                            <div key={r.id} onClick={(e) => toggleRole(e, r.name)} className="p-4 rounded-2xl mb-2 cursor-pointer flex items-center justify-between hover:bg-blue-50 transition-colors">
                                                <span className="font-black text-sm">{r.name}</span>
                                                {newTeacherRoles.includes(r.name) && <Check size={22} className="text-blue-600" />}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-end mt-12">
                            <button onClick={() => {
                                const nV = (document.getElementById('new-name') as HTMLInputElement).value.trim().toUpperCase();
                                const sV = (document.getElementById('new-sub') as HTMLSelectElement).value;
                                const cV = (document.getElementById('new-cls') as HTMLInputElement).value.replace(/\s/g, '').toUpperCase().trim();
                                if (!nV || !sV || !cV) return alert("Vui lòng nhập đủ thông tin!");
                                const clsList = cV.split(',').filter(c => c);
                                for (let c of clsList) {
                                    if(!isValidClassName(c)) return alert(`Lớp ${c} sai định dạng.`);
                                    if(classToTeacherMap[c]) return alert(`Lớp ${c} đã được giao cho ${classToTeacherMap[c]}!`);
                                }
                                const tId = Date.now().toString();
                                updateWeekData(currentWeek, {
                                    teachers: [{ id: tId, name: nV, roles: [...newTeacherRoles] }, ...teachers],
                                    assignments: { ...assignments, [tId]: `${sV}: ${clsList.join(', ')}` }
                                });
                                setIsAdding(false);
                            }} className="bg-blue-600 text-white px-14 py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl hover:bg-blue-700 transition-all hover:scale-[1.03]">Lưu thông tin chuyên môn</button>
                        </div>
                    </div>
                )}

                {isCopying && prevWeekData.teachers.length > 0 && (
                    <div className="mb-14 bg-indigo-50 border-2 border-indigo-100 p-12 rounded-[3rem] animate-fadeIn shadow-lg">
                        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-6">
                            <h4 className="font-black text-indigo-800 text-base flex items-center gap-4 uppercase tracking-widest"><Info size={28}/> Chọn giáo viên từ tuần {currentWeek-1}:</h4>
                            <div className="flex gap-4">
                                <button onClick={() => setSelectedIds(prevWeekData.teachers.filter((t:any) => !teachers.some((ct:any) => ct.id === t.id)).map((x:any)=>x.id))} className="px-6 py-3 bg-white text-indigo-600 rounded-xl text-xs font-black uppercase border border-indigo-200 hover:shadow-md transition-all">Chọn tất cả</button>
                                <button onClick={copySelectedFromPrevious} disabled={selectedIds.length === 0} className={`px-10 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${selectedIds.length > 0 ? 'bg-indigo-600 text-white shadow-xl scale-105' : 'bg-slate-200 text-slate-400'}`}>Sao chép {selectedIds.length > 0 ? selectedIds.length : ''} GV</button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                            {prevWeekData.teachers.map((t:any) => {
                                const exists = teachers.some((ct:any) => ct.id === t.id);
                                return (
                                    <div key={t.id} onClick={() => !exists && setSelectedIds(prev => prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id])} className={`px-6 py-5 rounded-2xl cursor-pointer border-2 text-xs font-black transition-all flex items-center gap-4 ${exists ? 'bg-slate-100 border-slate-100 text-slate-300 cursor-not-allowed' : selectedIds.includes(t.id) ? 'bg-white border-indigo-500 text-indigo-600 shadow-xl scale-105' : 'bg-white/50 border-transparent opacity-70 hover:opacity-100 hover:bg-white'}`}>
                                        {exists ? <CheckCircle2 size={24}/> : selectedIds.includes(t.id) ? <CheckSquare size={24}/> : <Square size={24}/>} 
                                        <span className="truncate uppercase">{t.name}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden overflow-x-auto">
                    <table className="w-full text-left min-w-[1200px]">
                        <thead className="bg-slate-50 border-b text-xs font-black uppercase text-slate-400 tracking-[0.2em]">
                            <tr>
                                <th className="p-8">Giáo viên & Chức vụ</th>
                                <th className="p-8 w-1/3">Phân công TKB (Môn: Lớp)</th>
                                <th className="p-8 text-center">Tiết TKB</th>
                                <th className="p-8 text-center text-orange-600">Dạy bù</th>
                                <th className="p-8 text-center text-orange-600">Tăng tiết/BD</th>
                                <th className="p-8 text-right"></th>
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
                                        if (cIdx !== -1) p.substring(cIdx+1).split(',').map(c => c.trim()).filter(c => c).forEach(cls => {
                                            const otherT = teachers.find(x => x.id === id);
                                            others[cls] = otherT ? otherT.name : "GV khác";
                                        });
                                    });
                                });

                                return (
                                    <tr key={t.id} className="hover:bg-slate-50/40 transition-all group">
                                        <td className="p-8">
                                            <div className="font-black text-slate-800 text-xl uppercase tracking-tight leading-none mb-3">{t.name}</div>
                                            <div className="flex flex-wrap gap-2.5">{(t.roles || []).map((r: string) => <span key={r} className="text-[11px] font-black bg-blue-50 text-blue-500 px-3 py-1.5 rounded-xl border border-blue-100 uppercase tracking-tighter">{r}</span>)}</div>
                                        </td>
                                        <td className="p-8">
                                            <LocalAssignmentInput value={assignment} onSave={(v: string) => saveAssignment(t.id, v)} existingAssignments={others} />
                                        </td>
                                        <td className="p-8 text-center font-black text-slate-800 text-3xl tracking-tighter">{tkb.toFixed(1)}</td>
                                        <td className="p-8 text-center">
                                            <LocalNumericInput value={log.bu} onChange={(val: number) => updateWeekData(currentWeek, { logs: { ...logs, [t.id]: { ...log, bu: val } } })} className="w-24 mx-auto block text-center p-4 bg-orange-50 border-2 border-orange-100 rounded-[1.5rem] font-black text-orange-700 outline-none text-xl shadow-inner"/>
                                        </td>
                                        <td className="p-8 text-center">
                                            <LocalNumericInput value={log.tang} onChange={(val: number) => updateWeekData(currentWeek, { logs: { ...logs, [t.id]: { ...log, tang: val } } })} className="w-24 mx-auto block text-center p-4 bg-orange-50 border-2 border-orange-100 rounded-[1.5rem] font-black text-orange-700 outline-none text-xl shadow-inner"/>
                                        </td>
                                        <td className="p-8 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => { if(confirm(`Xóa ${t.name}?`)) updateWeekData(currentWeek, { teachers: teachers.filter((x: any) => x.id !== t.id) }); }} className="text-slate-200 hover:text-red-500 p-4 hover:bg-red-50 rounded-2xl transition-all"><Trash2 size={28}/></button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {teachers.length === 0 && <div className="py-40 text-center text-slate-300 italic font-black text-lg uppercase tracking-[0.3em]">Chưa có dữ liệu tuần {currentWeek}</div>}
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
            <div className="p-10 animate-fadeIn">
                <div className="flex flex-col lg:flex-row justify-between items-center mb-12 gap-10">
                    <div className="flex items-center gap-6 bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-5 px-5">
                            <label className="text-sm font-black uppercase text-slate-400 italic tracking-widest">Từ tuần</label>
                            <input type="number" min="1" value={startRange} onChange={e => setStartRange(parseInt(e.target.value) || 1)} className="w-20 p-4 bg-slate-50 rounded-2xl font-black text-center text-lg text-blue-600 border-none outline-none shadow-inner"/>
                        </div>
                        <ChevronRight className="text-slate-200" size={32} />
                        <div className="flex items-center gap-5 px-5">
                            <label className="text-sm font-black uppercase text-slate-400 italic tracking-widest">Đến tuần</label>
                            <input type="number" min={startRange} value={endRange} onChange={e => setEndRange(parseInt(e.target.value) || 1)} className="w-20 p-4 bg-slate-50 rounded-2xl font-black text-center text-lg text-blue-600 border-none outline-none shadow-inner"/>
                        </div>
                    </div>
                    <div className="text-right">
                        <h2 className="text-3xl font-black text-slate-700 uppercase italic tracking-tight leading-none mb-3">Thống kê lũy kế thực dạy</h2>
                        <p className="text-base text-slate-400 font-black uppercase tracking-[0.2em]">Dữ liệu tổng hợp từ các tuần đã chọn</p>
                    </div>
                </div>
                <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b text-xs font-black uppercase text-slate-400 tracking-[0.2em]">
                            <tr>
                                <th className="p-8">Họ tên giáo viên</th>
                                <th className="p-8 text-center">Tổng Tiết TKB</th>
                                <th className="p-8 text-center text-orange-600">Tổng dạy bù</th>
                                <th className="p-8 text-center text-orange-600">Tổng tăng tiết</th>
                                <th className="p-8 text-center bg-blue-50/50 text-blue-700">Tổng cộng thực dạy</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {stats.map((s: any, i: number) => (
                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-8 font-black text-slate-700 uppercase text-lg">{s.name}</td>
                                    <td className="p-8 text-center font-black text-slate-400 text-2xl tracking-tight">{s.tkb.toFixed(1)}</td>
                                    <td className="p-8 text-center font-black text-orange-600 text-2xl tracking-tight">{s.bu.toFixed(1)}</td>
                                    <td className="p-8 text-center font-black text-orange-600 text-2xl tracking-tight">{s.tang.toFixed(1)}</td>
                                    <td className="p-8 text-center bg-blue-50/20 font-black text-blue-700 text-5xl tracking-tighter">{(s.tkb + s.bu + s.tang).toFixed(1)}</td>
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

        const teacherStats = useMemo(() => {
            const map: Record<string, any> = {};
            const numWeeks = (repRange.e - repRange.s + 1);
            if (numWeeks <= 0) return [];
            for (let w = repRange.s; w <= repRange.e; w++) {
                const rec = data.weeklyRecords[w]; if (!rec) continue;
                rec.teachers.forEach((t: any) => {
                    const k = t.name.trim().toUpperCase();
                    if (!map[k]) map[k] = { name: t.name, quotaPerW: 0, actual: 0, extra: 0 };
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

        const handleExportSystemExcel = () => {
            // Sheet 1: Master Data (Dùng để khôi phục chính xác)
            const masterH = ["TUẦN", "Tên GV", "Chức vụ", "Phân công", "Dạy bù", "Tăng tiết"];
            const masterR: any[] = [];
            Object.entries(data.weeklyRecords).forEach(([week, rec]: any) => {
                rec.teachers.forEach((t: any) => {
                    masterR.push([
                        week, t.name, (t.roles || []).join(', '), rec.assignments[t.id] || "", 
                        rec.logs?.[t.id]?.bu || 0, rec.logs?.[t.id]?.tang || 0
                    ]);
                });
            });
            // @ts-ignore
            const wsMaster = XLSX.utils.aoa_to_sheet([["MASTER_DATA_THCS_PRO_v8.4"], masterH, ...masterR]);

            // Sheet 2: Cấu hình chuẩn
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
            XLSX.writeFile(wb, `Backup_TrangTinh_THCS_v8.4_${new Date().toLocaleDateString()}.xlsx`);
        };

        const handleRestoreFromFile = (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0]; if (!file) return;
            const reader = new FileReader();
            
            if (file.name.endsWith('.json')) {
                reader.onload = (evt) => {
                    try {
                        const parsed = JSON.parse(evt.target?.result as string);
                        if (parsed.standardQuota) { if(confirm("Ghi đè dữ liệu từ file JSON?")) setData(parsed); }
                    } catch (err) { alert("Lỗi đọc file JSON."); }
                };
                reader.readAsText(file);
            } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                reader.onload = (evt) => {
                    try {
                        // @ts-ignore
                        const wb = XLSX.read(evt.target?.result, {type: 'binary'});
                        const wsMaster = wb.Sheets["DATA_MASTER_RECOVER"];
                        const wsConf = wb.Sheets["Cau_Hinh"];
                        
                        if (!wsMaster) return alert("File Excel này không chứa Sheet phục hồi chuẩn của hệ thống.");
                        
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
                            newWeekly[w].teachers.push({ id: tId, name: row["Tên GV"].toUpperCase(), roles: (row["Chức vụ"] || "").split(",").map((s:any)=>s.trim()).filter((s:any)=>s) });
                            newWeekly[w].assignments[tId] = row["Phân công"] || "";
                            newWeekly[w].logs[tId] = { bu: row["Dạy bù"] || 0, tang: row["Tăng tiết"] || 0 };
                        });

                        if (confirm(`Tìm thấy dữ liệu từ ${Object.keys(newWeekly).length} tuần. Bạn có muốn khôi phục không?`)) {
                            setData({
                                standardQuota: stdQuota,
                                roles: DEFAULT_ROLES,
                                subjectConfigs: confRows.filter((r:any) => r.name),
                                weeklyRecords: newWeekly
                            });
                            alert("Khôi phục từ Excel thành công!");
                        }
                    } catch (err) { alert("Lỗi xử lý file Excel."); console.error(err); }
                };
                reader.readAsBinaryString(file);
            }
        };

        return (
            <div className="p-10 animate-fadeIn">
                <div className="flex flex-col lg:flex-row justify-between items-center mb-14 gap-8">
                    <div className="flex items-center gap-5 bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] ml-4 italic">Tiến độ báo cáo:</span>
                        <input type="number" value={repRange.s} onChange={e => setRepRange({...repRange, s: parseInt(e.target.value)||1})} className="w-16 p-3 bg-slate-50 rounded-2xl text-center font-black text-blue-600 border-none outline-none text-lg"/>
                        <span className="text-slate-300">→</span>
                        <input type="number" value={repRange.e} onChange={e => setRepRange({...repRange, e: parseInt(e.target.value)||1})} className="w-16 p-3 bg-slate-50 rounded-2xl text-center font-black text-blue-600 border-none outline-none text-lg"/>
                    </div>
                    <div className="flex flex-wrap gap-4 justify-center lg:justify-end">
                        <div className="flex gap-3 border-r border-slate-100 pr-5 mr-2">
                            <button onClick={handleExportSystemExcel} title="Sao lưu toàn hệ thống" className="bg-emerald-600 text-white px-6 py-4 rounded-2xl flex items-center gap-3 font-black hover:bg-emerald-700 transition-all text-xs uppercase tracking-widest shadow-2xl"><TableProperties size={22}/> Sao lưu Excel</button>
                            <button onClick={() => backupFileRef.current?.click()} title="Khôi phục dữ liệu" className="bg-slate-50 text-slate-500 px-6 py-4 rounded-2xl flex items-center gap-3 font-black hover:bg-slate-100 transition-all text-xs uppercase tracking-widest border-2 border-slate-200"><Upload size={22}/> Khôi phục</button>
                            <input type="file" ref={backupFileRef} className="hidden" accept=".json,.xlsx,.xls" onChange={handleRestoreFromFile}/>
                        </div>
                        <button onClick={() => {
                             const h = [["QUYẾT TOÁN GIÁO VIÊN"], [`Tuần ${repRange.s} - ${repRange.e}`], []];
                             const headers = ["STT", "Họ tên", "Định mức tiến độ", "Thực dạy", "Thừa/Thiếu"];
                             const r = teacherStats.map((s, i) => [i + 1, s.name, s.progQuota.toFixed(1), s.total.toFixed(1), s.bal.toFixed(1)]);
                             // @ts-ignore
                             const ws = XLSX.utils.aoa_to_sheet([...h, headers, ...r]);
                             // @ts-ignore
                             const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Quyet_Toan");
                             // @ts-ignore
                             XLSX.writeFile(wb, `Quyet_Toan_T${repRange.s}_${repRange.e}.xlsx`);
                        }} className="bg-blue-600 text-white px-6 py-4 rounded-2xl flex items-center gap-3 font-black hover:bg-blue-700 transition-all text-xs uppercase tracking-widest shadow-2xl"><FileSpreadsheet size={22}/> Báo cáo GV</button>
                    </div>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
                    <div className="xl:col-span-2 space-y-12">
                        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl overflow-hidden overflow-x-auto">
                            <table className="w-full text-left min-w-[1000px]">
                                <thead className="bg-slate-50 border-b text-[11px] font-black uppercase text-slate-400 tracking-[0.3em]">
                                    <tr>
                                        <th className="p-8 w-16 text-center">STT</th>
                                        <th className="p-8">Họ tên Giáo viên</th>
                                        <th className="p-8 text-center">Tiến độ quy định</th>
                                        <th className="p-8 text-center">Thực dạy tích lũy</th>
                                        <th className="p-8 text-center text-blue-600">Thừa / Thiếu</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {teacherStats.map((s: any, i: number) => (
                                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="p-6 text-center text-slate-300 font-black text-base">{i+1}</td>
                                            <td className="p-6 font-black text-slate-700 text-lg uppercase tracking-tight leading-none">{s.name}</td>
                                            <td className="p-6 text-center text-slate-400 font-black text-xl">{s.progQuota.toFixed(1)}</td>
                                            <td className="p-6 text-center text-slate-800 font-black text-xl">{s.total.toFixed(1)}</td>
                                            <td className={`p-6 text-center text-3xl font-black tracking-tighter ${s.bal >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                {s.bal > 0 ? `+${s.bal.toFixed(1)}` : s.bal.toFixed(1)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl p-10 space-y-10">
                        <h3 className="font-black text-slate-400 uppercase text-sm tracking-widest border-b pb-6 italic">Tiến độ 35 tuần năm học</h3>
                        <div className="space-y-8">
                            {subjStats.map((s: any, i: number) => (
                                <div key={i} className="space-y-3">
                                    <div className="flex justify-between items-end">
                                        <div className="font-black text-slate-700 text-base">{s.name}</div>
                                        <div className="text-sm font-black text-blue-500">{s.total.toFixed(1)} / {s.yrQ.toFixed(0)} tiết</div>
                                    </div>
                                    <div className="h-3.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100 shadow-inner">
                                        <div className="h-full bg-blue-500 transition-all duration-1000 ease-out" style={{ width: `${Math.min(100, s.pct)}%` }}></div>
                                    </div>
                                    <div className="text-xs font-black text-slate-300 uppercase text-right leading-none tracking-widest">Hoàn thành {s.pct.toFixed(1)}%</div>
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
            <div className="p-10 animate-fadeIn">
                <h2 className="text-xl font-black mb-12 text-slate-700 uppercase italic tracking-widest">Cài đặt quy chuẩn định mức chuyên môn</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-14">
                    <div className="space-y-12">
                        <div className="bg-slate-50 p-14 rounded-[3rem] border border-slate-100 shadow-inner">
                            <label className="block text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-8 italic">Định mức tiết chuẩn (THCS = 19 tiết)</label>
                            <input type="number" value={data.standardQuota} onChange={e => updateData({standardQuota: parseFloat(e.target.value) || 0})} className="text-[10rem] font-black text-blue-600 bg-transparent outline-none w-full tracking-tighter leading-none"/>
                        </div>
                        <div className="bg-blue-600 p-12 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
                            <h3 className="font-black uppercase text-sm mb-8 tracking-widest leading-none">Thêm danh mục môn học</h3>
                            <div className="flex gap-5">
                                <input type="text" placeholder="Tên môn học mới..." value={newS} onChange={e => setNewS(e.target.value)} className="flex-1 p-6 rounded-[1.5rem] bg-white/10 border-none text-white font-black outline-none text-xl placeholder-white/30"/>
                                <button onClick={() => { if(!newS.trim()) return; updateData({ subjectConfigs: [...data.subjectConfigs, { name: newS.trim(), p6: 1, p7: 1, p8: 1, p9: 1 }] }); setNewS(''); }} className="bg-white text-blue-600 px-12 py-6 rounded-[1.5rem] font-black uppercase text-sm hover:bg-blue-50 transition-all shadow-xl">Thêm</button>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100 max-h-[700px] overflow-y-auto no-scrollbar shadow-inner">
                        <h3 className="font-black text-slate-400 uppercase text-sm mb-10 tracking-widest italic text-center">Định mức số tiết theo môn và khối</h3>
                        <div className="space-y-6">
                            {data.subjectConfigs.map((s: any, i: number) => (
                                <div key={i} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 group transition-all hover:border-blue-200">
                                    <div className="flex justify-between items-center mb-5">
                                        <div className="font-black text-slate-700 text-lg italic uppercase">{s.name}</div>
                                        <button onClick={() => updateData({ subjectConfigs: data.subjectConfigs.filter((x:any)=>x.name !== s.name) })} className="text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><X size={26}/></button>
                                    </div>
                                    <div className="grid grid-cols-4 gap-5">
                                        {['6', '7', '8', '9'].map(g => (
                                            <div key={g} className="text-center">
                                                <label className="text-xs font-black text-slate-300 uppercase mb-2 block">Khối {g}</label>
                                                <input type="number" step="0.5" value={s[`p${g}`]} onChange={e => { const nc = [...data.subjectConfigs]; nc[i][`p${g}`] = parseFloat(e.target.value) || 0; updateData({subjectConfigs: nc}); }} className="w-full p-3 bg-slate-50 rounded-xl text-center font-black text-blue-500 text-lg border-none outline-none focus:ring-2 focus:ring-blue-100 shadow-inner"/>
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
            <header className="bg-white border-b border-slate-100 p-8 sticky top-0 z-50 shadow-sm">
                <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-6">
                        <div className="bg-blue-600 p-5 rounded-2xl text-white shadow-2xl rotate-3 hover:rotate-0 transition-transform cursor-pointer"><LayoutDashboard size={32}/></div>
                        <div>
                            <h1 className="font-black text-3xl tracking-tighter text-slate-800 uppercase italic leading-none">THCS GIẢNG DẠY <span className="text-blue-600 text-base align-top font-black italic">ULTIMATE v8.4</span></h1>
                            <p className="text-sm font-bold uppercase text-slate-400 tracking-[0.4em] mt-3 italic leading-none">Complete Professional Backup & Restore System</p>
                        </div>
                    </div>
                    <nav className="flex gap-3 bg-slate-100 p-2 rounded-[2rem] shadow-inner overflow-x-auto no-scrollbar">
                        {[
                            {id: 'config', icon: Settings, label: 'Cài đặt'},
                            {id: 'teachers', icon: Users, label: 'Phân công'},
                            {id: 'weekly', icon: CalendarDays, label: 'Thực dạy'},
                            {id: 'reports', icon: FileText, label: 'Báo cáo'},
                        ].map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-3 px-10 py-5 rounded-[1.5rem] text-sm font-black transition-all whitespace-nowrap uppercase tracking-widest ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-2xl scale-105' : 'text-slate-400 hover:text-slate-600'}`}>
                                <tab.icon size={24}/> {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>
            </header>
            <main className="container mx-auto p-4 md:p-14 flex-1">
                <div className="bg-white rounded-[4rem] shadow-2xl border border-white min-h-[850px] overflow-hidden relative">
                    {activeTab === 'config' && <ConfigTab />}
                    {activeTab === 'teachers' && <TeacherTab />}
                    {activeTab === 'weekly' && <WeeklyTab />}
                    {activeTab === 'reports' && <ReportTab />}
                </div>
            </main>
            <footer className="p-10 text-center text-[12px] font-black uppercase text-slate-300 tracking-[0.6em] italic flex items-center justify-center gap-5">
                <CheckCircle2 size={20}/> Professional • Aesthetics • Integrity • v8.4
            </footer>
        </div>
    );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
