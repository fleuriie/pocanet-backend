import AuthenticatingConcept from "./concepts/authenticating";
import CatalogingConcept from "./concepts/cataloging";
import DiscoveringConcept from "./concepts/discovering";
import MessagingConcept from "./concepts/messaging";
import PhotocardingConcept from "./concepts/photocarding";
import ReviewingConcept from "./concepts/reviewing";
import SessioningConcept from "./concepts/sessioning";

// The app is a composition of concepts instantiated here
// and synchronized together in `routes.ts`.
export const Sessioning = new SessioningConcept();
export const Authing = new AuthenticatingConcept("users");
export const Photocarding = new PhotocardingConcept("photocards");
export const Cataloging = new CatalogingConcept("catalogs");
export const Discovering = new DiscoveringConcept("discoveries");
export const Messaging = new MessagingConcept("messages");
export const Reviewing = new ReviewingConcept("reviews");
