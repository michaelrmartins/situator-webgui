"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import { ShieldAlert, Fingerprint, CalendarDays, Loader2, Info, Users, Download, BookOpen, Building2, FileText, X, User, Clock } from 'lucide-react';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface StudentData {
  nome_curso: string | null;
  nome_serie: string | null;
}

interface EmployeeData {
  departamento: string;
}

const toTitleCase = (str: string) =>
  str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

export default function LogsPage() {
  const [dateRange, setDateRange] = useState({
    start: startOfDay(new Date()),
    end: endOfDay(new Date())
  });
  const [activeDateFilter, setActiveDateFilter] = useState(0);

  const [authData, setAuthData] = useState<any[]>([]);
  const [rfidData, setRfidData] = useState<any[]>([]);
  const [noRfidData, setNoRfidData] = useState<any[]>([]);
  const [filterType, setFilterType] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Modal States
  const [selectedPerson, setSelectedPerson] = useState<any | null>(null);
  const [personHistory, setPersonHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Lyceum Student Data Cache
  const studentDataCache = useRef<Record<string, StudentData | null>>({});
  const [studentDataMap, setStudentDataMap] = useState<Record<string, StudentData>>({});

  // Nasajon Employee Data Cache
  const employeeDataCache = useRef<Record<string, EmployeeData | null>>({});
  const [employeeDataMap, setEmployeeDataMap] = useState<Record<string, EmployeeData>>({});

  // AbortController to cancel all in-flight requests on unmount
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortControllerRef.current = new AbortController();
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const getSignal = () => abortControllerRef.current?.signal;

  const fetchStudentData = useCallback(async (document: string) => {
    if (!document || document in studentDataCache.current) return;
    studentDataCache.current[document] = null; // mark as in-flight
    try {
      const res = await fetch(`/api/lyceum?document=${encodeURIComponent(document)}`, { cache: 'no-store', signal: getSignal() });
      if (res.status === 204 || !res.ok) return;
      const data: StudentData = await res.json();
      studentDataCache.current[document] = data;
      setStudentDataMap(prev => ({ ...prev, [document]: data }));
    } catch (e: any) { if (e.name !== 'AbortError') console.log('Lyceum unavailable'); }
  }, []);

  const fetchEmployeeData = useCallback(async (document: string) => {
    if (!document || document in employeeDataCache.current) return;
    employeeDataCache.current[document] = null; // mark as in-flight
    try {
      const res = await fetch(`/api/nasajon?document=${encodeURIComponent(document)}`, { cache: 'no-store', signal: getSignal() });
      if (res.status === 204 || !res.ok) return;
      const data: EmployeeData = await res.json();
      employeeDataCache.current[document] = data;
      setEmployeeDataMap(prev => ({ ...prev, [document]: data }));
    } catch (e: any) { if (e.name !== 'AbortError') console.log('Nasajon unavailable'); }
  }, []);

  const fetchLogs = async (silent = false) => {
    if (!silent) setIsLoading(true);
    if (!silent) setError(null);
    try {
      const startMs = dateRange.start.getTime();
      const endMs = dateRange.end.getTime();

      const [authRes, rfidRes, noRfidRes] = await Promise.all([
        fetch(`/api/reports?type=auth&start=${startMs}&end=${endMs}`, { cache: 'no-store', signal: getSignal() }),
        fetch(`/api/reports?type=rfid&start=${startMs}&end=${endMs}`, { cache: 'no-store', signal: getSignal() }),
        fetch(`/api/reports?type=no-rfid&start=${startMs}&end=${endMs}`, { cache: 'no-store', signal: getSignal() })
      ]);

      if (!authRes.ok || !rfidRes.ok || !noRfidRes.ok) throw new Error('Failed to fetch data');

      setAuthData(await authRes.json());
      setRfidData(await rfidRes.json());
      setNoRfidData(await noRfidRes.json());
    } catch (err: any) {
      if (err.name !== 'AbortError' && !silent) setError(err.message);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const fetchPersonHistory = async (id: string | number) => {
    setLoadingHistory(true);
    setPersonHistory([]);
    try {
      const res = await fetch(`/api/person-history?id=${id}&limit=10`, { cache: 'no-store', signal: getSignal() });
      if (res.ok) {
        setPersonHistory(await res.json());
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchLogs();

    // Auto-reload data every 5 seconds
    const interval = setInterval(() => {
      fetchLogs(true);
    }, 5000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  useEffect(() => {
    let cancelled = false;
    const fetchExtras = async () => {
      for (const person of noRfidData) {
        if (cancelled) break;
        const typeLower = String(person.PersonType || '').toLowerCase();
        const isStudent = typeLower.includes('aluno') || typeLower.includes('estudante') || typeLower.includes('student') || typeLower === '2';
        const document = person.Matricula;
        if (isStudent && document) {
          await fetchStudentData(document);
        } else if (!isStudent && document) {
          await fetchEmployeeData(document);
        }
      }
    };
    fetchExtras();
    return () => { cancelled = true; };
  }, [noRfidData, fetchStudentData, fetchEmployeeData]);

  const handleDateChange = (daysAgo: number) => {
    setActiveDateFilter(daysAgo);
    const start = startOfDay(subDays(new Date(), daysAgo));
    const end = endOfDay(new Date());
    setDateRange({ start, end });
  };

  const authChartOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', backgroundColor: 'rgba(15, 23, 42, 0.9)', textStyle: { color: '#f8fafc' } },
    legend: { bottom: '5%', left: 'center', textStyle: { color: '#94a3b8' } },
    series: [{
      name: 'Authorizations',
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 10, borderColor: 'rgba(15,23,42,0.8)', borderWidth: 2 },
      label: { show: false, position: 'center' },
      emphasis: { label: { show: true, fontSize: 20, fontWeight: 'bold', color: '#fff' } },
      labelLine: { show: false },
      data: authData.map((d: any) => ({
        value: parseInt(d.Count),
        name: d.Authorized === true ? 'Authorized' : 'Unauthorized',
        itemStyle: { color: d.Authorized === true ? '#10b981' : '#f43f5e' }
      }))
    }]
  };

  const rfidChartOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', backgroundColor: 'rgba(15, 23, 42, 0.9)', textStyle: { color: '#f8fafc' } },
    legend: { bottom: '5%', left: 'center', textStyle: { color: '#94a3b8' } },
    series: [{
      name: 'RFID Context',
      type: 'pie',
      radius: '70%',
      itemStyle: { borderRadius: 10, borderColor: 'rgba(15,23,42,0.8)', borderWidth: 2 },
      data: rfidData.map((d: any) => ({
        value: parseInt(d.Count),
        name: d.RFIDStatus,
        itemStyle: { color: d.RFIDStatus === 'Present' ? '#3b82f6' : '#94a3b8' }
      }))
    }]
  };

  const filteredNoRfidData = noRfidData.filter((person: any) => {
    if (filterType === 'all') return true;
    const typeLower = String(person.PersonType || '').toLowerCase();
    const isStudent = typeLower.includes('aluno') || typeLower.includes('estudante') || typeLower.includes('student') || typeLower === '2';
    if (filterType === 'students') return isStudent;
    if (filterType === 'collaborators') return !isStudent;
    return true;
  });

  const handleExportCSV = () => {
    if (filteredNoRfidData.length === 0) return;

    // Headers
    const headers = ['Name', 'Registration'];

    // Rows
    const rows = filteredNoRfidData.map((person: any) => {
      // Wrap name in quotes to handle potential commas
      const name = `"${person.Name || ''}"`;
      const registration = `"${person.Matricula || 'N/A'}"`;
      return [name, registration].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Trigger download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `missing_rfid_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getBase64ImageFromUrl = async (imageUrl: string): Promise<string | null> => {
    try {
      const res = await fetch(`/api/proxy-image?url=${encodeURIComponent(imageUrl)}`);
      if (!res.ok) return null;
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  const handleExportPDF = async () => {
    if (filteredNoRfidData.length === 0) return;
    setIsExporting(true);

    try {
      const doc = new jsPDF();
      doc.text("Missing RFID Accesses", 14, 15);
      
      const head = [["Photo", "Name", "Registration", "Type / Details"]];
      const body: any[] = [];
      const cachedImages: Record<number, string> = {};

      for (let i = 0; i < filteredNoRfidData.length; i++) {
        const person = filteredNoRfidData[i];
        const typeLower = String(person.PersonType || '').toLowerCase();
        const isStudent = typeLower.includes('aluno') || typeLower.includes('estudante') || typeLower.includes('student') || typeLower === '2';
        
        let typeDetails = isStudent ? 'Student' : 'Employee';
        if (isStudent && person.Matricula && studentDataMap[person.Matricula]) {
          const studentInfo = [studentDataMap[person.Matricula].nome_curso, studentDataMap[person.Matricula].nome_serie].filter(Boolean).join(' - ');
          if (studentInfo) typeDetails += `\n${studentInfo}`;
        } else if (!isStudent && person.Matricula && employeeDataMap[person.Matricula]) {
          const employeeInfo = toTitleCase(employeeDataMap[person.Matricula].departamento);
          if (employeeInfo) typeDetails += `\n${employeeInfo}`;
        }

        body.push(["", person.Name, person.Matricula || 'N/A', typeDetails]);

        if (person.PersonImage) {
          const b64 = await getBase64ImageFromUrl(`http://192.168.56.101:8080/web_data/images/people/${person.PersonImage}/portrait.jpg`);
          if (b64) cachedImages[i] = b64;
        }
      }

      autoTable(doc, {
        head,
        body,
        startY: 20,
        styles: { fontSize: 10, cellPadding: 3 },
        bodyStyles: { minCellHeight: 18, valign: 'middle' },
        columnStyles: { 0: { cellWidth: 20 } },
        didDrawCell: (data) => {
          if (data.section === 'body' && data.column.index === 0) {
            const b64 = cachedImages[data.row.index];
            if (b64) {
              const x = data.cell.x + 2;
              const y = data.cell.y + 2;
              const w = 14;
              const h = 14;
              // using standard jsPDF properties
              doc.addImage(b64, 'JPEG', x, y, w, h);
            }
          }
        }
      });
      
      doc.save(`missing_rfid_records_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.pdf`);
    } catch (e) {
      console.error("PDF generation failed:", e);
      alert("Failed to construct PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-8 h-full flex flex-col overflow-y-auto">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent flex items-center gap-3 flex-wrap">
            <ShieldAlert className="text-blue-400" size={32} />
            Authorization & Verification Logs
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)] ml-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-emerald-400 font-bold tracking-wider uppercase text-[10px]">Live</span>
            </div>
          </h1>
          <p className="text-slate-400 mt-2">
            Analysis of unauthorized attempts and physical card presence. Auto-refreshing every 5 seconds.
          </p>
        </div>
        
        <div className="flex bg-slate-800/50 p-1 rounded-xl border border-white/5 backdrop-blur-md">
          <button onClick={() => handleDateChange(0)} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${activeDateFilter === 0 ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-white/10'}`}><CalendarDays size={16} /> Today</button>
          <button onClick={() => handleDateChange(7)} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeDateFilter === 7 ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-white/10'}`}>7 Days</button>
          <button onClick={() => handleDateChange(30)} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeDateFilter === 30 ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-white/10'}`}>30 Days</button>
        </div>
      </div>

      {error ? (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
           {error}
        </div>
      ) : (
        <>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6 rounded-2xl relative shadow-lg">
            <h3 className="text-lg font-semibold text-slate-200 mb-2 flex items-center gap-2">
               <ShieldAlert size={20} className="text-emerald-400" />
               Validation Distribution
            </h3>
            <p className="text-sm text-slate-400 mb-8 max-w-sm">Ratio of successfully authorized accesses vs denied attempts traversing the doors.</p>
            {isLoading ? (
               <div className="h-[300px] flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>
            ) : (
               <ReactECharts option={authChartOption} style={{ height: '300px' }} theme="dark" />
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel p-6 rounded-2xl relative shadow-lg">
            <h3 className="text-lg font-semibold text-slate-200 mb-2 flex items-center gap-2">
               <Fingerprint size={20} className="text-blue-400" />
               RFID Card Usage
            </h3>
            <p className="text-sm text-slate-400 mb-8 max-w-sm">Proportion of accesses where physical RFID credentials were present compared to alternative methods.</p>
            {isLoading ? (
               <div className="h-[300px] flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>
            ) : (
               <ReactECharts option={rfidChartOption} style={{ height: '300px' }} theme="dark" />
            )}
          </motion.div>
        </div>
        
        <div className="mt-8 glass-panel p-6 rounded-2xl relative shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                 <Users size={20} className="text-purple-400" />
                 Missing RFID Accesses
              </h3>
              <p className="text-sm text-slate-400">People who accessed without a registered RFID card.</p>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={handleExportPDF}
                disabled={filteredNoRfidData.length === 0 || isLoading || isExporting}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-600/20 text-red-400 hover:bg-red-600/30 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed border border-red-500/20 rounded-lg text-sm font-medium transition-all"
              >
                {isExporting ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                Export PDF
              </button>

              <button 
                onClick={handleExportCSV}
                disabled={filteredNoRfidData.length === 0 || isLoading}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed border border-blue-500/20 rounded-lg text-sm font-medium transition-all"
              >
                <Download size={16} />
                Export CSV
              </button>

              <select 
                value={filterType} 
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-slate-800/50 border border-white/10 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 backdrop-blur-md outline-none shrink-0"
              >
                <option value="all">All</option>
                <option value="collaborators">Collaborators</option>
                <option value="students">Students</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-300">
              <thead className="text-xs text-slate-400 uppercase bg-slate-800/50">
                <tr>
                  <th scope="col" className="px-6 py-2 rounded-tl-lg">Photo</th>
                  <th scope="col" className="px-6 py-2">Name</th>
                  <th scope="col" className="px-6 py-2">Registration</th>
                  <th scope="col" className="px-6 py-2 rounded-tr-lg">Type & Details</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                      <div className="flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>
                    </td>
                  </tr>
                ) : filteredNoRfidData.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                      No missing RFID records found for this selection.
                    </td>
                  </tr>
                ) : (
                  filteredNoRfidData.map((person: any, idx) => {
                    const typeLower = String(person.PersonType || '').toLowerCase();
                    const isStudent = typeLower.includes('aluno') || typeLower.includes('estudante') || typeLower.includes('student') || typeLower === '2';
                    
                    return (
                      <tr 
                        key={person.PersonId || idx} 
                        onClick={() => {
                          if (person.PersonId) {
                            setSelectedPerson(person);
                            fetchPersonHistory(person.PersonId);
                          }
                        }}
                        className="border-b border-white/5 hover:bg-white/10 transition-colors cursor-pointer group"
                      >
                        <td className="px-6 py-2">
                           {person.PersonImage ? (
                             // eslint-disable-next-line @next/next/no-img-element
                             <img 
                               src={`http://192.168.56.101:8080/web_data/images/people/${person.PersonImage}/portrait.jpg`} 
                               alt={person.Name} 
                               className="w-8 h-8 rounded-full object-cover border border-white/10"
                               onError={(e) => {
                                 (e.target as HTMLImageElement).style.display = 'none';
                                 (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                               }}
                             />
                           ) : (
                             <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 border border-white/10 font-bold text-xs">
                               {person.Name?.[0] || '?'}
                             </div>
                           )}
                           <div className="hidden w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 border border-white/10 font-bold text-xs">
                             {person.Name?.[0] || '?'}
                           </div>
                        </td>
                        <td className="px-6 py-2 font-medium text-slate-200">{person.Name}</td>
                        <td className="px-6 py-2">{person.Matricula || 'N/A'}</td>
                        <td className="px-6 py-2">
                          <div className="flex items-center gap-2 flex-wrap">
                             <span className={`flex items-center px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${
                               isStudent
                               ? 'text-[#9b59b6] bg-[#9b59b6]/10 border border-[#9b59b6]/20'
                               : 'text-[#3498db] bg-[#3498db]/10 border border-[#3498db]/20'
                             }`}>
                               {isStudent ? 'Student' : 'Employee'}
                             </span>
                             {isStudent && person.Matricula && studentDataMap[person.Matricula] && (
                               <span className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold text-[#1abc9c] bg-[#1abc9c]/10 tracking-wide border border-[#1abc9c]/20">
                                 <BookOpen size={12} className="shrink-0" />
                                 {[studentDataMap[person.Matricula].nome_curso, studentDataMap[person.Matricula].nome_serie].filter(Boolean).join(' · ')}
                               </span>
                             )}
                             {!isStudent && person.Matricula && employeeDataMap[person.Matricula] && (
                               <span className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold text-[#3498db] bg-[#3498db]/10 tracking-wide border border-[#3498db]/20">
                                 <Building2 size={12} className="shrink-0" />
                                 {toTitleCase(employeeDataMap[person.Matricula].departamento)}
                               </span>
                             )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}
      
      <div className="mt-8 glass-panel p-6 rounded-2xl flex gap-4 items-start border-l-4 border-l-blue-500">
         <Info className="shrink-0 text-blue-400 mt-1" />
         <div>
            <h4 className="font-semibold text-slate-200 mb-1">About Data Interpretation</h4>
            <p className="text-slate-400 text-sm leading-relaxed">
               The unauthorized attempts usually reflect scenarios such as expired documents, improper zones, out-of-schedule accesses, or suspended access cards. The RFID usage pie chart shows whether the recorded events had a registered physical card number attached to the entity's identification pin inside the Situator configuration matrix.
            </p>
         </div>
      </div>

      {/* Person Details Modal */}
      <AnimatePresence>
        {selectedPerson && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedPerson(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative glass-panel w-full max-w-2xl max-h-[85vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl border-white/10"
            >
              <button
                onClick={(e) => { e.stopPropagation(); setSelectedPerson(null); }}
                className="absolute top-6 right-6 p-2 rounded-full bg-black/20 hover:bg-black/40 text-slate-300 hover:text-white transition-colors z-[110] backdrop-blur-md border border-white/10"
              >
                <X size={24} />
              </button>

              {/* Header with Photo */}
              <div className="shrink-0 p-8 border-b border-white/10 flex flex-col sm:flex-row items-center sm:items-start gap-8 bg-slate-800/40 relative overflow-hidden">
                <div className="shrink-0 relative z-10">
                  {selectedPerson.PersonImage ? (
                    <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-[#3498db]/30 shadow-[0_0_30px_rgba(0,0,0,0.5)] bg-slate-900">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`http://192.168.56.101:8080/web_data/images/people/${selectedPerson.PersonImage}/portrait.jpg`}
                        alt={selectedPerson.Name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      <div className="hidden absolute inset-0 bg-[#34495e] flex items-center justify-center text-white/50">
                        <User size={64} />
                      </div>
                    </div>
                  ) : (
                    <div className="w-40 h-40 rounded-full bg-[#34495e] flex items-center justify-center border-4 border-white/10 shadow-2xl text-white/50 relative z-10">
                      <User size={64} />
                    </div>
                  )}
                </div>

                <div className="flex-1 text-center sm:text-left pt-3 relative z-10">
                  <h2 className="text-2xl font-bold text-white mb-3 line-clamp-2">{selectedPerson.Name || 'Unidentified'}</h2>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-slate-300">
                    {(() => {
                      const typeLower = String(selectedPerson.PersonType || '').toLowerCase();
                      const isStudent = typeLower.includes('aluno') || typeLower.includes('estudante') || typeLower.includes('student') || typeLower === '2';
                      return (
                        <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold ${isStudent ? 'text-[#9b59b6] bg-[#9b59b6]/10 border border-[#9b59b6]/20' : 'text-[#3498db] bg-[#3498db]/10 border border-[#3498db]/20'}`}>
                          {isStudent ? <BookOpen size={16} /> : <Building2 size={16} />} 
                          {isStudent ? 'Student' : 'Employee'}
                        </span>
                      );
                    })()}
                    {selectedPerson.Matricula && (
                      <span className="text-sm px-3 py-1.5 bg-slate-700/50 rounded-lg text-slate-300 border border-white/5">
                        Registration: {selectedPerson.Matricula}
                      </span>
                    )}

                    {(() => {
                        const typeLower = String(selectedPerson.PersonType || '').toLowerCase();
                        const isStudent = typeLower.includes('aluno') || typeLower.includes('estudante') || typeLower.includes('student') || typeLower === '2';
                        
                        if (isStudent && selectedPerson.Matricula && studentDataMap[selectedPerson.Matricula]) {
                            const info = [studentDataMap[selectedPerson.Matricula].nome_curso, studentDataMap[selectedPerson.Matricula].nome_serie].filter(Boolean).join(' · ');
                            if (info) {
                                return (
                                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-[#1abc9c] bg-[#1abc9c]/10 border border-[#1abc9c]/20">
                                        <BookOpen size={16} />
                                        {info}
                                    </span>
                                )
                            }
                        } else if (!isStudent && selectedPerson.Matricula && employeeDataMap[selectedPerson.Matricula]) {
                            const info = toTitleCase(employeeDataMap[selectedPerson.Matricula].departamento);
                            if (info) {
                                return (
                                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-[#3498db] bg-[#3498db]/10 border border-[#3498db]/20">
                                        <Building2 size={16} />
                                        {info}
                                    </span>
                                )
                            }
                        }
                        return null;
                    })()}
                  </div>
                </div>
              </div>

              {/* History List */}
              <div className="p-6 overflow-y-auto flex-1 bg-slate-900/20">
                <h3 className="text-lg font-semibold text-slate-200 mb-6 flex items-center gap-2">
                  <Clock size={20} className="text-[#3498db]" /> Recent History (Last 10)
                </h3>

                {loadingHistory ? (
                  <div className="py-12 flex justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-[#3498db]" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {personHistory.map((histEvent, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl bg-slate-800/30 border border-white/5 hover:bg-slate-800/50 transition-colors gap-4">
                        <div className="flex items-center gap-4">
                          <div className={`shrink-0 w-2.5 h-10 rounded-full ${histEvent.Authorized ? 'bg-[#2ecc71]' : 'bg-[#e74c3c]'}`} />
                          <div>
                            <p className="text-slate-200 font-medium truncate max-w-[200px]">{histEvent.Door || 'Unknown Door'}</p>
                            <p className="text-sm text-slate-400">Zone: {histEvent.Zone || 'Unknown'}</p>
                          </div>
                        </div>
                        <div className="text-left sm:text-right shrink-0">
                          <p className="text-sm font-semibold text-slate-300">
                            {format(new Date(histEvent.Time), 'dd/MM/yyyy')}
                          </p>
                          <p className="text-xs font-medium text-slate-400 mt-0.5">
                            {format(new Date(histEvent.Time), 'HH:mm:ss')}
                          </p>
                        </div>
                      </div>
                    ))}
                    {personHistory.length === 0 && (
                      <p className="text-center text-slate-400 py-8">No recent history found.</p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
