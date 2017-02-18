export class JobType {

    id:string;
    name:string;

    static PROJECT:string = 'project';
    static SERVICE_CALL:string = 'service';

    static OPTIONS:JobType[] = [
        { id: JobType.PROJECT, name: 'Project' },
        { id: JobType.SERVICE_CALL, name: 'Service Call'}
    ];
}