import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError } from "./errors";

export interface UserDiscoveryDoc extends BaseDoc {
    user: ObjectId;
    seen: ObjectId[]; // list of all items a user has seen
}

export interface DiscoverableDoc extends BaseDoc {
    owner: ObjectId;
    item: ObjectId;
}

/**
 * concept: Discovering[User, Item]
 */
export default class DiscoveringConcept {
    public readonly userDiscoveries: DocCollection<UserDiscoveryDoc>;
    public readonly discoverList: DocCollection<DiscoverableDoc>;

  
    /**
     * Make an instance of Discovering.
     */
    constructor(collectionName: string) {
        this.discoverList = new DocCollection<DiscoverableDoc>(collectionName);
        this.userDiscoveries = new DocCollection<UserDiscoveryDoc>(collectionName);
        this.discoverList.collection.createIndex({ item: 1 });
        this.userDiscoveries.collection.createIndex({ user: 1 });
    }

    async createDiscoverableItem(owner: ObjectId, item: ObjectId) {
        return await this.discoverList.createOne({ owner, item });
    }

    async removeDiscoverableItem(owner: ObjectId, item: ObjectId) {
        return await this.discoverList.deleteOne({ owner, item });
    }

    async createUserDiscovery(user: ObjectId) {
        if (!await this.userDiscoveries.readOne({ user })) {
            return await this.userDiscoveries.createOne({ user, seen: [] });
        }
    }

    async recommend(user: ObjectId) {
        /**
         *  Returns a random item from the discoverList that the user has not seen yet and that they
         *  do not own. Updates the user's seen list to include the recommended item.
         *  (will be updated with a more sophisticated recommendation algorithm, choosing random
         *  items for proof of concept)
         *  @param user - the user to recommend an item to
         *  @returns the recommended item's ObjectId and owner's ObjectId
         */
        const userDiscovery = await this.userDiscoveries.readOne({ user });
        if (!userDiscovery) {
            throw new NotAllowedError("User discovery does not exist!");
        }
        const seen = userDiscovery.seen;
        const recommendations = await this.discoverList.readMany({ item: { $nin: seen, $exists: true },
            owner: { $ne: user } });
        console.log(recommendations);
        if (recommendations.length === 0) {
            throw new NotAllowedError("No recommendations available!");
        }
        else {
            const randomIndex = Math.floor(Math.random() * recommendations.length);
            const randomRecommendation = recommendations[randomIndex];
            await this.userDiscoveries.collection.updateOne({ user }, { $push: { seen: randomRecommendation.item } });
            return randomRecommendation
        }
    }
  }
  