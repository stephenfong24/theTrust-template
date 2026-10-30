interface LegalScheduleTableProps {
  label: string;
  headers: string[];
  rows: string[][];
}

export function LegalScheduleTable({ label, headers, rows }: LegalScheduleTableProps) {
  return (
    <div role="region" aria-label={label} tabIndex={0} className="max-w-full overflow-x-auto rounded border border-line">
      <table className="w-full min-w-[560px] border-collapse text-left text-sm leading-6">
        <caption className="sr-only">{label}</caption>
        <thead className="bg-soft">
          <tr>
            {headers.map((header, index) => (
              <th key={header} scope="col" className={`border-b border-r border-line px-3 py-3 align-top font-semibold last:border-r-0 ${headers.length === 2 && index === 0 ? "w-[36%]" : ""}`}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, column) => column === 0 ? (
                <th key={column} scope="row" className="border-r border-t border-line px-3 py-3 align-top font-medium">{cell}</th>
              ) : (
                <td key={column} className="whitespace-pre-line border-r border-t border-line px-3 py-3 align-top last:border-r-0">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
