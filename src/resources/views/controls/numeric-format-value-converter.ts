export class NumericFormatValueConverter {
    toView(value:string, format:string):string {
        return numeral(value).format(format || '0,0');
    }

    fromView(value:string):number {
        return numeral().unformat(value);
    }
}
