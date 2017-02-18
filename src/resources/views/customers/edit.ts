import {autoinject} from 'aurelia-framework';
import {DialogController} from "aurelia-dialog";
import {Customer} from "../../models/customer";

@autoinject()
export class EditCustomer {
  customer:Customer;
  errors:boolean = false;

  constructor(private controller:DialogController) { }

  activate(customer:Customer) {
    this.customer = _.clone(customer);
  }

  save() {
    this.errors = false;
    if(!this.customer.name) {
      this.errors = true;
    }

    this.controller.ok(this.customer);
  }
}
