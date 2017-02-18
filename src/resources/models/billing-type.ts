export class BillingType {
    id: string;
    name: string;

    static TIME_AND_MATERIALS:string = 't+m';
    static FIXED_CONTRACT:string = 'time';

    static OPTIONS:BillingType[] = [
        { id: BillingType.TIME_AND_MATERIALS, name: 'Time and Materials' },
        { id: BillingType.FIXED_CONTRACT, name: 'Fixed/Contract' }
    ];
}