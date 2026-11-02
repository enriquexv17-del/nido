import type { Person } from "../data";
import { Avatar, StatusPill, YouTag } from "./Avatar";

interface PersonRowProps {
  person: Person;
  showAvatar?: boolean;
  children?: React.ReactNode;
}

export function PersonRow({ person, children }: PersonRowProps) {
  return (
    <div className="person-row">
      <Avatar person={person} size={38} />
      <div className="person-row-text">
        <span className="person-row-name">
          {person.name}
          {person.isYou ? <YouTag /> : null}
        </span>
        <span className="person-row-status">{person.memberStatus}</span>
      </div>
      {children ?? (
        <StatusPill tone={person.memberTag === "En línea" ? "jade" : "neutral"}>
          {person.memberTag}
        </StatusPill>
      )}
    </div>
  );
}
