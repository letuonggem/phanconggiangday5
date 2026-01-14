
import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { 
    LayoutDashboard, Users, CalendarDays, FileText, Settings, 
    Trash2, ChevronLeft, ChevronRight, ChevronDown,
    Plus, FileUp, Edit3, Check,
    AlertTriangle, Copy, RefreshCcw, FileDown, PlusCircle, Book, Info, CheckCircle2, X, Square, CheckSquare, Search, FileSpreadsheet,
    Download, Upload, Database, Save
} from 'lucide-react';

// --- CẤU HÌNH HỆ THỐNG ---
const STORAGE_KEY = 'thcs_teaching_mgmt_v8_2_pro';

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
            className="w-full p-2.5 rounded-lg border-none font-bold text-sm shadow-inner bg-slate-50 text-slate-600 focus:ring-2 focus:ring-blue-100 transition-all"
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
            if (selectedIds.length === 0) return alert("Vui lòng chọn giáo viên cần sao chép!");
            const newTeachers = [...teachers];
            const newAssignments = { ...assignments };
            const newLogs = { ...logs };
            selectedIds.forEach(id => {
                const prevT = prevWeekData.teachers.find((x:any) => x.id === id);
                if (prevT) {
                    if (!teachers.some(t => t.id === id)) {
                        newTeachers.push({ ...prevT });
                        newAssignments[id] = prevWeekData.assignments[id] || "";
                        if (prevWeekData.logs?.[id]) newLogs[id] = { ...prevWeekData.logs[id] };
                    }
                }
            });
            updateWeekData(currentWeek, { teachers: newTeachers, assignments: newAssignments, logs: newLogs });
            setSelectedIds([]);
            setIsCopying(false);
        };

        const handleExportTemplate = () => {
            const csv = "\uFEFFHọ tên,Môn dạy,Lớp dạy,Chức vụ (Cách dấu phẩy)\nNGUYỄN VĂN A,Toán,\"6A1, 6A2\",Chủ nhiệm";
            const b = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const l = document.createElement("a"); l.href = URL.createObjectURL(b); l.download = "Mau_Phan_Cong.csv"; l.click();
        };

        const handleImportExcel = (e: any) => {
            const file = e.target.files[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt: any) => {
                // @ts-ignore
                const wb = XLSX.read(evt.target.result, {type:'binary'});
                // @ts-ignore
                const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
                const newT = [...teachers]; const newA = { ...assignments };
                rows.forEach((row: any, i: number) => {
                    const id = Date.now().toString() + i;
                    const name = (row['Họ tên'] || row['Tên giáo viên'] || '').toString().toUpperCase();
                    if (!name) return;
                    newT.push({ id, name, roles: (row['Chức vụ'] || '').toString().split(',').map((s:any)=>s.trim()).filter((s:any)=>s) });
                    newA[id] = `${row['Môn dạy'] || ''}: ${row['Lớp dạy'] || ''}`.toUpperCase().trim();
                });
                updateWeekData(currentWeek, { teachers: newT, assignments: newA });
                alert("Nhập dữ liệu thành công!");
            };
            reader.readAsBinaryString(file);
        };

        const toggleRole = (e: React.MouseEvent, roleName: string) => {
            e.stopPropagation();
            setNewTeacherRoles(prev => prev.includes(roleName) ? prev.filter(r => r !== roleName) : [...prev, roleName]);
            setShowRoleDropdown(false);
        };

        return (
            <div className="p-8 animate-fadeIn">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
                    <div className="flex items-center gap-4 bg-white border border-slate-200 p-3 rounded-xl shadow-sm">
                        <button onClick={() => { setCurrentWeek(Math.max(1, currentWeek-1)); setSelectedIds([]); setIsCopying(false); }} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400"><ChevronLeft size={20}/></button>
                        <div className="px-6 text-center border-x border-slate-100">
                            <div className="text-xs font-bold text-blue-500 uppercase tracking-widest leading-none mb-1">Tuần học</div>
                            <div className="text-2xl font-black text-slate-800 tracking-tighter">{currentWeek}</div>
                        </div>
                        <button onClick={() => { setCurrentWeek(currentWeek+1); setSelectedIds([]); setIsCopying(false); }} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400"><ChevronRight size={20}/></button>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button onClick={handleExportTemplate} className="bg-slate-50 text-slate-500 px-4 py-3 rounded-xl flex items-center gap-2 font-bold hover:bg-slate-100 transition-all text-xs uppercase tracking-wider border border-slate-200"><FileDown size={16}/> Mẫu</button>
                        <button onClick={() => fileRef.current?.click()} className="bg-emerald-50 text-emerald-700 px-4 py-3 rounded-xl flex items-center gap-2 font-bold hover:bg-emerald-100 transition-all text-xs uppercase tracking-wider border border-emerald-100"><FileUp size={16}/> Nhập Excel</button>
                        <input type="file" ref={fileRef} className="hidden" onChange={handleImportExcel} accept=".xlsx,.xls,.csv"/>
                        <button onClick={() => { setIsCopying(!isCopying); setIsAdding(false); }} className={`px-4 py-3 rounded-xl flex items-center gap-2 font-bold transition-all text-xs uppercase tracking-wider border ${isCopying ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}><Copy size={16}/> Copy tuần trước</button>
                        <button onClick={() => { setIsAdding(!isAdding); setIsCopying(false); setNewTeacherRoles([]); }} className="bg-blue-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 font-bold shadow-lg hover:bg-blue-700 transition-all text-xs uppercase tracking-wider">{isAdding ? 'Đóng' : 'Thêm GV mới'}</button>
                    </div>
                </div>

                {isAdding && (
                    <div className="mb-10 bg-white border border-blue-100 p-8 rounded-2xl animate-fadeIn shadow-lg">
                        <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-6 border-b pb-3 italic">Thêm giáo viên mới</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-slate-400 ml-1 uppercase">Họ tên GV</label>
                                <input type="text" placeholder="Nhập tên..." className="w-full p-4 rounded-xl bg-slate-50 border-none outline-none font-bold shadow-inner text-base uppercase" id="new-name"/>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-slate-400 ml-1 uppercase">Môn dạy</label>
                                <select className="w-full p-4 rounded-xl bg-slate-50 border-none outline-none font-bold shadow-inner text-base" id="new-sub">
                                    <option value="">Chọn môn</option>
                                    {data.subjectConfigs.map((s: any) => <option key={s.name} value={s.name}>{s.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-slate-400 ml-1 uppercase">Lớp dạy</label>
                                <input type="text" placeholder="Lớp dạy..." className="w-full p-4 rounded-xl bg-slate-50 border-none outline-none font-bold shadow-inner text-base uppercase" id="new-cls"/>
                            </div>
                            <div className="space-y-2 relative">
                                <label className="text-[11px] font-bold text-slate-400 ml-1 uppercase">Kiêm nhiệm</label>
                                <div onClick={() => setShowRoleDropdown(!showRoleDropdown)} className="w-full p-4 bg-slate-50 rounded-xl font-bold text-slate-600 text-sm flex justify-between items-center cursor-pointer shadow-inner">
                                    <span className="truncate">{newTeacherRoles.length > 0 ? newTeacherRoles.join(', ') : 'Chưa chọn...'}</span>
                                    <ChevronDown size={18} className="text-blue-500" />
                                </div>
                                {showRoleDropdown && (
                                    <div className="absolute top-[105%] left-0 w-full mt-1 bg-white rounded-xl shadow-2xl border border-slate-100 z-50 p-3 max-h-60 overflow-y-auto">
                                        {data.roles.map((r: any) => (
                                            <div key={r.id} onClick={(e) => toggleRole(e, r.name)} className="p-3 rounded-lg mb-1 cursor-pointer flex items-center justify-between hover:bg-blue-50 transition-colors">
                                                <span className="font-bold text-xs">{r.name}</span>
                                                {newTeacherRoles.includes(r.name) && <Check size={16} className="text-blue-600" />}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-end mt-8">
                            <button onClick={() => {
                                const nV = (document.getElementById('new-name') as HTMLInputElement).value.trim().toUpperCase();
                                const sV = (document.getElementById('new-sub') as HTMLSelectElement).value;
                                const cV = (document.getElementById('new-cls') as HTMLInputElement).value.replace(/\s/g, '').toUpperCase().trim();
                                if (!nV || !sV || !cV) return alert("Vui lòng nhập đủ Tên, Môn, Lớp!");
                                const clsList = cV.split(',').filter(c => c);
                                for (let c of clsList) {
                                    if(!isValidClassName(c)) return alert(`Lớp ${c} không đúng (khối 6-9).`);
                                    if(classToTeacherMap[c]) return alert(`Lớp ${c} đã được giao cho ${classToTeacherMap[c]}!`);
                                }
                                const tId = Date.now().toString();
                                updateWeekData(currentWeek, {
                                    teachers: [{ id: tId, name: nV, roles: [...newTeacherRoles] }, ...teachers],
                                    assignments: { ...assignments, [tId]: `${sV}: ${clsList.join(', ')}` }
                                });
                                setIsAdding(false);
                            }} className="bg-blue-600 text-white px-10 py-4 rounded-xl font-bold text-sm uppercase tracking-widest shadow-lg hover:bg-blue-700 transition-all">Lưu phân công</button>
                        </div>
                    </div>
                )}

                {isCopying && prevWeekData.teachers.length > 0 && (
                    <div className="mb-10 bg-indigo-50 border border-indigo-100 p-8 rounded-2xl animate-fadeIn shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h4 className="font-bold text-indigo-800 text-sm flex items-center gap-3"><Info size={20}/> Chọn giáo viên từ tuần {currentWeek-1} để sao chép dữ liệu sang tuần {currentWeek}:</h4>
                            <div className="flex gap-3">
                                <button onClick={() => setSelectedIds(prevWeekData.teachers.filter((t:any) => !teachers.some((ct:any) => ct.id === t.id)).map((x:any)=>x.id))} className="px-4 py-2 bg-white text-indigo-600 rounded-lg text-xs font-bold uppercase border border-indigo-200 hover:bg-indigo-100 shadow-sm transition-all">Chọn tất cả</button>
                                <button onClick={copySelectedFromPrevious} disabled={selectedIds.length === 0} className={`px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition-all ${selectedIds.length > 0 ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-200 text-slate-400'}`}>Sao chép {selectedIds.length > 0 ? selectedIds.length : ''} GV</button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                            {prevWeekData.teachers.map((t:any) => {
                                const exists = teachers.some((ct:any) => ct.id === t.id);
                                return (
                                    <div key={t.id} onClick={() => !exists && setSelectedIds(prev => prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id])} className={`px-4 py-3 rounded-xl cursor-pointer border-2 text-[11px] font-bold transition-all flex items-center gap-3 ${exists ? 'bg-slate-100 border-slate-100 text-slate-300 cursor-not-allowed' : selectedIds.includes(t.id) ? 'bg-white border-indigo-500 text-indigo-600 shadow-sm scale-[1.02]' : 'bg-white/50 border-transparent opacity-70 hover:opacity-100'}`}>
                                        {exists ? <CheckCircle2 size={18}/> : selectedIds.includes(t.id) ? <CheckSquare size={18}/> : <Square size={18}/>} 
                                        <span className="truncate">{t.name}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
                    <table className="w-full text-left min-w-[1000px]">
                        <thead className="bg-slate-50 border-b text-xs font-bold uppercase text-slate-400 tracking-wider">
                            <tr>
                                <th className="p-5">Giáo viên / Chức vụ</th>
                                <th className="p-5 w-1/3">Phân công TKB (Môn: Lớp)</th>
                                <th className="p-5 text-center">Tiết TKB</th>
                                <th className="p-5 text-center text-orange-600">Dạy bù</th>
                                <th className="p-5 text-center text-orange-600">Tăng tiết/BD</th>
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
                                        if (cIdx !== -1) p.substring(cIdx+1).split(',').map(c => c.trim()).filter(c => c).forEach(cls => {
                                            const otherT = teachers.find(x => x.id === id);
                                            others[cls] = otherT ? otherT.name : "GV khác";
                                        });
                                    });
                                });

                                return (
                                    <tr key={t.id} className="hover:bg-slate-50/40 transition-all group">
                                        <td className="p-5">
                                            <div className="font-bold text-slate-700 text-base uppercase tracking-tight leading-none mb-1.5">{t.name}</div>
                                            <div className="flex flex-wrap gap-1.5">{(t.roles || []).map((r: string) => <span key={r} className="text-[10px] font-bold bg-blue-50 text-blue-500 px-2 py-0.5 rounded border border-blue-100 uppercase tracking-tighter">{r}</span>)}</div>
                                        </td>
                                        <td className="p-5">
                                            <LocalAssignmentInput value={assignment} onSave={(v: string) => saveAssignment(t.id, v)} existingAssignments={others} />
                                        </td>
                                        <td className="p-5 text-center font-black text-slate-800 text-xl tracking-tighter">{tkb.toFixed(1)}</td>
                                        <td className="p-5">
                                            <LocalNumericInput value={log.bu} onChange={(val: number) => updateWeekData(currentWeek, { logs: { ...logs, [t.id]: { ...log, bu: val } } })} className="w-16 mx-auto block text-center p-2.5 bg-orange-50 border border-orange-100 rounded-lg font-bold text-orange-700 outline-none text-sm shadow-inner"/>
                                        </td>
                                        <td className="p-5">
                                            <LocalNumericInput value={log.tang} onChange={(val: number) => updateWeekData(currentWeek, { logs: { ...logs, [t.id]: { ...log, tang: val } } })} className="w-16 mx-auto block text-center p-2.5 bg-orange-50 border border-orange-100 rounded-lg font-bold text-orange-700 outline-none text-sm shadow-inner"/>
                                        </td>
                                        <td className="p-5 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => { if(confirm(`Xóa ${t.name} khỏi tuần ${currentWeek}?`)) updateWeekData(currentWeek, { teachers: teachers.filter((x: any) => x.id !== t.id) }); }} className="text-slate-200 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={20}/></button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {teachers.length === 0 && <div className="py-24 text-center text-slate-300 italic font-bold text-xs uppercase tracking-widest">Dữ liệu tuần {currentWeek} đang trống</div>}
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
                <div className="flex flex-col lg:flex-row justify-between items-center mb-8 gap-6">
                    <div className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-3 px-3">
                            <label className="text-[11px] font-bold uppercase text-slate-400 italic">Từ tuần</label>
                            <input type="number" min="1" value={startRange} onChange={e => setStartRange(parseInt(e.target.value) || 1)} className="w-14 p-2 bg-slate-50 rounded-lg font-bold text-center text-sm text-blue-600 border-none outline-none focus:ring-2 focus:ring-blue-100"/>
                        </div>
                        <ChevronRight className="text-slate-200" size={20} />
                        <div className="flex items-center gap-3 px-3">
                            <label className="text-[11px] font-bold uppercase text-slate-400 italic">Đến tuần</label>
                            <input type="number" min={startRange} value={endRange} onChange={e => setEndRange(parseInt(e.target.value) || 1)} className="w-14 p-2 bg-slate-50 rounded-lg font-bold text-center text-sm text-blue-600 border-none outline-none focus:ring-2 focus:ring-blue-100"/>
                        </div>
                    </div>
                    <div className="text-right">
                        <h2 className="text-lg font-black text-slate-700 uppercase italic tracking-tight leading-none mb-1.5">Thống kê lũy kế thực dạy</h2>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Thống kê chi tiết dựa trên dải tuần được chọn</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b text-xs font-bold uppercase text-slate-400 tracking-wider">
                            <tr>
                                <th className="p-5">Họ tên giáo viên</th>
                                <th className="p-5 text-center">Tổng Tiết TKB</th>
                                <th className="p-5 text-center text-orange-600">Dạy bù</th>
                                <th className="p-5 text-center text-orange-600">Tăng tiết/BD</th>
                                <th className="p-5 text-center bg-blue-50/50 text-blue-700">Tổng cộng thực dạy</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {stats.map((s: any, i: number) => (
                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-5 font-bold text-slate-700 uppercase text-sm">{s.name}</td>
                                    <td className="p-5 text-center font-bold text-slate-400 text-lg tracking-tight">{s.tkb.toFixed(1)}</td>
                                    <td className="p-5 text-center font-bold text-orange-600 text-lg tracking-tight">{s.bu.toFixed(1)}</td>
                                    <td className="p-5 text-center font-bold text-orange-600 text-lg tracking-tight">{s.tang.toFixed(1)}</td>
                                    <td className="p-5 text-center bg-blue-50/20 font-black text-blue-700 text-3xl tracking-tighter">{(s.tkb + s.bu + s.tang).toFixed(1)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {stats.length === 0 && <div className="py-24 text-center text-slate-200 uppercase font-black text-sm tracking-widest italic">Không có dữ liệu hiển thị</div>}
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

        const handleExportGV = () => {
            const h = [["BÁO CÁO QUYẾT TOÁN GIÁO VIÊN"], [`Tuần ${repRange.s} đến tuần ${repRange.e}`], []];
            const headers = ["STT", "Họ tên Giáo viên", "Tổng số tiết định mức quy định (tiến độ)", "Tổng số thực dạy", "Tiết thừa/thiếu"];
            const r = teacherStats.map((s, i) => [i + 1, s.name, s.progQuota.toFixed(1), s.total.toFixed(1), s.bal.toFixed(1)]);
            // @ts-ignore
            const ws = XLSX.utils.aoa_to_sheet([...h, headers, ...r]);
            ws['!cols'] = [{wch: 6}, {wch: 35}, {wch: 40}, {wch: 25}, {wch: 25}];
            // @ts-ignore
            const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Quyet_Toan");
            // @ts-ignore
            XLSX.writeFile(wb, `Quyet_Toan_GV_T${repRange.s}_${repRange.e}.xlsx`);
        };

        const handleExportSub = () => {
            const h = [["BÁO CÁO THEO DÕI MÔN HỌC (35 TUẦN)"], [`Tiến độ tính đến tuần ${repRange.e}`], []];
            const headers = ["STT", "Môn học", "Tổng số tiết định mức cả năm (35 tuần)", "Tổng số tiết đã dạy", "Tỉ lệ (%)"];
            const r = subjStats.map((s, i) => [i + 1, s.name, s.yrQ.toFixed(1), s.total.toFixed(1), s.pct.toFixed(1) + "%"]);
            // @ts-ignore
            const ws = XLSX.utils.aoa_to_sheet([...h, headers, ...r]);
            ws['!cols'] = [{wch: 6}, {wch: 30}, {wch: 40}, {wch: 25}, {wch: 20}];
            // @ts-ignore
            const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Mon_Hoc");
            // @ts-ignore
            XLSX.writeFile(wb, `Theo_Doi_Mon_T${repRange.s}_${repRange.e}.xlsx`);
        };

        const handleExportBackup = () => {
            const jsonStr = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `Backup_Du_Lieu_THCS_${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            URL.revokeObjectURL(url);
        };

        const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const parsed = JSON.parse(evt.target?.result as string);
                    if (parsed.standardQuota && parsed.weeklyRecords) {
                        if (confirm("Dữ liệu hiện tại sẽ bị ghi đè bằng file sao lưu này. Bạn có chắc chắn?")) {
                            setData(parsed);
                            alert("Đã khôi phục dữ liệu thành công!");
                        }
                    } else {
                        alert("File không đúng định dạng sao lưu của ứng dụng.");
                    }
                } catch (err) {
                    alert("Lỗi khi đọc file sao lưu.");
                }
            };
            reader.readAsText(file);
        };

        return (
            <div className="p-8 animate-fadeIn">
                <div className="flex flex-col lg:flex-row justify-between items-center mb-10 gap-6">
                    <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-2 italic">Phạm vi:</span>
                        <input type="number" value={repRange.s} onChange={e => setRepRange({...repRange, s: parseInt(e.target.value)||1})} className="w-14 p-2 bg-slate-50 rounded-lg text-center font-bold text-blue-600 border-none outline-none text-sm"/>
                        <span className="text-slate-300">→</span>
                        <input type="number" value={repRange.e} onChange={e => setRepRange({...repRange, e: parseInt(e.target.value)||1})} className="w-14 p-2 bg-slate-50 rounded-lg text-center font-bold text-blue-600 border-none outline-none text-sm"/>
                    </div>
                    <div className="flex flex-wrap gap-3 justify-center lg:justify-end">
                        <div className="flex gap-2 border-r border-slate-100 pr-3 mr-3">
                            <button onClick={handleExportBackup} title="Xuất file sao lưu (JSON)" className="bg-amber-50 text-amber-600 px-4 py-3 rounded-xl flex items-center gap-2 font-bold hover:bg-amber-100 transition-all text-xs uppercase tracking-wider border border-amber-100"><Database size={16}/> Sao lưu</button>
                            <button onClick={() => backupFileRef.current?.click()} title="Khôi phục từ file sao lưu (JSON)" className="bg-slate-50 text-slate-500 px-4 py-3 rounded-xl flex items-center gap-2 font-bold hover:bg-slate-100 transition-all text-xs uppercase tracking-wider border border-slate-200"><Upload size={16}/> Khôi phục</button>
                            <input type="file" ref={backupFileRef} className="hidden" accept=".json" onChange={handleImportBackup}/>
                        </div>
                        <button onClick={handleExportGV} className="bg-blue-600 text-white px-5 py-3 rounded-xl flex items-center gap-2 font-bold hover:bg-blue-700 transition-all text-xs uppercase tracking-wider shadow-md"><FileSpreadsheet size={18}/> Quyết toán GV</button>
                        <button onClick={handleExportSub} className="bg-indigo-600 text-white px-5 py-3 rounded-xl flex items-center gap-2 font-bold hover:bg-indigo-700 transition-all text-xs uppercase tracking-wider shadow-md"><FileSpreadsheet size={18}/> Theo dõi Môn</button>
                    </div>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    <div className="xl:col-span-2 space-y-8">
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
                            <table className="w-full text-left min-w-[800px]">
                                <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                    <tr>
                                        <th className="p-5 w-12 text-center">STT</th>
                                        <th className="p-5">Họ tên Giáo viên</th>
                                        <th className="p-5 text-center">Định mức tiến độ</th>
                                        <th className="p-5 text-center">Thực dạy</th>
                                        <th className="p-5 text-center text-blue-600">Thừa / Thiếu</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {teacherStats.map((s: any, i: number) => (
                                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="p-4 text-center text-slate-300 font-bold text-xs">{i+1}</td>
                                            <td className="p-4 font-bold text-slate-700 text-sm uppercase tracking-tight leading-none">{s.name}</td>
                                            <td className="p-4 text-center text-slate-400 font-bold text-sm">{s.progQuota.toFixed(1)}</td>
                                            <td className="p-4 text-center text-slate-800 font-black text-sm">{s.total.toFixed(1)}</td>
                                            <td className={`p-4 text-center text-xl font-black tracking-tighter ${s.bal >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                {s.bal > 0 ? `+${s.bal.toFixed(1)}` : s.bal.toFixed(1)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
                        <h3 className="font-black text-slate-400 uppercase text-xs tracking-widest border-b pb-4 italic">Tiến độ năm học (35 Tuần)</h3>
                        <div className="space-y-5">
                            {subjStats.map((s: any, i: number) => (
                                <div key={i} className="space-y-2">
                                    <div className="flex justify-between items-end">
                                        <div className="font-bold text-slate-700 text-sm">{s.name}</div>
                                        <div className="text-[11px] font-black text-blue-500">{s.total.toFixed(1)} / {s.yrQ.toFixed(0)} tiết</div>
                                    </div>
                                    <div className="h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                                        <div className="h-full bg-blue-500 transition-all duration-700" style={{ width: `${Math.min(100, s.pct)}%` }}></div>
                                    </div>
                                    <div className="text-[10px] font-bold text-slate-300 uppercase text-right leading-none tracking-tighter">Hoàn thành {s.pct.toFixed(1)}% kế hoạch</div>
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
                <h2 className="text-base font-black mb-8 text-slate-700 uppercase italic tracking-tight">Cấu hình hệ thống định mức chuẩn</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="space-y-8">
                        <div className="bg-slate-50 p-10 rounded-2xl border border-slate-100 shadow-inner">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 italic">Định mức tiết chuẩn quy định (Ví dụ: 19 tiết)</label>
                            <input type="number" value={data.standardQuota} onChange={e => updateData({standardQuota: parseFloat(e.target.value) || 0})} className="text-8xl font-black text-blue-600 bg-transparent outline-none w-full tracking-tighter"/>
                        </div>
                        <div className="bg-blue-600 p-8 rounded-2xl text-white shadow-xl relative overflow-hidden group">
                            <h3 className="font-bold uppercase text-xs mb-4 tracking-widest leading-none">Thêm môn học vào danh sách</h3>
                            <div className="flex gap-3">
                                <input type="text" placeholder="Tên môn học mới..." value={newS} onChange={e => setNewS(e.target.value)} className="flex-1 p-4 rounded-xl bg-white/10 border-none text-white font-bold outline-none text-base placeholder-white/30"/>
                                <button onClick={() => { if(!newS.trim()) return; updateData({ subjectConfigs: [...data.subjectConfigs, { name: newS.trim(), p6: 1, p7: 1, p8: 1, p9: 1 }] }); setNewS(''); }} className="bg-white text-blue-600 px-8 py-4 rounded-xl font-bold uppercase text-xs hover:bg-blue-50 transition-colors shadow-lg">Thêm</button>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 max-h-[550px] overflow-y-auto no-scrollbar shadow-inner">
                        <h3 className="font-bold text-slate-400 uppercase text-xs mb-6 tracking-widest italic">Số tiết môn theo từng khối lớp (Định mức môn)</h3>
                        <div className="space-y-4">
                            {data.subjectConfigs.map((s: any, i: number) => (
                                <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 group transition-all hover:border-blue-100">
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="font-bold text-slate-700 text-sm italic">{s.name}</div>
                                        <button onClick={() => updateData({ subjectConfigs: data.subjectConfigs.filter((x:any)=>x.name !== s.name) })} className="text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><X size={18}/></button>
                                    </div>
                                    <div className="grid grid-cols-4 gap-3">
                                        {['6', '7', '8', '9'].map(g => (
                                            <div key={g} className="text-center">
                                                <label className="text-[10px] font-black text-slate-300 uppercase mb-1 block">Khối {g}</label>
                                                <input type="number" step="0.5" value={s[`p${g}`]} onChange={e => { const nc = [...data.subjectConfigs]; nc[i][`p${g}`] = parseFloat(e.target.value) || 0; updateData({subjectConfigs: nc}); }} className="w-full p-2 bg-slate-50 rounded-lg text-center font-bold text-blue-500 text-sm border-none outline-none focus:ring-2 focus:ring-blue-100 transition-all"/>
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
            <header className="bg-white border-b border-slate-100 p-5 sticky top-0 z-50 shadow-sm">
                <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-5">
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-600 p-3 rounded-xl text-white shadow-xl rotate-2 transition-transform hover:rotate-0 cursor-pointer"><LayoutDashboard size={24}/></div>
                        <div>
                            <h1 className="font-black text-xl tracking-tighter text-slate-800 uppercase italic leading-none">THCS GIẢNG DẠY <span className="text-blue-600 text-xs align-top font-black italic">PRO v8.2</span></h1>
                            <p className="text-[10px] font-bold uppercase text-slate-400 tracking-[0.2em] mt-1.5 italic leading-none">Professional Teaching Management System</p>
                        </div>
                    </div>
                    <nav className="flex gap-2 bg-slate-100 p-1.5 rounded-xl shadow-inner overflow-x-auto no-scrollbar">
                        {[
                            {id: 'config', icon: Settings, label: 'Cài đặt'},
                            {id: 'teachers', icon: Users, label: 'Phân công'},
                            {id: 'weekly', icon: CalendarDays, label: 'Thực dạy'},
                            {id: 'reports', icon: FileText, label: 'Báo cáo'},
                        ].map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-6 py-3 rounded-lg text-[11px] font-black transition-all whitespace-nowrap uppercase tracking-wider ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-md scale-105' : 'text-slate-400 hover:text-slate-600'}`}>
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
            <footer className="p-6 text-center text-[10px] font-black uppercase text-slate-300 tracking-[0.4em] italic flex items-center justify-center gap-3">
                <CheckCircle2 size={14}/> Chuyên nghiệp • Thẩm mỹ • Chính xác • v8.2
            </footer>
        </div>
    );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
