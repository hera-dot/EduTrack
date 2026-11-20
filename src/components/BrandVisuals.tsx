import type { Program } from '../types.ts';

export function ProgramCoverArt({
  coverKey,
  title,
}: {
  coverKey: Program['coverKey'];
  title: string;
}) {
  const paletteMap: Record<
    Program['coverKey'],
    { bg: string; stroke: string; accent: string; code: string }
  > = {
    web: { bg: '#EFF6FF', stroke: '#1E3A8A', accent: '#6D28D9', code: 'HTML / CSS / JS' },
    python: { bg: '#F5F3FF', stroke: '#4C1D95', accent: '#1E40AF', code: 'PY / ALGO' },
    database: { bg: '#F0F9FF', stroke: '#0C4A6E', accent: '#1E3A8A', code: 'SQL / 3NF' },
    math: { bg: '#F8FAFC', stroke: '#1E293B', accent: '#5B21B6', code: 'LOGIC / SET' },
    english: { bg: '#EEF2FF', stroke: '#312E81', accent: '#1E40AF', code: 'PROSE / COMP' },
    ict: { bg: '#F1F5F9', stroke: '#0F172A', accent: '#2563EB', code: 'NET / SEC' },
  };

  const p = paletteMap[coverKey] || paletteMap.web;

  return (
    <div
      className="relative w-full aspect-[4/3] overflow-hidden border-b border-slate-200 flex items-center justify-center"
      style={{ backgroundColor: p.bg }}
      role="img"
      aria-label={`${title} discipline graphic`}
    >
      <svg
        viewBox="0 0 320 240"
        className="w-full h-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id={`grid-${coverKey}`} width="24" height="24" patternUnits="userSpaceOnUse">
            <path
              d="M 24 0 L 0 0 0 24"
              fill="none"
              stroke={p.stroke}
              strokeOpacity="0.06"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="320" height="240" fill={`url(#grid-${coverKey})`} />

        {coverKey === 'web' && (
          <g>
            <rect x="44" y="42" width="232" height="156" rx="8" fill="#FFFFFF" stroke={p.stroke} strokeOpacity="0.18" strokeWidth="1.5" />
            <line x1="44" y1="68" x2="276" y2="68" stroke={p.stroke} strokeOpacity="0.14" strokeWidth="1.5" />
            <circle cx="62" cy="55" r="4" fill={p.stroke} fillOpacity="0.25" />
            <circle cx="75" cy="55" r="4" fill={p.accent} fillOpacity="0.35" />
            <rect x="64" y="88" width="90" height="88" rx="4" fill={p.bg} stroke={p.stroke} strokeOpacity="0.2" />
            <rect x="168" y="88" width="88" height="38" rx="4" fill={p.accent} fillOpacity="0.12" stroke={p.accent} strokeOpacity="0.35" />
            <rect x="168" y="138" width="88" height="38" rx="4" fill="#F8FAFC" stroke={p.stroke} strokeOpacity="0.18" />
          </g>
        )}

        {coverKey === 'python' && (
          <g>
            <rect x="52" y="48" width="216" height="144" rx="8" fill="#FFFFFF" stroke={p.stroke} strokeOpacity="0.18" strokeWidth="1.5" />
            <rect x="74" y="72" width="76" height="28" rx="4" fill={p.stroke} fillOpacity="0.1" stroke={p.stroke} strokeOpacity="0.3" />
            <rect x="170" y="72" width="76" height="28" rx="4" fill={p.accent} fillOpacity="0.1" stroke={p.accent} strokeOpacity="0.3" />
            <rect x="122" y="132" width="76" height="32" rx="4" fill="#FFFFFF" stroke={p.stroke} strokeWidth="1.5" strokeOpacity="0.35" />
            <path d="M112 100 L145 132 M208 100 L175 132" stroke={p.stroke} strokeOpacity="0.4" strokeWidth="1.5" />
          </g>
        )}

        {coverKey === 'database' && (
          <g>
            <rect x="54" y="46" width="96" height="148" rx="6" fill="#FFFFFF" stroke={p.stroke} strokeOpacity="0.2" strokeWidth="1.5" />
            <line x1="54" y1="74" x2="150" y2="74" stroke={p.stroke} strokeOpacity="0.15" />
            <line x1="54" y1="104" x2="150" y2="104" stroke={p.stroke} strokeOpacity="0.1" />
            <line x1="54" y1="134" x2="150" y2="134" stroke={p.stroke} strokeOpacity="0.1" />
            <rect x="174" y="68" width="92" height="104" rx="6" fill="#FFFFFF" stroke={p.accent} strokeOpacity="0.35" strokeWidth="1.5" />
            <line x1="174" y1="96" x2="266" y2="96" stroke={p.accent} strokeOpacity="0.2" />
            <path d="M150 90 C162 90, 162 118, 174 118" stroke={p.accent} strokeWidth="2" />
          </g>
        )}

        {coverKey === 'math' && (
          <g>
            <line x1="48" y1="184" x2="272" y2="184" stroke={p.stroke} strokeOpacity="0.25" strokeWidth="1.5" />
            <line x1="72" y1="42" x2="72" y2="198" stroke={p.stroke} strokeOpacity="0.25" strokeWidth="1.5" />
            <path d="M72 172 Q 156 156 248 56" stroke={p.accent} strokeWidth="2.5" fill="none" />
            <circle cx="152" cy="126" r="28" stroke={p.stroke} strokeOpacity="0.22" strokeWidth="1.5" strokeDasharray="4 4" />
            <circle cx="196" cy="99" r="5" fill={p.accent} />
          </g>
        )}

        {coverKey === 'english' && (
          <g>
            <rect x="56" y="42" width="208" height="156" rx="6" fill="#FFFFFF" stroke={p.stroke} strokeOpacity="0.18" strokeWidth="1.5" />
            <rect x="78" y="68" width="110" height="10" rx="2" fill={p.stroke} fillOpacity="0.7" />
            <rect x="78" y="92" width="164" height="6" rx="2" fill={p.stroke} fillOpacity="0.18" />
            <rect x="78" y="108" width="150" height="6" rx="2" fill={p.stroke} fillOpacity="0.18" />
            <rect x="78" y="124" width="160" height="6" rx="2" fill={p.stroke} fillOpacity="0.18" />
            <rect x="78" y="148" width="96" height="6" rx="2" fill={p.accent} fillOpacity="0.45" />
          </g>
        )}

        {coverKey === 'ict' && (
          <g>
            <circle cx="160" cy="120" r="56" stroke={p.stroke} strokeOpacity="0.18" strokeWidth="1.5" fill="#FFFFFF" />
            <circle cx="160" cy="120" r="32" stroke={p.accent} strokeOpacity="0.35" strokeWidth="1.5" />
            <circle cx="160" cy="64" r="7" fill={p.stroke} />
            <circle cx="216" cy="120" r="7" fill={p.accent} />
            <circle cx="160" cy="176" r="7" fill={p.stroke} />
            <circle cx="104" cy="120" r="7" fill={p.accent} />
          </g>
        )}
      </svg>
      <span
        className="absolute bottom-3 left-3 text-[11px] font-mono-tabular font-medium tracking-wide"
        style={{ color: p.stroke }}
      >
        {p.code}
      </span>
    </div>
  );
}

export function HeroAcademicPreview() {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col justify-between h-full">
      <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-600">
          Assessment Workspace · Sample Examination
        </span>
        <span className="text-xs font-mono-tabular font-semibold text-indigo-900">
          24:15 Remaining
        </span>
      </div>

      <div className="p-6 space-y-5 flex-1 flex flex-col justify-center">
        <div>
          <p className="text-xs text-slate-500 mb-1.5">
            Question 03 of 10 · Multiple Choice · 5 Marks
          </p>
          <p className="text-sm sm:text-base font-medium text-slate-900 leading-relaxed">
            In ACID database transactions, what does the Atomicity property guarantee when submitting an examination attempt?
          </p>
        </div>

        <div className="space-y-2.5">
          {[
            { label: 'A', text: 'All inserts and score updates commit together or roll back completely', selected: true },
            { label: 'B', text: 'Queries bypass foreign key constraints during peak hours', selected: false },
            { label: 'C', text: 'Temporary tables are automatically deleted after 24 hours', selected: false },
          ].map((opt) => (
            <div
              key={opt.label}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border text-sm transition-colors ${
                opt.selected
                  ? 'border-indigo-700 bg-indigo-50/70 text-slate-900 font-medium'
                  : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              <span
                className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-mono-tabular shrink-0 ${
                  opt.selected
                    ? 'bg-indigo-800 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {opt.label}
              </span>
              <span>{opt.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
        <span>Auto-evaluation: MCQ + Instructor review for written answers</span>
        <span className="font-mono-tabular font-semibold text-slate-900">Free Access</span>
      </div>
    </div>
  );
}
