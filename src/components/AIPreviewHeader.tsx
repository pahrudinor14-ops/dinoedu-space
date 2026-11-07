import type { ReactNode } from "react";

interface AIPreviewHeaderProps {
  title: string;
  status?: string;
  children?: ReactNode;
}

export default function AIPreviewHeader({
  title,
  status,
  children,
}: AIPreviewHeaderProps) {
  return (
    <div className="dino-no-print mb-4 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-[14px] font-semibold uppercase tracking-[0.18em] text-[#EF629F]">
          Preview
        </p>
        <h2 className="mt-2 text-2xl font-bold">{title}</h2>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {status && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-[12px] font-semibold text-emerald-600">
            {status}
          </span>
        )}
        {children}
      </div>
    </div>
  );
}
