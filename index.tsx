
import React, { useState, useEffect, useMemo, useRef, memo } from 'react';
import ReactDOM from 'react-dom/client';
import { 
    LayoutDashboard, Users, CalendarDays, FileText, Settings, 
    Trash2, Edit3, Check, X, FileUp, ChevronLeft, ChevronRight, 
    RefreshCw, Cloud, CloudUpload, CloudDownload, Save, 
    CheckCircle2, AlertTriangle, ShieldCheck, TrendingUp, BookOpen, Download, Upload,
    ClipboardCheck, Copy, Plus, FileSpreadsheet, UserPlus, Hash, Book, ChevronDown,
    AlertCircle, Info, Briefcase, Award, CopyCheck, Square, CheckSquare
} from 'lucide-react';

// --- CẤU HÌNH HỆ THỐNG ---
const STORAGE_KEY = 'thcs_mgmt_v4_weekly_final_pro';

const DEFAULT_SUBJECT_CONFIGS = [
    { name: 'Toán', periods: 4 },
    { name: 'Ngữ văn', periods: 4 },
    { name: 'Tiếng Anh', periods: 3 },
    { name: 'Vật lý', periods: 1 },
    { name: 'Hóa học', periods: 2 },
    { name: 'Sinh học', periods: 2 },
    { name: 'Lịch sử', periods: 1.5 },
    { name: 'Địa lý', periods: 1.5 },
    { name: 'GDCD', periods: 1 },
    { name: 'Tin học', periods: 1 },
    { name: 'Công nghệ', periods: 1 },
    { name: 'Thể dục', periods: 2 },
    { name: 'Nhạc - Họa', periods: 1 },
    { name: 'HĐTN - HN', periods: 3 }
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
        return teacherRoles.reduce((sum, roleName) => {
            const r = data.roles.find((x: any) => x.name === roleName);
            return sum + (r ? r.reduction : 0);
        }, 0);
    };

    // --- TAB PHÂN CÔNG (HÀNG TUẦN VỚI TÍNH NĂNG CHỌN GV) ---
    const TeacherTab = () => {
        const [isAdding, setIsAdding] = useState(false);
        const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
        const fileRef = useRef<HTMLInputElement>(null);
        const currentAssignments = data.weeklyAssignments[currentWeek] || {};

        const toggleSelectAll = () => {
            if (selectedTeacherIds.length === data.teachers.length) {
                setSelectedTeacherIds([]);
            } else {
                setSelectedTeacherIds(data.teachers.map((t: any) => t.id));
            }
        };

        const toggleSelectTeacher = (id: string) => {
            setSelectedTeacherIds(prev => 
                prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
            );
        };

        const copyFromPreviousSelective = () => {
            if (currentWeek <= 1) return alert("Đây là tuần đầu tiên!");
            const prev = data.weeklyAssignments[currentWeek - 1];
            if (!prev || Object.keys(prev).length === 0) return alert("Tuần trước chưa có dữ liệu!");
            if (selectedTeacherIds.length === 0) return alert("Vui lòng chọn ít nhất một giáo viên để sao chép!");

            const newCurrent = { ...currentAssignments };
            let count = 0;
            selectedTeacherIds.forEach(id => {
                if (prev[id]) {
                    newCurrent[id] = prev[id];
                    count++;
                }
            });

            updateData({ 
                weeklyAssignments: { 
                    ...data.weeklyAssignments, 
                    [currentWeek]: newCurrent 
                } 
            });
            setSyncStatus({ message: `Đã sao chép phân công cho ${count} giáo viên`, type: 'success' });
            setTimeout(() => setSyncStatus({ message: '', type: '' }), 3000);
            setSelectedTeacherIds([]); // Reset selection
        };

        const updateTeacherAssignment = (teacherId: string, val: string) => {
            updateData({
                weeklyAssignments: {
                    ...data.weeklyAssignments,
                    [currentWeek]: { ...currentAssignments, [teacherId]: val }
                }
            });
        };

        return (
            <div className="p-8 animate-fadeIn">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-12">
                    <div className="flex items-center gap-6 bg-white border-2 border-slate-100 p-4 rounded-[2.5rem] shadow-sm">
                        <button onClick={() => setCurrentWeek(Math.max(1, currentWeek-1))} className="p-4 hover:bg-slate-100 rounded-2xl transition-colors"><ChevronLeft/></button>
                        <div className="px-10 text-center">
                            <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">QUẢN LÝ PHÂN CÔNG</div>
                            <div className="text-4xl font-black tracking-tighter">Tuần {currentWeek}</div>
                        </div>
                        <button onClick={() => setCurrentWeek(currentWeek+1)} className="p-4 hover:bg-slate-100 rounded-2xl transition-colors"><ChevronRight/></button>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {selectedTeacherIds.length > 0 && (
                            <button onClick={copyFromPreviousSelective} className="bg-emerald-50 text-emerald-600 border-2 border-emerald-100 px-8 py-4 rounded-2xl flex items-center gap-3 font-bold hover:bg-emerald-100 transition-all animate-fadeIn">
                                <CopyCheck size={20}/> Sao chép cho {selectedTeacherIds.length} GV
                            </button>
                        )}
                        <button onClick={() => setIsAdding(!isAdding)} className="bg-blue-600 text-white px-8 py-4 rounded-2xl flex items-center gap-3 font-bold shadow-xl hover:bg-blue-700 transition-all">
                            <UserPlus size={20}/> {isAdding ? 'Đóng form' : 'Thêm GV'}
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-[3.5rem] border-2 border-slate-50 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400">
                            <tr>
                                <th className="p-8 w-20 text-center">
                                    <button onClick={toggleSelectAll} className="text-slate-300 hover:text-blue-500 transition-colors">
                                        {selectedTeacherIds.length === data.teachers.length && data.teachers.length > 0 ? <CheckSquare size={24} className="text-blue-600"/> : <Square size={24}/>}
                                    </button>
                                </th>
                                <th className="p-8">Giáo viên & Kiêm nhiệm</th>
                                <th className="p-8">Phân công dạy (TKB Tuần {currentWeek})</th>
                                <th className="p-8 text-center">Tiết TKB</th>
                                <th className="p-8"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.teachers.map((t: any) => {
                                const assignment = currentAssignments[t.id] || "";
                                const tkbPeriods = getTKBPeriods(assignment);
                                const isSelected = selectedTeacherIds.includes(t.id);
                                return (
                                    <tr key={t.id} className={`border-b group hover:bg-slate-50/50 transition-all ${isSelected ? 'bg-blue-50/30' : ''}`}>
                                        <td className="p-8 text-center">
                                            <button onClick={() => toggleSelectTeacher(t.id)} className="text-slate-300 hover:text-blue-500 transition-colors">
                                                {isSelected ? <CheckSquare size={22} className="text-blue-600"/> : <Square size={22}/>}
                                            </button>
                                        </td>
                                        <td className="p-8">
                                            <div className="font-black text-slate-800 text-xl mb-2">{t.name}</div>
                                            <div className="flex flex-wrap gap-1">
                                                {t.roles.map((r: string) => (
                                                    <span key={r} className="bg-white text-blue-500 text-[8px] font-black px-2 py-0.5 rounded border border-blue-50 uppercase shadow-sm">{r}</span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="p-8">
                                            <input 
                                                type="text" 
                                                placeholder="VD: Toán: 6A1, 6A2; Tin: 7A3"
                                                className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-slate-600 focus:ring-2 focus:ring-blue-500 transition-all shadow-inner"
                                                value={assignment}
                                                onChange={e => updateTeacherAssignment(t.id, e.target.value)}
                                            />
                                        </td>
                                        <td className="p-8 text-center font-black text-slate-800 text-2xl">{tkbPeriods}</td>
                                        <td className="p-8 text-right">
                                            <button onClick={() => updateData({ teachers: data.teachers.filter((x: any) => x.id !== t.id) })} className="text-slate-200 hover:text-red-500 p-2 transition-colors"><Trash2 size={20}/></button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {data.teachers.length === 0 && <div className="p-32 text-center text-slate-200 font-black italic uppercase tracking-widest">Danh sách giáo viên trống</div>}
                </div>
            </div>
        );
    };

    // --- TAB TIẾT DẠY (NHẬP TUẦN) ---
    const WeeklyTab = () => {
        const [tempLogs, setTempLogs] = useState(data.weeklyData[currentWeek] || {});
        useEffect(() => { setTempLogs(data.weeklyData[currentWeek] || {}); }, [currentWeek, data.weeklyData]);

        return (
            <div className="p-8">
                <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
                    <div className="flex items-center gap-6 bg-white border-2 border-slate-100 p-4 rounded-[2.5rem] shadow-sm">
                        <button onClick={() => setCurrentWeek(Math.max(1, currentWeek-1))} className="p-4 hover:bg-slate-100 rounded-2xl"><ChevronLeft/></button>
                        <div className="px-10 text-center"><div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">GHI NHẬN THỰC DẠY</div><div className="text-4xl font-black tracking-tighter">Tuần {currentWeek}</div></div>
                        <button onClick={() => setCurrentWeek(currentWeek+1)} className="p-4 hover:bg-slate-100 rounded-2xl"><ChevronRight/></button>
                    </div>
                    <button onClick={() => { updateData({ weeklyData: {...data.weeklyData, [currentWeek]: tempLogs} }); setSyncStatus({message: 'Đã lưu tuần '+currentWeek, type: 'success'}); setTimeout(()=>setSyncStatus({message:'',type:''}),2000); }} className="bg-blue-600 text-white px-12 py-5 rounded-[2rem] font-black shadow-xl hover:bg-blue-700 transition-all active:scale-95">LƯU DỮ LIỆU</button>
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
                                    <td className="p-10 text-slate-400 font-bold italic">{data.weeklyAssignments[currentWeek]?.[t.id] || "Chưa phân công"}</td>
                                    <td className="p-10"><input type="number" step="0.5" className="w-40 mx-auto block text-center p-8 bg-emerald-50 rounded-[2.5rem] font-black text-5xl text-emerald-700 outline-none shadow-inner border-2 border-transparent focus:border-emerald-200 transition-all" value={tempLogs[t.id] || 0} onChange={e => setTempLogs({...tempLogs, [t.id]: parseFloat(e.target.value) || 0})}/></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    // --- TAB BÁO CÁO (ĐỒNG BỘ DỮ LIỆU ĐA TẦNG) ---
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
                        <h2 className="text-3xl font-black text-slate-800 tracking-tighter mb-4">Quyết toán Tiết dạy & Dôi dư</h2>
                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest flex items-center gap-2"><CheckCircle2 size={14} className="text-blue-500"/> Dữ liệu tự động cập nhật khi thay đổi Phân công & Tiết dạy</p>
                    </div>
                    <div className="bg-slate-100 p-3 rounded-[2rem] flex items-center gap-4 border border-slate-200 shadow-sm">
                        <span className="text-[10px] font-black text-slate-400 ml-4 uppercase">Tổng hợp:</span>
                        <input type="number" value={weeks} onChange={e => setWeeks(parseInt(e.target.value) || 1)} className="w-16 p-3 bg-white rounded-xl text-center font-black text-blue-600 outline-none shadow-sm"/>
                        <span className="text-[10px] font-black text-slate-400 mr-4 uppercase">TUẦN</span>
                    </div>
                </div>
                <div className="bg-white rounded-[3.5rem] border-2 border-slate-50 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400">
                            <tr>
                                <th className="p-8">Giáo viên</th>
                                <th className="p-8 text-center">Giảm tiết</th>
                                <th className="p-8 text-center">Định mức thực/Tuần</th>
                                <th className="p-8 text-center">Tổng định mức ({weeks}t)</th>
                                <th className="p-8 text-center text-blue-600">Tổng thực dạy</th>
                                <th className="p-8 text-center bg-blue-50/50">Dôi dư</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.map((s: any, i: number) => (
                                <tr key={i} className="border-b hover:bg-slate-50/50 transition-all">
                                    <td className="p-8 font-black text-slate-700 text-xl">{s.name}</td>
                                    <td className="p-8 text-center text-blue-400 font-black">-{s.reduction}</td>
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
            <h2 className="text-3xl font-black mb-10 text-slate-800 tracking-tighter">Cấu hình Cơ bản</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-10">
                    <div className="bg-white p-10 rounded-[3.5rem] border-2 border-slate-100 shadow-sm">
                        <label className="block text-[11px] font-black text-slate-400 uppercase mb-5 tracking-widest">Định mức chuẩn (Tiết/Tuần)</label>
                        <input type="number" value={data.standardQuota} onChange={e => updateData({standardQuota: parseFloat(e.target.value)})} className="text-8xl font-black text-blue-600 outline-none w-full bg-transparent tracking-tighter"/>
                    </div>
                    <div className="bg-white p-10 rounded-[3.5rem] border-2 border-slate-100 shadow-sm">
                        <h3 className="font-black text-slate-700 uppercase text-xs tracking-widest mb-8 flex items-center gap-3"><Briefcase className="text-blue-500"/> Chức vụ & Giảm tiết</h3>
                        <div className="space-y-4">
                            {data.roles.map((r: any, i: number) => (
                                <div key={r.id} className="flex justify-between items-center py-4 border-b border-slate-50">
                                    <span className="font-black text-slate-600 uppercase text-[11px]">{r.name}</span>
                                    <div className="flex items-center gap-4">
                                        <span className="text-[10px] font-black text-slate-300">GIẢM</span>
                                        <input type="number" className="w-16 p-2 bg-slate-50 rounded-xl text-center font-black text-blue-600" value={r.reduction} onChange={e => {
                                            const nr = [...data.roles]; nr[i].reduction = parseFloat(e.target.value); updateData({roles: nr});
                                        }}/>
                                        <button onClick={() => updateData({roles: data.roles.filter((x: any) => x.id !== r.id)})} className="text-slate-200 hover:text-red-400"><X size={16}/></button>
                                    </div>
                                </div>
                            ))}
                            <button onClick={() => updateData({roles: [...data.roles, {id: Date.now().toString(), name: 'Việc mới', reduction: 0}]})} className="w-full p-4 border-2 border-dashed border-slate-100 rounded-2xl text-[10px] font-black text-slate-300 uppercase hover:border-blue-200 hover:text-blue-400">+ Thêm việc mới</button>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-10 rounded-[3.5rem] border-2 border-slate-100 shadow-sm flex flex-col">
                   <h3 className="font-black text-slate-700 uppercase text-xs tracking-widest mb-8 flex items-center gap-3"><Book className="text-blue-500"/> Số tiết/Môn học (Theo khối)</h3>
                   <div className="space-y-4 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
                       {data.subjectConfigs.map((s: any, i: number) => (
                           <div key={i} className="flex justify-between items-center py-4 border-b border-slate-50 group hover:bg-slate-50 rounded-2xl px-4 transition-all">
                               <span className="font-black text-slate-600 uppercase text-[11px]">{s.name}</span>
                               <input type="number" step="0.5" className="w-20 p-3 bg-slate-100 rounded-xl text-center font-black text-blue-600 outline-none focus:ring-2 focus:ring-blue-100" value={s.periods} onChange={e => {
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
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            <header className="bg-white border-b-2 border-slate-100 p-6 sticky top-0 z-50 shadow-sm">
                <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-5">
                        <div className="bg-blue-600 p-4 rounded-[1.5rem] text-white shadow-2xl rotate-3"><LayoutDashboard size={32}/></div>
                        <h1 className="font-black text-3xl tracking-tighter text-slate-800 uppercase">THCS PRO <span className="text-blue-600 text-sm align-top italic">v5.1</span></h1>
                    </div>
                    <nav className="flex gap-2 bg-slate-100 p-2 rounded-[2.5rem] overflow-x-auto no-scrollbar max-w-full">
                        {[
                            {id: 'config', icon: Settings, label: 'Cài đặt'},
                            {id: 'teachers', icon: Users, label: 'Phân công'},
                            {id: 'weekly', icon: CalendarDays, label: 'Tiết dạy'},
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
                <div className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-12 py-6 rounded-[3rem] shadow-2xl flex items-center gap-4 animate-fadeIn font-black text-sm z-[100] border-2 border-white/10">
                    <CheckCircle2 size={24} className="text-emerald-400" />
                    {syncStatus.message}
                </div>
            )}
        </div>
    );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
