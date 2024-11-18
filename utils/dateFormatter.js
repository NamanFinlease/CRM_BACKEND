export function dateFormatter(incommingDate) {
    const date = new Date(incommingDate);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear());

    return `${day}-${month}-${year}`;
}

export function dateStripper(incommingDate) {
    let date = new Date(incommingDate);
    date.setUTCHours(0, 0, 0, 0);

    return date;
}

export function yyyy_mm_dd(incommingDate) {
    const date = new Date(incommingDate);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear());

    return `${year}-${month}-${day}`;
}
