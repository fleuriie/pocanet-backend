import { ObjectId } from "mongodb";

import { Router, getExpressRouter } from "./framework/router";

import { Authing, Cataloging, Friending, Photocarding, Posting, Sessioning } from "./app";
import { PostOptions } from "./concepts/posting";
import { SessionDoc } from "./concepts/sessioning";
import Responses from "./responses";

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

  @Router.get("/posts")
  @Router.validate(z.object({ author: z.string().optional() }))
  async getPosts(author?: string) {
    let posts;
    if (author) {
      const id = (await Authing.getUserByUsername(author))._id;
      posts = await Posting.getByAuthor(id);
    } else {
      posts = await Posting.getPosts();
    }
    return Responses.posts(posts);
  }

  @Router.post("/posts")
  async createPost(session: SessionDoc, content: string, options?: PostOptions) {
    const user = Sessioning.getUser(session);
    const created = await Posting.create(user, content, options);
    return { msg: created.msg, post: await Responses.post(created.post) };
  }

  @Router.patch("/posts/:id")
  async updatePost(session: SessionDoc, id: string, content?: string, options?: PostOptions) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await Posting.assertAuthorIsUser(oid, user);
    return await Posting.update(oid, content, options);
  }

  @Router.delete("/posts/:id")
  async deletePost(session: SessionDoc, id: string) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await Posting.assertAuthorIsUser(oid, user);
    return Posting.delete(oid);
  }

  @Router.get("/friends")
  async getFriends(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    return await Authing.idsToUsernames(await Friending.getFriends(user));
  }

  @Router.delete("/friends/:friend")
  async removeFriend(session: SessionDoc, friend: string) {
    const user = Sessioning.getUser(session);
    const friendOid = (await Authing.getUserByUsername(friend))._id;
    return await Friending.removeFriend(user, friendOid);
  }

  @Router.get("/friend/requests")
  async getRequests(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    return await Responses.friendRequests(await Friending.getRequests(user));
  }

  @Router.post("/friend/requests/:to")
  async sendFriendRequest(session: SessionDoc, to: string) {
    const user = Sessioning.getUser(session);
    const toOid = (await Authing.getUserByUsername(to))._id;
    return await Friending.sendRequest(user, toOid);
  }

  @Router.delete("/friend/requests/:to")
  async removeFriendRequest(session: SessionDoc, to: string) {
    const user = Sessioning.getUser(session);
    const toOid = (await Authing.getUserByUsername(to))._id;
    return await Friending.removeRequest(user, toOid);
  }

  @Router.put("/friend/accept/:from")
  async acceptFriendRequest(session: SessionDoc, from: string) {
    const user = Sessioning.getUser(session);
    const fromOid = (await Authing.getUserByUsername(from))._id;
    return await Friending.acceptRequest(fromOid, user);
  }

  @Router.put("/friend/reject/:from")
  async rejectFriendRequest(session: SessionDoc, from: string) {
    const user = Sessioning.getUser(session);
    const fromOid = (await Authing.getUserByUsername(from))._id;
    return await Friending.rejectRequest(fromOid, user);
  }

  // New stuff starts here
  
  @Router.post("/catalog/system")
  async createCatalog() {
    return await Cataloging.systemCreateCollection();
  }

  @Router.post("/catalog/:username")
  async createCollection(username: string) {
    return await Cataloging.userCreateCollection(username);
  }
  
  @Router.post("/photocard/add/:tags")
  async systemAddPhotocard(tags: string) {
    const tagList = tags.split(',');
    tagList.push("System");
    const photocard = await Photocarding.addPhotocard(tagList);
    return await Cataloging.systemAddItem(photocard.id)
  }

  @Router.post("/photocard/delete/:id")
  async systemDeletePhotocard(_id: ObjectId) {
    await Photocarding.removePhotocard(_id);
    return await Cataloging.systemDeleteItem(_id);
  }

  @Router.post("/photocard/tag/add/:tag")
  async systemAddTag(_id: ObjectId, newTag: string) {
    return await Photocarding.addTag(_id, newTag)
  }

  @Router.post("/photocard/tag/delete/:tag")
  async systemDeleteTag(_id: ObjectId, tagToDelete: string) {
    return await Photocarding.deleteTag(_id, tagToDelete);
  }

  @Router.get("/catalog/system/search/:tags")
  async searchSystemCatalog(tags: string) {
    const tagList = tags.split(',');
    tagList.push("System");
    return await Photocarding.searchTags(tagList);
  }

  @Router.get("/catalog/:user/search/:tags")
  async searchUserCollection(username: string, tags: string) {
    const tagList = tags.split(',');
    tagList.push(username);
    return await Photocarding.searchTags(tagList);
  }

  @Router.post("/catalog/:user/edit/add/:photocard")
  async userAddPhotocard(session: SessionDoc, user: ObjectId, photocard: ObjectId) {
    const id = Sessioning.getUser(session);
    const username = await Authing.idsToUsernames([id]);
    if(user == id) {
      const dupe = await Photocarding.duplicatePhotocard(photocard, username[0]);
      await Photocarding.deleteTag(dupe.id, "System");
      return await Cataloging.userAddItem(username[0], dupe.id);
    }
    return "done"
  }

  @Router.post("/catalog/:user/edit/remove/:photocard")
  async userDeletePhotocard(session: SessionDoc, user: ObjectId, photocard: ObjectId) {
    const id = Sessioning.getUser(session);
    const username = await Authing.idsToUsernames([id]);
    if(user == id) {
      await Photocarding.removePhotocard(photocard);
      return Cataloging.userDeleteItem(username[0], photocard);
    }
  }

  @Router.post("/catalog/:user/edit/add/:photocard/:tag")
  async userAddTag(session: SessionDoc, user: ObjectId, photocard: ObjectId, newTag: string) {
    const id = Sessioning.getUser(session);
    if(user == id) {
      return await Photocarding.addTag(photocard, newTag);
    }
  }

  @Router.post("/catalog/:user/edit/remove/:photocard/:tag")
  async userRemoveTag(session: SessionDoc, user: ObjectId, photocard: ObjectId, tagToDelete: string) {
    const id = Sessioning.getUser(session);
    if(user == id) {
      return await Photocarding.deleteTag(photocard, tagToDelete);
    }
  }

  @Router.post("/catalog/:user/edit/avail/:photocard")
  async markAsAvailable(session: SessionDoc, user: ObjectId, photocard: ObjectId) {
    return;
  }
  @Router.post("/catalog/:user/edit/unavail/:photocard")
  async markAsUnavailable(session: SessionDoc, user: ObjectId, photocard: ObjectId) {
    return;
  }
  @Router.get("/discover")
  async discover(user: ObjectId) {
    return;
  }
  @Router.post("/message/send/:from/:to/:m")
  async sendMessage(session: SessionDoc, from: ObjectId, to: ObjectId, message: string) {
    return;
  }
  @Router.post("/message/read/:from/:to")
  async readMessage(session: SessionDoc, from: ObjectId, to: ObjectId) {
    return;
  }
  @Router.post("/message/block/:from/:to")
  async blockUser(session: SessionDoc, from: ObjectId, to: ObjectId) {
    return;
  }
  @Router.post("/message/unblock/:from/:to")
  async unblockUser(session: SessionDoc, from: ObjectId, to: ObjectId) {
    return;
  }
  @Router.post("/reviews/leave/:from/:to/:rating/:review")
  async leaveReview(session: SessionDoc, from: ObjectId, to: ObjectId, rating: number, review: string) {
    return;
  }
  @Router.get("reviews/getaverage/:user")
  async viewAverageRatings(user: ObjectId) {
    return;
  }
  @Router.get("reviews/seeFeedback/:user")
  async viewFeedback(user: ObjectId) {
    return;
  }
}

/** The web app. */
export const app = new Routes();

/** The Express router. */
export const appRouter = getExpressRouter(app);
