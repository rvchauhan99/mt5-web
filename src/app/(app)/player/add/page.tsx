import { PlayerAddClient } from "@/modules/player/components/PlayerAddClient";
import { ListingPageContainer } from "@/components/common/ListingPageContainer";

export default function PlayerAddPage() {
  return (
    <ListingPageContainer title="Trader / Add" fullWidth>
      <PlayerAddClient />
    </ListingPageContainer>
  );
}
