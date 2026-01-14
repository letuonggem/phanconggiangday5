
import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { 
    LayoutDashboard, Users, CalendarDays, FileText, Settings, 
    Trash2, ChevronLeft, ChevronRight, ChevronDown,
    Plus, FileUp, Edit3, Check,
    AlertTriangle, Copy, RefreshCcw, FileDown, PlusCircle, Book, Info, CheckCircle2, X
} from 'lucide-react';

// --- CẤU HÌNH HỆ THỐNG ---
const STORAGE_KEY = 'thcs_teaching_mgmt_v7_1_pro';

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

// --- TIỆN ÍCH KIỂM TRA ---

// Chặn tên lớp không bắt đầu bằng 6,7,8,9
const isValidClassName = (cls: string) => /^[6-9][A-Z0-9.\-_]*$/.test(cls);

const normalizeAssignment = (str: string) => {
    return str.split(';')
              .map(part => {
                  const [sub, clsPart] = part.split(':');
                  if (!sub || !clsPart) return part.trim();
                  const normalizedCls = clsPart.split(',')
                                               .map(c => c.trim().toUpperCase())
                                               .filter(c => c)
                                               .join(', ');
                  return `${sub.trim()}: ${normalizedCls}`;
              })
              .join('; ');
};

// --- COMPONENTS TỐI ƯU HIỆU SUẤT ---

// Ô nhập số không giật màn hình
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

// Ô nhập phân công không giật màn hình + Kiểm tra gắt gao
const LocalAssignmentInput = ({ value, onSave, hasConflict }: any) => {
    const [local, setLocal] = useState(value);
    useEffect(() => { setLocal(value); }, [value]);

    const handleCommit = () => {
        if (local === value) return;
        const normalized = local.toUpperCase().replace(/\s{2,}/g, ' ').trim();
        
        // Kiểm tra định dạng từng phần
        const parts = normalized.split(';');
        for (let part of parts) {
            const colonIdx = part.indexOf(':');
            if (colonIdx !== -1) {
                const classes = part.substring(colonIdx + 1).split(',').map(c => c.trim()).filter(c => c);
                for (let cls of classes) {
                    if (!isValidClassName(cls)) {
                        alert(`LỖI ĐỊNH DẠNG: Lớp "${cls}" không hợp lệ!\n\nMọi lớp học tại THCS phải bắt đầu bằng khối (6, 7, 8, hoặc 9).\nVí dụ đúng: 6A1, 7.2, 8B...\nVí dụ sai: 12A1, MA2, 10C...`);
                        setLocal(value); // Revert lại giá trị cũ
                        return;
                    }
                }
            }
        }
        onSave(normalized);
    };

    return (
        <input 
            type="text" 
            className={`w-full p-4 rounded-xl border-none font-bold text-sm shadow-inner transition-all ${hasConflict ? 'bg-red-50 text-red-700 ring-2 ring-red-200' : 'bg-slate-50 text-slate-600 focus:ring-2 focus:ring-blue-100'}`} 
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            onBlur={handleCommit}
            onKeyDown={(e) => { if(e.key === 'Enter') handleCommit(); }}
            placeholder="Môn: Lớp1, Lớp2; Môn2: Lớp3"
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

    // Logic tính toán tiết dạy (Đồng bộ Real-time)
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
        const [showRoleDropdown, setShowRoleDropdown] = useState<string | null>(null);
        const fileRef = useRef<HTMLInputElement>(null);
        
        const weekData = getWeekData(currentWeek);
        const { teachers, assignments, logs = {} } = weekData;

        // Phát hiện trùng lớp giữa các GV
        const classConflicts = useMemo(() => {
            const classToTeachers: Record<string, string[]> = {};
            Object.entries(assignments).forEach(([tId, assignStr]) => {
                if (!assignStr) return;
                const teacher = teachers.find(tx => tx.id === tId);
                if (!teacher) return;
                (assignStr as string).split(';').forEach(part => {
                    const cIdx = part.indexOf(':');
                    if (cIdx !== -1) part.substring(cIdx + 1).split(',').map(c => c.trim().toUpperCase()).filter(c => c).forEach(cls => {
                        if (!classToTeachers[cls]) classToTeachers[cls] = [];
                        if (!classToTeachers[cls].includes(teacher.name)) classToTeachers[cls].push(teacher.name);
                    });
                });
            });
            const conflicts: Record<string, string[]> = {};
            Object.entries(classToTeachers).forEach(([cls, names]) => { if (names.length > 1) conflicts[cls] = names; });
            return conflicts;
        }, [assignments, teachers]);

        const saveAssignment = (tId: string, val: string) => {
            // Kiểm tra trùng lớp (Final check)
            const assignedByOthers = new Set<string>();
            Object.entries(assignments).forEach(([id, str]) => {
                if (id === tId || !str) return;
                (str as string).split(';').forEach(p => {
                    const cIdx = p.indexOf(':');
                    if (cIdx !== -1) p.substring(cIdx + 1).split(',').forEach(c => { const n = c.trim().toUpperCase(); if (n) assignedByOthers.add(n); });
                });
            });
            const currentClasses = val.split(';').flatMap(p => {
                const cIdx = p.indexOf(':');
                return cIdx === -1 ? [] : p.substring(cIdx + 1).split(',').map(c => c.trim().toUpperCase()).filter(c => c);
            });
            for (const cls of currentClasses) {
                if (assignedByOthers.has(cls)) {
                    alert(`XUNG ĐỘT: Lớp ${cls} đã được phân công cho giáo viên khác dạy!`);
                    return;
                }
            }
            updateWeekData(currentWeek, { assignments: { ...assignments, [tId]: val } });
        };

        const copyFromPrevious = () => {
            if (currentWeek <= 1) return alert("Đây là tuần đầu tiên!");
            const prev = data.weeklyRecords[currentWeek - 1];
            if (!prev) return alert("Tuần trước chưa có dữ liệu!");
            if (confirm(`Hệ thống sẽ sao chép toàn bộ Phân công & Tiết dạy bù từ Tuần ${currentWeek - 1} sang Tuần ${currentWeek}.\n\nBạn có chắc chắn?`)) {
                updateWeekData(currentWeek, { 
                    teachers: JSON.parse(JSON.stringify(prev.teachers)), 
                    assignments: JSON.parse(JSON.stringify(prev.assignments)),
                    logs: JSON.parse(JSON.stringify(prev.logs || {}))
                });
            }
        };

        const handleExportTemplate = () => {
            const header = "Họ tên,Môn dạy,Lớp dạy,Chức vụ (Cách dấu phẩy)\n";
            const blob = new Blob(["\uFEFF" + header + "Nguyễn Văn A,Toán,\"6A1, 6A2\",Chủ nhiệm"], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob); link.download = "Mau_Phan_Cong_THCS.csv"; link.click();
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
                const newT = [...teachers]; const newA = { ...assignments };
                rows.forEach((row: any, i: number) => {
                    const id = Date.now().toString() + i;
                    newT.push({ id, name: row['Họ tên'] || 'GV Mới', roles: (row['Chức vụ'] || '').toString().split(',').map((s:any)=>s.trim()).filter((s:any)=>s) });
                    newA[id] = `${row['Môn dạy'] || ''}: ${row['Lớp dạy'] || ''}`;
                });
                updateWeekData(currentWeek, { teachers: newT, assignments: newA });
                alert(`Đã nhập thành công ${rows.length} giáo viên.`);
            };
            reader.readAsBinaryString(file);
        };

        return (
            <div className="p-8 animate-fadeIn">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-12">
                    <div className="flex items-center gap-6 bg-white border-2 border-slate-100 p-4 rounded-[2.5rem] shadow-sm">
                        <button onClick={() => setCurrentWeek(Math.max(1, currentWeek-1))} className="p-4 hover:bg-slate-100 rounded-2xl transition-colors text-slate-400 hover:text-blue-600"><ChevronLeft/></button>
                        <div className="px-10 text-center">
                            <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">TUẦN HỌC</div>
                            <div className="text-4xl font-black tracking-tighter text-slate-800">{currentWeek}</div>
                        </div>
                        <button onClick={() => setCurrentWeek(currentWeek+1)} className="p-4 hover:bg-slate-100 rounded-2xl transition-colors text-slate-400 hover:text-blue-600"><ChevronRight/></button>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button onClick={handleExportTemplate} title="Tải file mẫu CSV" className="bg-slate-50 text-slate-500 px-6 py-4 rounded-2xl flex items-center gap-2 font-bold hover:bg-slate-100 transition-all border border-slate-100"><FileDown size={20}/> Mẫu CSV</button>
                        <button onClick={() => fileRef.current?.click()} className="bg-emerald-50 text-emerald-700 px-6 py-4 rounded-2xl flex items-center gap-2 font-bold shadow-sm hover:bg-emerald-100 transition-all border border-emerald-100"><FileUp size={20}/> Nhập Excel</button>
                        <input type="file" ref={fileRef} className="hidden" onChange={handleImportExcel} accept=".xlsx,.xls,.csv"/>
                        <button onClick={copyFromPrevious} className="bg-indigo-600 text-white px-6 py-4 rounded-2xl flex items-center gap-2 font-bold shadow-lg hover:bg-indigo-700 transition-all"><Copy size={20}/> Sao chép tuần {currentWeek-1}</button>
                        <button onClick={() => setIsAdding(!isAdding)} className="bg-blue-600 text-white px-8 py-4 rounded-2xl flex items-center gap-2 font-black shadow-xl hover:bg-blue-700 transition-all uppercase tracking-widest text-xs">{isAdding ? 'Đóng' : 'Thêm GV'}</button>
                    </div>
                </div>

                {isAdding && (
                    <div className="mb-10 bg-white border-2 border-blue-100 p-8 rounded-[3.5rem] animate-fadeIn shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-2 h-full bg-blue-600"></div>
                        <h3 className="text-xs font-black text-blue-500 uppercase tracking-widest mb-6">Thêm giáo viên mới vào tuần {currentWeek}</h3>
                        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-end">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Họ tên giáo viên</label>
                                <input type="text" placeholder="Nguyễn Văn A" className="w-full p-4 rounded-2xl bg-slate-50 border-none font-bold" id="new-name"/>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Môn giảng dạy</label>
                                <select className="w-full p-4 rounded-2xl bg-slate-50 border-none font-bold" id="new-sub">
                                    <option value="">-- Chọn môn --</option>
                                    {data.subjectConfigs.map((s: any) => <option key={s.name} value={s.name}>{s.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Danh sách lớp (vd: 6A, 7B)</label>
                                <input type="text" placeholder="6A, 6B, 7C..." className="w-full p-4 rounded-2xl bg-slate-50 border-none font-bold" id="new-cls"/>
                            </div>
                            <div className="space-y-2 relative">
                                <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Chức vụ kiêm nhiệm</label>
                                <div onClick={() => setShowRoleDropdown(showRoleDropdown === 'adding' ? null : 'adding')} className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-slate-400 text-sm flex justify-between items-center cursor-pointer">
                                    <span className="truncate">{newTeacherRoles.length > 0 ? newTeacherRoles.join(', ') : 'Chọn...'}</span>
                                    <ChevronDown size={18} />
                                </div>
                                {showRoleDropdown === 'adding' && (
                                    <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 p-2 max-h-48 overflow-y-auto">
                                        {data.roles.map((r: any) => (
                                            <div key={r.id} onClick={() => setNewTeacherRoles(prev => prev.includes(r.name) ? prev.filter(x => x !== r.name) : [...prev, r.name])} className={`p-3 rounded-xl mb-1 cursor-pointer flex items-center justify-between ${newTeacherRoles.includes(r.name) ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-50 text-slate-600'}`}>
                                                <span className="font-bold text-sm">{r.name}</span>
                                                {newTeacherRoles.includes(r.name) && <Check size={16} />}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button onClick={() => {
                                const name = (document.getElementById('new-name') as HTMLInputElement).value;
                                const sub = (document.getElementById('new-sub') as HTMLSelectElement).value;
                                const clsStr = (document.getElementById('new-cls') as HTMLInputElement).value;
                                if (!name || !sub || !clsStr) return alert("Vui lòng nhập đầy đủ thông tin!");
                                
                                // Kiểm tra định dạng lớp ngay khi thêm
                                const classes = clsStr.split(',').map(c => c.trim()).filter(c => c);
                                for (let c of classes) if(!isValidClassName(c)) return alert(`Lớp "${c}" không hợp lệ (Phải bắt đầu bằng 6-9).`);

                                const tId = Date.now().toString();
                                updateWeekData(currentWeek, {
                                    teachers: [{ id: tId, name, roles: newTeacherRoles }, ...teachers],
                                    assignments: { ...assignments, [tId]: `${sub}: ${clsStr.toUpperCase()}` }
                                });
                                setIsAdding(false); setNewTeacherRoles([]);
                            }} className="w-full bg-blue-600 text-white p-4 rounded-2xl font-black shadow-lg hover:bg-blue-700 transition-all uppercase tracking-tighter">Xác nhận</button>
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-[3.5rem] border-2 border-slate-50 overflow-hidden shadow-sm overflow-x-auto">
                    <table className="w-full text-left min-w-[1000px]">
                        <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400">
                            <tr>
                                <th className="p-8">Giáo viên / Chức vụ</th>
                                <th className="p-8 w-1/3">Phân công TKB (Môn: Lớp)</th>
                                <th className="p-8 text-center">Tiết TKB</th>
                                <th className="p-8 text-center text-orange-600">Dạy bù</th>
                                <th className="p-8 text-center text-orange-600">Tăng tiết/BD</th>
                                <th className="p-8 text-right">Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {teachers.map((t: any) => {
                                const assignment = assignments[t.id] || "";
                                const tkbCount = getTKBPeriods(assignment);
                                const log = logs[t.id] || { bu: 0, tang: 0 };
                                const teacherClasses = assignment.split(';').flatMap((p: string) => {
                                    const cIdx = p.indexOf(':'); return cIdx === -1 ? [] : p.substring(cIdx+1).split(',').map(c => c.trim().toUpperCase()).filter(c => c);
                                });
                                const hasConflict = teacherClasses.some(c => !!classConflicts[c]);

                                return (
                                    <tr key={t.id} className="border-b hover:bg-slate-50/30 transition-all group">
                                        <td className="p-8">
                                            <div className="font-black text-slate-800 text-xl">{t.name}</div>
                                            <div className="flex flex-wrap gap-1 mt-1">{(t.roles || []).map((r: string) => <span key={r} className="text-[8px] font-black uppercase bg-blue-50 text-blue-500 px-2 py-0.5 rounded-md border border-blue-100">{r}</span>)}</div>
                                        </td>
                                        <td className="p-8">
                                            <LocalAssignmentInput 
                                                value={assignment} 
                                                onSave={(v: string) => saveAssignment(t.id, v)}
                                                hasConflict={hasConflict}
                                            />
                                            {hasConflict && <div className="text-[9px] font-black text-red-500 mt-2 uppercase flex items-center gap-1"><AlertTriangle size={12}/> Trùng lịch dạy!</div>}
                                        </td>
                                        <td className="p-8 text-center font-black text-slate-800 text-3xl tracking-tighter">{tkbCount.toFixed(1)}</td>
                                        <td className="p-8">
                                            <LocalNumericInput 
                                                value={log.bu} 
                                                onChange={(val: number) => updateWeekData(currentWeek, { logs: { ...logs, [t.id]: { ...log, bu: val } } })}
                                                className="w-20 mx-auto block text-center p-4 bg-orange-50 border-2 border-orange-100 rounded-2xl font-black text-orange-700 outline-none hover:border-orange-300 transition-all"
                                            />
                                        </td>
                                        <td className="p-8">
                                            <LocalNumericInput 
                                                value={log.tang} 
                                                onChange={(val: number) => updateWeekData(currentWeek, { logs: { ...logs, [t.id]: { ...log, tang: val } } })}
                                                className="w-20 mx-auto block text-center p-4 bg-orange-50 border-2 border-orange-100 rounded-2xl font-black text-orange-700 outline-none hover:border-orange-300 transition-all"
                                            />
                                        </td>
                                        <td className="p-8 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => { if(confirm("Bạn muốn gỡ giáo viên này khỏi tuần " + currentWeek + "?")) updateWeekData(currentWeek, { teachers: teachers.filter((x: any) => x.id !== t.id) }); }} className="text-slate-300 hover:text-red-500 p-4 hover:bg-red-50 rounded-2xl transition-all"><Trash2 size={22}/></button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {teachers.length === 0 && <div className="p-32 text-center text-slate-300 font-black uppercase italic tracking-widest">Tuần này chưa có phân công</div>}
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
                    aggregates[key].bu += (log.bu || 0); aggregates[key].tang += (log.tang || 0);
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
                            <input type="number" min="1" value={startRange} onChange={e => setStartRange(parseInt(e.target.value) || 1)} className="w-20 p-4 bg-slate-50 rounded-2xl font-black text-center text-2xl border-none outline-none focus:ring-4 focus:ring-blue-50"/>
                        </div>
                        <ChevronRight className="text-slate-200" size={32} />
                        <div className="flex items-center gap-3">
                            <label className="text-[10px] font-black uppercase text-blue-500">Đến tuần</label>
                            <input type="number" min={startRange} value={endRange} onChange={e => setEndRange(parseInt(e.target.value) || 1)} className="w-20 p-4 bg-slate-50 rounded-2xl font-black text-center text-2xl border-none outline-none focus:ring-4 focus:ring-blue-50"/>
                        </div>
                    </div>
                    <div className="text-right">
                        <h2 className="text-3xl font-black text-slate-800 uppercase italic tracking-tighter italic">Lũy kế Thực dạy</h2>
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Dữ liệu tổng hợp theo dải tuần đã chọn</p>
                    </div>
                </div>
                <div className="bg-white rounded-[4rem] border-2 border-slate-50 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400">
                            <tr>
                                <th className="p-10">Họ và tên Giáo viên</th>
                                <th className="p-10 text-center">Tổng Tiết TKB</th>
                                <th className="p-10 text-center text-orange-600">Tổng Dạy bù</th>
                                <th className="p-10 text-center text-orange-600">Tổng Tăng tiết/BD</th>
                                <th className="p-10 text-center bg-blue-50/50 text-blue-700">Thực dạy Lũy kế</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.map((s: any, i: number) => {
                                const total = s.tkb + s.bu + s.tang;
                                return (
                                    <tr key={i} className="border-b hover:bg-slate-50/50 transition-colors">
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

    // --- TAB BÁO CÁO QUYẾT TOÁN ---
    const ReportTab = () => {
        const [reportEnd, setReportEnd] = useState(1);
        const stats = useMemo(() => {
            const teacherMap: Record<string, any> = {};
            for (let w = 1; w <= reportEnd; w++) {
                const record = data.weeklyRecords[w]; if (!record) continue;
                record.teachers.forEach((t: any) => {
                    const key = t.name.trim();
                    if (!teacherMap[key]) {
                        teacherMap[key] = { name: t.name, quota: 0, actual: 0, extra: 0 };
                    }
                    const q = Math.max(0, data.standardQuota - getTeacherReduction(t.roles));
                    teacherMap[key].quota += q;
                    const log = record.logs?.[t.id] || { bu: 0, tang: 0 };
                    teacherMap[key].actual += (log.actual !== undefined ? log.actual : getTKBPeriods(record.assignments[t.id] || ""));
                    teacherMap[key].extra += (log.bu || 0) + (log.tang || 0);
                });
            }
            return Object.values(teacherMap).map((s: any) => ({ ...s, total: s.actual + s.extra, balance: (s.actual + s.extra) - s.quota })).sort((a,b) => a.name.localeCompare(b.name));
        }, [data, reportEnd]);

        return (
            <div className="p-10 animate-fadeIn">
                <div className="flex justify-between items-center mb-12">
                    <h2 className="text-4xl font-black text-slate-800 uppercase italic tracking-tighter">Báo cáo Quyết toán</h2>
                    <div className="bg-slate-100 p-4 rounded-[2rem] flex items-center gap-4">
                        <span className="text-[10px] font-black uppercase text-slate-400 ml-4">Đến tuần:</span>
                        <input type="number" value={reportEnd} onChange={e => setReportEnd(parseInt(e.target.value) || 1)} className="w-20 p-3 rounded-2xl text-center font-black text-blue-600 bg-white border-none outline-none focus:ring-4 focus:ring-blue-100"/>
                    </div>
                </div>
                <div className="bg-white rounded-[4rem] border-2 border-slate-50 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400">
                            <tr>
                                <th className="p-8">Giáo viên</th>
                                <th className="p-8 text-center">Lũy kế Định mức</th>
                                <th className="p-8 text-center">Lũy kế Thực dạy</th>
                                <th className="p-8 text-center bg-blue-50/50 text-blue-700 font-bold italic">Chênh lệch (Dôi dư)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.map((s: any, i: number) => (
                                <tr key={i} className="border-b hover:bg-slate-50/50 transition-colors">
                                    <td className="p-8"><div className="font-black text-slate-700 text-xl">{s.name}</div></td>
                                    <td className="p-8 text-center font-black text-slate-400 text-2xl">{s.quota.toFixed(1)}</td>
                                    <td className="p-8 text-center font-black text-slate-800 text-2xl">{s.total.toFixed(1)}</td>
                                    <td className={`p-8 text-center text-4xl font-black ${s.balance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                        {s.balance > 0 ? `+${s.balance.toFixed(1)}` : s.balance.toFixed(1)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {stats.length === 0 && <div className="p-32 text-center text-slate-300 font-black uppercase italic tracking-widest">Không có dữ liệu báo cáo</div>}
                </div>
            </div>
        );
    };

    // --- TAB CÀI ĐẶT ---
    const ConfigTab = () => {
        const [newSubName, setNewSubName] = useState('');
        const addSubject = () => {
            if (!newSubName.trim()) return;
            if (data.subjectConfigs.some((s:any) => s.name.toLowerCase() === newSubName.toLowerCase().trim())) return alert("Môn học này đã tồn tại trong danh sách!");
            updateData({ subjectConfigs: [...data.subjectConfigs, { name: newSubName.trim(), p6: 1, p7: 1, p8: 1, p9: 1 }] });
            setNewSubName('');
        };
        const removeSubject = (name: string) => {
            if (confirm(`Hệ thống sẽ xóa cấu hình định mức cho môn ${name}. Tiếp tục?`)) updateData({ subjectConfigs: data.subjectConfigs.filter((s:any) => s.name !== name) });
        };

        return (
            <div className="p-10 animate-fadeIn">
                <h2 className="text-3xl font-black mb-10 text-slate-800 uppercase italic">Cấu hình Hệ thống</h2>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
                    <div className="space-y-10">
                        <div className="bg-slate-50 p-10 rounded-[4rem] border border-slate-100 shadow-inner group">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><Info size={14}/> Định mức THCS chuẩn (Tiết/Tuần)</label>
                            <input type="number" value={data.standardQuota} onChange={e => updateData({standardQuota: parseFloat(e.target.value) || 0})} className="text-9xl font-black text-blue-600 bg-transparent outline-none w-full tracking-tighter transition-all focus:scale-105"/>
                        </div>
                        <div className="bg-blue-600 p-10 rounded-[4rem] text-white shadow-xl shadow-blue-500/20 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-10"><PlusCircle size={100}/></div>
                            <h3 className="font-black uppercase text-sm mb-6 flex items-center gap-3">Thêm môn học mới</h3>
                            <div className="flex gap-4 relative z-10">
                                <input type="text" placeholder="Tên môn học (vd: GDĐP)..." value={newSubName} onChange={e => setNewSubName(e.target.value)} className="flex-1 p-5 rounded-2xl bg-white/10 border-2 border-white/20 text-white placeholder-white/40 font-bold outline-none focus:bg-white/20 transition-all"/>
                                <button onClick={addSubject} className="bg-white text-blue-600 px-8 py-5 rounded-2xl font-black hover:bg-blue-50 transition-all uppercase text-xs active:scale-95 shadow-lg">Thêm</button>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-50 p-10 rounded-[4rem] border border-slate-100 shadow-inner max-h-[800px] overflow-y-auto no-scrollbar">
                        <h3 className="font-black text-slate-700 uppercase text-xs mb-8 tracking-widest flex items-center gap-3"><Book size={18} className="text-blue-500"/> Định mức Môn học theo Khối</h3>
                        <div className="space-y-6">
                            {data.subjectConfigs.map((s: any, i: number) => (
                                <div key={i} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 group transition-all hover:shadow-md">
                                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                                        <div className="font-black text-slate-800 uppercase text-sm">{s.name}</div>
                                        <button onClick={() => removeSubject(s.name)} className="text-slate-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><X size={16}/></button>
                                    </div>
                                    <div className="grid grid-cols-4 gap-4">
                                        {['6', '7', '8', '9'].map(grade => (
                                            <div key={grade} className="text-center">
                                                <label className="block text-[9px] font-black text-slate-300 uppercase mb-1 tracking-wider">Khối {grade}</label>
                                                <input type="number" step="0.5" value={s[`p${grade}`]} onChange={e => {
                                                    const nc = [...data.subjectConfigs]; nc[i][`p${grade}`] = parseFloat(e.target.value) || 0; updateData({subjectConfigs: nc});
                                                }} className="w-full p-2 bg-slate-50 rounded-xl text-center font-black text-blue-500 border border-slate-100 outline-none focus:ring-2 focus:ring-blue-100 transition-all"/>
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
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 overflow-x-hidden selection:bg-blue-100 selection:text-blue-700">
            <header className="bg-white border-b-2 border-slate-100 p-6 sticky top-0 z-50 shadow-sm transition-all">
                <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-5">
                        <div className="bg-blue-600 p-4 rounded-[1.5rem] text-white shadow-2xl rotate-3"><LayoutDashboard size={32}/></div>
                        <div>
                            <h1 className="font-black text-3xl tracking-tighter text-slate-800 uppercase italic">THCS PRO <span className="text-blue-600 text-sm align-top italic font-black">v7.1</span></h1>
                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest leading-none">Management & Reports System</p>
                        </div>
                    </div>
                    <nav className="flex gap-2 bg-slate-100 p-2 rounded-[2.5rem] overflow-x-auto no-scrollbar max-w-full">
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
                <div className="bg-white rounded-[5rem] shadow-2xl border-4 border-white min-h-[800px] overflow-hidden relative">
                    {activeTab === 'config' && <ConfigTab />}
                    {activeTab === 'teachers' && <TeacherTab />}
                    {activeTab === 'weekly' && <WeeklyTab />}
                    {activeTab === 'reports' && <ReportTab />}
                </div>
            </main>
            <footer className="p-8 text-center">
                <div className="text-[10px] font-black uppercase text-slate-300 tracking-[0.3em] flex items-center justify-center gap-3">
                    <CheckCircle2 size={12}/> Đã mã hóa cục bộ bảo mật tại máy khách
                </div>
            </footer>
        </div>
    );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
