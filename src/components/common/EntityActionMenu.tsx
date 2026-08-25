import { Button } from "@/components/ui/Button";

type Props = {
  onEdit?: () => void;
  onFinalize?: () => void;
  onReverse?: () => void;
};

export function EntityActionMenu({ onEdit, onFinalize, onReverse }: Props) {
  return (
    <div className="flex items-center gap-2">
      {onEdit ? (
        <Button variant="secondary" onClick={onEdit}>
          Edit
        </Button>
      ) : null}
      {onFinalize ? <Button onClick={onFinalize}>Finalize</Button> : null}
      {onReverse ? (
        <Button variant="danger" onClick={onReverse}>
          Reverse
        </Button>
      ) : null}
    </div>
  );
}
