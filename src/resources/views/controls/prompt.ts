import {autoinject} from 'aurelia-framework';
import {DialogController} from "aurelia-dialog";

@autoinject()
export class Prompt {
  message:string;

  constructor(private controller:DialogController) { }

  activate(message:string) {
    this.message = message;
  }
}
