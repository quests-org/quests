import type { WorkspaceAppProject } from "@quests/workspace/client";
import type {
  ColumnDef,
  ColumnFiltersState,
  OnChangeFn,
  RowSelectionState,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";

import { Input } from "@/client/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/client/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import { cn } from "@/client/lib/utils";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useState } from "react";

export const PROJECTS_PAGE_SIZE = 10;

export function ProjectsDataTable({
  bulkActions,
  columns,
  data,
  onPageChange,
  onRowSelectionChange,
  page,
  rowSelection,
}: {
  bulkActions?: React.ReactNode;
  columns: ColumnDef<WorkspaceAppProject>[];
  data: WorkspaceAppProject[];
  onPageChange: (page: number) => void;
  onRowSelectionChange: OnChangeFn<RowSelectionState>;
  page: number;
  rowSelection: RowSelectionState;
}) {
  "use no memo"; // for useReactTable, see https://github.com/TanStack/table/issues/6137
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable<WorkspaceAppProject>({
    columns,
    data,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => row.subdomain,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange,
    onSortingChange: setSorting,
    state: {
      columnFilters,
      columnVisibility,
      pagination: {
        pageIndex: page - 1,
        pageSize: PROJECTS_PAGE_SIZE,
      },
      rowSelection,
      sorting,
    },
  });
  const titleColumn = table.getColumn("title");
  const titleFilterValue = titleColumn?.getFilterValue();
  const rowModel = table.getRowModel();
  const filteredRowModel = table.getFilteredRowModel();
  const filteredSelectedRowModel = table.getFilteredSelectedRowModel();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-x-2">
        <Input
          autoFocus
          className="max-w-sm"
          onChange={(event) => titleColumn?.setFilterValue(event.target.value)}
          placeholder="Filter projects..."
          value={typeof titleFilterValue === "string" ? titleFilterValue : ""}
        />
        {bulkActions && (
          <div className="flex items-center gap-x-2">{bulkActions}</div>
        )}
      </div>

      <div className="overflow-hidden rounded-md border">
        <Table className="table-fixed">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      style={{
                        width: `${header.getSize()}px`,
                      }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rowModel.rows.length > 0 ? (
              rowModel.rows.map((row) => (
                <TableRow
                  data-state={row.getIsSelected() && "selected"}
                  key={row.id}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      className={
                        cell.column.id === "status" ? "whitespace-normal" : ""
                      }
                      key={cell.id}
                      style={{
                        width: `${cell.column.getSize()}px`,
                      }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  className="h-24 text-center"
                  colSpan={columns.length}
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex-1 text-sm whitespace-nowrap text-muted-foreground">
          {filteredSelectedRowModel.rows.length > 0 ? (
            <>
              {filteredSelectedRowModel.rows.length} of{" "}
              {filteredRowModel.rows.length}{" "}
              {filteredRowModel.rows.length === 1 ? "row" : "rows"} selected
            </>
          ) : (
            <>
              {filteredRowModel.rows.length}{" "}
              {filteredRowModel.rows.length === 1 ? "project" : "projects"}
            </>
          )}
        </div>
        <Pagination className="justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                aria-disabled={
                  !table.getCanPreviousPage() || table.getPageCount() <= 1
                }
                className={cn(
                  (!table.getCanPreviousPage() || table.getPageCount() <= 1) &&
                    "pointer-events-none opacity-50",
                )}
                onClick={(e) => {
                  e.preventDefault();
                  if (table.getCanPreviousPage()) {
                    onPageChange(page - 1);
                  }
                }}
                tabIndex={
                  table.getCanPreviousPage() && table.getPageCount() > 1
                    ? undefined
                    : -1
                }
              />
            </PaginationItem>
            {(() => {
              const currentPage = table.getState().pagination.pageIndex;
              const pageCount = table.getPageCount();
              const pages: ("ellipsis" | number)[] = [];

              if (pageCount <= 7) {
                pages.push(...Array.from({ length: pageCount }, (_, i) => i));
              } else if (currentPage <= 3) {
                pages.push(
                  ...Array.from({ length: 5 }, (_, i) => i),
                  "ellipsis",
                  pageCount - 1,
                );
              } else if (currentPage >= pageCount - 4) {
                pages.push(
                  0,
                  "ellipsis",
                  ...Array.from({ length: 5 }, (_, i) => pageCount - 5 + i),
                );
              } else {
                pages.push(
                  0,
                  "ellipsis",
                  currentPage - 1,
                  currentPage,
                  currentPage + 1,
                  "ellipsis",
                  pageCount - 1,
                );
              }

              return pages.map((pageNum, index) =>
                pageNum === "ellipsis" ? (
                  <PaginationItem key={`ellipsis-${index}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      isActive={currentPage === pageNum}
                      onClick={(e) => {
                        e.preventDefault();
                        onPageChange(pageNum + 1);
                      }}
                    >
                      {pageNum + 1}
                    </PaginationLink>
                  </PaginationItem>
                ),
              );
            })()}
            <PaginationItem>
              <PaginationNext
                aria-disabled={
                  !table.getCanNextPage() || table.getPageCount() <= 1
                }
                className={cn(
                  (!table.getCanNextPage() || table.getPageCount() <= 1) &&
                    "pointer-events-none opacity-50",
                )}
                onClick={(e) => {
                  e.preventDefault();
                  if (table.getCanNextPage()) {
                    onPageChange(page + 1);
                  }
                }}
                tabIndex={
                  table.getCanNextPage() && table.getPageCount() > 1
                    ? undefined
                    : -1
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
