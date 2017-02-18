import {bindable} from 'aurelia-framework';

export class CloseJobArgs {
    jobId:string;
    manHours:string;

    static ShowModalEvent:string = 'show-close-job';
    static ModalApprovedEvent:string = 'close-job-approved';
}

export class CloseJob {
    @bindable args:CloseJobArgs;
}