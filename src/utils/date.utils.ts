export const getDynamicsDates = (lookbackDays: number) => {
  const iniDate = new Date();
  const endDate = new Date();

  iniDate.setDate(iniDate.getDate() - lookbackDays);
  endDate.setDate(endDate.getDate() - 1);

  const formatLocal = (date: Date) => {
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

export const getDateNow = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}${month}${day}`;
};

export const formatDateForUTCBrazil = (date: string) => {
  const year = date.slice(0, -4);
  const month = date.slice(4, -2);
  const day = date.slice(6);

  return `${day}/${month}/${year}`;
};
