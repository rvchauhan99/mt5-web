import type { ReactNode } from "react";

export type PaginationControlsReferenceProps = {
  page: number;
  rowsPerPage: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (n: number) => void;
  rowsPerPageOptions?: number[];
};

declare function PaginationControlsReference(props: PaginationControlsReferenceProps): ReactNode;
export default PaginationControlsReference;
