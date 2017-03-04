export class DateFormatValueConverter {
    toView(value:string, format:string):string {
        var m = moment(value);
        if(!m.isValid()) return '';

        format = format || 'dd-MMM-yyyy';

        return m.format(format);
    }
}
