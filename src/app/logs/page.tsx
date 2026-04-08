"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import { ShieldAlert, Fingerprint, CalendarDays, Loader2, Info, Users, Download, BookOpen, Building2 } from 'lucide-react';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';
import { motion } from 'framer-motion';

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

  const [authData, setAuthData] = useState([]);
  const [rfidData, setRfidData] = useState([]);
  const [noRfidData, setNoRfidData] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Lyceum Student Data Cache
  const studentDataCache = useRef<Record<string, StudentData | null>>({});
  const [studentDataMap, setStudentDataMap] = useState<Record<string, StudentData>>({});

  // Nasajon Employee Data Cache
  const employeeDataCache = useRef<Record<string, EmployeeData | null>>({});
  const [employeeDataMap, setEmployeeDataMap] = useState<Record<string, EmployeeData>>({});

  const fetchStudentData = useCallback(async (document: string) => {
    if (!document || document in studentDataCache.current) return;
    studentDataCache.current[document] = null; // mark as in-flight
    try {
      const res = await fetch(`/api/lyceum?document=${encodeURIComponent(document)}`);
      if (res.status === 204 || !res.ok) return;
      const data: StudentData = await res.json();
      studentDataCache.current[document] = data;
      setStudentDataMap(prev => ({ ...prev, [document]: data }));
    } catch {}
  }, []);

  const fetchEmployeeData = useCallback(async (document: string) => {
    if (!document || document in employeeDataCache.current) return;
    employeeDataCache.current[document] = null; // mark as in-flight
    try {
      const res = await fetch(`/api/nasajon?document=${encodeURIComponent(document)}`);
      if (res.status === 204 || !res.ok) return;
      const data: EmployeeData = await res.json();
      employeeDataCache.current[document] = data;
      setEmployeeDataMap(prev => ({ ...prev, [document]: data }));
    } catch {}
  }, []);

  const fetchLogs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const startMs = dateRange.start.getTime();
      const endMs = dateRange.end.getTime();

      const [authRes, rfidRes, noRfidRes] = await Promise.all([
        fetch(`/api/reports?type=auth&start=${startMs}&end=${endMs}`),
        fetch(`/api/reports?type=rfid&start=${startMs}&end=${endMs}`),
        fetch(`/api/reports?type=no-rfid&start=${startMs}&end=${endMs}`)
      ]);

      if (!authRes.ok || !rfidRes.ok || !noRfidRes.ok) throw new Error('Failed to fetch data');

      setAuthData(await authRes.json());
      setRfidData(await rfidRes.json());
      setNoRfidData(await noRfidRes.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [dateRange]);

  useEffect(() => {
    noRfidData.forEach((person: any) => {
      const typeLower = String(person.PersonType || '').toLowerCase();
      const isStudent = typeLower.includes('aluno') || typeLower.includes('estudante') || typeLower.includes('student') || typeLower === '2';
      const document = person.Matricula;
      if (isStudent && document) {
        fetchStudentData(document);
      } else if (!isStudent && document) {
        fetchEmployeeData(document);
      }
    });
  }, [noRfidData, fetchStudentData, fetchEmployeeData]);

  const handleDateChange = (daysAgo: number) => {
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

  return (
    <div className="p-8 h-full flex flex-col overflow-y-auto">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent flex items-center gap-3">
            <ShieldAlert className="text-blue-400" size={32} />
            Authorization & Verification Logs
          </h1>
          <p className="text-slate-400 mt-2">
            Analysis of unauthorized attempts and physical card presence.
          </p>
        </div>
        
        <div className="flex bg-slate-800/50 p-1 rounded-xl border border-white/5 backdrop-blur-md">
          <button onClick={() => handleDateChange(0)} className="px-4 py-2 text-sm font-medium rounded-lg text-white hover:bg-white/10 focus:bg-blue-600 transition-all flex items-center gap-2"><CalendarDays size={16} /> Today</button>
          <button onClick={() => handleDateChange(7)} className="px-4 py-2 text-sm font-medium rounded-lg text-slate-300 hover:bg-white/10 focus:bg-blue-600 transition-all">7 Days</button>
          <button onClick={() => handleDateChange(30)} className="px-4 py-2 text-sm font-medium rounded-lg text-slate-300 hover:bg-white/10 focus:bg-blue-600 transition-all">30 Days</button>
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
                      <tr key={person.PersonId || idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
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
    </div>
  );
}
