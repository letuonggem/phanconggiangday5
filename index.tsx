
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
const STORAGE_KEY = 'thcs_teaching_mgmt_v6_2_final';

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

    // --- TAB PHÂN CÔNG (LÀM VIỆC THEO TUẦN + NHẬP BÙ/TĂNG) ---
    const TeacherTab = () => {
        const [isAdding, setIsAdding] = useState(false);
        const [editingId, setEditingId] = useState<string | null>(null);
        const [editState, setEditState] = useState<{name: string, roles: string[]}>({ name: '', roles: [] });
        const fileRef = useRef<HTMLInputElement>(null);
        
        const weekData = getWeekData(currentWeek);
        const { teachers, assignments, logs = {} } = weekData;

        const startEditing = (teacher: any) => {
            setEditingId(teacher.id);
            setEditState({ name: teacher.name, roles: teacher.roles || [] });
        };

        const saveEdit = () => {
            if (!editState.name.trim()) return alert("Họ tên không được để trống!");
            const newTeachers = teachers.map((t: any) => 
                t.id === editingId ? { ...t, name: editState.name, roles: editState.roles } : t
            );
            updateWeekData(currentWeek, { teachers: newTeachers });
            setEditingId(null);
            setSyncStatus({ message: 'Đã cập nhật GV tại tuần ' + currentWeek, type: 'success' });
            setTimeout(() => setSyncStatus({ message: '', type: '' }), 2000);
        };

        const toggleEditRole = (roleName: string) => {
            setEditState(prev => ({
                ...prev,
                roles: prev.roles.includes(roleName) ? prev.roles.filter(r => r !== roleName) : [...prev.roles, roleName]
            }));
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
                            <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">DỮ LIỆU TUẦN</div>
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
                        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-center">
                            <input type="text" placeholder="Họ tên GV" className="w-full p-4 rounded-2xl border-none shadow-sm font-bold" id="new-name"/>
                            <select className="w-full p-4 rounded-2xl border-none shadow-sm font-bold" id="new-sub">
                                <option value="">Môn dạy</option>
                                {data.subjectConfigs.map((s: any) => <option key={s.name} value={s.name}>{s.name}</option>)}
                            </select>
                            <input type="text" placeholder="Lớp dạy (6A1, 7B2...)" className="w-full p-4 rounded-2xl border-none shadow-sm font-bold" id="new-cls"/>
                            <button onClick={() => {
                                const name = (document.getElementById('new-name') as HTMLInputElement).value;
                                const sub = (document.getElementById('new-sub') as HTMLSelectElement).value;
                                const cls = (document.getElementById('new-cls') as HTMLInputElement).value;
                                if (!name || !sub || !cls) return alert("Vui lòng nhập đủ thông tin!");
                                const tId = Date.now().toString();
                                updateWeekData(currentWeek, {
                                    teachers: [{ id: tId, name, roles: [] }, ...teachers],
                                    assignments: { ...assignments, [tId]: `${sub}: ${normalizeClassStr(cls)}` }
                                });
                                setIsAdding(false);
                            }} className="bg-blue-600 text-white p-4 rounded-2xl font-black flex items-center justify-center gap-2"><Plus/> THÊM NGAY</button>
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-[3.5rem] border-2 border-slate-50 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400">
                            <tr>
                                <th className="p-8">Giáo viên</th>
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
                                return (
                                    <tr key={t.id} className="border-b hover:bg-slate-50/50 transition-all">
                                        <td className="p-8">
                                            {isEditing ? (
                                                <input className="font-bold border rounded p-1" value={editState.name} onChange={e => setEditState({...editState, name: e.target.value})}/>
                                            ) : (
                                                <div className="font-black text-slate-800 text-xl">{t.name}</div>
                                            )}
                                        </td>
                                        <td className="p-8">
                                            <input type="text" className="w-full p-2 bg-slate-50 rounded-xl border-none font-bold text-slate-600 text-sm" value={assignment} onChange={e => updateWeekData(currentWeek, { assignments: { ...assignments, [t.id]: e.target.value } })}/>
                                        </td>
                                        <td className="p-8 text-center font-black text-slate-800 text-2xl">{tkbCount}</td>
                                        <td className="p-8">
                                            <input type="number" step="0.5" className="w-20 mx-auto block text-center p-2 bg-orange-50 border-2 border-orange-100 rounded-xl font-black text-orange-700" value={log.bu || 0} onChange={e => updateLog(t.id, 'bu', parseFloat(e.target.value) || 0)}/>
                                        </td>
                                        <td className="p-8">
                                            <input type="number" step="0.5" className="w-20 mx-auto block text-center p-2 bg-orange-50 border-2 border-orange-100 rounded-xl font-black text-orange-700" value={log.tang || 0} onChange={e => updateLog(t.id, 'tang', parseFloat(e.target.value) || 0)}/>
                                        </td>
                                        <td className="p-8 text-right">
                                            <div className="flex justify-end gap-2">
                                                {isEditing ? (
                                                    <button onClick={saveEdit} className="text-emerald-500 p-2"><Check/></button>
                                                ) : (
                                                    <>
                                                        <button onClick={() => startEditing(t)} className="text-slate-200 hover:text-blue-500 p-2"><Edit3 size={18}/></button>
                                                        <button onClick={() => {
                                                            if(confirm("Xóa GV khỏi tuần " + currentWeek + "?")) {
                                                                updateWeekData(currentWeek, { 
                                                                    teachers: teachers.filter((x: any) => x.id !== t.id),
                                                                    assignments: { ...assignments, [t.id]: undefined },
                                                                    logs: { ...logs, [t.id]: undefined }
                                                                });
                                                            }
                                                        }} className="text-slate-200 hover:text-red-500 p-2"><Trash2 size={18}/></button>
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

    // --- TAB THỰC DẠY (DẢI TUẦN) ---
    const WeeklyTab = () => {
        const stats = useMemo(() => {
            const allTeacherIds = new Set<string>();
            for (let i = startRange; i <= endRange; i++) {
                const w = data.weeklyRecords[i];
                if (w) w.teachers.forEach((t: any) => allTeacherIds.add(t.id));
            }

            return Array.from(allTeacherIds).map(id => {
                let totalTKB = 0;
                let totalBu = 0;
                let totalTang = 0;
                let name = "N/A";

                for (let i = startRange; i <= endRange; i++) {
                    const w = data.weeklyRecords[i];
                    if (w) {
                        const tInWeek = w.teachers.find((tx: any) => tx.id === id);
                        if (tInWeek) {
                            name = tInWeek.name;
                            const log = (w.logs || {})[id];
                            if (log) {
                                totalTKB += (log.actual ?? getTKBPeriods(w.assignments[id] || ""));
                                totalBu += (log.bu || 0);
                                totalTang += (log.tang || 0);
                            } else {
                                totalTKB += getTKBPeriods(w.assignments[id] || "");
                            }
                        }
                    }
                }
                return { name, totalTKB, totalBu, totalTang, totalAll: totalTKB + totalBu + totalTang };
            }).filter(s => s.name !== "N/A");
        }, [data, startRange, endRange]);

        return (
            <div className="p-8">
                <div className="flex justify-between items-center mb-12">
                    <div className="flex items-center gap-6 bg-white border-2 border-slate-100 p-6 rounded-[3rem] shadow-sm">
                        <div className="flex items-center gap-4">
                            <label className="text-[10px] font-black uppercase text-blue-500 tracking-widest">Từ tuần</label>
                            <input type="number" value={startRange} onChange={e => setStartRange(Math.max(1, parseInt(e.target.value) || 1))} className="w-16 p-3 bg-slate-50 rounded-xl font-black text-center text-xl"/>
                        </div>
                        <ChevronRight className="text-slate-300" />
                        <div className="flex items-center gap-4">
                            <label className="text-[10px] font-black uppercase text-blue-500 tracking-widest">Đến tuần</label>
                            <input type="number" value={endRange} onChange={e => setEndRange(Math.max(startRange, parseInt(e.target.value) || 1))} className="w-16 p-3 bg-slate-50 rounded-xl font-black text-center text-xl"/>
                        </div>
                        <div className="ml-6 px-6 py-2 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase">
                            Tổng {endRange - startRange + 1} tuần
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-[4rem] border-2 border-slate-50 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400">
                            <tr>
                                <th className="p-10 w-1/4">Giáo viên</th>
                                <th className="p-10 text-center">Tổng Tiết TKB</th>
                                <th className="p-10 text-center text-orange-600">Tổng Bù</th>
                                <th className="p-10 text-center text-orange-600">Tổng Tăng tiết</th>
                                <th className="p-10 text-center bg-blue-50/50">Tổng thực dạy</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.map((s: any, i: number) => (
                                <tr key={i} className="border-b hover:bg-slate-50/50 transition-all">
                                    <td className="p-10 font-black text-slate-700 text-2xl">{s.name}</td>
                                    <td className="p-10 text-center font-black text-slate-500 text-3xl">{s.totalTKB.toFixed(1)}</td>
                                    <td className="p-10 text-center font-black text-orange-600 text-3xl">{s.totalBu.toFixed(1)}</td>
                                    <td className="p-10 text-center font-black text-orange-600 text-3xl">{s.totalTang.toFixed(1)}</td>
                                    <td className="p-10 text-center bg-blue-50/20">
                                        <div className="text-5xl font-black text-blue-600 tracking-tighter">{s.totalAll.toFixed(1)}</div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    // --- TAB BÁO CÁO (CHUYÊN SÂU) ---
    const ReportTab = () => {
        const [reportWeeks, setReportWeeks] = useState(4);
        
        const stats = useMemo(() => {
            const allTeacherIds = new Set<string>();
            for (let i = 1; i <= reportWeeks; i++) {
                const w = data.weeklyRecords[i];
                if (w) w.teachers.forEach((t: any) => allTeacherIds.add(t.id));
            }

            return Array.from(allTeacherIds).map(id => {
                let totalQuota = 0, totalActual = 0, totalExtra = 0, name = "N/A", lastQ = 0;
                for (let i = 1; i <= reportWeeks; i++) {
                    const w = data.weeklyRecords[i];
                    if (w) {
                        const tInWeek = w.teachers.find((tx: any) => tx.id === id);
                        if (tInWeek) {
                            name = tInWeek.name;
                            const q = Math.max(0, data.standardQuota - getTeacherReduction(tInWeek.roles));
                            totalQuota += q; lastQ = q;
                            const log = (w.logs || {})[id];
                            if (log) {
                                totalActual += (log.actual ?? getTKBPeriods(w.assignments[id] || ""));
                                totalExtra += (log.bu || 0) + (log.tang || 0);
                            } else {
                                totalActual += getTKBPeriods(w.assignments[id] || "");
                            }
                        }
                    }
                }
                const total = totalActual + totalExtra;
                return { name, lastQ, totalQuota, totalActual, totalExtra, total, balance: total - totalQuota };
            }).filter(s => s.name !== "N/A");
        }, [data, reportWeeks]);

        return (
            <div className="p-8 animate-fadeIn">
                <div className="flex justify-between items-end mb-12">
                    <div>
                        <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Quyết toán Tiết dạy & Dôi dư</h2>
                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest flex items-center gap-2 mt-1">Lũy kế từ tuần 1 đến tuần {reportWeeks}</p>
                    </div>
                    <div className="bg-slate-100 p-3 rounded-[2rem] flex items-center gap-4">
                        <span className="text-[10px] font-black text-slate-400 ml-4 uppercase">Xem đến tuần:</span>
                        <input type="number" value={reportWeeks} onChange={e => setReportWeeks(parseInt(e.target.value) || 1)} className="w-20 p-3 bg-white rounded-xl text-center font-black text-blue-600"/>
                    </div>
                </div>
                <div className="bg-white rounded-[3.5rem] border-2 border-slate-50 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400">
                            <tr>
                                <th className="p-8">Giáo viên</th>
                                <th className="p-8 text-center">Định mức</th>
                                <th className="p-8 text-center">Thực dạy</th>
                                <th className="p-8 text-center text-orange-600">Bù/Tăng</th>
                                <th className="p-8 text-center bg-blue-50/30">Tổng Lũy kế</th>
                                <th className="p-8 text-center bg-slate-100">Chênh lệch</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.map((s: any, i: number) => (
                                <tr key={i} className="border-b hover:bg-slate-50/50 transition-all">
                                    <td className="p-8"><div className="font-black text-slate-700 text-xl">{s.name}</div><div className="text-[9px] font-bold text-slate-300 uppercase mt-1">ĐM: {s.lastQ}t/tuần</div></td>
                                    <td className="p-8 text-center font-black text-slate-400">{s.totalQuota.toFixed(1)}</td>
                                    <td className="p-8 text-center font-black text-slate-800 text-xl">{s.totalActual.toFixed(1)}</td>
                                    <td className="p-8 text-center font-black text-orange-600 text-xl">+{s.totalExtra.toFixed(1)}</td>
                                    <td className="p-8 text-center font-black text-3xl text-blue-700 bg-blue-50/10">{s.total.toFixed(1)}</td>
                                    <td className={`p-8 text-center text-3xl font-black ${s.balance >= 0 ? 'text-emerald-600 bg-emerald-50/25' : 'text-red-500 bg-red-50/25'}`}>{s.balance > 0 ? `+${s.balance.toFixed(1)}` : s.balance.toFixed(1)}</td>
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
                        <h1 className="font-black text-3xl tracking-tighter text-slate-800 uppercase italic">THCS PRO <span className="text-blue-600 text-sm align-top italic font-black">v6.2</span></h1>
                    </div>
                    <nav className="flex gap-2 bg-slate-100 p-2 rounded-[2.5rem] overflow-x-auto no-scrollbar">
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
                    {activeTab === 'config' && (
                        <div className="p-10 animate-fadeIn">
                            <h2 className="text-3xl font-black mb-10 text-slate-800 uppercase italic">Cấu hình chuẩn</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Định mức THCS (Tiết/Tuần)</label>
                                    <input type="number" value={data.standardQuota} onChange={e => updateData({standardQuota: parseFloat(e.target.value) || 0})} className="text-8xl font-black text-blue-600 bg-transparent outline-none w-full tracking-tighter"/>
                                </div>
                                <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100 max-h-[500px] overflow-y-auto">
                                    <h3 className="font-black text-slate-700 uppercase text-xs mb-6 tracking-widest flex items-center gap-3"><Book size={18}/> Định mức môn học</h3>
                                    {data.subjectConfigs.map((s: any, i: number) => (
                                        <div key={i} className="flex justify-between items-center py-4 border-b border-slate-100 last:border-0">
                                            <span className="font-black text-slate-600 uppercase text-[11px]">{s.name}</span>
                                            <input type="number" step="0.5" className="w-20 p-3 bg-white rounded-xl text-center font-black text-blue-600 border border-slate-200" value={s.periods} onChange={e => {
                                                const nc = [...data.subjectConfigs]; nc[i].periods = parseFloat(e.target.value) || 0; updateData({subjectConfigs: nc});
                                            }}/>
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
                <div className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-12 py-6 rounded-[3rem] shadow-2xl flex items-center gap-4 animate-fadeIn font-black text-sm z-[100] border-2 border-white/10">
                    <CheckCircle2 size={24} className="text-emerald-400" />
                    {syncStatus.message}
                </div>
            )}
        </div>
    );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
