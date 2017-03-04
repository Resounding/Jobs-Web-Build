(function() {
    'use strict';

    const moment = this.moment;

    moment.fn.toWeekNumberId = function() {
        const year = this.isoWeekYear(),
            week = this.isoWeek();

        return 'week:' + year + '.' + week;
    };

    moment.fn.addWeeksAndDays = function(value) {
        if(typeof value !== 'number') throw Error('addWeeksAndDays value must be a number');

        const multiplier = value < 0 ? -1 : 1,
            weeks = Math.floor(Math.abs(value)) * multiplier,
            days = Math.round((Math.abs(value) - Math.abs(weeks)) * 10) * multiplier;

        return this.add(weeks, 'weeks').add(days, 'days');

    };

}).call(this);
