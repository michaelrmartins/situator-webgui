"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, ShieldAlert, CheckCircle2, Clock, MapPin, User, LogIn, LogOut, ArrowRightLeft, Briefcase, GraduationCap, Loader2, X, Fingerprint, Search, BookOpen, Building2 } from 'lucide-react';
import { format } from 'date-fns';

interface AccessEvent {
  PersonId?: string | number;
  Name: string;
  Door: string;
  Zone: string;
  Time: string | number;
  Document: string;
  Type: string;
  PersonType: number;
  PersonImage?: string;
  "Card RFID": string;
  Authorized: boolean;
}

interface StudentData {
  nome_curso: string | null;
  nome_serie: string | null;
}

interface EmployeeData {
  departamento: string;
}

const toTitleCase = (str: string) =>
  str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

const getPersonTypeLabel = (type: number) => {
  switch (type) {
    case 1: return { label: 'Employee', icon: <Briefcase size={12} />, color: 'text-[#3498db] bg-[#3498db]/10' }; // Peter River
    case 2: return { label: 'Student', icon: <GraduationCap size={12} />, color: 'text-[#9b59b6] bg-[#9b59b6]/10' }; // Amethyst
    case 3:
    case 4:
    default: return { label: 'Visitor', icon: <User size={12} />, color: 'text-[#f39c12] bg-[#f39c12]/10' }; // Orange
  }
};

export default function LiveFeed() {
  const [events, setEvents] = useState<AccessEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Search & Pagination States
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const limit = 50;

  // Modal States
  const [selectedPerson, setSelectedPerson] = useState<AccessEvent | null>(null);
  const [personHistory, setPersonHistory] = useState<AccessEvent[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Lyceum Student Data Cache
  const studentDataCache = useRef<Record<string, StudentData | null>>({});
  const [studentDataMap, setStudentDataMap] = useState<Record<string, StudentData>>({});

  // Nasajon Employee Data Cache
  const employeeDataCache = useRef<Record<string, EmployeeData | null>>({});
  const [employeeDataMap, setEmployeeDataMap] = useState<Record<string, EmployeeData>>({});

  const fetchPersonHistory = async (id: string | number) => {
    setLoadingHistory(true);
    setPersonHistory([]);
    try {
      const res = await fetch(`/api/person-history?id=${id}&limit=10`);
      if (res.ok) {
        setPersonHistory(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchStudentData = useCallback(async (document: string) => {
    if (!document || document in studentDataCache.current) return;
    studentDataCache.current[document] = null; // mark as in-flight
    try {
      const res = await fetch(`/api/lyceum?document=${encodeURIComponent(document)}`);
      if (res.status === 204 || !res.ok) {
        console.log('Lyceum API unavailable');
        return;
      }
      const data: StudentData = await res.json();
      studentDataCache.current[document] = data;
      setStudentDataMap(prev => ({ ...prev, [document]: data }));
    } catch {
      console.log('Lyceum API unavailable');
    }
  }, []);

  const fetchEmployeeData = useCallback(async (document: string) => {
    if (!document || document in employeeDataCache.current) return;
    employeeDataCache.current[document] = null; // mark as in-flight
    try {
      const res = await fetch(`/api/nasajon?document=${encodeURIComponent(document)}`);
      if (res.status === 204 || !res.ok) {
        console.log('Nasajon API unavailable');
        return;
      }
      const data: EmployeeData = await res.json();
      employeeDataCache.current[document] = data;
      setEmployeeDataMap(prev => ({ ...prev, [document]: data }));
    } catch {
      console.log('Nasajon API unavailable');
    }
  }, []);

  const fetchEvents = async (pageNum: number, search: string, isPolling = false) => {
    try {
      if (pageNum > 0 && !isPolling) setIsFetchingMore(true);
      const res = await fetch(`/api/events?limit=${limit}&offset=${pageNum * limit}&search=${encodeURIComponent(search)}`);

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to fetch');
      }

      const data = await res.json();

      if (data.length < limit) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }

      setEvents(prev => {
        // If it's a polling refresh on page 0, completely replace.
        // If it's paginating down, append unique items.
        // If search changed, completely replace.
        if (pageNum === 0) return data;

        const existingIds = new Set(prev.map(e => `${e.Time}-${e["Card RFID"]}-${e.Door}`));
        const newEvents = data.filter((e: AccessEvent) => !existingIds.has(`${e.Time}-${e["Card RFID"]}-${e.Door}`));
        return [...prev, ...newEvents];
      });

      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsFetchingMore(false);
    }
  };

  // Fetch Lyceum data for student events and Nasajon data for employee events
  useEffect(() => {
    events.forEach(event => {
      if (event.PersonType === 2 && event.Document) {
        fetchStudentData(event.Document);
      } else if (event.PersonType === 1 && event.Document) {
        fetchEmployeeData(event.Document);
      }
    });
  }, [events, fetchStudentData, fetchEmployeeData]);

  // Initial Load & Search
  useEffect(() => {
    // Only search if empty (reset) or >= 3 characters
    if (searchQuery.length > 0 && searchQuery.length < 3) {
      return;
    }

    setPage(0);
    setHasMore(true);
    const delayDebounceFn = setTimeout(() => {
      fetchEvents(0, searchQuery, false);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Pagination Load
  useEffect(() => {
    if (page > 0) {
      fetchEvents(page, searchQuery, false);
    }
  }, [page]);

  // Polling Routine (Only updates the top of the list / page 0)
  useEffect(() => {
    const interval = setInterval(() => {
      if (page === 0) {
        // Do not poll with an incomplete search query
        if (searchQuery.length > 0 && searchQuery.length < 3) return;
        fetchEvents(0, searchQuery, true);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [searchQuery, page]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight * 1.5 && hasMore && !isFetchingMore && !error) {
      setPage(prev => prev + 1);
    }
  };

  const getEventIcon = (doorName: string) => {
    if (!doorName) return <ArrowRightLeft className="text-slate-400" size={20} />;
    const normalized = doorName.toLowerCase();
    if (normalized.includes('entrada')) return <LogIn className="text-emerald-400" size={20} />;
    if (normalized.includes('saida')) return <LogOut className="text-rose-400" size={20} />;
    return <ArrowRightLeft className="text-blue-400" size={20} />;
  };

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent flex items-center gap-3">
            <Activity className="text-blue-400" size={32} />
            Live Access Feed
          </h1>
          <p className="text-slate-400 mt-2">
            Real-time monitoring of all entry and exit point transactions. Updates every 5 seconds.
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Search Bar */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-slate-400 group-focus-within:text-[#3498db] transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Search Name, Doc or RFID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#1e293b]/50 border border-white/5 text-white text-sm rounded-xl focus:ring-2 focus:ring-[#3498db] focus:border-transparent block w-64 pl-10 p-2.5 backdrop-blur-md transition-all placeholder:text-slate-500"
            />
          </div>

          {/* Pulse Indicator */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#2ecc71]/10 border border-[#2ecc71]/20 text-[#2ecc71] text-sm font-medium">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2ecc71] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#2ecc71]"></span>
            </span>
            Live
          </div>
        </div>
      </div>

      {error ? (
        <div className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center text-center h-64 border-red-500/20">
          <ShieldAlert className="text-red-400 w-16 h-16 mb-4" />
          <h3 className="text-xl font-bold text-slate-200 mb-2">Connection Error</h3>
          <p className="text-slate-400 max-w-md">{error}</p>
          {error.includes('configured') && (
            <a href="/settings" className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-white transition-all font-medium">
              Go to Settings
            </a>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-6 overflow-hidden">
          {events.length > 0 && !error && (() => {
            const latest = events[0];
            const pType = getPersonTypeLabel(latest.PersonType);
            return (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                key={`latest-${latest.Time}-${latest.Name || 'unk'}-${latest.Door}`}
                className="shrink-0 glass-panel rounded-2xl border border-white/10 shadow-xl overflow-hidden cursor-pointer"
                onClick={() => {
                  if (latest.PersonId) {
                    setSelectedPerson(latest);
                    fetchPersonHistory(latest.PersonId);
                  }
                }}
              >
                <div className="flex flex-row">
                  {/* Left: Data */}
                  <div className="flex-1 p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-[#2c3e50] border border-white/10 flex items-center justify-center shrink-0">
                          {getEventIcon(latest.Door)}
                        </div>
                        <div className="min-w-0">
                          <h2 className="text-2xl font-bold text-white truncate">{latest.Name || 'Unidentified'}</h2>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${pType.color}`}>
                              {pType.icon} {pType.label}
                            </span>
                            {latest.Authorized ? (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold text-[#2ecc71] bg-[#2ecc71]/10">
                                <CheckCircle2 size={12} /> Authorized
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold text-[#e74c3c] bg-[#e74c3c]/10">
                                <ShieldAlert size={12} /> Denied
                              </span>
                            )}
                            {latest.PersonType === 2 && latest.Document && studentDataMap[latest.Document] && (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold text-[#1abc9c] bg-[#1abc9c]/10">
                                <BookOpen size={12} />
                                {[studentDataMap[latest.Document].nome_curso, studentDataMap[latest.Document].nome_serie].filter(Boolean).join(' · ')}
                              </span>
                            )}
                            {latest.PersonType === 1 && latest.Document && employeeDataMap[latest.Document] && (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold text-[#3498db] bg-[#3498db]/10">
                                <Building2 size={12} />
                                {toTitleCase(employeeDataMap[latest.Document].departamento)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-x-6 gap-y-3 mt-4">
                        <div>
                          <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Location</p>
                          <div className="flex items-center gap-1.5 text-slate-200 text-sm font-medium">
                            <MapPin size={14} className="text-[#95a5a6] shrink-0" />
                            <span className="truncate">{latest.Door || 'Unknown Door'}</span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5 pl-5">Zone: {latest.Zone || 'Unknown'}</p>
                        </div>

                        <div>
                          <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Timestamp</p>
                          <div className="flex items-center gap-1.5 text-slate-200 text-sm tabular-nums">
                            <Clock size={14} className="text-[#3498db] shrink-0" />
                            {format(new Date(latest.Time), 'dd/MM/yyyy')}
                            <span className="font-bold text-white">{format(new Date(latest.Time), 'HH:mm:ss')}</span>
                          </div>
                        </div>

                        {latest.Document && (
                          <div>
                            <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Document</p>
                            <p className="text-sm text-slate-200">{latest.Document}</p>
                          </div>
                        )}

                        {latest["Card RFID"] && (
                          <div>
                            <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1">RFID Card</p>
                            <div className="flex items-center gap-1.5 text-sm text-slate-200">
                              <Fingerprint size={14} className="text-[#1abc9c] shrink-0" />
                              {latest["Card RFID"]}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Photo Rectangle */}
                  <div className="shrink-0 w-44 relative">
                    {latest.PersonImage ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`http://192.168.56.101:8080/web_data/images/people/${latest.PersonImage}/portrait.jpg`}
                          alt={latest.Name}
                          className="w-full h-full object-cover min-h-[180px]"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                        <div className="hidden w-full h-full min-h-[180px] bg-[#34495e] flex items-center justify-center text-white/50">
                          <User size={48} />
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full min-h-[180px] bg-[#34495e] flex items-center justify-center text-white/50">
                        <User size={48} />
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })()}

          <div className="flex-1 overflow-hidden relative glass-panel rounded-2xl">
            <div
              className="absolute inset-0 overflow-y-auto p-2 scroll-smooth"
              onScroll={handleScroll}
            >
              <AnimatePresence initial={false}>
                {events.slice(1).map((event, i) => (
                  <motion.div
                    key={`${event.Time}-${event.Name || 'unk'}-${event.Door}-${i}`}
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.4, type: 'spring', bounce: 0.3 }}
                    onClick={() => {
                      if (event.PersonId) {
                        setSelectedPerson(event);
                        fetchPersonHistory(event.PersonId);
                      }
                    }}
                    className="mb-3 glass-card rounded-xl border border-white/5 hover:bg-white/10 transition-colors group cursor-pointer"
                  >
                    <div className="p-4 flex items-center gap-6">
                      {/* Status indicator */}
                      <div className={`w-1.5 h-14 rounded-full ${event.Authorized ? 'bg-[#2ecc71] shadow-[0_0_10px_rgba(46,204,113,0.5)]' : 'bg-[#e74c3c] shadow-[0_0_10px_rgba(231,76,60,0.5)]'}`} />

                      {/* Avatar or Icon */}
                      <div className="relative shrink-0">
                        {event.PersonImage ? (
                          <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/10 shadow-lg">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={`http://192.168.56.101:8080/web_data/images/people/${event.PersonImage}/portrait.jpg`}
                              alt={event.Name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                            <div className="hidden absolute inset-0 bg-[#34495e] flex items-center justify-center text-white/50">
                              <User size={24} />
                            </div>
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-[#34495e] flex items-center justify-center border-2 border-white/10 shadow-lg text-white/50">
                            <User size={24} />
                          </div>
                        )}

                        {/* Type Icon Badge */}
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#2c3e50] border border-white/10 flex items-center justify-center">
                          {getEventIcon(event.Door)}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                        {/* Name & ID */}
                        <div className="col-span-1 md:col-span-1 min-w-0">
                          <div className="flex items-center gap-2 text-slate-100 font-semibold truncate text-[15px]">
                            <span className="truncate">{event.Name || 'Unidentified'}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {(() => {
                              const pType = getPersonTypeLabel(event.PersonType);
                              return (
                                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold tracking-wide ${pType.color}`}>
                                  {pType.icon} {pType.label}
                                </span>
                              );
                            })()}
                            {event.Document && <span className="text-[11px] text-[#95a5a6] px-1">Doc: {event.Document}</span>}
                            {event.PersonType === 2 && event.Document && studentDataMap[event.Document] && (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold text-[#1abc9c] bg-[#1abc9c]/10 tracking-wide">
                                <BookOpen size={11} />
                                {[studentDataMap[event.Document].nome_curso, studentDataMap[event.Document].nome_serie].filter(Boolean).join(' · ')}
                              </span>
                            )}
                            {event.PersonType === 1 && event.Document && employeeDataMap[event.Document] && (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold text-[#3498db] bg-[#3498db]/10 tracking-wide">
                                <Building2 size={11} />
                                {toTitleCase(employeeDataMap[event.Document].departamento)}
                              </span>
                            )}
                            {event["Card RFID"] && (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium text-slate-300 bg-slate-800/80 border border-white/5">
                                <Fingerprint size={12} className="text-[#1abc9c]" />
                                {event["Card RFID"]}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Location */}
                        <div className="col-span-1 min-w-0">
                          <div className="flex items-center gap-2 text-slate-300 text-sm truncate font-medium">
                            <MapPin size={14} className="text-[#95a5a6] shrink-0" />
                            <span className="truncate">{event.Door || 'Unknown Door'}</span>
                          </div>
                          <div className="text-[12px] text-[#7f8c8d] mt-1 truncate pl-5">
                            Zone: {event.Zone || 'Unknown'}
                          </div>
                        </div>

                        {/* Time */}
                        <div className="col-span-1 flex items-center gap-2 text-[#bdc3c7] text-sm tabular-nums tracking-tight">
                          <Clock size={14} className="text-[#7f8c8d]" />
                          {format(new Date(event.Time), 'dd/MM/yyyy HH:mm:ss')}
                        </div>

                        {/* Authorization */}
                        <div className="col-span-1 flex justify-end">
                          {event.Authorized ? (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#2ecc71]/10 border border-[#2ecc71]/20 text-[#2ecc71] text-[13px] font-semibold tracking-wide shadow-sm">
                              <CheckCircle2 size={16} />
                              Authorized
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#e74c3c]/10 border border-[#e74c3c]/20 text-[#e74c3c] text-[13px] font-semibold tracking-wide shadow-sm">
                              <ShieldAlert size={16} />
                              Denied
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {events.length === 0 && !error && !isFetchingMore && (
                <div className="h-40 flex items-center justify-center text-slate-500">
                  {searchQuery ? 'No results found for your search.' : 'Waiting for access events...'}
                </div>
              )}

              {isFetchingMore && (
                <div className="py-6 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-[#3498db]" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Person Details Modal */}
      <AnimatePresence>
        {selectedPerson && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedPerson(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
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
                className="absolute top-6 right-6 p-2 rounded-full bg-black/20 hover:bg-black/40 text-slate-300 hover:text-white transition-colors z-50 backdrop-blur-md border border-white/10"
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
                      const pType = getPersonTypeLabel(selectedPerson.PersonType);
                      return (
                        <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold ${pType.color}`}>
                          {pType.icon} {pType.label}
                        </span>
                      );
                    })()}
                    {selectedPerson.Document && (
                      <span className="text-sm px-3 py-1.5 bg-slate-700/50 rounded-lg text-slate-300 border border-white/5">
                        Doc: {selectedPerson.Document}
                      </span>
                    )}
                    {selectedPerson["Card RFID"] && (
                      <span className="flex items-center gap-2 text-sm px-3 py-1.5 bg-slate-800/80 rounded-lg text-slate-200 border border-white/10 shadow-inner">
                        <Fingerprint size={16} className="text-[#1abc9c]" />
                        RFID: {selectedPerson["Card RFID"]}
                      </span>
                    )}
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
