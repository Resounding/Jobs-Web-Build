toastr.options.positionClass = "toast-bottom-left";

export class Notifications {
    static success(message: string) {
        toastr.success(message);
    }

    static error(err:Object) {
        toastr.error(JSON.stringify(err));
    }
}