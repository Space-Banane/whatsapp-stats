import { memo } from "react";
import type { Message } from "../logic/whatsapp";

export const MessageRow = memo(({ m }: { m: Message }) => (
  <div
    className={`group flex flex-col ${m.isSystem ? "items-center py-2" : "items-start"}`}
  >
    {!m.isSystem && (
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-black text-green-500 tracking-wide uppercase">
          {m.sender}
        </span>
        <span className="text-[10px] text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
          {m.date} {m.time}
        </span>
      </div>
    )}
    <div
      className={`${m.isSystem ? "bg-gray-800/50 text-gray-500 text-[11px] px-4 py-1.5" : "bg-gray-800 text-gray-200 px-5 py-3"} rounded-2xl max-w-[85%] whitespace-pre-wrap leading-relaxed border border-transparent hover:border-gray-700 transition-colors`}
    >
      {m.content}
    </div>
  </div>
));

MessageRow.displayName = "MessageRow";
