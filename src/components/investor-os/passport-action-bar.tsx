import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

type Props = {
  propertyId: string;
  compact?: boolean;
  onContact?: () => void;
  onCrm?: () => void;
  onWatch?: () => void;
};

export function PassportActionBar({ propertyId, compact, onContact, onCrm, onWatch }: Props) {
  const size = compact ? "sm" : "sm";
  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild size={size} className="bg-[#70bf2b] hover:bg-[#80ce38]">
        <Link to="/deal-analyzer">Analyze</Link>
      </Button>
      <Button asChild size={size} variant="outline">
        <Link to="/investor-os/passport/$id" params={{ id: propertyId }}>
          Passport
        </Link>
      </Button>
      <Button asChild size={size} variant="outline">
        <Link to="/assistant">Run AI</Link>
      </Button>
      {onWatch ? (
        <Button size={size} variant="outline" onClick={onWatch}>
          Watch
        </Button>
      ) : null}
      {onCrm ? (
        <Button size={size} variant="outline" onClick={onCrm}>
          Add to CRM
        </Button>
      ) : (
        <Button asChild size={size} variant="outline">
          <Link to="/pipeline">Add to CRM</Link>
        </Button>
      )}
      {onContact ? (
        <Button size={size} variant="outline" onClick={onContact}>
          Contact
        </Button>
      ) : (
        <Button asChild size={size} variant="outline">
          <Link to="/investor-os/passport/$id" params={{ id: propertyId }} hash="outreach">
            Contact
          </Link>
        </Button>
      )}
      <Button asChild size={size} variant="outline">
        <Link to="/investor-os/capital">Funding</Link>
      </Button>
      <Button asChild size={size} variant="outline">
        <Link to="/investor-os/passport/$id" params={{ id: propertyId }} hash="construction">
          Bids
        </Link>
      </Button>
      <Button asChild size={size} variant="outline">
        <Link to="/investor-os/transactions">Start Tx</Link>
      </Button>
    </div>
  );
}
