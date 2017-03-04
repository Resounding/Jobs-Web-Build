import {autoinject, useView} from 'aurelia-framework';
import {DialogController} from 'aurelia-dialog';
import {WeekDetailOrder} from '../../services/domain/week-detail-service';
import {Week} from '../../models/week';

@useView('./report.html')
@autoinject()
export class PlantThisWeek {

    model:PlantThisWeekDataModel;

    constructor(private controller:DialogController, private element:Element) {
        controller.settings.position = position;
    }

    activate(model:PlantThisWeekDataModel) {
        this.model = model;
    }

    attached() {
        const iframe = $('iframe', this.element),
            weekNumber = this.model.week.week,
            year = this.model.week.year,
            tableBody = this.model.orders
                .filter((order) => {
                    const stickDate = moment(order.order.stickDate),
                        stickWeek = stickDate.isoWeek(),
                        stickYear = stickDate.isoWeekYear();

                    return stickWeek === weekNumber && stickYear === year;
                })
                .map((order) => {
                    return [order.batch, order.plant, order.zone, numeral(order.pots).format('0,0'),  numeral(order.cases).format('0,0'),  numeral(order.tables).format('0,0'), order.shipWeek.toString()];
                });

            tableBody.unshift(['Batch', 'Plant', 'Zone', 'Pots', 'Cases', 'Tables', 'Ship Week']);

        const docDefinition = {
            pageMargins: 50,
            header: '',
            footer: (currentPage, pageCount) => `Page ${currentPage} of ${pageCount}`,
            content: [
                { text: `Batches to plant in week ${this.model.weekNumber}`, fontSize: 18, bold: true, margin: [0, 10] },
                {
                    table: {
                        headerRows: 1,
                        widths: [ '*', '*', 'auto', 'auto', 'auto', 'auto', 'auto' ],
                        body: tableBody
                    }
                }
            ]
        };

        const pdf = pdfMake.createPdf(docDefinition);

        pdf.getDataUrl((url) => {
            iframe.prop('src', url);
        });
    } 
}

export class PlantThisWeekDataModel {

    constructor(public orders:WeekDetailOrder[], public week:Week) { }

    get weekNumber():number {
        return this.week.week;
    }
}

function position(modalContainer:Element, modalOverlay:Element) {
    const $container = $(modalContainer),
        $aiFooter = $container.find('ai-dialog-footer'),
        $aiBody = $container.find('ai-dialog-body'),
        footerHeight = $aiFooter.outerHeight(),
        bodyHeight = `calc(100% - ${footerHeight}px)`;

    $aiBody.css({ height: bodyHeight });
}