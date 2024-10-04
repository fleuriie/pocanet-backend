import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface PhotocardDoc extends BaseDoc {
    tags: string[];
}


/**
 * concept: Photocarding
 */
export default class PhotocardingConcept {
    public readonly photocards: DocCollection<PhotocardDoc>;
  
    /**
     * Make an instance of Photocarding.
     */
    constructor(collectionName: string) {
      this.photocards = new DocCollection<PhotocardDoc>(collectionName);
      void this.photocards.collection.createIndex({ tags: 1 });
    }
    
    /**
     * Adding a new photocard to the system, defined by its tags.
     */
    async addPhotocard(tags: string[]) {
        await this.assertPhotocardNotExists(tags);
        const _id = await this.photocards.createOne({ tags });
        return { msg: "Photocard added successfully!", id: _id };
    }

    async removePhotocard(_id: ObjectId) {
        await this.assertPhotocardExists(_id);
        await this.photocards.deleteOne(_id);
        return { msg: "Photocard deleted!" };
    }
    
    /**
     * Creates a copy of the photocard with Mongo ID _id with the exact same tags and a new one added
     * to distinguish the copy.
     * 
     * @param _id Mongo ID of the photocard to be duplicated
     * @param newTag Additional tag to distinguish the duplicate from the original
     */
    async duplicatePhotocard(_id: ObjectId, newTag: string) {
        var orig = await this.photocards.readOne({_id});
        if(!orig) {
            throw new NotFoundError('Photocard to be duplicated not found!');
        }
        var tags = orig.tags;
        tags.push(newTag);
        return await this.addPhotocard(tags);
    }

    async addTag(_id: ObjectId, newTag: string) {
        return await this.photocards.collection.updateOne({_id}, { $push: { tags: newTag }})
    }

    async deleteTag(_id: ObjectId, tagToDelete: string) {
        return await this.photocards.collection.updateOne({_id}, { $pull: { tags: tagToDelete }})
    }

    /**
     * Searches for and returns all photocards that are tagged with the given tags.
     */
    async searchTags(tagsToSearch: string[]) {
        const filter = {
            tags: { $all: tagsToSearch }
        }
        return await this.photocards.readMany(filter);
    }

    /**
     * Searches for and returns a photocard that exactly matches the proposed set of tags.
     */
    private async searchTagsExactMatch(tagsToSearch: string[]) {
        const filter = {
            $expr: {
              $and: [
                { $eq: [{ $size: "$tags" }, tagsToSearch.length] },
                { $setIsSubset: [tagsToSearch, "$tags"] },
                { $setIsSubset: ["$tags", tagsToSearch] }
              ]
            }
          };
        return await this.photocards.readOne(filter);
    }
    
    /**
     * Throws an error if there exists no photocard with id _id.
     */
    private async assertPhotocardExists(_id: ObjectId) {
        const maybePhotocard = await this.photocards.readOne({ _id });
        if (maybePhotocard === null) {
            throw new NotFoundError(`User not found!`);
        }
    }
    
    /**
     * Throws an error if there exists a photocard that exactly matches the proposed set of tags.
     */
    private async assertPhotocardNotExists(tags: string[]) {
        if (await this.searchTagsExactMatch(tags)) {
            throw new NotAllowedError(`Photocard with tags ${tags} already exists!`);
        }
    }
  }