import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";

export interface CatalogDoc extends BaseDoc {
  owner: string;
  items: ObjectId[];
}

/**
 * concept: Cataloging[Item]
 */
export default class CatalogingConcept {
  public readonly catalog: DocCollection<CatalogDoc>;

  /**
   * Make an instance of Cataloging.
   */
  constructor(catalogName: string) {
    this.catalog = new DocCollection<CatalogDoc>(catalogName);
    this.catalog.collection.createIndex({ owner: 1 });
  }

  private async systemCreateCollection() {
    if(!await this.catalog.readOne({owner: "System"})) {
      return await this.catalog.createOne({owner: "System", items: []})
    }
  }

  private async userCreateCollection(username: string) {
    if(!await this.catalog.readOne({owner: username})) {
      return await this.catalog.createOne({owner: username, items: []})
    }
  }
  
  async systemAddItem(item: ObjectId) {
    if (!await this.catalog.readOne({owner: "System"})) {
      await this.systemCreateCollection();
    }
    return await this.catalog.collection.updateOne({owner: "System"}, { $push: { items: item } });
  }

  async systemDeleteItem(item: ObjectId) {
    if (!await this.catalog.readOne({owner: "System"})) {
      await this.systemCreateCollection();
    }
    return await this.catalog.collection.updateOne({owner: "System"}, { $pull: { items: item} });
  }

  async userAddItem(user: string, item: ObjectId) {
    if (!await this.catalog.readOne({owner: user})) {
      await this.userCreateCollection(user);
    }
    return await this.catalog.collection.updateOne({owner: user}, { $push: { items: item } });
  }

  async userDeleteItem(user: string, item: ObjectId) {
    if (!await this.catalog.readOne({owner: user})) {
      await this.userCreateCollection(user);
    }
    return await this.catalog.collection.updateOne({owner: user}, { $pull: { items: item} });
  }

}

export class CatalogNotFoundError extends Error {
  constructor(owner: string) {
    super(`Catalog for ${owner} not found!`);
  }
}