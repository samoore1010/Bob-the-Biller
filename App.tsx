import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Calendar, 
  Search, 
  ChevronDown, 
  ChevronRight,
  ExternalLink,
  Briefcase,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Edit2,
  RotateCcw,
  Settings,
  Save,
  Sparkles,
  Loader2,
  Upload,
  Trash2,
  Filter,
  Eye,
  EyeOff,
  AlertTriangle,
  Layers,
  UserPlus,
  Cpu,
  Sliders,
  Zap,
  Plus,
  X as XIcon,
  Tag,
  CheckSquare,
  Square,
  AlertCircle,
  CheckCircle,
  MoreHorizontal,
  LayoutDashboard,
  Clock,
  TrendingUp,
  DollarSign,
  ListPlus,
  Wand2,
  Undo2,
  Download,
  Users,
  UserCog,
  UserCheck
} from 'lucide-react';

// Environment API Key injection point
const apiKey = (typeof process !== 'undefined' && process.env && process.env.API_KEY) ? process.env.API_KEY : "";

export function App() {
  // --- MAIN STATE ---
  const [selectedMatterId, setSelectedMatterId] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('DASHBOARD'); // Default to Dashboard
  const [dashboardTimeFrame, setDashboardTimeFrame] = useState('THIS_MONTH');
  const [settingsTab, setSettingsTab] = useState('INCREMENTS'); 
  const [selectedIds, setSelectedIds] = useState(new Set<number>());
  const [bulkNarrative, setBulkNarrative] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);
  const [notification, setNotification] = useState<string | null>(null); 
  const [isThreadingEnabled, setIsThreadingEnabled] = useState(true);
  const [isMattersExpanded, setIsMattersExpanded] = useState(true);

  // --- UNDO SYSTEM STATE ---
  const [actionHistory, setActionHistory] = useState<{ label: string, restore: () => void }[]>([]);

  // --- MAPPING & RULES STATE ---
  const [contactMappings, setContactMappings] = useState<Record<string, string>>({}); // Legacy support
  const [smartRules, setSmartRules] = useState<{ id: number; matterId: string; triggers: string[] }[]>([
      { id: 1, matterId: 'HERRERA, JESSICA', triggers: ['jessicah26@gmail.com', 'Herrera', '71534'] },
      { id: 2, matterId: 'Admin', triggers: ['lexisnexis', 'bar association', 'invoice', 'subscription', 'Microsoft on behalf of your organization', 'Daily Journal Editor', 'ACG Los Angeles', 'Michael Prestia', 'Allison Hoffenberg'] },
      { id: 3, matterId: 'AFE', triggers: ['AFE', 'Fabric', 'Douglas Coulter', 'Aburto, Armando', 'Project Turf', 'CIS', 'Nick Berquist', 'Chase McClung', 'Page, Michael'] },
      { id: 4, matterId: 'CONSTANCIO', triggers: ['Rudy', 'Constancio'] },
      { id: 5, matterId: 'MAXWELL', triggers: ['Maxwell', 'Dee Dodson', 'William Maxwell', 'CRETE'] },
      { id: 6, matterId: 'D&L', triggers: ['Jawad, Rama M.', 'D&L', 'D & L'] },
      { id: 7, matterId: 'NATALEE', triggers: ['Michael G. Ebiner', 'PUENTE'] },
      { id: 8, matterId: 'CASE', triggers: ['Michael Case Jr', 'Byerly', 'Byerlys'] },
      { id: 9, matterId: 'DIAZ', triggers: ['Diaz'] },
      { id: 10, matterId: 'HUBBLE', triggers: ['Char Davis Hubble'] },
      { id: 11, matterId: 'CAL BORING', triggers: ['Gregory W. Brittain', 'NOBEL', 'CAL BORING', 'CALIFORNIA BORING'] },
      { id: 12, matterId: 'ABELL', triggers: ['Victor Yu', 'ABELL'] },
      { id: 13, matterId: 'HERNANDEZ', triggers: ['HERNANDEZ'] },
      { id: 14, matterId: 'RYAN G.', triggers: ['RYAN G'] },
      { id: 15, matterId: 'LIZARDI', triggers: ['Blake Slater', 'Lizardi', 'GARY BARLOW'] },
      { id: 16, matterId: 'POCOROBA', triggers: ['Alberto Araujo', 'POCOROBA'] },
      { id: 17, matterId: 'OCYSA', triggers: ['Sean Slattery'] },
      { id: 18, matterId: 'GRAY', triggers: ['CINDY PARRISH', 'Zachary Congelliere'] },
      { id: 19, matterId: 'LANE', triggers: ['45312-002', 'Lane', 'Brossia'] }
  ]);

  // --- CAST OF CHARACTERS STATE ---
  const [castMappings, setCastMappings] = useState<{ id: number; matterId: string; name: string; role: string }[]>([
      { id: 1, matterId: 'HERRERA, JESSICA', name: 'jessicah26@gmail.com', role: 'Client' },
      { id: 2, matterId: 'HERRERA, JESSICA', name: 'Jessica Herrera', role: 'Client' },
      { id: 3, matterId: 'HERRERA, JESSICA', name: 'Steven Moore', role: 'Internal' }
  ]);
  const [isCastModalOpen, setIsCastModalOpen] = useState(false);
  const [currentCastMatter, setCurrentCastMatter] = useState('');
  const [suggestedCast, setSuggestedCast] = useState<string[]>([]);
  const [newCastName, setNewCastName] = useState('');

  // --- AUTO-ASSIGN STATE ---
  const [isAutoAssignReviewOpen, setIsAutoAssignReviewOpen] = useState(false);
  const [proposedAssignments, setProposedAssignments] = useState<{
      id: number;
      originalItem: any;
      proposedMatter: string;
      triggers: { value: string; selected: boolean }[];
  }[]>([]);
  const [selectedProposals, setSelectedProposals] = useState(new Set<number>());
  const [saveRulesWithAssignment, setSaveRulesWithAssignment] = useState(false);
  const [expandedProposalThreads, setExpandedProposalThreads] = useState(new Set<string>()); // store thread keys
  const [activeDropdownId, setActiveDropdownId] = useState<string | number | null>(null); // For custom dropdown in table (uses string key for threads)

  // --- MODAL STATE ---
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isBulkUpdateModalOpen, setIsBulkUpdateModalOpen] = useState(false);
  const [bulkMatterInput, setBulkMatterInput] = useState('');
  
  // New Bulk Update State
  const [bulkTriggers, setBulkTriggers] = useState<{ value: string; selected: boolean; type: 'suggestion' | 'custom' }[]>([]);
  const [customBulkTrigger, setCustomBulkTrigger] = useState('');
  const [bulkSelectedItems, setBulkSelectedItems] = useState<any[]>([]);

  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [ruleForm, setRuleForm] = useState<{ id: number | null; matterId: string; triggers: string[]; currentTriggerInput: string }>({ id: null, matterId: '', triggers: [], currentTriggerInput: '' });

  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
  const [editEntryForm, setEditEntryForm] = useState<{ description: string; includedItemIds: Set<number> }>({ description: '', includedItemIds: new Set() });

  // --- FILTER STATE ---
  const [typeFilter, setTypeFilter] = useState('ALL'); 
  const [isTypeFilterOpen, setIsTypeFilterOpen] = useState(false);
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState({ mode: 'ALL', startDate: '', endDate: '', label: 'All Dates' });
  const [customRange, setCustomRange] = useState({ start: '', end: '' });

  // --- REFS ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rulesFileInputRef = useRef<HTMLInputElement>(null);

  // --- SETTINGS STATE ---
  const [settings, setSettings] = useState({
    inboundRate: 0.1,
    outboundRate: 0.2,
    eventRate: 0.5,
    hourlyRate: 350,
    apiKey: apiKey, 
    autoAssignPrompt: '',
    narrativePrompt: `Your job is to assist me to draft law firm billing entries...`
  });
  const [showApiKey, setShowApiKey] = useState(false);

  // --- DATA STATE ---
  const [activities, setActivities] = useState<any[]>([
    {
      id: 1,
      type: 'mail-in',
      date: '12/03/2025',
      time: '04:58 PM',
      subject: 'Re: 71534-25- HERRERA, JESSICA LITIGATION',
      preview: 'Thank you! On Wed, Dec 3, 2025, 1:17PM Steven Moore wrote: Jessica, The attached was emailed...',
      correspondent: 'jessicah26@gmail.com',
      matterId: 'HERRERA, JESSICA',
      user: 'Steven Moore',
      duration: '0.10',
      rate: 350,
      itemLink: null
    },
    {
      id: 2,
      type: 'mail-out',
      date: '12/03/2025',
      time: '01:17 PM',
      subject: 'RE: 71534-25- HERRERA... Response due',
      preview: 'Jessica, The attached was emailed and mailed to Michelle today. Response from her is due by...',
      correspondent: 'Jessica Herrera',
      matterId: 'HERRERA, JESSICA',
      user: 'Steven Moore',
      duration: '0.20',
      rate: 350,
      itemLink: null
    },
    {
      id: 3,
      type: 'event',
      date: '11/10/2025',
      time: '03:45 PM',
      subject: 'SAM to Call Jessica Herrera',
      preview: 'Phone conference regarding status of Union property escrow closing; review credit union reconveyance...',
      correspondent: 'All Attendees',
      matterId: 'HERRERA, JESSICA',
      user: 'Steven Moore',
      duration: '0.50',
      rate: 350,
      itemLink: null
    },
    {
      id: 101,
      type: 'mail-out',
      date: '11/11/2025',
      time: '04:46 PM',
      subject: 'CaseMap+ Access Issue',
      preview: 'Hi Steve. I discussed with Lexis support on the website regarding access to CaseMap+. I was advised...',
      correspondent: 'steve.niyati@lexisnexis.com',
      matterId: 'Admin', 
      user: 'Steven Moore',
      duration: '0.20',
      rate: 350,
      itemLink: null
    },
    {
      id: 102,
      type: 'mail-out',
      date: '11/11/2025',
      time: '04:42 PM',
      subject: 'FW: Via Koron Lease',
      preview: 'Hi Char, Here is the fully executed sublease and landlord approval for your records. Payment instructions f...',
      correspondent: 'Char Davis Hubble',
      matterId: 'HUBBLE', 
      user: 'Steven Moore',
      duration: '0.20',
      rate: 350,
      itemLink: null
    },
    {
      id: 103,
      type: 'mail-out',
      date: '11/11/2025',
      time: '03:05 PM',
      subject: 'Dan Gold Family Law',
      preview: 'Hi Dorothy, Here is Dan\'s dedicated family law site. Your daughter can schedule a consultation...',
      correspondent: 'Dorothy Costine',
      matterId: 'Unassigned',
      user: 'Steven Moore',
      duration: '0.20',
      rate: 350,
      itemLink: null
    },
    {
      id: 104,
      type: 'mail-out',
      date: '11/11/2025',
      time: '04:09 PM',
      subject: 'RE: John R. Byerlys, Inc. SPA',
      preview: 'Yes. From: Brooke M. Pollard <bpollard@tldlaw.com> Sent: Tuesday, November 11, 2025 4:09 PM...',
      correspondent: 'Brooke M. Pollard',
      matterId: 'Unassigned', 
      user: 'Steven Moore',
      duration: '0.20',
      rate: 350,
      itemLink: null
    },
    {
      id: 5,
      type: 'mail-in',
      date: '11/10/2025',
      time: '10:05 AM',
      subject: 'RE: In re: Conservatorship of Michaela Constancio',
      preview: 'Thank you for checking Steven. Ok to skip. If we are able to get Diaz (Williams Trust) in to mediation...',
      correspondent: 'jenniferlumsdaine@tldlaw.com',
      matterId: 'Unassigned', 
      user: 'Steven Moore',
      duration: '0.10',
      rate: 350,
      itemLink: null
    },
    {
        id: 108,
        type: 'mail-in',
        date: '11/10/2025',
        time: '05:08 PM',
        subject: 'Daily eBriefs - November 10, 2025',
        preview: 'Monday, November 10, 2025 The following caselaw summaries are provided as a courtesy...',
        correspondent: 'noreply@info.lacba.org',
        matterId: 'Non-Client',
        user: 'Steven Moore',
        duration: '0.10',
        rate: 350,
        itemLink: null
    }
  ]);
  const [billedEntries, setBilledEntries] = useState<any[]>([]);


  // --- HELPERS ---
  const parseDate = (dateStr: string) => {
      if (!dateStr || typeof dateStr !== 'string') return new Date(0); 
      if (dateStr.includes('-')) return new Date(dateStr); 
      const [mm, dd, yyyy] = dateStr.split('/');
      return new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
  };

  const formatDateToInput = (date: Date) => date.toISOString().split('T')[0];
  
  const formatDateToDisplay = (date: Date) => {
    return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear()}`;
  };

  const normalizeSubject = (subject: any) => {
      if (!subject) return '';
      return String(subject).replace(/^(re|fw|fwd|rv|aw):\s*/i, '').trim().toLowerCase();
  };

  const findMatchingMatter = (item: any) => {
      const textToSearch = (
          (item.subject || '') + " " + 
          (item.preview || '') + " " + 
          (item.correspondent || '')
      ).toLowerCase();

      for (const rule of smartRules) {
          const match = rule.triggers.some(trigger => {
              const t = trigger.toLowerCase().trim();
              return t && textToSearch.includes(t);
          });
          if (match) return rule.matterId;
      }
      return null;
  };

  const allKnownMatters = useMemo(() => {
      const matters = new Set<string>();
      activities.forEach(a => { if(a.matterId && a.matterId !== 'Unassigned') matters.add(a.matterId); });
      smartRules.forEach(r => matters.add(r.matterId));
      return Array.from(matters).sort();
  }, [activities, smartRules]);

  // --- UNDO LOGIC ---
  const pushToHistory = (label: string, restoreFn: () => void) => {
      setActionHistory(prev => [...prev, { label, restore: restoreFn }]);
  };

  const handleUndo = () => {
      if (actionHistory.length === 0) return;
      const lastAction = actionHistory[actionHistory.length - 1];
      lastAction.restore();
      setActionHistory(prev => prev.slice(0, -1));
      showNotification(`Undid: ${lastAction.label}`);
  };

  // Auto-dismiss undo button after 10 seconds of inactivity
  useEffect(() => {
      if (actionHistory.length > 0) {
          const timer = setTimeout(() => {
              setActionHistory([]);
          }, 10000);
          return () => clearTimeout(timer);
      }
  }, [actionHistory]);

  // --- DASHBOARD METRICS ---
  const getDashboardStats = useMemo(() => {
    const today = new Date();
    let billedTotal = 0;
    let target = 0;
    let label = '';
    
    // Billed Stats logic based on timeFrame
    const currentEntries = billedEntries.filter(entry => {
        const entryDate = parseDate(entry.date); // Using date string from entry
        if (dashboardTimeFrame === 'TODAY') {
             return entryDate.toDateString() === today.toDateString();
        } else if (dashboardTimeFrame === 'THIS_WEEK') {
             const startOfWeek = new Date(today);
             startOfWeek.setDate(today.getDate() - today.getDay());
             startOfWeek.setHours(0,0,0,0);
             return entryDate >= startOfWeek;
        } else if (dashboardTimeFrame === 'THIS_MONTH') {
             return entryDate.getMonth() === today.getMonth() && entryDate.getFullYear() === today.getFullYear();
        } else if (dashboardTimeFrame === 'THIS_YEAR') {
             return entryDate.getFullYear() === today.getFullYear();
        }
        return true;
    });

    billedTotal = currentEntries.reduce((acc, curr) => acc + (parseFloat(curr.qty) || 0), 0);
    
    // Set Targets
    if (dashboardTimeFrame === 'TODAY') { target = 7.0; label='Today'; }
    else if (dashboardTimeFrame === 'THIS_WEEK') { target = 35.0; label='This Week'; }
    else if (dashboardTimeFrame === 'THIS_MONTH') { target = 150.0; label='This Month'; }
    else if (dashboardTimeFrame === 'THIS_YEAR') { target = 1800.0; label='This Year'; }

    // Pipeline Value (Unbilled)
    const pipelineHours = activities.reduce((acc, curr) => acc + (parseFloat(curr.duration) || 0), 0);
    const pipelineValue = pipelineHours * settings.hourlyRate;

    // Billed This Month (Fixed Metric)
    const monthEntries = billedEntries.filter(e => {
        const d = parseDate(e.date);
        return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    });
    const billedMonthValue = monthEntries.reduce((acc, curr) => acc + (parseFloat(curr.value) || 0), 0);

    return {
        billedTotal: billedTotal.toFixed(1),
        target: target,
        percentage: Math.min(100, (billedTotal / target) * 100),
        pipelineValue: pipelineValue.toFixed(0),
        billedMonthValue: billedMonthValue.toFixed(0),
        label
    };
  }, [billedEntries, activities, dashboardTimeFrame, settings.hourlyRate]);

  // --- THREADING LOGIC ---
  const threadActivities = (items: any[]) => {
      if (!isThreadingEnabled) return items;

      const grouped = new Map();

      items.forEach(item => {
          const key = normalizeSubject(item.subject);
          
          if (!grouped.has(key)) {
              grouped.set(key, { ...item, originalIds: [item.id], count: 1, minDate: item.date, maxDate: item.date });
          } else {
              const group = grouped.get(key);
              const newDuration = (parseFloat(group.duration) + parseFloat(item.duration)).toFixed(2);
              const correspondents = new Set([group.correspondent, item.correspondent].filter((c: any) => c && c !== 'All Attendees'));
              const combinedCorrespondent = correspondents.size > 0 ? Array.from(correspondents).join(', ') : 'Multiple Participants';

              const d1 = parseDate(group.minDate);
              const d2 = parseDate(item.date);
              const minD = d1 < d2 ? group.minDate : item.date;
              const maxD = d1 > d2 ? group.maxDate : item.date;

              let bestMatterId = group.matterId;
              if ((bestMatterId === 'Unassigned' || !bestMatterId) && item.matterId !== 'Unassigned') {
                  bestMatterId = item.matterId;
              }

              grouped.set(key, {
                  ...group,
                  duration: newDuration,
                  count: group.count + 1,
                  originalIds: [...group.originalIds, item.id],
                  correspondent: combinedCorrespondent,
                  matterId: bestMatterId,
                  minDate: minD,
                  maxDate: maxD,
                  isThread: true
              });
          }
      });

      return Array.from(grouped.values()).map(item => {
          if (item.isThread && item.count > 1) {
              let dateDisplay = item.minDate;
              if (item.minDate !== item.maxDate) {
                  const d1 = parseDate(item.minDate);
                  const d2 = parseDate(item.maxDate);
                  if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
                      dateDisplay = `${(d1.getMonth()+1)}/${d1.getDate()} - ${(d2.getMonth()+1)}/${d2.getDate()}`;
                  }
              }

              return {
                  ...item,
                  date: String(dateDisplay), 
                  subject: normalizeSubject(item.subject).toUpperCase(), 
                  preview: `Aggregated thread: ${item.count} items.`,
                  type: 'thread'
              };
          }
          return item;
      });
  };

  // --- FILTERING PIPELINE ---
  const globalThreadedActivities = useMemo(() => {
      const preFiltered = activities.filter(a => {
        const query = searchQuery.toLowerCase();
        const matchesSearch = searchQuery === '' || 
          a.subject.toLowerCase().includes(query) ||
          a.preview.toLowerCase().includes(query) ||
          (a.correspondent && a.correspondent.toLowerCase().includes(query)) ||
          (a.matterId && a.matterId.toLowerCase().includes(query));
        
        const matchesType = typeFilter === 'ALL' || a.type === typeFilter;

        let matchesDate = true;
        if (dateFilter.mode !== 'ALL' && dateFilter.startDate && dateFilter.endDate) {
            const itemDate = parseDate(a.date);
            const startParts = dateFilter.startDate.split('-');
            const endParts = dateFilter.endDate.split('-');
            const startFilter = new Date(parseInt(startParts[0]), parseInt(startParts[1])-1, parseInt(startParts[2]));
            const endFilter = new Date(parseInt(endParts[0]), parseInt(endParts[1])-1, parseInt(endParts[2]));
            startFilter.setHours(0,0,0,0);
            endFilter.setHours(23,59,59,999);
            itemDate.setHours(12,0,0,0); 
            matchesDate = itemDate >= startFilter && itemDate <= endFilter;
        }

        return matchesSearch && matchesType && matchesDate;
      });

      return threadActivities(preFiltered);

  }, [activities, searchQuery, typeFilter, dateFilter, isThreadingEnabled, smartRules]); 

  const viewActivities = useMemo(() => {
      return globalThreadedActivities.filter(a => {
          if (viewMode === 'BILLED' || viewMode === 'SETTINGS' || viewMode === 'DASHBOARD') return false;

          const matchesMatter = selectedMatterId === 'ALL' || a.matterId === selectedMatterId;
          const matchesViewMode = viewMode === 'ALL' || (viewMode === 'SELECTED' && selectedIds.has(a.id));
          return matchesMatter && matchesViewMode;
      });
  }, [globalThreadedActivities, selectedMatterId, viewMode, selectedIds]);

  const globalUnbilledCount = globalThreadedActivities.length;
  const unassignedCount = globalThreadedActivities.filter(a => a.matterId === 'Unassigned').length;
  
  const activeMatters = useMemo(() => {
    const matters: Record<string, { id: string; count: number; label: string }> = {};
    globalThreadedActivities.forEach(item => {
      const mId = item.matterId || 'Unassigned';
      if (mId === 'Unassigned') return; 

      if (!matters[mId]) {
        let label = mId;
        if(mId === 'HERRERA, JESSICA') label = 'Herrera Litigation';
        matters[mId] = { id: mId, count: 0, label: label };
      }
      matters[mId].count += 1;
    });
    return Object.values(matters).sort((a,b) => a.id.localeCompare(b.id));
  }, [globalThreadedActivities]);

  const totalHours = viewActivities.reduce((acc, curr) => acc + (parseFloat(curr.duration) || 0), 0).toFixed(2);
  const totalValue = (parseFloat(totalHours) * settings.hourlyRate).toFixed(2);

  const totalBilledHours = billedEntries.reduce((acc, curr) => acc + (parseFloat(curr.qty) || 0), 0).toFixed(2);
  const totalBilledValue = billedEntries.reduce((acc, curr) => acc + (parseFloat(curr.value) || 0), 0).toFixed(2);

  // --- ACTIONS ---
  const showNotification = (message: string) => {
      setNotification(message);
      setTimeout(() => setNotification(null), 3000);
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => processCSV(e.target?.result as string);
    reader.readAsText(file);
    event.target.value = '';
  };

  const processCSV = (csvText: string) => {
    const lines = csvText.split('\n');
    if (lines.length < 2) return;

    const headers = lines[0].toLowerCase().split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(h => h.replace(/^"|"$/g, '').trim());
    
    const idx = {
        type: headers.indexOf('type'),
        date: headers.indexOf('date'),
        time: headers.indexOf('time'),
        subject: headers.indexOf('subject'),
        body: headers.findIndex(h => h === 'description' || h === 'preview'),
        correspondent: headers.findIndex(h => h === 'correspondent' || h === 'sender' || h === 'recipient'),
        matter: headers.findIndex(h => h === 'matter' || h === 'matterid' || h === 'matter id'),
        itemLink: headers.findIndex(h => h === 'itemlink' || h === 'link' || h === 'outlook link')
    };

    const newActivities = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        const clean = (val: string) => val ? val.replace(/^"|"$/g, '').trim() : '';

        const rawType = idx.type !== -1 ? clean(cols[idx.type]).toLowerCase() : 'mail-in';
        const correspondent = idx.correspondent !== -1 ? clean(cols[idx.correspondent]) : 'Unknown';
        
        let finalType = 'mail-in';
        if (rawType.includes('out') || rawType.includes('sent')) finalType = 'mail-out';
        else if (rawType.includes('event') || rawType.includes('calendar')) finalType = 'event';

        let duration = '0.10';
        if (finalType === 'mail-out') duration = settings.outboundRate.toFixed(2);
        else if (finalType === 'event') duration = settings.eventRate.toFixed(2);

        const tempItem = { subject: idx.subject !== -1 ? clean(cols[idx.subject]) : '', preview: idx.body !== -1 ? clean(cols[idx.body]) : '', correspondent };
        let matterId = idx.matter !== -1 ? clean(cols[idx.matter]) : 'Unassigned';
        const itemLink = idx.itemLink !== -1 ? clean(cols[idx.itemLink]) : null;
        
        const smartMatch = findMatchingMatter(tempItem);
        if (matterId === 'Unassigned' && smartMatch) {
            matterId = smartMatch;
        }

        newActivities.push({
            id: Date.now() + i,
            type: finalType,
            date: idx.date !== -1 ? clean(cols[idx.date]) : new Date().toLocaleDateString(),
            time: idx.time !== -1 ? clean(cols[idx.time]) : '12:00 PM',
            subject: idx.subject !== -1 ? clean(cols[idx.subject]) : 'No Subject',
            preview: idx.body !== -1 ? clean(cols[idx.body]) : '',
            correspondent: correspondent,
            matterId: matterId,
            user: 'Steven Moore',
            duration: duration,
            rate: settings.hourlyRate,
            itemLink: itemLink
        });
    }

    if (newActivities.length > 0) {
        setActivities(prev => [...newActivities, ...prev]);
        showNotification(`Imported ${newActivities.length} items (Applied Smart Rules).`);
    } else {
        showNotification("No valid items found to import.");
    }
  };

  const generateBulkNarrative = async () => {
    if (selectedIds.size === 0) return;
    setIsGenerating(true);
    
    // FIX: Filter from the raw 'activities' list using selectedIds
    const rawSelectedItems = activities.filter(a => selectedIds.has(a.id));
    
    // FETCH CAST CONTEXT
    const relevantMatter = rawSelectedItems[0]?.matterId;
    let contextStr = '';
    if (relevantMatter && relevantMatter !== 'Unassigned') {
        const cast = castMappings.filter(c => c.matterId === relevantMatter);
        if (cast.length > 0) {
            contextStr = `CAST OF CHARACTERS (Role Mappings for this matter):\n` + 
                         cast.map(c => `- ${c.name} is ${c.role}`).join('\n') + 
                         `\n\nUse these roles to describe interactions accurately (e.g. "email to Client", "conference with Opposing Counsel").`;
        }
    }

    const itemDescriptions = rawSelectedItems.map(item => {
        const type = item.type === 'mail-in' ? 'Received email from' : item.type === 'mail-out' ? 'Sent email to' : 'Meeting with';
        return `- ${type} ${item.correspondent} regarding "${item.subject}". Preview: ${item.preview}`;
    }).join('\n');

    const prompt = `${settings.narrativePrompt}
    
    ${contextStr}

    Input Tasks:
    ${itemDescriptions}`;

    try {
        const keyToUse = settings.apiKey || apiKey; 
        // REMOVED GUARD CLAUSE to allow environment key to work if present invisibly
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${keyToUse}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const data = await response.json();
        const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (generatedText) setBulkNarrative(generatedText);
        else setBulkNarrative("Error: No response from AI. Please check API Key.");
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        setBulkNarrative("Error generating narrative.");
    } finally {
        setIsGenerating(false);
    }
  };

  const saveBulkEntry = () => {
    if (selectedIds.size === 0) return;
    
    const selectedItems = viewActivities.filter(a => selectedIds.has(a.id));
    
    const totalHrs = selectedItems.reduce((acc, curr) => acc + (parseFloat(curr.duration) || 0), 0).toFixed(2);
    const totalVal = (parseFloat(totalHrs) * settings.hourlyRate).toFixed(2);
    
    const flatItems: any[] = [];
    const allRawIdsToRemove = new Set();
    
    selectedItems.forEach(item => {
        if (item.originalIds && item.isThread) {
             const children = activities.filter(a => item.originalIds.includes(a.id));
             children.forEach(c => {
                 flatItems.push(c);
                 allRawIdsToRemove.add(c.id);
             });
        } else {
             flatItems.push(item);
             allRawIdsToRemove.add(item.id);
        }
    });

    const newEntry = {
        id: Date.now(),
        date: new Date().toLocaleDateString('en-US'),
        description: bulkNarrative || "(No narrative provided)",
        matterId: selectedItems[0]?.matterId || "Mixed",
        qty: totalHrs,
        value: totalVal,
        itemCount: flatItems.length,
        originalItems: flatItems, 
        user: 'Steven Moore'
    };

    const prevBilled = [...billedEntries];
    const prevActivities = [...activities];

    setBilledEntries([newEntry, ...billedEntries]);
    setActivities(activities.filter(a => !allRawIdsToRemove.has(a.id)));
    setSelectedIds(new Set());
    setBulkNarrative('');
    setViewMode('BILLED');
    
    pushToHistory('Bulk Entry Created', () => {
        setBilledEntries(prevBilled);
        setActivities(prevActivities);
    });

    showNotification("Billing entry saved successfully!");
  };

  const handleDeleteSelected = () => {
      if (selectedIds.size === 0) return;
      setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    const prevActivities = [...activities];
    const idsToDelete = new Set();
    viewActivities.forEach(item => {
        if (selectedIds.has(item.id)) {
            if (item.originalIds) item.originalIds.forEach((id: number) => idsToDelete.add(id));
            else idsToDelete.add(item.id);
        }
    });

    setActivities(prev => prev.filter(a => !idsToDelete.has(a.id)));
    
    pushToHistory(`Deleted ${idsToDelete.size} items`, () => {
        setActivities(prevActivities);
    });

    setSelectedIds(new Set());
    setIsDeleteConfirmOpen(false);
    showNotification("Items deleted successfully.");
  };

  // --- EDIT BILLED ENTRY LOGIC ---

  const startEditingEntry = (entry: any) => {
      setEditingEntryId(entry.id);
      setEditEntryForm({
          description: entry.description,
          includedItemIds: new Set(entry.originalItems.map((i: any) => i.id))
      });
  };

  const toggleEditEntryItem = (itemId: number) => {
      const newSet = new Set(editEntryForm.includedItemIds);
      if (newSet.has(itemId)) {
          newSet.delete(itemId);
      } else {
          newSet.add(itemId);
      }
      setEditEntryForm({ ...editEntryForm, includedItemIds: newSet });
  };

  const cancelEditEntry = () => {
      setEditingEntryId(null);
      setEditEntryForm({ description: '', includedItemIds: new Set() });
  };

  const handleRestoreEntry = (entry: any) => {
    setActivities([...activities, ...entry.originalItems]);
    setBilledEntries(billedEntries.filter(e => e.id !== entry.id));
    showNotification("Entry unbilled. Items returned to dashboard.");
  };

  const saveEditEntry = () => {
      const entry = billedEntries.find(e => e.id === editingEntryId);
      if (!entry) return;

      const keptItems = entry.originalItems.filter((item: any) => editEntryForm.includedItemIds.has(item.id));
      const removedItems = entry.originalItems.filter((item: any) => !editEntryForm.includedItemIds.has(item.id));

      if (keptItems.length === 0) {
          handleRestoreEntry(entry);
          setEditingEntryId(null);
          return;
      }

      const newTotalHrs = keptItems.reduce((acc: number, curr: any) => acc + (parseFloat(curr.duration) || 0), 0).toFixed(2);
      const newTotalVal = (parseFloat(newTotalHrs) * settings.hourlyRate).toFixed(2);

      const updatedEntry = {
          ...entry,
          description: editEntryForm.description,
          qty: newTotalHrs,
          value: newTotalVal,
          itemCount: keptItems.length,
          originalItems: keptItems
      };

      setBilledEntries(billedEntries.map(e => e.id === editingEntryId ? updatedEntry : e));

      if (removedItems.length > 0) {
          setActivities(prev => [...prev, ...removedItems]);
          showNotification(`Updated entry. ${removedItems.length} items returned to Unbilled.`);
      } else {
          showNotification("Entry updated successfully.");
      }

      setEditingEntryId(null);
  };

  // --- RULE ACTIONS ---
  
  const openAddRule = () => {
      setRuleForm({ id: null, matterId: '', triggers: [], currentTriggerInput: '' });
      setIsRuleModalOpen(true);
  };

  const openEditRule = (rule: any) => {
      setRuleForm({ 
          id: rule.id, 
          matterId: rule.matterId, 
          triggers: [...rule.triggers], 
          currentTriggerInput: '' 
      });
      setIsRuleModalOpen(true);
  };

  const addTriggerToForm = () => {
      if (ruleForm.currentTriggerInput.trim()) {
          setRuleForm(prev => ({
              ...prev,
              triggers: [...prev.triggers, prev.currentTriggerInput.trim()],
              currentTriggerInput: ''
          }));
      }
  };

  const removeTriggerFromForm = (index: number) => {
      setRuleForm(prev => ({
          ...prev,
          triggers: prev.triggers.filter((_, i) => i !== index)
      }));
  };

  const saveRule = () => {
      if (!ruleForm.matterId) {
          showNotification("Matter ID is required.");
          return;
      }
      
      let finalTriggers = [...ruleForm.triggers];
      if (ruleForm.currentTriggerInput.trim()) {
          finalTriggers.push(ruleForm.currentTriggerInput.trim());
      }

      if (finalTriggers.length === 0) {
          showNotification("At least one trigger (keyword or contact) is required.");
          return;
      }

      if (ruleForm.id) {
          setSmartRules(prev => prev.map(r => r.id === ruleForm.id ? { ...r, matterId: ruleForm.matterId, triggers: finalTriggers } : r));
      } else {
          setSmartRules(prev => [...prev, { id: Date.now(), matterId: ruleForm.matterId, triggers: finalTriggers }]);
      }
      
      setIsRuleModalOpen(false);
      showNotification("Smart Rule saved successfully.");
  };

  const deleteRule = (id: number) => {
      setSmartRules(prev => prev.filter(r => r.id !== id));
  };

  // --- CAST OF CHARACTERS HANDLERS ---
  const openCastModal = (matterId: string) => {
      if (!matterId || matterId === 'ALL' || matterId === 'Unassigned') {
          showNotification("Please select a specific matter first.");
          return;
      }
      setCurrentCastMatter(matterId);
      
      // Auto-Detect Participants
      const matterItems = activities.filter(a => a.matterId === matterId);
      const uniqueNames = new Set<string>();
      
      matterItems.forEach(item => {
          if (item.correspondent && !item.correspondent.includes('Multiple') && item.correspondent !== 'All Attendees') {
              uniqueNames.add(item.correspondent);
          }
      });

      // Filter out names already in cast mappings
      const existingNames = new Set(castMappings.filter(c => c.matterId === matterId).map(c => c.name));
      const suggestions = Array.from(uniqueNames).filter(name => !existingNames.has(name));
      
      setSuggestedCast(suggestions);
      setIsCastModalOpen(true);
  };

  const addCastMember = (name: string, role: string = 'Client') => {
      setCastMappings(prev => [...prev, { id: Date.now(), matterId: currentCastMatter, name, role }]);
      setSuggestedCast(prev => prev.filter(n => n !== name)); // Remove from suggestions
  };

  const updateCastRole = (id: number, newRole: string) => {
      setCastMappings(prev => prev.map(c => c.id === id ? { ...c, role: newRole } : c));
  };

  const deleteCastMember = (id: number) => {
      const member = castMappings.find(c => c.id === id);
      if (member && member.matterId === currentCastMatter) {
          // If deleted, maybe add back to suggestions if it exists in activities? simplified for now just delete.
          setCastMappings(prev => prev.filter(c => c.id !== id));
      }
  };

  // --- APPLYING MAPPINGS ---
  const applySavedMappings = () => {
      let count = 0;
      const prevActivities = [...activities];
      const newActivities = activities.map(item => {
          const match = findMatchingMatter(item);
          if (match && item.matterId !== match) {
              count++;
              return { ...item, matterId: match };
          }
          return item;
      });
      
      if (count > 0) {
          setActivities(newActivities);
          pushToHistory(`Applied Mappings (${count} items)`, () => {
              setActivities(prevActivities);
          });
          showNotification(`Smart Rules applied! Updated ${count} items.`);
      } else {
          showNotification("No items matched your Smart Rules.");
      }
  };

  // --- IMPORT / EXPORT SMART RULES ---
  const handleRuleImportClick = () => rulesFileInputRef.current?.click();

  const handleRuleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => processRulesCSV(e.target?.result as string);
      reader.readAsText(file);
      event.target.value = '';
  };

  const processRulesCSV = (csvText: string) => {
      const lines = csvText.split('\n');
      const newRulesMap = new Map<string, Set<string>>();

      lines.forEach((line, index) => {
          if (!line.trim()) return;
          // Simple heuristic to skip header if it contains 'matter' and 'trigger'
          if (index === 0 && line.toLowerCase().includes('matter') && line.toLowerCase().includes('trigger')) return;

          // Split by comma, handling potential quotes roughly
          const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
          
          if (cols.length >= 2) {
              const m = cols[0];
              const t = cols[1];
              if (m && t) {
                  if (!newRulesMap.has(m)) {
                      newRulesMap.set(m, new Set());
                  }
                  newRulesMap.get(m)?.add(t);
              }
          }
      });

      if (newRulesMap.size === 0) {
          showNotification("No valid rules found in CSV.");
          return;
      }

      setSmartRules(prev => {
          const combined = new Map<string, Set<string>>();
          
          // Add existing
          prev.forEach(r => {
              if (!combined.has(r.matterId)) combined.set(r.matterId, new Set());
              r.triggers.forEach(t => combined.get(r.matterId)?.add(t));
          });

          // Add imported
          newRulesMap.forEach((triggers, matterId) => {
              if (!combined.has(matterId)) combined.set(matterId, new Set());
              triggers.forEach(t => combined.get(matterId)?.add(t));
          });

          const finalRules = [];
          let tempId = Date.now();
          for (const [matterId, triggerSet] of combined.entries()) {
              finalRules.push({
                  id: tempId++,
                  matterId: matterId,
                  triggers: Array.from(triggerSet)
              });
          }
          return finalRules;
      });

      showNotification(`Imported rules for ${newRulesMap.size} matters.`);
  };

  // Fixed handleExportRules to reliably use current state by defining it as a memoized callback dependent on smartRules
  const handleExportRules = useCallback(() => {
      let csvContent = "Matter Name,Trigger\n";
      smartRules.forEach(rule => {
          rule.triggers.forEach(trigger => {
              const safeMatter = rule.matterId.includes(',') ? `"${rule.matterId}"` : rule.matterId;
              const safeTrigger = trigger.includes(',') ? `"${trigger}"` : trigger;
              csvContent += `${safeMatter},${safeTrigger}\n`;
          });
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", "smart_rules_export.csv");
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  }, [smartRules]);

  // --- BULK UPDATE LOGIC ---
  
  const openBulkUpdateModal = () => {
      const selectedItems = activities.filter(a => selectedIds.has(a.id));
      setBulkSelectedItems(selectedItems); // Store for display

      const suggestions = new Set<string>();
      selectedItems.forEach(item => {
          // 1. Contact
          if (item.correspondent && item.correspondent !== 'All Attendees' && !item.correspondent.includes('Multiple')) {
              suggestions.add(item.correspondent);
          }
          // 2. Subject Keywords (Simple heuristic: Capitalized words or codes)
          const words = item.subject.replace(/^(re|fw|fwd|rv):\s*/i, '').split(/[\s,.-]+/);
          words.forEach((w: string) => {
             const cleanWord = w.replace(/[^a-zA-Z0-9]/g, '');
             // Look for capitalized words length > 2, or numeric codes like 71534
             if ((cleanWord.length > 2 && /^[A-Z][a-z0-9]+$/.test(cleanWord)) || /^\d{5}/.test(cleanWord) || /^[A-Z]+$/.test(cleanWord)) {
                 if (!['THE', 'AND', 'FOR', 'WITH', 'THIS', 'THAT'].includes(cleanWord.toUpperCase())) {
                     suggestions.add(cleanWord);
                 }
             }
          });
      });

      const triggers = Array.from(suggestions).map(c => ({ value: c, selected: false, type: 'suggestion' as const }));
      
      setBulkTriggers(triggers);
      setBulkMatterInput(''); 
      setCustomBulkTrigger('');
      setIsBulkUpdateModalOpen(true);
  };

  const handleBulkUpdate = () => {
      if (!bulkMatterInput.trim()) {
          showNotification("Please enter or select a Matter ID.");
          return;
      }
      
      const prevActivities = [...activities];
      const prevRules = [...smartRules];

      // 1. Update Matters
      const idsToUpdate = new Set();
      viewActivities.forEach(item => {
          if (selectedIds.has(item.id)) {
              if (item.originalIds) item.originalIds.forEach((id: number) => idsToUpdate.add(id));
              else idsToUpdate.add(item.id);
          }
      });

      const newActivities = activities.map(a => 
          idsToUpdate.has(a.id) ? { ...a, matterId: bulkMatterInput } : a
      );
      setActivities(newActivities);

      // 2. Update Smart Rules
      const selectedTriggers = bulkTriggers.filter(t => t.selected).map(t => t.value);
      
      if (selectedTriggers.length > 0) {
          const existingRuleIndex = smartRules.findIndex(r => r.matterId === bulkMatterInput);
          
          if (existingRuleIndex !== -1) {
              // Update existing rule
              const updatedRules = [...smartRules];
              const existingTriggers = new Set(updatedRules[existingRuleIndex].triggers);
              selectedTriggers.forEach(t => existingTriggers.add(t));
              updatedRules[existingRuleIndex].triggers = Array.from(existingTriggers);
              setSmartRules(updatedRules);
          } else {
              // Create new rule
              setSmartRules(prev => [...prev, { 
                  id: Date.now(), 
                  matterId: bulkMatterInput, 
                  triggers: selectedTriggers 
              }]);
          }
          showNotification(`Updated items and saved ${selectedTriggers.length} smart rule triggers.`);
      } else {
          showNotification(`Updated ${idsToUpdate.size} items to matter "${bulkMatterInput}".`);
      }
      
      pushToHistory('Bulk Update', () => {
          setActivities(prevActivities);
          setSmartRules(prevRules);
      });

      setIsBulkUpdateModalOpen(false);
      setBulkMatterInput('');
      setSelectedIds(new Set()); 
  };

  const toggleBulkTrigger = (index: number) => {
      setBulkTriggers(prev => prev.map((t, i) => i === index ? { ...t, selected: !t.selected } : t));
  };

  const addCustomBulkTrigger = () => {
      if (!customBulkTrigger.trim()) return;
      setBulkTriggers(prev => [...prev, { value: customBulkTrigger.trim(), selected: true, type: 'custom' }]);
      setCustomBulkTrigger('');
  };

  // --- AUTO ASSIGN LOGIC START ---
  const initiateAutoAssign = async () => {
      const unassignedItems = activities.filter(a => a.matterId === 'Unassigned');
      
      if (unassignedItems.length === 0) {
          showNotification("No unassigned items to analyze.");
          return;
      }

      setIsAutoAssigning(true);
      await new Promise(resolve => setTimeout(resolve, 1500)); 

      const proposals = unassignedItems.map(item => {
          let proposed = 'Unassigned';
          const triggers: { value: string; selected: boolean }[] = [];
          
          const text = (item.subject + " " + item.preview).toLowerCase();
          
          // Heuristic: Extract triggers (Keywords)
          const words = item.subject.replace(/^(re|fw|fwd|rv):\s*/i, '').split(/[\s,.-]+/);
          words.forEach((w: string) => {
             const cleanWord = w.replace(/[^a-zA-Z0-9]/g, '');
             if ((cleanWord.length > 3 && /^[A-Z][a-z]+$/.test(cleanWord)) || /^\d{5}/.test(cleanWord) || (/^[A-Z]+$/.test(cleanWord) && cleanWord.length > 2)) {
                 if (!['THE', 'AND', 'FOR', 'WITH', 'THIS', 'THAT', 'YOUR', 'FROM'].includes(cleanWord.toUpperCase())) {
                     if (!triggers.some(t => t.value === cleanWord)) {
                        triggers.push({ value: cleanWord, selected: false }); // DEFAULT TO FALSE
                     }
                 }
             }
          });
          if (item.correspondent && item.correspondent !== 'All Attendees' && !triggers.some(t => t.value === item.correspondent)) {
              triggers.push({ value: item.correspondent, selected: false }); // DEFAULT TO FALSE
          }

          // Heuristic: Propose Matter Name
          const fileMatch = text.match(/\b\d{5}(-\d{3})?\b/); 
          
          // Check if we have an existing match in smart rules first
          const existingMatch = findMatchingMatter(item);
          
          if (existingMatch) {
              proposed = existingMatch;
          } else if (fileMatch) {
              // Try to find a name associated with the number if possible, or just use number
              if (text.includes('71534')) proposed = 'HERRERA, JESSICA'; 
              else proposed = fileMatch[0]; 
          }
          else if (text.includes('pollard')) proposed = 'POLLARD'; 
          else if (text.includes('maxwell')) proposed = 'MAXWELL';
          else if (text.includes('diaz')) proposed = 'DIAZ';
          else if (text.includes('invoice') || text.includes('bill')) proposed = 'Admin';
          
          // Fallback: Use the first strong trigger word found in ALL CAPS
          if (proposed === 'Unassigned' && triggers.length > 0) {
              const bestTrigger = triggers.find(t => /^[A-Z]/.test(t.value) && !t.value.includes('@'));
              if (bestTrigger) {
                  proposed = bestTrigger.value.toUpperCase();
              }
          }

          return {
              id: item.id,
              originalItem: item,
              proposedMatter: proposed,
              triggers: triggers
          };
      }).filter(p => p.proposedMatter !== 'Unassigned'); 

      if (proposals.length === 0) {
          showNotification("AI could not confidently assign any items.");
          setIsAutoAssigning(false);
      } else {
          setProposedAssignments(proposals);
          setSelectedProposals(new Set(proposals.map(p => p.id)));
          setSaveRulesWithAssignment(false); // DEFAULT TO FALSE
          setExpandedProposalThreads(new Set()); // Reset expansions
          setIsAutoAssignReviewOpen(true);
          setIsAutoAssigning(false);
      }
  };

  const confirmAutoAssignments = () => {
      const updates = new Map();
      const rulesToUpdate = new Map<string, Set<string>>(); // MatterID -> Set of Triggers

      const prevActivities = [...activities];
      const prevRules = [...smartRules];

      proposedAssignments.forEach(p => {
          if (selectedProposals.has(p.id)) {
              updates.set(p.id, p.proposedMatter);
              
              if (saveRulesWithAssignment) {
                  const selectedTriggers = p.triggers.filter(t => t.selected).map(t => t.value);
                  if (selectedTriggers.length > 0) {
                      if (!rulesToUpdate.has(p.proposedMatter)) {
                          rulesToUpdate.set(p.proposedMatter, new Set());
                      }
                      selectedTriggers.forEach(t => rulesToUpdate.get(p.proposedMatter)?.add(t));
                  }
              }
          }
      });

      // 1. Update Activities
      setActivities(prev => prev.map(a => {
          if (updates.has(a.id)) {
              return { ...a, matterId: updates.get(a.id) };
          }
          return a;
      }));

      // 2. Update Rules
      if (saveRulesWithAssignment && rulesToUpdate.size > 0) {
          const newRulesList = [...smartRules];
          let updatedCount = 0;
          
          rulesToUpdate.forEach((triggers, matterId) => {
              const existingIndex = newRulesList.findIndex(r => r.matterId === matterId);
              if (existingIndex !== -1) {
                  const merged = new Set(newRulesList[existingIndex].triggers);
                  triggers.forEach(t => merged.add(t));
                  newRulesList[existingIndex].triggers = Array.from(merged);
                  updatedCount++;
              } else {
                  newRulesList.push({ id: Date.now() + Math.random(), matterId: matterId, triggers: Array.from(triggers) });
                  updatedCount++;
              }
          });
          setSmartRules(newRulesList);
          showNotification(`Assigned ${updates.size} items and updated rules for ${updatedCount} matters.`);
      } else {
          showNotification(`Successfully assigned ${updates.size} items.`);
      }

      pushToHistory('Auto-Assignment', () => {
          setActivities(prevActivities);
          setSmartRules(prevRules);
      });

      setIsAutoAssignReviewOpen(false);
      setProposedAssignments([]);
      setSelectedProposals(new Set());
  };
  
  const toggleProposalSelection = (id: number) => {
      const newSet = new Set(selectedProposals);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedProposals(newSet);
  };

  const toggleThreadSelection = (ids: number[]) => {
      const newSet = new Set(selectedProposals);
      const allSelected = ids.every(id => newSet.has(id));
      
      ids.forEach(id => {
          if (allSelected) newSet.delete(id);
          else newSet.add(id);
      });
      setSelectedProposals(newSet);
  };

  const toggleProposalTrigger = (proposalId: number, triggerIndex: number) => {
      setProposedAssignments(prev => prev.map(p => {
          if (p.id === proposalId) {
              const newTriggers = [...p.triggers];
              newTriggers[triggerIndex].selected = !newTriggers[triggerIndex].selected;
              return { ...p, triggers: newTriggers };
          }
          return p;
      }));
  };

  const updateProposedMatter = (proposalId: number, newValue: string) => {
      setProposedAssignments(prev => prev.map(p => {
          if (p.id === proposalId) return { ...p, proposedMatter: newValue };
          return p;
      }));
  };

  const updateThreadProposedMatter = (ids: number[], newValue: string) => {
      setProposedAssignments(prev => prev.map(p => {
          if (ids.includes(p.id)) return { ...p, proposedMatter: newValue };
          return p;
      }));
  };

  // Group proposals by subject for threading
  const threadedProposals = useMemo(() => {
      const groups = new Map<string, typeof proposedAssignments>();
      proposedAssignments.forEach(p => {
          const key = normalizeSubject(p.originalItem.subject);
          if(!groups.has(key)) groups.set(key, []);
          groups.get(key)?.push(p);
      });
      return Array.from(groups.entries()).map(([key, items]) => ({
          key,
          items,
          isThread: items.length > 1
      }));
  }, [proposedAssignments]);

  const toggleThreadExpansion = (key: string) => {
      const newSet = new Set(expandedProposalThreads);
      if(newSet.has(key)) newSet.delete(key);
      else newSet.add(key);
      setExpandedProposalThreads(newSet);
  }
  
  // --- AUTO ASSIGN LOGIC END ---

  const applyDatePreset = (preset: string) => {
    const today = new Date();
    let start = new Date(today);
    let end = new Date(today);
    let label = '';

    switch (preset) {
        case 'TODAY': label = `Today (${formatDateToDisplay(today)})`; break;
        case 'YESTERDAY': start.setDate(today.getDate() - 1); end.setDate(today.getDate() - 1); label = 'Yesterday'; break;
        case 'LAST_7_DAYS': start.setDate(today.getDate() - 6); label = 'Last 7 Days'; break;
        case 'THIS_MONTH': start = new Date(today.getFullYear(), today.getMonth(), 1); label = 'This Month'; break;
        case 'LAST_MONTH': start = new Date(today.getFullYear(), today.getMonth() - 1, 1); end = new Date(today.getFullYear(), today.getMonth(), 0); label = 'Last Month'; break;
        case 'ALL': setDateFilter({ mode: 'ALL', startDate: '', endDate: '', label: 'All Dates' }); setIsDateFilterOpen(false); return;
        default: return;
    }
    setDateFilter({ mode: preset, startDate: formatDateToInput(start), endDate: formatDateToInput(end), label: label });
    setCustomRange({ start: formatDateToInput(start), end: formatDateToInput(end) });
    setIsDateFilterOpen(false);
  };

  const applyCustomRange = () => {
    if (!customRange.start || !customRange.end) return;
    const startParts = customRange.start.split('-');
    const endParts = customRange.end.split('-');
    const label = `${startParts[1]}/${startParts[2]}/${startParts[0]} - ${endParts[1]}/${endParts[2]}/${endParts[0]}`;
    setDateFilter({ mode: 'CUSTOM', startDate: customRange.start, endDate: customRange.end, label: label });
    setIsDateFilterOpen(false);
  };

  const handleMatterChange = (id: number, newMatterId: string) => {
    const prevActivities = [...activities];
    const item = viewActivities.find(i => i.id === id);
    if (item && item.originalIds) {
        setActivities(activities.map(a => item.originalIds.includes(a.id) ? { ...a, matterId: newMatterId } : a));
    } else {
        setActivities(activities.map(a => a.id === id ? { ...a, matterId: newMatterId } : a));
    }
    // Only push to history if it's a direct action (debounce this in real app, simplified here)
    // For simplicity, we won't push every keystroke to history in this demo, but ideally onBlur.
  };

  const handleDurationChange = (id: number, newDuration: string) => {
    // FIX: Using Number() to check for NaN correctly in TypeScript for a string input
    if (isNaN(Number(newDuration)) && newDuration !== '' && newDuration !== '.') return;
    setActivities(activities.map(item => item.id === id ? { ...item, duration: newDuration } : item));
  };

  const toggleSelection = (id: number) => {
    const item = viewActivities.find(a => a.id === id);
    const newSelection = new Set(selectedIds);
    const isSelecting = !newSelection.has(id);

    if (item && item.originalIds) {
        item.originalIds.forEach((originalId: number) => {
            if (isSelecting) newSelection.add(originalId);
            else newSelection.delete(originalId);
        });
    } else {
        if (isSelecting) newSelection.add(id);
        else newSelection.delete(id);
    }
    setSelectedIds(newSelection);
  };

  const toggleAll = () => {
    const allVisibleIds = new Set<number>();
    viewActivities.forEach(item => {
          // If threading is enabled and item is a thread, we need to consider its originalIds for selection logic
          if (isThreadingEnabled && item.isThread && item.originalIds) {
              item.originalIds.forEach((id: number) => allVisibleIds.add(id));
          } else {
              allVisibleIds.add(item.id);
          }
    });

    const allSelected = allVisibleIds.size > 0 && Array.from(allVisibleIds).every(id => selectedIds.has(id));

    if (allSelected) {
        setSelectedIds(new Set()); 
    } else {
        setSelectedIds(allVisibleIds); 
    }
  };

  const isAllSelected = useMemo(() => {
      const allVisibleIds = new Set<number>();
      viewActivities.forEach(item => {
          // If threading is enabled and item is a thread, we need to consider its originalIds for selection logic
          if (isThreadingEnabled && item.isThread && item.originalIds) {
              item.originalIds.forEach((id: number) => allVisibleIds.add(id));
          } else {
              allVisibleIds.add(item.id);
          }
      });
      return allVisibleIds.size > 0 && Array.from(allVisibleIds).every(id => selectedIds.has(id));
  }, [viewActivities, selectedIds, isThreadingEnabled]); // Added isThreadingEnabled to dependency array

  const checkboxClass = "appearance-none h-4 w-4 border border-gray-400 rounded bg-white checked:bg-indigo-600 checked:border-indigo-600 focus:ring-1 focus:ring-indigo-500 outline-none transition-all duration-200 bg-center bg-no-repeat bg-[length:100%_100%] checked:bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2016%2016%22%20fill%3D%22white%22%3E%3Cpath%20d%3D%22M12.207%204.793a1%201%200%20010%201.414l-5%205a1%201%200%2001-1.414%200l-2-2a1%201%200%20011.414-1.414L6.5%209.086l4.293-4.293a1%201%200%20011.414%200z%22%2F%3E%3C%2Fsvg%3E')] cursor-pointer";

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-sm text-gray-800 overflow-hidden relative">
      
      {notification && (
          <div className="fixed top-6 right-6 bg-emerald-600 text-white px-5 py-3 rounded-lg shadow-xl z-[100] animate-in slide-in-from-top-4 fade-in font-medium flex items-center gap-2">
              <CheckCircle size={18} className="text-white/90" />
              {notification}
          </div>
      )}

      {/* GLOBAL UNDO BUTTON */}
      {actionHistory.length > 0 && (
          <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-4 fade-in">
              <button 
                  onClick={handleUndo} 
                  className="bg-slate-900 text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-2 font-bold hover:bg-black transition-transform hover:-translate-y-1 border border-slate-700"
              >
                  <Undo2 size={18} /> Undo Action
              </button>
          </div>
      )}

      {/* CONFIRMATION MODAL */}
      {isDeleteConfirmOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm transform scale-100 animate-in zoom-in-95 duration-200 border border-gray-100">
                  <div className="flex items-center gap-3 text-red-600 mb-4">
                      <div className="bg-red-50 p-3 rounded-full"><AlertTriangle size={24} /></div>
                      <h3 className="text-lg font-bold text-gray-900">Delete Items?</h3>
                  </div>
                  <p className="text-gray-600 mb-6 leading-relaxed">Are you sure you want to delete these items from your dashboard? This action cannot be undone.</p>
                  <div className="flex justify-end gap-3">
                      <button onClick={() => setIsDeleteConfirmOpen(false)} className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors">Cancel</button>
                      <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium shadow-sm transition-colors">Delete</button>
                  </div>
              </div>
          </div>
      )}

      {/* AUTO ASSIGN REVIEW MODAL */}
      {isAutoAssignReviewOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setActiveDropdownId(null)}>
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl transform scale-100 animate-in zoom-in-95 duration-200 h-[85vh] flex flex-col border border-gray-100" onClick={(e) => e.stopPropagation()}>
                  <div className="p-6 border-b border-gray-100 flex items-center gap-4 bg-gradient-to-r from-violet-50 to-white rounded-t-xl">
                      <div className="bg-violet-100 p-2.5 rounded-lg text-violet-700 shadow-sm"><Wand2 size={24} /></div>
                      <div>
                          <h3 className="text-lg font-bold text-gray-900">Review Auto-Assignments</h3>
                          <p className="text-sm text-gray-500">The system analyzed {proposedAssignments.length} items. Review proposals and smart rules.</p>
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50/50 p-6">
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                      <table className="w-full text-left text-sm">
                          <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase text-gray-500 sticky top-0 z-10 shadow-sm">
                              <tr>
                                  <th className="p-4 w-12 text-center bg-gray-50">
                                      <input type="checkbox" className={checkboxClass} checked={selectedProposals.size === proposedAssignments.length} onChange={() => {
                                          if (selectedProposals.size === proposedAssignments.length) setSelectedProposals(new Set());
                                          else setSelectedProposals(new Set(proposedAssignments.map(p => p.id)));
                                      }}/>
                                  </th>
                                  <th className="p-4 w-1/3 bg-gray-50">Item Description</th>
                                  <th className="p-4 w-1/3 bg-gray-50">Smart Triggers <span className="text-gray-400 font-normal ml-1">(Click to activate)</span></th>
                                  <th className="p-4 w-1/4 bg-gray-50">Proposed Matter</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                              {threadedProposals.map(thread => (
                                  <React.Fragment key={thread.key}>
                                      {/* Thread Header (if multiple items) or Single Item */}
                                      {thread.isThread ? (
                                          <>
                                            <tr className="bg-violet-50/50 border-b border-violet-100">
                                                <td className="p-4 text-center align-middle">
                                                    <input 
                                                        type="checkbox" 
                                                        className={checkboxClass}
                                                        checked={thread.items.every(p => selectedProposals.has(p.id))} 
                                                        onChange={() => toggleThreadSelection(thread.items.map(p => p.id))}
                                                    />
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <div 
                                                            className="cursor-pointer p-1 hover:bg-violet-200 rounded text-violet-700 transition-colors"
                                                            onClick={() => toggleThreadExpansion(thread.key)}
                                                        >
                                                            {expandedProposalThreads.has(thread.key) ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                                                        </div>
                                                        <span className="font-bold text-violet-900 text-xs flex items-center gap-2">
                                                            <Layers size={14} /> THREAD: {thread.items[0].originalItem.subject} 
                                                        </span>
                                                        <span className="bg-violet-200 text-violet-800 px-1.5 py-0.5 rounded text-[10px] font-bold">{thread.items.length} items</span>
                                                    </div>
                                                    {expandedProposalThreads.has(thread.key) && <div className="text-[10px] text-violet-600 pl-8">Items in this thread will be assigned to the matter selected on the right.</div>}
                                                </td>
                                                <td className="p-4 text-xs text-gray-400 italic align-middle">
                                                    {expandedProposalThreads.has(thread.key) ? 'See items below for triggers' : 'Expand to view triggers'}
                                                </td>
                                                <td className="p-4 align-middle relative">
                                                    {/* THREAD LEVEL PROPOSED MATTER DROPDOWN */}
                                                    <div className="relative">
                                                        <div 
                                                            className="flex items-center border border-violet-300 rounded-md px-3 py-1.5 bg-white shadow-sm focus-within:ring-2 focus-within:ring-violet-500 cursor-text"
                                                            onClick={(e) => { e.stopPropagation(); setActiveDropdownId(thread.key); }}
                                                        >
                                                            <input 
                                                                type="text" 
                                                                value={thread.items[0].proposedMatter}
                                                                onChange={(e) => updateThreadProposedMatter(thread.items.map(i => i.id), e.target.value)}
                                                                onFocus={() => setActiveDropdownId(thread.key)}
                                                                className="w-full text-xs font-bold text-indigo-700 bg-transparent outline-none"
                                                            />
                                                            <ChevronDown size={12} className="text-gray-400 ml-2" />
                                                        </div>
                                                        {activeDropdownId === thread.key && (
                                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto custom-scrollbar">
                                                                {allKnownMatters.filter(m => m.toLowerCase().includes(thread.items[0].proposedMatter.toLowerCase())).map(m => (
                                                                    <div 
                                                                        key={m} 
                                                                        className="px-3 py-2 text-xs hover:bg-violet-50 cursor-pointer font-medium text-gray-700"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            updateThreadProposedMatter(thread.items.map(i => i.id), m);
                                                                            setActiveDropdownId(null);
                                                                        }}
                                                                    >
                                                                        {m}
                                                                    </div>
                                                                ))}
                                                                {allKnownMatters.filter(m => m.toLowerCase().includes(thread.items[0].proposedMatter.toLowerCase())).length === 0 && (
                                                                    <div className="px-3 py-2 text-xs text-gray-400 italic">Type to create new...</div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                            {/* EXPANDED ITEMS */}
                                            {expandedProposalThreads.has(thread.key) && thread.items.map(proposal => (
                                                <tr key={proposal.id} className={`transition-colors border-l-4 border-l-violet-200 ${selectedProposals.has(proposal.id) ? 'bg-white' : 'bg-gray-50 opacity-60'}`}>
                                                    <td className="p-4 text-center align-middle border-r border-dashed border-violet-100">
                                                        {/* No Checkbox here, handled by thread header */}
                                                    </td>
                                                    <td className="p-4 align-top">
                                                        <div className="text-gray-600 text-xs mb-1 font-medium">{proposal.originalItem.date}</div>
                                                        <div className="text-[11px] text-gray-500 truncate max-w-xs">{proposal.originalItem.preview}</div>
                                                        <div className="mt-1 text-[10px] text-gray-400 font-mono">From: {proposal.originalItem.correspondent}</div>
                                                    </td>
                                                    <td className="p-4 align-top">
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {proposal.triggers.map((trigger, idx) => (
                                                                <button 
                                                                    key={idx}
                                                                    onClick={() => toggleProposalTrigger(proposal.id, idx)}
                                                                    className={`text-[10px] px-2 py-1 rounded-full border transition-all flex items-center gap-1 ${
                                                                        trigger.selected 
                                                                        ? 'bg-violet-50 text-violet-700 border-violet-200 font-bold hover:bg-violet-100' 
                                                                        : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                                                                    }`}
                                                                >
                                                                    {trigger.value}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 align-middle text-center text-gray-300">
                                                        <div className="text-xl">”</div>
                                                    </td>
                                                </tr>
                                            ))}
                                          </>
                                      ) : (
                                          // Single Item Row
                                          <tr className={`transition-colors ${selectedProposals.has(thread.items[0].id) ? 'bg-white' : 'bg-gray-50 opacity-60'}`}>
                                              <td className="p-4 text-center align-top pt-5">
                                                  <input 
                                                      type="checkbox" 
                                                      className={checkboxClass}
                                                      checked={selectedProposals.has(thread.items[0].id)} 
                                                      onChange={() => toggleProposalSelection(thread.items[0].id)}
                                                  />
                                              </td>
                                              <td className="p-4 align-top">
                                                  <div className="font-semibold text-gray-900 text-xs mb-1">{thread.items[0].originalItem.subject}</div>
                                                  <div className="text-[11px] text-gray-500 truncate max-w-xs">{thread.items[0].originalItem.preview}</div>
                                                  <div className="mt-1 text-[10px] text-gray-400 font-mono">{thread.items[0].originalItem.date} • {thread.items[0].originalItem.correspondent}</div>
                                              </td>
                                              <td className="p-4 align-top">
                                                  <div className="flex flex-wrap gap-1.5">
                                                      {thread.items[0].triggers.map((trigger, idx) => (
                                                          <button 
                                                              key={idx}
                                                              onClick={() => toggleProposalTrigger(thread.items[0].id, idx)}
                                                              className={`text-[10px] px-2 py-1 rounded-full border transition-all flex items-center gap-1 ${
                                                                  trigger.selected 
                                                                  ? 'bg-violet-50 text-violet-700 border-violet-200 font-bold hover:bg-violet-100' 
                                                                  : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                                                              }`}
                                                          >
                                                              {trigger.value}
                                                          </button>
                                                      ))}
                                                      {thread.items[0].triggers.length === 0 && <span className="text-[10px] text-gray-300 italic">No triggers detected</span>}
                                                  </div>
                                              </td>
                                              <td className="p-4 align-top relative">
                                                  {/* CUSTOM DROPDOWN (Same as above, modularize if needed but inline for simplicity) */}
                                                  <div className="relative">
                                                      <div 
                                                          className="flex items-center border border-gray-300 rounded-md px-3 py-1.5 bg-white shadow-sm focus-within:ring-2 focus-within:ring-violet-500 cursor-text"
                                                          onClick={(e) => { e.stopPropagation(); setActiveDropdownId(thread.items[0].id); }}
                                                      >
                                                          <input 
                                                              type="text" 
                                                              value={thread.items[0].proposedMatter}
                                                              onChange={(e) => updateProposedMatter(thread.items[0].id, e.target.value)}
                                                              onFocus={() => setActiveDropdownId(thread.items[0].id)}
                                                              className="w-full text-xs font-bold text-indigo-700 bg-transparent outline-none"
                                                          />
                                                          <ChevronDown size={12} className="text-gray-400 ml-2" />
                                                      </div>
                                                      {activeDropdownId === thread.items[0].id && (
                                                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto custom-scrollbar">
                                                              {allKnownMatters.filter(m => m.toLowerCase().includes(thread.items[0].proposedMatter.toLowerCase())).map(m => (
                                                                  <div 
                                                                      key={m} 
                                                                      className="px-3 py-2 text-xs hover:bg-violet-50 cursor-pointer font-medium text-gray-700"
                                                                      onClick={(e) => {
                                                                          e.stopPropagation();
                                                                          updateProposedMatter(thread.items[0].id, m);
                                                                          setActiveDropdownId(null);
                                                                      }}
                                                                  >
                                                                      {m}
                                                                  </div>
                                                              ))}
                                                              {allKnownMatters.filter(m => m.toLowerCase().includes(thread.items[0].proposedMatter.toLowerCase())).length === 0 && (
                                                                  <div className="px-3 py-2 text-xs text-gray-400 italic">Type to create new...</div>
                                                                )}
                                                          </div>
                                                      )}
                                                  </div>
                                              </td>
                                          </tr>
                                      )}
                                  </React.Fragment>
                              ))}
                          </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="p-6 border-t border-gray-100 bg-white rounded-b-xl flex justify-between items-center">
                      <div className="flex items-center gap-3">
                          <label className="flex items-center gap-2 cursor-pointer group">
                              <input 
                                type="checkbox" 
                                checked={saveRulesWithAssignment}
                                onChange={(e) => setSaveRulesWithAssignment(e.target.checked)}
                                className={checkboxClass}
                              />
                              <span className="text-sm text-gray-700 font-medium group-hover:text-violet-700 transition-colors">Save selected triggers to Smart Rules</span>
                          </label>
                      </div>
                      <div className="flex gap-3">
                          <button onClick={() => setIsAutoAssignReviewOpen(false)} className="px-5 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors">Cancel</button>
                          <button 
                              onClick={confirmAutoAssignments} 
                              className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2"
                              disabled={selectedProposals.size === 0}
                          >
                              <CheckSquare size={18} /> Confirm {selectedProposals.size} Assignments
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* RULE EDIT MODAL */}
      {isRuleModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md transform scale-100 animate-in zoom-in-95 duration-200 border border-gray-100">
                  <div className="flex items-center gap-3 text-indigo-700 mb-6">
                      <div className="bg-indigo-50 p-2.5 rounded-lg"><Sliders size={24} /></div>
                      <h3 className="text-lg font-bold text-gray-900">{ruleForm.id ? 'Edit' : 'Add'} Smart Rule</h3>
                  </div>
                  <div className="space-y-5 mb-8">
                      <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Matter ID</label>
                          <input 
                              type="text" 
                              value={ruleForm.matterId} 
                              onChange={(e) => setRuleForm({ ...ruleForm, matterId: e.target.value })}
                              placeholder="e.g. 71534-25"
                              className="w-full border border-gray-300 rounded-lg p-2.5 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-medium shadow-sm"
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Keywords / Contacts (Triggers)</label>
                          <div className="flex gap-2 mb-2">
                              <input 
                                  type="text" 
                                  value={ruleForm.currentTriggerInput} 
                                  onChange={(e) => setRuleForm({ ...ruleForm, currentTriggerInput: e.target.value })}
                                  onKeyDown={(e) => e.key === 'Enter' && addTriggerToForm()}
                                  placeholder="Type word/email & press Enter"
                                  className="flex-1 border border-gray-300 rounded-lg p-2.5 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none shadow-sm"
                              />
                              <button onClick={addTriggerToForm} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3.5 rounded-lg border border-gray-300 font-medium transition-colors"><Plus size={18}/></button>
                          </div>
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 min-h-[100px] flex flex-wrap gap-2 content-start">
                              {ruleForm.triggers.length === 0 && <span className="text-sm text-gray-400 italic">No triggers added yet.</span>}
                              {ruleForm.triggers.map((t, idx) => (
                                  <span key={idx} className="text-xs bg-white border border-gray-200 text-gray-700 px-2 py-1 rounded-md flex items-center gap-1.5 shadow-sm">
                                      {t} <XIcon size={14} className="cursor-pointer hover:text-red-500 text-gray-400" onClick={() => removeTriggerFromForm(idx)} />
                                  </span>
                              ))}
                          </div>
                      </div>
                  </div>
                  <div className="flex justify-end gap-3">
                      <button onClick={() => setIsRuleModalOpen(false)} className="px-5 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors">Cancel</button>
                      <button onClick={saveRule} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-sm transition-colors">Save Rule</button>
                  </div>
              </div>
          </div>
      )}

      {/* CAST MANAGER MODAL */}
      {isCastModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl transform scale-100 animate-in zoom-in-95 duration-200 border border-gray-100 flex flex-col max-h-[85vh]">
                  <div className="p-6 border-b border-gray-100 flex items-center gap-4 bg-gradient-to-r from-cyan-50 to-white rounded-t-xl">
                      <div className="bg-cyan-100 p-2.5 rounded-lg text-cyan-700 shadow-sm"><Users size={24} /></div>
                      <div>
                          <h3 className="text-lg font-bold text-gray-900">Manage Cast & Context</h3>
                          <p className="text-sm text-gray-500">Define roles for matter: <span className="font-bold text-cyan-700">{currentCastMatter}</span></p>
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-gray-50/50">
                      
                      {/* Suggested Section */}
                      <div className="mb-6">
                          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                              <Sparkles size={12} className="text-amber-500" /> Detected Participants (Click to Add)
                          </h4>
                          <div className="flex flex-wrap gap-2">
                              {suggestedCast.length === 0 && <span className="text-sm text-gray-400 italic">No new participants detected in current items.</span>}
                              {suggestedCast.map((name, idx) => (
                                  <button 
                                      key={idx}
                                      onClick={() => addCastMember(name)}
                                      className="bg-white hover:bg-cyan-50 border border-gray-200 hover:border-cyan-200 text-gray-700 hover:text-cyan-700 px-3 py-1.5 rounded-full text-xs font-medium transition-all shadow-sm flex items-center gap-1.5"
                                  >
                                      <Plus size={12}/> {name}
                                  </button>
                              ))}
                          </div>
                      </div>

                      {/* Defined List */}
                      <div>
                          <div className="flex justify-between items-center mb-3">
                              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                                  <UserCheck size={12} className="text-emerald-500" /> Defined Cast ({castMappings.filter(c => c.matterId === currentCastMatter).length})
                              </h4>
                              <div className="flex gap-2">
                                  <input 
                                      type="text" 
                                      placeholder="Add custom person..." 
                                      value={newCastName}
                                      onChange={(e) => setNewCastName(e.target.value)}
                                      onKeyDown={(e) => e.key === 'Enter' && newCastName && (addCastMember(newCastName), setNewCastName(''))}
                                      className="border border-gray-200 rounded-md px-2 py-1 text-xs outline-none focus:border-cyan-500 w-40"
                                  />
                                  <button onClick={() => newCastName && (addCastMember(newCastName), setNewCastName(''))} className="bg-gray-100 hover:bg-gray-200 p-1 rounded-md text-gray-600"><Plus size={16}/></button>
                              </div>
                          </div>
                          
                          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                              <table className="w-full text-left text-sm">
                                  <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase font-semibold">
                                      <tr>
                                          <th className="p-3 w-1/2">Name / Email</th>
                                          <th className="p-3 w-1/3">Role</th>
                                          <th className="p-3 text-right"></th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-50">
                                      {castMappings.filter(c => c.matterId === currentCastMatter).length === 0 && (
                                          <tr><td colSpan={3} className="p-6 text-center text-gray-400 italic">No cast members defined yet.</td></tr>
                                      )}
                                      {castMappings.filter(c => c.matterId === currentCastMatter).map(member => (
                                          <tr key={member.id} className="group hover:bg-cyan-50/30 transition-colors">
                                              <td className="p-3 font-medium text-gray-800">{member.name}</td>
                                              <td className="p-3">
                                                  <select 
                                                      value={member.role}
                                                      onChange={(e) => updateCastRole(member.id, e.target.value)}
                                                      className="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-md px-2 py-1 outline-none focus:ring-1 focus:ring-cyan-500 w-full"
                                                  >
                                                      <option value="Client">Client</option>
                                                      <option value="Opposing Counsel">Opposing Counsel</option>
                                                      <option value="Internal">Internal (Firm)</option>
                                                      <option value="Court/Judge">Court / Judge</option>
                                                      <option value="Third Party">Third Party</option>
                                                  </select>
                                              </td>
                                              <td className="p-3 text-right">
                                                  <button onClick={() => deleteCastMember(member.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1"><Trash2 size={14}/></button>
                                              </td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                      </div>
                  </div>

                  <div className="p-4 border-t border-gray-100 bg-white rounded-b-xl flex justify-end">
                      <button onClick={() => setIsCastModalOpen(false)} className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-bold shadow-sm transition-colors text-xs uppercase tracking-wide">Done</button>
                  </div>
              </div>
          </div>
      )}

      {/* BULK UPDATE MODAL */}
      {isBulkUpdateModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md transform scale-100 animate-in zoom-in-95 duration-200 border border-gray-100 flex flex-col max-h-[90vh]">
                  <div className="flex items-center gap-3 text-indigo-700 mb-6 flex-shrink-0">
                      <div className="bg-indigo-50 p-2.5 rounded-lg"><Edit2 size={24} /></div>
                      <div>
                          <h3 className="text-lg font-bold text-gray-900">Bulk Update Matter</h3>
                          <p className="text-xs text-gray-500">Updating {selectedIds.size} items</p>
                      </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2">
                      
                      {/* Selected Items Reference */}
                      <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 mb-5 max-h-40 overflow-y-auto custom-scrollbar">
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2 sticky top-0 bg-slate-50 pb-1">Selected Items Reference</h4>
                          <div className="space-y-2">
                              {bulkSelectedItems.map(item => (
                                  <div key={item.id} className="flex gap-2 items-start text-xs text-slate-600 border-b border-slate-100 last:border-0 pb-1.5 last:pb-0">
                                      <div className="min-w-[70px] text-slate-400 font-mono text-[10px] pt-0.5">{item.date}</div>
                                      <div className="flex-1">
                                          <div className="font-medium text-slate-800 truncate">{item.subject}</div>
                                          <div className="text-[10px] text-slate-500 truncate">{item.correspondent}</div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>

                      <div className="mb-6">
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Assign Matter ID</label>
                          <input 
                              type="text" 
                              list="matter-suggestions"
                              value={bulkMatterInput} 
                              onChange={(e) => setBulkMatterInput(e.target.value)}
                              placeholder="Select or type new Matter ID..."
                              className="w-full border border-gray-300 rounded-lg p-3 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none shadow-sm text-sm font-medium"
                              autoFocus
                          />
                          <datalist id="matter-suggestions">
                              {allKnownMatters.map(m => <option key={m} value={m} />)}
                          </datalist>
                          <p className="text-[10px] text-gray-400 mt-1.5 ml-1">Choose from existing matters or create a new one.</p>
                      </div>

                      <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 mb-2">
                          <div className="flex items-center gap-2 mb-3">
                              <ListPlus size={16} className="text-indigo-600" />
                              <h4 className="text-sm font-bold text-gray-800">Update Smart Rules <span className="text-xs font-normal text-gray-500 ml-1">(Optional)</span></h4>
                          </div>
                          <p className="text-xs text-gray-600 mb-3">Select detected contacts or add keywords to auto-assign this matter in the future:</p>
                          
                          {/* Suggested Triggers */}
                          <div className="flex flex-wrap gap-2 mb-3">
                              {bulkTriggers.map((t, idx) => (
                                  <button 
                                      key={idx}
                                      onClick={() => toggleBulkTrigger(idx)}
                                      className={`text-xs px-2.5 py-1.5 rounded-md border transition-all flex items-center gap-1.5 ${t.selected 
                                          ? 'bg-indigo-100 text-indigo-800 border-indigo-200 font-semibold ring-1 ring-indigo-300' 
                                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                                  >
                                      {t.value}
                                      {t.selected && <CheckCircle size={12} className="text-indigo-600" />}
                                  </button>
                              ))}
                              {bulkTriggers.length === 0 && <span className="text-xs text-gray-400 italic p-1">No strong keywords detected.</span>}
                          </div>

                          {/* Add Custom Trigger */}
                          <div className="flex gap-2">
                              <input 
                                  type="text" 
                                  value={customBulkTrigger}
                                  onChange={(e) => setCustomBulkTrigger(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && addCustomBulkTrigger()}
                                  placeholder="Add custom keyword (e.g. 'Invoice')"
                                  className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500 outline-none bg-white text-gray-900"
                              />
                              <button onClick={addCustomBulkTrigger} className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 rounded-md text-xs font-medium"><Plus size={14} /></button>
                          </div>
                      </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 flex-shrink-0">
                      <button onClick={() => setIsBulkUpdateModalOpen(false)} className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors">Cancel</button>
                      <button onClick={handleBulkUpdate} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-sm transition-colors">Update Items</button>
                  </div>
              </div>
          </div>
      )}

      <input type="file" accept=".csv" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />
      <input type="file" accept=".csv" ref={rulesFileInputRef} style={{ display: 'none' }} onChange={handleRuleFileUpload} />

      {/* SIDEBAR */}
      <div className="w-64 bg-slate-900 flex flex-col shadow-2xl z-30 relative h-full text-slate-300 border-r border-slate-800/50"> 
        {/* Header */}
        <div className="h-16 px-5 border-b border-slate-800 flex items-center gap-3 flex-shrink-0 bg-slate-900/50 backdrop-blur-md">
            <div className="bg-indigo-600 p-1.5 rounded-lg shadow-lg shadow-indigo-900/20"><Briefcase size={18} className="text-white"/></div>
            <span className="font-bold text-white tracking-wide text-sm">TLD Law Billing</span>
        </div>

        {/* Primary Nav & Scrollable List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col min-h-0 py-4"> 
            
            {/* NEW DASHBOARD LINK */}
            <div className="px-3 mb-6">
                 <div className={`rounded-lg cursor-pointer transition-all duration-200 mb-1 border overflow-hidden ${viewMode === 'DASHBOARD' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/20 border-indigo-500/50' : 'border-transparent hover:bg-slate-800/60 text-slate-400 hover:text-slate-200'}`}
                      onClick={() => setViewMode('DASHBOARD')}
                 >
                    <div className="flex items-center gap-3 px-3 py-2.5">
                        <LayoutDashboard size={18} />
                        <span className="font-medium text-sm">Dashboard</span>
                    </div>
                 </div>
            </div>

            {/* BILLING WORKSPACE SECTION */}
            <div className="px-5 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Billing Workspace</div>

            {/* ACTION REQUIRED SECTION (Pinned Top if Unassigned exist) */}
            <div className="px-3 mb-2 animate-in slide-in-from-left-2 duration-300">
                <div 
                    className={`rounded-lg cursor-pointer transition-all duration-200 mb-1 flex justify-between items-center py-2 px-3 border group ${selectedMatterId === 'Unassigned' && viewMode !== 'DASHBOARD' ? (unassignedCount > 0 ? 'bg-amber-500/10 text-amber-200 border-amber-500/20 shadow-md shadow-amber-900/10' : 'bg-emerald-500/10 text-emerald-200 border-emerald-500/20 shadow-md shadow-emerald-900/10') : (unassignedCount > 0 ? 'bg-slate-800/40 border-slate-700/50 text-amber-500/80 hover:bg-slate-800 hover:border-amber-500/30 hover:text-amber-300' : 'bg-slate-800/40 border-slate-700/50 text-emerald-500/80 hover:bg-slate-800 hover:border-emerald-500/30 hover:text-emerald-300')}`}
                    onClick={() => { setSelectedMatterId('Unassigned'); setViewMode('ALL'); }}
                >
                    <div className="flex items-center gap-2">
                         <AlertCircle size={16} className={unassignedCount > 0 ? "text-amber-500" : "text-emerald-500"} />
                         <span className="font-medium text-sm">Unassigned</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-md font-bold shadow-sm ${unassignedCount > 0 ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'}`}>{unassignedCount}</span>
                </div>
            </div>

            <div className="px-3">
                 {/* "All Unbilled Items" Row with Toggle */}
                 <div className={`rounded-lg cursor-pointer transition-all duration-200 mb-1 border overflow-hidden ${selectedMatterId === 'ALL' && viewMode === 'ALL' ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-100 shadow-md shadow-indigo-900/20' : 'border-transparent hover:bg-slate-800/60 text-slate-400 hover:text-slate-200'}`}>
                    <div className="flex items-center h-10">
                        {/* Main click target for filtering */}
                        <div 
                            className="flex-1 flex justify-between items-center px-3 h-full"
                            onClick={() => { setSelectedMatterId('ALL'); setViewMode('ALL'); }}
                        >
                            <span className="font-medium text-sm">All Items</span>
                            <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${selectedMatterId === 'ALL' && viewMode === 'ALL' ? 'bg-indigo-500 text-white shadow-sm' : 'bg-slate-800 text-slate-500'}`}>
                                {globalUnbilledCount}
                            </span>
                        </div>
                        {/* Toggle target */}
                        <div 
                            className="w-8 h-full flex items-center justify-center hover:bg-white/5 border-l border-white/5"
                            onClick={(e) => { e.stopPropagation(); setIsMattersExpanded(!isMattersExpanded); }}
                        >
                            {isMattersExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </div>
                    </div>
                 </div>
            </div>

            {/* Collapsible List */}
            {isMattersExpanded && (
                <div className="px-3 pb-4 animate-in slide-in-from-top-2 duration-200 mt-2">
                    <ul className="space-y-1">
                        {activeMatters.map((matter) => (
                            <li key={matter.id} onClick={() => { setSelectedMatterId(matter.id); setViewMode('ALL'); }} className={`rounded-lg px-3 py-2 cursor-pointer flex justify-between items-center transition-all duration-200 group ${selectedMatterId === matter.id && viewMode !== 'SETTINGS' && viewMode !== 'DASHBOARD' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/20' : 'hover:bg-slate-800/60 text-slate-400 hover:text-slate-200'}`}>
                            <div className="flex flex-col overflow-hidden">
                                <span className={`truncate text-sm ${selectedMatterId === matter.id && viewMode !== 'DASHBOARD' ? 'font-semibold' : 'font-medium'}`}>{matter.id}</span>
                                <span className={`text-[10px] truncate ${selectedMatterId === matter.id && viewMode !== 'DASHBOARD' ? 'opacity-80' : 'opacity-50 group-hover:opacity-70'}`}>{matter.label}</span>
                            </div>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${selectedMatterId === matter.id && viewMode !== 'SETTINGS' && viewMode !== 'DASHBOARD' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-500 group-hover:text-slate-400'}`}>
                                {matter.count}
                            </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>

        {/* Footer Section (Pinned Settings) */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex-shrink-0">
             <div onClick={() => setViewMode('SETTINGS')} className={`rounded-lg px-3 py-2.5 cursor-pointer flex items-center gap-3 transition-colors mb-3 border ${viewMode === 'SETTINGS' ? 'bg-slate-800 text-white border-slate-700' : 'border-transparent hover:bg-slate-800/60 text-slate-400 hover:text-slate-200'}`}>
                <Settings size={18} /> <span className="font-medium text-sm">Billing Settings</span>
             </div>
             <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-600 flex justify-between items-center">
                <div className="flex items-center gap-1.5 text-emerald-500/80">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> <span className="font-medium">Live Sync Active</span>
                </div>
                <span>v1.2.0</span>
             </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col h-full bg-gray-50/50 overflow-hidden relative z-10">
        
        {/* HEADER (CONDITIONAL) */}
        {viewMode !== 'DASHBOARD' && (
        <div className="bg-white px-6 py-4 flex justify-between items-center shadow-sm z-30 flex-shrink-0 relative border-b border-gray-200">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                {viewMode === 'SETTINGS' ? 'Configuration' : viewMode === 'BILLED' ? 'Billed Entries History' : (selectedMatterId === 'ALL' ? 'Unbilled Activities' : (selectedMatterId === 'Unassigned' ? 'Unassigned Items' : selectedMatterId))}
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
                {viewMode === 'SETTINGS' ? 'Manage system preferences' : viewMode === 'BILLED' ? 'Reviewing saved billing entries' : (selectedMatterId === 'Unassigned' ? 'Review and assign these items to a matter.' : 'Aggregating all Outlook items')}
            </p>
          </div>
          
          <div className="flex gap-3">
            {viewMode !== 'SETTINGS' && (
                <>
                {/* CAST OF CHARACTERS BUTTON - Only Show when Specific Matter is Selected */}
                {selectedMatterId !== 'ALL' && selectedMatterId !== 'Unassigned' && (
                    <button 
                        onClick={() => openCastModal(selectedMatterId)} 
                        className="flex items-center gap-2 bg-cyan-50 text-cyan-700 border border-cyan-200 px-3.5 py-2 rounded-lg shadow-sm font-semibold text-xs transition-colors hover:bg-cyan-100"
                        title="Manage Participants & Roles"
                    >
                        <Users size={14} /> Manage Cast
                    </button>
                )}

                {/* THREAD TOGGLE */}
                <button 
                    onClick={() => setIsThreadingEnabled(!isThreadingEnabled)} 
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all shadow-sm border ${isThreadingEnabled ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                    title="Collapse items with same subject"
                >
                    <Layers size={14} /> {isThreadingEnabled ? 'Threads Collapsed' : 'View Threads'}
                </button>

                <button onClick={applySavedMappings} className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-3.5 py-2 rounded-lg shadow-sm font-semibold text-xs transition-colors">
                    <Zap size={14} className="text-amber-500" /> Apply Mappings
                </button>

                {selectedMatterId === 'Unassigned' && (
                    <button onClick={initiateAutoAssign} disabled={isAutoAssigning} className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white border border-transparent px-4 py-2 rounded-lg shadow-md shadow-indigo-200 font-semibold text-xs transition-all animate-in fade-in zoom-in">
                        {isAutoAssigning ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14} />} 
                        {isAutoAssigning ? 'Analyzing...' : 'Auto-Assign AI'}
                    </button>
                )}

                <button onClick={handleImportClick} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white border border-transparent px-3.5 py-2 rounded-lg shadow-sm font-semibold text-xs transition-colors">
                    <Upload size={14} /> Import CSV
                </button>
                {selectedIds.size > 0 && (
                    <>
                        <button onClick={openBulkUpdateModal} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-lg shadow-sm font-semibold text-xs transition-colors animate-in fade-in zoom-in duration-200">
                            <Edit2 size={14} /> Bulk Update
                        </button>
                        <button onClick={handleDeleteSelected} className="flex items-center gap-2 bg-white hover:bg-red-50 text-red-600 border border-red-200 px-3.5 py-2 rounded-lg shadow-sm font-semibold text-xs transition-colors animate-in fade-in zoom-in duration-200">
                            <Trash2 size={14} /> Delete
                        </button>
                    </>
                )}
                </>
            )}
          </div>
        </div>
        )}

        {/* REST OF DASHBOARD (SETTINGS / BILLED / LIST) */}
        {viewMode === 'DASHBOARD' ? (
            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-slate-50">
                <div className="max-w-6xl mx-auto space-y-8">
                    
                    {/* Welcome Header */}
                    <div className="flex justify-between items-end">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Good afternoon, Steven</h1>
                            <p className="text-gray-500 mt-1 flex items-center gap-2">
                                <Calendar size={14}/> {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                        </div>
                        <div className="flex gap-3">
                             <button onClick={() => setViewMode('ALL')} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow-md shadow-indigo-900/10 transition-all flex items-center gap-2">
                                <Plus size={16} /> New Entry
                             </button>
                        </div>
                    </div>

                    {/* Quick Stats Cards */}
                    <div className="grid grid-cols-3 gap-6">
                        {/* Card 1: Action Items */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between group hover:border-indigo-200 transition-all cursor-pointer" onClick={() => { setSelectedMatterId('Unassigned'); setViewMode('ALL'); }}>
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Action Items</p>
                                <div className="flex items-baseline gap-2">
                                    <h2 className="text-3xl font-bold text-gray-900">{unassignedCount}</h2>
                                    <span className="text-sm text-gray-400 font-medium">unassigned</span>
                                </div>
                                <p className={`text-xs mt-2 font-medium ${unassignedCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                    {unassignedCount > 0 ? 'Requires attention' : 'All clear'}
                                </p>
                            </div>
                            <div className={`p-4 rounded-full ${unassignedCount > 0 ? 'bg-amber-50 text-amber-500' : 'bg-emerald-50 text-emerald-500'}`}>
                                {unassignedCount > 0 ? <AlertCircle size={24} /> : <CheckCircle size={24} />}
                            </div>
                        </div>

                        {/* Card 2: Pipeline Value */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between group hover:border-indigo-200 transition-all cursor-pointer" onClick={() => { setSelectedMatterId('ALL'); setViewMode('ALL'); }}>
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Unbilled Pipeline</p>
                                <div className="flex items-baseline gap-2">
                                    <h2 className="text-3xl font-bold text-gray-900">${getDashboardStats.pipelineValue}</h2>
                                    <span className="text-sm text-gray-400 font-medium">est. value</span>
                                </div>
                                <p className="text-xs mt-2 font-medium text-blue-600">
                                    {globalUnbilledCount} items pending
                                </p>
                            </div>
                            <div className="p-4 rounded-full bg-blue-50 text-blue-500">
                                <Briefcase size={24} />
                            </div>
                        </div>

                         {/* Card 3: Billed This Month */}
                         <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between group hover:border-indigo-200 transition-all cursor-pointer" onClick={() => setViewMode('BILLED')}>
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Billed (This Month)</p>
                                <div className="flex items-baseline gap-2">
                                    <h2 className="text-3xl font-bold text-gray-900">${getDashboardStats.billedMonthValue}</h2>
                                    <span className="text-sm text-gray-400 font-medium">revenue</span>
                                </div>
                                <p className="text-xs mt-2 font-medium text-emerald-600">
                                    +12% vs last month
                                </p>
                            </div>
                            <div className="p-4 rounded-full bg-emerald-50 text-emerald-500">
                                <DollarSign size={24} />
                            </div>
                        </div>
                    </div>

                    {/* Main Chart Section */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><TrendingUp size={18} className="text-indigo-600"/> Billable Performance</h2>
                            <div className="flex bg-gray-100 p-1 rounded-lg">
                                <button onClick={() => setDashboardTimeFrame('TODAY')} className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${dashboardTimeFrame === 'TODAY' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Today</button>
                                <button onClick={() => setDashboardTimeFrame('THIS_WEEK')} className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${dashboardTimeFrame === 'THIS_WEEK' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Week</button>
                                <button onClick={() => setDashboardTimeFrame('THIS_MONTH')} className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${dashboardTimeFrame === 'THIS_MONTH' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Month</button>
                                <button onClick={() => setDashboardTimeFrame('THIS_YEAR')} className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${dashboardTimeFrame === 'THIS_YEAR' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Year</button>
                            </div>
                        </div>
                        
                        <div className="p-8 flex items-center justify-center gap-16">
                            {/* Circular Gauge */}
                            <div className="relative w-64 h-64">
                                <svg className="w-full h-full" viewBox="0 0 100 100">
                                    {/* Background Circle */}
                                    <circle 
                                        cx="50" cy="50" r="45" 
                                        fill="none" 
                                        stroke="#f3f4f6" 
                                        strokeWidth="8"
                                    />
                                    {/* Progress Circle */}
                                    <circle 
                                        cx="50" cy="50" r="45" 
                                        fill="none" 
                                        stroke="#4f46e5" 
                                        strokeWidth="8"
                                        strokeDasharray={`${2 * Math.PI * 45}`}
                                        strokeDashoffset={`${2 * Math.PI * 45 * (1 - getDashboardStats.percentage / 100)}`}
                                        strokeLinecap="round"
                                        className="transition-all duration-1000 ease-out transform -rotate-90 origin-center"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                    <span className="text-4xl font-bold text-gray-900">{getDashboardStats.billedTotal}</span>
                                    <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Hours Billed</span>
                                    <span className="text-xs text-indigo-600 font-medium mt-1">{getDashboardStats.label}</span>
                                </div>
                            </div>

                            {/* Legend / Stats */}
                            <div className="space-y-6 min-w-[200px]">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Target ({getDashboardStats.label})</p>
                                    <p className="text-2xl font-bold text-gray-700">{getDashboardStats.target} hrs</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Remaining</p>
                                    <p className="text-2xl font-bold text-gray-700">{Math.max(0, getDashboardStats.target - parseFloat(getDashboardStats.billedTotal)).toFixed(1)} hrs</p>
                                </div>
                                <div className="pt-4 border-t border-gray-100">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Est. Revenue</p>
                                    <p className="text-2xl font-bold text-emerald-600">${(parseFloat(getDashboardStats.billedTotal) * settings.hourlyRate).toFixed(0)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recent History */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                             <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <h3 className="font-bold text-gray-800 text-sm">Recent Billed Entries</h3>
                                <button onClick={() => setViewMode('BILLED')} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">View All <ChevronRight size={12}/></button>
                             </div>
                             <div className="divide-y divide-gray-100">
                                {billedEntries.length === 0 ? (
                                    <div className="p-8 text-center text-gray-400 text-sm italic">No history yet.</div>
                                ) : (
                                    billedEntries.slice(0, 5).map(entry => (
                                        <div key={entry.id} className="p-4 hover:bg-gray-50 transition-colors flex justify-between items-center group cursor-pointer" onClick={() => setViewMode('BILLED')}>
                                            <div>
                                                <div className="text-xs font-bold text-gray-900 mb-0.5">{entry.matterId}</div>
                                                <div className="text-[10px] text-gray-500 uppercase tracking-wide">{entry.date}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-bold text-gray-900">{entry.qty} hrs</div>
                                                <div className="text-xs text-emerald-600 font-medium">${entry.value}</div>
                                            </div>
                                        </div>
                                    ))
                                )}
                             </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                             <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <h3 className="font-bold text-gray-800 text-sm">Upcoming Unbilled Items</h3>
                                <button onClick={() => { setViewMode('ALL'); setSelectedMatterId('ALL'); }} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">View Workspace <ChevronRight size={12}/></button>
                             </div>
                             <div className="divide-y divide-gray-100">
                                {activities.slice(0, 5).map(act => (
                                    <div key={act.id} className="p-4 hover:bg-gray-50 transition-colors flex gap-3 items-center group cursor-pointer" onClick={() => { setViewMode('ALL'); setSelectedMatterId('ALL'); }}>
                                        <div className={`p-2 rounded-lg ${act.type === 'mail-in' ? 'bg-emerald-50 text-emerald-600' : act.type === 'mail-out' ? 'bg-blue-50 text-blue-600' : 'bg-violet-50 text-violet-600'}`}>
                                            {act.type === 'mail-in' && <ArrowDownLeft size={14} />}
                                            {act.type === 'mail-out' && <ArrowUpRight size={14} />}
                                            {act.type === 'event' && <Calendar size={14} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-semibold text-gray-900 truncate">{act.subject}</div>
                                            <div className="text-[10px] text-gray-500 truncate">{act.correspondent}</div>
                                        </div>
                                        <div className="text-[10px] font-bold text-gray-400 whitespace-nowrap">{act.date}</div>
                                    </div>
                                ))}
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        ) : viewMode === 'SETTINGS' ? (
             <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {/* SETTINGS SUB-TABS */}
                    <div className="flex border-b border-gray-200 bg-gray-50/50">
                        <button 
                            onClick={() => setSettingsTab('INCREMENTS')}
                            className={`px-6 py-4 text-sm font-semibold flex items-center gap-2 transition-colors ${settingsTab === 'INCREMENTS' ? 'bg-white text-indigo-600 border-t-2 border-t-indigo-600 border-x border-x-gray-200 -mb-px shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'}`}
                        >
                            <Sliders size={16}/> General & Increments
                        </button>
                        <button 
                            onClick={() => setSettingsTab('MAPPINGS')}
                            className={`px-6 py-4 text-sm font-semibold flex items-center gap-2 transition-colors ${settingsTab === 'MAPPINGS' ? 'bg-white text-indigo-600 border-t-2 border-t-indigo-600 border-x border-x-gray-200 -mb-px shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'}`}
                        >
                            <Zap size={16}/> Smart Rules
                        </button>
                        <button 
                            onClick={() => setSettingsTab('CAST')}
                            className={`px-6 py-4 text-sm font-semibold flex items-center gap-2 transition-colors ${settingsTab === 'CAST' ? 'bg-white text-indigo-600 border-t-2 border-t-indigo-600 border-x border-x-gray-200 -mb-px shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'}`}
                        >
                            <UserCog size={16}/> Cast & Context
                        </button>
                        <button 
                            onClick={() => setSettingsTab('AI')}
                            className={`px-6 py-4 text-sm font-semibold flex items-center gap-2 transition-colors ${settingsTab === 'AI' ? 'bg-white text-indigo-600 border-t-2 border-t-indigo-600 border-x border-x-gray-200 -mb-px shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'}`}
                        >
                            <Cpu size={16}/> AI & API Configuration
                        </button>
                    </div>

                    <div className="p-8">
                    {/* TAB: INCREMENTS */}
                    {settingsTab === 'INCREMENTS' && (
                        <div className="animate-in fade-in duration-300">
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Default Billing Increments</h2>
                            <p className="text-gray-500 text-sm mb-8 pb-4 border-b border-gray-100">Set the default time values for different types of activities.</p>
                            
                            <div className="grid grid-cols-2 gap-x-12 gap-y-8">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Inbound Email (Hours)</label>
                                    <input type="number" step={0.1} value={settings.inboundRate} onChange={(e) => setSettings({...settings, inboundRate: parseFloat(e.target.value)})} className="w-full border border-gray-300 rounded-lg p-3 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow shadow-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Outbound Email (Hours)</label>
                                    <input type="number" step={0.1} value={settings.outboundRate} onChange={(e) => setSettings({...settings, outboundRate: parseFloat(e.target.value)})} className="w-full border border-gray-300 rounded-lg p-3 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow shadow-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Calendar Event (Hours)</label>
                                    <input type="number" step={0.1} value={settings.eventRate} onChange={(e) => setSettings({...settings, eventRate: parseFloat(e.target.value)})} className="w-full border border-gray-300 rounded-lg p-3 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow shadow-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Hourly Rate ($)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-3 text-gray-400 font-medium">$</span>
                                        <input type="number" value={settings.hourlyRate} onChange={(e) => setSettings({...settings, hourlyRate: parseFloat(e.target.value)})} className="w-full border border-gray-300 rounded-lg p-3 pl-7 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow shadow-sm" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB: MAPPINGS */}
                    {settingsTab === 'MAPPINGS' && (
                        <div className="animate-in fade-in duration-300">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Smart Rules</h2>
                                    <p className="text-sm text-gray-500 mt-1">Auto-assign Matter IDs based on contacts, subjects, or keywords.</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={handleExportRules} className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-bold px-3 py-2 rounded-lg shadow-sm transition-colors" title="Export Rules to CSV">
                                        <Download size={14}/> Export
                                    </button>
                                    <button onClick={handleRuleImportClick} className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-bold px-3 py-2 rounded-lg shadow-sm transition-colors" title="Import Rules from CSV">
                                        <Upload size={14}/> Import
                                    </button>
                                    <div className="h-6 w-px bg-gray-200 mx-1"></div>
                                    <span className="text-xs bg-indigo-50 text-indigo-700 font-medium px-2.5 py-1 rounded-full border border-indigo-100 mr-1">{smartRules.length} Active Rules</span>
                                    <button onClick={openAddRule} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-sm transition-colors">
                                        <Plus size={16}/> Add New Rule
                                    </button>
                                </div>
                            </div>
                            
                            <div className="bg-white border border-gray-200 rounded-lg max-h-96 overflow-y-auto custom-scrollbar shadow-sm mt-6">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50/80 border-b border-gray-200 text-xs font-semibold uppercase text-gray-500 sticky top-0 backdrop-blur-sm z-10">
                                        <tr>
                                            <th className="p-4 w-48">Matter ID</th>
                                            <th className="p-4">Triggers (Keywords/Contacts)</th>
                                            <th className="p-4 text-right w-28">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {smartRules.length === 0 && (
                                            <tr><td colSpan={3} className="p-8 text-center text-gray-400 italic">No rules yet.</td></tr>
                                        )}
                                        {smartRules.map((rule, idx) => (
                                            <tr key={rule.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="p-4 font-semibold text-indigo-900">{rule.matterId}</td>
                                                <td className="p-4">
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {rule.triggers.map((t, i) => (
                                                            <span key={i} className="text-[11px] bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                                                                {t} <XIcon size={12} className="cursor-pointer hover:text-red-500 text-gray-400" onClick={() => removeTriggerFromForm(idx)} />
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-right flex justify-end gap-1">
                                                    <button onClick={() => openEditRule(rule)} className="text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 p-2 rounded-lg transition-colors"><Edit2 size={16}/></button>
                                                    <button onClick={() => deleteRule(rule.id)} className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"><Trash2 size={16}/></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* TAB: CAST & CONTEXT */}
                    {settingsTab === 'CAST' && (
                        <div className="animate-in fade-in duration-300">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Cast of Characters</h2>
                                    <p className="text-sm text-gray-500 mt-1">Define roles (Client, Opposing Counsel, etc.) for better AI narratives.</p>
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Select Matter to Edit</label>
                                <div className="relative max-w-md">
                                    <select 
                                        value={currentCastMatter}
                                        onChange={(e) => openCastModal(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg p-3 bg-white text-gray-900 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none shadow-sm appearance-none font-medium"
                                    >
                                        <option value="">-- Select a Matter --</option>
                                        {allKnownMatters.map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={16} className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" />
                                </div>
                            </div>

                            <div className="bg-cyan-50/50 border border-cyan-100 rounded-xl p-6 flex flex-col items-center justify-center text-center">
                                <UserCog size={48} className="text-cyan-200 mb-3" />
                                <h3 className="text-gray-900 font-bold mb-1">Global Cast Management</h3>
                                <p className="text-sm text-gray-500 max-w-sm">Select a matter above to manage its specific Cast of Characters. This data persists even if you clear your daily dashboard.</p>
                            </div>
                        </div>
                    )}

                    {/* TAB: AI CONFIG */}
                    {settingsTab === 'AI' && (
                        <div className="animate-in fade-in duration-300">
                            <h2 className="text-xl font-bold text-gray-900 mb-2">AI & API Configuration</h2>
                            <p className="text-gray-500 text-sm mb-8 pb-4 border-b border-gray-100">Configure Gemini AI integration for narrative generation and auto-assignment.</p>
                            
                            <div className="mb-8 p-5 bg-violet-50 rounded-xl border border-violet-100">
                                <label className="block text-xs font-bold text-violet-800 uppercase tracking-wide mb-2">Gemini API Key</label>
                                <div className="relative">
                                    <input 
                                        type={showApiKey ? "text" : "password"} 
                                        value={settings.apiKey} 
                                        onChange={(e) => setSettings({...settings, apiKey: e.target.value})} 
                                        className="w-full border border-violet-200 rounded-lg p-3 pr-10 bg-white text-gray-900 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none font-mono text-sm shadow-sm" 
                                        placeholder="Paste your API key here..."
                                    />
                                    <button 
                                        onClick={() => setShowApiKey(!showApiKey)}
                                        className="absolute right-3 top-3 text-violet-400 hover:text-violet-600"
                                    >
                                        {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                <p className="text-xs text-violet-600/70 mt-2 flex items-center gap-1"><AlertCircle size={12}/> Key is stored locally in your browser session and not transmitted elsewhere.</p>
                            </div>

                            <div className="space-y-8">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Auto-Assign System Prompt</label>
                                    <textarea 
                                        value={settings.autoAssignPrompt}
                                        onChange={(e) => setSettings({...settings, autoAssignPrompt: e.target.value})}
                                        className="w-full border border-gray-300 rounded-lg p-4 bg-white text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono text-xs h-32 leading-relaxed shadow-sm resize-none"
                                    ></textarea>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Narrative Generation System Prompt</label>
                                    <textarea 
                                        value={settings.narrativePrompt}
                                        onChange={(e) => setSettings({...settings, narrativePrompt: e.target.value})}
                                        className="w-full border border-gray-300 rounded-lg p-4 bg-white text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono text-xs h-32 leading-relaxed shadow-sm resize-none"
                                    ></textarea>
                                </div>
                            </div>
                        </div>
                    )}
                    </div>

                    <div className="px-8 pb-8 flex justify-end">
                        <button onClick={() => { setViewMode('ALL'); setSelectedMatterId('ALL'); }} className="bg-gray-900 hover:bg-black text-white px-8 py-3 rounded-lg text-sm font-bold shadow-lg shadow-gray-900/10 flex items-center gap-2 transition-all transform hover:-translate-y-0.5">
                            <Save size={16} /> Save Settings & Close
                        </button>
                    </div>
                </div>
            </div>
        ) : (
            /* STANDARD DASHBOARD VIEW */
            <>
            <div className="bg-white px-6 py-3 border-b border-gray-200 flex justify-between items-center shadow-sm z-20 flex-shrink-0">
            <div className="flex bg-gray-100 p-1 rounded-lg">
                <button onClick={() => setViewMode('ALL')} className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${viewMode === 'ALL' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>All Items</button>
                <button onClick={() => setViewMode('SELECTED')} className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${viewMode === 'SELECTED' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Selected ({selectedIds.size})</button>
                <button onClick={() => setViewMode('BILLED')} className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${viewMode === 'BILLED' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>History ({billedEntries.length})</button>
            </div>
            
            <div className="flex items-center gap-3">
                {/* TYPE FILTER */}
                <div className="relative">
                    <div onClick={() => setIsTypeFilterOpen(!isTypeFilterOpen)} className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-white cursor-pointer hover:bg-gray-50 transition-colors shadow-sm">
                        <Filter size={14} className="text-gray-400" />
                        <span className="text-xs font-semibold text-gray-700">{typeFilter === 'ALL' ? 'All Types' : typeFilter}</span>
                        <ChevronDown size={12} className="text-gray-400" />
                    </div>
                    {isTypeFilterOpen && (
                        <div className="absolute top-full left-0 mt-2 w-40 bg-white border border-gray-200 rounded-xl shadow-xl z-[100] ring-1 ring-black ring-opacity-5 overflow-hidden">
                            <div className="p-1">
                                <div onClick={() => {setTypeFilter('ALL'); setIsTypeFilterOpen(false)}} className="px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 rounded-lg cursor-pointer">All Types</div>
                                <div onClick={() => {setTypeFilter('mail-in'); setIsTypeFilterOpen(false)}} className="px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 rounded-lg cursor-pointer">Emails (In)</div>
                                <div onClick={() => {setTypeFilter('mail-out'); setIsTypeFilterOpen(false)}} className="px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 rounded-lg cursor-pointer">Emails (Out)</div>
                                <div onClick={() => {setTypeFilter('event'); setIsTypeFilterOpen(false)}} className="px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 rounded-lg cursor-pointer">Events</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* DATE FILTER - ENHANCED */}
                <div className="relative">
                    <div 
                        onClick={() => setIsDateFilterOpen(!isDateFilterOpen)}
                        className={`flex items-center gap-2 border rounded-lg px-3 py-2 transition-colors cursor-pointer w-52 justify-between shadow-sm ${isDateFilterOpen || dateFilter.mode !== 'ALL' ? 'bg-white border-indigo-200 text-indigo-700 ring-1 ring-indigo-50' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                    >
                        <div className="flex items-center gap-2 truncate">
                             <Calendar size={14} className={`${isDateFilterOpen || dateFilter.mode !== 'ALL' ? 'text-indigo-500' : 'text-gray-400'} flex-shrink-0`} />
                             <span className="text-xs font-semibold truncate">{dateFilter.label}</span>
                        </div>
                        <ChevronDown size={12} className={isDateFilterOpen || dateFilter.mode !== 'ALL' ? 'text-indigo-500' : 'text-gray-400'} />
                    </div>
                    
                    {isDateFilterOpen && (
                        <div className="absolute top-full right-0 mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-xl z-[100] ring-1 ring-black ring-opacity-5 p-3">
                            <div className="grid grid-cols-2 gap-1 mb-3">
                                <button onClick={() => applyDatePreset('TODAY')} className="text-xs text-left px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-700 font-medium transition-colors">Today</button>
                                <button onClick={() => applyDatePreset('YESTERDAY')} className="text-xs text-left px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-700 font-medium transition-colors">Yesterday</button>
                                <button onClick={() => applyDatePreset('LAST_7_DAYS')} className="text-xs text-left px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-700 font-medium transition-colors">Last 7 Days</button>
                                <button onClick={() => applyDatePreset('THIS_MONTH')} className="text-xs text-left px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-700 font-medium transition-colors">This Month</button>
                                <button onClick={() => applyDatePreset('LAST_MONTH')} className="text-xs text-left px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-700 font-medium transition-colors">Last Month</button>
                                <button onClick={() => applyDatePreset('ALL')} className="text-xs text-left px-3 py-2 rounded-lg hover:bg-indigo-50 text-indigo-700 font-bold transition-colors">All Time</button>
                            </div>
                            <div className="border-t border-gray-100 pt-3">
                                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2 tracking-wide">Custom Range</label>
                                <div className="flex gap-2 mb-3">
                                    <input 
                                        type="date" 
                                        value={customRange.start} 
                                        onChange={(e) => setCustomRange({...customRange, start: e.target.value})}
                                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs bg-white text-gray-800 focus:ring-1 focus:ring-indigo-500 outline-none"
                                    />
                                    <input 
                                        type="date" 
                                        value={customRange.end} 
                                        onChange={(e) => setCustomRange({...customRange, end: e.target.value})}
                                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs bg-white text-gray-800 focus:ring-1 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <button 
                                    onClick={applyCustomRange}
                                    disabled={!customRange.start || !customRange.end}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-xs py-2 rounded-lg font-bold shadow-sm transition-colors"
                                >
                                    Apply Range
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="relative">
                    <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-xs w-56 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition-all" />
                    <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                </div>
            </div>
            </div>

            <div className="flex-1 overflow-auto p-6 flex flex-col min-h-0 relative z-0">
                {/* ... (Table Logic remains same, ensures standard dashboard view renders filteredActivities) ... */}
                {viewMode === 'BILLED' ? (
                    <>
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex-1 overflow-y-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-gray-50 z-10 shadow-sm">
                                    <tr className="border-b border-gray-200 text-gray-500 text-[11px] font-bold uppercase tracking-wider">
                                        <th className="p-4 w-12 text-center bg-gray-50"></th> 
                                        <th className="p-4 w-32 bg-gray-50">Date Billed</th>
                                        <th className="p-4 bg-gray-50">Final Narrative</th>
                                        <th className="p-4 w-40 bg-gray-50">Matter</th>
                                        <th className="p-4 w-24 text-right bg-gray-50">Items</th>
                                        <th className="p-4 w-24 text-right bg-gray-50">Hrs</th>
                                        <th className="p-4 w-28 text-right bg-gray-50">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {billedEntries.map((entry) => (
                                        <React.Fragment key={entry.id}>
                                            <tr className={`hover:bg-gray-50 group transition-colors text-xs text-gray-700 ${editingEntryId === entry.id ? 'bg-indigo-50/50' : ''}`}>
                                                <td className="p-4 align-top text-center">
                                                    <button onClick={() => startEditingEntry(entry)} className="text-gray-400 hover:text-indigo-600 bg-white border border-gray-200 hover:border-indigo-200 p-1.5 rounded-md shadow-sm transition-all" title="Edit Entry">
                                                        <Edit2 size={14} />
                                                    </button>
                                                </td>
                                                <td className="p-4 align-top font-medium text-gray-900">{entry.date}</td>
                                                <td className="p-4 align-top text-gray-600 leading-relaxed max-w-lg font-mono text-[11px] uppercase tracking-tight">
                                                    {editingEntryId === entry.id ? (
                                                        <span className="italic text-gray-400">Editing...</span>
                                                    ) : (
                                                        entry.description
                                                    )}
                                                </td>
                                                <td className="p-4 align-top font-medium text-indigo-700">{entry.matterId}</td>
                                                <td className="p-4 align-top text-right font-medium">{entry.itemCount}</td>
                                                <td className="p-4 align-top text-right text-gray-900 font-semibold">{entry.qty}</td>
                                                <td className="p-4 align-top text-right font-bold text-emerald-600">${entry.value}</td>
                                            </tr>
                                            {/* EXPANDED EDIT ROW */}
                                            {editingEntryId === entry.id && (
                                                <tr className="bg-indigo-50/30">
                                                    <td colSpan={7} className="p-6 border-b border-indigo-100 shadow-inner">
                                                        <div className="flex flex-col gap-6">
                                                            <div>
                                                                <label className="block text-[11px] font-bold text-indigo-800 uppercase mb-2 tracking-wide">Edit Narrative</label>
                                                                <textarea 
                                                                    className="w-full border border-indigo-200 rounded-lg p-3 text-xs font-mono uppercase bg-white text-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                                                                    value={editEntryForm.description}
                                                                    onChange={(e) => setEditEntryForm({...editEntryForm, description: e.target.value})}
                                                                    rows={4}
                                                                ></textarea>
                                                            </div>
                                                            
                                                            <div>
                                                                <div className="flex justify-between items-center mb-3">
                                                                    <label className="block text-[11px] font-bold text-indigo-800 uppercase tracking-wide">Included Items ({editEntryForm.includedItemIds.size}/{entry.originalItems.length})</label>
                                                                    <span className="text-[11px] text-gray-500 bg-white px-2 py-1 rounded border border-gray-200">Uncheck to unbill items</span>
                                                                </div>
                                                                <div className="bg-white border border-gray-200 rounded-lg max-h-56 overflow-y-auto custom-scrollbar shadow-sm">
                                                                    <table className="w-full text-left text-xs">
                                                                        <thead className="bg-gray-50 text-gray-500 uppercase font-semibold sticky top-0 z-10 border-b border-gray-100">
                                                                            <tr>
                                                                                <th className="p-3 w-10 text-center"></th>
                                                                                <th className="p-3 w-16 text-center">Type</th>
                                                                                <th className="p-3 w-28">Date</th>
                                                                                <th className="p-3">Subject/Preview</th>
                                                                                <th className="p-3 w-20 text-right">Hrs</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-gray-100">
                                                                            {entry.originalItems.map((item: any) => (
                                                                                <tr key={item.id} className={!editEntryForm.includedItemIds.has(item.id) ? 'opacity-50 bg-gray-50' : ''}>
                                                                                    <td className="p-3 text-center">
                                                                                        <input 
                                                                                            type="checkbox" 
                                                                                            checked={editEntryForm.includedItemIds.has(item.id)} 
                                                                                            onChange={() => toggleEditEntryItem(item.id)}
                                                                                            className={checkboxClass}
                                                                                        />
                                                                                    </td>
                                                                                    <td className="p-3 text-center">
                                                                                        {item.type === 'mail-in' && <span className="inline-block p-1 bg-emerald-100 text-emerald-700 rounded"><ArrowDownLeft size={12} /></span>}
                                                                                        {item.type === 'mail-out' && <span className="inline-block p-1 bg-blue-100 text-blue-700 rounded"><ArrowUpRight size={12} /></span>}
                                                                                        {item.type === 'event' && <span className="inline-block p-1 bg-violet-100 text-violet-700 rounded"><Calendar size={12} /></span>}
                                                                                    </td>
                                                                                    <td className="p-3 text-gray-600 font-medium">{item.date}</td>
                                                                                    <td className="p-3">
                                                                                        <div className="font-semibold text-gray-900 truncate max-w-md" title={item.subject}>
                                                                                            {item.subject || <span className="text-gray-400 italic">(No Subject)</span>}
                                                                                        </div>
                                                                                        <div className="text-[11px] text-gray-500 truncate max-w-md mt-0.5">
                                                                                            {item.preview}
                                                                                        </div>
                                                                                    </td>
                                                                                    <td className="p-3 text-right font-mono font-medium">{item.duration}</td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </div>

                                                            <div className="flex justify-between items-center pt-2">
                                                                <button 
                                                                    onClick={() => handleRestoreEntry(entry)} 
                                                                    className="flex items-center gap-1.5 text-red-600 hover:text-red-700 text-xs font-bold px-4 py-2 rounded-lg border border-transparent hover:bg-red-50 hover:border-red-100 transition-colors"
                                                                >
                                                                    <RotateCcw size={14} /> Unbill All Items
                                                                </button>
                                                                <div className="flex gap-3">
                                                                    <button onClick={cancelEditEntry} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 shadow-sm">Cancel</button>
                                                                    <button onClick={saveEditEntry} className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-sm flex items-center gap-2 transform hover:-translate-y-0.5 transition-all">
                                                                        <Save size={14} /> Save Changes
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="pt-4 flex justify-end items-center gap-8 text-sm flex-shrink-0 mt-auto">
                            <div className="text-gray-500 font-medium">Total Billed Hours: <span className="font-bold text-gray-900 text-lg ml-2">{totalBilledHours}</span></div>
                            <div className="text-gray-500 font-medium">Total Billed Value: <span className="font-bold text-emerald-600 text-lg ml-2">${totalBilledValue}</span></div>
                        </div>
                    </>
                ) : (
                    <>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                        <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-gray-50 z-20 border-b border-gray-200">
                            <tr className="text-gray-500 text-[11px] font-bold uppercase tracking-wider">
                                <th className="p-4 w-10 text-center bg-gray-50">
                                    <input 
                                        type="checkbox" 
                                        className={checkboxClass} 
                                        checked={isAllSelected} 
                                        onChange={toggleAll} 
                                    />
                                </th>
                                <th className="p-4 w-16 text-center bg-gray-50" title="Source / Type">Type</th>
                                <th className="p-4 w-32 cursor-pointer hover:text-gray-700 bg-gray-50">
                                    <div className="flex items-center gap-1">Date <ChevronDown size={10}/></div>
                                </th>
                                <th className="p-4 cursor-pointer hover:text-gray-700 bg-gray-50">Description</th>
                                <th className="p-4 w-40 bg-gray-50">Matter</th>
                                <th className="p-4 w-20 text-right bg-gray-50">Qty</th>
                                <th className="p-4 w-24 text-right bg-gray-50">($)</th>
                                <th className="p-4 w-24 text-center bg-gray-50">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {viewActivities.map((item) => (
                                <tr key={item.id} className={`group transition-colors text-xs text-gray-700 ${selectedIds.has(item.id) ? 'bg-indigo-50/60' : 'hover:bg-slate-50'} ${item.isThread ? 'bg-violet-50/50 hover:bg-violet-50' : ''}`}>
                                    <td className="p-4 align-top text-center">
                                        <input 
                                            type="checkbox" 
                                            className={checkboxClass}
                                            checked={selectedIds.has(item.id)} 
                                            onChange={() => toggleSelection(item.id)} 
                                        />
                                    </td>
                                    <td className="p-4 align-top text-center">
                                        {item.isThread ? (
                                            <div className="flex justify-center" title="Collapsed Thread"><div className="bg-violet-100 p-1.5 rounded-md text-violet-600 shadow-sm border border-violet-200"><Layers size={14} /></div></div>
                                        ) : (
                                            <>
                                                {item.type === 'mail-in' && <div className="flex justify-center" title="Received Email (Inbound)"><div className="bg-emerald-100 p-1.5 rounded-md text-emerald-600 shadow-sm border border-emerald-200"><ArrowDownLeft size={14} /></div></div>}
                                                {item.type === 'mail-out' && <div className="flex justify-center" title="Sent Email (Outbound)"><div className="bg-blue-100 p-1.5 rounded-md text-blue-600 shadow-sm border border-blue-200"><ArrowUpRight size={14} /></div></div>}
                                                {item.type === 'event' && <div className="flex justify-center" title="Calendar Event"><div className="bg-purple-100 p-1.5 rounded-md text-purple-600 shadow-sm border border-purple-200"><Calendar size={14} /></div></div>}
                                            </>
                                        )}
                                    </td>
                                    <td className="p-4 align-top font-medium text-gray-900">
                                        <div>{item.date}</div>
                                        {/* Only show time if it's a single item */}
                                        {!item.isThread && <div className="text-[10px] text-gray-400 mt-1">{item.time}</div>}
                                    </td>
                                    <td className="p-4 align-top max-w-lg">
                                        {item.isThread ? (
                                            <div>
                                                <div className="font-bold text-violet-800 text-[11px] mb-1 flex items-center gap-1.5"><Layers size={12}/> THREAD: {item.subject}</div>
                                                <div className="text-gray-500 leading-relaxed italic text-[11px] pl-4 border-l-2 border-violet-200 mb-1.5">{item.preview}</div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">Involved</span>
                                                    <span className="text-[10px] text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-100 truncate max-w-[200px] font-medium">{item.correspondent}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="font-semibold text-gray-900 text-xs mb-1 group-hover:text-indigo-700 transition-colors">{item.subject}</div>
                                                <div className="text-gray-500 leading-relaxed text-[11px]">{item.preview}</div>
                                                <div className="mt-2 flex items-center gap-2">
                                                    <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">{item.type === 'mail-in' ? 'Sender' : item.type === 'mail-out' ? 'Recipient' : 'Attendees'}</span>
                                                    <span className="text-[10px] text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200 font-medium">{item.correspondent}</span>
                                                </div>
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4 align-top">
                                        <div className="relative group/edit">
                                            <input type="text" value={item.matterId} onChange={(e) => handleMatterChange(item.id, e.target.value)} className={`w-full bg-transparent border border-transparent hover:border-gray-300 focus:border-indigo-500 focus:bg-white focus:outline-none rounded-md px-2 py-1 transition-all text-xs font-medium ${item.matterId === 'Unassigned' ? 'text-amber-600 italic' : 'text-indigo-700'}`} />
                                            <Edit2 size={12} className="absolute right-2 top-2 text-gray-400 opacity-0 group-hover/edit:opacity-100 pointer-events-none" />
                                        </div>
                                    </td>
                                    <td className="p-4 align-top text-right">
                                        <input type="text" value={item.duration} onChange={(e) => handleDurationChange(item.id, e.target.value)} className="w-12 text-right bg-transparent border border-transparent hover:border-gray-300 focus:border-indigo-500 focus:bg-white focus:outline-none rounded px-1 py-1 transition-all text-gray-700 font-mono text-xs" />
                                    </td>
                                    <td className="p-4 align-top text-right font-medium text-emerald-600 text-[11px] pt-5">{((parseFloat(item.duration) || 0) * settings.hourlyRate).toFixed(2)}</td>
                                    <td className="p-4 align-top text-center">
                                        {item.itemLink ? (
                                            <a 
                                                href={item.itemLink} 
                                                className="flex items-center justify-center gap-1.5 w-full bg-white border border-gray-200 text-gray-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 px-2 py-1.5 rounded-md text-[10px] font-bold shadow-sm transition-all no-underline"
                                            >
                                                <ExternalLink size={10} /> Open
                                            </a>
                                        ) : (
                                            <button 
                                                disabled 
                                                className="flex items-center justify-center gap-1.5 w-full bg-gray-50 border border-gray-100 text-gray-300 cursor-not-allowed px-2 py-1.5 rounded-md text-[10px] font-bold"
                                            >
                                                <ExternalLink size={10} /> Open
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        </table>
                    </div>
                    </div>
                    {viewMode === 'SELECTED' && (
                        <div className="bg-gray-50 p-6 border-t border-gray-200 flex-shrink-0">
                        <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-6 animate-in slide-in-from-bottom-4 fade-in duration-300 max-w-5xl mx-auto">
                            <div className="flex items-start gap-8">
                                <div className="flex-1">
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Draft Bulk Entry Narrative ({selectedIds.size} items selected)</label>
                                        <button onClick={generateBulkNarrative} disabled={isGenerating} className="flex items-center gap-2 text-xs font-bold text-violet-700 hover:text-violet-800 bg-violet-50 hover:bg-violet-100 border border-violet-100 px-3 py-1.5 rounded-md transition-colors shadow-sm">
                                            {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} {isGenerating ? 'Generating...' : 'Auto-Draft with Gemini'}
                                        </button>
                                    </div>
                                    <textarea className="w-full border border-gray-200 rounded-lg p-4 text-sm font-mono uppercase bg-gray-50 text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white outline-none min-h-[120px] shadow-inner transition-colors" placeholder="Combine selected items into a single narrative..." value={bulkNarrative} onChange={(e) => setBulkNarrative(e.target.value)}></textarea>
                                    <div className="flex justify-between mt-3 px-1">
                                        <span className="text-xs text-gray-500 font-medium">Total Hours: <strong className="text-gray-900">{totalHours}</strong></span>
                                        <span className="text-xs text-gray-500 font-medium">Total Value: <strong className="text-emerald-600">${totalValue}</strong></span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-3 pt-8 w-40">
                                    <button onClick={saveBulkEntry} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg text-sm font-bold shadow-md shadow-indigo-900/20 transition-all transform hover:-translate-y-0.5">Save Entry</button>
                                    <button className="bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 px-4 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition-colors" onClick={() => setSelectedIds(new Set())}>Cancel</button>
                                </div>
                            </div>
                        </div>
                        </div>
                    )}
                    {viewMode !== 'SELECTED' && (
                        <div className="px-6 py-4 bg-white border-t border-gray-200 flex justify-end items-center gap-8 text-sm flex-shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
                            <div className="text-gray-500 font-medium">Total Hours: <span className="font-bold text-gray-900 text-lg ml-2">{totalHours}</span></div>
                            <div className="text-gray-500 font-medium">Total Value: <span className="font-bold text-emerald-600 text-lg ml-2">${totalValue}</span></div>
                        </div>
                    )}
                    </>
                )}
            </div>
            </>
        )}
      </div>
    </div>
  );
};