export const getDynamicsDates = (lookbackDays: number) => {
  const endDate = new Date();
  const iniDate = new Date();

  endDate.setDate(endDate.getDate() - 1);

  iniDate.setDate(iniDate.getDate() - lookbackDays);

  const format = (date: Date) =>
    date.toISOString().slice(0, 10).replace(/-/g, "");

  return {
    iniDate: format(iniDate),
    endDate: format(endDate),
  };
};

export const getDateNow = () => {
  const date = new Date();
  return `${date.toISOString().slice(0, 10).replace(/-/g, "")}`;
};
