import { BankAddClient } from "@/modules/bank/components/BankAddClient";
import { ListingPageContainer } from "@/components/common/ListingPageContainer";

export default function BankAddPage() {
  return (
    <ListingPageContainer title="Bank / Add" fullWidth>
      <BankAddClient />
    </ListingPageContainer>
  );
}
