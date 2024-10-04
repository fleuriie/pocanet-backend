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

  async systemCreateCollection() {
    if(!await this.catalog.readOne({owner: "System"})) {
      return await this.catalog.createOne({owner: "System", items: []})
    }
  }

  async userCreateCollection(username: string) {
    if(!await this.catalog.readOne({owner: username})) {
      return await this.catalog.createOne({owner: username, items: []})
    }
  }
  
  async systemAddItem(item: ObjectId) {
    return await this.catalog.collection.updateOne({owner: "System"}, { $push: { items: item } });
  }

  async systemDeleteItem(item: ObjectId) {
    return await this.catalog.collection.updateOne({owner: "System"}, { $pull: { items: item } });
  }

  async userAddItem(username: string, item: ObjectId) {
    return await this.catalog.collection.updateOne({owner: username}, { $push: { items: item } });
  }

  async userDeleteItem(username: string, item: ObjectId) {
    return await this.catalog.collection.updateOne({owner: username}, { $pull: { items: item} });
  }

}
