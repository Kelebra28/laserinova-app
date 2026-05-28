import React from 'react';

interface EmailListItemProps {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  isRead: boolean;
  isStarred: boolean;
  receivedAt: string;
  hasAttachments?: boolean;
  isActive?: boolean;
  isSelected?: boolean;
  onClick: (id: string) => void;
  onToggleStar: (id: string) => void;
  onToggleSelect?: (id: string, e: React.MouseEvent) => void;
}

export const EmailListItem: React.FC<EmailListItemProps> = ({
  id,
  from,
  subject,
  snippet,
  isRead,
  isStarred,
  receivedAt,
  hasAttachments = false,
  isActive = false,
  isSelected = false,
  onClick,
  onToggleStar,
  onToggleSelect
}) => {

  return (
    <div 
      onClick={() => onClick(id)}
      className={`flex items-start gap-3 p-4 border-b border-slate-100 cursor-pointer transition-colors ${
        isActive 
          ? 'bg-red-50/40 border-l-2 border-l-red-500' 
          : isRead 
            ? 'bg-slate-50/30 hover:bg-slate-50' 
            : 'bg-white hover:bg-slate-50'
      }`}
    >
      <div className="flex items-center gap-2 flex-shrink-0">
        {onToggleSelect && (
          <button 
            onClick={(e) => onToggleSelect(id, e)} 
            className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded mt-0.5"
          >
            {isSelected ? (
              <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 11 12 14 22 4"></polyline>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
              </svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              </svg>
            )}
          </button>
        )}
        <button 
          onClick={(e) => { 
            e.stopPropagation(); 
            onToggleStar(id); 
          }}
          className="flex-shrink-0 mt-0.5"
        >
        <svg 
          className={`w-4 h-4 transition-colors ${isStarred ? 'text-amber-400 fill-amber-400' : 'text-slate-300 hover:text-amber-400'}`} 
          viewBox="0 0 24 24" 
          stroke="currentColor" 
          strokeWidth="2"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      </button>
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline mb-1">
          <span className={`truncate text-sm ${!isRead ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
            {from}
          </span>
          <span className={`text-[10px] flex-shrink-0 ml-2 ${!isRead ? 'font-bold text-slate-800' : 'font-medium text-slate-500'}`}>
            {receivedAt}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs truncate ${!isRead ? 'font-bold text-slate-800' : 'font-semibold text-slate-700'}`}>
            {subject}
          </span>
          {hasAttachments && (
            <svg className="w-3 h-3 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          )}
        </div>
        <div className="text-[11px] text-slate-500 truncate mt-1">
          {snippet || 'Sin vista previa disponible.'}
        </div>
      </div>
    </div>
  );
};
