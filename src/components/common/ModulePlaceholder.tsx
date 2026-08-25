import { ListingPageContainer } from "@/components/common/ListingPageContainer";
import { FormContainer } from "@/components/common/FormContainer";

type Props = {
  title: string;
  description?: string;
};

export function ModulePlaceholder({ title, description }: Props) {
  const normalized = title.toLowerCase();
  const isFormPage = normalized.includes("/ add");

  const content = (
    <div className="rounded-lg border border-dashed border-[var(--border)] bg-gray-50/50 p-8 text-center text-sm text-gray-500">
      This route is scaffolded and ready for backend integration.
    </div>
  );

  if (isFormPage) {
    return (
      <FormContainer
        title={title}
        description={description ?? "Form scaffold is ready for implementation."}
      >
        {content}
      </FormContainer>
    );
  }

  return (
    <ListingPageContainer
      title={title}
      description={description ?? "Module skeleton ready for implementation."}
    >
      {content}
    </ListingPageContainer>
  );
}
