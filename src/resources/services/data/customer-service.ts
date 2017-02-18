import {autoinject} from 'aurelia-framework';
import {Database} from './db';
import {Customer, CustomerDocument} from "../../models/customer";

@autoinject()
export class CustomerService {
    db: PouchDB;

    constructor(database:Database) {
        this.db = database.db;
    }

    getAll():Promise<CustomerDocument[]> {
        return new Promise((resolve, reject) => {
            this.db.find({selector: {type: CustomerDocument.DOCUMENT_TYPE}, sort: ['type', 'name'] })
                .then(items => {
                    var customers = items.docs.map(item => {
                        var customer = new CustomerDocument(item);
                        return customer;
                    });
                    resolve(customers);
                })
                .catch(reject);
        })
    }

    create(customer:Customer):Promise<CustomerDocument> {
        if(!customer._id) {
            customer._id = CustomerDocument.createId(customer.name);
        }

        return new Promise((resolve, reject) => {
            return this.db.put(customer)
                .then(result => {
                    this.db.get(result.id)
                      .then(custResult => {
                        const saved = new CustomerDocument(custResult);
                        resolve(saved);
                      })
                      .catch(reject);
                })
                .catch(reject);
        });
    }

  save(customer:Customer): Promise<PouchUpdateResponse> {
    return new Promise((resolve, reject) => {
      if (!customer._id) {
        return this.create(customer);
      } else {
        return this.db.put(customer)
          .then(resolve)
          .catch(reject);
      }
    });
  }

    delete(customer:Customer):Promise<Customer> {
      return new Promise((resolve, reject) => {
        this.db.remove(customer)
          .then(resolve)
          .catch(reject);
      });
    }
}
