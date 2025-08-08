export const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().slice(0, 10); // "YYYY-MM-DD"
};