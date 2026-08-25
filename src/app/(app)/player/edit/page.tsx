import { ListingPageContainer } from "@/components/common/ListingPageContainer";
import { PlayerEditClient } from "@/modules/player/components/PlayerEditClient";

export default function PlayerEditPage() {
  return (
    <ListingPageContainer title="Trader / Edit" fullWidth>
      <PlayerEditClient />
    </ListingPageContainer>
  );
}
