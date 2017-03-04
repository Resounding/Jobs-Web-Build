export class EscapeQuotesValueConverter {
    toView(value:string) {
        return value.replace(/\"/g, '&quot;');
    }
}
