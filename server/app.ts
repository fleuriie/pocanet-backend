import AuthenticatingConcept from "./concepts/authenticating";
import CatalogingConcept from "./concepts/cataloging";
import FriendingConcept from "./concepts/friending";
import PhotocardingConcept from "./concepts/photocarding";
import PostingConcept from "./concepts/posting";
import SessioningConcept from "./concepts/sessioning";

// The app is a composition of concepts instantiated here
// and synchronized together in `routes.ts`.
export const Sessioning = new SessioningConcept();
export const Authing = new AuthenticatingConcept("users");
export const Posting = new PostingConcept("posts");
export const Friending = new FriendingConcept("friends");
export const Photocarding = new PhotocardingConcept("photocards");
export const Cataloging = new CatalogingConcept("catalogs");
