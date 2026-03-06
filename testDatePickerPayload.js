const dayjs = require("dayjs");
const isSameOrBefore = require("dayjs/plugin/isSameOrBefore");
dayjs.extend(isSameOrBefore);

function testPayload() {
    const datesArray = [
        { toDate: () => new Date(2026, 2, 6) }, // 06.03.2026
        { toDate: () => new Date(2026, 2, 8) }  // 08.03.2026
    ];

    const formattedDates = [];

    const startRaw = datesArray[0].toDate ? datesArray[0].toDate() : datesArray[0];
    const endRaw = datesArray[1].toDate ? datesArray[1].toDate() : datesArray[1];

    let currDate = dayjs(startRaw).startOf('day');
    const endDate = dayjs(endRaw).startOf('day');

    while (currDate.isSameOrBefore(endDate)) {
        formattedDates.push(currDate.format("DD/MM/YYYY"));
        currDate = currDate.add(1, 'day');
    }

    console.log("Output array:", formattedDates);
}

testPayload();
