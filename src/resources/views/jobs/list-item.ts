import {autoinject, bindable} from 'aurelia-framework';
import {EventAggregator, Subscription} from 'aurelia-event-aggregator';
import {Job} from "../../models/job";
import {JobStatus} from "../../models/job-status";
import {JobType} from "../../models/job-type";
import {Foreman} from "../../models/foreman";
import {JobService} from "../../services/data/job-service";
import {Notifications} from "../../services/notifications";
import {Authentication, Roles} from '../../services/auth';
import {CloseJobArgs} from './close-job';

@autoinject()
export class ListItem {
  @bindable job: Job;
  expanded: boolean = false;
  foremen: string[] = Foreman.OPTIONS;
  jobStatuses: JobStatus[] = JobStatus.OPTIONS;
  jobManHoursSubscription: Subscription;

  constructor(private element: Element, private jobService: JobService, private auth: Authentication, private events: EventAggregator) {
    // only office admin can close jobs
    if (!this.auth.isInRole(Roles.OfficeAdmin)) {
      var close = _.findIndex(this.jobStatuses, (status) => status.id === JobStatus.CLOSED);
      if (close !== -1) {
        this.jobStatuses.splice(close, 1);
      }
    }
  }

  attached() {

    this.jobManHoursSubscription = this.events.subscribe(CloseJobArgs.ModalApprovedEvent, this.onJobManHoursChanged.bind(this));

    // if(isDevice()) {
    // swipe to reveal delete?
    // } else {

    $('.dropdown.status', this.element).dropdown({
      onChange: this.onStatusChanged.bind(this)
    });
    $('.dropdown.foreman', this.element).dropdown({
      onChange: this.onForemanChanged.bind(this)
    });
    //}
  }

  detached() {
    //if(isDevice()) {
    // swipe to reveal delete?
    //} else {
    $('.dropdown.status', this.element).dropdown('destroy');
    $('.dropdown.foreman', this.element).dropdown('destroy');
    //}
  }

  toggleExpanded() {
    this.expanded = !this.expanded;
  }

  get startDateDisplay(): string {

    let display = 'Not Scheduled';

    if (this.job.startDate) {
      display = moment(this.job.startDate).format('ddd, MMM Do');
    }

    return display;
  }

  get endDateDisplay(): string {
    let display = '';

    if (this.job.endDate) {
      display = moment(this.job.endDate).format('ddd, MMM Do');
    }

    return display;
  }

  get jobStatus(): JobStatus {
    return _.find(this.jobStatuses, s => s.id == this.job.status);
  }

  get foremanDisplay(): string {
    return this.job.foreman || 'Unassigned';
  }

  get isPending() {
    return this.job.status === 'pending';
  }

  get isInProgress() {
    return this.job.status === JobStatus.PENDING;
  }

  get isComplete() {
    return this.job.status === JobStatus.COMPLETE;
  }

  get isClosed(): boolean {
    return this.job.status === JobStatus.CLOSED;
  }

  get isProject() {
    return this.job.job_type === JobType.PROJECT;
  }

  get isServiceCall() {
    return this.job.job_type === JobType.SERVICE_CALL;
  }

  get jobNumberDisplay() {
    const prefix = this.job.job_type === JobType.SERVICE_CALL ? 'S' : 'P';
    return `${prefix}-${this.job.number}`;
  }

  onStatusChanged(value: string) {
    this.job.status = value;

    this.save('Status')
      .then(() => {
        if (value === JobStatus.CLOSED) {
          this.events.publish(CloseJobArgs.ShowModalEvent, this.job._id);
        }
      });
  }

  onForemanChanged(value: string) {
    this.job.foreman = value;
    this.save('Foreman');
  }

  onJobManHoursChanged(args: CloseJobArgs) {
    if (args.jobId === this.job._id) {
      this.job.manHours = parseInt(args.manHours) || 0;
      this.save('Status');
    }
  }

  save(field: string): Promise<void> {
    return this.jobService.save(this.job)
      .then(response => {
        this.job._rev = response.rev;
        Notifications.success(`${field} updated`);
      })
      .catch(Notifications.error);
  }
}
