import { DropdownSelect } from './ui/DropdownSelect';
import type { DropdownOption } from './ui/DropdownSelect';

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

const pageSizeOptions = [10, 20, 50, 100];
const pageSizeDropdownOptions: DropdownOption[] = pageSizeOptions.map(value => ({
  value: String(value),
  label: String(value),
}));

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="pagination" aria-label="分页">
      <button disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        上一页
      </button>
      <span>
        第 {page} / {totalPages} 页
      </span>
      <button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
        下一页
      </button>
      <label>
        每页数量
        <DropdownSelect
          className="page-size-select"
          value={String(pageSize)}
          options={pageSizeDropdownOptions}
          onChange={value => onPageSizeChange(Number(value))}
        />
      </label>
    </div>
  );
}
