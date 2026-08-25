import { ListingPageContainer } from "@/components/common/ListingPageContainer";
import { ExpenseAddClient } from "@/modules/expense/components/ExpenseAddClient";

export default function ExpenseAddPage() {
  return (
    <ListingPageContainer title="Expense / Add" description="Expense type is required. Types that require audit stay pending until approval. Types that skip audit are approved on save and require settlement: debit a bank or post to a liability person.">
      <ExpenseAddClient />
    </ListingPageContainer>
  );
}
