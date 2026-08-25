type Props = {
  createdBy?: string;
  updatedBy?: string;
  updatedAt?: string;
  requestId?: string;
};

export function AuditMetaBlock({ createdBy, updatedBy, updatedAt, requestId }: Props) {
  return (
    <div className="card grid grid-cols-1 gap-1 p-3 text-xs text-text-secondary md:grid-cols-2">
      <div>Created By: {createdBy ?? "-"}</div>
      <div>Updated By: {updatedBy ?? "-"}</div>
      <div>Updated At: {updatedAt ?? "-"}</div>
      <div>Request ID: {requestId ?? "-"}</div>
    </div>
  );
}
