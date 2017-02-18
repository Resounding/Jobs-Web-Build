import {autoinject} from "aurelia-framework";
import {Router} from "aurelia-router";
import {JobService} from '../../services/data/job-service';
import {CustomerService} from '../../services/data/customer-service';
import {ActivitiesService} from '../../services/data/activities-service';
import {Notifications} from '../../services/notifications';
import {Job, JobDocument} from '../../models/job';
import {CustomerDocument} from '../../models/customer';
import {JobType} from '../../models/job-type';
import {JobStatus} from '../../models/job-status';
import {BillingType} from "../../models/billing-type";
import {WorkType} from "../../models/work-type";
import {RouteConfig} from "aurelia-router";

@autoinject()
export class NewJob {
  job: JobDocument;
  customers: CustomerDocument[];
  jobTypes: JobType[] = JobType.OPTIONS;
  jobStatuses: JobStatus[] = JobStatus.OPTIONS;
  billingTypes: BillingType[] = BillingType.OPTIONS;
  workTypes: WorkType[] = WorkType.OPTIONS;
  isFollowup:boolean = false;

  constructor(private element: Element, private router: Router, private jobService: JobService, private customerService: CustomerService) {
    this.job = new JobDocument();
    customerService.getAll()
      .then(customers => this.customers = customers)
      .catch(Notifications.error);
  }

  activate(params: any, routeConfig: RouteConfig) {
    routeConfig.title = this.title;

    if (_.isString(params.type)) {
      this.job.type = params.type;
    }

    if (params.from) {
      this.jobService.getOne(params.from)
        .then(prev => {
          this.isFollowup = true;
          this.job.customer = prev.customer;
        });
    }
  }

  attached() {
    $('.dropdown.customer', this.element).dropdown({
      allowAdditions: true,
      hideAdditions: false,
      fullTextSearch: true,
      onChange: (value: string): void => {
        this.job.customer = _.find(this.customers, c => c._id === value);
        if (!this.job.customer) {
          this.job.customer = new CustomerDocument();
          this.job.customer.name = value;
        }
        console.log(this.job.customer);
      }
    });

    $('#status', this.element).dropdown();
    $('#billingType', this.element).dropdown();
    $('#workType', this.element).dropdown();
    $('.calendar.start', this.element).calendar({
      type: 'date',
      onChange: date => this.job.startDate = moment(date).toDate()
    });

    const $buttonBar = $('.button-bar', this.element);
    $buttonBar.visibility({
      once: false,
      onBottomPassed: () => {
        $buttonBar.addClass('fixed top');
      },
      onBottomPassedReverse: function () {
        $buttonBar.removeClass('fixed top');
      }
    });
  }

  detached() {
    $('.dropdown.customer', this.element).dropdown('destroy');
    $('#status', this.element).dropdown('destroy');
    $('#billingType', this.element).dropdown('destroy');
    $('#workType', this.element).dropdown('destroy');
    $('.calendar.start', this.element).calendar('destroy');
    $('.button-bar', this.element).visibility('destroy');
  }

  get title() {
    return 'New Job';
  }

  get customer_id(): string {
    return this.job.customer ? this.job.customer._id : null;
  }

  onIsMultiDayChange() {
    if (this.job.isMultiDay) {
      $('#days', this.element).focus();
    } else {
      this.job.days = null;
    }
  }

  onSaveClick() {
    if (this.customer_id) {
      this.saveJob()
        .then(() => this.router.navigateToRoute('jobs.list'));
    } else {
      this.saveCustomer(this.job.customer)
        .then(customer => {
          this.job.customer = customer;
          this.saveJob()
            .then(() => this.router.navigateToRoute('jobs.list'));
        })
        .catch(Notifications.error);
    }
  }

  saveJob(): Promise<Job> {
    return this.jobService.save(this.job.toJSON())
      .then(() => {
        Notifications.success('Job Saved');
      })
      .catch((err) => {
        Notifications.error(err);
      });
  }

  saveCustomer(customer: CustomerDocument): Promise<CustomerDocument> {
    return this.customerService.create(customer.toJSON());
  }
}

