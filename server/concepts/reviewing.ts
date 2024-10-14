import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";

export interface ReviewDoc extends BaseDoc {
    user: ObjectId;
    ratings: Map<ObjectId, number>;
    reviews: Map<ObjectId, string>;
}

/**
 * concept: Reviewing[User]
 */
export default class ReviewingConcept {
    public readonly reviewData: DocCollection<ReviewDoc>;

    /**
     * Make an instance of Reviewing.
     */
    constructor(collectionName: string) {
        this.reviewData = new DocCollection<ReviewDoc>(collectionName);
        this.reviewData.collection.createIndex({ user: 1 });
    }

    async rateUser(user: ObjectId, reviewer: ObjectId, rating: number) {
        if (rating < 1 || rating > 5) {
            throw new Error("Rating must be between 1 and 5!");
        }
        if (!await this.reviewData.readOne({ user })) {
            await this.createReviewData(user);
        }
        return await this.reviewData.collection.updateOne(
            { user },
            { $set: { [`ratings.${reviewer}`]: rating } }
        );
    }

    async reviewUser(user: ObjectId, reviewer: ObjectId, review: string) {
        if (!await this.reviewData.readOne({ user })) {
            await this.createReviewData(user);
        }
        return await this.reviewData.collection.updateOne(
            { user },
            { $set: { [`reviews.${reviewer}`]: review } }
        );
    }

    async getAverageRating(user: ObjectId) {
        if (!await this.reviewData.readOne({ user })) {
            return "No ratings found!";
        }
        const ratings = await this.reviewData.readOne({ user },
            { projection: { ratings: 1 } });
        if (!ratings) {
            return "No ratings found!";
        }
        const values = Object.values(ratings.ratings);
        const sum = values.reduce((a, b) => Number(a) + Number(b), 0);
        return sum / values.length;
    }

    async getFeedback(user: ObjectId) {
        if (!await this.reviewData.readOne({ user })) {
            return "No reviews found!";
        }
        const reviews = await this.reviewData.readOne({ user },
            { projection: { reviews: 1 } });
        if (!reviews) {
            return "No reviews found!";
        }
        return reviews.reviews;
    }

    private async createReviewData(user: ObjectId) {
        return await this.reviewData.createOne({ user, ratings: new Map(), reviews: new Map() });
    }
}