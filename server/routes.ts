import { ObjectId } from "mongodb";

import { Router, getExpressRouter } from "./framework/router";

import { Authing, Cataloging, Discovering, Messaging, Photocarding, Reviewing, Sessioning } from "./app";
import { SessionDoc } from "./concepts/sessioning";

import { z } from "zod";

/**
 * Web server routes for the app. Implements synchronizations between concepts.
 */
class Routes {
  // Synchronize the concepts from `app.ts`.

  @Router.get("/session")
  async getSessionUser(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    return await Authing.getUserById(user);
  }

  @Router.get("/users")
  async getUsers() {
    return await Authing.getUsers();
  }

  @Router.get("/users/:username")
  @Router.validate(z.object({ username: z.string().min(1) }))
  async getUser(username: string) {
    return await Authing.getUserByUsername(username);
  }

  @Router.post("/users")
  async createUser(session: SessionDoc, username: string, password: string) {
    Sessioning.isLoggedOut(session);
    return await Authing.create(username, password);
  }

  @Router.patch("/users/username")
  async updateUsername(session: SessionDoc, username: string) {
    const user = Sessioning.getUser(session);
    return await Authing.updateUsername(user, username);
  }

  @Router.patch("/users/password")
  async updatePassword(session: SessionDoc, currentPassword: string, newPassword: string) {
    const user = Sessioning.getUser(session);
    return Authing.updatePassword(user, currentPassword, newPassword);
  }

  @Router.delete("/users")
  async deleteUser(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    Sessioning.end(session);
    return await Authing.delete(user);
  }

  @Router.post("/login")
  async logIn(session: SessionDoc, username: string, password: string) {
    const u = await Authing.authenticate(username, password);
    Sessioning.start(session, u._id);
    return { msg: "Logged in!" };
  }

  @Router.post("/logout")
  async logOut(session: SessionDoc) {
    Sessioning.end(session);
    return { msg: "Logged out!" };
  }

  // RESTFUL API ADDITIONS BEGIN HERE
  
  @Router.post("/photocard/add/:tags")
  async systemAddPhotocard(tags: string) {
    const tagList = tags.split(',');
    tagList.push("System");
    const photocard = await Photocarding.addPhotocard(tagList);
    return await Cataloging.systemAddItem(photocard.id);
  }

  @Router.post("/photocard/:id/delete")
  async systemDeletePhotocard(id: string) {
    const oid = new ObjectId(id);
    await Photocarding.removePhotocard(oid);
    return await Cataloging.systemDeleteItem(oid);
  }

  @Router.post("/photocard/:id/tags/add/:tag")
  async systemAddTag(id: string, tag: string) {
    const oid = new ObjectId(id);
    return await Photocarding.addTag(oid, tag)
  }

  @Router.post("/photocard/:id/tags/delete/:tag")
  async systemDeleteTag(id: string, tag: string) {
    const oid = new ObjectId(id);
    return await Photocarding.deleteTag(oid, tag);
  }

  @Router.get("/catalog/system")
  async viewSystemCatalog() {
    return await Photocarding.searchTags(["System"]);
  }

  @Router.get("/catalog/:user")
  async viewUserCollection(user: string) {
    return await Photocarding.searchTags([user]);
  }

  @Router.get("/catalog/system/search/:tags")
  async searchSystemCatalog(tags: string) {
    const tagList = tags.split(',');
    tagList.push("System");
    return await Photocarding.searchTags(tagList);
  }

  @Router.get("/catalog/:username/search/:tags")
  async searchUserCollection(username: string, tags: string) {
    const tagList = tags.split(',');
    tagList.push(username);
    return await Photocarding.searchTags(tagList);
  }

  /**
   * Adds a photocard to the currently active user's collection
   * 
   * @param session Currently active session
   * @param photocard Mongo ID of photocard to be added to collection
   */
  @Router.post("/catalog/edit/add/:photocard")
  async userAddPhotocard(session: SessionDoc, photocard: string) {
    const currentUser = Sessioning.getUser(session);
    const oid = new ObjectId(photocard);
    const currentUsername = await Authing.idsToUsernames([currentUser]);
    const dupe = await Photocarding.duplicatePhotocard(oid, currentUsername[0]);
    await Photocarding.deleteTag(dupe.id, "System");
    await Cataloging.userAddItem(currentUsername[0], dupe.id);
    return { msg: 'Photocard successfully added to collection!' };
  }

  @Router.post("/catalog/edit/remove/:photocard")
  async userDeletePhotocard(session: SessionDoc, user: string, photocard: string) {
    const currentUser = Sessioning.getUser(session);
    const oid = new ObjectId(photocard);
    const currentUsername = await Authing.idsToUsernames([currentUser]);
    // check to make sure the current user is trying to modify their own photocard
    await Photocarding.assertPhotocardHasTag(oid, currentUsername[0]);
    await Photocarding.removePhotocard(oid);
    await Cataloging.userDeleteItem(currentUsername[0], oid);
    return { msg: 'Photocard successfully removed from collection!' };
  }

  @Router.post("/catalog/edit/add/:photocard/:tag")
  async userAddTag(session: SessionDoc, photocard: string, tag: string) {
    const currentUser = Sessioning.getUser(session);
    const oid = new ObjectId(photocard);
    const currentUsername = await Authing.idsToUsernames([currentUser]);
    await Photocarding.assertPhotocardHasTag(oid, currentUsername[0]);
    return await Photocarding.addTag(oid, tag);
  }

  @Router.post("/catalog/edit/remove/:photocard/:tag")
  async userRemoveTag(session: SessionDoc, photocard: string, tag: string) {
    const currentUser = Sessioning.getUser(session);
    const oid = new ObjectId(photocard);
    const currentUsername = await Authing.idsToUsernames([currentUser]);
    await Photocarding.assertPhotocardHasTag(oid, currentUsername[0]);
    return await Photocarding.deleteTag(oid, tag);
  }

  /**
   * Marks a photocard as available to be discovered by other users
   */
  @Router.post("/catalog/edit/avail/:photocard")
  async markAsAvailable(session: SessionDoc, photocard: string) {
    const currentUser = Sessioning.getUser(session);
    const oid = new ObjectId(photocard);
    const currentUsername = await Authing.idsToUsernames([currentUser]);
    await Photocarding.assertPhotocardHasTag(oid, currentUsername[0]);
    await Photocarding.addTag(oid, "Available");
    await Discovering.createDiscoverableItem(currentUser, oid);
    return { msg: 'Photocard successfully marked as available!' };
  }

  @Router.post("/catalog/edit/unavail/:photocard")
  async markAsUnavailable(session: SessionDoc, photocard: string) {
    const currentUser = Sessioning.getUser(session);
    const oid = new ObjectId(photocard);
    const currentUsername = await Authing.idsToUsernames([currentUser]);
    await Photocarding.assertPhotocardHasTag(oid, currentUsername[0]);
    await Photocarding.assertPhotocardHasTag(oid, "Available");
    await Photocarding.deleteTag(oid, "Available");
    await Discovering.removeDiscoverableItem(currentUser, oid);
    return { msg: 'Photocard successfully marked as unavailable!' }; 
  }
  
  /**
   * Recommends an available photocard to the currently logged in user, with a warning
   * if the owner of the photocard has a low average rating.
   */
  @Router.get("/discover")
  async discover(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    await Discovering.createUserDiscovery(user);
    const recommended = await Discovering.recommend(user);
    const averageRating = await Reviewing.getAverageRating(recommended.owner)
    const owner = await Authing.idsToUsernames([recommended.owner]);
    if(averageRating != "No ratings found!" && averageRating < 3) {
      return { msg: 'Photocard recommended, but the owner has a poor rating!', owner: owner[0], photocard: recommended.item };
    }
    else {
      return { msg: 'Photocard recommended!', owner: owner[0], photocard: recommended.item };
    }
  }

  /**
   * Sends a message m from the currently active user to the recipient to as long as neither user has
   * blocked each other; throws an error if not.
   */
  @Router.post("/message/send/:to/:m")
  async sendMessage(session: SessionDoc, to: string, m: string) {
    const from = Sessioning.getUser(session);
    const toUser = new ObjectId(to);
    return await Messaging.sendMessage(from, toUser, m);
  }

  /**
   * Returns all messages from user from to user to as long as the currently active user
   * is one of those two users. Marks all messages as read.
   */
  @Router.post("/message/read/:from/:to")
  async readMessage(session: SessionDoc, from: string, to: string) {
    // check if the user is either the sender or receiver
    try {
      Sessioning.isUser(session, from);
    } catch {
      Sessioning.isUser(session, to);
    }
    const fromUser = new ObjectId(from);
    const toUser = new ObjectId(to);
    return await Messaging.readMessages(fromUser, toUser);
  }

  @Router.post("/message/block/:user")
  async blockUser(session: SessionDoc, user: string) {
    const from = Sessioning.getUser(session);
    const to = new ObjectId(user);
    return await Messaging.blockUser(from, to);
  }

  @Router.post("/message/unblock/:user")
  async unblockUser(session: SessionDoc, user: string) {
    const from = Sessioning.getUser(session);
    const to = new ObjectId(user);
    return await Messaging.unblockUser(from, to);
  }

  /**
   * Leaves a review from the currently active user to the user user with a numerical rating
   * and optional textual feedback.
   * 
   * @param session Currently active session.
   * @param user User to leave a review for.
   * @param rating Numerical rating 1-5 for the user, with 5 being the best.
   * @param review Optional textual feedback for the user.
   */
  @Router.post("/reviews/leave/:user/:rating/:review")
  async leaveFeedback(session: SessionDoc, user: string, rating: number, review?: string) {
    const from = Sessioning.getUser(session);
    const to = new ObjectId(user);
    await Reviewing.rateUser(to, from, rating);
    if (review) {
      await Reviewing.reviewUser(to, from, review);
    }
    return { msg: 'Feedback successfully left!' };
  }

  @Router.get("/reviews/getaverage/:user")
  async viewAverageRatings(user: string) {
    const uid = new ObjectId(user);
    return await Reviewing.getAverageRating(uid);
  }

  @Router.get("/reviews/seefeedback/:user")
  async viewFeedback(user: string) {
    const uid = new ObjectId(user);
    return await Reviewing.getFeedback(uid);
  }
}

/** The web app. */
export const app = new Routes();

/** The Express router. */
export const appRouter = getExpressRouter(app);
