import { PlayerAddClient } from "@/modules/player/components/PlayerAddClient";
import { ListingPageContainer } from "@/components/common/ListingPageContainer";

export default function PlayerAddPage() {
  return (
    <ListingPageContainer title="Player / Add" fullWidth>
      <PlayerAddClient />
    </ListingPageContainer>
  );
}
