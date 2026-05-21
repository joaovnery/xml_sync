"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDateForUTCBrazil = exports.getDateNow = exports.getDynamicsDates = void 0;
const getDynamicsDates = (lookbackDays) => {
    const iniDate = new Date();
    const endDate = new Date();
    if (!lookbackDays) {
        lookbackDays = 0;
    }
    iniDate.setDate(iniDate.getDate() - lookbackDays);
    // if (lookbackDays >= 1) {
    //   endDate.setDate(endDate.getDate() - 1);
    // } else {
    //   endDate.setDate(endDate.getDate());
    // }
    const formatLocal = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}${month}${day}`;
    };
    return {
        iniDate: formatLocal(iniDate),
        endDate: formatLocal(endDate),
    };
};
exports.getDynamicsDates = getDynamicsDates;
const getDateNow = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}${month}${day}`;
};
exports.getDateNow = getDateNow;
const formatDateForUTCBrazil = (date) => {
    const year = date.slice(0, -4);
    const month = date.slice(4, -2);
    const day = date.slice(6);
    return `${day}/${month}/${year}`;
};
exports.formatDateForUTCBrazil = formatDateForUTCBrazil;
