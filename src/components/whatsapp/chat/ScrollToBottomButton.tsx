import { ChevronDown } from 'lucide-react';

export default function ScrollToBottomButton({ unseen, onClick }: { unseen: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Ir al último mensaje"
      className="absolute bottom-3 right-4 z-20 w-10 h-10 rounded-full bg-[#202c33] border border-[#2a3942] text-[#aebac1] hover:text-[#e9edef] shadow-lg flex items-center justify-center"
    >
      <ChevronDown size={22} />
      {unseen > 0 && (
        <span className="absolute -top-1.5 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-[#00a884] text-[#06211b] text-[11px] font-bold flex items-center justify-center">
          {unseen}
        </span>
      )}
    </button>
  );
}
