import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotFoundError } from "./errors";

export interface BlockDoc extends BaseDoc {
    user: ObjectId;
    blocked: string[];
}

export interface MessagingDoc extends BaseDoc {
    sender: ObjectId;
    receiver: ObjectId;
    messages: string[];
    read: boolean;
}

/**
 * concept: Messaging[User]
 */
export default class MessagingConcept {
    public readonly blockData: DocCollection<BlockDoc>;
    public readonly messageData: DocCollection<MessagingDoc>;

    /**
     * Make an instance of Messaging.
     */
    constructor(collectionName: string) {
        this.messageData = new DocCollection<MessagingDoc>(collectionName);
        this.blockData = new DocCollection<BlockDoc>(collectionName);
        this.messageData.collection.createIndex({ sender: 1 });
        this.messageData.collection.createIndex({ receiver: 1 });
        this.blockData.collection.createIndex({ user: 1 });
    }

    async sendMessage(sender: ObjectId, receiver: ObjectId, message: string) {
        await this.assertNotBlocked(sender, receiver);
        await this.assertNotBlocked(receiver, sender);
        if (!await this.messageData.readOne({ sender, receiver })) {
            await this.createMessageData(sender, receiver);
        }
        return await this.messageData.collection.updateOne(
            { sender, receiver },
            { $push: { messages: message }, $set: { read: false } }
        );
    }

    async readMessages(sender: ObjectId, receiver: ObjectId) {
        if (!await this.messageData.readOne({ sender, receiver })) {
            throw new NotFoundError("No messages to read!");
        }
        await this.messageData.collection.updateOne(
            { sender, receiver },
            { $set: { read: true } }
        );
        return await this.messageData.readOne({ sender, receiver });
    }

    async blockUser(user: ObjectId, recipient: ObjectId) {
        await this.assertNotBlocked(user, recipient);
        await this.blockData.collection.updateOne(
            { user },
            { $push: { blocked: recipient.toString() } }
        );
        return { msg: "User blocked!" };
    }

    async unblockUser(user: ObjectId, recipient: ObjectId) {
        await this.assertIsBlocked(user, recipient);
        await this.blockData.collection.updateOne(
            { user },
            { $pull: { blocked: recipient.toString() } }
        );
        return { msg: "User unblocked!" };
    }

    private async assertNotBlocked(user: ObjectId, recipient: ObjectId) {
        const userBlockData = await this.blockData.readOne({ user });
        if (!userBlockData) {
            await this.createBlockData(user);
            return;
        }
        if (userBlockData.blocked.includes(recipient.toString())) {
            throw new Error("User is blocked!");
        }
    }

    private async assertIsBlocked(user: ObjectId, recipient: ObjectId) {
        const userBlockData = await this.blockData.readOne({ user });
        if (!userBlockData) {
            await this.createBlockData(user);
            return;
        }
        if (!userBlockData.blocked.includes(recipient.toString())) {
            throw new Error("User is not blocked!");
        }
    }

    private async createMessageData(sender: ObjectId, receiver: ObjectId) {
        return await this.messageData.createOne({ sender, receiver, messages: [], read: false });
    }

    private async createBlockData(user: ObjectId) {
        return await this.blockData.createOne({ user, blocked: [] });
    }
}