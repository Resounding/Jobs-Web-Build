import {autoinject} from 'aurelia-framework';
import * as PapaParse from 'papaparse';
import {JobService} from "./data/job-service";
import {JobType} from "../models/job-type";

@autoinject()
export class CsvExport {

  constructor(private jobsService: JobService) {
  }

  export(): Promise<string> {
    return new Promise((resolve, reject) => {
      const json = {
        fields: [
          'Number', 'Name', 'Customer', 'Status', 'Foreman', 'Description', 'Notes', 'Start Date', 'End Date'
        ],
        data: []
      };

      this.jobsService
        .getAll()
        .then(jobs => {
          json.data = jobs
            .map(job => {
              //http://stackoverflow.com/a/10073761
              const formattedNumber: string = job.number < 99999 ? `0000${job.number}`.slice(-5) : job.number.toString(),
                prefix = job.job_type === JobType.SERVICE_CALL ? 'S' : 'P',
                startMoment = moment(job.startDate),
                endMoment = moment(job.endDate),
                start = job.startDate && startMoment.isValid() ? startMoment.format('YYYY-MM-DD') : '',
                end = job.endDate && endMoment.isValid() ? endMoment.format('YYYY-MM-DD') : '';
              return [
                `${prefix}-${formattedNumber}`,
                job.name,
                job.customer.name,
                job.status,
                job.foreman,
                job.description,
                job.notes,
                start,
                end
              ];
            });

          const csv = PapaParse.unparse(json);
          resolve(csv);
        })
        .catch(reject);
    });
  }
}
