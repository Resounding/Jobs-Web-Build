export class JobStatus {
    id: string;
    name: string;
    cssClass: string;
    
    static PENDING:string = 'pending';
    static IN_PROGRESS:string = 'inprogress';
    static COMPLETE:string = 'complete';
    static CLOSED:string = 'closed';
    
    static OPTIONS:JobStatus[] = [
        { id: JobStatus.PENDING, name: 'Pending', cssClass: 'hourglass start inverted blue' },
        { id: JobStatus.IN_PROGRESS, name: 'In Progress', cssClass: 'hourglass half inverted green'},
        { id: JobStatus.COMPLETE, name: 'Complete', cssClass: 'hourglass end' },
        { id: JobStatus.CLOSED, name: 'Closed', cssClass: ''}
    ]
}