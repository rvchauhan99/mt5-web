import { ListingPageContainer } from "@/components/common/ListingPageContainer";
import { PlayerEditClient } from "@/modules/player/components/PlayerEditClient";

export default function PlayerEditPage() {
  return (
    <ListingPageContainer title="Player / Edit" fullWidth>
      <PlayerEditClient />
    </ListingPageContainer>
  );
}
