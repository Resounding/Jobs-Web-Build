import {autoinject} from 'aurelia-framework';
import {DialogController} from "aurelia-dialog";

@autoinject()
export class ErrorNotification {
    message:string;

    constructor(private controller:DialogController) { }

    activate(message:string) {
        this.message = message;
    }
}
